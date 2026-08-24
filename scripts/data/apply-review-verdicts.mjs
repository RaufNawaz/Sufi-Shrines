#!/usr/bin/env node
/**
 * apply-review-verdicts.mjs — land a reviewer's verdicts on the proposal files.
 *
 * Phase 3 of docs/planning/REVIEW_DESK_2026-08-24.md. `/review` ends in a
 * downloaded CSV; this is what makes that CSV change anything.
 *
 *   node scripts/data/apply-review-verdicts.mjs kg-review-verdicts.csv
 *   node scripts/data/apply-review-verdicts.mjs kg-review-verdicts.csv --write
 *
 * **Dry run by default.** It prints what it would do and writes nothing unless
 * `--write` is passed. The files it edits are hand-curated data in a provenance
 * archive; the default for a script like that is to show its work first.
 *
 * All the decisions live in lib/apply-verdicts.mjs, which is pure and tested.
 * This file only reads, prints and writes.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVerdictCsv, applyVerdicts } from './lib/apply-verdicts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const args = process.argv.slice(2);
const write = args.includes('--write');
const csvPath = args.find((a) => !a.startsWith('--'));

if (!csvPath) {
  console.error('[verdicts] usage: apply-review-verdicts.mjs <verdicts.csv> [--write]');
  process.exit(2);
}
if (!existsSync(csvPath)) {
  console.error(`[verdicts] ${csvPath} not found`);
  process.exit(2);
}

const FILES = {
  lineage: join(ROOT, 'data', 'kg-lineage-proposals.json'),
  orders: join(ROOT, 'data', 'kg-order-proposals.json'),
  dates: join(ROOT, 'data', 'kg-saint-dates-proposals.json'),
};

const documents = {};
for (const [key, file] of Object.entries(FILES)) {
  if (!existsSync(file)) {
    console.error(`[verdicts] ${file} not found — run npm run data:kg first`);
    process.exit(2);
  }
  documents[key] = JSON.parse(readFileSync(file, 'utf8'));
}

const rows = readVerdictCsv(readFileSync(csvPath, 'utf8'));
console.log(`[verdicts] ${rows.length} row(s) in ${csvPath}`);

const result = applyVerdicts(rows, documents);

if (result.errors.length > 0) {
  /* All or nothing: a stale verdict file half-applied is worse than one
     refused, because then somebody has to work out which half landed. */
  console.error(`[verdicts] refusing to apply — ${result.errors.length} problem(s):`);
  for (const error of result.errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}

console.log(
  `[verdicts] ${result.applied} confirmed · ${result.rejected} rejected · ${result.noted} noted`,
);

if (!write) {
  console.log('[verdicts] dry run — pass --write to apply. Nothing was changed.');
  process.exit(0);
}

for (const [key, file] of Object.entries(FILES)) {
  writeFileSync(file, JSON.stringify(result.documents[key], null, 2) + '\n', 'utf8');
}
console.log('[verdicts] ✓ written. Run `npm run data:kg` to rebuild the graph.');
