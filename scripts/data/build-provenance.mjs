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

const BASELINE_URDU_DESCRIPTION_PROVENANCE = {
  source: 'In-repo AI translation (overnight Urdu enrichment pass, 2026-07-11)',
  method: 'llm',
  date: '2026-07-11',
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
provenance.updated = '2026-07-12';

writeFileSync(PROVENANCE_JSON, JSON.stringify(provenance, null, 2) + '\n');

console.log(
  `[build-provenance] ${provenance.shrines.length} shrine entries ` +
    `(${created} new, ${added} "Description Urdu" field(s) added)`,
);
