#!/usr/bin/env node
/**
 * build-image-shapes.mjs — turn the measured photograph shapes into the box the
 * browser reserves before the bytes arrive.
 *
 * WHAT PROBLEM THIS SOLVES. A replaced element has no height until it decodes,
 * so a shrine hero measured 0px and then its real height about a second after
 * the article had already rendered, and the infobox — on screen at y=483 —
 * moved 239px down with it. That was the whole of `/shrine`'s CLS 0.1115
 * (`node scripts/measure-cls.mjs --route /shrine/data-darbar`).
 *
 * WHY NOT ONE ASPECT RATIO IN CSS. Because it was tried, and the measurement
 * that `pipeline/measure_image_shapes.py` exists for killed it: **31 of the
 * archive's 239 measurable images are portrait**, and 16 of the 115 heroes are,
 * so any single landscape box crops one entry in seven to a band. 4:3 is both
 * the median and the mode, and it is still wrong for an eighth of the archive.
 * The photographs are the thing this project is for; they do not get cropped to
 * save a layout pass.
 *
 * KEYED BY A HASH OF THE URL. Keyed on the URL itself the map is 32 KB and it
 * is eager on every route that renders a `ShrineImage` — and this repository has
 * already shipped an 80 KB payload into a shared eager chunk once and raised the
 * budgets twice to accommodate it (see `scripts/check-bundle-budget.mjs`). The
 * URLs are the whole of the weight, so they are hashed to seven characters and
 * the map is about 6 KB. Keyed on the *slug* it would be short too, and wrong:
 * a shape has to stop applying the moment the sheet points that field at a
 * different photograph, and a hash simply misses, where a slug would go on
 * reserving the old shape for the new picture. A miss is today's behaviour, so
 * the failure mode is a lost improvement and never a wrong box. See
 * `src/lib/images/imageShapeKey.ts`.
 *
 * THE GATE. `--check` fails when a populated image URL in the committed
 * snapshot appears in neither `shapes` nor `unmeasurable`. That is the case
 * that matters: somebody adds a photograph to the sheet, nobody re-measures,
 * and the box is silently lost again. The three `unmeasurable` URLs are the
 * three that `check_image_liveness.py` independently found dead on 27 August
 * 2026 — two 404s on Wikimedia and a 403 — so they are named, not tolerated in
 * a count.
 *
 * Regenerate the inputs with:
 *   python3 pipeline/measure_image_shapes.py --all \
 *     --tsv pipeline/image_shapes.tsv \
 *     --unmeasurable-tsv pipeline/image_shapes_unmeasurable.tsv --resume
 *
 * Usage:  node scripts/data/build-image-shapes.mjs [--check]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageShapeKey } from './lib/imageShapeKey.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const SHAPES_TSV = join(ROOT, 'pipeline', 'image_shapes.tsv');
const UNMEASURABLE_TSV = join(ROOT, 'pipeline', 'image_shapes_unmeasurable.tsv');
const SNAPSHOT = join(ROOT, 'src', 'data', 'shrines-fallback.json');
const OUT = join(ROOT, 'src', 'data', 'image-shapes.json');

const IMAGE_FIELDS = Array.from({ length: 16 }, (_, i) => `Image ${i + 1}`);

function readTsv(path) {
  if (!existsSync(path)) return [];
  const [header, ...rows] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = header.split('\t');
  return rows
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split('\t');
      return Object.fromEntries(cols.map((col, i) => [col, parts[i] ?? '']));
    });
}

/** Every populated image URL in the snapshot, in sheet order. */
function snapshotImageUrls() {
  const rows = JSON.parse(readFileSync(SNAPSHOT, 'utf8')).rows ?? [];
  const urls = [];
  for (const row of rows) {
    for (const field of IMAGE_FIELDS) {
      const value = row[field];
      if (typeof value === 'string' && value.trim().startsWith('http')) urls.push(value.trim());
    }
  }
  return urls;
}

function build() {
  const shapes = {};
  /* Collisions are checked rather than assumed. 242 keys in a 36^7 space makes
     one about as likely as a coin landing on its edge, but "unlikely" is the
     class of assumption RULE 4 exists about, and the consequence — one
     photograph silently reserving another's box — is exactly the bug this file
     is meant to remove. */
  const claimedBy = new Map();
  const collisions = [];
  for (const row of readTsv(SHAPES_TSV)) {
    const width = Number(row.width);
    const height = Number(row.height);
    if (!row.url || !Number.isFinite(width) || !Number.isFinite(height)) continue;
    if (width <= 0 || height <= 0) continue;
    const key = imageShapeKey(row.url);
    const owner = claimedBy.get(key);
    if (owner && owner !== row.url) collisions.push([key, owner, row.url]);
    claimedBy.set(key, row.url);
    shapes[key] = [width, height];
  }

  const unmeasurable = {};
  for (const row of readTsv(UNMEASURABLE_TSV)) {
    if (row.url) unmeasurable[imageShapeKey(row.url)] = row.status || 'unknown';
  }

  return { shapes, unmeasurable, collisions };
}

function main() {
  const check = process.argv.includes('--check');
  const { shapes, unmeasurable, collisions } = build();
  const urls = snapshotImageUrls();
  const unique = [...new Set(urls)];

  if (collisions.length > 0) {
    console.error('Two image URLs hash to the same key, so one would reserve the other\'s box:');
    for (const [key, a, b] of collisions) console.error(`  ${key}\n    ${a}\n    ${b}`);
    process.exit(1);
  }

  const missing = unique.filter((url) => {
    const key = imageShapeKey(url);
    return !shapes[key] && !unmeasurable[key];
  });

  if (check) {
    if (!existsSync(OUT)) {
      console.error(`image-shapes.json is missing. Run: node scripts/data/build-image-shapes.mjs`);
      process.exit(1);
    }
    const current = JSON.parse(readFileSync(OUT, 'utf8'));
    // The content, not the timestamp — a rebuild that changes nothing must not
    // be able to fail the gate, or the gate becomes something people skip.
    const same =
      JSON.stringify(current.shapes) === JSON.stringify(shapes) &&
      JSON.stringify(current.unmeasurable) === JSON.stringify(unmeasurable);
    if (!same) {
      console.error(
        'image-shapes.json is out of date with pipeline/image_shapes.tsv.\n' +
          'Run: node scripts/data/build-image-shapes.mjs',
      );
      process.exit(1);
    }
    if (missing.length > 0) {
      console.error(
        `${missing.length} image URL(s) in the snapshot have no measured shape and are not\n` +
          'recorded as unmeasurable, so they will reserve no box and the page will jump when\n' +
          'they load. Re-measure:\n\n' +
          '  python3 pipeline/measure_image_shapes.py --all \\\n' +
          '    --tsv pipeline/image_shapes.tsv \\\n' +
          '    --unmeasurable-tsv pipeline/image_shapes_unmeasurable.tsv --resume\n',
      );
      for (const url of missing.slice(0, 10)) console.error(`  ${url}`);
      process.exit(1);
    }
    console.log(
      `image-shapes: ${Object.keys(shapes).length} measured, ` +
        `${Object.keys(unmeasurable).length} unmeasurable, ${unique.length} in the snapshot — ok`,
    );
    return;
  }

  /* One entry per line rather than `JSON.stringify(…, null, 2)`.
     Pretty-printing 242 pairs of integers across three lines each is 11 KB of
     mostly indentation on a file whose whole purpose is to be small enough to
     be eager; compact-but-line-per-entry is 5 KB and still diffs one image at a
     time, which matters because the only readable thing about a hashed key is
     which line it is on.

     No build timestamp, deliberately: the date that means anything here is when
     the photographs were *measured*, and a regeneration that fetched nothing
     must not be able to claim it is fresher than the measurement it copied. */
  const line = (key, value) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  const body = [
    '{',
    '  "source": "pipeline/image_shapes.tsv",',
    '  "shapes": {',
    Object.entries(shapes)
      .map(([key, value]) => line(key, value))
      .join(',\n'),
    '  },',
    '  "unmeasurable": {',
    Object.entries(unmeasurable)
      .map(([key, value]) => line(key, value))
      .join(',\n'),
    '  }',
    '}',
    '',
  ].join('\n');
  writeFileSync(OUT, body);
  console.log(
    `Wrote ${OUT}\n  ${Object.keys(shapes).length} measured shapes\n` +
      `  ${Object.keys(unmeasurable).length} unmeasurable (recorded, so the gate stays green)\n` +
      `  ${unique.length} unique image URLs in the snapshot\n` +
      `  ${missing.length} with no shape and no reason`,
  );
  if (missing.length > 0) {
    for (const url of missing.slice(0, 10)) console.log(`    ${url}`);
  }
}

main();
