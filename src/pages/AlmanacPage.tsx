import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { primaryFigureSlug } from '../lib/kgShrineFigures';
import { buildAlmanac, groupByMonth, type AlmanacEntry } from '../lib/data/almanac';
import { buildIcs } from '../lib/data/almanacIcs';
import {
  formatDateWindow,
  formatSourceDate,
  gregorianMonthName,
} from '../lib/i18n/formatDateWindow';
import type { Season } from '../lib/data/ursDates';
import type { Lang } from '../types/shrine';

const SEASON_KEYS = {
  spring: 'almanacSeasonSpring',
  summer: 'almanacSeasonSummer',
  autumn: 'almanacSeasonAutumn',
  winter: 'almanacSeasonWinter',
} as const satisfies Record<Season, string>;

/** How many entries the "Coming up" rail shows before the month listing. */
const UPCOMING_COUNT = 5;

function ObservanceCard({
  entry,
  lang,
  index = 0,
}: {
  entry: AlmanacEntry;
  lang: Lang;
  /** Position in its list, for the entrance stagger. */
  index?: number;
}) {
  const { t, fmtNum, localizeField } = useLang();
  const { shrine, observance, window, approximate } = entry;
  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const monthOnly = observance.precision === 'month';
  // An ʿurs is a death anniversary, so the figure it commemorates is the point
  // of the entry — and now that the knowledge graph is populated, the reader
  // can go straight from "whose ʿurs is this week" to that figure's lineage
  // and order. The name comes from the sheet (the reader's own language via
  // localizeField); only the link target comes from the graph, via the 11 KB
  // shrine → figure index rather than the whole graph (see kgShrineFigures.ts).
  const figureName = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const figureSlug = primaryFigureSlug(shrine.slug);

  return (
    <li
      className="almanac-entry reveal-rise"
      style={{ '--stagger-index': index } as React.CSSProperties}
    >
      <div className="almanac-entry-date">
        <span className="almanac-entry-date-main">
          {formatDateWindow(window, lang, fmtNum, { monthOnly })}
        </span>
        {approximate ? (
          <span
            className="almanac-flag almanac-flag--approximate"
            title={t('almanacApproximateFull')}
          >
            {t('almanacApproximate')}
          </span>
        ) : null}
      </div>

      <div className="almanac-entry-body">
        <h3 className="almanac-entry-name">
          <Link to={`/shrine/${shrine.slug}`}>
            <bdi>{localizeShrineName(shrine, lang)}</bdi>
          </Link>
        </h3>
        {location ? (
          /* The CSS clamps this to two lines because several field-survey rows
             carry a paragraph of qualification in the Location column rather
             than a place name. `title` is what makes the clamped remainder
             reachable — without it the qualification, which is the honest part,
             was simply unreadable. */
          <p className="almanac-entry-location" title={location}>
            <bdi>{location}</bdi>
          </p>
        ) : null}

        {figureName ? (
          <p className="almanac-entry-figure">
            <span className="almanac-entry-source-label">{t('almanacFigureLabel')}: </span>
            {figureSlug ? (
              <Link to={`/saint/${figureSlug}`}>
                <bdi>{figureName}</bdi>
              </Link>
            ) : (
              <bdi>{figureName}</bdi>
            )}
          </p>
        ) : null}

        {/* What the archive actually recorded, always shown beside what we
            computed from it — the reader can check our arithmetic. */}
        <p className="almanac-entry-source">
          <span className="almanac-entry-source-label">{t('almanacSourceLabel')}: </span>
          <bdi>
            {formatSourceDate(
              observance.calendar,
              observance.month,
              observance.monthEnd,
              observance.dayStart,
              observance.dayEnd,
              lang,
              fmtNum,
            )}
          </bdi>
          {observance.calendar === 'hijri' ? (
            <span className="almanac-entry-calendar"> ({t('almanacHijriLabel')})</span>
          ) : null}
        </p>

        {observance.ruleBased ? (
          <p className="almanac-entry-caveat">{t('almanacRule')}</p>
        ) : monthOnly ? (
          <p className="almanac-entry-caveat">{t('almanacMonthOnly')}</p>
        ) : null}
      </div>
    </li>
  );
}

export default function AlmanacPage() {
  const { shrines, loading } = useShrineData();
  const { lang, t, fmtNum } = useLang();
  const isRtl = lang === 'ur';
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

  const downloadIcs = () => {
    const ics = buildIcs(almanac.dated, {
      baseUrl: `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, ''),
      now: new Date(),
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'urs-almanac.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const { counts } = almanac;

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <header className="shrine-page-header no-print">
        <Link to="/" className="back-link" aria-label={t('backToMap')}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('backToMap')}
        </Link>
        <div className="shrine-page-header-actions">
          <DarkModeToggle />
          <LanguageToggle />
        </div>
      </header>

      <article
        className="entity-page almanac-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label="Breadcrumb">
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
            {fmtNum(counts.dayPrecision + counts.monthPrecision)} {t('almanacCoverageOf')}{' '}
            {fmtNum(counts.totalShrines)} {t('almanacCoverageSites')}
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
                <ul className="almanac-list almanac-list--upcoming">
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

              {months.length === 0 ? (
                <p className="almanac-empty">{t('almanacNothingUpcoming')}</p>
              ) : (
                months.map((group) => (
                  <div key={`${group.year}-${group.month}`} className="almanac-month">
                    <h3 className="almanac-month-heading">
                      {gregorianMonthName(group.month, lang)} {fmtNum(group.year)}
                    </h3>
                    <ul className="almanac-list">
                      {group.entries.map((entry, i) => (
                        <ObservanceCard
                          key={`${entry.shrine.slug}-${i}`}
                          entry={entry}
                          lang={lang}
                          index={i}
                        />
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>

            {almanac.seasonal.length > 0 && (
              <section aria-labelledby="almanac-seasonal-heading">
                <h2 id="almanac-seasonal-heading" className="almanac-section-heading">
                  {t('almanacSeasonalHeading')}
                </h2>
                <p className="almanac-hint">{t('almanacSeasonalNote')}</p>
                <ul className="almanac-list almanac-list--plain">
                  {almanac.seasonal.map((entry, i) => (
                    <li key={`${entry.shrine.slug}-${i}`} className="almanac-plain-entry">
                      <span className="almanac-season-tag">{t(SEASON_KEYS[entry.season])}</span>
                      <Link to={`/shrine/${entry.shrine.slug}`}>
                        <bdi>{localizeShrineName(entry.shrine, lang)}</bdi>
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
                <ul className="almanac-list almanac-list--plain almanac-list--undated">
                  {almanac.undated.map((entry) => (
                    <li key={entry.shrine.slug} className="almanac-plain-entry">
                      <Link to={`/shrine/${entry.shrine.slug}`}>
                        <bdi>{localizeShrineName(entry.shrine, lang)}</bdi>
                      </Link>
                      <span className="almanac-plain-source">
                        <bdi>{entry.sourceText}</bdi>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="almanac-contribute">{t('almanacContribute')}</p>
              </section>
            )}
          </>
        )}
      </article>
    </div>
  );
}
