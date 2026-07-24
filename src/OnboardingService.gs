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
    appendRow_('log', {
      event_key: eventKey,
      enrollment_id: enrollment.enrollment_id,
      program_id: enrollment.program_id,
      source,
      result: 'DRAFTED',
      message: `${drafts.length} drafts created`,
      processed_at: nowIso_(),
    });

    return {
      eventKey,
      result: 'DRAFTED',
      draftCount: drafts.length,
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

    draft.review_status = REVIEW_STATUS.approved;
    draft.updated_at = nowIso_();
    upsertRow_('drafts', 'draft_id', draft);
    return buildAppState_();
  });
}

function buildEventKey_(enrollment) {
  return `${enrollment.enrollment_id}|${enrollment.date_status_changed}`;
}
