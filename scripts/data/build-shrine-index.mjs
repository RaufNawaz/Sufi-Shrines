#!/usr/bin/env node
/**
 * build-shrine-index.mjs — the map's slim index, and the guard that it has not
 * drifted from the dataset it is a projection of.
 *
 * WHY IT EXISTS. The front door downloads 672 KB of article prose to draw 169
 * dots. Measured 29 August 2026 on a phone at slow 4G + 4× CPU: FCP at 1.2 s,
 * then an empty map for four more seconds while the CSV arrives — 837 KB raw,
 * 295 KB gzipped, of which **80.3% is `Description`** and the map renders 1.4%.
 * `docs/planning/FRONT_DOOR_PAYLOAD.md` has the full measurement.
 *
 * This projection is ~62 KB raw / ~13 KB gzipped — a 22× reduction — and the
 * map can draw from it while the CSV is still in flight.
 *
 * TWO GENERATORS, ONE SHAPE, AND THAT IS DELIBERATE. `build-dataset.mjs` emits
 * this file from the same in-memory rows it writes the snapshot from, so a live
 * build cannot produce a slim index that disagrees with the dataset — the
 * strongest form of the guard, and the one that matters, because **a slim index
 * that drifts puts a pin where the entry does not claim to be.** This script
 * writes the identical projection from `data/shrines.json`, which is what that
 * build already wrote, so it can be re-run offline and — with `--check` — assert
 * on every `npm run verify` that the shipped index still matches the dataset.
 *
 * Fetching the sheet is not required and not done here. That is
 * `npm run data:build`'s job and it talks to production (RULE 3).
 *
 *     node scripts/data/build-shrine-index.mjs           # write
 *     node scripts/data/build-shrine-index.mjs --check   # verify, write nothing
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');
const OUT = join(ROOT, 'src', 'data', 'shrines-index.json');

/**
 * The columns the front door renders before an entry is opened.
 *
 * Four of them draw the map. The rest are here because **the sidebar card has
 * to be whole**: it shows the location, both provenance badges and a thumbnail,
 * and a card that fills its holes a second later reads as breakage rather than
 * as loading. `Image 1` earns its 3 KB twice over — the list renders a
 * category-coloured empty slot for a shrine with no picture, so omitting it
 * would show all 169 cards as photo-less and then pop 118 photographs in.
 *
 * `Description` is deliberately absent, and it is 80% of the payload. The
 * preview panel shows a snippet of it, but that panel is a click away and the
 * CSV has landed by then; the card behind it is complete without it.
 *
 * Keep this list in step with `INDEX_COLUMNS` in build-dataset.mjs —
 * `shrinesIndex.test.ts` reads BOTH lists out of their source as text and fails
 * if they disagree. It reads rather than imports on purpose: importing this
 * `.mjs` from a file inside `tsconfig`'s `include` is TS7016, which is an error
 * and not a warning, and a red typecheck aborts `build:e2e` and leaves `dist/`
 * holding the previous bundle.
 */
const INDEX_COLUMNS = [
  'Name',
  'Latitude',
  'Longitude',
  'category',
  'Category', // legacy fallback; one row carries only this
  'Location',
  'support_level',
  'info_level',
  'id',
  'Image 1',
];

const { rows, generated } = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));

const slimRows = rows.map((row) =>
  Object.fromEntries(
    INDEX_COLUMNS.filter((c) => String(row[c] ?? '').trim() !== '').map((c) => [c, row[c]]),
  ),
);
const payload = { generated, count: slimRows.length, columns: INDEX_COLUMNS, rows: slimRows };
const serialized = JSON.stringify(payload) + '\n';

if (CHECK) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    console.error('[shrine-index] src/data/shrines-index.json is missing. Run: npm run data:index');
    process.exit(1);
  }
  /* Compared on the ROWS, not the file: `generated` moves with every dataset
     build and a timestamp difference is not drift. */
  const mine = JSON.parse(current);
  if (JSON.stringify(mine.rows) !== JSON.stringify(slimRows)) {
    console.error(
      '[shrine-index] the slim index disagrees with data/shrines.json. A pin could be ' +
        'somewhere the entry does not claim. Run: npm run data:index',
    );
    process.exit(1);
  }
  if (JSON.stringify(mine.columns) !== JSON.stringify(INDEX_COLUMNS)) {
    console.error('[shrine-index] the shipped column list is not the declared one.');
    process.exit(1);
  }
  console.log(
    `[shrine-index] OK — ${slimRows.length} slim rows match data/shrines.json across ` +
      `${INDEX_COLUMNS.length} columns.`,
  );
} else {
  writeFileSync(OUT, serialized, 'utf8');
  const raw = (serialized.length / 1024).toFixed(0);
  const gz = (gzipSync(serialized).length / 1024).toFixed(0);
  console.log(
    `[shrine-index] wrote ${slimRows.length} rows — ${raw} KB raw, ~${gz} KB gzipped ` +
      `(the full dataset is ~288 KB gzipped)`,
  );
}
