import { describe, it, expect } from 'vitest';
import { localIsoDate, entryCitation } from '../citation';

/**
 * A citation's accessed date is the reader's date, not UTC's.
 *
 * `toISOString().slice(0, 10)` converts to UTC before taking the date, so it is
 * correct only where the reader's offset is zero. This archive's primary
 * audience is at UTC+5, where every visit between 00:00 and 05:00 local time
 * cited *yesterday*; a reader in the Americas after 20:00 cited *tomorrow*.
 *
 * The cases below are the two real ones, constructed as local wall-clock times
 * and checked against the wall clock — which is the only way to state the
 * property without the test itself having to know what timezone it runs in.
 * They fail against the old implementation in any non-UTC zone and pass in all.
 */
describe('localIsoDate', () => {
  it('takes the date from the local clock, not from UTC', () => {
    // 02:00 local — before UTC's day boundary anywhere east of Greenwich.
    const earlyMorning = new Date(2026, 8, 5, 2, 0, 0);
    expect(localIsoDate(earlyMorning)).toBe('2026-09-05');

    // 22:00 local — after UTC's day boundary anywhere west of it.
    const lateEvening = new Date(2026, 8, 5, 22, 0, 0);
    expect(localIsoDate(lateEvening)).toBe('2026-09-05');
  });

  it('pads month and day, so the string is always ten characters', () => {
    expect(localIsoDate(new Date(2026, 0, 1, 12, 0, 0))).toBe('2026-01-01');
    expect(localIsoDate(new Date(2026, 11, 31, 12, 0, 0))).toBe('2026-12-31');
  });

  it('agrees with getFullYear on New Year, which is where the two clocks split', () => {
    /* The defect this pins: CiteThisEntry took the date from toISOString() and
       the year from getFullYear(). At 22:00 on 31 December in a western zone
       those disagreed, and one citation carried two different years. */
    const newYearsEve = new Date(2026, 11, 31, 22, 0, 0);
    expect(localIsoDate(newYearsEve).slice(0, 4)).toBe(String(newYearsEve.getFullYear()));

    const newYearsDay = new Date(2027, 0, 1, 2, 0, 0);
    expect(localIsoDate(newYearsDay).slice(0, 4)).toBe(String(newYearsDay.getFullYear()));
  });

  it('puts the reader’s own date into the citation line', () => {
    const accessed = new Date(2026, 8, 5, 2, 0, 0);
    expect(entryCitation('Data Darbar', 'data-darbar', accessed)).toContain(
      '(accessed 2026-09-05)',
    );
  });
});
