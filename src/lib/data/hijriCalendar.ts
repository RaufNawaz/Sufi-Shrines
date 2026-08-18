/**
 * Projecting Hijri observance dates onto the Gregorian calendar.
 *
 * ## The honesty problem this file exists to handle
 *
 * An urs recorded as "18-20 Safar" does not have a Gregorian date. It has a
 * Gregorian *forecast*. The Hijri month begins on local moon sighting, which
 * in Pakistan is decided by the Ruet-e-Hilal Committee and routinely lands a
 * day or two either side of any computed calendar. Printing "6 August 2026"
 * as though it were the date would be exactly the kind of tidied-up precision
 * RULE 2 forbids.
 *
 * So every value this module produces for a Hijri source is flagged
 * `approximate`, and callers are expected to render that flag rather than
 * quietly drop it. Gregorian-sourced dates ("7 February") are not
 * approximate — they are fixed civil dates and recur exactly.
 *
 * The arithmetic uses `Intl`'s `islamic-umalqura` calendar, which is the
 * tabular Umm al-Qura calendar — the best widely-available approximation, and
 * still an approximation of what a committee will announce.
 *
 * All dates are handled as UTC calendar days. The almanac deals in days, not
 * instants, and a local-timezone Date would shift the day boundary for
 * readers west of Greenwich.
 */

/** One Gregorian day paired with the Hijri day it falls on. */
export interface HijriDay {
  /** UTC midnight of the Gregorian day. */
  date: Date;
  hijriYear: number;
  hijriMonth: number;
  hijriDay: number;
}

const HIJRI_FORMATTER = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

/** UTC midnight of the given date, so day arithmetic can't drift. */
export function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** The Hijri date a Gregorian day falls on. */
export function toHijri(date: Date): { year: number; month: number; day: number } {
  const parts = HIJRI_FORMATTER.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Every Gregorian day in [start, start + days), tagged with its Hijri date.
 *
 * Built once per render and shared by all shrines: the alternative — a
 * per-shrine search — repeats the same few hundred `Intl` conversions for
 * every entry on the page.
 */
export function buildHijriIndex(start: Date, days: number): HijriDay[] {
  const from = utcDay(start);
  const index: HijriDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const { year, month, day } = toHijri(date);
    index.push({ date, hijriYear: year, hijriMonth: month, hijriDay: day });
  }
  return index;
}

export interface DateWindow {
  start: Date;
  end: Date;
}

/**
 * Gregorian windows in the index where a Hijri day-range occurs.
 *
 * Returns one window per Hijri year covered by the index — a 12-month horizon
 * normally contains exactly one, but a Hijri year is ~11 days shorter than a
 * Gregorian one, so a month near the boundary can legitimately occur twice.
 * Both are real and both are shown.
 */
export function hijriDayRangeWindows(
  index: HijriDay[],
  month: number,
  dayStart: number,
  dayEnd: number | null,
): DateWindow[] {
  const last = dayEnd ?? dayStart;
  const byYear = new Map<number, HijriDay[]>();
  for (const entry of index) {
    if (entry.hijriMonth !== month) continue;
    if (entry.hijriDay < dayStart || entry.hijriDay > last) continue;
    const bucket = byYear.get(entry.hijriYear);
    if (bucket) bucket.push(entry);
    else byYear.set(entry.hijriYear, [entry]);
  }
  return [...byYear.values()]
    .map((entries) => ({ start: entries[0].date, end: entries[entries.length - 1].date }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Gregorian windows spanning a whole Hijri month within the index. */
export function hijriMonthWindows(index: HijriDay[], month: number): DateWindow[] {
  const byYear = new Map<number, HijriDay[]>();
  for (const entry of index) {
    if (entry.hijriMonth !== month) continue;
    const bucket = byYear.get(entry.hijriYear);
    if (bucket) bucket.push(entry);
    else byYear.set(entry.hijriYear, [entry]);
  }
  return [...byYear.values()]
    .map((entries) => ({ start: entries[0].date, end: entries[entries.length - 1].date }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Gregorian windows for a fixed civil date, for each Gregorian year the
 * horizon touches. Unlike the Hijri projections these are exact.
 */
export function gregorianWindows(
  from: Date,
  horizonDays: number,
  month: number,
  dayStart: number | null,
  dayEnd: number | null,
  monthEnd: number | null,
): DateWindow[] {
  const start = utcDay(from);
  const limit = addDays(start, horizonDays);
  const windows: DateWindow[] = [];

  for (const year of [start.getUTCFullYear(), start.getUTCFullYear() + 1]) {
    let windowStart: Date;
    let windowEnd: Date;

    if (dayStart !== null) {
      windowStart = new Date(Date.UTC(year, month - 1, dayStart));
      windowEnd = new Date(Date.UTC(year, month - 1, dayEnd ?? dayStart));
    } else {
      // Whole month, or a month range like "May-June".
      windowStart = new Date(Date.UTC(year, month - 1, 1));
      windowEnd = new Date(Date.UTC(year, monthEnd ?? month, 0));
    }

    // A day that does not exist in this month (e.g. 31 in a 30-day month)
    // rolls over in Date's constructor — reject rather than display the roll.
    if (dayStart !== null && windowStart.getUTCMonth() !== month - 1) continue;

    if (windowEnd >= start && windowStart < limit) windows.push({ start: windowStart, end: windowEnd });
  }

  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}
