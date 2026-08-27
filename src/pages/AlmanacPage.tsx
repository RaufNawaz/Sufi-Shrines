import React, { useEffect, useMemo } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
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
import { placesForShrine } from '../lib/data/places';
import { CATEGORY_LABELS, CATEGORY_ORDER, categoryKey } from '../lib/data/categoryKey';
import { localizeRecordedName } from '../lib/i18n/localizeRecordedName';
import type { CategoryKey } from '../lib/data/categoryKey';

import { isRtlLang } from '../lib/i18n/languages';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';

/** How many entries the "Coming up" rail shows before the month listing. */
const UPCOMING_COUNT = 5;

/** URL keys for the two facets. Short, because they end up in a shared link. */
const CATEGORY_PARAM = 'cat';
const PLACE_PARAM = 'place';

/** Place chips shown before the row has to be expanded.
 *
 * 66 places carry an observance and 38 of them carry exactly one, so the whole
 * row is eight lines of pills on a desktop and considerably worse on a phone.
 * Twelve is where the counts stop being interesting — the thirteenth place has
 * two sites and everything below it has one or two — and every one of them is
 * still reachable, one press away, with the count of what is hidden on the
 * control. Nothing is dropped; the archive does not hide its long tail, it just
 * does not open with it. */
const PLACE_CHIP_LIMIT = 12;

/** The two ways the next twelve months can be read. */
const VIEWS = ['list', 'calendar'] as const;
type AlmanacView = (typeof VIEWS)[number];

const VIEW_LABEL_KEYS = {
  list: 'almanacViewList',
  calendar: 'almanacViewCalendar',
} as const satisfies Record<AlmanacView, string>;

export default function AlmanacPage() {
  const { shrines, loading, offline, sourceTimestamp } = useShrineData();
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();

  useDocumentTitle(`${t('almanacTitle')} — ${t('siteTitle')}`);

  // `today` is pinned to the day so the memo doesn't rebuild on every render.
  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const [params, setParams] = useSearchParams();

  /* ── The two facets ─────────────────────────────────────────────────────
   *
   * Both narrow the *sites the almanac is built from*, not the four lists it
   * produces. That is one line of code instead of four, and — the reason it is
   * done this way — it makes disagreement impossible: the calendar, "Coming
   * up", the month listing, the seasonal and undated lists and the coverage
   * counts are all computed from the same filtered set, so a reader who filters
   * to Lahore reads Lahore's coverage rather than the archive's under Lahore's
   * dates. Filtering the outputs separately would have left the coverage block
   * quietly describing all 169 sites beneath a page showing 35.
   *
   * Additive within a facet and intersecting across them, which is the map
   * sidebar's semantics — two surfaces that filter by tradition should not
   * behave two ways.
   *
   * The counts on the chips are over the whole archive, not over the current
   * selection. Cross-filtering them would be more clever and less useful: a
   * reader who has chosen Lahore wants to know how many Jain sites exist before
   * discovering there are none in Lahore. */
  const activeCategories = useMemo(() => {
    const valid = new Set<string>(CATEGORY_ORDER);
    return (params.get(CATEGORY_PARAM) ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => valid.has(v)) as Exclude<CategoryKey, 'default'>[];
  }, [params]);

  const activePlaces = useMemo(
    () =>
      (params.get(PLACE_PARAM) ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    [params],
  );

  /** Traditions present in the archive, in the canonical chip order. */
  const categoryFacet = useMemo(() => {
    const counts = new Map<Exclude<CategoryKey, 'default'>, number>();
    for (const shrine of shrines) {
      const key = categoryKey(shrine.category);
      if (key === 'default') continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return CATEGORY_ORDER.filter((key) => counts.has(key)).map((key) => ({
      key,
      count: counts.get(key) ?? 0,
    }));
  }, [shrines]);

  /** Places, busiest first — which is also the order the chips are trimmed in. */
  const placeFacet = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    for (const shrine of shrines) {
      for (const place of placesForShrine(shrine)) {
        const seen = counts.get(place.slug);
        if (seen) seen.count += 1;
        else counts.set(place.slug, { slug: place.slug, name: place.name, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [shrines]);

  /* Collapsed by default, and that is the whole reason it is a disclosure.
   *
   * The two chip rows are 180px, and the calendar was moved to the top of this
   * page an hour earlier specifically so it would not be 180px down. A filter
   * nobody has asked for should not cost the thing everybody came for. Open
   * whenever a filter is active — including on a shared link, which is the case
   * that matters: a URL that arrives filtered must show what it is filtered by,
   * or the reader is looking at a partial archive with no visible reason. */
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [allPlacesShown, setAllPlacesShown] = React.useState(false);
  /* A place chosen from the expanded row must stay visible when the row is
     collapsed again, or the reader loses the control that undoes their own
     filter. */
  const visiblePlaces = useMemo(() => {
    if (allPlacesShown) return placeFacet;
    const head = placeFacet.slice(0, PLACE_CHIP_LIMIT);
    const chosen = placeFacet.filter((p) => activePlaces.includes(p.slug) && !head.includes(p));
    return [...head, ...chosen];
  }, [placeFacet, allPlacesShown, activePlaces]);

  const filteredShrines = useMemo(() => {
    if (activeCategories.length === 0 && activePlaces.length === 0) return shrines;
    return shrines.filter((shrine) => {
      if (
        activeCategories.length > 0 &&
        !activeCategories.includes(categoryKey(shrine.category) as Exclude<CategoryKey, 'default'>)
      ) {
        return false;
      }
      if (activePlaces.length === 0) return true;
      return placesForShrine(shrine).some((place) => activePlaces.includes(place.slug));
    });
  }, [shrines, activeCategories, activePlaces]);

  const filtersActive = activeCategories.length > 0 || activePlaces.length > 0;

  const almanac = useMemo(() => buildAlmanac(filteredShrines, today), [filteredShrines, today]);
  const months = useMemo(() => groupByMonth(almanac.dated), [almanac.dated]);
  const upcoming = almanac.dated.slice(0, UPCOMING_COUNT);

  /* Which view, in the URL rather than in component state.
   *
   * The map's filters are URL-param-backed so a filtered view is shareable, and
   * the same argument holds here: "look at the calendar for this" is a sentence
   * someone will want to send. `replace` on the write, so switching views does
   * not fill the back button with view changes.
   *
   * The calendar is the default (26 August 2026, project head): the grid is what
   * the page is for, and everything else on it — coverage, the moon-sighting
   * caveat, the month listing, the two lists of what is undated — is below it to
   * be scrolled to.
   *
   * The exception is a deep link. `/almanac#<shrine-slug>` is written by the
   * shrine page and by the order/figure observance lists, and the anchor it
   * targets exists only in the month listing; opening those on a calendar would
   * land the reader at the top of a grid with no sign of why. A hash with no
   * explicit `?view=` therefore opens the list. An explicit `?view=` always
   * wins, which is why the toggle writes the parameter in both directions
   * rather than deleting it for the default. */
  const { hash } = useLocation();
  const anchorSlug = hash.startsWith('#') ? hash.slice(1) : '';
  const viewParam = params.get('view');
  const view: AlmanacView = VIEWS.includes(viewParam as AlmanacView)
    ? (viewParam as AlmanacView)
    : anchorSlug
      ? 'list'
      : 'calendar';
  const setView = (next: AlmanacView) => {
    const updated = new URLSearchParams(params);
    updated.set('view', next);
    setParams(updated, { replace: true });
  };

  /** Toggle one value of a facet, preserving everything else in the URL. */
  const toggleFacet = (key: string, value: string, current: string[]) => {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const updated = new URLSearchParams(params);
    if (next.length === 0) updated.delete(key);
    else updated.set(key, next.join(','));
    setParams(updated, { replace: true });
  };

  const clearFacet = (key: string) => {
    const updated = new URLSearchParams(params);
    updated.delete(key);
    setParams(updated, { replace: true });
  };

  const clearAllFacets = () => {
    const updated = new URLSearchParams(params);
    updated.delete(CATEGORY_PARAM);
    updated.delete(PLACE_PARAM);
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

  // Client-side navigation keeps the hash but does not scroll to it. Gated on
  // the list view, because that is the only view that renders the anchor.
  useEffect(() => {
    if (!anchorSlug || view !== 'list' || almanac.dated.length === 0) return;
    document.getElementById(anchorSlug)?.scrollIntoView({ block: 'start' });
  }, [anchorSlug, view, almanac.dated.length]);

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
  /* Nothing to show yet: the first paint before the sheet has answered. Coverage
     and the caveat still render — they are true of the archive rather than of
     the fetch. */
  const hasEntries = !(loading && almanac.dated.length === 0);

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

        {/* The date of what the reader is looking at. Self-hides unless a live

            fetch has actually failed — see OfflineDataBanner. */}

        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

        <h1 ref={headingRef} className="entity-title">
          {t('almanacTitle')}
        </h1>
        <p className="almanac-intro">{t('almanacIntro')}</p>

        {/* ── The calendar, first ──────────────────────────────────────────
            This section used to sit third, under the coverage figures and the
            moon-sighting caveat. The reading order was argued for at the time —
            know the denominator before you read the dates — and it was wrong in
            practice: the thing the page is named after was below the fold, and
            two screens of preamble stood in front of it.

            What that argument was protecting is kept, in one line rather than a
            block: the "N of M sites" total is printed with the grid, so the
            denominator still reaches a reader who never scrolls, and the full
            coverage breakdown is a scroll away rather than a gate. */}
        {/* The calendar's slot, held open while the sheet is still answering.
            Without it the coverage tiles and the caveat below — which do render
            immediately, deliberately, because they are true of the archive
            rather than of the fetch — are the only things on screen, and the
            calendar then appears *above* them and pushes them 1,270px and
            2,443px down. Measured 27 August 2026: CLS 0.5208 on /almanac, and
            the calendar section arriving at y=360 in an 844px viewport was all
            of it. Reproduce with
            `node scripts/measure-cls.mjs --sections --route /almanac`.

            Reserving a screen here is not a guess about the grid's height (it
            is 1,269px, and this reserves 844). It only has to keep the coverage
            block below the fold until the thing the page is named after is
            there, which is the same argument the section order above already
            makes. */}
        {!hasEntries && <p className="coverage-loading page-loading-reserve">{t('loading')}</p>}

        {hasEntries && (
          <section className="almanac-lead" aria-labelledby="almanac-year-heading">
            {/* Heading, view switch and the .ics button on one line. They were
                three stacked rows, which is a third of a screen of chrome
                standing between the page title and the grid — affordable when
                the grid was halfway down the page, not when it opens it. */}
            <div className="almanac-year-header">
              <h2 id="almanac-year-heading" className="almanac-section-heading">
                {t('almanacNext12Months')}
              </h2>
              <div className="almanac-year-controls">
                {/* List or grid. The same records either way — the calendar
                    reads `almanac.dated` and renders the same card component,
                    so the approximate flag and the recorded-date line cannot be
                    present in one view and missing in the other. */}
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
                {almanac.dated.length > 0 && (
                  <button type="button" className="action-btn" onClick={downloadIcs}>
                    {t('almanacDownloadIcs')}
                  </button>
                )}
              </div>
            </div>

            {/* ── The two facets ─────────────────────────────────────────
                Above the calendar and the listing both, because they narrow
                what the whole section shows. Additive within a row and
                intersecting across the two, the same semantics the map's
                sidebar uses. */}
            {(categoryFacet.length > 1 || placeFacet.length > 1) && (
              <div className="almanac-facets">
                <div className="almanac-facet-bar">
                  <button
                    type="button"
                    className="action-btn almanac-facet-toggle"
                    onClick={() => setFiltersOpen((v) => !v)}
                    aria-expanded={filtersOpen || filtersActive}
                  >
                    {t('filtersLabel')}
                  </button>
                  {filtersActive && (
                    <span className="almanac-facet-active">
                      {fmtNum(
                        tFn(
                          lang,
                          'activeFiltersCount',
                          activeCategories.length + activePlaces.length,
                        ),
                      )}
                    </span>
                  )}
                  {filtersActive && (
                    <button type="button" className="action-btn" onClick={clearAllFacets}>
                      {t('clearFilters')}
                    </button>
                  )}
                </div>

                {(filtersOpen || filtersActive) && categoryFacet.length > 1 && (
                  <div className="almanac-facet">
                    <span className="filter-section-label" aria-hidden="true">
                      {t('categoryLabel')}
                    </span>
                    <div
                      className="filter-chips"
                      role="group"
                      aria-label={t('ariaFilterByCategory')}
                    >
                      <button
                        type="button"
                        className={`filter-chip${activeCategories.length === 0 ? ' active' : ''}`}
                        onClick={() => clearFacet(CATEGORY_PARAM)}
                        aria-pressed={activeCategories.length === 0}
                      >
                        {t('filterAll')}
                      </button>
                      {categoryFacet.map(({ key, count }) => (
                        <button
                          key={key}
                          type="button"
                          className={`filter-chip${activeCategories.includes(key) ? ' active' : ''}`}
                          onClick={() => toggleFacet(CATEGORY_PARAM, key, activeCategories)}
                          aria-pressed={activeCategories.includes(key)}
                        >
                          {CATEGORY_LABELS[key][lang]}
                          <span className="almanac-facet-count">{fmtNum(count)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(filtersOpen || filtersActive) && placeFacet.length > 1 && (
                  <div className="almanac-facet">
                    <span className="filter-section-label" aria-hidden="true">
                      {t('filterByPlace')}
                    </span>
                    <div className="filter-chips" role="group" aria-label={t('ariaFilterByPlace')}>
                      <button
                        type="button"
                        className={`filter-chip${activePlaces.length === 0 ? ' active' : ''}`}
                        onClick={() => clearFacet(PLACE_PARAM)}
                        aria-pressed={activePlaces.length === 0}
                      >
                        {t('filterAll')}
                      </button>
                      {visiblePlaces.map(({ slug: placeSlug, name, count }) => (
                        <button
                          key={placeSlug}
                          type="button"
                          className={`filter-chip${activePlaces.includes(placeSlug) ? ' active' : ''}`}
                          onClick={() => toggleFacet(PLACE_PARAM, placeSlug, activePlaces)}
                          aria-pressed={activePlaces.includes(placeSlug)}
                        >
                          <bdi>{localizeRecordedName(name, lang)}</bdi>
                          <span className="almanac-facet-count">{fmtNum(count)}</span>
                        </button>
                      ))}
                      {placeFacet.length > visiblePlaces.length || allPlacesShown ? (
                        <button
                          type="button"
                          className="filter-chip almanac-facet-more"
                          onClick={() => setAllPlacesShown((v) => !v)}
                          aria-expanded={allPlacesShown}
                        >
                          {allPlacesShown
                            ? t('almanacFewerPlaces')
                            : fmtNum(
                                tFn(
                                  lang,
                                  'almanacMorePlaces',
                                  placeFacet.length - visiblePlaces.length,
                                ),
                              )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Every section below hides when empty, so a filter matching
                nothing would leave a heading, two controls and a blank page.
                Said out loud instead. */}
            {filtersActive && filteredShrines.length === 0 && (
              <p className="almanac-empty">{t('almanacFilterEmpty')}</p>
            )}

            {view === 'calendar' && (
              <>
                {/* The denominator, carried up from the coverage block below so
                    that the first screen of the page still says how much of the
                    archive the grid can speak for. */}
                <p className="almanac-calendar-denominator">
                  {fmtNum(
                    tFn(
                      lang,
                      'almanacCoverageTotal',
                      counts.dayPrecision + counts.monthPrecision,
                      counts.totalShrines,
                    ),
                  )}
                </p>
                <AlmanacCalendar entries={almanac.dated} today={today} />
                {/* Why some observances are on no square. It read above the
                    grid, where it was a paragraph to get past; it belongs here,
                    where the unplaced list it describes is directly beneath. */}
                <p className="almanac-hint almanac-calendar-rule">{t('almanacCalendarNote')}</p>
              </>
            )}

            {/* Twelve month sections is a long scroll to reach next spring.
                Anchor links rather than a scripted scroller: they work
                without JavaScript, they are focusable and announced as links,
                and `scroll-behavior: smooth` on the container gives the
                motion — which `prefers-reduced-motion` then removes for free,
                because the browser honours it for scrolling natively.

                The month rail and the twelve listings belong to the list
                view. The calendar carries its own month rail, one that moves
                the grid rather than the page; rendering both would put two
                month navigations on one page pointing at different things. */}
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
        )}

        {/* ── What the grid above cannot tell you ──────────────────────────
            Directly beneath the calendar rather than above it: it caveats the
            dates the reader has just looked at, which is where a caveat is
            read. */}
        <aside className="almanac-note" aria-labelledby="almanac-honesty-heading">
          <h2 id="almanac-honesty-heading" className="almanac-note-heading">
            {t('almanacHonestyHeading')}
          </h2>
          <p>{t('almanacApproximateNote')}</p>
        </aside>

        {hasEntries && upcoming.length > 0 && (
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

        {/* ── The honest accounting ────────────────────────────────────────
            Still on the page and still computed from the shipped data on every
            load; no longer the first thing a reader meets. */}
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

        {hasEntries && (
          <>
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
