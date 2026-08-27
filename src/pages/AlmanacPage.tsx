import React, { useEffect, useMemo } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link, useSearchParams } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { localizeObservance } from '../lib/i18n/localizeObservance';
import { ObservanceCard } from '../components/almanac/ObservanceCard';
import { AlmanacCalendar } from '../components/almanac/AlmanacCalendar';
import { buildAlmanac, groupByMonth, type AlmanacEntry } from '../lib/data/almanac';
import { buildIcs } from '../lib/data/almanacIcs';
import { downloadIcsFile } from '../lib/data/icsDownload';
import { gregorianMonthName, SEASON_LABEL_KEYS } from '../lib/i18n/formatDateWindow';

import { isRtlLang } from '../lib/i18n/languages';

/** How many entries the "Coming up" rail shows before the month listing. */
const UPCOMING_COUNT = 5;

/** The two ways the next twelve months can be read. */
const VIEWS = ['list', 'calendar'] as const;
type AlmanacView = (typeof VIEWS)[number];

const VIEW_LABEL_KEYS = {
  list: 'almanacViewList',
  calendar: 'almanacViewCalendar',
} as const satisfies Record<AlmanacView, string>;

export default function AlmanacPage() {
  const { shrines, loading } = useShrineData();
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();

  useDocumentTitle(`${t('almanacTitle')} — ${t('siteTitle')}`);

  // `today` is pinned to the day so the memo doesn't rebuild on every render.
  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const almanac = useMemo(() => buildAlmanac(shrines, today), [shrines, today]);
  const months = useMemo(() => groupByMonth(almanac.dated), [almanac.dated]);
  const upcoming = almanac.dated.slice(0, UPCOMING_COUNT);

  /* Which view, in the URL rather than in component state.
   *
   * The map's filters are URL-param-backed so a filtered view is shareable, and
   * the same argument holds here: "look at the calendar for this" is a sentence
   * someone will want to send. `replace` on the write, so switching views does
   * not fill the back button with view changes. An unknown value falls back to
   * the list, which is the view that existed before this one. */
  const [params, setParams] = useSearchParams();
  const viewParam = params.get('view');
  const view: AlmanacView = VIEWS.includes(viewParam as AlmanacView)
    ? (viewParam as AlmanacView)
    : 'list';
  const setView = (next: AlmanacView) => {
    const updated = new URLSearchParams(params);
    if (next === 'list') updated.delete('view');
    else updated.set('view', next);
    setParams(updated, { replace: true });
  };

  // A shrine's first entry in the year listing carries id=<slug>, so the
  // shrine page's "See it in the Urs Almanac" deep link has somewhere to
  // land. First occurrence only — ids must stay unique when a Hijri
  // observance appears twice in one Gregorian year.
  const anchorEntry = useMemo(() => {
    const first = new Map<string, AlmanacEntry>();
    for (const entry of almanac.dated) {
      if (!first.has(entry.shrine.slug)) first.set(entry.shrine.slug, entry);
    }
    return first;
  }, [almanac.dated]);

  // Client-side navigation keeps the hash but does not scroll to it.
  useEffect(() => {
    const slug = window.location.hash.slice(1);
    if (!slug || almanac.dated.length === 0) return;
    document.getElementById(slug)?.scrollIntoView({ block: 'start' });
  }, [almanac.dated.length]);

  /* Month numbers appearing more than once across the window — the twelve-month
     span wraps, so its first and last group share a name. */
  const repeatedMonthNames = useMemo(() => {
    const counts = new Map<number, number>();
    for (const group of months) counts.set(group.month, (counts.get(group.month) ?? 0) + 1);
    return new Set([...counts].filter(([, n]) => n > 1).map(([month]) => month));
  }, [months]);

  const downloadIcs = () => {
    const ics = buildIcs(almanac.dated, {
      baseUrl: `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, ''),
      now: new Date(),
    });
    downloadIcsFile(ics, 'urs-almanac.ics');
  };

  const { counts } = almanac;

  return (
    <div className="page-enter entity-page-wrapper">
      <EntityPageHeader title={t('almanacTitle')} />

      <article
        className="entity-page almanac-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li aria-current="page">{t('almanacTitle')}</li>
          </ol>
        </nav>

        <h1 ref={headingRef} className="entity-title">
          {t('almanacTitle')}
        </h1>
        <p className="almanac-intro">{t('almanacIntro')}</p>

        {/* ── The honest header ────────────────────────────────────────────
            Coverage comes before the calendar, not after it. A reader who
            sees twenty-odd dates should know immediately that they are
            twenty-odd out of a hundred and sixty-nine. */}
        <section className="almanac-coverage" aria-labelledby="almanac-coverage-heading">
          <h2 id="almanac-coverage-heading" className="almanac-section-heading">
            {t('almanacCoverageHeading')}
          </h2>
          <ul className="almanac-coverage-list">
            {(
              [
                ['dayPrecision', 'almanacCoverageDayPrecision', 'day'],
                ['monthPrecision', 'almanacCoverageMonthPrecision', 'month'],
                ['seasonal', 'almanacCoverageSeasonal', 'season'],
                ['undated', 'almanacCoverageUndated', 'undated'],
                ['noObservance', 'almanacCoverageNone', 'none'],
              ] as const
            ).map(([key, labelKey, variant]) => (
              <li key={key} className={`almanac-coverage-item almanac-coverage-item--${variant}`}>
                <span className="almanac-coverage-count">{fmtNum(counts[key])}</span>
                <span className="almanac-coverage-label">{t(labelKey)}</span>
              </li>
            ))}
          </ul>
          <p className="almanac-coverage-total">
            {fmtNum(
              tFn(
                lang,
                'almanacCoverageTotal',
                counts.dayPrecision + counts.monthPrecision,
                counts.totalShrines,
              ),
            )}
          </p>
        </section>

        <aside className="almanac-note" aria-labelledby="almanac-honesty-heading">
          <h2 id="almanac-honesty-heading" className="almanac-note-heading">
            {t('almanacHonestyHeading')}
          </h2>
          <p>{t('almanacApproximateNote')}</p>
        </aside>

        {loading && almanac.dated.length === 0 ? null : (
          <>
            {upcoming.length > 0 && (
              <section aria-labelledby="almanac-upcoming-heading">
                <h2 id="almanac-upcoming-heading" className="almanac-section-heading">
                  {t('almanacUpcoming')}
                </h2>
                <ul className="almanac-list almanac-list--upcoming stagger-in">
                  {upcoming.map((entry, i) => (
                    <ObservanceCard
                      key={`${entry.shrine.slug}-${i}`}
                      entry={entry}
                      lang={lang}
                      index={i}
                    />
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="almanac-year-heading">
              <div className="almanac-year-header">
                <h2 id="almanac-year-heading" className="almanac-section-heading">
                  {t('almanacNext12Months')}
                </h2>
                {almanac.dated.length > 0 && (
                  <button type="button" className="action-btn" onClick={downloadIcs}>
                    {t('almanacDownloadIcs')}
                  </button>
                )}
              </div>
              <p className="almanac-hint">{t('almanacDownloadIcsHint')}</p>

              {/* List or grid. The same records either way — the calendar reads
                  `almanac.dated` and renders the same card component, so the
                  approximate flag and the recorded-date line cannot be present
                  in one view and missing in the other. */}
              {almanac.dated.length > 0 && (
                <div
                  className="filter-chips almanac-view-toggle"
                  role="group"
                  aria-label={t('ariaAlmanacView')}
                >
                  {VIEWS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`filter-chip${view === option ? ' active' : ''}`}
                      onClick={() => setView(option)}
                      aria-pressed={view === option}
                    >
                      {t(VIEW_LABEL_KEYS[option])}
                    </button>
                  ))}
                </div>
              )}

              {view === 'calendar' && (
                <>
                  <p className="almanac-hint">{t('almanacCalendarNote')}</p>
                  <AlmanacCalendar entries={almanac.dated} today={today} />
                </>
              )}

              {/* Twelve month sections is a long scroll to reach next spring.
                  Anchor links rather than a scripted scroller: they work
                  without JavaScript, they are focusable and announced as links,
                  and `scroll-behavior: smooth` on the container gives the
                  motion — which `prefers-reduced-motion` then removes for free,
                  because the browser honours it for scrolling natively.

                  The month rail and the twelve listings belong to the list
                  view. The calendar paginates a month at a time and carries its
                  own; rendering both would put two month navigations on one
                  page pointing at different things. */}
              {view === 'list' && (
                <>
                  {months.length > 1 && (
                    <nav className="almanac-month-nav" aria-label={t('almanacJumpToMonth')}>
                      <span className="almanac-month-nav-label">{t('almanacJumpToMonth')}</span>
                      <ul className="almanac-month-nav-list">
                        {months.map((group) => (
                          <li key={`nav-${group.year}-${group.month}`}>
                            <a href={`#almanac-${group.year}-${group.month}`}>
                              {gregorianMonthName(group.month, lang)}
                              {/* A twelve-month window starts and ends in the same
                              month, so two pills read "August" — the year is
                              what tells them apart, and is shown only on the
                              names that actually repeat. */}
                              {repeatedMonthNames.has(group.month) && (
                                <span className="almanac-month-nav-year">{fmtNum(group.year)}</span>
                              )}
                              <span className="almanac-month-nav-count">
                                {fmtNum(group.entries.length)}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  )}

                  {months.length === 0 ? (
                    <p className="almanac-empty">{t('almanacNothingUpcoming')}</p>
                  ) : (
                    months.map((group) => (
                      <div
                        key={`${group.year}-${group.month}`}
                        id={`almanac-${group.year}-${group.month}`}
                        className="almanac-month"
                      >
                        <h3 className="almanac-month-heading">
                          {gregorianMonthName(group.month, lang)} {fmtNum(group.year)}
                        </h3>
                        <ul className="almanac-list">
                          {group.entries.map((entry, i) => (
                            <ObservanceCard
                              key={`${entry.shrine.slug}-${i}`}
                              entry={entry}
                              lang={lang}
                              anchorId={
                                anchorEntry.get(entry.shrine.slug) === entry
                                  ? entry.shrine.slug
                                  : undefined
                              }
                              index={i}
                            />
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </>
              )}
            </section>

            {almanac.seasonal.length > 0 && (
              <section aria-labelledby="almanac-seasonal-heading">
                <h2 id="almanac-seasonal-heading" className="almanac-section-heading">
                  {t('almanacSeasonalHeading')}
                </h2>
                <p className="almanac-hint">{t('almanacSeasonalNote')}</p>
                <ul className="almanac-list almanac-list--plain inset-list">
                  {almanac.seasonal.map((entry, i) => (
                    <li key={`${entry.shrine.slug}-${i}`} className="inset-row inset-row--link">
                      <Link to={`/shrine/${entry.shrine.slug}`}>
                        <span className="almanac-season-tag">
                          {t(SEASON_LABEL_KEYS[entry.season])}
                        </span>
                        <span className="inset-row-label">
                          <bdi>{localizeShrineName(entry.shrine, lang)}</bdi>
                        </span>
                        <span className="inset-row-chevron" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── The gap, given the same weight as the data ───────────────
                This section is the point of the feature as much as the
                calendar is: 79 shrines hold an observance nobody wrote a
                date for, and listing them by name is what turns a silence
                into something a reader can help fix. */}
            {almanac.undated.length > 0 && (
              <section aria-labelledby="almanac-undated-heading">
                <h2 id="almanac-undated-heading" className="almanac-section-heading">
                  {t('almanacUndatedHeading')}{' '}
                  <span className="almanac-section-count">({fmtNum(almanac.undated.length)})</span>
                </h2>
                <p className="almanac-hint">{t('almanacUndatedNote')}</p>
                <ul className="almanac-list almanac-list--plain almanac-list--undated inset-list">
                  {almanac.undated.map((entry) => (
                    <li key={entry.shrine.slug} className="inset-row inset-row--link">
                      <Link to={`/shrine/${entry.shrine.slug}`}>
                        <span className="inset-row-label inset-row-label--stacked">
                          <span className="inset-row-title">
                            <bdi>{localizeShrineName(entry.shrine, lang)}</bdi>
                          </span>
                          {/* The observance as the sheet records it — "Annual urs",
                          "Maha Shivratri", "Sikh pilgrimage; Guru Nanak
                          Gurpurab". Semicolon-joined, so localizeObservance
                          translates it segment by segment and leaves an unknown
                          segment exactly as written (RULE 2 — show what the
                          source says). `data-latin` declares whatever is left,
                          so e2e/urdu-no-leak.spec.ts counts the remaining debt
                          rather than waving it through. */}
                          <span className="almanac-plain-source inset-row-sub" data-latin>
                            {/* fmtNum, like every other number site: a translated
                            observance carries the recorded dates with it
                            ("سالانہ عرس (18-20 صفر)"), and Western digits inside
                            Nastaliq is the i18n rule 5 gap this render site had.
                            The infobox's own Events row has always gone through
                            fmtNum; this one did not. */}
                            <bdi>{fmtNum(localizeObservance(entry.sourceText, lang))}</bdi>
                          </span>
                        </span>
                        <span className="inset-row-chevron" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="almanac-contribute">{t('almanacContribute')}</p>
              </section>
            )}
          </>
        )}
        <SiteFooter />
      </article>
    </div>
  );
}
