// @vitest-environment node
/**
 * The `figure_type` vocabulary is written down twice, so it can drift.
 *
 * `EXACT` in `figureType.ts` decides how a figure is bucketed for display;
 * `FIGURE_TYPE_ENUM` in `scripts/data/validate.mjs` decides what the validator
 * will accept without complaint. If the validator's list grows a value the app
 * does not know, the app renders it as prose and the validator says nothing —
 * which is the exact silent failure the validator was added to catch.
 *
 * The app's table is the source of truth; the script mirrors it because a build
 * script cannot import TypeScript. Same shape as the places vocabulary drift
 * guard.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { figureGroup, isProseFigureType } from '../figureType';

const ROOT = join(__dirname, '..', '..', '..', '..');
const validator = readFileSync(join(ROOT, 'scripts', 'data', 'validate.mjs'), 'utf8');

/** The literal list in the validator, read out of its source. */
const scriptVocabulary = (() => {
  const block = /const FIGURE_TYPE_ENUM = new Set\(\[([\s\S]*?)\]\);/.exec(validator);
  if (!block) return null;
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
})();

/* The app's side, probed through its public function rather than by reaching for
   a private const: a value the app buckets to anything but `other` is one it
   knows. */
const APP_KNOWN = [
  'Sufi saint',
  'Deity',
  'Sikh Guru',
  'Sant',
  'Historical person',
  'Individual',
  'Collective',
];

describe('the figure_type vocabulary', () => {
  it('is still declared in the validator', () => {
    expect(scriptVocabulary, 'FIGURE_TYPE_ENUM was renamed or removed').not.toBeNull();
  });

  it('agrees between the app and the validator', () => {
    expect(scriptVocabulary).toEqual([...APP_KNOWN].sort());
  });

  it('is exactly the set the app buckets, so the mirror above is not a guess', () => {
    for (const value of APP_KNOWN) {
      expect(figureGroup(value), value).not.toBe('other');
      expect(isProseFigureType(value), value).toBe(false);
    }
  });

  it('treats a near-miss as prose, which is why the validator has to warn', () => {
    /* The failure the guard exists for: a capital S drops the figure out of
       every Sufi-saint count and renders as a one-word "sentence". The app
       cannot tell the difference — only the validator can. */
    expect(figureGroup('Sufi Saint')).toBe('other');
    expect(isProseFigureType('Sufi Saint')).toBe(true);
  });
});
