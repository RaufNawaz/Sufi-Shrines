import React, { useCallback, useEffect, useState } from 'react';
import type { Shrine } from '../types/shrine';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { ShrineMap } from '../components/map/ShrineMap';
import { MapSidebar } from '../components/map/MapSidebar';
import 'leaflet/dist/leaflet.css';

export default function MapPage() {
  const { shrines, loading, error, refresh } = useShrineData();
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Update page title
  useEffect(() => {
    document.title = t('siteTitle');
  }, [t]);

  // Close sidebar with Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
        setSelectedId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  const handleSelect = useCallback((shrine: Shrine | null) => {
    setSelectedId(shrine?.id ?? null);
    if (shrine && window.innerWidth <= 768) setSidebarOpen(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
    setSelectedId(null);
  }, []);

  return (
    <div className="map-root">
      {/* Mobile sidebar toggle */}
      <button
        className="sidebar-toggle no-print"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={sidebarOpen}
        aria-controls="sidebar"
        style={{ display: window.innerWidth <= 768 ? undefined : 'none' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <MapSidebar
        shrines={shrines}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onSelect={handleSelect}
        onRetry={refresh}
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
      />

      <main className="map-container" id="main-content" aria-label="Interactive shrine map">
        <ShrineMap
          shrines={shrines}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </main>

      {/* Mobile overlay to close sidebar */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 'calc(var(--z-sidebar) - 1)' as string,
          }}
          onClick={handleSidebarClose}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
