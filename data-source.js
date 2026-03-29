/* global Papa */

(function initShrineDataSource() {
  const CSV_FILE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv";
  const OVERRIDES_STORAGE_KEY = "shrines_local_overrides_v1";
  const EDITOR_SESSION_STORAGE_KEY = "shrines_editor_session_v1";

  function getEditorConfig() {
    const rawConfig =
      typeof window !== "undefined" &&
      window.SHRINES_EDITOR_CONFIG &&
      typeof window.SHRINES_EDITOR_CONFIG === "object"
        ? window.SHRINES_EDITOR_CONFIG
        : null;

    if (!rawConfig || rawConfig.enabled === false) return null;

    const password = String(rawConfig.password || "").trim();
    if (!password) return null;

    const googleSheetsRaw =
      rawConfig.googleSheets && typeof rawConfig.googleSheets === "object"
        ? rawConfig.googleSheets
        : {};

    return {
      password,
      localOnlyNotice:
        String(rawConfig.localOnlyNotice || "").trim() ||
        "Edits are stored only in this browser on this device.",
      googleSheets: {
        endpointUrl: String(googleSheetsRaw.endpointUrl || "").trim(),
        apiKey: String(googleSheetsRaw.apiKey || "").trim(),
        sheetName: String(googleSheetsRaw.sheetName || "").trim(),
        localMirrorAfterSave: googleSheetsRaw.localMirrorAfterSave !== false,
        saveNotice: String(googleSheetsRaw.saveNotice || "").trim(),
      },
    };
  }

  function normalizeRow(row) {
    const normalized = {};

    for (const [key, value] of Object.entries(row || {})) {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) continue;
      normalized[normalizedKey] =
        typeof value === "string" ? value.trim() : value ?? "";
    }

    return normalized;
  }

  function buildRowKey(row) {
    const normalized = normalizeRow(row);
    return [
      normalized.Name || "",
      normalized.Location || "",
      normalized.Latitude || "",
      normalized.Longitude || "",
      normalized.Category || "",
    ].join("||");
  }

  function loadOverridesMap() {
    try {
      const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveOverridesMap(overrides) {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides || {}));
  }

  function sanitizeOverrideRow(row) {
    const cleaned = {};

    Object.entries(normalizeRow(row)).forEach(([key, value]) => {
      if (!key || key.startsWith("_")) return;
      cleaned[key] = value;
    });

    return cleaned;
  }

  function applyOverrides(rows) {
    const overrides = loadOverridesMap();

    return (rows || []).map((rawRow) => {
      const baseRow = normalizeRow(rawRow);
      const rowKey = buildRowKey(baseRow);
      const overrideRow = overrides[rowKey];

      const mergedRow = normalizeRow({
        ...baseRow,
        ...(overrideRow || {}),
      });

      mergedRow._localKey = rowKey;
      mergedRow._hasLocalOverride = Boolean(overrideRow);
      return mergedRow;
    });
  }

  function fetchRowsFromCsv() {
    return new Promise((resolve, reject) => {
      Papa.parse(CSV_FILE, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve((results.data || []).map(normalizeRow));
        },
        error: reject,
      });
    });
  }

  async function fetchRows() {
    const rows = await fetchRowsFromCsv();
    return {
      rows: applyOverrides(rows),
      source: "csv",
    };
  }

  function isEditorEnabled() {
    return Boolean(getEditorConfig());
  }

  function isGoogleSheetsSaveEnabled() {
    return Boolean(getEditorConfig()?.googleSheets?.endpointUrl);
  }

  function isEditorAuthenticated() {
    if (!isEditorEnabled()) return false;
    return localStorage.getItem(EDITOR_SESSION_STORAGE_KEY) === "1";
  }

  function loginEditor(password) {
    const config = getEditorConfig();
    if (!config) return false;

    const success = String(password || "") === config.password;
    if (success) {
      localStorage.setItem(EDITOR_SESSION_STORAGE_KEY, "1");
    }

    return success;
  }

  function logoutEditor() {
    localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY);
  }

  function saveRowOverride(rowKey, row) {
    const normalizedKey = String(rowKey || "").trim();
    if (!normalizedKey) throw new Error("Missing row key for local override.");

    const overrides = loadOverridesMap();
    overrides[normalizedKey] = sanitizeOverrideRow(row);
    saveOverridesMap(overrides);
  }

  function clearRowOverride(rowKey) {
    const normalizedKey = String(rowKey || "").trim();
    if (!normalizedKey) return;

    const overrides = loadOverridesMap();
    delete overrides[normalizedKey];
    saveOverridesMap(overrides);
  }

  function clearRowOverrideKeys(rowKeys) {
    const overrides = loadOverridesMap();
    let changed = false;

    (rowKeys || []).forEach((rowKey) => {
      const normalizedKey = String(rowKey || "").trim();
      if (!normalizedKey || !Object.prototype.hasOwnProperty.call(overrides, normalizedKey)) {
        return;
      }

      delete overrides[normalizedKey];
      changed = true;
    });

    if (changed) saveOverridesMap(overrides);
  }

  function mirrorRowOverride(rowKey, row) {
    const cleanedRow = sanitizeOverrideRow(row);
    const mirrorKeys = Array.from(
      new Set([String(rowKey || "").trim(), buildRowKey(cleanedRow)].filter(Boolean)),
    );

    if (!mirrorKeys.length) return;

    const overrides = loadOverridesMap();
    mirrorKeys.forEach((key) => {
      overrides[key] = cleanedRow;
    });
    saveOverridesMap(overrides);
  }

  async function saveRowToGoogleSheet(rowKey, originalRow, row, options = {}) {
    const config = getEditorConfig();
    const googleSheets = config?.googleSheets;

    if (!googleSheets?.endpointUrl) {
      throw new Error("Google Sheet saving is not configured.");
    }

    if (typeof fetch !== "function") {
      throw new Error("This browser cannot send Google Sheet updates.");
    }

    const normalizedKey = String(rowKey || "").trim();
    if (!normalizedKey) throw new Error("Missing row key for Google Sheet save.");

    const sanitizedOriginalRow = sanitizeOverrideRow(originalRow);
    const sanitizedRow = sanitizeOverrideRow(row);

    const payload = {
      action: "save_shrine",
      apiKey: googleSheets.apiKey,
      sheetName: googleSheets.sheetName,
      rowKey: normalizedKey,
      rowIndex: Number.isInteger(options.rowIndex) ? options.rowIndex : null,
      originalRow: sanitizedOriginalRow,
      updatedRow: sanitizedRow,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(googleSheets.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      credentials: "omit",
      cache: "no-store",
    });

    const responseText = await response.text();
    let parsed = null;

    if (responseText) {
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      throw new Error(
        parsed?.error || responseText || `Request failed with status ${response.status}.`,
      );
    }

    if (parsed && parsed.ok === false) {
      throw new Error(parsed.error || "Google Sheet save failed.");
    }

    const nextRowKey = buildRowKey(sanitizedRow);

    if (googleSheets.localMirrorAfterSave !== false) {
      mirrorRowOverride(normalizedKey, sanitizedRow);
    } else {
      clearRowOverrideKeys([normalizedKey, nextRowKey]);
    }

    return {
      ...(parsed || {}),
      mirroredLocally: googleSheets.localMirrorAfterSave !== false,
    };
  }

  window.ShrineDataSource = {
    CSV_FILE,
    fetchRows,
    fetchRowsFromCsv,
    normalizeRow,
    buildRowKey,
    getEditorConfig,
    isEditorEnabled,
    isGoogleSheetsSaveEnabled,
    isEditorAuthenticated,
    loginEditor,
    logoutEditor,
    saveRowOverride,
    saveRowToGoogleSheet,
    clearRowOverride,
  };
})();
