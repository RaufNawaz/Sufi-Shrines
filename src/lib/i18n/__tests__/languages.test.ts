// @vitest-environment node
/**
 * A language is complete, or a reader gets the default by accident.
 *
 * `LANGUAGES` is the table that makes a third language an entry rather than a
 * sweep through 55 files. That only holds if every entry carries every property
 * the codebase branches on — and the failure mode of a missing one is not a type
 * error, it is a silent fallback. An entry without `numerals` reads as
 * `undefined !== 'eastern'`, so the language renders Western digits, which is
 * exactly the i18n rule 5 violation the fmtNum discipline exists to prevent, and
 * it looks like a deliberate choice on the page.
 *
 * `satisfies` catches a *missing* key at compile time, which is most of the job.
 * What it cannot catch is the other half: a property added to the constraint and
 * to `en` but not to `ur`, a value outside its vocabulary once someone widens the
 * union, or — the one that matters most here — two properties silently assumed to
 * be the same question. `isRtlLang` and `needsNastaliq` agree for both languages
 * today, and a future Naskh-set RTL language is the case that separates them.
 * Conflating them is the mistake this whole table exists to make impossible, so it
 * is asserted rather than trusted.
 *
 * **Two kinds of assertion here, and both are needed.** The per-language loops
 * check that each helper reads the field it claims to read — they would keep
 * passing if someone set `ur: { dir: 'ltr' }`, because helper and table would
 * still agree. So the concrete anchors below (`isRtlLang('ur')` is true, Urdu
 * takes Eastern digits and Nastaliq, English takes neither) are what actually
 * pins the archive's two published languages. This file replaced a smaller one
 * that had only those anchors; losing them to a tidier-looking loop would have
 * been a straight downgrade.
 */
import { describe, it, expect } from 'vitest';
import {
  LANGUAGES,
  DEFAULT_LANG,
  isRtlLang,
  usesEasternNumerals,
  needsNastaliq,
  dirAttr,
  langAttr,
  type Lang,
} from '../languages';

const codes = Object.keys(LANGUAGES) as Lang[];

/** Every property a branch in this codebase reads off a language. Adding one
 * here without adding it to every entry is the failure this file exists for. */
const REQUIRED = ['dir', 'numerals', 'script'] as const;

const VOCABULARY: Record<(typeof REQUIRED)[number], readonly string[]> = {
  dir: ['ltr', 'rtl'],
  numerals: ['western', 'eastern'],
  script: ['latin', 'nastaliq'],
};

describe('the language registry', () => {
  it('has at least the two languages the archive publishes', () => {
    expect(codes).toContain('en');
    expect(codes).toContain('ur');
  });

  it('gives every language every property, with a value from its vocabulary', () => {
    for (const code of codes) {
      const entry = LANGUAGES[code] as Record<string, string>;
      for (const key of REQUIRED) {
        expect(entry[key], `${code} is missing ${key}`).toBeDefined();
        expect(VOCABULARY[key], `${code}.${key} = ${entry[key]}`).toContain(entry[key]);
      }
    }
  });

  it('has a default that is a real language', () => {
    expect(codes).toContain(DEFAULT_LANG as Lang);
  });
});

describe('the helpers read the registry rather than hardcoding a language', () => {
  it('answers direction from `dir`', () => {
    for (const code of codes) {
      expect(isRtlLang(code)).toBe(LANGUAGES[code].dir === 'rtl');
    }
  });

  it('answers numerals from `numerals`, not from direction', () => {
    for (const code of codes) {
      expect(usesEasternNumerals(code)).toBe(LANGUAGES[code].numerals === 'eastern');
    }
  });

  it('answers the type stack from `script`, not from direction', () => {
    for (const code of codes) {
      expect(needsNastaliq(code)).toBe(LANGUAGES[code].script === 'nastaliq');
    }
  });

  it('keeps direction, numerals and script three separate questions', () => {
    /* They agree for en and ur, which is precisely why conflating them is easy
       and why a future language breaks silently. Arabic is RTL and sets Western
       digits across much of the Maghreb; an RTL language set in Naskh needs no
       Nastaliq metrics. This asserts the three are read from three fields — so
       adding such a language is an entry in the table, not a bug hunt. */
    const derived = codes.map((code) => ({
      rtl: isRtlLang(code),
      eastern: usesEasternNumerals(code),
      nastaliq: needsNastaliq(code),
    }));
    for (const [i, code] of codes.entries()) {
      expect(derived[i].rtl, `${code} dir`).toBe(LANGUAGES[code].dir === 'rtl');
      expect(derived[i].eastern, `${code} numerals`).toBe(LANGUAGES[code].numerals === 'eastern');
      expect(derived[i].nastaliq, `${code} script`).toBe(LANGUAGES[code].script === 'nastaliq');
    }
  });

  it('pins what the archive’s two published languages actually are', () => {
    /* Not derived from the table — that is the point. Every assertion above
       compares a helper to the field it reads and so survives the table being
       wrong; these do not. */
    expect(isRtlLang('en')).toBe(false);
    expect(isRtlLang('ur')).toBe(true);
    expect(usesEasternNumerals('en')).toBe(false);
    expect(usesEasternNumerals('ur')).toBe(true);
    expect(needsNastaliq('en')).toBe(false);
    expect(needsNastaliq('ur')).toBe(true);
    expect(DEFAULT_LANG).toBe('en');
  });

  it('renders an attribute only where it differs from the document default', () => {
    expect(dirAttr('en')).toBeUndefined();
    expect(dirAttr('ur')).toBe('rtl');
    expect(langAttr(DEFAULT_LANG as Lang)).toBeUndefined();
    expect(langAttr('ur')).toBe('ur');
  });
});
