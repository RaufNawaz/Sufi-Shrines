#!/usr/bin/env node
/**
 * build-figure-identity-worksheet.mjs — the open column decision, as 169 rows a
 * human can actually answer.
 *
 * `build-kg.mjs` builds every figure's identity from `Sufi Saint`, the legacy
 * column. The schema's own column is `principal_figure`, and it is visibly the
 * curated one: consistent spelling, epithets moved out of the name, and a `;`
 * convention for a row that names two people.
 * `docs/planning/DECISION_figure_identity_column.md` measured the gap on
 * 28 August 2026 and closed the composite half of the question. What it could
 * not close is the column itself, for a reason worth restating:
 *
 *   > So the migration is not "adopt the better column". It is a row-by-row
 *   > reconciliation with a per-row winner, which is exactly the shape of work
 *   > this project reserves for a human.
 *
 * That sentence is correct, and it is also where the work stopped. A reviewer
 * who agrees with it still has to hold two columns, seventeen merge-variant
 * keys, a paren-aware split and 46 retiring URLs in their head at once, across
 * 169 rows, before they can answer even the easy ones. This turns it into a CSV
 * with one question per row and the evidence for it on the same line — the same
 * move `build-review-worksheet.mjs` made for the 235 machine proposals, applied
 * to the decision those proposals hang off.
 *
 * It decides nothing. Every consequence printed here is mechanical: which slug a
 * cell produces, which URL stops existing, which merge key stops applying, which
 * figure splits back apart. The judgement — which column is right *for this row*
 * — is the `verdict` field, and it is empty in every row this writes.
 *
 * Ordering, because the reviewer's attention is the scarce resource:
 *
 *   1  the answer is contested: switching would split a figure back apart, or
 *      drop a merge that is only keyed on the legacy cell, or the `;` sits
 *      inside a parenthetical where a naive split produces nodes that are not
 *      people. `principal_figure` is *worse* in at least one of these (Kalka
 *      Cave Temple), which is the whole reason this is a decision.
 *   2  the figure slug moves. Mechanical, but it retires a published URL — among
 *      them `data-ganj-bakhsh`, the archive's most linkable figure.
 *   3  the two cells differ only as wording, or agree. Confirm and move on.
 *
 * Usage:  node scripts/data/build-figure-identity-worksheet.mjs
 *         node scripts/data/build-figure-identity-worksheet.mjs --check
 *
 * `--check` writes nothing and fails if the worksheet on disk is missing a row.
 * A reconciliation queue that quietly drops rows reads as a finished decision,
 * which is the same failure `data:review:check` exists to prevent.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';
import { slugify } from './lib/slugs.mjs';
import { analyseFigureColumns } from './lib/figureColumns.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'data/review/figure-identity-review.csv');
const check = process.argv.includes('--check');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

for (const f of ['data/shrines.json', 'data/kg-seeds.json', 'src/data/shrines-fallback.json']) {
  if (!existsSync(join(ROOT, f))) {
    console.error(`[figure-identity] ${f} not found. Run: npm run data:build`);
    process.exit(1);
  }
}

const { rows } = read('data/shrines.json');
const seeds = read('data/kg-seeds.json');

/* The worksheet is built off data/shrines.json, and the site renders
   src/data/shrines-fallback.json. They are two exports of the same sheet and
   nothing keeps them in step automatically, so a worksheet built off a stale
   export would send a reviewer to reconcile cells the archive no longer holds.
   Cheap to check, and this project's rule is to check rather than to intend. */
const shipped = read('src/data/shrines-fallback.json').rows;
const figureCells = (list) =>
  new Map(
    list.map((r) => [
      String(r.Name ?? ''),
      `${String(r['Sufi Saint'] ?? '').trim()} | ${String(r['principal_figure'] ?? '').trim()}`,
    ]),
  );
const fromExport = figureCells(rows);
const fromShipped = figureCells(shipped);
const drifted = [...fromExport.keys()].filter(
  (n) => !fromShipped.has(n) || fromShipped.get(n) !== fromExport.get(n),
);
if (drifted.length || fromExport.size !== fromShipped.size) {
  console.error(
    `[figure-identity] FAILED — data/shrines.json and the shipped snapshot disagree about ` +
      `${drifted.length || Math.abs(fromExport.size - fromShipped.size)} row(s) figure columns, e.g.\n  ` +
      drifted.slice(0, 5).join('\n  ') +
      `\nRebuild before reconciling: npm run data:build`,
  );
  process.exit(1);
}

/* Every consequence below comes from `lib/figureColumns.mjs`, which is also what
   `measure-figure-identity-columns.mjs` prints. They used to be two copies of
   the same arithmetic and they drifted apart within a day — see that module's
   header. A worksheet and a measurement that disagree about how many URLs a
   migration retires is worse than either alone, because the reviewer has no way
   to tell which one to believe. */
const analysis = analyseFigureColumns(rows, seeds);
const {
  perRow,
  sitesPerLegacySlug,
  outcomesPerLegacySlug,
  originsPerPfSlug,
  legacyOnlyMergeKeys,
  totals,
} = analysis;
const legacyOnlyMergeKeySet = new Set(legacyOnlyMergeKeys);
const pfUniverse = analysis.pfUniverse;

const COLUMNS = [
  'id',
  'priority',
  'shrine',
  'legacy_cell',
  'principal_figure_cell',
  'legacy_slug',
  'principal_slug',
  'consequence',
  'sites_on_legacy_figure',
  'retires_url',
  'flags',
  'verdict',
  'chosen_name',
  'reviewer_note',
];

const worksheet = [];
for (const r of perRow) {
  const flags = [];
  const legacyKey = r.legacySlugs.join('+');
  const pfKey = r.pfSlugs.join('+');

  if (r.pfEmpty) flags.push('principal_figure-empty');
  if (r.nestedSemicolon) flags.push('semicolon-inside-parenthetical');
  if (legacyOnlyMergeKeySet.has(r.legacyCell)) flags.push('merge-key-legacy-only');
  if (r.isComposite) flags.push('composite-row');

  for (const slug of r.legacySlugs) {
    if ((outcomesPerLegacySlug.get(slug)?.size ?? 0) > 1) flags.push(`splits-figure:${slug}`);
  }
  for (const slug of r.pfSlugs) {
    if ((originsPerPfSlug.get(slug)?.size ?? 0) > 1) flags.push(`joins-figures:${slug}`);
  }

  const retiring = r.legacySlugs.filter((s) => !pfUniverse.has(s));
  if (retiring.length) flags.push(`retires:${retiring.join(',')}`);

  let consequence;
  if (r.pfEmpty) consequence = 'principal_figure is empty, legacy is the only column with a value';
  else if (!r.moves)
    consequence = r.legacyCell === r.pfCell ? 'identical' : 'same figure, different wording';
  else if (r.pfSlugs.length > r.legacySlugs.length) consequence = 'one figure becomes several';
  else if (r.pfSlugs.length < r.legacySlugs.length) consequence = 'several figures become one';
  else consequence = 'the figure slug moves';

  const contested = flags.some(
    (f) =>
      f.startsWith('splits-figure:') ||
      f.startsWith('joins-figures:') ||
      f === 'merge-key-legacy-only' ||
      f === 'semicolon-inside-parenthetical' ||
      f === 'principal_figure-empty',
  );
  const priority = contested ? 1 : r.moves ? 2 : 3;

  /* The digest is over the evidence — both cells — so a recorded verdict is
     carried across regenerations, and stops being carried exactly when the cells
     change, which is when it became a verdict about something else. Same rule as
     the KG review worksheet's quote digest, and for the same reason. */
  const digest = createHash('sha256')
    .update(`${r.legacyCell} | ${r.pfCell}`)
    .digest('hex')
    .slice(0, 8);

  worksheet.push({
    id: `figure-column:${slugify(r.name)}:${digest}`,
    priority,
    shrine: r.name,
    legacy_cell: r.legacyCell,
    principal_figure_cell: r.pfCell,
    legacy_slug: legacyKey,
    principal_slug: pfKey,
    consequence,
    sites_on_legacy_figure: r.legacySlugs
      .map((s) => `${s}=${sitesPerLegacySlug.get(s) ?? 0}`)
      .join(' '),
    retires_url: retiring.join(' '),
    flags: flags.join(' '),
    verdict: '',
    chosen_name: '',
    reviewer_note: '',
  });
}

worksheet.sort((x, y) => x.priority - y.priority || x.shrine.localeCompare(y.shrine, 'en'));

if (check) {
  if (!existsSync(OUT)) {
    console.error(
      '[figure-identity] FAILED — data/review/figure-identity-review.csv is missing. ' +
        'Run: npm run data:review:figures',
    );
    process.exit(1);
  }
  const onDisk = Papa.parse(readFileSync(OUT, 'utf8'), { header: true, skipEmptyLines: true });
  const ids = new Set(onDisk.data.map((r) => r.id));
  const missing = worksheet.filter((r) => !ids.has(r.id)).map((r) => r.id);
  if (missing.length) {
    console.error(
      `[figure-identity] FAILED — ${missing.length} row(s) are not in the worksheet:\n  ` +
        missing.slice(0, 10).join('\n  ') +
        (missing.length > 10 ? `\n  and ${missing.length - 10} more` : '') +
        '\nRun: npm run data:review:figures (verdicts already recorded are preserved by id).',
    );
    process.exit(1);
  }
  const withVerdict = onDisk.data.filter((r) => (r.verdict ?? '').trim()).length;
  console.log(
    `[figure-identity] OK — ${ids.size} row(s) on disk cover all ${worksheet.length} sheet row(s); ` +
      `${withVerdict} carry a verdict.`,
  );
  process.exit(0);
}

let carried = 0;
if (existsSync(OUT)) {
  const previous = Papa.parse(readFileSync(OUT, 'utf8'), { header: true, skipEmptyLines: true });
  const byId = new Map(previous.data.map((r) => [r.id, r]));
  for (const row of worksheet) {
    const old = byId.get(row.id);
    const recorded =
      old &&
      ((old.verdict ?? '').trim() ||
        (old.chosen_name ?? '').trim() ||
        (old.reviewer_note ?? '').trim());
    if (recorded) {
      row.verdict = old.verdict ?? '';
      row.chosen_name = old.chosen_name ?? '';
      row.reviewer_note = old.reviewer_note ?? '';
      carried += 1;
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Papa.unparse(worksheet, { header: true, columns: COLUMNS, newline: '\n' }), 'utf8');

const byPriority = worksheet.reduce(
  (acc, r) => ((acc[r.priority] = (acc[r.priority] ?? 0) + 1), acc),
  {},
);
/* From the shared analysis, never recounted off the CSV: recomputing "moved" as
   `legacy_slug !== principal_slug` is what made this file report 48 against the
   instrument's 47, by counting the one row whose principal_figure is empty as a
   row that moves somewhere. */
const moves = totals.moved;
const retiredSlugs = new Set(analysis.retiring);
console.log(
  `[figure-identity] wrote ${worksheet.length} row(s) to data/review/figure-identity-review.csv`,
);
console.log(
  `[figure-identity]   priority 1 (contested): ${byPriority[1] ?? 0} | ` +
    `2 (slug moves): ${byPriority[2] ?? 0} | 3 (confirm): ${byPriority[3] ?? 0}`,
);
console.log(
  `[figure-identity]   ${moves} row(s) would move to a different figure slug; ` +
    `${retiredSlugs.size} current figure URL(s) would retire`,
);
if (carried) console.log(`[figure-identity]   carried ${carried} existing verdict(s) across by id`);
console.log('[figure-identity]   decision: docs/planning/DECISION_figure_identity_column.md');
