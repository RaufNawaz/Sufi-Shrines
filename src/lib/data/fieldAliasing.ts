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

export function normalizeRow(row: Record<string, unknown>): ShrineRow {
  const normalized: ShrineRow = {};
  for (const [key, value] of Object.entries(row)) {
    const k = String(key).trim();
    if (!k) continue;
    normalized[k] = typeof value === 'string' ? value.trim() : value != null ? String(value) : '';
  }
  return normalized;
}
