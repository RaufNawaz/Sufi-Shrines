// Regenerates e2e/fixtures/shrines.csv from the bundled fallback snapshot so
// the Playwright suite runs against a deterministic copy of the dataset
// instead of the live Google Sheets CSV:
//
//   node e2e/fixtures/generate-shrines-csv.mjs
//
// The header row mirrors the live sheet's 11 columns (see CLAUDE.md and
// src/lib/data/constants.ts); values are unparsed with papaparse — the same
// library the app parses with — so quoting/newline handling round-trips.
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
];

const { rows } = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
const csv = Papa.unparse(
  { fields: COLUMNS, data: rows.map((row) => COLUMNS.map((col) => row[col] ?? '')) },
  { newline: '\r\n' },
);
fs.writeFileSync(outPath, `${csv}\r\n`);
console.log(`Wrote ${rows.length} rows to ${path.relative(process.cwd(), outPath)}`);
