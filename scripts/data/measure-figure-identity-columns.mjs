#!/usr/bin/env node
/**
 * measure-figure-identity-columns.mjs — how far apart the two columns that could
 * define a figure's identity actually are.
 *
 * `build-kg.mjs` builds every figure node from `row['Sufi Saint']`, the legacy
 * column. The schema's own column is `principal_figure`, and it is the curated
 * one. This prints the size of the gap so the question in
 * docs/planning/DECISION_figure_identity_column.md can be re-asked against the
 * current data instead of against a number in a document.
 *
 * Committed rather than left in .scratch/ because the decision it informs is
 * open, the figures move every time the sheet is imported, and this project's
 * standing rule is that a measurement without a re-run is a measurement going
 * stale (CLAUDE.md RULE 0, HANDOVER §9).
 *
 * **Corrected 28 August 2026.** The counting used to live in this file, and four
 * commits after it was written a data fix invalidated it: the composite-figure
 * work moved `"Guru Nanak and Bhai Mardana"` out of `saintMergeVariants`, and
 * this script knew nothing about `saintCompositeFigures`. It went on printing
 * "50 rows move, 47 slugs vanish" where the truth was 47 and 44 — and three of
 * the slugs it named were whole composite cells slugified as if they were one
 * person's name, pages that have never existed. The arithmetic now lives in
 * `lib/figureColumns.mjs`, shared with the reviewer worksheet, so the two cannot
 * hold different definitions. That module's header carries the full account.
 *
 * Reports:
 *   1. rows whose two cells differ as strings;
 *   2. rows whose *figure slug* would move — the number that matters, because a
 *      slug is a published URL;
 *   3. current figure slugs that would cease to exist;
 *   4. `saintMergeVariants` keys that exist only in the legacy column, and so
 *      would silently stop merging if the column were switched;
 *   5. `principal_figure` cells whose `;` sits inside a parenthetical, where a
 *      naive two-figure split produces nodes that are not people.
 *
 * Prints only. Exits non-zero for nothing — it is an instrument, not a gate.
 *
 * Usage:  node scripts/data/measure-figure-identity-columns.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyseFigureColumns } from './lib/figureColumns.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

for (const f of ['data/shrines.json', 'data/kg-seeds.json', 'data/kg.json']) {
  if (!existsSync(join(ROOT, f))) {
    console.error(`[figure-columns] ${f} not found. Run: npm run data:build && npm run data:kg`);
    process.exit(1);
  }
}

const { rows } = read('data/shrines.json');
const seeds = read('data/kg-seeds.json');
const analysis = analyseFigureColumns(rows, seeds);
const { totals, perRow, retiring, legacyOnlyMergeKeys } = analysis;

console.log(`[figure-columns] ${totals.rows} rows`);
console.log(`  cells differing as strings     : ${totals.stringDiffs}`);
console.log(`  principal_figure empty         : ${totals.pfEmpty}`);
console.log(`  figure slugs from 'Sufi Saint' : ${totals.legacySlugs}`);
console.log(`  figure slugs from principal_figure : ${totals.pfSlugs}`);
console.log(`  rows whose figure slug would move  : ${totals.moved}`);
console.log(`  current figure slugs that would vanish : ${totals.retiring}`);

/* Cross-checked against the graph, because the reason this script was wrong for
   four commits is that it reported slugs no page was ever served from. A slug
   counted as "retiring" that is not a figure node is a bug in here, not a URL
   the project owes a redirect to. */
const kgSlugs = new Set(read('data/kg.json').saints.map((s) => s.slug));
const phantom = retiring.filter((s) => !kgSlugs.has(s));
if (phantom.length) {
  console.log(
    `\n  !! ${phantom.length} "retiring" slug(s) are not figure nodes in data/kg.json:\n     ` +
      phantom.join('\n     ') +
      `\n     That is this instrument disagreeing with the graph — fix it here, do not` +
      `\n     record the number. See lib/figureColumns.mjs.`,
  );
}

console.log(`\n  ── rows whose figure slug would move ──`);
for (const r of perRow.filter((x) => x.moves)) {
  console.log(`     ${r.name}\n        ${r.legacySlugs.join(' + ')}  ->  ${r.pfSlugs.join(' + ')}`);
}

console.log(
  `\n  ── saintMergeVariants keys that exist ONLY in the legacy column (${legacyOnlyMergeKeys.length}) ──`,
);
console.log('     Switching the column stops each of these merging.');
const mergeVariants = seeds.saintMergeVariants ?? {};
for (const k of legacyOnlyMergeKeys) console.log(`     ${k}  ->  ${mergeVariants[k]}`);

const nested = perRow.filter((r) => r.nestedSemicolon);
console.log(
  `\n  ── principal_figure cells whose ';' is inside a parenthetical (${nested.length}) ──`,
);
console.log('     A naive split on ";" turns each of these into nodes that are not people.');
for (const r of nested) console.log(`     ${r.name}\n        ${r.pfCell}`);

console.log('\n  Worksheet: npm run data:review:figures  ->  data/review/figure-identity-review.csv');
console.log('  Decision:  docs/planning/DECISION_figure_identity_column.md');
