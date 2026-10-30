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
import { createRequire } from 'node:module';
import { buildSlugs } from './lib/slugs.mjs';

const Papa = createRequire(import.meta.url)('papaparse');

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

/**
 * Rows the book pipeline added to the sheet in October 2026: no Description, no
 * Urdu article, only what one line of one book says. Their record names that
 * book, in the archive's own bibliography wording, and the patch that built the
 * row (Rauf, 30 October 2026: give the 318 rows provenance before the deploy).
 * The takeaways line is the row's place in the machine-read notes on the OCR
 * transcription, not a page of the book, so it goes in `notes`, not `page`.
 */
const BOOK_ROWS = {
  NEW_FROM_BOOK_HADEEQAT_UL_AULIA: {
    source:
      'Mufti Ghulam Sarwar Lahori, *Hadiqat al-Awliya* (Persian, composed 1292 AH / 1875 CE; read in an Urdu edition annotated by محمد اقبال مجددی and issued by تصوّف فاؤنڈیشن)',
    patch: 'data/review/PATCH_new_rows_hadeeqat_ul_aulia_2026-10-10.csv',
    script: 'pipeline/book_queue/build_new_rows.py',
  },
  NEW_FROM_BOOK_TAREEKH_LAHORE: {
    source: 'Kanhaiya Lal Hindi, *Tarikh-e Lahore* (1884 original)',
    patch: 'data/review/PATCH_new_rows_tareekh_lahore_2026-10-10.csv',
    script: 'pipeline/book_queue/build_tagged_rows.py',
  },
};
const takeawaysLine = new Map();
for (const { patch } of Object.values(BOOK_ROWS)) {
  const path = join(ROOT, patch);
  if (!existsSync(path)) continue;
  for (const r of Papa.parse(readFileSync(path, 'utf8'), { header: true, skipEmptyLines: true }).data) {
    if (r.id) takeawaysLine.set(r.id, r._takeaways_line);
  }
}

let added = 0;
let created = 0;

rows.forEach((row, i) => {
  const flag = String(row.flags ?? '')
    .split(/[;,\s]+/)
    .find((f) => BOOK_ROWS[f]);
  if (!flag || String(row.Description ?? '').trim()) return;
  const slug = slugs[i];
  if (bySlug.get(slug) && Object.keys(bySlug.get(slug).fields).length) return;
  const book = BOOK_ROWS[flag];
  const line = takeawaysLine.get(row.id);
  const entry = { shrineSlug: slug, fields: {} };
  entry.fields.Name = {
    source: book.source,
    method: 'llm',
    notes:
      `Row built by ${book.script} from the machine-read notes on the book's OCR transcription` +
      (line ? `, takeaways line ${line}` : '') +
      `; every value is that line's own (${book.patch.replace('.csv', '.md')}). Not yet reviewed.`,
  };
  provenance.shrines.push(entry);
  bySlug.set(slug, entry);
  created++;
});

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
  // The local calendar date, as datedClaims.test.ts reads it. toISOString() is
  // UTC, so an evening run in Lahore or Boston stamped tomorrow and failed that
  // test (8 October 2026, stamped with the next day's date).
  const now = new Date();
  provenance.updated = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

writeFileSync(PROVENANCE_JSON, JSON.stringify(provenance, null, 2) + '\n');

console.log(
  `[build-provenance] ${provenance.shrines.length} shrine entries ` +
    `(${created} new, ${added} "Description Urdu" field(s) added)`,
);
