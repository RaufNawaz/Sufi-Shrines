/**
 * Assembling the Urs Almanac: shrines + parsed observances + calendar
 * projection, sorted into what a reader can actually use.
 *
 * The shape of this module is dictated by what the archive knows, which is
 * unevenly distributed (see `ursDates.ts` for the measured table). Rather
 * than flatten everything into one list and let the undated entries vanish,
 * the almanac carries all four states as first-class output:
 *
 * - `dated`      — projected onto the Gregorian calendar, orderable
 * - `seasonal`   — "spring", with no month to place it in
 * - `undated`    — an observance is held; the date is not recorded
 * - `noObservance` — nothing recorded either way
 *
 * The counts of the last three are the honest part of the feature, so they
 * are returned alongside the entries rather than computed ad hoc by the view.
 */
import type { Shrine } from '../../types/shrine';
import { getFieldValue } from './fieldAliasing';
import {
  parseObservances,
  claimsUndatedObservance,
  type Observance,
  type Season,
} from './ursDates';
import {
  addDays,
  buildHijriIndex,
  gregorianWindows,
  hijriDayRangeWindows,
  hijriMonthWindows,
  utcDay,
  type DateWindow,
} from './hijriCalendar';

export interface AlmanacEntry {
  shrine: Shrine;
  observance: Observance;
  window: DateWindow;
  /**
   * True when the Gregorian dates are a projection from a Hijri date and will
   * move with the moon sighting. Views must render this; it is the difference
   * between a date and a forecast.
   */
  approximate: boolean;
}

export interface SeasonalEntry {
  shrine: Shrine;
  observance: Observance;
  season: Season;
}

export interface UndatedEntry {
  shrine: Shrine;
  /** The Events text verbatim, so the reader sees what *is* recorded. */
  sourceText: string;
}

export interface Almanac {
  /** Every projected observance in the horizon, earliest first. */
  dated: AlmanacEntry[];
  seasonal: SeasonalEntry[];
  undated: UndatedEntry[];
  counts: {
    totalShrines: number;
    /** Shrines with at least one date at day precision. */
    dayPrecision: number;
    /** Shrines whose best reading is a month. */
    monthPrecision: number;
    seasonal: number;
    undated: number;
    noObservance: number;
  };
}

/**
 * Twelve months ahead. Deliberately not longer: a 400-day horizon shows an
 * early-September observance twice (2026 and 2027), which reads as a
 * duplicate rather than as information.
 *
 * A Hijri-dated observance *can* still appear twice inside one Gregorian
 * year, because the Hijri year is about eleven days shorter. That is not a
 * duplicate — the urs genuinely falls twice that year — so it is shown.
 */
export const DEFAULT_HORIZON_DAYS = 365;

function windowsFor(
  observance: Observance,
  from: Date,
  horizonDays: number,
  hijriIndex: ReturnType<typeof buildHijriIndex>,
): DateWindow[] {
  if (observance.month === null) return [];

  if (observance.calendar === 'hijri') {
    return observance.dayStart !== null
      ? hijriDayRangeWindows(hijriIndex, observance.month, observance.dayStart, observance.dayEnd)
      : hijriMonthWindows(hijriIndex, observance.month);
  }

  return gregorianWindows(
    from,
    horizonDays,
    observance.month,
    observance.dayStart,
    observance.dayEnd,
    observance.monthEnd,
  );
}

/**
 * Builds the almanac for a horizon starting at `from`.
 *
 * `from` is injected rather than read from the clock so the view can be
 * tested and prerendered deterministically.
 */
export function buildAlmanac(
  shrines: Shrine[],
  from: Date,
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): Almanac {
  const start = utcDay(from);
  const limit = addDays(start, horizonDays);
  const hijriIndex = buildHijriIndex(start, horizonDays);

  const dated: AlmanacEntry[] = [];
  const seasonal: SeasonalEntry[] = [];
  const undated: UndatedEntry[] = [];
  const counts = {
    totalShrines: shrines.length,
    dayPrecision: 0,
    monthPrecision: 0,
    seasonal: 0,
    undated: 0,
    noObservance: 0,
  };

  for (const shrine of shrines) {
    const events = getFieldValue(shrine.raw, 'Events');
    const observances = parseObservances(events);

    if (observances.length === 0) {
      if (claimsUndatedObservance(events)) {
        counts.undated++;
        undated.push({ shrine, sourceText: events.trim() });
      } else {
        counts.noObservance++;
      }
      continue;
    }

    if (observances.some((o) => o.precision === 'day')) counts.dayPrecision++;
    else if (observances.some((o) => o.precision === 'month')) counts.monthPrecision++;
    else counts.seasonal++;

    for (const observance of observances) {
      if (observance.precision === 'season' && observance.season) {
        seasonal.push({ shrine, observance, season: observance.season });
        continue;
      }
      for (const window of windowsFor(observance, start, horizonDays, hijriIndex)) {
        if (window.end < start || window.start >= limit) continue;
        dated.push({ shrine, observance, window, approximate: observance.calendar === 'hijri' });
      }
    }
  }

  dated.sort((a, b) => {
    const byStart = a.window.start.getTime() - b.window.start.getTime();
    if (byStart !== 0) return byStart;
    // Day-precise entries read first within a shared start date.
    if (a.observance.precision !== b.observance.precision) {
      return a.observance.precision === 'day' ? -1 : 1;
    }
    return a.shrine.name.localeCompare(b.shrine.name);
  });

  return { dated, seasonal, undated, counts };
}

/** Groups projected entries by the Gregorian month their window starts in. */
export function groupByMonth(entries: AlmanacEntry[]): Array<{
  year: number;
  month: number;
  entries: AlmanacEntry[];
}> {
  const groups = new Map<string, { year: number; month: number; entries: AlmanacEntry[] }>();
  for (const entry of entries) {
    const year = entry.window.start.getUTCFullYear();
    const month = entry.window.start.getUTCMonth() + 1;
    const key = `${year}-${month}`;
    const existing = groups.get(key);
    if (existing) existing.entries.push(entry);
    else groups.set(key, { year, month, entries: [entry] });
  }
  return [...groups.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}
