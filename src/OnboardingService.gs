function runScanNow() {
  return withScriptLock_(() => {
    const summary = scanForActivations_('MANUAL_SCAN');
    return {
      summary,
      state: buildAppState_(),
    };
  });
}

function processManualEnrollment(enrollmentId) {
  return withScriptLock_(() => {
    const enrollment = findById_(
      'enrollments',
      'enrollment_id',
      enrollmentId,
    );
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${enrollmentId}`);
    }

    const program = findById_(
      'programs',
      'program_id',
      enrollment.program_id,
    );
    const processing = processEnrollment_(
      enrollment,
      program,
      'MANUAL_APPROVAL',
    );

    return {
      processing,
      state: buildAppState_(),
    };
  });
}

function scanForActivations_(source) {
  const programs = readRows_('programs');
  const enrollments = readRows_('enrollments');
  const processedKeys = new Set(
    readRows_('log')
      .filter(row => row.result === 'DRAFTED')
      .map(row => row.event_key),
  );
  const programById = indexBy_(programs, 'program_id');
  const summary = {
    scannedAt: nowIso_(),
    source,
    detected: [],
    drafted: [],
    failed: [],
  };

  enrollments
    .filter(enrollment => enrollment.approval_status === APPROVAL_STATUS.active)
    .forEach(enrollment => {
      const program = programById[enrollment.program_id];
      const eventKey = buildEventKey_(enrollment);

      if (
        !program ||
        program.status !== PROGRAM_STATUS.active ||
        processedKeys.has(eventKey)
      ) {
        return;
      }

      summary.detected.push(enrollment.enrollment_id);

      if (program.processing_mode === PROCESSING_MODE.manual) {
        return;
      }

      try {
        processEnrollment_(enrollment, program, source);
        summary.drafted.push(enrollment.enrollment_id);
      } catch (error) {
        summary.failed.push({
          enrollmentId: enrollment.enrollment_id,
          message: error.message,
        });
      }
    });

  return summary;
}

function processEnrollment_(enrollment, program, source) {
  if (!program || program.status !== PROGRAM_STATUS.active) {
    throw new Error('Program is not active.');
  }

  const eventKey = buildEventKey_(enrollment);
  const alreadyProcessed = readRows_('log').some(
    row => row.event_key === eventKey && row.result === 'DRAFTED',
  );

  if (alreadyProcessed) {
    return {
      eventKey,
      result: 'ALREADY_PROCESSED',
    };
  }

  try {
    const partner = findById_(
      'partners',
      'partner_id',
      enrollment.partner_id,
    );
    if (!partner) {
      throw new Error(`Partner not found: ${enrollment.partner_id}`);
    }

    const tiers = readRows_('tiers').filter(
      row => row.program_id === program.program_id,
    );
    const tier = tiers.find(row => row.tier_name === enrollment.tier);
    const resources = readRows_('resources').filter(
      row => row.program_id === program.program_id,
    );
    const sequence = readRows_('sequence')
      .filter(row => row.program_id === program.program_id)
      .sort((left, right) => Number(left.day) - Number(right.day));

    if (sequence.length !== 3) {
      throw new Error('Program must define exactly three sequence steps.');
    }

    const drafts = generateDraftRecords_({
      eventKey,
      enrollment,
      partner,
      program,
      tier,
      resources,
      sequence,
    });

    replaceChildRows_('drafts', 'event_key', eventKey, drafts);
    const generationMethod = drafts[0].generation_method || 'TEMPLATE';
    const generationModel = drafts[0].generation_model || '';
    appendRow_('log', {
      event_key: eventKey,
      enrollment_id: enrollment.enrollment_id,
      program_id: enrollment.program_id,
      source,
      result: 'DRAFTED',
      message: `${drafts.length} drafts created via ${generationMethod}${generationModel ? ` (${generationModel})` : ''}`,
      processed_at: nowIso_(),
    });

    return {
      eventKey,
      result: 'DRAFTED',
      draftCount: drafts.length,
      generationMethod,
      generationModel,
    };
  } catch (error) {
    appendRow_('log', {
      event_key: eventKey,
      enrollment_id: enrollment.enrollment_id,
      program_id: enrollment.program_id,
      source,
      result: 'FAILED',
      message: error.message,
      processed_at: nowIso_(),
    });
    throw error;
  }
}

function updateDraft(draft) {
  return withScriptLock_(() => {
    const existing = findById_('drafts', 'draft_id', draft.draft_id);
    if (!existing) {
      throw new Error(`Draft not found: ${draft.draft_id}`);
    }

    existing.subject = draft.subject ?? existing.subject;
    existing.body = draft.body ?? existing.body;
    existing.key_message = draft.key_message ?? existing.key_message;
    existing.desired_outcome =
      draft.desired_outcome ?? existing.desired_outcome;
    existing.updated_at = nowIso_();
    upsertRow_('drafts', 'draft_id', existing);
    return buildAppState_();
  });
}

function approveDraft(draftId) {
  return withScriptLock_(() => {
    const draft = findById_('drafts', 'draft_id', draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    const timestamp = nowIso_();
    draft.review_status = REVIEW_STATUS.sent;
    draft.sent_at = timestamp;
    draft.updated_at = timestamp;
    upsertRow_('drafts', 'draft_id', draft);
    return buildAppState_();
  });
}

function deleteDraft(draftId) {
  return withScriptLock_(() => {
    const draft = findById_('drafts', 'draft_id', draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    deleteRowById_('drafts', 'draft_id', draftId);
    return buildAppState_();
  });
}

function deleteDraftsForEvent(eventKey) {
  return withScriptLock_(() => {
    const drafts = readRows_('drafts').filter(
      draft => draft.event_key === eventKey,
    );
    if (!drafts.length) {
      throw new Error(`No drafts found for event: ${eventKey}`);
    }

    replaceChildRows_('drafts', 'event_key', eventKey, []);
    return buildAppState_();
  });
}

function regenerateDraft(draftId) {
  return withScriptLock_(() => {
    const draft = findById_('drafts', 'draft_id', draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    const enrollment = findById_(
      'enrollments',
      'enrollment_id',
      draft.enrollment_id,
    );
    const partner = findById_('partners', 'partner_id', draft.partner_id);
    const program = findById_('programs', 'program_id', draft.program_id);
    if (!enrollment || !partner || !program) {
      throw new Error('The draft context is incomplete.');
    }

    const tier = readRows_('tiers').find(
      row =>
        row.program_id === program.program_id &&
        row.tier_name === enrollment.tier,
    );
    const resources = readRows_('resources').filter(
      row => row.program_id === program.program_id,
    );
    const sequence = readRows_('sequence')
      .filter(row => row.program_id === program.program_id)
      .sort((left, right) => Number(left.day) - Number(right.day));
    const strategy = sequence.find(
      item => Number(item.day) === Number(draft.day),
    );
    if (!strategy) {
      throw new Error(`Missing strategy for Day ${draft.day}.`);
    }

    const generation = generateAiEmailForDay_(
      {
        enrollment,
        partner,
        program,
        tier,
        resources,
        sequence,
      },
      Number(draft.day),
    );
    const timestamp = nowIso_();

    draft.key_message = strategy.key_message;
    draft.desired_outcome = strategy.desired_outcome;
    draft.subject = generation.email.subject;
    draft.body = generation.email.body;
    draft.generation_method = generation.method;
    draft.generation_model = generation.model;
    draft.generation_note = generation.note;
    draft.review_status = REVIEW_STATUS.draft;
    draft.sent_at = '';
    draft.updated_at = timestamp;
    upsertRow_('drafts', 'draft_id', draft);

    return buildAppState_();
  });
}

function buildEventKey_(enrollment) {
  return `${enrollment.enrollment_id}|${enrollment.date_status_changed}`;
}
