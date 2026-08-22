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
const csv = Papa.unparse(
  { fields: COLUMNS, data: rows.map((row) => COLUMNS.map((col) => row[col] ?? '')) },
  { newline: '\r\n' },
);
fs.writeFileSync(outPath, `${csv}\r\n`);
console.log(`Wrote ${rows.length} rows to ${path.relative(process.cwd(), outPath)}`);
