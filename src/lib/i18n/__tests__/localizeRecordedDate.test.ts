// @vitest-environment node
/**
 * A recorded date must read in Urdu, and must never be guessed at.
 *
 * The two failure modes are opposite and both are asserted, because passing one
 * is easy while passing both is the actual requirement:
 *
 * - **Half-translated.** "۱۱ Rabīʿ al-Sānī ۷۲۹ AH" — Eastern digits around a
 *   Latin month, which is what the Urdu view showed. Worse than either language
 *   alone.
 * - **Confidently wrong.** `Rabi` matched loosely maps `Rabi al-Awwal` and
 *   `Rabi al-Thani` to the same month, a five-week error in a death date; and a
 *   month word substituted inside English prose ("Muharram observances") is this
 *   file reaching into a sentence it has no business editing.
 *
 * The shipped data is asserted against directly at the end, so the variant table
 * is measured against real strings rather than against the ones I thought of.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localizeRecordedDate, hasLatin } from '../localizeRecordedDate';
import { HIJRI_MONTH_NAMES_UR } from '../../data/ursDates';

describe('English is left alone', () => {
  it('returns the input untouched', () => {
    expect(localizeRecordedDate('11 Rabīʿ al-Sānī 729 AH', 'en')).toBe('11 Rabīʿ al-Sānī 729 AH');
  });

  it('handles nothing recorded', () => {
    expect(localizeRecordedDate(undefined, 'ur')).toBe('');
    expect(localizeRecordedDate(null, 'ur')).toBe('');
    expect(localizeRecordedDate('', 'ur')).toBe('');
  });
});

describe('a recorded Hijri date reads in Urdu', () => {
  it('translates the month and the era, keeping the day and year as recorded', () => {
    expect(localizeRecordedDate('11 Rabīʿ al-Sānī 729 AH', 'ur')).toBe('11 ربیع الثانی 729 ہجری');
  });

  it('reads every spelling the data actually uses', () => {
    /* Each of these is a string from data/kg.json or the shipped snapshot. The
       point is the spellings, which are not consistent and are not going to be:
       they are what different sources wrote. */
    expect(localizeRecordedDate('16 Rabi ul Awal 1024 Hijri', 'ur')).toBe(
      '16 ربیع الاول 1024 ہجری',
    );
    expect(localizeRecordedDate('10 Zil Hajj 960 AH', 'ur')).toBe('10 ذی الحجہ 960 ہجری');
    expect(localizeRecordedDate('21 Ramzan 825 AH', 'ur')).toBe('21 رمضان 825 ہجری');
    expect(localizeRecordedDate('25 Rabīʿ al-Thānī', 'ur')).toBe('25 ربیع الثانی');
    expect(localizeRecordedDate('Annual urs (18-20 Safar)', 'ur')).toBe('Annual urs (18-20 صفر)');
  });

  it('never conflates the two Rabiʿ months', () => {
    /* The reason `Rabi` alone is not in the variant table. Five weeks apart. */
    const first = localizeRecordedDate('16 Rabi ul Awal 1024 AH', 'ur');
    const second = localizeRecordedDate('16 Rabi al-Thani 1024 AH', 'ur');
    expect(first).toContain(HIJRI_MONTH_NAMES_UR[2]);
    expect(second).toContain(HIJRI_MONTH_NAMES_UR[3]);
    expect(first).not.toBe(second);
  });

  it('translates a bare year with an era marker', () => {
    expect(localizeRecordedDate('1045 AH', 'ur')).toBe('1045 ہجری');
    expect(localizeRecordedDate('1635 (1045 AH)', 'ur')).toBe('1635 (1045 ہجری)');
    expect(localizeRecordedDate('1585 CE (993 AH)', 'ur')).toBe('1585 عیسوی (993 ہجری)');
  });

  it('translates a Gregorian month too, since the archive records both calendars', () => {
    /* Often in one field: "8 Muharram 1040 AH / 8 August 1630 CE" would
       otherwise be half Urdu down the middle of a slash. */
    expect(localizeRecordedDate('4 December 1908, Lahore', 'ur')).toBe('4 دسمبر 1908, Lahore');
    expect(localizeRecordedDate('8 Muharram 1040 AH / 8 August 1630 CE', 'ur')).toBe(
      '8 محرم 1040 ہجری / 8 اگست 1630 عیسوی',
    );
  });

  it('does not reorder a month-first date', () => {
    /* "November 27, 1981" stays month-first. Urdu would normally write the day
       first, and moving it would be this function deciding word order — the one
       thing the substitution rule is allowed to avoid precisely because it never
       does it. Faithful to the recorded order (RULE 2). */
    expect(localizeRecordedDate('November 27, 1981 (Friday)', 'ur')).toBe(
      'نومبر 27, 1981 (Friday)',
    );
  });

  it('leaves a month word that is also an English verb alone in prose', () => {
    /* `May` and `March` are the risky pair. Matching is case-sensitive and needs
       a date context, so neither reaches a sentence. */
    const prose = 'the procession may pass; devotees march to the darbar';
    expect(localizeRecordedDate(prose, 'ur')).toBe(prose);
  });

  it('translates a month standing alone in parentheses', () => {
    expect(localizeRecordedDate("Annual urs (Sha'ban)", 'ur')).toBe('Annual urs (شعبان)');
  });

  it('translates a month named before its year rather than after its day', () => {
    /* "the first of Ramazan in 1575" — a real disputed-date value. The year is
       two words away, which none of the other three shapes covers. */
    expect(localizeRecordedDate('the first of Ramazan in 1575', 'ur')).toBe(
      'the first of رمضان in 1575',
    );
  });

  it('translates “the month of Rajab”', () => {
    expect(localizeRecordedDate('the month of Rajab, 1119 AH', 'ur')).toBe(
      'the month of رجب, 1119 ہجری',
    );
  });

  it('leaves the prose around a date exactly as recorded', () => {
    /* RULE 2: the qualification is the most honest part of the field, and this
       function has no business paraphrasing it. */
    const out = localizeRecordedDate(
      '10 Zil Hajj 960 AH, Kirman, Iran (as related in the survey)',
      'ur',
    );
    expect(out).toBe('10 ذی الحجہ 960 ہجری, Kirman, Iran (as related in the survey)');
    expect(hasLatin(out)).toBe(true);
  });
});

describe('it does not reach into a sentence', () => {
  it('leaves a month word in English prose alone', () => {
    const prose = 'Annual urs; Muharram observances (peak attendance)';
    expect(localizeRecordedDate(prose, 'ur')).toBe(prose);
  });

  it('leaves “during Ramadan” alone', () => {
    const prose = 'The langar runs through the day during Ramadan and on Thursdays.';
    expect(localizeRecordedDate(prose, 'ur')).toBe(prose);
  });

  it('leaves a bare era-looking word in prose alone', () => {
    /* "AD" is an initialism in plenty of sentences, and `CE` is anything at all.
       Without a number or a month in front, neither is a calendar marker. */
    const prose = 'Recorded by the AD committee, per the custodian.';
    expect(localizeRecordedDate(prose, 'ur')).toBe(prose);
  });

  it('does not translate a month that is part of a longer word', () => {
    expect(localizeRecordedDate('12 Safarnama 900 AH', 'ur')).toContain('Safarnama');
  });
});

describe('the shipped data', () => {
  const ROOT = join(__dirname, '..', '..', '..', '..');
  const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));

  const recorded: string[] = [];
  for (const saint of kg.saints as Record<string, string>[]) {
    for (const field of ['born', 'died', 'era']) {
      if (saint[field]) recorded.push(saint[field]);
    }
  }

  it('has recorded dates to translate', () => {
    expect(recorded.length).toBeGreaterThan(100);
  });

  it('leaves no Latin Hijri month in any figure’s recorded dates', () => {
    /* The measurement this whole module exists for. If a future sheet edit
       introduces a spelling the table does not carry, this names it. */
    const MONTH_WORDS =
      /(?<![A-Za-z])(Muharram|Safar|Rabi|Rabī|Jumada|Rajab|Sha[ʿʻ']?ban|Ramadan|Ramadhan|Ramazan|Ramzan|Shawwal|Zil|Zul|Dhu)(?![A-Za-z])/;
    const missed = recorded
      .map((value) => localizeRecordedDate(value, 'ur'))
      .filter((value) => MONTH_WORDS.test(value));
    expect(missed, 'an untranslated Hijri month spelling reached the Urdu view').toEqual([]);
  });

  it('changes nothing that has no month and no era marker', () => {
    /* Most recorded dates are a bare Gregorian year. Touching one of those would
       mean this function is matching something it should not. */
    const plain = recorded.filter((v) => /^\s*c?\.?\s*\d{3,4}\s*$/.test(v));
    expect(plain.length).toBeGreaterThan(20);
    for (const value of plain) expect(localizeRecordedDate(value, 'ur')).toBe(value);
  });
});
