import type { Lang } from '../../types/shrine';
import { GREGORIAN_MONTH_NAMES, HIJRI_MONTH_NAMES } from '../data/ursDates';
import type { Season } from '../data/ursDates';
import type { DateWindow } from '../data/hijriCalendar';

/**
 * The interface key naming each season, for the six observances the archive
 * records as a season and no month ("Annual urs (spring)").
 *
 * Here rather than in a page because two surfaces now render a season the
 * archive recorded — the almanac's own section and the order pages' ʿurs list —
 * and a second copy of this map is a second place for a season to go untranslated.
 */
export const SEASON_LABEL_KEYS = {
  spring: 'almanacSeasonSpring',
  summer: 'almanacSeasonSummer',
  autumn: 'almanacSeasonAutumn',
  winter: 'almanacSeasonWinter',
} as const satisfies Record<Season, string>;

/**
 * Weekday names, Monday first — the order `buildCalendarMonths` lays a week out
 * in (ISO 8601, and the working week in Pakistan).
 *
 * Written out rather than taken from `Intl.DateTimeFormat`: the Urdu locale's
 * own short forms are inconsistently available across engines, and a calendar
 * whose column headings differ between a reader's phone and their laptop is
 * worse than one that always says the same thing. The long forms carry the
 * accessible name; the short forms are the column heading.
 */
export const WEEKDAY_NAMES_SHORT: Record<Lang, readonly string[]> = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ur: ['پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ', 'اتوار'],
};

export const WEEKDAY_NAMES_LONG: Record<Lang, readonly string[]> = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ur: ['پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ', 'اتوار'],
};

/** Gregorian month name in the reader's language. */
export function gregorianMonthName(month: number, lang: Lang): string {
  const names = GREGORIAN_MONTH_NAMES[lang];
  return names[month - 1] ?? '';
}

/** Hijri month name in the reader's language. */
export function hijriMonthName(month: number, lang: Lang): string {
  const names = HIJRI_MONTH_NAMES[lang];
  return names[month - 1] ?? '';
}

/**
 * A projected window as a human date string.
 *
 * `fmtNum` is passed in rather than imported so every digit goes through the
 * reader's numeral setting (i18n rule 5) — Eastern by default in Urdu, with
 * the persisted toggle respected.
 *
 * Ranges collapse the repeated month: "6–8 August 2026", not "6 August 2026 –
 * 8 August 2026". A range crossing a month boundary keeps both months.
 */
export function formatDateWindow(
  window: DateWindow,
  lang: Lang,
  fmtNum: (n: number | string) => string,
  options: { monthOnly?: boolean } = {},
): string {
  const { start, end } = window;
  const startMonth = gregorianMonthName(start.getUTCMonth() + 1, lang);
  const endMonth = gregorianMonthName(end.getUTCMonth() + 1, lang);
  const startYear = fmtNum(start.getUTCFullYear());
  const endYear = fmtNum(end.getUTCFullYear());

  if (options.monthOnly) {
    if (
      start.getUTCMonth() === end.getUTCMonth() &&
      start.getUTCFullYear() === end.getUTCFullYear()
    ) {
      return `${startMonth} ${startYear}`;
    }
    return `${startMonth} – ${endMonth} ${endYear}`;
  }

  const startDay = fmtNum(start.getUTCDate());
  const endDay = fmtNum(end.getUTCDate());

  if (start.getTime() === end.getTime()) return `${startDay} ${startMonth} ${startYear}`;

  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay}–${endDay} ${startMonth} ${startYear}`;
}

/** The source date as the archive recorded it: "18–20 Safar", "7 February". */
export function formatSourceDate(
  calendar: 'hijri' | 'gregorian',
  month: number | null,
  monthEnd: number | null,
  dayStart: number | null,
  dayEnd: number | null,
  lang: Lang,
  fmtNum: (n: number | string) => string,
): string {
  if (month === null) return '';
  const name = calendar === 'hijri' ? hijriMonthName(month, lang) : gregorianMonthName(month, lang);
  if (dayStart === null) {
    if (monthEnd !== null && monthEnd !== month) {
      const endName =
        calendar === 'hijri' ? hijriMonthName(monthEnd, lang) : gregorianMonthName(monthEnd, lang);
      return `${name} – ${endName}`;
    }
    return name;
  }
  const days = dayEnd !== null ? `${fmtNum(dayStart)}–${fmtNum(dayEnd)}` : fmtNum(dayStart);
  return `${days} ${name}`;
}
