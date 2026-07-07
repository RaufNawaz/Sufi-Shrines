import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Shrine } from '../types/shrine';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ShrineMap } from '../components/map/ShrineMap';
import { MapSidebar } from '../components/map/MapSidebar';
import 'leaflet/dist/leaflet.css';
import { ERA_MIN, ERA_MAX } from '../lib/data/era';
import { TOURS } from '../lib/tours/tours';
import { recordTourStop, recordTourCompleted } from '../lib/tours/tourProgress';

/** Guided tours are opt-in: hidden unless the user flips the toggle on. */
const TOURS_STORAGE_KEY = 'shrines_tours';

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

interface FilterState {
  category: string;
  region: string;
  saint: string;
  eraMin: number;
  eraMax: number;
}

function getFiltersFromURL(): FilterState {
  const p = new URLSearchParams(window.location.search);
  return {
    category: p.get('category') || '',
    region: p.get('region') || '',
    saint: p.get('saint') || '',
    eraMin: parseInt(p.get('eraMin') || '', 10) || ERA_MIN,
    eraMax: parseInt(p.get('eraMax') || '', 10) || ERA_MAX,
  };
}

function setFiltersInURL(filters: FilterState): void {
  const p = new URLSearchParams(window.location.search);
  if (filters.category) p.set('category', filters.category); else p.delete('category');
  if (filters.region) p.set('region', filters.region); else p.delete('region');
  if (filters.saint) p.set('saint', filters.saint); else p.delete('saint');
  if (filters.eraMin !== ERA_MIN) p.set('eraMin', String(filters.eraMin)); else p.delete('eraMin');
  if (filters.eraMax !== ERA_MAX) p.set('eraMax', String(filters.eraMax)); else p.delete('eraMax');
  const qs = p.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

export default function MapPage() {
  const { shrines, loading, error, refresh } = useShrineData();
  const { t, isRTL } = useLang();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isEmbed] = useState(isEmbedMode);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => isEmbedMode() || !window.matchMedia('(max-width: 768px)').matches,
  );
  const [filters, setFilters] = useState<FilterState>(getFiltersFromURL);
  const [toursEnabled, setToursEnabled] = useState(() => localStorage.getItem(TOURS_STORAGE_KEY) === 'on');
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [tourStopIdx, setTourStopIdx] = useState(0);
  const initializedRef = useRef(false);
  const selectedIdRef = useRef<number | null>(null);
  const activeTourIdRef = useRef<string | null>(null);
  const tourStopIdxRef = useRef(0);

  useEffect(() => {
    document.title = t('siteTitle');
  }, [t]);

  // Sync filter state to URL (replaceState — no back-button churn for filters)
  useEffect(() => {
    setFiltersInURL(filters);
  }, [filters]);

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
        localStorage.setItem(TOURS_STORAGE_KEY, 'on');
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
        setSelectedId(shrine.id);
        if (isMobile) setSidebarOpen(true);
      } else {
        // Slug no longer valid — clean it from the URL silently
        setSelectedSlug(null, false);
      }
    }
  }, [shrines, isMobile]);

  // Keep the URL in sync with selection/tour state in a single pushState per
  // change — a tour owns `?tour=`/`?stop=` and clears `?selected=` while
  // active; ending a tour falls back to reflecting the last-viewed shrine.
  useEffect(() => {
    if (!initializedRef.current) return;
    const tourChanged = activeTourId !== activeTourIdRef.current || tourStopIdx !== tourStopIdxRef.current;
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
      if (shrine) params.set('selected', shrine.slug); else params.delete('selected');
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
        setSelectedId(null);
        selectedIdRef.current = null;
        return;
      }
      const shrine = shrines.find((s) => s.slug === slug);
      if (shrine && shrine.id !== selectedIdRef.current) {
        setSelectedId(shrine.id);
        selectedIdRef.current = shrine.id;
        if (isMobile) setSidebarOpen(true);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [shrines, isMobile]);

  // Escape: collapse sidebar + deselect shrine
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sidebarOpen) setSidebarOpen(false);
      setSelectedId(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  const handleSelect = useCallback(
    (shrine: Shrine | null) => {
      setSelectedId(shrine?.id ?? null);
      if (shrine && isMobile) setSidebarOpen(true);
    },
    [isMobile],
  );

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
    if (!isMobile) setSelectedId(null);
  }, [isMobile]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setFilters((f) => ({ ...f, category }));
  }, []);

  const handleRegionChange = useCallback((region: string) => {
    setFilters((f) => ({ ...f, region }));
  }, []);

  const handleSaintChange = useCallback((saint: string) => {
    setFilters((f) => ({ ...f, saint }));
  }, []);

  const handleEraChange = useCallback((range: [number, number]) => {
    setFilters((f) => ({ ...f, eraMin: range[0], eraMax: range[1] }));
  }, []);

  const activeTour = useMemo(
    () => (activeTourId ? TOURS.find((t) => t.id === activeTourId) ?? null : null),
    [activeTourId],
  );

  const activeTourShrine = useMemo(() => {
    if (!activeTour) return null;
    const stop = activeTour.stops[tourStopIdx];
    return stop ? shrines.find((s) => s.slug === stop.shrineSlug) ?? null : null;
  }, [activeTour, tourStopIdx, shrines]);

  // Advance map selection when tour stop changes
  useEffect(() => {
    if (activeTourShrine) setSelectedId(activeTourShrine.id);
  }, [activeTourShrine]);

  const handleToursToggle = useCallback((enabled: boolean) => {
    setToursEnabled(enabled);
    localStorage.setItem(TOURS_STORAGE_KEY, enabled ? 'on' : 'off');
    if (!enabled) {
      setActiveTourId(null);
      setTourStopIdx(0);
    }
  }, []);

  const handleStartTour = useCallback((tourId: string) => {
    if (!toursEnabled) return;
    setActiveTourId(tourId);
    setTourStopIdx(0);
    setSidebarOpen(true);
  }, [toursEnabled]);

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
    setSelectedId(null);
  }, []);

  return (
    <div className="map-root">
      {/* Screen-reader shrine directory — visually hidden, announced as a landmark */}
      <nav
        id="shrine-directory"
        className="sr-only"
        aria-label={t('shrineDirectoryLabel')}
      >
        <ol>
          {shrines.map((s) => (
            <li key={s.id}>
              <a href={`/shrine/${s.slug}`}>{s.name}{s.location ? ` — ${s.location}` : ''}</a>
            </li>
          ))}
        </ol>
      </nav>

      <MapSidebar
        shrines={shrines}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onSelect={handleSelect}
        onRetry={refresh}
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
        activeCategory={filters.category}
        onCategoryChange={handleCategoryChange}
        activeRegion={filters.region}
        onRegionChange={handleRegionChange}
        activeSaint={filters.saint}
        onSaintChange={handleSaintChange}
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
        aria-label="Interactive shrine map"
        onClick={isMobile && sidebarOpen ? handleSidebarClose : undefined}
      >
        <ShrineMap
          shrines={shrines}
          selectedId={selectedId}
          onSelect={handleSelect}
          sidebarOpen={sidebarOpen}
          isRTL={isRTL}
          activeTour={activeTour}
          activeTourStop={tourStopIdx}
        />
      </main>

      {/* Desktop sidebar toggle when sidebar is collapsed */}
      {!isMobile && !sidebarOpen && !isEmbed && (
        <button
          className="sidebar-toggle no-print"
          onClick={handleSidebarToggle}
          aria-label="Open sidebar"
          aria-expanded={false}
          aria-controls="sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
