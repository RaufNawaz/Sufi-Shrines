/**
 * Which calendar leads when the archive prints a date.
 *
 * ## Why this is a real question and not a display toggle
 *
 * An ʿurs recorded as "18–20 Safar" has no Gregorian date. It has a Gregorian
 * *forecast*: the Hijri month begins on local moon sighting, decided in
 * Pakistan by the Ruet-e-Hilal Committee, which routinely lands a day or two
 * either side of any computed calendar. `hijriCalendar.ts` exists to say so, and
 * flags every value it projects as `approximate`.
 *
 * The almanac then prints the projection in the prominent position and the
 * recorded date underneath it, labelled "Recorded". For a reader who keeps the
 * Hijri calendar — which is most of the readership for a Pakistani shrine
 * archive — that is the forecast in the headline and the real date in the
 * footnote. This preference swaps the emphasis. **It changes nothing about the
 * arithmetic and hides nothing:** both dates stay on screen, with the same
 * `approximate` flag attached to whichever of them is the projection.
 *
 * ## What it deliberately does not do
 *
 * An observance the archive recorded in the Gregorian calendar — "7 February",
 * a fixed civil date that recurs exactly — is **left alone** under `hijri`. The
 * archive holds no Hijri date for it, and computing one would be inventing a
 * date (RULE 2) of exactly the kind `hijriCalendar.ts` warns about, since the
 * conversion back is the same moon-sighting approximation in the other
 * direction. So the preference reads "which calendar leads *where the archive
 * recorded one*", and the help text on /settings says so.
 */
import { CALENDAR_STORAGE_KEY } from './storageKeys';

export type CalendarPreference = 'gregorian' | 'hijri';

export const DEFAULT_CALENDAR: CalendarPreference = 'gregorian';

export function readCalendarPreference(): CalendarPreference {
  if (typeof window === 'undefined') return DEFAULT_CALENDAR;
  try {
    return window.localStorage.getItem(CALENDAR_STORAGE_KEY) === 'hijri'
      ? 'hijri'
      : DEFAULT_CALENDAR;
  } catch {
    return DEFAULT_CALENDAR;
  }
}

export function writeCalendarPreference(calendar: CalendarPreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CALENDAR_STORAGE_KEY, calendar);
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}
