/**
 * Laying the almanac out on a month grid — and refusing to place what the
 * archive did not date.
 *
 * A list can be vague about a date. A calendar cannot: a square is a day, and
 * putting an observance on one is a claim that it falls on that day. That makes
 * this the surface where the archive's uneven dating stops being a caveat and
 * becomes a design constraint, so the rule is in the shape of the output rather
 * than in a note the view might forget to render:
 *
 * - **Day precision occupies days.** "18–20 Safar" fills the three squares its
 *   projected window covers, in every month the window touches.
 * - **Month precision occupies nothing.** Ten of the archive's observances name
 *   a month and no day ("Annual urs (Muharram)"). They come back in
 *   `monthOnly`, which the view lists beneath the grid, because the honest
 *   position of an undated observance is not the 1st and not the 15th — it is
 *   off the grid. (`ursDates.ts` makes the same refusal upstream: "first
 *   Wednesday and Thursday of Rajab" resolves to a month, never to a day, even
 *   though the rule is computable.)
 * - **Season precision never reaches here at all** — `buildAlmanac` keeps those
 *   in their own bucket, with no window to place.
 *
 * A month-only entry appears in *every* Gregorian month its window overlaps,
 * which for a Hijri month is usually two: Muharram 1448 runs from mid-June into
 * mid-July. That is not the entry counted twice — nothing is on a day, and the
 * strip prints the month the source actually recorded, so a reader who sees the
 * Muharram urs listed under both June and July is reading a true statement
 * about a Hijri month, twice. Dropping it from the second month would make the
 * calendar under-report for half of its span, which in a *calendar* is the worse
 * error.
 *
 * Weeks start on Monday (ISO 8601), which is also the working week in Pakistan.
 */
import type { AlmanacEntry } from './almanac';
import { DEFAULT_HORIZON_DAYS } from './almanac';
import { addDays, utcDay } from './hijriCalendar';

export interface CalendarDay {
  /** UTC midnight of this cell's day. */
  date: Date;
  /** 1–31. */
  day: number;
  /** False for the cells that pad the grid out to whole weeks. They belong to
   * the neighbouring month and hold nothing — the view renders them empty. */
  inMonth: boolean;
  /** True for the day the calendar was built from, so "today" can be marked. */
  isToday: boolean;
  /** Day-precise observances whose projected window covers this day. */
  entries: AlmanacEntry[];
}

export interface CalendarMonth {
  year: number;
  /** 1–12. */
  month: number;
  /** Rows of exactly seven cells, Monday first. */
  weeks: CalendarDay[][];
  /** Recorded to this month, with no day. Never placed on a cell. */
  monthOnly: AlmanacEntry[];
  /** Day cells carrying at least one entry. */
  markedDays: number;
  /** Distinct observances placed in this month — a three-day ʿurs counts once. */
  placed: number;
}

const MS_PER_DAY = 86_400_000;

/** Whole days between two UTC midnights. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Monday-first index of a UTC date: 0 = Monday … 6 = Sunday. */
function isoWeekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * The horizon's months, each as a grid.
 *
 * `from` is injected for the same reason `buildAlmanac` injects it: a view that
 * reads the clock cannot be tested or prerendered deterministically.
 */
export function buildCalendarMonths(
  entries: AlmanacEntry[],
  from: Date,
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): CalendarMonth[] {
  const today = utcDay(from);
  const limit = addDays(today, horizonDays);

  const months: CalendarMonth[] = [];
  let cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  while (cursor < limit) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
    const span = { start: firstOfMonth, end: lastOfMonth };

    const placed = new Set<AlmanacEntry>();
    const monthOnly: AlmanacEntry[] = [];
    /** Day-of-month → the entries covering it. */
    const byDay = new Map<number, AlmanacEntry[]>();

    for (const entry of entries) {
      if (!overlaps(entry.window, span)) continue;
      if (entry.observance.precision !== 'day') {
        // Month (and anything else that is not a day) is listed, never placed.
        monthOnly.push(entry);
        continue;
      }
      const start = entry.window.start < firstOfMonth ? firstOfMonth : entry.window.start;
      const end = entry.window.end > lastOfMonth ? lastOfMonth : entry.window.end;
      for (let d = 0; d <= daysBetween(start, end); d++) {
        const day = addDays(start, d).getUTCDate();
        const bucket = byDay.get(day);
        if (bucket) bucket.push(entry);
        else byDay.set(day, [entry]);
      }
      placed.add(entry);
    }

    const leading = isoWeekday(firstOfMonth);
    const dayCount = lastOfMonth.getUTCDate();
    const cells: CalendarDay[] = [];

    for (let i = 0; i < leading; i++) {
      const date = addDays(firstOfMonth, i - leading);
      cells.push({ date, day: date.getUTCDate(), inMonth: false, isToday: false, entries: [] });
    }
    for (let day = 1; day <= dayCount; day++) {
      const date = new Date(Date.UTC(year, month, day));
      cells.push({
        date,
        day,
        inMonth: true,
        isToday: date.getTime() === today.getTime(),
        entries: byDay.get(day) ?? [],
      });
    }
    while (cells.length % 7 !== 0) {
      const date = addDays(lastOfMonth, cells.length - (leading + dayCount) + 1);
      cells.push({ date, day: date.getUTCDate(), inMonth: false, isToday: false, entries: [] });
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    months.push({
      year,
      month: month + 1,
      weeks,
      monthOnly,
      markedDays: byDay.size,
      placed: placed.size,
    });

    cursor = new Date(Date.UTC(year, month + 1, 1));
  }

  return months;
}

/** Every entry the grid shows for one month, placed or not — the detail list
 * beneath it. Ordered by window start so it reads down the month. */
export function monthEntries(month: CalendarMonth): AlmanacEntry[] {
  const seen = new Set<AlmanacEntry>();
  const out: AlmanacEntry[] = [];
  for (const week of month.weeks) {
    for (const cell of week) {
      for (const entry of cell.entries) {
        if (seen.has(entry)) continue;
        seen.add(entry);
        out.push(entry);
      }
    }
  }
  return out;
}

/* ── Laying one week's bars out in lanes ────────────────────────────────────
   A calendar that draws "18–20 Safar" as three separate squares is showing the
   reader three facts where the source recorded one. Google Calendar's answer,
   and this one, is a single bar across the days the window covers, wrapping at
   the week edge; two observances that overlap in time stack in separate lanes
   rather than hiding one behind the other. The arithmetic lives here so it can
   be tested without a browser — the view only draws what this returns. */

export interface WeekSpan {
  entry: AlmanacEntry;
  /** 0–6, Monday first: the column the bar starts in within this week. */
  startCol: number;
  /** 0–6 inclusive: the column the bar ends in within this week. */
  endCol: number;
  /** 0 = the topmost lane. Two spans sharing a column never share a lane. */
  lane: number;
  /** The window began before this week's first covered day — the bar is a
   * continuation and should read as one (no rounded start edge). */
  continuesBefore: boolean;
  /** The window runs past this week's last covered day. */
  continuesAfter: boolean;
}

export interface WeekLayout {
  spans: WeekSpan[];
  /** Lanes needed to draw every span without overlap. */
  lanes: number;
}

/**
 * One week's day-precise entries as spans with lanes.
 *
 * Spans are ordered earliest-start first and, among equal starts, longest
 * first — so a three-day ʿurs takes lane 0 and a one-day observance starting
 * the same day sits beneath it, which is the order a reader expects the bars
 * to stack in. Lane assignment is greedy over columns: the first lane free for
 * every column the span covers.
 */
export function layoutWeek(week: CalendarDay[]): WeekLayout {
  const first = new Map<AlmanacEntry, number>();
  const last = new Map<AlmanacEntry, number>();
  week.forEach((cell, col) => {
    for (const entry of cell.entries) {
      if (!first.has(entry)) first.set(entry, col);
      last.set(entry, col);
    }
  });

  const spans: WeekSpan[] = [...first.keys()].map((entry) => {
    const startCol = first.get(entry)!;
    const endCol = last.get(entry)!;
    return {
      entry,
      startCol,
      endCol,
      lane: -1,
      continuesBefore: entry.window.start < week[startCol]!.date,
      continuesAfter: entry.window.end > week[endCol]!.date,
    };
  });

  spans.sort(
    (a, b) =>
      a.startCol - b.startCol ||
      b.endCol - b.startCol - (a.endCol - a.startCol) ||
      a.entry.shrine.name.localeCompare(b.entry.shrine.name),
  );

  const occupied: boolean[][] = [];
  for (const span of spans) {
    let lane = 0;
    for (;;) {
      const row = occupied[lane] ?? (occupied[lane] = new Array<boolean>(7).fill(false));
      let free = true;
      for (let c = span.startCol; c <= span.endCol; c++) {
        if (row[c]) {
          free = false;
          break;
        }
      }
      if (free) {
        for (let c = span.startCol; c <= span.endCol; c++) row[c] = true;
        span.lane = lane;
        break;
      }
      lane++;
    }
  }

  return { spans, lanes: occupied.length };
}

/**
 * How many of a column's entries sit in lanes the view is not drawing.
 *
 * A cell has room for a few bars; past that the honest thing is "+N more"
 * rather than a bar that is clipped to nothing. This counts the N for one
 * column so the view can print it — and so that the count is right for a bar
 * that *passes through* the column rather than starting in it.
 */
export function hiddenInColumn(layout: WeekLayout, col: number, visibleLanes: number): number {
  let n = 0;
  for (const span of layout.spans) {
    if (span.lane >= visibleLanes && span.startCol <= col && col <= span.endCol) n++;
  }
  return n;
}
