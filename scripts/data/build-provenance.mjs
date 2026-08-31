#!/usr/bin/env node
/**
 * build-provenance.mjs — Fill in baseline provenance coverage.
 *
 * data/provenance.json is hand-curated and today only covers a couple of
 * shrines. This script adds one well-known, unambiguous baseline fact for
 * every shrine that has one: the in-repo AI-translated Urdu description
 * (src/data/urdu-content.json) is machine-translated and has not yet been
 * reviewed by a fluent Urdu speaker. It never touches any other field or
 * any hand-curated entry — existing "Image 1" / "Description" / coordinate
 * provenance written by a human is left exactly as-is.
 *
 * Idempotent: re-running produces no diff once every shrine already has its
 * "Description Urdu" entry.
 *
 * Usage:  node scripts/data/build-provenance.mjs
 * Or:     npm run data:build:provenance
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './lib/slugs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');
const URDU_CONTENT_JSON = join(ROOT, 'src', 'data', 'urdu-content.json');
const PROVENANCE_JSON = join(ROOT, 'data', 'provenance.json');

if (!existsSync(SHRINES_JSON)) {
  console.error('[build-provenance] data/shrines.json not found. Run: npm run data:build');
  process.exit(1);
}

const { rows } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
const slugs = buildSlugs(rows);
const urduContent = JSON.parse(readFileSync(URDU_CONTENT_JSON, 'utf8'));

const provenance = existsSync(PROVENANCE_JSON)
  ? JSON.parse(readFileSync(PROVENANCE_JSON, 'utf8'))
  : { schema_version: '1.0.0', updated: '', shrines: [] };

const bySlug = new Map(provenance.shrines.map((entry) => [entry.shrineSlug, entry]));

/**
 * The record written for any slug that has an Urdu description and no provenance
 * for it.
 *
 * **It carried `date: '2026-07-11'` and no longer does.** That field is a
 * per-entry factual claim, and this is a constant — so it asserted the same
 * translation date for all 167 records that have one, which is a guess for every
 * entry and **demonstrably false for four**: Darbar Ghazi Ilm Din Shaheed,
 * Darbar Hazrat Khawaja Feroz-ud-Din, Darbar Hazrat Tahir Bandagi Qadri and
 * Darbar Wasif Ali Wasif were added to the archive in August and their records
 * claimed an Urdu translation made in July, a month before the English they
 * translate existed.
 *
 * A wrong date is worse than none (RULE 2), and `date` is optional in
 * `src/types/provenance.ts` and rendered nowhere — so removing it costs a reader
 * nothing and stops a published artefact stating something untrue.
 * `data/provenance.json` ships in the Zenodo bundle.
 *
 * `source` keeps its date because it describes *the pass*, which did happen on
 * that day, rather than asserting that this entry was in it.
 */
const BASELINE_URDU_DESCRIPTION_PROVENANCE = {
  source: 'In-repo AI translation (overnight Urdu enrichment pass, 2026-07-11)',
  method: 'llm',
  notes:
    'Native-prose AI translation of the English Description, not yet reviewed by a ' +
    'fluent Urdu speaker. See src/data/urdu-content.json and CHANGELOG.md.',
};

let added = 0;
let created = 0;

slugs.forEach((slug) => {
  if (!urduContent[slug]?.descriptionUr) return;

  let entry = bySlug.get(slug);
  if (!entry) {
    entry = { shrineSlug: slug, fields: {} };
    provenance.shrines.push(entry);
    bySlug.set(slug, entry);
    created++;
  }
  if (!entry.fields['Description Urdu']) {
    entry.fields['Description Urdu'] = { ...BASELINE_URDU_DESCRIPTION_PROVENANCE };
    added++;
  }
});

provenance.shrines.sort((a, b) => a.shrineSlug.localeCompare(b.shrineSlug));

// The `updated` stamp was hardcoded to 2026-07-12, so the file asserted that
// date no matter when it last ran — and it went on asserting it while the
// dataset grew past it. Stamp it only when something actually changed, which
// keeps both the honesty and the idempotence (a re-run over an unchanged
// dataset still produces no git diff).
if (created > 0 || added > 0) {
  provenance.updated = new Date().toISOString().slice(0, 10);
}

writeFileSync(PROVENANCE_JSON, JSON.stringify(provenance, null, 2) + '\n');

console.log(
  `[build-provenance] ${provenance.shrines.length} shrine entries ` +
    `(${created} new, ${added} "Description Urdu" field(s) added)`,
);
