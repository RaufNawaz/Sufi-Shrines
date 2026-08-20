#!/usr/bin/env node
/**
 * validate-urdu-leak.mjs — asserts src/data/urdu-content.json has no
 * Latin-script English in its *prose*. Part of M4's release gate
 * (docs/planning/EXECUTION_PLAN.md): the long-form Urdu translation content
 * shouldn't ship with raw English hiding in it.
 *
 * Citations are exempt (decided 20 August 2026). This gate previously required
 * zero Latin letters *anywhere*, which had two bad consequences and no good
 * one:
 *   - A source whose title is a URL could not be cited at all, so citations
 *     were being dropped or paraphrased into unsearchable Urdu — the opposite
 *     of what an archive built on provenance wants. It also contradicted
 *     CLAUDE.md i18n rule 6, which exempts URLs from the no-English rule.
 *   - Latin-titled books and articles had to be rendered in Urdu script, which
 *     loses the exact search string a reader needs to find the source.
 * So Latin is now allowed from a bibliography heading onward, matching
 * urdu-i18n/build_urdu_content.py, and still forbidden in the article body —
 * which is where an untranslated sentence would actually be a defect.
 *
 * Usage:  node scripts/data/validate-urdu-leak.mjs
 * Or:     npm run data:validate:urdu-leak
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const URDU_CONTENT_JSON = join(ROOT, 'src', 'data', 'urdu-content.json');

const LATIN = /[A-Za-z]{2,}/g;

/** Urdu bibliography headings. Everything from the first one onward is a
 * citation block, where Latin is expected: a title, a publisher, a URL. Kept
 * in sync with BIBLIO_HEADINGS in urdu-i18n/build_urdu_content.py and
 * pipeline/urdu_content_qa.py. */
const BIBLIO_HEADINGS = ['## کتابیات', '## حوالہ جات', '## حوالے'];

/** The article body — everything before the bibliography. Latin here is a
 * genuine leak: a sentence that never got translated. */
function proseOf(text) {
  let cut = text.length;
  for (const heading of BIBLIO_HEADINGS) {
    const i = text.indexOf(heading);
    if (i !== -1 && i < cut) cut = i;
  }
  return text.slice(0, cut);
}

if (!existsSync(URDU_CONTENT_JSON)) {
  console.error(`[validate-urdu-leak] ${URDU_CONTENT_JSON} not found.`);
  process.exit(1);
}

const content = JSON.parse(readFileSync(URDU_CONTENT_JSON, 'utf8'));
const slugs = Object.keys(content);

const failures = [];

for (const slug of slugs) {
  const entry = content[slug];
  const fields = { descriptionUr: entry.descriptionUr, ...(entry.sectionsUr ?? {}) };
  for (const [field, text] of Object.entries(fields)) {
    if (!text) continue;
    const matches = proseOf(String(text)).match(LATIN);
    if (matches) {
      failures.push({ slug, field, leaks: [...new Set(matches)].slice(0, 5) });
    }
  }
}

if (failures.length) {
  console.error(`\n[validate-urdu-leak] ${failures.length} entrie(s) with Latin-script leaks:`);
  failures.forEach((f) => console.error(`  ✗  ${f.slug}.${f.field}: ${f.leaks.join(', ')}`));
  process.exit(1);
}

console.log(
  `[validate-urdu-leak] ✓ ${slugs.length} Urdu content entries — no Latin-script English in prose ` +
    `(citations exempt from the first bibliography heading onward)`,
);
