function saveProgram(payload) {
  return withScriptLock_(() => {
    const timestamp = nowIso_();
    const program = payload.program || {};
    const programId = normalizeId_(
      program.program_id || program.client_name || program.program_name,
    );

    if (!programId || !program.client_name || !program.program_name) {
      throw new Error('Program ID, client name, and program name are required.');
    }

    upsertRow_('programs', 'program_id', {
      program_id: programId,
      client_name: program.client_name,
      program_name: program.program_name,
      overview: program.overview || '',
      brand_voice: program.brand_voice || '',
      support_email: program.support_email || '',
      tracking_link_template: program.tracking_link_template || '',
      coordinator_name: program.coordinator_name || '',
      processing_mode:
        program.processing_mode === PROCESSING_MODE.manual
          ? PROCESSING_MODE.manual
          : PROCESSING_MODE.auto,
      status: program.status || PROGRAM_STATUS.active,
      updated_at: timestamp,
    });

    const tiers = (payload.tiers || []).map(tier => ({
      program_id: programId,
      tier_name: tier.tier_name,
      commission_summary: tier.commission_summary || '',
      bonus_summary: tier.bonus_summary || '',
    }));

    const resources = (payload.resources || []).map(resource => ({
      resource_id: resource.resource_id || makeId_('RES'),
      program_id: programId,
      resource_type: resource.resource_type || 'OTHER',
      resource_name: resource.resource_name || 'Resource',
      url: resource.url || '',
    }));

    const sequence = (payload.sequence || []).map(item => ({
      program_id: programId,
      day: String(item.day),
      goal: item.goal || '',
      key_message: item.key_message || '',
      desired_outcome: item.desired_outcome || '',
    }));

    replaceChildRows_('tiers', 'program_id', programId, tiers);
    replaceChildRows_('resources', 'program_id', programId, resources);
    replaceChildRows_('sequence', 'program_id', programId, sequence);

    return buildAppState_();
  });
}

function setProgramProcessingMode(programId, mode) {
  return withScriptLock_(() => {
    const program = findById_('programs', 'program_id', programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    program.processing_mode =
      mode === PROCESSING_MODE.manual
        ? PROCESSING_MODE.manual
        : PROCESSING_MODE.auto;
    program.updated_at = nowIso_();
    upsertRow_('programs', 'program_id', program);
    return buildAppState_();
  });
}

function archiveProgram(programId) {
  return withScriptLock_(() => {
    const program = findById_('programs', 'program_id', programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    program.status = PROGRAM_STATUS.archived;
    program.updated_at = nowIso_();
    upsertRow_('programs', 'program_id', program);
    return buildAppState_();
  });
}
