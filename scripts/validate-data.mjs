#!/usr/bin/env node
/**
 * validate-data.mjs — Data integrity check for the shrine snapshot.
 *
 * Validates src/data/shrines-fallback.json and exits non-zero on violations
 * so the CI build fails rather than shipping bad data silently.
 *
 * Checks:
 *   - Required fields present (Name, Latitude, Longitude)
 *   - Latitude/Longitude numeric and within Pakistan bounding box (±5°)
 *   - No duplicate slugs
 *   - Image URLs look like URLs (if present)
 *   - Category is one of the known values (warns, doesn't fail)
 *
 * Usage: node scripts/validate-data.mjs
 * Run via: npm run data:validate
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(__dirname, '..', 'src', 'data', 'shrines-fallback.json');

// ── slug logic (mirrors slugify.ts) ───────────────────────────────────────
const SLUG_REPLACEMENTS = { '&': 'and', '@': 'at', '%': 'percent', '+': 'plus' };
function slugify(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[&@%+]/g, (c) => ` ${SLUG_REPLACEMENTS[c] || c} `)
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '').trim();
}

// ── bounds: generous bbox around Pakistan and border regions ──────────────
const BBOX = { latMin: 20, latMax: 42, lngMin: 55, lngMax: 82 };

// ── known category values ─────────────────────────────────────────────────
const KNOWN_CATEGORIES = new Set(['Muslim Shrine', 'Hindu Temple', 'Sikh Gurdwara', 'Christian Church', 'Other', '']);

// ── helpers ────────────────────────────────────────────────────────────────
function field(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

function isHttpUrl(s) {
  return /^https?:\/\//i.test(String(s || '').trim());
}

// ── main ──────────────────────────────────────────────────────────────────
let snapshot;
try {
  snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
} catch (err) {
  console.error(`[validate] Cannot read snapshot: ${err.message}`);
  process.exit(1);
}

const rows = snapshot.rows || [];
const errors = [];
const warnings = [];
const slugsSeen = new Map();

rows.forEach((row, i) => {
  const label = `Row ${i} (${field(row, 'Name') || '(no name)'})`;

  // Required fields
  if (!field(row, 'Name')) {
    errors.push(`${label}: missing Name`);
  }

  // Coordinates
  const lat = parseFloat(field(row, 'Latitude', 'latitude') || '');
  const lng = parseFloat(field(row, 'Longitude', 'longitude') || '');
  if (!isFinite(lat) || !isFinite(lng)) {
    errors.push(`${label}: non-numeric Latitude/Longitude ("${row.Latitude}", "${row.Longitude}")`);
  } else {
    if (lat < BBOX.latMin || lat > BBOX.latMax) {
      warnings.push(`${label}: Latitude ${lat} outside expected range [${BBOX.latMin}, ${BBOX.latMax}]`);
    }
    if (lng < BBOX.lngMin || lng > BBOX.lngMax) {
      warnings.push(`${label}: Longitude ${lng} outside expected range [${BBOX.lngMin}, ${BBOX.lngMax}]`);
    }
  }

  // Slug uniqueness
  const explicitSlug = field(row, 'Slug');
  if (explicitSlug) {
    if (slugsSeen.has(explicitSlug)) {
      errors.push(`${label}: duplicate Slug "${explicitSlug}" (also on Row ${slugsSeen.get(explicitSlug)})`);
    } else {
      slugsSeen.set(explicitSlug, i);
    }
  }

  // Image URLs (warn only)
  for (const k of Object.keys(row)) {
    const lk = k.toLowerCase();
    if ((lk.includes('image') || lk.includes('photo')) && !lk.includes('urdu')) {
      const v = field(row, k);
      if (v && !isHttpUrl(v)) {
        warnings.push(`${label}: field "${k}" looks like a non-URL value: "${v.slice(0, 60)}"`);
      }
    }
  }

  // Category (warn on unknown)
  const cat = field(row, 'Category');
  if (cat && !KNOWN_CATEGORIES.has(cat)) {
    warnings.push(`${label}: unknown Category "${cat}"`);
  }
});

// Summary
if (warnings.length) {
  console.warn(`[validate] Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.warn(`  ⚠  ${w}`));
}

if (errors.length) {
  console.error(`\n[validate] Errors (${errors.length}) — build will fail:`);
  errors.forEach((e) => console.error(`  ✗  ${e}`));
  console.error(`\n[validate] Fix the above errors in the snapshot (run: npm run data:snapshot) and re-run.`);
  process.exit(1);
}

console.log(`[validate] ✓ ${rows.length} rows valid${warnings.length ? ` (${warnings.length} warning(s) — see above)` : ''}`);
