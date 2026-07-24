function savePartner(partner) {
  return withScriptLock_(() => {
    const partnerId = normalizeId_(
      partner.partner_id || partner.partner_name,
    );

    if (!partnerId || !partner.partner_name || !partner.contact_email) {
      throw new Error('Partner ID, name, and contact email are required.');
    }

    upsertRow_('partners', 'partner_id', {
      partner_id: partnerId,
      partner_name: partner.partner_name,
      contact_name: partner.contact_name || '',
      contact_email: partner.contact_email,
      record_status: partner.record_status || 'ACTIVE',
      updated_at: nowIso_(),
    });

    return buildAppState_();
  });
}

function archivePartner(partnerId) {
  return withScriptLock_(() => {
    const partner = findById_('partners', 'partner_id', partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.record_status = 'ARCHIVED';
    partner.updated_at = nowIso_();
    upsertRow_('partners', 'partner_id', partner);
    return buildAppState_();
  });
}

function saveEnrollment(enrollment) {
  return withScriptLock_(() => {
    const partner = findById_(
      'partners',
      'partner_id',
      enrollment.partner_id,
    );
    const program = findById_(
      'programs',
      'program_id',
      enrollment.program_id,
    );

    if (!partner || !program) {
      throw new Error('A valid partner and program are required.');
    }

    const enrollmentId =
      enrollment.enrollment_id ||
      `ENR-${program.program_id}-${partner.partner_id}`;
    const existing = findById_(
      'enrollments',
      'enrollment_id',
      enrollmentId,
    );
    const nextStatus =
      enrollment.approval_status || APPROVAL_STATUS.pending;
    const statusChanged =
      !existing || existing.approval_status !== nextStatus;

    upsertRow_('enrollments', 'enrollment_id', {
      enrollment_id: enrollmentId,
      partner_id: partner.partner_id,
      program_id: program.program_id,
      approval_status: nextStatus,
      tier: enrollment.tier || '',
      date_status_changed: statusChanged
        ? todayIso_()
        : enrollment.date_status_changed || existing.date_status_changed,
      tracking_link:
        enrollment.tracking_link ||
        buildTrackingLink_(program, partner.partner_id),
      updated_at: nowIso_(),
    });

    return buildAppState_();
  });
}

function removeEnrollment(enrollmentId) {
  return withScriptLock_(() => {
    const enrollment = findById_(
      'enrollments',
      'enrollment_id',
      enrollmentId,
    );
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${enrollmentId}`);
    }

    enrollment.approval_status = APPROVAL_STATUS.removed;
    enrollment.date_status_changed = todayIso_();
    enrollment.updated_at = nowIso_();
    upsertRow_('enrollments', 'enrollment_id', enrollment);
    return buildAppState_();
  });
}

function simulateActivation(partnerId, programId, tier) {
  return withScriptLock_(() => {
    const partner = findById_('partners', 'partner_id', partnerId);
    const program = findById_('programs', 'program_id', programId);

    if (!partner || !program) {
      throw new Error('A valid partner and program are required.');
    }

    const enrollmentId = `ENR-${programId}-${partnerId}`;
    const existing =
      findById_('enrollments', 'enrollment_id', enrollmentId) || {};
    const enrollment = {
      enrollment_id: enrollmentId,
      partner_id: partnerId,
      program_id: programId,
      approval_status: APPROVAL_STATUS.active,
      tier: tier || existing.tier || '',
      date_status_changed: todayIso_(),
      tracking_link:
        existing.tracking_link || buildTrackingLink_(program, partnerId),
      updated_at: nowIso_(),
    };

    upsertRow_('enrollments', 'enrollment_id', enrollment);

    let processing = {
      mode: program.processing_mode,
      result: 'QUEUED_FOR_MANUAL_REVIEW',
    };

    if (
      program.status === PROGRAM_STATUS.active &&
      program.processing_mode === PROCESSING_MODE.auto
    ) {
      processing = processEnrollment_(enrollment, program, 'SIMULATION');
    }

    return {
      processing,
      state: buildAppState_(),
    };
  });
}
