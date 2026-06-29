/**
 * Fetches the live Google Sheets CSV and writes a committed snapshot to
 * src/data/shrines-fallback.json. Run via: npm run data:snapshot
 *
 * The production build never fetches live data — it reads this committed file.
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Papa = require('papaparse');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'shrines-fallback.json');

const CSV_URL =
  process.env.VITE_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv';

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const k = String(key).trim();
    if (!k) continue;
    out[k] = typeof value === 'string' ? value.trim() : value != null ? String(value) : '';
  }
  return out;
}

function isValidRow(row) {
  if (!row.Name || !String(row.Name).trim()) return false;
  const lat = parseFloat(row.Latitude || '');
  const lng = parseFloat(row.Longitude || '');
  return isFinite(lat) && isFinite(lng);
}

console.log('Fetching shrine CSV from Google Sheets…');
const res = await fetch(CSV_URL);
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
const csvText = await res.text();

const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true });

if (errors.length) {
  console.warn('PapaParse warnings:', errors.slice(0, 5));
}

const normalized = data.map(normalizeRow);
const valid = normalized.filter(isValidRow);
const skipped = normalized.length - valid.length;

if (skipped > 0) {
  console.warn(`Skipped ${skipped} row(s) with missing Name or invalid Latitude/Longitude.`);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT_FILE,
  JSON.stringify({ generated: new Date().toISOString(), count: valid.length, rows: valid }, null, 2),
  'utf8',
);

console.log(`✓ Wrote ${valid.length} shrine rows → ${OUT_FILE}`);
