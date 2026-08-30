#!/usr/bin/env node
/**
 * build-dataset.mjs — Build-time ETL: Google Sheets CSV → canonical dataset.
 *
 * Pulls the published CSV, normalizes and validates every row using the same
 * rules as the app, and writes:
 *   data/shrines.json   — canonical versioned dataset (schema_version + rows)
 *   data/shrines.csv    — CSV mirror for Frictionless / human inspection
 *   src/data/shrines-fallback.json — app snapshot kept in sync (existing import)
 *   src/data/shrines-index.json    — the map's slim index (same rows, ~7% of the bytes)
 *
 * Output is idempotent: if the fetched rows produce the same SHA-256 digest as
 * the existing data/shrines.json, the files are not touched — so a re-run on
 * an unchanged Sheet produces no git diff.
 *
 * Usage:  node scripts/data/build-dataset.mjs
 * Or:     npm run data:build
 *
 * Environment:
 *   VITE_CSV_URL  — override the Google Sheets CSV URL
 *                   (default: csvUrl in data/csv-source.json)
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Papa = require('papaparse');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DATA_DIR = join(ROOT, 'data');
const SHRINES_JSON = join(DATA_DIR, 'shrines.json');
const SHRINES_CSV = join(DATA_DIR, 'shrines.csv');
const SNAPSHOT_JSON = join(ROOT, 'src', 'data', 'shrines-fallback.json');
const INDEX_JSON = join(ROOT, 'src', 'data', 'shrines-index.json');

const SCHEMA_VERSION = '1.0.0';

const CSV_URL =
  process.env.VITE_CSV_URL ||
  JSON.parse(readFileSync(join(ROOT, 'data', 'csv-source.json'), 'utf8')).csvUrl;

// ── helpers ───────────────────────────────────────────────────────────────

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
  // A named row is kept even without coordinates (22 Aug 2026 ruling:
  // unmapped rows get pages, honestly marked — dropping them here was why
  // Shah Gohar Peer's finished Urdu article was invisible). Rows with
  // OUT-OF-RANGE coordinates are still rejected: that's corruption, not
  // absence.
  if (!String(row.Name ?? '').trim()) return false;
  const latRaw = String(row.Latitude ?? '').trim();
  const lngRaw = String(row.Longitude ?? '').trim();
  if (!latRaw && !lngRaw) return true; // unmapped, kept
  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

function rowSortKey(row) {
  const slug = String(row['Slug'] ?? row['slug'] ?? '').trim();
  if (slug) return slug;
  return String(row['Name'] ?? row['name'] ?? '').trim().toLowerCase();
}

function rowsDigest(rows) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

// ── fetch ─────────────────────────────────────────────────────────────────

console.log(`Fetching shrine CSV…`);
const res = await fetch(CSV_URL);
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
const csvText = await res.text();

const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
if (errors.length) console.warn('PapaParse warnings:', errors.slice(0, 5));

// ── normalize + validate ───────────────────────────────────────────────────

const normalized = data.map(normalizeRow);
const valid = normalized.filter(isValidRow);
const skipped = normalized.length - valid.length;
if (skipped > 0) {
  console.warn(`Skipped ${skipped} invalid row(s) — missing Name or out-of-range lat/lng.`);
}

// ── stable sort for deterministic diffs ───────────────────────────────────

valid.sort((a, b) => rowSortKey(a).localeCompare(rowSortKey(b)));

// ── idempotency check ─────────────────────────────────────────────────────

mkdirSync(DATA_DIR, { recursive: true });

const newDigest = rowsDigest(valid);
const existing = existsSync(SHRINES_JSON)
  ? (() => { try { return JSON.parse(readFileSync(SHRINES_JSON, 'utf8')); } catch { return null; } })()
  : null;
const existingDigest = existing ? rowsDigest(existing.rows ?? []) : null;

if (newDigest === existingDigest) {
  console.log(`✓ ${valid.length} rows — no changes (digest match). Files untouched.`);
  process.exit(0);
}

const generated = new Date().toISOString();

// ── write data/shrines.json ────────────────────────────────────────────────

const canonical = {
  schema_version: SCHEMA_VERSION,
  generated,
  count: valid.length,
  rows: valid,
};
writeFileSync(SHRINES_JSON, JSON.stringify(canonical, null, 2) + '\n', 'utf8');
console.log(`✓ data/shrines.json — ${valid.length} rows`);

// ── write data/shrines.csv ─────────────────────────────────────────────────

const csvOut = Papa.unparse(valid, { header: true });
writeFileSync(SHRINES_CSV, csvOut, 'utf8');
console.log(`✓ data/shrines.csv — CSV mirror`);

// ── sync src/data/shrines-fallback.json (app snapshot) ────────────────────

const snapshot = { generated, count: valid.length, rows: valid };
writeFileSync(SNAPSHOT_JSON, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
console.log(`✓ src/data/shrines-fallback.json — app snapshot synced`);

// ── write src/data/shrines-index.json (the map's slim index) ───────────────
/*
 * The front door downloads 672 KB of article prose to draw 169 dots.
 *
 * Measured 29 August 2026 on a phone at slow 4G + 4× CPU: first contentful
 * paint at 1.2 s, and then an empty map for four more seconds while the CSV
 * arrives — 837 KB raw / 295 KB gzipped, of which **80.3% is `Description`**
 * and the map uses 1.4%. Full measurement in docs/planning/FRONT_DOOR_PAYLOAD.md.
 *
 * This is the same rows with everything the front door does not render taken
 * out: 62 KB raw, ~13 KB gzipped, a 22× reduction. The map can draw from it
 * about as soon as the shell is up, and the CSV upgrades the archive in place
 * behind it.
 *
 * WHY THESE COLUMNS AND NOT FEWER. The map alone needs four (Name, Latitude,
 * Longitude, category) and they cost 4 KB gzipped. The rest are here because
 * **the sidebar card has to be whole**: it shows the location, both provenance
 * badges and a thumbnail, and a card that fills its holes a second later reads
 * as breakage rather than as loading. `Image 1` in particular — the list renders
 * a category-coloured empty slot when a shrine has no picture, so leaving it out
 * would show every card as photo-less and then pop 118 photographs in.
 *
 * WHY IT IS THE SAME `valid` ARRAY. A slim index that drifts from the full one
 * would put a pin where the entry does not claim to be, which is the one failure
 * this archive really cannot ship. Both files come out of one read of one fetch,
 * so they cannot disagree; `shrinesIndex.test.ts` asserts row-for-row identity
 * on every field it carries, including the derived slug.
 *
 * WHY IT IS NOT A STATIC IMPORT. It would be instant, and it would also add
 * ~63 KB of eager JS to every route that touches shrine data — MapPage has 18 KB
 * of budget headroom. Loaded the way `shrines-fallback.json` already is, as a
 * dynamic import, it is a separate chunk that arrives in ~200 ms instead of the
 * CSV's 3,372 ms and costs no route a byte of its budget.
 */
const INDEX_COLUMNS = [
  'Name',
  'Latitude',
  'Longitude',
  'category',
  'Category', // legacy fallback; one row carries only this
  'Location',
  'support_level',
  'info_level',
  'id',
  'Image 1',
];
const slimRows = valid.map((row) =>
  Object.fromEntries(
    INDEX_COLUMNS.filter((c) => String(row[c] ?? '').trim() !== '').map((c) => [c, row[c]]),
  ),
);
writeFileSync(
  INDEX_JSON,
  JSON.stringify({ generated, count: slimRows.length, columns: INDEX_COLUMNS, rows: slimRows }) +
    '\n',
  'utf8',
);
const slimKb = (JSON.stringify(slimRows).length / 1024).toFixed(0);
console.log(`✓ src/data/shrines-index.json — ${slimRows.length} slim rows, ${slimKb} KB raw`);
