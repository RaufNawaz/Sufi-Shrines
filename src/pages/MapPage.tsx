import React, { useCallback, useEffect, useState } from 'react';
import type { Shrine } from '../types/shrine';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ShrineMap } from '../components/map/ShrineMap';
import { MapSidebar } from '../components/map/MapSidebar';
import 'leaflet/dist/leaflet.css';

export default function MapPage() {
  const { shrines, loading, error, refresh } = useShrineData();
  const { t, isRTL } = useLang();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Desktop: open = sidebar docked. Mobile: open = sheet expanded; closed = sheet peeking.
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 768px)').matches);

  useEffect(() => {
    document.title = t('siteTitle');
  }, [t]);

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
      // Expand the sheet on mobile when a marker is tapped
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
