// @vitest-environment node
/**
 * The one thing a calendar can do that a list cannot: claim a day.
 *
 * `/almanac`'s list view can carry "month recorded, day not recorded" as a
 * caption under a card. A grid has no such option — a square *is* a day, and an
 * observance drawn on one is an assertion that it falls there. 10 of the
 * archive's observances name a month and no day, and 22 name a day; the
 * difference between those two numbers is exactly the fabrication risk this
 * view introduces, so it is asserted here rather than trusted to the component.
 *
 * The failure this file exists to prevent looks completely benign in code: a
 * month-precision entry already carries a window covering the whole month
 * (`hijriMonthWindows` builds it, so the list view can say "Muharram"), and a
 * placement loop that reads windows would fill all thirty squares with an ʿurs
 * nobody dated. Nothing errors. The page renders a busier, more useful-looking
 * calendar, and every square of it is invented (RULE 2).
 */
import { describe, it, expect } from 'vitest';
import { buildAlmanac } from '../almanac';
import { buildCalendarMonths, monthEntries } from '../almanacCalendar';
import { buildShrines } from '../shrineModel';
import { makeShrineRow } from '../../../test/utils';
import type { ShrineRow } from '../../../types/shrine';
import snapshot from '../../../data/shrines-fallback.json';

/** 1 June 2026 is a Monday, which makes the grid arithmetic readable. */
const JUNE = new Date(Date.UTC(2026, 5, 1));

const calendarFor = (rows: ShrineRow[], from = JUNE, horizon = 365) =>
  buildCalendarMonths(buildAlmanac(buildShrines(rows), from, horizon).dated, from, horizon);

const cellsOf = (month: ReturnType<typeof buildCalendarMonths>[number]) => month.weeks.flat();
const markedDaysOf = (month: ReturnType<typeof buildCalendarMonths>[number]) =>
  cellsOf(month)
    .filter((c) => c.entries.length > 0)
    .map((c) => c.day);

describe('buildCalendarMonths — placement', () => {
  it('puts a day-precise observance on exactly the days recorded', () => {
    const months = calendarFor([
      makeShrineRow({ Name: 'Three Day', Events: 'Annual urs (10-12 June)' }),
    ]);
    const june = months[0]!;
    expect(june.month).toBe(6);
    expect(markedDaysOf(june)).toEqual([10, 11, 12]);
    // Three squares, one observance.
    expect(june.placed).toBe(1);
    expect(june.markedDays).toBe(3);
  });

  it('puts a month-precise observance on no day at all', () => {
    /* The whole point. Its window covers the month, so any loop that reads
       windows without checking precision marks thirty squares. */
    const months = calendarFor([makeShrineRow({ Name: 'Month Only', Events: 'Annual urs (June)' })]);
    const june = months[0]!;
    expect(markedDaysOf(june), 'a month-only observance was placed on a day').toEqual([]);
    expect(june.placed).toBe(0);
    expect(june.monthOnly.length).toBeGreaterThan(0);
    expect(june.monthOnly[0]!.observance.precision).toBe('month');
  });

  it('never lets a season reach the grid', () => {
    // `buildAlmanac` keeps these out of `dated`; this pins that they stay out.
    const months = calendarFor([makeShrineRow({ Name: 'Spring', Events: 'Annual urs (spring)' })]);
    for (const month of months) {
      expect(markedDaysOf(month)).toEqual([]);
      expect(month.monthOnly).toEqual([]);
    }
  });

  it('splits a window that crosses a month boundary across both grids', () => {
    /* Built directly rather than parsed, because `ursDates.ts` will not give
       you this from prose: "29 June-2 July" degrades to month precision, since
       a day range the parser cannot pin to one month is a range it declines to
       claim. Where the case is real is a *Hijri* range — "18–20 Safar"
       projected onto the Gregorian year lands wherever the moon puts it, month
       ends included — so the arithmetic is exercised on its own terms. */
    const entry = {
      shrine: { slug: 'boundary', name: 'Boundary' },
      observance: { precision: 'day', calendar: 'hijri' },
      window: { start: new Date(Date.UTC(2026, 5, 29)), end: new Date(Date.UTC(2026, 6, 2)) },
      approximate: true,
    } as unknown as ReturnType<typeof buildAlmanac>['dated'][number];

    const months = buildCalendarMonths([entry], JUNE, 365);
    const june = months[0]!;
    const july = months[1]!;
    expect(markedDaysOf(june)).toEqual([29, 30]);
    expect(markedDaysOf(july)).toEqual([1, 2]);
    // Counted once in each month it appears in, never twice inside one.
    expect(june.placed).toBe(1);
    expect(july.placed).toBe(1);
  });

  it('lists a Hijri month-only observance under every Gregorian month it touches', () => {
    /* Muharram is a Hijri month; projected onto 2026–27 it straddles two
       Gregorian months. Both listings are the same true statement about the
       same window, and dropping the second would make the calendar silently
       under-report for half the period it covers. */
    const months = calendarFor([
      makeShrineRow({ Name: 'Hijri Month', Events: 'Annual urs (Muharram)' }),
    ]);
    const listed = months.filter((m) => m.monthOnly.length > 0);
    expect(listed.length).toBeGreaterThan(1);
    for (const month of listed) expect(markedDaysOf(month)).toEqual([]);
  });
});

describe('buildCalendarMonths — the grid itself', () => {
  const months = calendarFor([makeShrineRow({ Name: 'Any', Events: 'Annual urs (10 June)' })]);
  const june = months[0]!;

  it('is always whole weeks of seven', () => {
    for (const month of months) {
      for (const week of month.weeks) expect(week.length).toBe(7);
    }
  });

  it('starts the week on Monday', () => {
    for (const month of months) {
      for (const week of month.weeks) {
        // getUTCDay: 1 = Monday.
        expect(week[0]!.date.getUTCDay()).toBe(1);
      }
    }
  });

  it('pads with cells that belong to no month and hold nothing', () => {
    for (const month of months) {
      for (const cell of cellsOf(month)) {
        if (cell.inMonth) continue;
        expect(cell.entries).toEqual([]);
        expect(cell.isToday).toBe(false);
      }
    }
  });

  it('numbers every day of the month exactly once', () => {
    // June has 30; a duplicated or skipped cell is a calendar that misdates.
    const days = cellsOf(june)
      .filter((c) => c.inMonth)
      .map((c) => c.day);
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('marks the day it was built from, and only that one', () => {
    const today = cellsOf(june).filter((c) => c.isToday);
    expect(today.length).toBe(1);
    expect(today[0]!.day).toBe(1);
    for (const month of months.slice(1)) {
      expect(cellsOf(month).some((c) => c.isToday)).toBe(false);
    }
  });

  it('covers the whole horizon and no more', () => {
    /* 1 June + 365 days is 1 June the next year, and the horizon is
       half-open — `buildAlmanac` drops a window starting on the limit — so the
       last day it can hold is 31 May and the grid stops at May. A thirteenth
       June grid would be a month of squares no entry can ever land in. */
    expect(months.length).toBe(12);
    expect(months[0]!.month).toBe(6);
    expect(months[11]!.month).toBe(5);
    expect(months[11]!.year).toBe(2027);
  });
});

describe('monthEntries', () => {
  it('returns a multi-day observance once, not once per square', () => {
    const june = calendarFor([
      makeShrineRow({ Name: 'Three Day', Events: 'Annual urs (10-12 June)' }),
    ])[0]!;
    expect(monthEntries(june).length).toBe(1);
  });
});

describe('against the shipped snapshot', () => {
  const shrines = buildShrines((snapshot as { rows: ShrineRow[] }).rows);
  const almanac = buildAlmanac(shrines, JUNE);
  const months = buildCalendarMonths(almanac.dated, JUNE);

  it('places something — a calendar of empty squares is not a feature', () => {
    expect(months.reduce((n, m) => n + m.markedDays, 0)).toBeGreaterThan(0);
  });

  it('has month-only observances to list, so that section is live', () => {
    expect(months.some((m) => m.monthOnly.length > 0)).toBe(true);
  });

  it('places nothing whose precision is not a day', () => {
    for (const month of months) {
      for (const cell of cellsOf(month)) {
        for (const entry of cell.entries) {
          expect(
            entry.observance.precision,
            `${entry.shrine.slug} placed on ${month.year}-${month.month}-${cell.day}`,
          ).toBe('day');
        }
      }
    }
  });

  it('places every day-precise entry the almanac projected', () => {
    /* The other direction: a placement bug that drops entries is as quiet as
       one that invents them. Every dated entry with day precision must appear
       on at least one square somewhere in the horizon. */
    const placed = new Set(months.flatMap((m) => cellsOf(m).flatMap((c) => c.entries)));
    for (const entry of almanac.dated) {
      if (entry.observance.precision !== 'day') continue;
      expect(placed.has(entry), `${entry.shrine.slug} was projected but never drawn`).toBe(true);
    }
  });
});
