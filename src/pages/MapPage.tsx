import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Shrine } from '../types/shrine';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ShrineMap } from '../components/map/ShrineMap';
import { MapSidebar } from '../components/map/MapSidebar';
import 'leaflet/dist/leaflet.css';

/** Read/write `?selected=<slug>` without triggering a react-router re-render. */
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

export default function MapPage() {
  const { shrines, loading, error, refresh } = useShrineData();
  const { t, isRTL } = useLang();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 768px)').matches);
  const initializedRef = useRef(false);
  const selectedIdRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = t('siteTitle');
  }, [t]);

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

  // Escape collapses the sheet on mobile, hides it on desktop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
        if (!isMobile) setSelectedId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen, isMobile]);

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

  return (
    <div className="map-root">
      <MapSidebar
        shrines={shrines}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onSelect={handleSelect}
        onRetry={refresh}
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
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
