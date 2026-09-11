import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import {
  gregorianMonthName,
  WEEKDAY_NAMES_LONG,
  WEEKDAY_NAMES_SHORT,
} from '../../lib/i18n/formatDateWindow';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { observanceDateDisplay } from '../../lib/i18n/observanceDates';
import { useReaderPreferences } from '../../lib/preferences/ReaderPreferencesContext';
import { categoryKey } from '../../lib/data/categoryKey';
import {
  buildCalendarMonths,
  hiddenInColumn,
  layoutWeek,
  type CalendarDay,
} from '../../lib/data/almanacCalendar';
import type { AlmanacEntry } from '../../lib/data/almanac';
import { ObservanceCard } from './ObservanceCard';
import { ObservancePopover } from './ObservancePopover';

/**
 * The Urs Calendar as a month grid — the shape a reader knows from Google
 * Calendar, with the archive's honesty kept in the layout rather than in prose.
 *
 * **What is drawn.** A day-precise observance is a bar across the days its
 * projected window covers; "18–20 Safar" is one bar over three squares, and a
 * bar that reaches the edge of a week continues on the next row with its start
 * squared off, so it reads as one thing. Overlapping observances stack in
 * lanes (`layoutWeek`, tested). A cell with more bars than fit shows "+N more".
 * Bars are coloured by tradition, with the pale category ground and a solid
 * edge in the category's own colour — the map's legend, carried over.
 *
 * **What is not drawn, and why.** The rule from `almanacCalendar.ts`: a square
 * is a day, so only an observance the archive recorded with a day occupies one.
 * Month-only observances sit in a strip beneath the grid, unplaced. And a Hijri
 * projection is a forecast: those bars are dashed, and the public view prints
 * the moon-sighting caveat once under the grid rather than a badge on every
 * projected date (11 September 2026). The project team still sees the badges.
 *
 * **Navigation.** Today, previous and next — the twelve-month horizon starts in
 * the current month, so "Today" is the first grid. The thirteen-pill month rail
 * this replaced was 440px of chrome on a phone above the thing the page is for.
 *
 * **On a phone** the cells are ~50px wide: a name cannot live there, so each day
 * carries category dots and is a button, and pressing one lists that day's
 * observances beneath the grid. On a desktop the chips are the buttons and open
 * a popover; the day button is not rendered there (CSS `display: none` removes
 * it from the accessibility tree too), so no day ever has two controls.
 */

/** Bars a desktop cell shows before folding the rest into "+N more". */
const MAX_LANES = 3;

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
  /** View switch, .ics and filter controls, rendered at the toolbar's far end. */
  toolbarEnd?: React.ReactNode;
  /** Per-entry "approximate" pills on cards; false for the public view. */
  showApproximateFlags: boolean;
  /** Rendered between the toolbar and the grid — the filter panel. */
  children?: React.ReactNode;
}) {
  const { lang, t, fmtNum } = useLang();
  const { calendar } = useReaderPreferences();
  const rootRef = useRef<HTMLDivElement>(null);

  const months = useMemo(
    () => buildCalendarMonths(entries, today, horizonDays),
    [entries, today, horizonDays],
  );

  const [cursor, setCursor] = useState(0);
  /** ISO day of the phone-selected cell, or null. */
  const [selected, setSelected] = useState<string | null>(null);
  /** The open popover: what it lists, its title, and the control that opened it. */
  const [detail, setDetail] = useState<{
    entries: AlmanacEntry[];
    title: string;
    anchor: HTMLElement;
  } | null>(null);

  const closeDetail = useCallback(() => setDetail(null), []);

  const month = months[Math.min(cursor, months.length - 1)];
  const monthName = month ? gregorianMonthName(month.month, lang) : '';

  /* A new month, or new data under the grid, invalidates both selections —
     a popover anchored to a chip that no longer exists is anchored to nothing. */
  useEffect(() => {
    setDetail(null);
    setSelected(null);
  }, [cursor, entries]);

  if (!month) return null;

  const goTo = (next: number) => setCursor(Math.max(0, Math.min(next, months.length - 1)));

  const dateTitle = (cell: CalendarDay) => `${fmtNum(cell.day)} ${monthName} ${fmtNum(month.year)}`;

  /** What a screen reader hears on a phone day button: the date, then the count. */
  const dayLabel = (cell: CalendarDay) =>
    `${dateTitle(cell)} — ${fmtNum(tFn(lang, 'almanacCalendarDayCount', cell.entries.length))}`;

  const leadDate = (entry: AlmanacEntry) =>
    observanceDateDisplay(entry.observance, entry.window, entry.approximate, lang, fmtNum, calendar)
      .lead;

  const openDetail = (
    e: React.MouseEvent<HTMLButtonElement>,
    list: AlmanacEntry[],
    title: string,
  ) => {
    const anchor = e.currentTarget;
    setDetail((current) => (current?.anchor === anchor ? null : { entries: list, title, anchor }));
  };

  const selectedCell = selected
    ? month.weeks.flat().find((cell) => isoOf(cell.date) === selected)
    : undefined;

  const anyProjected = entries.some((entry) => entry.approximate);

  return (
    <div className="almanac-calendar" ref={rootRef}>
      <div className="almanac-cal-toolbar">
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
          <h2 id={headingId} className="almanac-cal-title" aria-live="polite">
            {monthName} {fmtNum(month.year)}
          </h2>
        </div>
        {toolbarEnd ? <div className="almanac-cal-toolbar-end">{toolbarEnd}</div> : null}
      </div>

      {children}

      {/* A real table: a calendar is tabular data, and a screen reader reading
          "Wednesday, 14" out of a grid of divs depends on markup nobody wrote. */}
      <table className="almanac-calendar-grid">
        <caption className="sr-only">
          {monthName} {fmtNum(month.year)} — {t('almanacCalendarCaption')}.{' '}
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
          {month.weeks.map((week, w) => {
            const layout = layoutWeek(week);
            const lanes = Math.min(layout.lanes, MAX_LANES);
            return (
              <tr key={w} style={{ '--lanes': lanes } as React.CSSProperties}>
                {week.map((cell, col) => {
                  const iso = isoOf(cell.date);
                  const marked = cell.entries.length > 0;
                  const starting = layout.spans.filter(
                    (span) => span.startCol === col && span.lane < MAX_LANES,
                  );
                  const hidden = hiddenInColumn(layout, col, MAX_LANES);
                  return (
                    <td
                      key={iso}
                      // The ring marking today is a visual convention; this is
                      // what says so to a screen reader.
                      aria-current={cell.isToday ? 'date' : undefined}
                      className={[
                        'almanac-calendar-cell',
                        cell.inMonth ? '' : 'almanac-calendar-cell--outside',
                        cell.isToday ? 'almanac-calendar-cell--today' : '',
                        marked ? 'almanac-calendar-cell--marked' : '',
                        selected === iso ? 'almanac-calendar-cell--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="almanac-cal-cell">
                        <span className="almanac-cal-daynum">
                          <span className={cell.isToday ? 'almanac-cal-daynum-today' : undefined}>
                            {fmtNum(cell.day)}
                          </span>
                        </span>
                        {cell.inMonth && marked ? (
                          <>
                            {/* Desktop: the bars. Each is drawn once, in the
                                cell where it starts, and extends across the
                                cells it covers (`--span`); the row reserves
                                `--lanes` of height so every cell in the week
                                lines up. */}
                            <div className="almanac-cal-lanes">
                              {starting.map((span) => {
                                const { entry } = span;
                                const cat = categoryKey(entry.shrine.category);
                                const isOpen =
                                  detail?.entries[0] === entry && detail.entries.length === 1;
                                return (
                                  <button
                                    key={`${entry.shrine.slug}-${isoOf(entry.window.start)}`}
                                    type="button"
                                    data-almanac-chip
                                    className={[
                                      'almanac-cal-chip',
                                      `almanac-cal-chip--${cat}`,
                                      entry.approximate ? 'almanac-cal-chip--approximate' : '',
                                      span.continuesBefore ? 'almanac-cal-chip--from' : '',
                                      span.continuesAfter ? 'almanac-cal-chip--to' : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    style={
                                      {
                                        '--span': span.endCol - span.startCol + 1,
                                        '--lane': span.lane,
                                      } as React.CSSProperties
                                    }
                                    aria-expanded={isOpen}
                                    onClick={(e) => openDetail(e, [entry], dateTitle(cell))}
                                  >
                                    <span className="almanac-cal-chip-name">
                                      <bdi>{localizeShrineName(entry.shrine, lang)}</bdi>
                                    </span>
                                    <span className="sr-only">, {leadDate(entry)}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {hidden > 0 ? (
                              <button
                                type="button"
                                data-almanac-chip
                                className="almanac-cal-more"
                                onClick={(e) => openDetail(e, cell.entries, dateTitle(cell))}
                              >
                                {fmtNum(tFn(lang, 'almanacCalendarMore', hidden))}
                              </button>
                            ) : null}
                            {/* Phone: the whole day is the control, and the
                                dots say which traditions gather. */}
                            <button
                              type="button"
                              className="almanac-cal-daybtn"
                              aria-label={dayLabel(cell)}
                              aria-pressed={selected === iso}
                              onClick={() => setSelected(selected === iso ? null : iso)}
                            >
                              <span className="almanac-cal-dots" aria-hidden="true">
                                {cell.entries.slice(0, 3).map((entry, i) => (
                                  <span
                                    key={`${entry.shrine.slug}-${i}`}
                                    className={`almanac-cal-dot almanac-cal-dot--${categoryKey(entry.shrine.category)}${entry.approximate ? ' almanac-cal-dot--approximate' : ''}`}
                                  />
                                ))}
                              </span>
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* The caveat, once. In the team view the cards carry it per date. */}
      {!showApproximateFlags && anyProjected ? (
        <p className="almanac-cal-caveat">{t('almanacProjectedCaveat')}</p>
      ) : null}

      {detail && rootRef.current ? (
        <ObservancePopover
          entries={detail.entries}
          title={detail.title}
          anchor={detail.anchor}
          container={rootRef.current}
          lang={lang}
          showApproximateFlag={showApproximateFlags}
          onClose={closeDetail}
        />
      ) : null}

      {selectedCell ? (
        <div className="almanac-cal-day-list">
          <div className="almanac-calendar-selection">
            <p className="almanac-calendar-selection-label">{dateTitle(selectedCell)}</p>
            <button type="button" className="action-btn" onClick={() => setSelected(null)}>
              {t('almanacCalendarShowMonth')}
            </button>
          </div>
          {selectedCell.entries.length > 0 ? (
            <ul className="almanac-list">
              {selectedCell.entries.map((entry, i) => (
                <ObservanceCard
                  key={`${entry.shrine.slug}-${i}`}
                  entry={entry}
                  lang={lang}
                  index={i}
                  showApproximateFlag={showApproximateFlags}
                />
              ))}
            </ul>
          ) : (
            <p className="almanac-empty">{t('almanacCalendarNoDays')}</p>
          )}
        </div>
      ) : null}

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
