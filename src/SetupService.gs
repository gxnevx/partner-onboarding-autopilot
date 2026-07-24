function setupDemoSpreadsheet() {
  const spreadsheet = SpreadsheetApp.create(
    'Partner Onboarding Autopilot - Demo Data',
  );
  PropertiesService.getScriptProperties().setProperty(
    APP_CONFIG.spreadsheetProperty,
    spreadsheet.getId(),
  );

  const defaultSheet = spreadsheet.getSheets()[0];
  defaultSheet.setName(APP_CONFIG.sheets.programs);

  Object.keys(APP_CONFIG.sheets).forEach(sheetKey => {
    let sheet = spreadsheet.getSheetByName(APP_CONFIG.sheets[sheetKey]);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(APP_CONFIG.sheets[sheetKey]);
    }

    const headers = APP_CONFIG.headers[sheetKey];
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeader_(sheet, headers.length);
  });

  seedDemoData_();
  formatDemoSheets_();

  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function seedDemoData_() {
  const timestamp = nowIso_();

  appendRow_('programs', {
    program_id: 'LEDGERLY',
    client_name: 'Ledgerly',
    program_name: 'Ledgerly Partner Program',
    overview:
      'B2B SaaS accounting automation for mid-market finance teams.',
    brand_voice:
      'Professional, credible, no fluff. Finance-leader-to-finance-leader. Confident but not salesy.',
    support_email: 'partners@ledgerly.io',
    tracking_link_template: 'https://ledgerly.io/ref/{partner_id}',
    coordinator_name: 'Vitor Carro',
    processing_mode: PROCESSING_MODE.auto,
    status: PROGRAM_STATUS.active,
    updated_at: timestamp,
  });

  [
    {
      program_id: 'LEDGERLY',
      tier_name: 'Standard',
      commission_summary:
        '20% of first-year contract value on referred deals',
      bonus_summary: '',
    },
    {
      program_id: 'LEDGERLY',
      tier_name: 'Premium',
      commission_summary:
        '25% of first-year contract value on referred deals',
      bonus_summary:
        '$500 bonus after 3 referred deals close in a quarter',
    },
  ].forEach(row => appendRow_('tiers', row));

  [
    {
      resource_id: 'RES-LEDGERLY-ENABLEMENT',
      program_id: 'LEDGERLY',
      resource_type: 'ENABLEMENT',
      resource_name: 'Partner enablement deck & one-pagers',
      url: 'https://www.example1.com',
      ai_context:
        'Use this resource on Day 3 to help the partner prepare for a first qualified opportunity.',
    },
    {
      resource_id: 'RES-LEDGERLY-MESSAGING',
      program_id: 'LEDGERLY',
      resource_type: 'MESSAGING',
      resource_name: 'Co-branded messaging guidelines',
      url: 'https://www.example2.com',
      ai_context:
        'Position Ledgerly as accounting automation for mid-market finance teams. Keep the introduction practical, peer-to-peer, and not salesy. Do not invent pain points, metrics, features, or outcomes.',
    },
    {
      resource_id: 'RES-LEDGERLY-PORTAL',
      program_id: 'LEDGERLY',
      resource_type: 'PORTAL',
      resource_name: 'Partner portal',
      url: 'https://www.example3.com',
      ai_context:
        'Use this portal for deal registration and commission tracking.',
    },
  ].forEach(row => appendRow_('resources', row));

  [
    {
      program_id: 'LEDGERLY',
      day: '0',
      goal:
        'Warm welcome, confirm approval, and share the tracking link and portal.',
      key_message:
        'You are approved and have everything you need to begin.',
      desired_outcome:
        'The partner opens the portal and saves the tracking link.',
    },
    {
      program_id: 'LEDGERLY',
      day: '3',
      goal:
        'Drive first activation with enablement material and deal registration.',
      key_message:
        'Your fastest path to activation is one well-matched registered opportunity.',
      desired_outcome:
        'The partner identifies and registers a first potential deal.',
    },
    {
      program_id: 'LEDGERLY',
      day: '7',
      goal:
        'Friendly check-in, offer help, and share one tip on positioning Ledgerly to finance leaders.',
      key_message:
        'Position Ledgerly as accounting automation for mid-market finance teams in a practical, peer-to-peer way.',
      desired_outcome:
        'The partner feels supported and can use one clear Ledgerly positioning tip with a finance leader.',
    },
  ].forEach(row => appendRow_('sequence', row));

  const partners = [
    ['P-1042', 'Bright Path Consulting', 'Dana Ruiz', 'dana@brightpathconsulting.com'],
    ['P-1043', 'Northline Advisory', 'Sam Okafor', 'sam@northlineadvisory.com'],
    ['P-1044', 'Verve Systems Group', 'Priya Nair', 'priya@vervesystemsgroup.com'],
    ['P-1045', 'Anchorpoint CPAs', 'Liam Foster', 'liam@anchorpointcpas.com'],
  ];

  partners.forEach(([partnerId, partnerName, contactName, contactEmail]) => {
    appendRow_('partners', {
      partner_id: partnerId,
      partner_name: partnerName,
      contact_name: contactName,
      contact_email: contactEmail,
      record_status: 'ACTIVE',
      updated_at: timestamp,
    });
  });

  [
    ['P-1042', 'ACTIVE', 'Standard', '2026-07-23'],
    ['P-1043', 'PENDING', 'Standard', '2026-07-20'],
    ['P-1044', 'ACTIVE', 'Premium', '2026-07-23'],
    ['P-1045', 'PENDING', 'Standard', '2026-07-18'],
  ].forEach(([partnerId, status, tier, changedAt]) => {
    appendRow_('enrollments', {
      enrollment_id: `ENR-LEDGERLY-${partnerId}`,
      partner_id: partnerId,
      program_id: 'LEDGERLY',
      approval_status: status,
      tier,
      date_status_changed: changedAt,
      tracking_link: `https://ledgerly.io/ref/${partnerId}`,
      updated_at: timestamp,
    });
  });
}

function formatDemoSheets_() {
  Object.keys(APP_CONFIG.sheets).forEach(sheetKey => {
    const sheet = getSheet_(sheetKey);
    sheet.autoResizeColumns(1, APP_CONFIG.headers[sheetKey].length);
  });
}
