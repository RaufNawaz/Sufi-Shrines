#!/usr/bin/env node
/**
 * build-dataset.mjs — Build-time ETL: Google Sheets CSV → canonical dataset.
 *
 * Pulls the published CSV, normalizes and validates every row using the same
 * rules as the app, and writes:
 *   data/shrines.json   — canonical versioned dataset (schema_version + rows)
 *   data/shrines.csv    — CSV mirror for Frictionless / human inspection
 *   src/data/shrines-fallback.json — app snapshot kept in sync (existing import)
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

const SCHEMA_VERSION = '1.0.0';

const CSV_URL =
  process.env.VITE_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv';

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
  if (!String(row.Name ?? '').trim()) return false;
  const lat = parseFloat(row.Latitude ?? '');
  const lng = parseFloat(row.Longitude ?? '');
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
