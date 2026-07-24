function installScheduledTrigger() {
  removeScheduledTrigger_();
  ScriptApp.newTrigger('scheduledScan')
    .timeBased()
    .everyMinutes(APP_CONFIG.scanIntervalMinutes)
    .create();

  return buildAppState_();
}

function removeScheduledTrigger() {
  removeScheduledTrigger_();
  return buildAppState_();
}

function scheduledScan() {
  return withScriptLock_(() => scanForActivations_('SCHEDULED_SCAN'));
}

function removeScheduledTrigger_() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'scheduledScan')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

function getScheduledTriggerInfo_() {
  const trigger = ScriptApp.getProjectTriggers().find(
    item => item.getHandlerFunction() === 'scheduledScan',
  );

  return {
    installed: Boolean(trigger),
    intervalMinutes: APP_CONFIG.scanIntervalMinutes,
  };
}
