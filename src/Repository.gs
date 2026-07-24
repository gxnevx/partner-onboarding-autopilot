function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    APP_CONFIG.spreadsheetProperty,
  );

  if (!spreadsheetId) {
    throw new Error(
      'Spreadsheet is not configured. Run setupDemoSpreadsheet() first.',
    );
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getSheet_(sheetKey) {
  const sheetName = APP_CONFIG.sheets[sheetKey];
  const sheet = getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Missing sheet: ${sheetName}`);
  }

  return sheet;
}

function readRows_(sheetKey) {
  const sheet = getSheet_(sheetKey);
  const values = sheet.getDataRange().getDisplayValues();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];
  return values.slice(1).filter(row => row.some(Boolean)).map(row => {
    return headers.reduce((record, header, index) => {
      record[header] = row[index] || '';
      return record;
    }, {});
  });
}

function appendRow_(sheetKey, record) {
  const sheet = getSheet_(sheetKey);
  const headers = APP_CONFIG.headers[sheetKey];
  sheet.appendRow(headers.map(header => record[header] ?? ''));
}

function upsertRow_(sheetKey, idField, record) {
  const sheet = getSheet_(sheetKey);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf(idField);
  const rowIndex = values.findIndex(
    (row, index) => index > 0 && String(row[idIndex]) === String(record[idField]),
  );
  const rowValues = headers.map(header => record[header] ?? '');

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
    return;
  }

  sheet
    .getRange(rowIndex + 1, 1, 1, headers.length)
    .setValues([rowValues]);
}

function replaceChildRows_(sheetKey, parentField, parentId, records) {
  const sheet = getSheet_(sheetKey);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const parentIndex = headers.indexOf(parentField);
  const retained = values
    .slice(1)
    .filter(row => String(row[parentIndex]) !== String(parentId));
  const replacement = records.map(record =>
    headers.map(header => record[header] ?? ''),
  );

  sheet.clearContents();
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers]);
  formatHeader_(sheet, headers.length);

  const nextRows = retained.concat(replacement);
  if (nextRows.length) {
    sheet
      .getRange(2, 1, nextRows.length, headers.length)
      .setValues(nextRows);
  }
}

function formatHeader_(sheet, columnCount) {
  sheet
    .getRange(1, 1, 1, columnCount)
    .setFontWeight('bold')
    .setBackground('#14213d')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function makeId_(prefix) {
  return `${prefix}-${Utilities.getUuid().split('-')[0].toUpperCase()}`;
}

function nowIso_() {
  return new Date().toISOString();
}

function todayIso_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd',
  );
}

function findById_(sheetKey, idField, idValue) {
  return (
    readRows_(sheetKey).find(
      row => String(row[idField]) === String(idValue),
    ) || null
  );
}

function indexBy_(records, field) {
  return records.reduce((index, record) => {
    index[record[field]] = record;
    return index;
  }, {});
}

function normalizeId_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildTrackingLink_(program, partnerId) {
  return String(program.tracking_link_template || '').replace(
    '{partner_id}',
    partnerId,
  );
}

function withScriptLock_(operation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    return operation();
  } finally {
    lock.releaseLock();
  }
}
