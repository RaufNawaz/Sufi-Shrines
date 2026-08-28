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
import { slugify } from './lib/slugs.mjs';

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
const mergeVariants = seeds.saintMergeVariants ?? {};

/** Same two steps build-kg.mjs applies: merge map, then drop the parenthetical. */
const canon = (raw) => (mergeVariants[raw] ?? raw).replace(/\s*\([^)]*\)/g, '').trim();

/** Split on `;` only outside parentheses — `darbar-wasif-ali-wasif` has a
 *  semicolon inside one, and splitting on it yields two non-people. */
function splitFigures(cell) {
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const ch of cell) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else buf += ch;
  }
  parts.push(buf);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const legacySlugs = new Set();
const pfSlugs = new Set();
const moved = [];
let stringDiffs = 0;
let emptyPf = 0;
const nestedSemicolon = [];

for (const row of rows) {
  const legacy = String(row['Sufi Saint'] ?? '').trim();
  const pf = String(row['principal_figure'] ?? '').trim();
  if (!pf) emptyPf += 1;
  if (legacy !== pf) stringDiffs += 1;

  if (pf.includes(';') && splitFigures(pf).length === 1) {
    nestedSemicolon.push([row.Name, pf]);
  }

  const a = legacy ? slugify(canon(legacy)) : '';
  const bs = splitFigures(pf).map((part) => slugify(canon(part))).filter(Boolean);
  if (a) legacySlugs.add(a);
  for (const b of bs) pfSlugs.add(b);
  if (a && bs.length && !bs.includes(a)) moved.push([row.Name, a, bs]);
}

const vanishing = [...legacySlugs].filter((s) => !pfSlugs.has(s)).sort();

console.log(`[figure-columns] ${rows.length} rows`);
console.log(`  cells differing as strings     : ${stringDiffs}`);
console.log(`  principal_figure empty         : ${emptyPf}`);
console.log(`  figure slugs from 'Sufi Saint' : ${legacySlugs.size}`);
console.log(`  figure slugs from principal_figure : ${pfSlugs.size}`);
console.log(`  rows whose figure slug would move  : ${moved.length}`);
console.log(`  current figure slugs that would vanish : ${vanishing.length}`);

console.log(`\n  ── rows whose figure slug would move ──`);
for (const [name, a, bs] of moved) console.log(`     ${name}\n        ${a}  ->  ${bs.join(' + ')}`);

const legacyValues = new Set(rows.map((r) => String(r['Sufi Saint'] ?? '').trim()));
const pfValues = new Set(rows.map((r) => String(r['principal_figure'] ?? '').trim()));
const legacyOnlyKeys = Object.keys(mergeVariants).filter(
  (k) => k !== 'comment' && legacyValues.has(k) && !pfValues.has(k),
);
console.log(
  `\n  ── saintMergeVariants keys that exist ONLY in the legacy column (${legacyOnlyKeys.length}) ──`,
);
console.log('     Switching the column stops each of these merging.');
for (const k of legacyOnlyKeys) console.log(`     ${k}  ->  ${mergeVariants[k]}`);

console.log(
  `\n  ── principal_figure cells whose ';' is inside a parenthetical (${nestedSemicolon.length}) ──`,
);
console.log('     A naive split on ";" turns each of these into nodes that are not people.');
for (const [name, pf] of nestedSemicolon) console.log(`     ${name}\n        ${pf}`);

console.log('\n  Decision: docs/planning/DECISION_figure_identity_column.md');
