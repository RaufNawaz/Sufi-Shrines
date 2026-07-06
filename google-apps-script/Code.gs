var DEFAULT_SHEET_NAME = "";

// The shared secret lives in Script Properties, NOT in this tracked file:
// Apps Script editor > Project Settings > Script properties > add
// SCRIPT_API_KEY with a long random value. Requests must send the same
// value as payload.apiKey (SHRINES_APPS_SCRIPT_API_KEY on the client side).
function getScriptApiKey_() {
  var stored = PropertiesService.getScriptProperties().getProperty("SCRIPT_API_KEY");
  return trim_(stored || "");
}

var KEY_FIELDS = ["Name", "Location", "Latitude", "Longitude", "Category"];
var ID_FIELDS = ["ID", "Id", "id", "Row ID", "RowID", "Slug", "slug"];

function doPost(e) {
  try {
    var payload = parsePayload_(e);
    validateApiKey_(payload.apiKey);

    if (String(payload.action || "").trim() !== "save_shrine") {
      throw new Error("Unsupported action.");
    }

    var result = saveShrine_(payload);
    return jsonResponse_({
      ok: true,
      rowNumber: result.rowNumber,
      addedColumns: result.addedColumns,
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body.");
  }

  var parsed = JSON.parse(e.postData.contents);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid request payload.");
  }

  return parsed;
}

function validateApiKey_(providedApiKey) {
  var expectedApiKey = getScriptApiKey_();
  // Fail closed: an unset key must reject writes, not disable auth.
  if (!expectedApiKey) {
    throw new Error("SCRIPT_API_KEY script property is not set.");
  }

  if (trim_(providedApiKey) !== expectedApiKey) {
    throw new Error("Invalid API key.");
  }
}

function saveShrine_(payload) {
  var sheet = getTargetSheet_(payload);
  var originalRow = normalizeRow_(payload.originalRow);
  var updatedRow = normalizeRow_(payload.updatedRow);

  if (!updatedRow.Name) {
    throw new Error("Updated row must include Name.");
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var headers = headerValues.map(trim_);

  while (headers.length && !headers[headers.length - 1]) {
    headers.pop();
  }

  if (!headers.length) {
    headers = Object.keys(updatedRow);
  }

  if (!headers.length) {
    throw new Error("The sheet must have a header row.");
  }

  var addedColumns = [];
  Object.keys(updatedRow).forEach(function (key) {
    if (headers.indexOf(key) !== -1) return;
    headers.push(key);
    addedColumns.push(key);
  });

  if (addedColumns.length || headerValues.length !== headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  var dataRowCount = Math.max(sheet.getLastRow() - 1, 0);
  var dataValues = dataRowCount
    ? sheet.getRange(2, 1, dataRowCount, headers.length).getValues()
    : [];

  var rowNumber = findRowNumber_(
    headers,
    dataValues,
    originalRow,
    payload.rowKey,
    payload.rowIndex,
  );

  if (!rowNumber) {
    throw new Error("Could not match the shrine row in the sheet.");
  }

  var rowValues = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(updatedRow, header)
      ? updatedRow[header]
      : "";
  });

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([rowValues]);
  SpreadsheetApp.flush();

  return {
    rowNumber: rowNumber,
    addedColumns: addedColumns,
  };
}

function getTargetSheet_(payload) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var requestedSheetName = trim_(payload.sheetName || DEFAULT_SHEET_NAME);
  var sheet = requestedSheetName
    ? spreadsheet.getSheetByName(requestedSheetName)
    : spreadsheet.getSheets()[0];

  if (!sheet) {
    throw new Error("Could not find the target sheet.");
  }

  return sheet;
}

function findRowNumber_(headers, dataValues, originalRow, rowKey, rowIndex) {
  var hintedIndex = Number(rowIndex);
  if (isFinite(hintedIndex) && hintedIndex >= 0 && hintedIndex < dataValues.length) {
    if (rowMatches_(headers, dataValues[hintedIndex], originalRow, rowKey)) {
      return hintedIndex + 2;
    }
  }

  var explicitId = getExplicitId_(originalRow);
  if (explicitId) {
    for (var idIndex = 0; idIndex < dataValues.length; idIndex += 1) {
      var idCandidate = mapRow_(headers, dataValues[idIndex]);
      if (getExplicitId_(idCandidate) === explicitId) {
        return idIndex + 2;
      }
    }
  }

  for (var index = 0; index < dataValues.length; index += 1) {
    if (rowMatches_(headers, dataValues[index], originalRow, rowKey)) {
      return index + 2;
    }
  }

  return null;
}

function rowMatches_(headers, rowValues, originalRow, rowKey) {
  var candidateRow = mapRow_(headers, rowValues);
  var explicitId = getExplicitId_(originalRow);

  if (explicitId && getExplicitId_(candidateRow) === explicitId) {
    return true;
  }

  var normalizedRowKey = trim_(rowKey);
  if (normalizedRowKey && buildRowKey_(candidateRow) === normalizedRowKey) {
    return true;
  }

  return buildRowKey_(candidateRow) === buildRowKey_(originalRow);
}

function mapRow_(headers, rowValues) {
  var mapped = {};

  for (var index = 0; index < headers.length; index += 1) {
    var key = trim_(headers[index]);
    if (!key) continue;

    mapped[key] = rowValues[index] === null || rowValues[index] === undefined
      ? ""
      : String(rowValues[index]).trim();
  }

  return mapped;
}

function normalizeRow_(row) {
  var normalized = {};

  Object.keys(row || {}).forEach(function (key) {
    var cleanedKey = trim_(key);
    if (!cleanedKey || cleanedKey.charAt(0) === "_") return;

    var value = row[key];
    normalized[cleanedKey] =
      value === null || value === undefined ? "" : String(value).trim();
  });

  return normalized;
}

function buildRowKey_(row) {
  var normalized = normalizeRow_(row);
  return KEY_FIELDS.map(function (field) {
    return normalized[field] || "";
  }).join("||");
}

function getExplicitId_(row) {
  var normalized = normalizeRow_(row);

  for (var index = 0; index < ID_FIELDS.length; index += 1) {
    var value = trim_(normalized[ID_FIELDS[index]]);
    if (value) return value;
  }

  return "";
}

function trim_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
