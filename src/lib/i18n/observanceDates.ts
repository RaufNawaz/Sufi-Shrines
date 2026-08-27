/**
 * The two dates an observance has, and which of them leads.
 *
 * ## Why one function rather than the same three lines on four surfaces
 *
 * Every observance in this archive is printed twice: what the archive
 * *recorded* ("18–20 Safar") and what the app *computed* from it ("6–8 August
 * 2026"), with an `approximate` flag on the computed one because a Hijri month
 * begins on moon sighting and a projection is a forecast, not a date.
 * `ObservanceCard`'s own header already says why that pairing must not be
 * reimplemented per surface: "a reimplemented card is how one of them quietly
 * loses the approximate flag."
 *
 * Adding a reader preference for which one leads makes that risk concrete —
 * there are four surfaces and the flag has to follow the projection wherever it
 * lands. So the decision is made once, here, and the surfaces render what they
 * are given.
 *
 * ## The honest edge, which is the interesting half
 *
 * Under `hijri`, an observance the archive recorded in the **Gregorian**
 * calendar is left exactly as it was. "7 February" is a fixed civil date that
 * recurs exactly; the archive holds no Hijri date for it, and computing one
 * would be inventing a date (RULE 2) — the conversion back is the same
 * moon-sighting approximation running the other way. A reader who asks for
 * Hijri-first gets Hijri where the source gave one, and is not shown a number
 * nobody recorded.
 *
 * That is why `leadIsProjection` exists rather than the caller reading
 * `entry.approximate` directly: the flag belongs to whichever value is the
 * projection, and under `hijri` that is the *secondary* value — except on a
 * Gregorian-recorded observance, where nothing swapped and it is still the lead.
 */
import { formatDateWindow, formatSourceDate } from './formatDateWindow';
import type { CalendarPreference } from '../calendarPreference';
import type { Observance } from '../data/ursDates';
import type { DateWindow } from '../data/hijriCalendar';
import type { Lang } from '../../types/shrine';
import type { UiStringKey } from './uiStrings';

export interface ObservanceDateDisplay {
  /** The date to print in the prominent position. */
  lead: string;
  /** True when `lead` is the computed projection, so the caller flags it. */
  leadIsProjection: boolean;
  /** The date to print underneath, and the label that names what it is. */
  secondary: string;
  secondaryLabelKey: UiStringKey;
  /** True when `secondary` is the computed projection. */
  secondaryIsProjection: boolean;
  /** Whether either value is a projection at all — false for a Gregorian
   *  source, whose dates are fixed and recur exactly. */
  hasProjection: boolean;
  /**
   * Where the "(Hijri)" note belongs.
   *
   * It names the calendar the *source* used, so it travels with the recorded
   * date rather than staying in the second position. The first version left it
   * on the secondary line and Hijri-first rendered
   * "Projected: 28–30 August 2026 (Hijri)" — a Gregorian date labelled Hijri,
   * which is worse than no label.
   */
  calendarNoteOn: 'lead' | 'secondary' | 'none';
}

export function observanceDateDisplay(
  observance: Observance,
  dateWindow: DateWindow,
  approximate: boolean,
  lang: Lang,
  fmtNum: (n: number | string) => string,
  calendar: CalendarPreference,
): ObservanceDateDisplay {
  const monthOnly = observance.precision === 'month';
  const projected = formatDateWindow(dateWindow, lang, fmtNum, { monthOnly });
  const recorded = formatSourceDate(
    observance.calendar,
    observance.month,
    observance.monthEnd,
    observance.dayStart,
    observance.dayEnd,
    lang,
    fmtNum,
  );

  /* Nothing to lead with: a month-only Hijri record can format to an empty
     recorded string, and leading with an empty line would replace a date with a
     blank. Falls back to the behaviour the archive has always had. */
  const canLeadWithRecorded = calendar === 'hijri' && observance.calendar === 'hijri' && recorded;

  const sourceIsHijri = observance.calendar === 'hijri';

  if (canLeadWithRecorded) {
    return {
      lead: recorded,
      leadIsProjection: false,
      secondary: projected,
      secondaryLabelKey: 'almanacProjectedLabel',
      secondaryIsProjection: approximate,
      hasProjection: approximate,
      calendarNoteOn: sourceIsHijri ? 'lead' : 'none',
    };
  }

  return {
    lead: projected,
    leadIsProjection: approximate,
    secondary: recorded,
    secondaryLabelKey: 'almanacSourceLabel',
    secondaryIsProjection: false,
    hasProjection: approximate,
    calendarNoteOn: sourceIsHijri ? 'secondary' : 'none',
  };
}
