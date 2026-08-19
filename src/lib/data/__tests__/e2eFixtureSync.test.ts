// @vitest-environment node
/**
 * The Playwright suite runs against `e2e/fixtures/shrines.csv`, a deterministic
 * copy of the dataset, while `SHRINE_COUNT` in `e2e/fixtures.ts` is read from
 * the live snapshot `src/data/shrines-fallback.json`. Those two must describe
 * the same dataset or the map specs assert a row count the fixture cannot
 * produce.
 *
 * They drifted on 18 August 2026: refreshing the dataset from 163 to 169 rows
 * updated the snapshot but not the generated fixture, and nothing noticed
 * until the e2e suite ran — well after the commit, and after a deploy. This
 * runs in `npm run verify`, so the mismatch now surfaces in seconds.
 *
 * Fix a failure by regenerating, never by editing the CSV by hand:
 *   node e2e/fixtures/generate-shrines-csv.mjs
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');

/** Counts CSV records, honouring quoted fields that contain newlines —
 *  Descriptions in this dataset are multi-line markdown. */
function countCsvRecords(csv: string): number {
  let records = 0;
  let inQuotes = false;
  let sawContent = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (inQuotes && csv[i + 1] === '"') i++;
      else inQuotes = !inQuotes;
      sawContent = true;
    } else if (char === '\n' && !inQuotes) {
      if (sawContent) records++;
      sawContent = false;
    } else if (char !== '\r') {
      if (char.trim() !== '') sawContent = true;
    }
  }
  if (sawContent) records++;
  return records - 1; // drop the header
}

describe('e2e fixture stays in sync with the shipped snapshot', () => {
  it('has one CSV row per snapshot row', () => {
    const snapshot = JSON.parse(
      readFileSync(join(ROOT, 'src', 'data', 'shrines-fallback.json'), 'utf8'),
    ) as { rows: unknown[] };
    const fixture = readFileSync(join(ROOT, 'e2e', 'fixtures', 'shrines.csv'), 'utf8');

    expect(
      countCsvRecords(fixture),
      'e2e/fixtures/shrines.csv is stale — regenerate it with ' +
        '`node e2e/fixtures/generate-shrines-csv.mjs`',
    ).toBe(snapshot.rows.length);
  });
});
