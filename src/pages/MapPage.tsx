import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../types/shrine';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ShrineMap } from '../components/map/ShrineMap';
import { MapSidebar } from '../components/map/MapSidebar';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { ERA_MIN, ERA_MAX } from '../lib/data/era';
import { filterShrines } from '../lib/data/shrineFilters';
import { useSavedShrines } from '../lib/savedShrines';
import { CATEGORY_ORDER, categoryKey } from '../lib/data/categoryKey';
import type { CategoryKey } from '../lib/data/categoryKey';
import { TOURS } from '../lib/tours/tours';
import { recordTourStop, recordTourCompleted } from '../lib/tours/tourProgress';
// Guided tours are opt-in: hidden unless the reader turns them on, here or in
// /settings. Both surfaces go through toursPreference so they cannot disagree
// about what counts as "on".
import { readToursEnabled, writeToursEnabled } from '../lib/toursPreference';
import { parseSharedList, importSharedList } from '../lib/sharedList';
import { buildSharedGroundOverview } from '../lib/data/sharedGround';

/** Drop the one-shot ?list= param after the reader acts on the banner. */
function clearListParam(): void {
  const p = new URLSearchParams(window.location.search);
  p.delete('list');
  const qs = p.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

/** Read/write URL params without triggering a react-router re-render. */
function getSelectedSlug(): string | null {
  return new URLSearchParams(window.location.search).get('selected');
}

function setSelectedSlug(slug: string | null, push: boolean): void {
  const params = new URLSearchParams(window.location.search);
  if (slug) {
    params.set('selected', slug);
  } else {
    params.delete('selected');
  }
  const qs = params.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  if (push) {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
}

/** Read/write `?tour=<id>&stop=<n>` the same way as `?selected=`. */
function getTourParams(): { tourId: string | null; stopIdx: number } {
  const p = new URLSearchParams(window.location.search);
  const stopRaw = parseInt(p.get('stop') || '0', 10);
  return { tourId: p.get('tour'), stopIdx: Number.isFinite(stopRaw) && stopRaw >= 0 ? stopRaw : 0 };
}

function setTourParams(tourId: string | null, stopIdx: number, push: boolean): void {
  const params = new URLSearchParams(window.location.search);
  if (tourId) {
    params.set('tour', tourId);
    params.set('stop', String(stopIdx));
  } else {
    params.delete('tour');
    params.delete('stop');
  }
  const qs = params.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  if (push) {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
}

/** `?embed=1` renders the tour with minimal chrome, suitable for an iframe. */
function isEmbedMode(): boolean {
  return new URLSearchParams(window.location.search).get('embed') === '1';
}

/**
 * `?lens=shared-ground` opens the map with the shared-ground lens on.
 *
 * A param rather than a stored preference, and deliberately: the lens answers
 * one question, and a reader who arrives at the map tomorrow expecting their
 * archive should not find two thirds of it greyed out because they turned
 * something on last week. It is in the URL so `/shared-ground` can hand the
 * reader straight to it, and so that view is linkable — which is the whole
 * reason the tour and the filters are in the URL too.
 */
const SHARED_GROUND_LENS = 'shared-ground';

function getLensFromURL(): boolean {
  return new URLSearchParams(window.location.search).get('lens') === SHARED_GROUND_LENS;
}

function setLensInURL(on: boolean): void {
  const p = new URLSearchParams(window.location.search);
  if (on) p.set('lens', SHARED_GROUND_LENS);
  else p.delete('lens');
  const qs = p.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

interface FilterState {
  /** Selected category keys (CategoryKey values). Empty = all categories
   * shown — the additive all-on default. */
  categories: CategoryKey[];
  /** Show only support_level = Field-verified sites. */
  verifiedOnly: boolean;
  savedOnly: boolean;
  region: string;
  eraMin: number;
  eraMax: number;
}

/** Parse `?category=` into category keys. Accepts a comma-separated list of
 * keys, plus legacy single-value links that hold a raw sheet value
 * ("Muslim Shrine") — those normalize through categoryKey(). */
function parseCategoryParam(raw: string | null): CategoryKey[] {
  if (!raw) return [];
  const keys = new Set<CategoryKey>();
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!value) continue;
    if ((CATEGORY_ORDER as string[]).includes(value)) keys.add(value as CategoryKey);
    else if (categoryKey(value) !== 'default') keys.add(categoryKey(value));
  }
  return CATEGORY_ORDER.filter((k) => keys.has(k));
}

function getFiltersFromURL(): FilterState {
  const p = new URLSearchParams(window.location.search);
  return {
    categories: parseCategoryParam(p.get('category')),
    verifiedOnly: p.get('info') === 'verified',
    savedOnly: p.get('saved') === '1',
    region: p.get('region') || '',
    eraMin: parseInt(p.get('eraMin') || '', 10) || ERA_MIN,
    eraMax: parseInt(p.get('eraMax') || '', 10) || ERA_MAX,
  };
}

function setFiltersInURL(filters: FilterState): void {
  const p = new URLSearchParams(window.location.search);
  if (filters.categories.length) p.set('category', filters.categories.join(','));
  else p.delete('category');
  if (filters.verifiedOnly) p.set('info', 'verified');
  else p.delete('info');
  if (filters.savedOnly) p.set('saved', '1');
  else p.delete('saved');
  if (filters.region) p.set('region', filters.region);
  else p.delete('region');
  if (filters.eraMin !== ERA_MIN) p.set('eraMin', String(filters.eraMin));
  else p.delete('eraMin');
  if (filters.eraMax !== ERA_MAX) p.set('eraMax', String(filters.eraMax));
  else p.delete('eraMax');
  const qs = p.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

export default function MapPage() {
  const { shrines, loading, error, offline, sourceTimestamp, refresh } = useShrineData();
  const { t, isRTL, lang, localizeField } = useLang();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isEmbed] = useState(isEmbedMode);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => isEmbedMode() || !window.matchMedia('(max-width: 768px)').matches,
  );
  const [filters, setFilters] = useState<FilterState>(getFiltersFromURL);
  // A shared list (?list=) is a one-shot payload, not a persisted filter:
  // it lives in state from the URL and is cleared on add/dismiss.
  const [sharedSlugs, setSharedSlugs] = useState<string[]>(() =>
    parseSharedList(window.location.search),
  );
  const [sharedGroundLens, setSharedGroundLens] = useState(getLensFromURL);
  const [toursEnabled, setToursEnabled] = useState(readToursEnabled);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [tourStopIdx, setTourStopIdx] = useState(0);
  const initializedRef = useRef(false);
  const selectedIdRef = useRef<number | null>(null);
  /**
   * The slug of the selected shrine — its durable identity.
   *
   * `selectedId` is not one. `buildShrines` numbers rows by position
   * (`.map((row, i) => buildShrine(row, i))`), and this route swaps its dataset
   * underneath itself twice on a cold load: the slim map index first, then the
   * sheet. The sheet has 171 rows where the bundled snapshot has 169, and the
   * two extra rows are not at the end — so **index 24 is Data Darbar in one
   * array and Dargah of Pir Muhammad Rashid in the other.**
   *
   * Measured on a production build before this ref existed:
   * `/?selected=data-darbar` rendered "Data Darbar" at 0.7s and "Dargah of Pir
   * Muhammad Rashid (Roze Dhani), Pir Jo Goth" at 2.1s, with the address bar
   * still reading `data-darbar` and nothing on screen saying anything had
   * changed. A link someone shared opened a different shrine in a different
   * province, silently, which for an archive whose case rests on citability is
   * the worst shape a bug can take.
   *
   * `id` cannot simply be made stable: the legacy `/shrine/id-N` URLs resolve
   * against the sheet's row number and are published. So the id stays a cache
   * and the slug is the identity, re-resolved whenever the dataset changes.
   */
  const selectedSlugRef = useRef<string | null>(null);
  const activeTourIdRef = useRef<string | null>(null);
  const tourStopIdxRef = useRef(0);

  useDocumentTitle(t('siteTitle'));

  // Sync filter state to URL (replaceState — no back-button churn for filters)
  useEffect(() => {
    setFiltersInURL(filters);
  }, [filters]);

  // Same treatment as the filters: replaceState, so toggling a lens on and off
  // does not fill the reader's back button with map states.
  useEffect(() => {
    setLensInURL(sharedGroundLens);
  }, [sharedGroundLens]);

  /* One sweep, two consumers: the map draws these and the sidebar counts them.
     Gated on the lens because it is ~0.6 ms per load on a laptop and the map is
     the front door — the route whose TBT this project spent a session taking
     from 1,386 ms to ~87 ms. Empty array when off, which is also how ShrineMap
     knows the lens is not running. */
  /*
   * The shrines the map draws — the filters applied, the search not.
   *
   * These filters used to be applied only inside `MapSidebar`, so the map never
   * saw them. Measured on the running site, 30 August 2026: `/?category=jain`
   * reported "3 of 171 sites" in the list and drew **169 markers**; so did
   * every other filter. That is worse than a filter that does nothing, because
   * `setFiltersInURL` above puts these in the address bar deliberately so a
   * reader can share the view they are looking at — and what they shared was a
   * link promising a filter and delivering the whole archive.
   *
   * `filterShrines` is the one implementation, called from here and from the
   * sidebar. Two call sites, one function: the distinction is the whole lesson
   * of `searchDocs.ts`, which had five tests pinning it while production ran a
   * second, drifted copy.
   *
   * The search query is deliberately not applied here — see shrineFilters.ts.
   */
  const savedSlugs = useSavedShrines();
  const mapShrines = useMemo(
    () =>
      filterShrines(shrines, filters, {
        savedSlugs,
        sharedSlugs,
        hasEraFilter: filters.eraMin !== ERA_MIN || filters.eraMax !== ERA_MAX,
      }),
    [shrines, filters, savedSlugs, sharedSlugs],
  );

  const crossTradition = useMemo(
    () => (sharedGroundLens ? buildSharedGroundOverview(shrines).crossTradition : []),
    [sharedGroundLens, shrines],
  );

  /** Set the selection and remember what it *is*, not just where it sat. */
  const selectShrine = useCallback((shrine: Shrine | null) => {
    selectedSlugRef.current = shrine?.slug ?? null;
    setSelectedId(shrine?.id ?? null);
  }, []);

  /*
   * Re-point the selection at its own shrine when the dataset is replaced.
   *
   * `selectedIdRef` is written here as well as the state, deliberately: the
   * URL-sync effect below fires on `selectedId !== selectedIdRef.current`, and
   * this is the one case where the id changes and the URL must not — the reader
   * is looking at the same shrine they asked for. Writing both leaves that
   * effect with nothing to do and keeps a dataset swap out of the history.
   *
   * A slug that is gone from the new dataset deselects rather than keeping a
   * stale index, because a stale index is precisely how this route showed the
   * wrong shrine. What it does *not* do is tell the reader their link is dead;
   * that silence is a separate defect and its own fix.
   */
  useEffect(() => {
    const slug = selectedSlugRef.current;
    if (!slug || !shrines.length) return;
    const shrine = shrines.find((s) => s.slug === slug) ?? null;
    const nextId = shrine?.id ?? null;
    if (nextId === selectedIdRef.current) return;
    if (!shrine) selectedSlugRef.current = null;
    selectedIdRef.current = nextId;
    setSelectedId(nextId);
  }, [shrines]);

  // Restore `?tour=<id>&stop=<n>` or `?selected=<slug>` once shrine data has
  // loaded (runs once). A tour deep link takes precedence over `?selected=`.
  useEffect(() => {
    if (initializedRef.current || !shrines.length) return;
    initializedRef.current = true;

    const { tourId, stopIdx } = getTourParams();
    if (tourId) {
      const tour = TOURS.find((tr) => tr.id === tourId);
      if (tour) {
        const clampedStop = Math.min(Math.max(stopIdx, 0), tour.stops.length - 1);
        setToursEnabled(true);
        writeToursEnabled(true);
        activeTourIdRef.current = tourId;
        tourStopIdxRef.current = clampedStop;
        setActiveTourId(tourId);
        setTourStopIdx(clampedStop);
        setSidebarOpen(true);
        return;
      }
      // Unknown tour id — clean it from the URL silently
      setTourParams(null, 0, false);
    }

    const slug = getSelectedSlug();
    if (slug) {
      const shrine = shrines.find((s) => s.slug === slug);
      if (shrine) {
        selectShrine(shrine);
        if (isMobile) setSidebarOpen(true);
      } else {
        // Slug no longer valid — clean it from the URL silently
        setSelectedSlug(null, false);
      }
    }
  }, [shrines, isMobile, selectShrine]);

  // Keep the URL in sync with selection/tour state in a single pushState per
  // change — a tour owns `?tour=`/`?stop=` and clears `?selected=` while
  // active; ending a tour falls back to reflecting the last-viewed shrine.
  useEffect(() => {
    if (!initializedRef.current) return;
    const tourChanged =
      activeTourId !== activeTourIdRef.current || tourStopIdx !== tourStopIdxRef.current;
    const selectedChanged = selectedId !== selectedIdRef.current;
    if (!tourChanged && !selectedChanged) return;

    activeTourIdRef.current = activeTourId;
    tourStopIdxRef.current = tourStopIdx;
    selectedIdRef.current = selectedId;

    const params = new URLSearchParams(window.location.search);
    if (activeTourId) {
      params.set('tour', activeTourId);
      params.set('stop', String(tourStopIdx));
      params.delete('selected');
    } else {
      params.delete('tour');
      params.delete('stop');
      const shrine = selectedId !== null ? shrines.find((s) => s.id === selectedId) : null;
      if (shrine) params.set('selected', shrine.slug);
      else params.delete('selected');
    }
    const qs = params.toString();
    window.history.pushState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);

    if (activeTourId) recordTourStop(activeTourId, tourStopIdx);
  }, [activeTourId, tourStopIdx, selectedId, shrines]);

  // Handle back/forward browser navigation — re-apply tour/selected state from URL
  useEffect(() => {
    const handler = () => {
      const { tourId, stopIdx } = getTourParams();
      if (tourId) {
        const tour = TOURS.find((tr) => tr.id === tourId);
        if (tour) {
          const clampedStop = Math.min(Math.max(stopIdx, 0), tour.stops.length - 1);
          activeTourIdRef.current = tourId;
          tourStopIdxRef.current = clampedStop;
          setActiveTourId(tourId);
          setTourStopIdx(clampedStop);
          return;
        }
      }
      activeTourIdRef.current = null;
      setActiveTourId(null);
      setTourStopIdx(0);

      const slug = getSelectedSlug();
      if (!slug) {
        selectShrine(null);
        selectedIdRef.current = null;
        return;
      }
      const shrine = shrines.find((s) => s.slug === slug);
      if (shrine && shrine.id !== selectedIdRef.current) {
        selectShrine(shrine);
        selectedIdRef.current = shrine.id;
        if (isMobile) setSidebarOpen(true);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [shrines, isMobile, selectShrine]);

  // Escape: collapse sidebar + deselect shrine
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sidebarOpen) setSidebarOpen(false);
      selectShrine(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen, selectShrine]);

  const handleSelect = useCallback(
    (shrine: Shrine | null) => {
      selectShrine(shrine);
      if (shrine && isMobile) setSidebarOpen(true);
    },
    [isMobile, selectShrine],
  );

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
    if (!isMobile) selectShrine(null);
  }, [isMobile, selectShrine]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handleCategoriesChange = useCallback((categories: CategoryKey[]) => {
    setFilters((f) => ({ ...f, categories }));
  }, []);

  const handleVerifiedOnlyChange = useCallback((verifiedOnly: boolean) => {
    setFilters((f) => ({ ...f, verifiedOnly }));
  }, []);

  const handleSavedOnlyChange = useCallback((savedOnly: boolean) => {
    setFilters((f) => ({ ...f, savedOnly }));
  }, []);

  const handleRegionChange = useCallback((region: string) => {
    setFilters((f) => ({ ...f, region }));
  }, []);

  const handleEraChange = useCallback((range: [number, number]) => {
    setFilters((f) => ({ ...f, eraMin: range[0], eraMax: range[1] }));
  }, []);

  const activeTour = useMemo(
    () => (activeTourId ? (TOURS.find((t) => t.id === activeTourId) ?? null) : null),
    [activeTourId],
  );

  const activeTourShrine = useMemo(() => {
    if (!activeTour) return null;
    const stop = activeTour.stops[tourStopIdx];
    return stop ? (shrines.find((s) => s.slug === stop.shrineSlug) ?? null) : null;
  }, [activeTour, tourStopIdx, shrines]);

  // Advance map selection when tour stop changes
  useEffect(() => {
    if (activeTourShrine) selectShrine(activeTourShrine);
  }, [activeTourShrine, selectShrine]);

  const handleToursToggle = useCallback((enabled: boolean) => {
    setToursEnabled(enabled);
    writeToursEnabled(enabled);
    if (!enabled) {
      setActiveTourId(null);
      setTourStopIdx(0);
    }
  }, []);

  const handleStartTour = useCallback(
    (tourId: string) => {
      if (!toursEnabled) return;
      setActiveTourId(tourId);
      setTourStopIdx(0);
      setSidebarOpen(true);
    },
    [toursEnabled],
  );

  const handleResumeTour = useCallback((tourId: string, stopIdx: number) => {
    setActiveTourId(tourId);
    setTourStopIdx(stopIdx);
    setSidebarOpen(true);
  }, []);

  const handleTourNext = useCallback(() => {
    if (!activeTour) return;
    if (tourStopIdx < activeTour.stops.length - 1) {
      setTourStopIdx((i) => i + 1);
    } else {
      recordTourCompleted(activeTour.id);
      setActiveTourId(null);
      setTourStopIdx(0);
    }
  }, [activeTour, tourStopIdx]);

  const handleTourPrev = useCallback(() => {
    if (tourStopIdx > 0) setTourStopIdx((i) => i - 1);
  }, [tourStopIdx]);

  const handleTourExit = useCallback(() => {
    setActiveTourId(null);
    setTourStopIdx(0);
    // Return to the neutral list view (not the last stop's shrine preview)
    // so an in-progress tour's "Resume" offer is actually visible.
    selectShrine(null);
  }, [selectShrine]);

  return (
    <div className="map-root">
      {/* Screen-reader shrine directory — visually hidden, announced as a landmark.

          Every entry here was the *English* name and location, on the Urdu site
          too: 169 shrines announced in English in the one part of the interface
          that exists solely for a screen reader. Nothing could see it. The
          no-English-leak guard exempted every `<a>` (this whole list is anchors),
          and being `sr-only` it never appeared in a screenshot either. It now
          reads the same localised name the visible list does, and the location
          through localizeField, exactly as the sidebar rows do. */}
      <nav
        id="shrine-directory"
        tabIndex={-1}
        className="sr-only"
        aria-label={t('shrineDirectoryLabel')}
      >
        <ol>
          {shrines.map((s) => {
            const location = localizeField(s.raw, 'Location') || s.location;
            return (
              <li key={s.id}>
                {/* <Link>, not <a href>. This was a raw `href="/shrine/…"`,
                    which bypasses the router's basename — and production is
                    served from /Sufi-Shrines/, so all 169 links in this landmark
                    404'd on the live site. No test could catch it: `build:e2e`
                    builds with base `/`, which is exactly the configuration
                    where the bug does not exist. */}
                {/* `tabIndex={-1}`: reachable, not tabbable.
                    These 171 links are the first thing a keyboard reader meets
                    on the front door — tab stops 3 through 173, before a single
                    visible control. The container is `sr-only`, whose `clip`
                    applies to the whole subtree, so each focused link is
                    invisible and the page appears frozen while focus travels;
                    measured at **174 tab presses to cross the map**, the first
                    visible stop being "Settings".

                    Removing them from the tab order costs a screen-reader
                    reader nothing: this landmark exists to be *browsed* — with
                    a reading cursor, a rotor, or the skip link that targets the
                    nav itself — and none of those use the Tab sequence. */}
                <Link to={`/shrine/${s.slug}`} tabIndex={-1}>
                  {localizeShrineName(s, lang)}
                  {/* The Location column is often still an English survey note.
                      <bdi> isolates the Latin run so the surrounding Urdu does
                      not reorder around it; `data-latin` is what declares it
                      untranslated for the no-leak guard. */}
                  {location ? (
                    <>
                      {' '}
                      — <bdi data-latin>{location}</bdi>
                    </>
                  ) : (
                    ''
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} variant="overlay" />

      {/* A shared ziyarat list arrived via ?list= — receiving one writes
          nothing; the reader chooses to add it to their own device list. */}
      {sharedSlugs.length > 0 && (
        <div className="shared-list-banner" role="region" aria-label={t('sharedListBannerTitle')}>
          <p className="shared-list-banner-title">{t('sharedListBannerTitle')}</p>
          <p className="shared-list-banner-body">{t('sharedListBannerBody')}</p>
          <div className="shared-list-banner-actions">
            <button
              className="action-btn action-btn--active"
              onClick={() => {
                importSharedList(sharedSlugs);
                setSharedSlugs([]);
                clearListParam();
                setFilters((f) => ({ ...f, savedOnly: true }));
              }}
            >
              {t('sharedListAdd')}
            </button>
            <button
              className="action-btn"
              onClick={() => {
                setSharedSlugs([]);
                clearListParam();
              }}
            >
              {t('sharedListDismiss')}
            </button>
          </div>
        </div>
      )}

      <MapSidebar
        sharedGroundLens={sharedGroundLens}
        onSharedGroundLensChange={setSharedGroundLens}
        crossingCount={crossTradition.length}
        shrines={shrines}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onSelect={handleSelect}
        onRetry={refresh}
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
        activeCategories={filters.categories}
        onCategoriesChange={handleCategoriesChange}
        verifiedOnly={filters.verifiedOnly}
        savedOnly={filters.savedOnly}
        sharedSlugs={sharedSlugs}
        onSavedOnlyChange={handleSavedOnlyChange}
        onVerifiedOnlyChange={handleVerifiedOnlyChange}
        activeRegion={filters.region}
        onRegionChange={handleRegionChange}
        eraMin={filters.eraMin}
        eraMax={filters.eraMax}
        onEraChange={handleEraChange}
        toursEnabled={toursEnabled}
        onToursToggle={handleToursToggle}
        activeTour={activeTour}
        activeTourStop={tourStopIdx}
        activeTourShrine={activeTourShrine}
        onStartTour={handleStartTour}
        onResumeTour={handleResumeTour}
        onTourNext={handleTourNext}
        onTourPrev={handleTourPrev}
        onTourExit={handleTourExit}
        embed={isEmbed}
      />

      <main
        className="map-container"
        id="main-content"
        tabIndex={-1}
        aria-label={t('ariaInteractiveMap')}
        onClick={isMobile && sidebarOpen ? handleSidebarClose : undefined}
      >
        <ShrineMap
          shrines={mapShrines}
          selectedId={selectedId}
          onSelect={handleSelect}
          sidebarOpen={sidebarOpen}
          isRTL={isRTL}
          activeTour={activeTour}
          activeTourStop={tourStopIdx}
          crossTradition={crossTradition}
        />
      </main>

      {/* Desktop sidebar toggle when sidebar is collapsed */}
      {!isMobile && !sidebarOpen && !isEmbed && (
        <button
          className="sidebar-toggle no-print"
          onClick={handleSidebarToggle}
          aria-label={t('ariaOpenSidebar')}
          aria-expanded={false}
          aria-controls="sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
