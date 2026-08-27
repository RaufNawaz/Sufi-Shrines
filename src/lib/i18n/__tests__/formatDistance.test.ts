/**
 * A distance, in the reader's units, as a whole phrase.
 *
 * Two things are under test and the second is the one that had a bug.
 *
 * **The conversion**, which is arithmetic and easy.
 *
 * **The phrase**, which is not. Six call sites used to print
 * `{fmtNum(round(km))} {t('distanceKm')}` — a number, a space, and the fragment
 * "km away" — the construction `noSentenceFragments.test.ts` exists to prevent,
 * because the *component* is deciding the word order. Urdu happens to put the
 * unit in the same place, which is why it survived unnoticed; a language that
 * does not would have had no way to say so.
 *
 * The bug: `miles` inflects and `km` does not, so the first version rendered
 * "1 miles away". The value reaching the string is already localized — it can be
 * "۱", "0.1" or "< 1" — so a plural rule would have to parse Eastern digits to
 * choose between "mile" and "miles". `mi` does not inflect, and /settings spells
 * out "Miles" beside the option so the abbreviation is introduced first.
 */
import { describe, it, expect } from 'vitest';
import { formatDistance } from '../formatDistance';

const plain = (n: number | string) => String(n);
const eastern = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

describe('formatDistance', () => {
  it('prints kilometres unconverted', () => {
    expect(formatDistance(3.4, 'km', 'en', plain, { style: 'away' })).toBe('3 km away');
    expect(formatDistance(12, 'km', 'en', plain, { style: 'bare' })).toBe('12 km');
  });

  it('converts to miles', () => {
    // 10 km = 6.21 mi
    expect(formatDistance(10, 'mi', 'en', plain, { style: 'away' })).toBe('6 mi away');
    expect(formatDistance(100, 'mi', 'en', plain, { style: 'bare' })).toBe('62 mi');
  });

  it('never inflects the unit, so a single unit reads correctly', () => {
    /* The bug: "1 miles away". */
    const oneMile = 1 / 0.621371;
    expect(formatDistance(oneMile, 'mi', 'en', plain, { style: 'away' })).toBe('1 mi away');
    expect(formatDistance(1, 'km', 'en', plain, { style: 'away' })).toBe('1 km away');
  });

  it('keeps one decimal where the call site asks for it', () => {
    /* Nearby mosques: several stand inside the same complex, so a tenth is the
       difference between "in the courtyard" and "across the road". */
    expect(formatDistance(1.24, 'km', 'en', plain, { style: 'away', decimals: 1 })).toBe(
      '1.2 km away',
    );
  });

  describe('under one unit', () => {
    it('reads in metres for a metric reader, which is what shared ground is about', () => {
      /* SHARED_GROUND_VISION is built on "within 800 m of another site" — the
         unit is part of the argument, not a display choice. */
      expect(formatDistance(0.222, 'km', 'en', plain, { style: 'away', below: 'metres' })).toBe(
        '222 m away',
      );
    });

    it('falls back to a decimal for miles rather than inventing yards', () => {
      /* Feet and yards would be a third and fourth unit for the sake of one
         row. A tenth of a mile is the same information in the unit asked for. */
      expect(formatDistance(0.222, 'mi', 'en', plain, { style: 'away', below: 'metres' })).toBe(
        '0.1 mi away',
      );
    });

    it('says "< 1" where zero would be a lie', () => {
      /* A site 400 m away is not zero away, and rounding says it is. */
      expect(formatDistance(0.4, 'km', 'en', plain, { style: 'away', below: 'lessThanOne' })).toBe(
        '< 1 km away',
      );
    });

    it('rounds normally when the call site asks for nothing special', () => {
      /* The tour legs: a driving estimate with a decimal claims a precision the
         average-speed model does not have. */
      expect(formatDistance(0.4, 'km', 'en', plain, { style: 'bare' })).toBe('0 km');
    });
  });

  it('puts the localized digits inside the phrase, not around it', () => {
    expect(formatDistance(3, 'km', 'ur', eastern, { style: 'away' })).toContain('۳');
    expect(formatDistance(3, 'km', 'ur', eastern, { style: 'away' })).not.toContain('3');
  });

  it('asks each language for the whole phrase rather than assembling one', () => {
    /* The assertion is that Urdu is not English word order with a substituted
       noun: the Urdu phrase is the Urdu table's own, so it can place the unit
       wherever Urdu places it. Here they agree, and the point is that they are
       free not to. */
    const ur = formatDistance(3, 'km', 'ur', eastern, { style: 'away' });
    expect(ur).not.toContain('away');
    expect(ur.length).toBeGreaterThan(2);
  });
});
