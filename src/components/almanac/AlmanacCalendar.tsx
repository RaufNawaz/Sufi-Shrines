import React, { useEffect, useId, useMemo, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import {
  gregorianMonthName,
  WEEKDAY_NAMES_LONG,
  WEEKDAY_NAMES_SHORT,
} from '../../lib/i18n/formatDateWindow';
import { categoryKey } from '../../lib/data/categoryKey';
import {
  buildCalendarMonths,
  monthEntries,
  type CalendarDay,
} from '../../lib/data/almanacCalendar';
import type { AlmanacEntry } from '../../lib/data/almanac';
import { ObservanceCard } from './ObservanceCard';

/**
 * The Urs Calendar as a compact month card beside an agenda — the shape
 * Apple's Calendar and date pickers use, asked for on 9 October 2026 (Rauf).
 *
 * **The card.** The month as a grid of numbers in a rounded card: no cell
 * borders, the neighbouring months' days quiet and inert, today's number in
 * the accent with a thin ring, the chosen day a filled disc, and under any day
 * that has an observance up to three small dots in the traditions' colours —
 * hollow where the date is a Hijri projection. A day is a button at every
 * width; the dots are what the card says, the agenda is where it says it.
 *
 * **The agenda.** Beside the card on a wide screen, under it on a phone: the
 * chosen day's observances as cards, or, with no day chosen, every observance
 * the month places on a day. So nothing is hidden behind a tap — the month's
 * list is the default — and choosing a day narrows it.
 *
 * **What is not drawn, and why.** The rule from `almanacCalendar.ts`: a square
 * is a day, so only an observance the archive recorded with a day reaches one.
 * Month-only observances sit in a strip beneath, unplaced. A multi-day window
 * ("18–20 Safar") puts a dot on each day it covers; the card in the agenda
 * prints the window itself. The public view prints the moon-sighting caveat
 * once under the card rather than a badge on every projected date
 * (11 September 2026); the project team still sees the badges.
 *
 * **History.** Until 8 October 2026 this was a Google-Calendar month grid with
 * bars spanning the days a window covered, stacked in lanes (`layoutWeek`,
 * still in `almanacCalendar.ts` with its tests). The bars went with the
 * redesign: a dot per covered day says the same thing, and a 26rem card has no
 * room for names.
 */

/** Dots a day shows before it stops counting — three is what fits under a
 *  two-digit number without widening the disc. */
const MAX_DOTS = 3;

const isoOf = (date: Date) => date.toISOString().slice(0, 10);

export function AlmanacCalendar({
  entries,
  today,
  horizonDays,
  headingId,
  toolbarEnd,
  showApproximateFlags,
  children,
}: {
  /** `almanac.dated` — projected, ordered, already honest about approximation. */
  entries: AlmanacEntry[];
  /** Injected, not read from the clock, so this is prerenderable and testable. */
  today: Date;
  horizonDays?: number | undefined;
  /** The id the page's section is labelled by; it goes on the month heading. */
  headingId?: string;
  /** View switch, .ics and filter controls, rendered on the toolbar row above the card. */
  toolbarEnd?: React.ReactNode;
  /** Per-entry "approximate" pills on cards; false for the public view. */
  showApproximateFlags: boolean;
  /** Rendered between the toolbar and the card — the filter panel. */
  children?: React.ReactNode;
}) {
  const { lang, t, fmtNum } = useLang();
  const agendaId = useId();

  const months = useMemo(
    () => buildCalendarMonths(entries, today, horizonDays),
    [entries, today, horizonDays],
  );

  const [cursor, setCursor] = useState(0);
  /** ISO day of the chosen cell, or null for the whole month. */
  const [selected, setSelected] = useState<string | null>(null);

  const month = months[Math.min(cursor, months.length - 1)];
  const monthName = month ? gregorianMonthName(month.month, lang) : '';

  /* A new month, or new data under the card, invalidates the choice: a day
     chosen in October means nothing in November. */
  useEffect(() => {
    setSelected(null);
  }, [cursor, entries]);

  const agenda = useMemo(() => (month ? monthEntries(month) : []), [month]);

  if (!month) return null;

  const goTo = (next: number) => setCursor(Math.max(0, Math.min(next, months.length - 1)));

  const monthTitle = `${monthName} ${fmtNum(month.year)}`;
  const dateTitle = (cell: CalendarDay) => `${fmtNum(cell.day)} ${monthName} ${fmtNum(month.year)}`;

  /** What a screen reader hears on a day: the date, then the count. */
  const dayLabel = (cell: CalendarDay) =>
    `${dateTitle(cell)} — ${fmtNum(tFn(lang, 'almanacCalendarDayCount', cell.entries.length))}`;

  const selectedCell = selected
    ? month.weeks.flat().find((cell) => isoOf(cell.date) === selected)
    : undefined;

  const listed = selectedCell ? selectedCell.entries : agenda;
  const anyProjected = entries.some((entry) => entry.approximate);

  return (
    <div className="almanac-calendar">
      {toolbarEnd ? (
        <div className="almanac-cal-toolbar">
          <div className="almanac-cal-toolbar-end">{toolbarEnd}</div>
        </div>
      ) : null}

      {children}

      <div className="almanac-cal-layout">
        <section className="almanac-cal-card" aria-labelledby={headingId}>
          <div className="almanac-cal-head">
            <h2 id={headingId} className="almanac-cal-title" aria-live="polite">
              {monthTitle}
            </h2>
            <div className="almanac-cal-nav" role="group" aria-label={t('almanacJumpToMonth')}>
              <button
                type="button"
                className="almanac-cal-today"
                onClick={() => goTo(0)}
                disabled={cursor === 0}
              >
                {t('almanacToday')}
              </button>
              <button
                type="button"
                className="almanac-cal-step"
                aria-label={t('almanacCalendarPrev')}
                onClick={() => goTo(cursor - 1)}
                disabled={cursor === 0}
              >
                <svg
                  className="almanac-cal-chevron almanac-cal-chevron--prev"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="almanac-cal-step"
                aria-label={t('almanacCalendarNext')}
                onClick={() => goTo(cursor + 1)}
                disabled={cursor >= months.length - 1}
              >
                <svg
                  className="almanac-cal-chevron almanac-cal-chevron--next"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* A real table: a calendar is tabular data, and a screen reader
              reading "Wednesday, 14" out of a grid of divs depends on markup
              nobody wrote. */}
          <table className="almanac-calendar-grid">
            <caption className="sr-only">
              {monthTitle} — {t('almanacCalendarCaption')}.{' '}
              {fmtNum(tFn(lang, 'almanacCalendarPlaced', month.placed))}
            </caption>
            <thead>
              <tr>
                {WEEKDAY_NAMES_SHORT[lang].map((name, i) => (
                  <th key={name} scope="col" abbr={WEEKDAY_NAMES_LONG[lang][i]}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {month.weeks.map((week, w) => (
                <tr key={w}>
                  {week.map((cell) => {
                    const iso = isoOf(cell.date);
                    const marked = cell.inMonth && cell.entries.length > 0;
                    const isSelected = selected === iso;
                    return (
                      <td
                        key={iso}
                        // The ring marking today is a visual convention; this
                        // is what says so to a screen reader.
                        aria-current={cell.isToday ? 'date' : undefined}
                        className={[
                          'almanac-calendar-cell',
                          cell.inMonth ? '' : 'almanac-calendar-cell--outside',
                          cell.isToday ? 'almanac-calendar-cell--today' : '',
                          marked ? 'almanac-calendar-cell--marked' : '',
                          isSelected ? 'almanac-calendar-cell--selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {cell.inMonth ? (
                          <button
                            type="button"
                            className="almanac-cal-day"
                            aria-label={dayLabel(cell)}
                            aria-pressed={isSelected}
                            onClick={() => setSelected(isSelected ? null : iso)}
                          >
                            <span className="almanac-cal-daynum">{fmtNum(cell.day)}</span>
                            <span className="almanac-cal-dots" aria-hidden="true">
                              {cell.entries.slice(0, MAX_DOTS).map((entry, i) => (
                                <span
                                  key={`${entry.shrine.slug}-${i}`}
                                  className={`almanac-cal-dot almanac-cal-dot--${categoryKey(entry.shrine.category)}${entry.approximate ? ' almanac-cal-dot--approximate' : ''}`}
                                />
                              ))}
                            </span>
                          </button>
                        ) : (
                          /* The neighbouring month's day: a number, quiet, and
                             not a control — the next month is one chevron away. */
                          <span
                            className="almanac-cal-day almanac-cal-day--outside"
                            aria-hidden="true"
                          >
                            <span className="almanac-cal-daynum">{fmtNum(cell.day)}</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* The caveat, once. In the team view the cards carry it per date. */}
          {!showApproximateFlags && anyProjected ? (
            <p className="almanac-cal-caveat">{t('almanacProjectedCaveat')}</p>
          ) : null}
        </section>

        <section className="almanac-cal-agenda" aria-labelledby={agendaId}>
          <div className="almanac-cal-agenda-head">
            <div>
              <h3 id={agendaId} className="almanac-cal-agenda-title">
                {selectedCell ? dateTitle(selectedCell) : monthTitle}
              </h3>
              <p className="almanac-cal-agenda-count">
                {selectedCell
                  ? fmtNum(tFn(lang, 'almanacCalendarDayCount', selectedCell.entries.length))
                  : fmtNum(tFn(lang, 'almanacCalendarPlaced', month.placed))}
              </p>
            </div>
            {selectedCell ? (
              <button type="button" className="action-btn" onClick={() => setSelected(null)}>
                {t('almanacCalendarShowMonth')}
              </button>
            ) : null}
          </div>
          {listed.length > 0 ? (
            <ul className="almanac-list">
              {listed.map((entry, i) => (
                <ObservanceCard
                  key={`${entry.shrine.slug}-${isoOf(entry.window.start)}-${i}`}
                  entry={entry}
                  lang={lang}
                  index={i}
                  showApproximateFlag={showApproximateFlags}
                  compact
                />
              ))}
            </ul>
          ) : (
            <p className="almanac-empty">
              {selectedCell ? t('almanacCalendarDayEmpty') : t('almanacCalendarNoDays')}
            </p>
          )}
        </section>
      </div>

      {/* ── Recorded to the month, and therefore on no square ─────────────── */}
      {month.monthOnly.length > 0 && (
        <section className="almanac-calendar-unplaced" aria-labelledby={`unplaced-${month.month}`}>
          <h3 id={`unplaced-${month.month}`} className="almanac-calendar-unplaced-heading">
            {t('almanacCalendarUnplacedHeading')}
          </h3>
          <p className="almanac-hint">{t('almanacCalendarUnplacedNote')}</p>
          <ul className="almanac-list">
            {month.monthOnly.map((entry, i) => (
              <ObservanceCard
                key={`unplaced-${entry.shrine.slug}-${i}`}
                entry={entry}
                lang={lang}
                index={i}
                showApproximateFlag={showApproximateFlags}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
