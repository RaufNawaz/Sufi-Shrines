#!/usr/bin/env node
/**
 * check-no-lookbehind.mjs — fails the build if any shipped JavaScript contains
 * a regular-expression lookbehind, `(?<=` or `(?<!`.
 *
 * Why this exists: Safari before 16.4 does not support lookbehind, and it does
 * not fail politely. A lookbehind in a regex literal is a SyntaxError when the
 * chunk is *parsed*; one built with `new RegExp` at module scope throws when it
 * is evaluated. Either way the whole chunk is lost. On 25 October 2026 a
 * lookbehind in `localizeRecordedDate.ts` took down every /saint/ page on
 * iOS 15 and 16.0–16.3, and nothing in the Chromium-only e2e suite could see it.
 * Vite's default target does not rewrite lookbehind, and nothing polyfills it.
 *
 * Use a captured leading group instead: `(^|[^A-Za-z])(word)` and add the
 * group's length to the match offset.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// An optional argument names another build's output directory (default: dist).
const ASSETS = join(process.argv[2] ?? join(ROOT, 'dist'), 'assets');

if (!existsSync(ASSETS)) {
  console.error('check-no-lookbehind: dist/assets not found — run the vite build first.');
  process.exit(1);
}

const offenders = [];
for (const file of readdirSync(ASSETS)) {
  if (!file.endsWith('.js')) continue;
  const text = readFileSync(join(ASSETS, file), 'utf8');
  const re = /\(\?<[=!]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    offenders.push(`${file}: …${text.slice(Math.max(0, m.index - 40), m.index + 40)}…`);
  }
}

if (offenders.length) {
  console.error(
    `check-no-lookbehind: ${offenders.length} regex lookbehind(s) in the build. Safari < 16.4 ` +
      'cannot parse them and drops the whole chunk:',
  );
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}
console.log('check-no-lookbehind: no lookbehind in dist/assets.');
