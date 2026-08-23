// @vitest-environment node
/**
 * Every custom property a stylesheet reads must be one that exists (RULE 4).
 *
 * A `var(--nope)` is not an error anywhere in the pipeline. The declaration is
 * dropped silently, the element keeps whatever it inherited, and the page looks
 * *nearly* right — which is how it survives review. Written because the tour
 * panel's chips were reported as "ugly" and the cause turned out to be
 * mechanical: `tours.css` painted them with `var(--color-surface)` and rounded
 * them with `var(--radius-pill)`, and this palette defines neither
 * (`--color-bg-surface`, `--radius-full`). Three chips and three radii, all
 * quietly unstyled.
 *
 * The same sweep found `--radius-xs` in map.css, `--color-bg-subtle` in kg.css,
 * and `--ease-out` in a rule I had written an hour earlier. Six live references
 * to four properties that never existed.
 *
 * A fallback (`var(--x, 8px)`) does not make it fine. It makes the second value
 * a silent second source of truth: the fallback keeps working while the palette
 * moves on around it, and nobody discovers the divergence because nothing looks
 * broken. So a fallback is allowed only for a property something *sets at
 * runtime*, and those are listed by name below.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');

/**
 * Properties set from JavaScript rather than declared in a stylesheet, with the
 * one place that sets each. A fallback is not just allowed for these, it is
 * required — the CSS has to work before the JS runs.
 */
const SET_AT_RUNTIME: Record<string, string> = {
  '--stagger-index': 'per-item index, set inline by list components (see motion.css)',
  '--page-min-height': 'measured viewport height, set by useViewportHeight',
};

const sheets = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((file) => ({
    file,
    // Comments first: this file's own prose names the very properties it is
    // looking for, and three checks in this repo have scraped their own text.
    css: readFileSync(join(STYLES, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
  }));

const declared = new Set<string>();
for (const { css } of sheets) {
  for (const match of css.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)) declared.add(match[1]);
}

interface Use {
  name: string;
  file: string;
  hasFallback: boolean;
}
const uses: Use[] = [];
for (const { file, css } of sheets) {
  for (const match of css.matchAll(/var\(\s*(--[A-Za-z0-9-]+)\s*(,)?/g)) {
    uses.push({ name: match[1], file, hasFallback: Boolean(match[2]) });
  }
}

describe('CSS custom properties', () => {
  it('found the stylesheets and their tokens', () => {
    // A pass over zero files, or a regex that stopped matching, would make
    // every assertion below vacuous.
    expect(sheets.length).toBeGreaterThanOrEqual(8);
    expect(declared.size).toBeGreaterThan(100);
    expect(uses.length).toBeGreaterThan(300);
    expect(declared.has('--color-bg-surface')).toBe(true);
  });

  it('are all defined somewhere, or declared as runtime-set', () => {
    const orphans = [
      ...new Set(
        uses
          .filter((u) => !declared.has(u.name) && !(u.name in SET_AT_RUNTIME))
          .map((u) => `${u.name} (in ${u.file})`),
      ),
    ].sort();

    expect(
      orphans,
      'These properties are read but never declared, so the declarations using them are ' +
        'dropped and the element silently keeps whatever it inherited. Point them at a real ' +
        'token, or add the property to SET_AT_RUNTIME if JavaScript sets it.',
    ).toEqual([]);
  });

  it('use a fallback only where something sets the value at runtime', () => {
    const withFallback = [
      ...new Set(
        uses.filter((u) => u.hasFallback && !(u.name in SET_AT_RUNTIME)).map((u) => u.name),
      ),
    ].sort();

    expect(
      withFallback,
      'A fallback on a declared token is a second source of truth: it keeps working while ' +
        'the palette moves on, and nothing looks broken enough to notice. Drop the fallback, ' +
        'or list the property in SET_AT_RUNTIME with what sets it.',
    ).toEqual([]);
  });

  it('has no stale entry in SET_AT_RUNTIME', () => {
    const stale = Object.keys(SET_AT_RUNTIME).filter(
      (name) => !uses.some((u) => u.name === name) || declared.has(name),
    );
    expect(
      stale,
      'Either nothing reads these any more, or they are declared in a stylesheet now.',
    ).toEqual([]);
  });
});
