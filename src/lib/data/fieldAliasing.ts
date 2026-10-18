import type { ShrineRow } from '../../types/shrine';

export function getFieldValue(row: ShrineRow, baseKey: string): string {
  const value = row?.[baseKey];
  if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  return '';
}

export function getUrduFieldValue(row: ShrineRow, baseKey: string): string {
  const candidates = [
    `${baseKey} Urdu`,
    `${baseKey}_ur`,
    `${baseKey} (Urdu)`,
    `${baseKey} UR`,
    `Urdu ${baseKey}`,
  ];

  if (baseKey === 'Name') {
    candidates.unshift('Urdu Name', 'Name (Urdu)', 'NameUrdu');
  }

  for (const key of candidates) {
    const value = getFieldValue(row, key);
    if (value) return value;
  }

  return '';
}

export function isUrduVariantKey(key: string): boolean {
  return /urdu|_ur|\(urdu\)|\bur\b/i.test(String(key || ''));
}

export function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('www.');
}

export function normalizeUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  let url = String(rawUrl).trim();
  if (!url) return null;
  if (url.startsWith('//')) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, '')}`;
  return url;
}

const FOUNDED_QUALIFIER_WORDS = [
  'completed/consecrated',
  'completed',
  'consecrated',
  'constructed',
  'established',
  'founded',
  'opened',
  'built',
];

const FOUNDED_QUALIFIER_PREFIX = new RegExp(
  `^(?:${FOUNDED_QUALIFIER_WORDS.map((w) => w.replace('/', '\\/')).join('|')})\\b\\s*(?:in\\s+)?[:\\-]?\\s*`,
  'i',
);

/**
 * Strips a leading qualifier word ("Completed/consecrated 1640" -> "1640")
 * from a Founded/Opened display value. Values that are already clean
 * (a bare year, "17th century", etc.) pass through unchanged.
 */
export function normalizeFoundedDate(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(FOUNDED_QUALIFIER_PREFIX, '').trim();
}

/**
 * CONTINUATION COLUMNS (Rauf, 13 October 2026, HANDOVER §9.334/§9.336/§9.346).
 *
 * A Google Sheets cell holds at most 50,000 characters, and the longest
 * rewritten articles run to ~194k. They are SPLIT, never cut: the import puts
 * the first part in `Description` and the rest in `Description 2`,
 * `Description 3`, …, each part under 50k and each split made only where a
 * `## ` section begins. Every row is joined back here, before anything reads
 * it, so the lead, the inline sections, the bibliography and search all see
 * one article, and no `Description N` key survives to show up as an infobox
 * field. The parts are joined with a blank line, which is exactly what the
 * import removed (`pipeline/build_import_2026_10_15.py` asserts the round
 * trip, and writes the columns contiguously: the walk stops at the first
 * missing number). `scripts/data/build-dataset.mjs` does the same join; the
 * two are kept in step by `fieldAliasing.test.ts`.
 *
 * Written small on purpose: this module is in every route's eager JS, and
 * PlacePage had 223 bytes of budget left when it was added (15 Oct 2026).
 */
export function joinContinuationColumns(row: ShrineRow): ShrineRow {
  for (let n = 2, k = 'Description 2'; k in row; k = `Description ${++n}`) {
    const s = String(row[k] ?? '').trim();
    if (s) row.Description = row.Description ? `${row.Description}\n\n${s}` : s;
    delete row[k];
  }
  return row;
}

export function normalizeRow(row: Record<string, unknown>): ShrineRow {
  const normalized: ShrineRow = {};
  for (const [key, value] of Object.entries(row)) {
    const k = String(key).trim();
    if (!k) continue;
    normalized[k] = typeof value === 'string' ? value.trim() : value != null ? String(value) : '';
  }
  return joinContinuationColumns(normalized);
}
