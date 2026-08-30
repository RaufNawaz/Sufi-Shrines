#!/usr/bin/env node
/**
 * check-live-sheet.mjs — is production valid *right now*?
 *
 * ## The blind spot this closes
 *
 * RULE 3: the Google Sheet is production. The site fetches it at runtime, so a
 * sheet edit deploys instantly with no review step. Every gate in this
 * repository, meanwhile, runs against the **committed snapshot** —
 * `data:validate`, the e2e fixture, the Urdu dictionary, `/about`'s figures.
 * HANDOVER calls that "the shape of the gate system, and it follows from
 * RULE 3", which is true and leaves a real gap: **anything added to the sheet
 * since the last `data:build` is invisible to every check we have.**
 *
 * That gap is not hypothetical. Measured 27 August 2026:
 *
 *   committed snapshot   169 rows, 1 category outside the schema
 *   live sheet           171 rows, 3 categories outside the schema
 *
 * The two extra rows both carry an off-schema `category` — `"Islam"` and
 * `"Sufi shrine (Islam)"` — and `validate.mjs`'s enum guard, which exists and is
 * correct and even names this failure in its comment, could not see either of
 * them. A row outside the six values loses its map colour, drops out of the
 * category filter, and is excluded from every tradition count on the live site.
 *
 * ## Why it is not in `npm run verify`
 *
 * It needs the network and it reads a document that changes without us. A gate
 * that can go red because someone edited a spreadsheet during a build is a gate
 * people learn to skip. Run it deliberately: before a `data:build`, after a
 * round of sheet edits, or when a number on the site looks wrong.
 *
 * ## What it validates, and what it only reports
 *
 * `category` is **validated**, because there is one machine-readable source of
 * truth for it — `lib/category.mjs`, shared with the validator and the KG
 * builder.
 *
 * `status`, `support_level`, `info_level` and `site_type` are **reported**:
 * distinct values with counts, most common first. Their vocabularies live in
 * TypeScript this file cannot import, and hardcoding a copy here would create a
 * third source of truth for something the schema section of CLAUDE.md already
 * defines twice. A new or misspelled value stands out in a counted list without
 * anyone having to maintain a second enum.
 *
 * Usage:
 *   node scripts/data/check-live-sheet.mjs
 *   node scripts/data/check-live-sheet.mjs --json out.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import Papa from 'papaparse';
import { CATEGORY_ENUM, resolveCategory } from './lib/category.mjs';
import { buildSlugs } from './lib/slugs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SNAPSHOT = join(ROOT, 'src', 'data', 'shrines-fallback.json');
const CONSTANTS = join(ROOT, 'src', 'lib', 'data', 'constants.ts');

/** Reported rather than validated — see the header. */
const REPORTED_COLUMNS = ['status', 'support_level', 'info_level', 'site_type'];

/**
 * The URL the app actually uses, read out of the app's own constant.
 *
 * Not duplicated here on purpose: a checker that asks a different URL than the
 * site is a checker that can pass while production is broken.
 */
function csvUrl() {
  const source = readFileSync(CONSTANTS, 'utf8');
  const match = source.match(/https:\/\/docs\.google\.com\/spreadsheets\/[^'"\s]+/);
  if (!match) throw new Error(`No sheet URL found in ${CONSTANTS}`);
  return match[0];
}

/** curl, not fetch: `urllib`-class timeouts have bitten this project before,
 *  and curl is present everywhere it runs (see check_image_liveness.py). */
function download(url) {
  return execFileSync('curl', ['--silent', '--show-error', '--location', '--max-time', '60', url], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function tally(rows, column) {
  const counts = new Map();
  for (const row of rows) {
    const value = (row[column] ?? '').trim();
    const key = value === '' ? '(blank)' : value;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * What an added row costs, in the reader's terms rather than in row counts.
 *
 * The gap itself has been in this file's header since 27 August 2026 and its
 * consequences had not been, so it read as bookkeeping. It is not. **Every
 * artefact this site ships is built from the snapshot**, so a row that is in
 * the sheet and not in the snapshot is not merely uncounted — it is a shrine
 * the archive holds and half the site denies.
 *
 * The Urdu line is measured, not asserted: `src/data/urdu-seed.json` is built
 * from the snapshot, so a row that never entered it has no Urdu name, and
 * `localizeShrineName` falls back to the English string. Checked on the live
 * map at `?lang=ur` on 30 August 2026: both drifted rows render as English
 * links in the sidebar, **outside `<bdi>`** — and `e2e/urdu-no-leak.spec.ts`
 * cannot see them, because its fixture is generated from the same snapshot that
 * is missing them. A guard built from the snapshot is blind to exactly the rows
 * that drift from it. That is the shape of the whole gate system (RULE 3), and
 * it is why this script exists.
 */
function reportAddedConsequences(added, live, liveSlugs) {
  const seedPath = join(ROOT, 'src', 'data', 'urdu-seed.json');
  let seedText = '';
  try {
    seedText = readFileSync(seedPath, 'utf8');
  } catch {
    // No seed on disk: skip the Urdu line rather than guess at it.
  }

  const noUrduName = [];
  for (const slug of added) {
    const name = live[liveSlugs.indexOf(slug)]?.Name;
    if (seedText && name && !seedText.includes(JSON.stringify(name).slice(1, -1))) {
      noUrduName.push(name);
    }
  }

  console.log('\n  What each of those rows is missing until the next data:build:');
  console.log('    · no page of its own in a fresh clone, and no marker until the CSV lands');
  console.log('    · no entry in the search index, the knowledge graph, or any /about figure');
  console.log('    · no figure page: a saint named only by one of these rows builds as');
  console.log('      lineage-only, and /saint/:slug says "named in a lineage, no entry here"');
  if (seedText) {
    console.log(
      noUrduName.length
        ? `    · ${noUrduName.length} of ${added.length} have no Urdu name in urdu-seed.json, so the` +
            ' Urdu\n      interface renders them in English — and e2e/urdu-no-leak.spec.ts cannot' +
            '\n      see it, because its fixture comes from the same snapshot:'
        : `    · all ${added.length} already carry an Urdu name in urdu-seed.json`,
    );
    for (const name of noUrduName) console.log(`        ${name}`);
  }
  console.log();
}

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonOut = jsonIndex > -1 ? process.argv[jsonIndex + 1] : null;

  if (!existsSync(SNAPSHOT)) {
    console.error(`No snapshot at ${SNAPSHOT} — cannot diff.`);
    process.exit(2);
  }

  const url = csvUrl();
  console.log(`\nLive sheet: ${url.slice(0, 72)}…\n`);

  const live = Papa.parse(download(url), { header: true, skipEmptyLines: true }).data;
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8')).rows ?? [];

  const liveSlugs = buildSlugs(live);
  const snapshotSlugs = buildSlugs(snapshot);
  const snapshotSet = new Set(snapshotSlugs);
  const liveSet = new Set(liveSlugs);

  const added = liveSlugs.filter((slug) => !snapshotSet.has(slug));
  const removed = snapshotSlugs.filter((slug) => !liveSet.has(slug));

  console.log(`Rows   live ${live.length}   ·   committed snapshot ${snapshot.length}`);
  if (added.length === 0 && removed.length === 0) {
    console.log('       the snapshot is level with the sheet.\n');
  } else {
    console.log(`       ${added.length} added, ${removed.length} removed since the last data:build\n`);
    for (const slug of added) {
      const row = live[liveSlugs.indexOf(slug)];
      console.log(`  + ${slug}   ${row?.Name ?? ''}`);
    }
    if (added.length) reportAddedConsequences(added, live, liveSlugs);
    for (const slug of removed) {
      /* A removal is the serious direction: the published photo URLs and every
         external link to /shrine/<slug> ride on these slugs (CLAUDE.md's
         eight-slug list), so a row leaving the sheet breaks links that exist in
         the world. */
      console.log(`  - ${slug}   REMOVED — external links to /shrine/${slug} now 404`);
    }
    console.log();
  }

  const offSchema = [];
  for (const row of live) {
    const value = resolveCategory(row);
    if (!value) {
      offSchema.push({ name: row.Name ?? '(unnamed)', value: '(blank)' });
      continue;
    }
    if (!CATEGORY_ENUM.includes(value)) offSchema.push({ name: row.Name ?? '(unnamed)', value });
  }

  console.log(`category   ${live.length - offSchema.length} of ${live.length} inside the schema`);
  for (const { name, value } of offSchema) {
    console.log(`  ✗ "${value}"  ← ${name}`);
  }
  if (offSchema.length > 0) {
    console.log(
      '\n  A row outside the six values loses its map colour, drops out of the category\n' +
        '  filter, and is excluded from every tradition count. The fix is a sheet edit\n' +
        '  (RULE 3) — produce a CSV patch, do not write to the sheet.\n',
    );
  } else {
    console.log();
  }

  for (const column of REPORTED_COLUMNS) {
    const counts = tally(live, column);
    if (counts.length === 1 && counts[0][0] === '(blank)') continue;
    console.log(`${column}`);
    for (const [value, count] of counts) {
      console.log(`  ${String(count).padStart(4)}  ${value}`);
    }
    console.log();
  }

  if (jsonOut) {
    writeFileSync(
      jsonOut,
      JSON.stringify(
        {
          liveRows: live.length,
          snapshotRows: snapshot.length,
          added,
          removed,
          offSchemaCategories: offSchema,
          reported: Object.fromEntries(REPORTED_COLUMNS.map((c) => [c, tally(live, c)])),
        },
        null,
        2,
      ),
    );
    console.log(`Wrote ${jsonOut}\n`);
  }

  /* Non-zero on the two things that are wrong rather than merely different: a
     row the schema does not accept, and a row that has left the sheet. Drift
     alone is expected — it is what a snapshot is. */
  if (offSchema.length > 0 || removed.length > 0) process.exit(1);
}

main();
