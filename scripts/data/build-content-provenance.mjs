#!/usr/bin/env node
/**
 * build-content-provenance.mjs — Phase A of docs/planning/DATA_QUALITY_PLAN.md.
 *
 * Backfills a `contentTier` onto every shrine's `Description` provenance entry —
 * today (2026-07-12) only 1/163 shrines (allo-mahar) has any `Description`
 * provenance entry at all, so there is no machine-readable record of whether a
 * shrine's English description came from a cited primary source or an AI research
 * draft. This script closes that gap using two evidence sources:
 *
 *  1. shrine_entries/_INDEX.md's Tier 1 / Tier 2 lists (37 hand-cited files) — a
 *     hardcoded name→file table below, verified by hand against data/shrines.json
 *     on 2026-07-12. Hardcoded rather than parsed at runtime from _INDEX.md's
 *     prose: a wrong fuzzy match here would silently mistag content-quality data,
 *     which is exactly the failure mode this plan exists to fix (Principle 4 —
 *     "do not guess"). Update this table by hand if _INDEX.md or shrine names change.
 *
 *  2. archive/_ENRICHMENT_LOG.md's "Descriptions filled" / "New rows added" run
 *     entries — a dated, direct record of which shrines had their Description
 *     written by the automated Claude-assisted research pipeline
 *     (tools/shrines_enrich.py). Parsed programmatically (the log's format is
 *     consistent and machine-checkable). This file is maintainer-local
 *     (gitignored, per .gitignore) — if it's absent, ai-researched detection is
 *     skipped and affected shrines fall through to `unknown` rather than a wrong
 *     guess of `sheet-original`.
 *
 * Precedence: an enrichment-log match (ai-researched) wins over a Tier 1/2 table
 * match, because the log is a direct record of what was actually written into the
 * live Description field, whereas the Tier 1/2 table only records the manual
 * pipeline's *intent* — the two are not automatically reconciled (that's Phase B).
 * In practice, as of 2026-07-12, no shrine matches both (verified by hand).
 *
 * Anything matching neither source is tagged `sheet-original` (by elimination —
 * not confirmed, just absent from both tracked pipelines) if the enrichment log
 * was readable, or `unknown` if it wasn't (so an unreadable log never produces a
 * false-confident tag).
 *
 * Additive-only, idempotent, like build-provenance.mjs: never overwrites an
 * existing hand-curated `Description` entry (today, only allo-mahar has one) —
 * instead prints a discrepancy warning if the freshly-computed tier disagrees
 * with what's already stored, for a human to resolve in Phase B.
 *
 * Usage:  node scripts/data/build-content-provenance.mjs
 * Or:     npm run data:build:content-provenance
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './lib/slugs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');
const PROVENANCE_JSON = join(ROOT, 'data', 'provenance.json');
const ENRICHMENT_LOG = join(ROOT, 'archive', '_ENRICHMENT_LOG.md');

if (!existsSync(SHRINES_JSON)) {
  console.error('[build-content-provenance] data/shrines.json not found. Run: npm run data:build');
  process.exit(1);
}

// ── Tier 1 / Tier 2 table (hand-verified against shrine_entries/_INDEX.md, 2026-07-12) ────

const TIER1_ENTRIES = [
  ['Tomb of Allama Iqbal (Mazar-e-Iqbal)', 'Mazar-e-Iqbal.md'],
  ['Shrine of Mian Mir', 'Mian Mir.md'],
  ['Shrine of Bibi Pak Daman', 'Bibi Pak Daman (Lahore).md'],
  ['Shrine of Hazrat Madho Lal Hussain (Shah Hussain Darbar)', 'Madho Lal Hussain.md'],
  ['Data Darbar', 'Data Darbar.md'],
  ['Shrine of Abul Faiz Qalander Ali Suharwardi', 'Abul Faiz Qalandari.md'],
  ['Shrine of Ganj e Inayat Sarkar', 'Ganj-e-Inayat Sarkar.md'],
];

const TIER2_ENTRIES = [
  ['Shrine of Fariduddin Ganjshakar', 'Baba Farid (Pakpattan).md'],
  ['Shrine of Bahauddin Zakariya', 'Bahauddin Zakariya (Multan).md'],
  ['Shrine of Shah Rukn-e-Alam', 'Shah Rukn-e-Alam (Multan).md'],
  ['Shrine of Shah Shams-ud-Din Sabzwari', 'Shah Shams Sabzwari (Multan).md'],
  ['Shrine of Shah Yusaf Gardez', 'Shah Yusuf Gardez (Multan).md'],
  ['Shrine of Syed Musa Pak', 'Syed Musa Pak (Multan).md'],
  ['Mazar of Bulleh Shah', 'Bulleh Shah (Kasur).md'],
  ['Mausoleum of Waris Shah', 'Waris Shah (Jandiala Sher Khan).md'],
  ['Garh Maharaja (Shorkot)', 'Sultan Bahu (Garh Maharaja).md'],
  ['Mithankot (Kot Mithan)', 'Khwaja Ghulam Farid (Mithankot).md'],
  ['Golra Sharif', 'Golra Sharif (Pir Meher Ali Shah).md'],
  ['Shrine of Pir Sher Muhammad', 'Sharaqpur (Pir Sher Muhammad).md'],
  [
    'Darbar Hazrat Khawaja Shah Muhammad Sulaiman Taunsvi (R.A)',
    'Taunsa Sharif (Sulaiman Taunsvi).md',
  ],
  ['Sial Sharif', 'Sial Sharif (Shamsuddin Sialvi).md'],
  ['Sakhi Sarwar', 'Sakhi Sarwar (Dera Ghazi Khan).md'],
  ['Shergarh', 'Daud Bandagi Kirmani (Shergarh).md'],
  ['Ranmal Sharif', 'Noushah Ganj Bakhsh (Ranmal Sharif).md'],
  [
    'Shrine of Jalaluddin Surkh-Posh Bukhari (Jalaluddin Bukhari)',
    'Jalaluddin Surkh-Posh Bukhari (Uch Sharif).md',
  ],
  ['Shrine of Makhdoom Jahaniyan Jahangasht', 'Makhdoom Jahaniyan Jahangasht (Uch Sharif).md'],
  ['Tomb of Javindi Bibi', 'Bibi Jawindi (Uch Sharif).md'],
  ['Lal Shahbaz Qalandar', 'Lal Shahbaz Qalandar (Sehwan).md'],
  ['Bhit (Bhit Shah)', 'Shah Abdul Latif Bhittai (Bhit Shah).md'],
  ['Shrine of Sachal Sarmast', 'Sachal Sarmast (Daraza, Khairpur).md'],
  ['Dargah / Roza Sufi Shah Inayat Shaheed', 'Sufi Shah Inayat Shaheed (Jhok Sharif).md'],
  ['Shrine of Abdullah Shah Ghazi', 'Abdullah Shah Ghazi (Karachi).md'],
  ['Shrine of Pir Mangho', 'Pir Mangho (Karachi).md'],
  ['Shrine of Qalandar Baba Auliya', 'Qalandar Baba Auliya (Karachi).md'],
  ['Shah Noorani Shrine (Syed Bilawal Shah Noorani)', 'Shah Noorani (Balochistan).md'],
  ['Rahman Baba Mausoleum (Rehman Baba Shrine)', 'Rahman Baba (Peshawar).md'],
  ['Bari Imam', 'Bari Imam (Islamabad).md'],
];

// ── name normalization + matching ──────────────────────────────────────────

function normalizeName(s) {
  return String(s)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ── archive/_ENRICHMENT_LOG.md parsing (best-effort; file is maintainer-local) ──

function extractBalancedParen(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return text.slice(openIndex + 1, i);
    }
  }
  return null;
}

function parseEnrichmentLog(logText) {
  const matchedNames = new Set();
  const unmatchedEntries = [];
  const headerRe = /-\s*(Descriptions filled|New rows added):\s*(\d+)\s*/g;
  let m;
  while ((m = headerRe.exec(logText))) {
    const count = Number(m[2]);
    if (!count) continue;
    let i = headerRe.lastIndex;
    while (logText[i] === ' ') i++;
    if (logText[i] !== '(') continue; // malformed/unexpected line shape — skip defensively
    const list = extractBalancedParen(logText, i);
    if (list == null) continue;
    for (const rawEntry of list.split(/;\s*/).map((s) => s.trim()).filter(Boolean)) {
      const rowMatch = rawEntry.match(/^row\s+\d+:\s*(.+)$/i);
      if (!rowMatch) {
        unmatchedEntries.push(rawEntry);
        continue;
      }
      let name = rowMatch[1].trim();
      name = name.replace(/\s*\(\d[\d,]*\s*chars\)\s*$/, '');
      name = name.replace(/\s*\[[^\]]+\]\s*img1=[YN]\s*$/i, '');
      matchedNames.add(name.trim());
    }
  }
  return { matchedNames, unmatchedEntries };
}

// ── main ────────────────────────────────────────────────────────────────────

const { rows } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
const slugs = buildSlugs(rows);

const tier1ByNorm = new Map(TIER1_ENTRIES.map(([name, file]) => [normalizeName(name), file]));
const tier2ByNorm = new Map(TIER2_ENTRIES.map(([name, file]) => [normalizeName(name), file]));

let aiResearchedNorms = new Set();
let logAvailable = false;
let logUnmatchedCount = 0;
if (existsSync(ENRICHMENT_LOG)) {
  logAvailable = true;
  const logText = readFileSync(ENRICHMENT_LOG, 'utf8');
  const { matchedNames, unmatchedEntries } = parseEnrichmentLog(logText);
  logUnmatchedCount = unmatchedEntries.length;
  const shrineNormNames = new Set(rows.map((r) => normalizeName(r['Name'])));
  for (const name of matchedNames) {
    const norm = normalizeName(name);
    if (shrineNormNames.has(norm)) aiResearchedNorms.add(norm);
  }
  console.log(
    `[build-content-provenance] archive/_ENRICHMENT_LOG.md: ${matchedNames.size} row-entries parsed, ` +
      `${aiResearchedNorms.size} matched to a current shrine, ${matchedNames.size - aiResearchedNorms.size} ` +
      `did not match any current shrine (renamed/deduped/removed since — expected churn, not an error).`,
  );
} else {
  console.warn(
    '[build-content-provenance] archive/_ENRICHMENT_LOG.md not found on this machine (it is ' +
      'gitignored/maintainer-local) — ai-researched detection skipped; affected shrines will be ' +
      'tagged "unknown" instead of "sheet-original". Re-run where the file is present for full coverage.',
  );
}

const provenance = existsSync(PROVENANCE_JSON)
  ? JSON.parse(readFileSync(PROVENANCE_JSON, 'utf8'))
  : { schema_version: '1.0.0', updated: '', shrines: [] };
const bySlug = new Map(provenance.shrines.map((entry) => [entry.shrineSlug, entry]));

const counts = { 'tier1-ocr': 0, 'tier2-compendium': 0, 'ai-researched': 0, 'sheet-original': 0, unknown: 0 };
const discrepancies = [];
let created = 0;
let skippedExisting = 0;

rows.forEach((row, i) => {
  const slug = slugs[i];
  const norm = normalizeName(row['Name']);

  let contentTier;
  let source;
  let method = 'human';
  let confidence;
  let notes;

  if (aiResearchedNorms.has(norm)) {
    contentTier = 'ai-researched';
    source = 'Automated enrichment pipeline (tools/shrines_enrich.py, Claude-assisted web research) — see archive/_ENRICHMENT_LOG.md';
    method = 'llm';
    confidence = 0.6;
    notes = 'Not yet fact-verified against a primary/cited source — see docs/planning/DATA_QUALITY_PLAN.md Phase C.';
  } else if (tier1ByNorm.has(norm)) {
    const file = tier1ByNorm.get(norm);
    contentTier = 'tier1-ocr';
    source = `shrine_entries/${file} (Tier 1 — OCR'd primary texts + field survey)`;
    confidence = 0.9;
    notes = 'Assumed merged from shrine_entries/ — not yet diffed against the live text; see Phase B reconciliation.';
  } else if (tier2ByNorm.has(norm)) {
    const file = tier2ByNorm.get(norm);
    contentTier = 'tier2-compendium';
    source = `shrine_entries/${file} (Tier 2 — Tazkirah Awliya-e-Pakistan compendium)`;
    confidence = 0.75;
    notes = 'Assumed merged from shrine_entries/ — not yet diffed against the live text; see Phase B reconciliation.';
  } else if (logAvailable) {
    contentTier = 'sheet-original';
    source = 'Pre-existing sheet content — not found in shrine_entries/_INDEX.md or archive/_ENRICHMENT_LOG.md';
    notes =
      'Origin inferred by elimination (absent from both tracked content pipelines), not independently ' +
      'confirmed. See docs/planning/DATA_QUALITY_PLAN.md §1.1.';
  } else {
    contentTier = 'unknown';
    source = 'Could not be determined — archive/_ENRICHMENT_LOG.md was unavailable on this machine at build time';
    notes = 'Re-run scripts/data/build-content-provenance.mjs on a machine with archive/_ENRICHMENT_LOG.md present.';
  }

  counts[contentTier]++;

  let entry = bySlug.get(slug);
  if (!entry) {
    entry = { shrineSlug: slug, fields: {} };
    provenance.shrines.push(entry);
    bySlug.set(slug, entry);
  }

  if (entry.fields['Description']) {
    skippedExisting++;
    const existing = entry.fields['Description'];
    if (existing.contentTier && existing.contentTier !== contentTier) {
      discrepancies.push(
        `${slug}: existing contentTier "${existing.contentTier}" (method: ${existing.method}) vs. ` +
          `freshly computed "${contentTier}" — left untouched, needs Phase B review.`,
      );
    } else if (!existing.contentTier) {
      discrepancies.push(
        `${slug}: has a hand-curated Description entry (method: ${existing.method}) with no contentTier — ` +
          `freshly computed tier would be "${contentTier}" (method: ${existing.method}). Left untouched; ` +
          `add contentTier by hand once reconciled in Phase B.`,
      );
    }
    return;
  }

  entry.fields['Description'] = {
    source,
    method,
    contentTier,
    ...(confidence !== undefined ? { confidence } : {}),
    notes,
  };
  created++;
});

provenance.shrines.sort((a, b) => a.shrineSlug.localeCompare(b.shrineSlug));
provenance.updated = '2026-07-12';

writeFileSync(PROVENANCE_JSON, JSON.stringify(provenance, null, 2) + '\n');

console.log(
  `[build-content-provenance] ${created} Description entries created, ${skippedExisting} left untouched ` +
    `(already hand-curated).`,
);
console.log(
  `[build-content-provenance] contentTier coverage — ` +
    Object.entries(counts)
      .map(([tier, n]) => `${tier}: ${n}`)
      .join(', '),
);
if (discrepancies.length) {
  console.warn(`[build-content-provenance] ${discrepancies.length} discrepancy(ies) flagged for Phase B:`);
  discrepancies.forEach((d) => console.warn(`  ⚠  ${d}`));
}
if (logUnmatchedCount) {
  console.log(
    `[build-content-provenance] ${logUnmatchedCount} malformed log line entries could not be parsed ` +
      `(non-fatal — see script source if this count seems high).`,
  );
}
