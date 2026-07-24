function buildAppState_() {
  const programs = readRows_('programs');
  const tiers = readRows_('tiers');
  const resources = readRows_('resources');
  const sequence = readRows_('sequence');
  const partners = readRows_('partners');
  const enrollments = readRows_('enrollments');
  const drafts = readRows_('drafts');
  const log = readRows_('log');

  return {
    meta: {
      generatedAt: nowIso_(),
      scanIntervalMinutes: APP_CONFIG.scanIntervalMinutes,
      spreadsheetUrl: getSpreadsheet_().getUrl(),
      trigger: getScheduledTriggerInfo_(),
    },
    programs: programs.map(program => ({
      ...program,
      tiers: tiers.filter(tier => tier.program_id === program.program_id),
      resources: resources.filter(
        resource => resource.program_id === program.program_id,
      ),
      sequence: sequence
        .filter(item => item.program_id === program.program_id)
        .sort((left, right) => Number(left.day) - Number(right.day)),
    })),
    partners,
    enrollments,
    drafts,
    log: log.slice(-25).reverse(),
  };
}
