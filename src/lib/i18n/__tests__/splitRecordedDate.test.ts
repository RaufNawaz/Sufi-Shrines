import { describe, it, expect } from 'vitest';
import { splitRecordedDate, isDateOnly, localizeDatePart } from '../splitRecordedDate';

/* Every shape below is a real `figure_born` / `figure_died` cell from the live
   sheet of 29 October 2026, the measurement this helper was written against. */
describe('splitRecordedDate', () => {
  const cases: [string, string, string, string][] = [
    // [recorded, approx, date, qualification]
    [
      'c. 1643 (existing sourcing); a 2026 field survey separately gives 1056 AH (~1646 CE) -- the two are consistent',
      'c. ',
      '1643',
      '(existing sourcing); a 2026 field survey separately gives 1056 AH (~1646 CE) -- the two are consistent',
    ],
    [
      '10 Zil Hajj 960 AH, Kirman, Iran (as related in the survey)',
      '',
      '10 Zil Hajj 960 AH',
      'Kirman, Iran (as related in the survey)',
    ],
    [
      '1341 AH (c. 1922–23 CE by calendar conversion), Malerkotla, India',
      '',
      '1341 AH',
      '(c. 1922–23 CE by calendar conversion), Malerkotla, India',
    ],
    [
      '31 October 1929 (executed at Mianwali Jail)',
      '',
      '31 October 1929',
      '(executed at Mianwali Jail)',
    ],
    ['November 27, 1981 (Friday)', '', 'November 27, 1981', '(Friday)'],
    ['8 Muharram 1040 AH / 8 August 1630 CE', '', '8 Muharram 1040 AH / 8 August 1630 CE', ''],
    [
      '8 August 1041, as given in the account; calendar era unstated',
      '',
      '8 August 1041',
      'as given in the account; calendar era unstated',
    ],
    [
      '25 Rabīʿ al-Thānī; year not stated in the survey (possibly 1416 AH — see year_built_note)',
      '',
      '25 Rabīʿ al-Thānī',
      'year not stated in the survey (possibly 1416 AH — see year_built_note)',
    ],
    ['4 December 1908, Lahore', '', '4 December 1908', 'Lahore'],
    ['1576 CE, Lahore', '', '1576 CE', 'Lahore'],
    ['c. 1728', 'c. ', '1728', ''],
    ['1630 CE (8 Muharram 1040 AH)', '', '1630 CE (8 Muharram 1040 AH)', ''],
    ['28 Shaban 1044 AH, aged seventy', '', '28 Shaban 1044 AH', 'aged seventy'],
  ];

  it.each(cases)('%s', (recorded, approx, date, qualification) => {
    expect(splitRecordedDate(recorded)).toEqual({ approx, date, qualification });
  });

  it('finds no date in a cell that is a sentence, and keeps every word as the qualification', () => {
    const recorded = 'Not given. The only early date is "educated in Georgia in 993 AD" (Q9).';
    expect(splitRecordedDate(recorded)).toEqual({ approx: '', date: '', qualification: recorded });
    expect(splitRecordedDate('"in the year one thousand and five"').date).toBe('');
  });

  it('keeps a date whose month spelling the Urdu table does not know', () => {
    expect(splitRecordedDate('25 Rabī‘ al-Thānī').date).toBe('25 Rabī‘ al-Thānī');
    expect(splitRecordedDate('Thursday 21 Jumada al-Thani 1155 AH').date).toBe(
      'Thursday 21 Jumada al-Thani 1155 AH',
    );
  });

  it('does not take a sentence fragment for a date', () => {
    expect(splitRecordedDate("1166 AH in the text, 1162 AH in the editor's source").date).toBe('');
  });

  it('is empty for an empty cell', () => {
    expect(splitRecordedDate('')).toEqual({ approx: '', date: '', qualification: '' });
  });
});

describe('isDateOnly', () => {
  it('accepts dates in either calendar and rejects prose', () => {
    expect(isDateOnly('16 Rabi ul Awal 1024 AH')).toBe(true);
    expect(isDateOnly('681 CE / c. 63 AH')).toBe(true);
    expect(isDateOnly('Friday')).toBe(false);
    expect(isDateOnly('executed at Mianwali Jail')).toBe(false);
  });
});

describe('localizeDatePart', () => {
  it('reads months, calendar markers and an inner circa in Urdu, and leaves English alone', () => {
    expect(localizeDatePart('681 CE / c. 63 AH', 'ur', 'تقریباً')).toBe(
      '681 عیسوی / تقریباً 63 ہجری',
    );
    expect(localizeDatePart('1341 AH', 'ur', 'تقریباً')).toBe('1341 ہجری');
    expect(localizeDatePart('681 CE / c. 63 AH', 'en', 'circa')).toBe('681 CE / c. 63 AH');
  });
});

describe('splitRecordedDate — the OCR doubt mark', () => {
  it('keeps the date around an [OCR?] mark and hands the mark to the team', () => {
    expect(splitRecordedDate('۹۷۲ [OCR?] AH')).toEqual({
      approx: '',
      date: '۹۷۲ AH',
      qualification: '[OCR?]',
    });
    expect(
      splitRecordedDate('1241 AH [OCR?] (the numeral repeated in the margin as ۱۲۴۱)'),
    ).toEqual({
      approx: '',
      date: '1241 AH',
      qualification: '[OCR?] (the numeral repeated in the margin as ۱۲۴۱)',
    });
  });
  it('reads the Zi al-Hijja spelling the tazkirah rows use as a month', () => {
    expect(splitRecordedDate('23 Zi al-Hijja 684 AH — four death years are in play').date).toBe(
      '23 Zi al-Hijja 684 AH',
    );
  });
});
