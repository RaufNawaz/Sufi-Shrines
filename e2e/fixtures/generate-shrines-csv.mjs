// Regenerates e2e/fixtures/shrines.csv from the bundled fallback snapshot so
// the Playwright suite runs against a deterministic copy of the dataset
// instead of the live Google Sheets CSV:
//
//   node e2e/fixtures/generate-shrines-csv.mjs
//
// The header row mirrors the live sheet (data/shrines.csv); values are
// unparsed with papaparse — the same library the app parses with — so
// quoting/newline handling round-trips. The 2026 structured columns are
// included deliberately: until 22 Aug the fixture exported only the 11
// legacy columns, so every e2e run exercised a site with no site_type,
// status, info_level or support_level anywhere — badges, status notes and
// the typology atlas were untestable end-to-end.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const here = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.join(here, '..', '..', 'src', 'data', 'shrines-fallback.json');
const outPath = path.join(here, 'shrines.csv');

const COLUMNS = [
  'Name',
  'Location',
  'Category',
  'Latitude',
  'Longitude',
  'Founded/Opened',
  'Sufi Saint',
  'Image 1',
  'Image 2',
  'Events',
  'Description',
  'category',
  'site_type',
  'status',
  'status_note',
  'principal_figure',
  'figure_type',
  'silsila',
  'year_built',
  'year_built_precision',
  'year_built_note',
  'figure_born',
  'figure_died',
  'event_year',
  'event_note',
  'info_level',
  'support_level',
];

const { rows } = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

// One row is exported without coordinates, deliberately.
//
// The live sheet has two genuinely unmapped rows (Shah Gohar Peer, Mian
// Qurban Ali Shah) which the 22 Aug ruling keeps as pages. The committed
// snapshot predates the builder change that stopped dropping them, so it
// holds 169 rows where the sheet holds 171 — and every row in it has
// coordinates. The consequence was not a missing test case but a shipped
// outage: ShrineMarkers' unmapped branch was unreachable in the suite, its
// `return` (in a for...of, where `continue` was meant) abandoned the whole
// effect, and production rendered zero markers for every shrine. The suite
// stayed green throughout.
//
// So the fixture manufactures the condition rather than waiting for the
// snapshot to be refreshed. Chosen by name, not by position, and asserted to
// exist so this fails loudly instead of silently exporting 169 mapped rows
// again. Not a tour stop and not referenced by any spec.
const UNMAPPED_FIXTURE_ROW = 'Umarkot (Amarkot) Shiv Mandir';

const target = rows.find((row) => row.Name === UNMAPPED_FIXTURE_ROW);
if (!target) {
  throw new Error(
    `Fixture generator: no row named "${UNMAPPED_FIXTURE_ROW}" in the snapshot. ` +
      'Pick another row to export unmapped and update UNMAPPED_FIXTURE_ROW — do not ' +
      'drop the unmapped case, it is the only thing exercising that branch.',
  );
}

const data = rows.map((row) =>
  COLUMNS.map((col) => {
    if (row === target && (col === 'Latitude' || col === 'Longitude')) return '';
    return row[col] ?? '';
  }),
);

const csv = Papa.unparse({ fields: COLUMNS, data }, { newline: '\r\n' });
fs.writeFileSync(outPath, `${csv}\r\n`);
console.log(
  `Wrote ${rows.length} rows to ${path.relative(process.cwd(), outPath)} ` +
    `(${rows.length - 1} mapped; "${UNMAPPED_FIXTURE_ROW}" exported unmapped)`,
);
