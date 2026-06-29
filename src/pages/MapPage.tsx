import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Shrine } from '../types/shrine';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ShrineMap } from '../components/map/ShrineMap';
import { MapSidebar } from '../components/map/MapSidebar';
import 'leaflet/dist/leaflet.css';
import { ERA_MIN, ERA_MAX } from '../lib/data/era';

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
  const url = `${window.location.pathname}?${params.toString()}`;
  if (push) {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
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
  window.history.replaceState(null, '', `${window.location.pathname}?${p}`);
}

export default function MapPage() {
  const { shrines, loading, error, refresh } = useShrineData();
  const { lang, t, isRTL } = useLang();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 768px)').matches);
  const [filters, setFilters] = useState<FilterState>(getFiltersFromURL);
  const initializedRef = useRef(false);
  const selectedIdRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = t('siteTitle');
  }, [t]);

  // Sync filter state to URL (replaceState — no back-button churn for filters)
  useEffect(() => {
    setFiltersInURL(filters);
  }, [filters]);

  // Restore `?selected=<slug>` once shrine data has loaded (runs once)
  useEffect(() => {
    if (initializedRef.current || !shrines.length) return;
    initializedRef.current = true;
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

  // Keep `?selected=` in sync when selectedId changes
  useEffect(() => {
    if (!initializedRef.current) return; // don't touch URL during restore phase
    if (selectedId === selectedIdRef.current) return;
    selectedIdRef.current = selectedId;

    const shrine = selectedId !== null ? shrines.find((s) => s.id === selectedId) : null;
    const prev = getSelectedSlug();
    const next = shrine?.slug ?? null;

    if (prev !== next) {
      // pushState for selection changes so back/forward works as expected
      setSelectedSlug(next, true);
    }
  }, [selectedId, shrines]);

  // Handle back/forward browser navigation — re-apply selected state from URL
  useEffect(() => {
    const handler = () => {
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

  return (
    <div className="map-root">
      {/* Screen-reader shrine directory — visually hidden, announced as a landmark */}
      <nav
        id="shrine-directory"
        className="sr-only"
        aria-label={lang === 'ur' ? 'مزارات کی فہرست' : 'Shrine directory'}
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
        />
      </main>

      {/* Desktop sidebar toggle when sidebar is collapsed */}
      {!isMobile && !sidebarOpen && (
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
