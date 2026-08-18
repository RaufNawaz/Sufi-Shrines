// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildAlmanac, groupByMonth } from '../almanac';
import { buildHijriIndex, hijriDayRangeWindows, gregorianWindows, toHijri } from '../hijriCalendar';
import { buildShrine } from '../shrineModel';

// A fixed reference date keeps every projection deterministic.
const FROM = new Date(Date.UTC(2026, 7, 18)); // 18 August 2026

function shrine(name: string, events: string) {
  return buildShrine(
    {
      Name: name,
      Latitude: '31.57',
      Longitude: '74.30',
      Events: events,
    } as never,
    0,
  )!;
}

describe('hijriCalendar', () => {
  it('agrees with Intl on a known conversion', () => {
    // 18 August 2026 is 5 Rabiʻ I 1448 in the Umm al-Qura calendar.
    expect(toHijri(FROM)).toEqual({ year: 1448, month: 3, day: 5 });
  });

  it('projects a Hijri day-range onto contiguous Gregorian days', () => {
    const index = buildHijriIndex(FROM, 400);
    const windows = hijriDayRangeWindows(index, 2, 18, 20); // 18-20 Safar
    expect(windows.length).toBeGreaterThanOrEqual(1);
    const [first] = windows;
    // Three Hijri days project to three Gregorian days.
    const spanDays = (first.end.getTime() - first.start.getTime()) / 86_400_000;
    expect(spanDays).toBe(2);
    expect(toHijri(first.start)).toMatchObject({ month: 2, day: 18 });
    expect(toHijri(first.end)).toMatchObject({ month: 2, day: 20 });
  });

  it('returns fixed civil dates exactly, without projection', () => {
    const windows = gregorianWindows(FROM, 400, 2, 7, null, null); // 7 February
    expect(windows[0].start.toISOString().slice(0, 10)).toBe('2027-02-07');
  });

  it('rejects a day that does not exist in its month rather than rolling over', () => {
    // 31 February would silently become 2-3 March in a Date constructor.
    expect(gregorianWindows(FROM, 400, 2, 31, null, null)).toEqual([]);
  });

  it('spans a whole month when no day is recorded', () => {
    const windows = gregorianWindows(FROM, 400, 11, null, null, null); // November
    expect(windows[0].start.toISOString().slice(0, 10)).toBe('2026-11-01');
    expect(windows[0].end.toISOString().slice(0, 10)).toBe('2026-11-30');
  });

  it('spans a month range', () => {
    const windows = gregorianWindows(FROM, 400, 5, null, null, 6); // May-June
    expect(windows[0].start.toISOString().slice(0, 10)).toBe('2027-05-01');
    expect(windows[0].end.toISOString().slice(0, 10)).toBe('2027-06-30');
  });
});

describe('buildAlmanac', () => {
  it('flags Hijri projections approximate and civil dates exact', () => {
    const almanac = buildAlmanac(
      [
        shrine('Hijri shrine', 'Annual urs (18-20 Safar)'),
        shrine('Civil shrine', 'Annual urs (7 February)'),
      ],
      FROM,
    );

    const hijri = almanac.dated.find((e) => e.shrine.name === 'Hijri shrine')!;
    const civil = almanac.dated.find((e) => e.shrine.name === 'Civil shrine')!;
    expect(hijri.approximate).toBe(true);
    expect(civil.approximate).toBe(false);
  });

  it('sorts projected observances earliest first', () => {
    const almanac = buildAlmanac(
      [
        shrine('Later', 'Annual urs (7 February)'),
        shrine('Sooner', 'Annual urs (2 November)'),
      ],
      FROM,
    );
    expect(almanac.dated.map((e) => e.shrine.name)).toEqual(['Sooner', 'Later']);
  });

  it('keeps seasonal, undated and silent entries as separate first-class buckets', () => {
    const almanac = buildAlmanac(
      [
        shrine('Dated', 'Annual urs (7 February)'),
        shrine('Seasonal', 'Annual urs (spring)'),
        shrine('Undated', 'Annual urs; daily langar'),
        shrine('Silent', 'Not documented'),
      ],
      FROM,
    );

    expect(almanac.counts).toEqual({
      totalShrines: 4,
      dayPrecision: 1,
      monthPrecision: 0,
      seasonal: 1,
      undated: 1,
      noObservance: 1,
    });
    expect(almanac.seasonal.map((e) => e.shrine.name)).toEqual(['Seasonal']);
    expect(almanac.undated.map((e) => e.shrine.name)).toEqual(['Undated']);
    // The undated entry carries its source text so the reader sees what the
    // archive actually recorded.
    expect(almanac.undated[0].sourceText).toBe('Annual urs; daily langar');
  });

  it('never invents a date for an undated observance', () => {
    const almanac = buildAlmanac([shrine('Undated', 'Annual urs')], FROM);
    expect(almanac.dated).toEqual([]);
  });

  it('emits one entry per date when a shrine holds two observances', () => {
    const almanac = buildAlmanac(
      [shrine('Two', 'Two annual urs observances (15 March and 6 September)')],
      FROM,
    );
    expect(almanac.dated).toHaveLength(2);
    // Counted once as a shrine, listed twice as observances.
    expect(almanac.counts.dayPrecision).toBe(1);
  });

  it('groups by the Gregorian month the window opens in', () => {
    const almanac = buildAlmanac(
      [
        shrine('A', 'Annual urs (2 November)'),
        shrine('B', 'Annual commemoration (9 November)'),
        shrine('C', 'Annual urs (7 February)'),
      ],
      FROM,
    );
    const groups = groupByMonth(almanac.dated);
    expect(groups.map((g) => [g.year, g.month, g.entries.length])).toEqual([
      [2026, 11, 2],
      [2027, 2, 1],
    ]);
  });

  it('places every shrine in exactly one count bucket', () => {
    const shrines = [
      shrine('a', 'Annual urs (18-20 Safar)'),
      shrine('b', 'Annual urs (Muharram)'),
      shrine('c', 'Annual urs (spring)'),
      shrine('d', 'Annual urs'),
      shrine('e', ''),
    ];
    const { counts } = buildAlmanac(shrines, FROM);
    const summed =
      counts.dayPrecision +
      counts.monthPrecision +
      counts.seasonal +
      counts.undated +
      counts.noObservance;
    expect(summed).toBe(counts.totalShrines);
  });
});
