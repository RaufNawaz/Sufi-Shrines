#!/usr/bin/env node
/**
 * backfill-slugs.mjs
 *
 * Fetches the live shrine CSV, computes the new stable slug for every shrine,
 * and prints two outputs:
 *
 *   1. A Netlify `_redirects`-format block for legacy `name-N` → stable URL redirects
 *   2. A TSV of (current_slug, stable_slug, name) you can paste into a spreadsheet
 *      to populate the explicit `Slug` column in Google Sheets.
 *
 * Usage:
 *   node scripts/backfill-slugs.mjs
 *   node scripts/backfill-slugs.mjs --redirects-only
 *   node scripts/backfill-slugs.mjs --tsv-only
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const CSV_URL =
  process.env.VITE_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv';

// ── minimal slugify (mirrors src/lib/data/slugify.ts) ──────────────────────
const SLUG_REPLACEMENTS = { '&': 'and', '@': 'at', '%': 'percent', '+': 'plus' };

function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[&@%+]/g, (c) => ` ${SLUG_REPLACEMENTS[c] || c} `)
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function buildLegacySlug(name, id) {
  const base = slugify(name);
  return base ? `${base}-${id}` : `shrine-${id}`;
}

function getField(row, ...keys) {
  for (const k of keys) {
    if (row[k]?.trim()) return row[k].trim();
    const lk = k.toLowerCase();
    for (const rk of Object.keys(row)) {
      if (rk.trim().toLowerCase() === lk && row[rk]?.trim()) return row[rk].trim();
    }
  }
  return '';
}

// ── CSV fetch + parse (no external deps needed in Node 18+) ───────────────
async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseCsv(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).filter(Boolean).map((line) => {
    const vals = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  });
}

// ── stable slug generation (mirrors buildShrines collision logic) ─────────
function assignStableSlugs(rows) {
  const seen = new Map();
  return rows.map((row, i) => {
    const explicit = getField(row, 'Slug');
    if (explicit) {
      seen.set(explicit, (seen.get(explicit) ?? 0) + 1);
      return { row, i, legacySlug: buildLegacySlug(getField(row, 'Name') || `shrine`, i), stableSlug: explicit, explicit: true };
    }

    const name = getField(row, 'Name') || `Shrine ${i}`;
    const location = getField(row, 'Location');
    const saint = getField(row, 'Sufi Saint');
    const base = slugify(name);
    const withLoc = base && location ? `${base}-${slugify(location)}` : base;
    const withSaint = withLoc && saint ? `${withLoc}-${slugify(saint)}` : withLoc;

    let chosen = base || `shrine-${i}`;
    for (const candidate of [base, withLoc, withSaint]) {
      if (candidate && !seen.has(candidate)) { chosen = candidate; break; }
    }
    if (seen.has(chosen)) {
      let n = 2;
      while (seen.has(`${chosen}-${n}`)) n++;
      chosen = `${chosen}-${n}`;
    }
    seen.set(chosen, (seen.get(chosen) ?? 0) + 1);
    return { row, i, legacySlug: buildLegacySlug(name, i), stableSlug: chosen, explicit: false };
  });
}

// ── main ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const redirectsOnly = args.includes('--redirects-only');
const tsvOnly = args.includes('--tsv-only');

try {
  process.stderr.write(`Fetching ${CSV_URL} …\n`);
  const csv = await fetchCsv(CSV_URL);
  const rows = parseCsv(csv).filter((r) => {
    const lat = parseFloat(r.Latitude || r.latitude || '');
    const lng = parseFloat(r.Longitude || r.longitude || '');
    return isFinite(lat) && isFinite(lng);
  });

  const results = assignStableSlugs(rows);
  const changed = results.filter((r) => r.legacySlug !== r.stableSlug);

  if (!tsvOnly) {
    process.stdout.write('\n# ── Netlify _redirects (paste into public/_redirects) ──────────────────────\n');
    for (const { legacySlug, stableSlug } of changed) {
      process.stdout.write(`/shrine/${legacySlug}  /shrine/${stableSlug}  301\n`);
    }
    process.stdout.write(`# ${changed.length} redirect(s)\n`);
  }

  if (!redirectsOnly) {
    process.stdout.write('\n# ── Slug TSV (Name \\t new_stable_slug) — paste into Google Sheet Slug column ─\n');
    for (const { row, stableSlug, explicit } of results) {
      const name = getField(row, 'Name');
      if (!explicit) {
        process.stdout.write(`${name}\t${stableSlug}\n`);
      }
    }
  }

  process.stderr.write(`Done. ${results.length} shrines processed, ${changed.length} URLs changed.\n`);
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
}
