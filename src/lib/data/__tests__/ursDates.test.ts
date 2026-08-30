// @vitest-environment node
/**
 * The corpus below is every date-bearing `Events` string in the live sheet as
 * of 18 August 2026, verbatim. It is the whole point of the file: the parser
 * reads prose written by many hands, so the only meaningful test is the real
 * prose, and the only meaningful regression guard is that these exact strings
 * keep resolving to these exact readings.
 */
import { describe, it, expect } from 'vitest';
import { parseObservances, claimsUndatedObservance } from '../ursDates';

const only = (events: string) => {
  const parsed = parseObservances(events);
  expect(parsed.length, `expected exactly one observance from: ${events}`).toBe(1);
  return parsed[0];
};

describe('parseObservances — Hijri dates', () => {
  it.each([
    ['Annual urs (18-20 Safar); Thursday-evening qawwali and dhamal; daily langar', 2, 18, 20],
    ['Annual urs (11-12 Rabi al-Awwal); weekly Sunday milad; daily langar', 3, 11, 12],
    ['Annual urs (3-5 Rabi al-Thani); weekly Thursday-night dhamal', 4, 3, 5],
    ['Annual urs (24-26 Rajab)', 7, 24, 26],
    ["Annual urs (27-28 Sha'ban); weekly Saturday gathering; langar", 8, 27, 28],
    ['*ʿUrs*, 19–21 Ramzan, with a fair; weekly Thursday *mehfil* with *langar*,', 9, 19, 21],
    ['Mela Chiraghan / annual urs (9-11 Shawwal); Thursday-evening lamp-lighting', 10, 9, 11],
  ])('reads %s', (events, month, dayStart, dayEnd) => {
    const o = only(events);
    expect(o.calendar).toBe('hijri');
    expect(o.month).toBe(month);
    expect(o.dayStart).toBe(dayStart);
    expect(o.dayEnd).toBe(dayEnd);
    expect(o.precision).toBe('day');
  });

  it('reads an en-dash range and a spelled-out month variant', () => {
    const o = only('*ʿurs* 15–17 Rabi ul Awal (Chadar Poshi, Mela Chiraghan)');
    expect(o).toMatchObject({ calendar: 'hijri', month: 3, dayStart: 15, dayEnd: 17 });
  });

  it('reads ordinal day suffixes', () => {
    const o = only('Annual Urs (7th-9th Muharram): Mehfil-e-Naat and langar');
    expect(o).toMatchObject({ month: 1, dayStart: 7, dayEnd: 9 });
  });

  it('collapses a comma-and list of days into its span', () => {
    const o = only('*ʿurs*, annually on 12, 13 and 14 Zil Hajj (lamps lit, sheets changed)');
    expect(o).toMatchObject({ calendar: 'hijri', month: 12, dayStart: 12, dayEnd: 14 });
  });

  it('finds the dated occurrence when the month is also named undated earlier', () => {
    // "Muharram tazia procession (9 Muharram)" — the first mention carries no
    // date; the parenthetical one does.
    const parsed = parseObservances(
      'Annual urs; Muharram tazia procession (9 Muharram); commemorative mach bonfire',
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ month: 1, dayStart: 9, dayEnd: null, precision: 'day' });
  });

  it('is not derailed by daily/weekly observances elsewhere in the cell', () => {
    // Regression: treating "daily"/"weekly" as recurrence-rule markers threw
    // away real urs dates recorded in the same cell.
    const o = only('Annual urs (17-19 Rabi al-Awwal); weekly Thursday milad; Mela Chiraagha');
    expect(o.precision).toBe('day');
    expect(o.ruleBased).toBe(false);
  });
});

describe('parseObservances — Gregorian dates', () => {
  it.each([
    ['Annual urs (7 February); Thursday-evening qawwali; daily langar', 2, 7, null],
    ['Annual urs (16-18 March); Friday gatherings at the tomb', 3, 16, 18],
    ['Death anniversary commemoration (27 June); Vaisakhi pilgrimage season', 6, 27, null],
    ['Martyrdom commemoration (1 July)', 7, 1, null],
    ['Annual urs (31 October: chadar-changing, gusal, Mehfil-e-Naat)', 10, 31, null],
    ['Annual commemoration (2 November)', 11, 2, null],
    ['Annual Urs (12-14 January): chadar tabdeeli, ghusl, chiraghan', 1, 12, 14],
  ])('reads %s', (events, month, dayStart, dayEnd) => {
    const o = only(events);
    expect(o.calendar).toBe('gregorian');
    expect(o).toMatchObject({ month, dayStart, dayEnd, precision: 'day' });
  });

  it('reads two separate dates from one clause', () => {
    const parsed = parseObservances('Two annual urs observances (15 March and 6 September)');
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ month: 3, dayStart: 15 });
    expect(parsed[1]).toMatchObject({ month: 9, dayStart: 6 });
  });

  it('reads two dates across semicolon-separated clauses', () => {
    const parsed = parseObservances(
      'Iqbal Day (9 November); death anniversary (21 April); daily changing of the guard',
    );
    expect(parsed).toHaveLength(2);
    expect(parsed.map((o) => [o.month, o.dayStart])).toEqual([
      [11, 9],
      [4, 21],
    ]);
  });
});

describe('parseObservances — abstains rather than guessing', () => {
  it('records the month but no day for a recurrence rule', () => {
    // "first Wednesday and Thursday of Rajab" is computable; the archive did
    // not compute it, so neither does the parser.
    const o = only('Annual urs (first Wednesday and Thursday of Rajab); langar');
    expect(o).toMatchObject({ month: 7, dayStart: null, precision: 'month', ruleBased: true });
  });

  it('records a month range as month precision, with no day', () => {
    const o = only('Martyrdom anniversary of Guru Arjan Dev (Jeth, May-June)');
    expect(o).toMatchObject({ month: 5, monthEnd: 6, dayStart: null, precision: 'month' });
  });

  it('does not read a duration as a date', () => {
    // "four days" and "three-day" are lengths, not days of the month.
    expect(only('Hinglaj Yatra halt (April, four days)')).toMatchObject({
      month: 4,
      dayStart: null,
      precision: 'month',
    });
    expect(only('Annual three-day Kali festival (January)')).toMatchObject({
      month: 1,
      dayStart: null,
    });
  });

  it('does not attach a stray number that is not touching the month name', () => {
    expect(only('Annual urs; 5 days of qawwali in Rajab')).toMatchObject({
      month: 7,
      dayStart: null,
      precision: 'month',
    });
  });

  it('refuses an ambiguous month name', () => {
    // Bare "Rabi" is either Rabi al-Awwal or Rabi al-Thani. Guessing would be
    // inventing a date (RULE 2).
    expect(parseObservances('Annual urs (Rabi)')).toEqual([]);
    expect(parseObservances('Annual urs (Jumada)')).toEqual([]);
  });

  it('never reads the English verb "may" as the month May', () => {
    expect(parseObservances('The custodians say the urs may move; no date recorded')).toEqual([]);
  });

  it('returns nothing for an empty or absent cell', () => {
    expect(parseObservances('')).toEqual([]);
    expect(parseObservances(null)).toEqual([]);
    expect(parseObservances(undefined)).toEqual([]);
  });

  it('rejects an out-of-range day', () => {
    expect(only('Annual urs (47 Safar)')).toMatchObject({ dayStart: null, precision: 'month' });
  });
});

describe('parseObservances — seasons', () => {
  it.each([
    ['Annual urs (spring); daily langar', 'spring'],
    ['Annual urs (autumn)', 'autumn'],
    ['Maha Shivratri (late winter)', 'winter'],
    ['Cheti Chand (spring)', 'spring'],
  ])('reads %s as a season, not a date', (events, season) => {
    const o = only(events);
    expect(o).toMatchObject({ season, precision: 'season', month: null, dayStart: null });
  });
});

describe('claimsUndatedObservance', () => {
  it('is true when an observance is named with no date', () => {
    expect(claimsUndatedObservance('Annual urs')).toBe(true);
    expect(claimsUndatedObservance('Annual urs; Sufi music and remembrance')).toBe(true);
    expect(claimsUndatedObservance('Guru Nanak Gurpurab')).toBe(true);
  });

  it('is false once a date has been parsed — the two sets never overlap', () => {
    expect(claimsUndatedObservance('Annual urs (18-20 Safar)')).toBe(false);
  });

  it('is false when nothing observance-like is recorded', () => {
    expect(claimsUndatedObservance('Not documented')).toBe(false);
    expect(claimsUndatedObservance('Community worship; no fixed public festival documented')).toBe(
      false,
    );
    expect(claimsUndatedObservance('')).toBe(false);
  });
});

describe('coverage against the shipped dataset', () => {
  /**
   * The almanac publishes these counts to readers ("a date is recorded for N
   * of M sites"), so they are asserted rather than described. A failure here
   * means the dataset moved and the doc comment in ursDates.ts, plus any copy
   * quoting the figure, needs revisiting — it does not mean the parser should
   * be loosened until the number comes back.
   *
   * **Moved 30 August 2026: undated 79 → 100, none 52 → 31.** Not a dataset
   * change — `OBSERVANCE_RE` was widened. It held eleven alternatives and knew
   * ʿurs and mela but not Diwali, Holi, Janmashtami, Durga Puja, Cheti Chand,
   * Ganesh Chaturthi, Raksha Bandhan, Jayanti, Akhand Path or prakash, so the
   * almanac reported 52 sites as recording no observance while 51 of them had
   * text in the cell — 6% of Muslim sites against 67% of Hindu and 100% of
   * Jain. `dated` is unchanged at 38 because date parsing was not touched.
   * See `observanceVocabulary.test.ts`, which asserts the rule rather than
   * these numbers, and this pin moving is the point of the pin.
   */
  it('classifies every row in the snapshot into exactly one bucket', async () => {
    const snapshot = (await import('../../../data/shrines-fallback.json')) as unknown as {
      default: { rows: Array<Record<string, string>> };
    };
    const rows = snapshot.default.rows;

    let day = 0;
    let month = 0;
    let season = 0;
    let undated = 0;
    let none = 0;

    for (const row of rows) {
      const observances = parseObservances(row.Events);
      if (observances.length > 0) {
        if (observances.some((o) => o.precision === 'day')) day++;
        else if (observances.some((o) => o.precision === 'month')) month++;
        else season++;
      } else if (claimsUndatedObservance(row.Events)) {
        undated++;
      } else {
        none++;
      }
    }

    // Buckets are disjoint and total.
    expect(day + month + season + undated + none).toBe(rows.length);
    expect({ rows: rows.length, day, month, season, undated, none }).toEqual({
      rows: 169,
      day: 22,
      month: 10,
      season: 6,
      undated: 100,
      none: 31,
    });
  });
});
