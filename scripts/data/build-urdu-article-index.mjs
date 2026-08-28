#!/usr/bin/env node
/**
 * build-urdu-article-index.mjs — the list of entries that have an Urdu article,
 * in a form an English reader can afford to download.
 *
 * WHAT PROBLEM THIS SOLVES. `/about` reports "entries with a full Urdu article"
 * and computed it from the row, via `getUrduFieldValue(row, 'Description')`.
 * That field is populated by `src/data/urdu-content.json`, which is
 * **language-gated**: `LanguageContext` requests the 253 KB payload only when
 * `lang === 'ur'`, because no English surface reads a word of it. And **no row
 * in the sheet carries a `Description Urdu` column** — all 168 Urdu articles
 * live in that file. So the page that exists precisely so the archive's figures
 * cannot go stale told an English reader:
 *
 *     entries with a full Urdu article    0 · 0%
 *
 * and the same page in Urdu, from the same dataset, ۱۶۸ · ۹۸٪. Measured on the
 * dev server, 28 August 2026. The count was not stale; it was a *function of
 * which language was asking*, which is worse, because both numbers render with
 * the same confidence.
 *
 * WHY A LIST OF SLUGS AND NOT A COUNT. A count would be smaller and wrong the
 * first time an entry leaves the sheet: it would keep counting an Urdu article
 * for a row that no longer exists, and `/about` prints it as a fraction of
 * `totalShrines`, so the ratio would drift above what the dataset can support.
 * The slugs intersect with the rows actually loaded, so the figure follows the
 * sheet the way every other figure on that page does. 168 slugs is ~4 KB, it
 * lands in the `/about` chunk (nothing else imports `archiveReport`), and that
 * route has 22 KB of headroom in `scripts/check-bundle-budget.mjs`.
 *
 * KEYED BY THE NAME-ONLY STABLE SLUG, because that is the key
 * `mergeUrduContent` already joins on (`buildStableSlug(row.Name)`), so this
 * index and the payload agree by construction rather than by convention.
 *
 * THE GATE. `--check` fails when the index disagrees with
 * `src/data/urdu-content.json` — an article added or removed by the Urdu
 * pipeline without regenerating this file. Wired into `npm run data:validate`
 * beside the other `--check` builders.
 *
 * Usage:  node scripts/data/build-urdu-article-index.mjs [--check]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const URDU_CONTENT = join(ROOT, 'src', 'data', 'urdu-content.json');
const OUT = join(ROOT, 'src', 'data', 'urdu-article-index.json');

/**
 * The slugs whose entry carries a *full article body*, not merely a row.
 *
 * `descriptionUr` is the exact field `getUrduFieldValue(row, 'Description')`
 * resolves to once `mergeUrduContent` has run, so counting anything else here
 * would make the two disagree the moment an entry gains a section without a
 * lead — which is the state four entries were in before the August passes.
 */
function build() {
  const content = JSON.parse(readFileSync(URDU_CONTENT, 'utf8'));
  return Object.keys(content)
    .filter((slug) => String(content[slug]?.descriptionUr ?? '').trim())
    .sort();
}

function main() {
  const check = process.argv.includes('--check');
  const slugs = build();

  if (check) {
    if (!existsSync(OUT)) {
      console.error(
        'urdu-article-index.json is missing. Run: node scripts/data/build-urdu-article-index.mjs',
      );
      process.exit(1);
    }
    const current = JSON.parse(readFileSync(OUT, 'utf8'));
    if (JSON.stringify(current.slugs) !== JSON.stringify(slugs)) {
      const currentSet = new Set(current.slugs ?? []);
      const builtSet = new Set(slugs);
      const added = slugs.filter((s) => !currentSet.has(s));
      const removed = (current.slugs ?? []).filter((s) => !builtSet.has(s));
      console.error(
        'urdu-article-index.json is out of date with src/data/urdu-content.json.\n' +
          `  ${added.length} article(s) added, ${removed.length} removed.\n` +
          '  Run: node scripts/data/build-urdu-article-index.mjs',
      );
      for (const s of [...added.slice(0, 5), ...removed.slice(0, 5)]) console.error(`    ${s}`);
      process.exit(1);
    }
    console.log(`urdu-article-index: ${slugs.length} entries with an Urdu article — ok`);
    return;
  }

  /* One slug per line: the file is read by humans exactly once — when the
     number on /about moves and somebody wants to know which entry moved it —
     and a diff of one slug per line answers that without a tool. */
  const body = [
    '{',
    '  "source": "src/data/urdu-content.json",',
    '  "slugs": [',
    slugs.map((s) => `    ${JSON.stringify(s)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
  writeFileSync(OUT, body);
  console.log(`Wrote ${OUT}\n  ${slugs.length} entries carry a full Urdu article`);
}

main();
