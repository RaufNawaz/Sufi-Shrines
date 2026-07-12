#!/usr/bin/env node
/**
 * validate-urdu-leak.mjs — asserts src/data/urdu-content.json has zero
 * Latin-script leaks. Part of M4's release gate (docs/planning/EXECUTION_PLAN.md): the
 * long-form Urdu translation content shouldn't ship with raw English hiding
 * in it. Stricter than urdu-i18n/build_urdu_content.py's own check (which
 * tolerates English inside a Bibliography heading) — this project's
 * convention is to omit Bibliography sections from Urdu content entirely,
 * so zero Latin letters anywhere is the bar.
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
    const matches = String(text).match(LATIN);
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

console.log(`[validate-urdu-leak] ✓ ${slugs.length} Urdu content entries — zero Latin-script leaks`);
