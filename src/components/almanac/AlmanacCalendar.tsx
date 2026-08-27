import React, { useMemo, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import {
  gregorianMonthName,
  WEEKDAY_NAMES_LONG,
  WEEKDAY_NAMES_SHORT,
} from '../../lib/i18n/formatDateWindow';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import {
  buildCalendarMonths,
  monthEntries,
  type CalendarDay,
} from '../../lib/data/almanacCalendar';
import type { AlmanacEntry } from '../../lib/data/almanac';
import { ObservanceCard } from './ObservanceCard';

/**
 * The almanac on a month grid.
 *
 * A list can leave a date vague; a square cannot. So the honesty this page
 * already carries in prose is carried here by the layout instead, and the rule
 * lives in `almanacCalendar.ts` where it can be tested: **only an observance
 * recorded with a day gets a day.** The ten recorded to a month alone are listed
 * under the grid, unplaced, because the honest position of an undated ʿurs is
 * not the 1st and not the 15th — it is off the grid.
 *
 * One month at a time rather than twelve stacked grids. Twelve is 3,000-odd
 * pixels of mostly empty squares — 22 of the archive's 169 sites carry a
 * day-precise date — and what a grid is for is the shape of one month.
 *
 * That made prev/next enough while the calendar was a view a reader opted into
 * halfway down the page. It is not enough now that the grid opens the page: a
 * reader who wants next April should not press "Later" seven times to see it.
 * So the horizon's months are a rail above the grid, each with the count of
 * observances that month can actually place — which doubles as the one thing
 * prev/next could never show, the *shape of the year*: where the ʿurs season
 * falls and where the archive simply has nothing.
 *
 * A day carrying observances is a button, and pressing it narrows the cards
 * beneath to that day. That is what makes the grid useful on a phone, where the
 * cells are too narrow to name anything: the grid says *when*, the cards say
 * *what*, and the two are the same records rather than two renderings of them.
 */
export function AlmanacCalendar({
  entries,
  today,
  horizonDays,
}: {
  /** `almanac.dated` — projected, ordered, already honest about approximation. */
  entries: AlmanacEntry[];
  /** Injected, not read from the clock, so this is prerenderable and testable. */
  today: Date;
  horizonDays?: number | undefined;
}) {
  const { lang, t, fmtNum } = useLang();
  const months = useMemo(
    () => buildCalendarMonths(entries, today, horizonDays),
    [entries, today, horizonDays],
  );
  /* Month numbers appearing twice across the horizon — the window wraps, so its
     first and last month share a name and only the year separates them. */
  const repeatedMonths = useMemo(() => {
    const counts = new Map<number, number>();
    for (const m of months) counts.set(m.month, (counts.get(m.month) ?? 0) + 1);
    return new Set([...counts].filter(([, n]) => n > 1).map(([month]) => month));
  }, [months]);

  const [cursor, setCursor] = useState(0);
  /** ISO day of the selected cell, or null for the whole month. */
  const [selected, setSelected] = useState<string | null>(null);

  const month = months[Math.min(cursor, months.length - 1)];
  if (!month) return null;

  const monthName = gregorianMonthName(month.month, lang);
  const shown = monthEntries(month);
  const selectedCell = selected
    ? month.weeks.flat().find((cell) => cell.date.toISOString().slice(0, 10) === selected)
    : undefined;
  const cards = selectedCell ? selectedCell.entries : shown;

  const goTo = (next: number) => {
    setCursor(next);
    // A day selected in August means nothing in September.
    setSelected(null);
  };

  /** What a screen reader hears on a day button: the date, then the count. */
  const dayLabel = (cell: CalendarDay) =>
    `${fmtNum(cell.day)} ${monthName} — ${fmtNum(tFn(lang, 'almanacCalendarDayCount', cell.entries.length))}`;

  return (
    <div className="almanac-calendar">
      {/* Every month in the horizon, reachable in one press. Buttons rather
          than the list view's anchor links: this moves the grid, not the page,
          so there is nothing to scroll to and an <a href="#…"> would be a lie
          about what pressing it does. */}
      {months.length > 1 && (
        <nav className="almanac-calendar-months" aria-label={t('almanacJumpToMonth')}>
          <ul className="almanac-calendar-months-list">
            {months.map((m, i) => (
              <li key={`${m.year}-${m.month}`}>
                <button
                  type="button"
                  className={[
                    'almanac-calendar-month-btn',
                    i === cursor ? 'almanac-calendar-month-btn--current' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={i === cursor ? 'true' : undefined}
                  onClick={() => goTo(i)}
                >
                  {gregorianMonthName(m.month, lang)}
                  {/* A twelve-month window opens and closes in the same month,
                      so two pills read "August"; the year appears only on the
                      names that actually repeat, as it does in the list view. */}
                  {repeatedMonths.has(m.month) && (
                    <span className="almanac-calendar-month-year">{fmtNum(m.year)}</span>
                  )}
                  {/* `placed`, not `placed + monthOnly`: this counts what the
                      grid beneath will put on a square, and a month-only entry
                      is deliberately on none of them. */}
                  <span className="almanac-calendar-month-count">{fmtNum(m.placed)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="almanac-calendar-header">
        <button
          type="button"
          className="action-btn almanac-calendar-step"
          onClick={() => goTo(cursor - 1)}
          disabled={cursor === 0}
        >
          {t('almanacCalendarPrev')}
        </button>
        <h3 className="almanac-calendar-month" aria-live="polite">
          {monthName} {fmtNum(month.year)}
        </h3>
        <button
          type="button"
          className="action-btn almanac-calendar-step"
          onClick={() => goTo(cursor + 1)}
          disabled={cursor >= months.length - 1}
        >
          {t('almanacCalendarNext')}
        </button>
      </div>

      <p className="almanac-calendar-count">
        {fmtNum(tFn(lang, 'almanacCalendarPlaced', month.placed))}
      </p>

      {/* A real table: a calendar is tabular data, and a screen reader reading
          "Wednesday, 14" out of a grid of divs depends on markup nobody wrote. */}
      <table className="almanac-calendar-grid">
        <caption className="sr-only">
          {monthName} {fmtNum(month.year)} — {t('almanacCalendarCaption')}
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
                const iso = cell.date.toISOString().slice(0, 10);
                const marked = cell.entries.length > 0;
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
                    {!cell.inMonth ? null : marked ? (
                      <button
                        type="button"
                        className="almanac-calendar-day"
                        aria-label={dayLabel(cell)}
                        aria-pressed={selected === iso}
                        onClick={() => setSelected(selected === iso ? null : iso)}
                      >
                        <span className="almanac-calendar-day-number">{fmtNum(cell.day)}</span>
                        {/* The names, where there is room for them. Hidden by
                            CSS on a narrow screen, where the dot and the cards
                            beneath carry it instead — never removed from the
                            DOM, because that would take them out of the
                            accessible name too. */}
                        <span className="almanac-calendar-day-names">
                          {cell.entries.map((entry, i) => (
                            <span key={`${entry.shrine.slug}-${i}`}>
                              <bdi>{localizeShrineName(entry.shrine, lang)}</bdi>
                            </span>
                          ))}
                        </span>
                        <span className="almanac-calendar-dot" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="almanac-calendar-day almanac-calendar-day--empty">
                        <span className="almanac-calendar-day-number">{fmtNum(cell.day)}</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedCell && (
        <div className="almanac-calendar-selection">
          <p className="almanac-calendar-selection-label">
            {fmtNum(selectedCell.day)} {monthName} {fmtNum(month.year)}
          </p>
          <button type="button" className="action-btn" onClick={() => setSelected(null)}>
            {t('almanacCalendarShowMonth')}
          </button>
        </div>
      )}

      {cards.length > 0 ? (
        <ul className="almanac-list">
          {cards.map((entry, i) => (
            <ObservanceCard key={`${entry.shrine.slug}-${i}`} entry={entry} lang={lang} index={i} />
          ))}
        </ul>
      ) : (
        <p className="almanac-empty">{t('almanacCalendarNoDays')}</p>
      )}

      {/* ── Recorded to the month, and therefore on no square ─────────────── */}
      {month.monthOnly.length > 0 && (
        <section className="almanac-calendar-unplaced" aria-labelledby={`unplaced-${month.month}`}>
          <h4 id={`unplaced-${month.month}`} className="almanac-calendar-unplaced-heading">
            {t('almanacCalendarUnplacedHeading')}
          </h4>
          <p className="almanac-hint">{t('almanacCalendarUnplacedNote')}</p>
          <ul className="almanac-list">
            {month.monthOnly.map((entry, i) => (
              <ObservanceCard
                key={`unplaced-${entry.shrine.slug}-${i}`}
                entry={entry}
                lang={lang}
                index={i}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
