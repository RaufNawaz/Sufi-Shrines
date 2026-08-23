// @vitest-environment node
/**
 * A UI string must be a whole phrase, never a grammatical fragment (RULE 4).
 *
 * The almanac's coverage line was assembled in JSX as
 *
 *     {fmtNum(dated)} {t('almanacCoverageOf')} {fmtNum(total)} {t('almanacCoverageSites')}
 *
 * with `almanacCoverageOf` = 'of' / 'میں سے'. In English that reads "32 of 169
 * sites". In Urdu the postposition takes its operands the other way round —
 * "X میں سے Y" means "Y out of X" — so the same slots produced **"169 places
 * out of 32"**. Not awkward phrasing: a false number, on a page whose entire
 * argument is that its figures are counted rather than estimated.
 *
 * The mechanism to do this properly already existed (`tFn`, where each
 * language writes the whole sentence in its own word order and interpolates
 * the numbers itself). Nothing stopped a fragment being added instead, and
 * nothing could see the result — both halves translate perfectly, and the
 * no-English-leak guard is satisfied because the Urdu is Urdu. Only the
 * *composition* is wrong, which no per-string check can catch.
 *
 * So the check is on the strings: a value that is nothing but a function word
 * is a fragment by definition, because a function word's whole job is to
 * relate the things around it — and where they go is a fact about the
 * language, not about the layout. If you need one, you need `tFn`.
 */
import { describe, it, expect } from 'vitest';
import { UI_TEXT, tFn } from '../uiStrings';

/**
 * Words that only ever glue other words together. Deliberately short: this is
 * not a style guide, it is the set of strings that cannot survive being
 * reassembled by a component in another language's word order.
 */
const FUNCTION_WORDS = new Set([
  'of',
  'in',
  'on',
  'at',
  'to',
  'from',
  'by',
  'for',
  'with',
  'and',
  'or',
  'as',
  'per',
  'via',
  'out of',
  'and the',
  'of the',
  'in the',
]);

describe('UI strings are whole phrases', () => {
  it('no English value is a bare function word', () => {
    const fragments: string[] = [];
    for (const [key, value] of Object.entries(UI_TEXT.en)) {
      if (typeof value !== 'string') continue; // tFn entries are functions
      const normalized = value.trim().toLowerCase().replace(/[:.]$/, '');
      if (FUNCTION_WORDS.has(normalized)) fragments.push(`${key}: "${value}"`);
    }
    expect(
      fragments,
      'these are sentence fragments, so the component decides the word order and Urdu gets ' +
        'English syntax. Replace with a tFn entry that lets each language write the whole ' +
        'phrase and interpolate the values itself.',
    ).toEqual([]);
  });

  it('the almanac total puts its operands where each language wants them', () => {
    // The regression this file exists for. 32 dated observances out of 169
    // sites: English leads with the part, Urdu leads with the whole.
    expect(tFn('en', 'almanacCoverageTotal', 32, 169)).toBe('32 of 169 sites');
    const ur = tFn('ur', 'almanacCoverageTotal', 32, 169);
    expect(ur).toContain('169 میں سے 32');
    // And the operands are genuinely swapped rather than coincidentally equal.
    expect(ur.indexOf('169')).toBeLessThan(ur.indexOf('32'));
  });

  it('every key exists in both languages', () => {
    // A fragment removed from one table and left in the other is how the
    // English falls back silently.
    const en = Object.keys(UI_TEXT.en).sort();
    const ur = Object.keys(UI_TEXT.ur).sort();
    expect(ur, 'the Urdu table is missing keys the English table has').toEqual(en);
  });

  it('a key is a function in both languages or a string in both', () => {
    // Half-migrating a fragment to tFn is worse than not migrating it: t()
    // returns '' for a function value, so the phrase silently vanishes in one
    // language and nothing throws.
    const mismatched: string[] = [];
    for (const key of Object.keys(UI_TEXT.en) as (keyof typeof UI_TEXT.en)[]) {
      const enKind = typeof UI_TEXT.en[key];
      const urKind = typeof UI_TEXT.ur[key];
      if (enKind !== urKind) mismatched.push(`${key}: en is ${enKind}, ur is ${urKind}`);
    }
    expect(mismatched, 't() returns an empty string for a function value').toEqual([]);
  });
});
