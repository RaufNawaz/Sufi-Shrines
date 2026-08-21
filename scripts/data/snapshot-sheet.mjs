/**
 * Write a dated, full-fidelity CSV snapshot of the archive as the repo holds it.
 *
 *   node scripts/data/snapshot-sheet.mjs            (npm run data:snapshot)
 *   node scripts/data/snapshot-sheet.mjs --label pre-import
 *
 * Why this exists: the Google Sheet is production (RULE 3). An import replaces
 * the current sheet, has no review step and no history discipline, so the moment
 * before an import is the moment you most want a restore point that is *in the
 * repository* rather than in someone's Downloads folder (RULE 0).
 *
 * Source is `src/data/shrines-fallback.json` — the snapshot the site actually
 * serves, and the file every measurement in docs/ is taken against. Not a live
 * fetch: a restore point has to be reproducible from the commit, and this
 * environment cannot reach the sheet anyway.
 *
 * ── The write-time invariants (RULE 4) ───────────────────────────────────────
 * Every one of these encodes a way this project has already lost data:
 *
 * 1. **CSV, never TSV.** Sheets' TSV export strips newlines inside cells, which
 *    flattens the markdown of every Description. Papa.unparse writes CSV.
 * 2. **Refuse to write if the *population* of long Descriptions has lost its
 *    newlines.** A TSV round-trip flattens every cell at once, so the signature
 *    is a collapse in the proportion, not one offending row. The first version
 *    of this check refused on any single long Description without a newline and
 *    fired immediately on Sant Baba Asudaram Darbar — a well-formed 1339-character
 *    paragraph with balanced `*sant*` emphasis, which has no newline because it
 *    is the one entry in the archive with no bibliography section and therefore
 *    no heading to break the line. The data was right and the check was wrong,
 *    which is RULE 4's own worked example ("a poet of note:"). Individual rows
 *    are now reported, not refused.
 * 3. **Unbalanced-asterisk check.** `*ʿurs*` italics are meaningful markdown;
 *    an odd count means a truncation mid-emphasis.
 * 4. **Row and column counts asserted against the source**, so a serialiser
 *    that silently drops a column cannot produce a plausible-looking file.
 *
 * The output is committed. `.gitignore` ignores `data/*.csv` with explicit
 * negations, and `!data/snapshot_*.csv` is one of them — without it this file
 * would be written, reported as written, and quietly not tracked, which is the
 * exact failure RULE 0 was written for.
 */
import Papa from 'papaparse';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = join(ROOT, 'src', 'data', 'shrines-fallback.json');

const args = process.argv.slice(2);
const labelIdx = args.indexOf('--label');
const label = labelIdx !== -1 ? args[labelIdx + 1] : '';
if (labelIdx !== -1 && !/^[a-z0-9-]+$/.test(label ?? '')) {
  console.error('snapshot-sheet: --label must be lowercase letters, digits and hyphens.');
  process.exit(1);
}

/* The date comes from the snapshot's own `generated` stamp when it has one, so
   two runs over the same data produce the same filename — a snapshot named for
   the day you happened to run the script is not a fact about the data. */
const parsed = JSON.parse(readFileSync(SOURCE, 'utf8'));
const rows = parsed.rows ?? parsed;
if (!Array.isArray(rows) || rows.length === 0) {
  console.error(`snapshot-sheet: ${SOURCE} holds no rows.`);
  process.exit(1);
}
const stamp = String(parsed.generated ?? '').slice(0, 10) || 'undated';

const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];

// ── invariant 2: the population still has its newlines ─────────────────────
/* A TSV round-trip strips the newlines from *every* cell, so what it looks like
   is the proportion going to zero. 168 of 169 long Descriptions carry newlines
   today; the floor is set well below that but far above what a flattening
   leaves. A single paragraph-shaped entry is normal prose, so it is reported
   rather than refused. */
const LONG = 400;
const MIN_STRUCTURED_SHARE = 0.9;
const longRows = rows.filter((r) => String(r.Description ?? '').length > LONG);
const flattened = longRows
  .filter((r) => !String(r.Description ?? '').includes('\n'))
  .map((r) => r.Name ?? '(unnamed)');
const structuredShare = longRows.length ? 1 - flattened.length / longRows.length : 1;
if (longRows.length && structuredShare < MIN_STRUCTURED_SHARE) {
  console.error(
    `snapshot-sheet: REFUSING TO WRITE. Only ${flattened.length ? (structuredShare * 100).toFixed(1) : '0'}% ` +
      `of the ${longRows.length} Descriptions over ${LONG} characters contain a newline ` +
      `(floor ${MIN_STRUCTURED_SHARE * 100}%). That is what a TSV round-trip leaves behind — ` +
      'it flattens every cell at once. Fix the source before snapshotting it: a restore point ' +
      'that restores flattened markdown is worse than none.',
  );
  process.exit(1);
}

// ── invariant 3: unbalanced emphasis ────────────────────────────────────────
const unbalanced = rows
  .filter((r) => (String(r.Description ?? '').match(/\*/g) ?? []).length % 2 !== 0)
  .map((r) => r.Name ?? '(unnamed)');

const outName = `snapshot_${stamp}${label ? `_${label}` : ''}.csv`;
const outPath = join(ROOT, 'data', outName);

/* LF row delimiters, not Papa's default CRLF.
   `.gitattributes` sets `* text=auto`, so a CRLF file is normalised to LF in the
   repository — which would mean the committed blob never matches what the script
   wrote, and a re-run would show 169 spurious changed lines forever. Nothing is
   lost: no cell in this dataset contains a CR (checked), the 3739 bare LFs
   inside Description cells are the markdown and are quoted by the serialiser,
   and Google Sheets imports LF-delimited CSV without complaint. */
const csv = Papa.unparse(rows, { header: true, columns, newline: '\n' });
writeFileSync(outPath, csv, 'utf8');

// ── invariant 4: round-trip the file we just wrote ──────────────────────────
const back = Papa.parse(csv, { header: true, skipEmptyLines: false });
const backRows = back.data.filter((r) => Object.values(r).some((v) => String(v ?? '').trim()));
if (backRows.length !== rows.length) {
  console.error(
    `snapshot-sheet: wrote ${rows.length} rows but reading the file back yields ` +
      `${backRows.length}. Not a usable restore point.`,
  );
  process.exit(1);
}
if (csv.includes('\r')) {
  console.error(
    'snapshot-sheet: the serialised CSV contains a CR. `.gitattributes` would normalise it, ' +
      'so the committed file could never match what was written. Refusing.',
  );
  process.exit(1);
}
const backCols = back.meta.fields ?? [];
if (backCols.length !== columns.length) {
  console.error(
    `snapshot-sheet: wrote ${columns.length} columns but read back ${backCols.length}.`,
  );
  process.exit(1);
}

console.log(`✓ data/${outName} — ${rows.length} rows × ${columns.length} columns`);
console.log(`  source: src/data/shrines-fallback.json (generated ${stamp})`);
console.log(
  `  round-trip: row and column counts match; ${(structuredShare * 100).toFixed(1)}% of ` +
    `${longRows.length} long Descriptions keep their newlines`,
);
if (flattened.length) {
  console.log(
    `  · ${flattened.length} long Description(s) are a single paragraph with no newline. ` +
      'Reported, not refused — an entry with no headings and no bibliography legitimately ' +
      'has nothing to break the line:',
  );
  for (const name of flattened.slice(0, 10)) console.log(`      · ${name}`);
}
if (unbalanced.length) {
  console.log(
    `  ⚠ ${unbalanced.length} Description(s) have an odd number of '*'. Written anyway — the ` +
      'snapshot must record the data as it is, not a tidied version (RULE 2). Listed so the ' +
      'next editor can look:',
  );
  for (const name of unbalanced.slice(0, 10)) console.log(`      · ${name}`);
}
console.log('\n  Import settings, if this is ever restored into the sheet:');
console.log('    Replace current sheet · comma separator ·');
console.log('    "Convert text to numbers, dates and formulas" OFF');
