// @vitest-environment node
/**
 * A committed snapshot must still match the data it claims to snapshot.
 *
 * `data/snapshot_*.csv` exists to be a restore point for the Google Sheet, which
 * is production and keeps no history (RULE 3). A restore point that has silently
 * drifted from the archive is worse than none: it looks like insurance and pays
 * out the wrong data.
 *
 * The check is a full round-trip — parse the newest snapshot back and compare
 * every field of every row against `src/data/shrines-fallback.json`. That is
 * 7,436 field comparisons and takes milliseconds, so there is no reason to check
 * anything weaker.
 *
 * When this fails after a legitimate `npm run data:build`, the fix is
 * `npm run data:snapshot` — a new dated file, not an edit to the old one. Old
 * snapshots are history; only the newest is asserted to match.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';

const ROOT = join(__dirname, '../../../..');
const DATA = join(ROOT, 'data');

const snapshots = existsSync(DATA)
  ? readdirSync(DATA)
      .filter((f) => /^snapshot_.*\.csv$/.test(f))
      .sort()
  : [];

const describeIf = snapshots.length ? describe : describe.skip;

describeIf('the newest sheet snapshot still matches the data', () => {
  const newest = snapshots[snapshots.length - 1]!;
  const source = JSON.parse(readFileSync(join(ROOT, 'src/data/shrines-fallback.json'), 'utf8'));
  const rows: Record<string, unknown>[] = source.rows ?? source;
  const parsed = Papa.parse<Record<string, string>>(
    readFileSync(join(DATA, newest), 'utf8'),
    { header: true, skipEmptyLines: false },
  );
  const back = parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? '').trim()));

  it(`${newest} has the same number of rows`, () => {
    expect(back.length, 'run `npm run data:snapshot` to write a fresh dated snapshot').toBe(
      rows.length,
    );
  });

  it(`${newest} has the same columns`, () => {
    const expected = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    expect(parsed.meta.fields ?? []).toEqual(expected);
  });

  it(`${newest} matches every field`, () => {
    const diffs: string[] = [];
    rows.forEach((row, i) => {
      for (const key of Object.keys(row)) {
        const a = String(row[key] ?? '');
        const b = String(back[i]?.[key] ?? '');
        if (a !== b) diffs.push(`row ${i} (${String(row.Name)}) · ${key}`);
      }
    });
    expect(
      diffs.slice(0, 10),
      `${diffs.length} field(s) differ. If the dataset was legitimately rebuilt, run ` +
        '`npm run data:snapshot` for a new dated file rather than editing the old one — an ' +
        'old snapshot is history, not a claim about today.',
    ).toEqual([]);
  });

  it('the newlines inside Descriptions survived the round-trip', () => {
    // The specific thing a TSV export destroys, and the reason this file exists.
    const withNewlines = rows.filter((r) => String(r.Description ?? '').includes('\n')).length;
    const preserved = rows.filter(
      (r, i) =>
        String(r.Description ?? '').includes('\n') &&
        String(back[i]?.Description ?? '').includes('\n'),
    ).length;
    expect(preserved).toBe(withNewlines);
    expect(withNewlines, 'no Description has a newline — the source is already flat').toBeGreaterThan(
      100,
    );
  });
});
