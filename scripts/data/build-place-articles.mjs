#!/usr/bin/env node
/**
 * build-place-articles.mjs — the place and province articles the site shows.
 *
 * Rauf, 30 October 2026: every place gets its own description from the books
 * (docs/prompts/PLACE_DESCRIPTION_BRIEF.md). The articles are written into
 * `entries/places_public/<slug>.md` (English) and `<slug>.ur.md` (Urdu), and
 * each passes three independent verifiers whose verdicts are stamped, with the
 * md5 of the file each one read, at the top of `<slug>.notes.md`.
 *
 * THE GATE. An article enters `src/data/place-articles/<slug>.json` only when all
 * three stamps read PASS and match the files as they are now. A draft halfway
 * through the queue, or an article edited after its verifiers read it, stays
 * in the folder and off the site. The stamp format is the one
 * `pipeline/book_queue/public_description_queue.py verdict` writes:
 *
 *   V1 English fidelity: PASS (round 2) en:47a5be5b
 *   V2 Urdu fidelity: PASS (round 3) en:47a5be5b ur:18d680d1
 *   V3 Urdu fluency: PASS (round 3) ur:18d680d1
 *
 * THE SHORT ARTICLE (Rauf, 30 October 2026: "an article that is short and complete
 * but then switch to the longer one if you want or toggle which sections you need
 * more information for"). `<slug>.short.md` and `<slug>.short.ur.md`, with the same
 * section headings as the long article and their own three stamps in
 * `<slug>.short.notes.md`, ride along as `short` under the same gate: only when
 * the long article passed and the short one's stamps are PASS on its current
 * files. Without one, the page shows the long article alone.
 *
 * `--check` fails when the data file disagrees with what this would write, so
 * an article that passed without a rebuild (or a rebuild that left a stale
 * one) fails `npm run data:validate`.
 *
 * Usage:  node scripts/data/build-place-articles.mjs [--check]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, 'entries', 'places_public');
/* One file per place, so a reader of /place/multan downloads Multan's article and
   not Lahore's 500 KB as well (the app loads them with import.meta.glob). */
const OUT_DIR = join(ROOT, 'src', 'data', 'place-articles');
const check = process.argv.includes('--check');

const md5 = (path) => createHash('md5').update(readFileSync(path)).digest('hex').slice(0, 8);
const LINE = /^(V[123]) [A-Za-z ]+: (PASS|FAIL|PENDING)(?: \(round (\d+)\))?((?: (?:en|ur):[0-9a-f]{8})*)\s*$/;
const READS = { V1: ['en'], V2: ['en', 'ur'], V3: ['ur'] };

function passed(slug) {
  const en = join(DIR, `${slug}.md`);
  const ur = join(DIR, `${slug}.ur.md`);
  const notes = join(DIR, `${slug}.notes.md`);
  if (![en, ur, notes].every(existsSync)) return false;
  const current = { en: md5(en), ur: md5(ur) };
  const found = {};
  for (const line of readFileSync(notes, 'utf8').split('\n').slice(0, 12)) {
    const m = LINE.exec(line);
    if (!m) continue;
    const stamps = Object.fromEntries(
      m[4]
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => s.split(':')),
    );
    found[m[1]] = m[2] === 'PASS' && READS[m[1]].every((k) => stamps[k] === current[k]);
  }
  return ['V1', 'V2', 'V3'].every((v) => found[v] === true);
}

const slugs = existsSync(DIR)
  ? readdirSync(DIR)
      .filter(
        (f) =>
          f.endsWith('.md') &&
          !f.endsWith('.ur.md') &&
          !f.endsWith('.notes.md') &&
          !f.endsWith('.short.md'),
      )
      .map((f) => f.slice(0, -3))
      .sort()
  : [];

const articles = {};
const held = [];
for (const slug of slugs) {
  if (!passed(slug)) {
    held.push(slug);
    continue;
  }
  articles[slug] = {
    en: readFileSync(join(DIR, `${slug}.md`), 'utf8').trim(),
    ur: readFileSync(join(DIR, `${slug}.ur.md`), 'utf8').trim(),
  };
  if (passed(`${slug}.short`)) {
    articles[slug].short = {
      en: readFileSync(join(DIR, `${slug}.short.md`), 'utf8').trim(),
      ur: readFileSync(join(DIR, `${slug}.short.ur.md`), 'utf8').trim(),
    };
  }
}

const want = Object.fromEntries(
  Object.entries(articles).map(([slug, a]) => [`${slug}.json`, `${JSON.stringify(a, null, 1)}\n`]),
);
const have = existsSync(OUT_DIR)
  ? Object.fromEntries(
      readdirSync(OUT_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => [f, readFileSync(join(OUT_DIR, f), 'utf8')]),
    )
  : {};
const stale = [
  ...Object.keys(want).filter((f) => have[f] !== want[f]),
  ...Object.keys(have).filter((f) => !(f in want)),
];
if (check) {
  if (stale.length) {
    console.error(
      `[place-articles] src/data/place-articles/ is stale (${stale.join(', ')}): run node scripts/data/build-place-articles.mjs`,
    );
    process.exit(1);
  }
  console.log(`[place-articles] ✓ ${Object.keys(want).length} article(s) current`);
} else {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of Object.keys(have)) if (!(f in want)) rmSync(join(OUT_DIR, f));
  for (const [f, body] of Object.entries(want)) writeFileSync(join(OUT_DIR, f), body, 'utf8');
  console.log(
    `[place-articles] wrote ${Object.keys(want).length} article(s)` +
      (Object.values(articles).some((a) => a.short)
        ? ` (with a short version: ${Object.keys(articles)
            .filter((s) => articles[s].short)
            .join(', ')})`
        : '') +
      (held.length ? `; held (verdicts not all PASS on the current files): ${held.join(', ')}` : ''),
  );
}
