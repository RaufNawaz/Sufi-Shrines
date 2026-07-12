import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  ZoomControl,
  LayersControl,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { Shrine } from '../../types/shrine';
import type { Tour } from '../../lib/tours/tours';
import { DEFAULT_CENTER, DEFAULT_ZOOM, SIDEBAR_WIDTH } from '../../lib/data/constants';
import { ShrineMarkers } from './ShrineMarkers';
import { TourRoute } from './TourRoute';
import { flyToOrSetView } from './mapMotion';
import { useTheme } from '../../lib/i18n/ThemeContext';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const CARTO_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

interface Props {
  shrines: Shrine[];
  selectedId: number | null;
  onSelect: (shrine: Shrine | null) => void;
  sidebarOpen: boolean;
  isRTL: boolean;
  activeTour: Tour | null;
  activeTourStop: number;
}

// Manages the default tile layer and switches it when dark mode changes.
// Backs off (keeps current layer) once user manually picks from LayersControl.
function ThemeAwareTileLayer({ isDark }: { isDark: boolean }) {
  const map = useMap();
  const stateRef = useRef<{ layer: L.TileLayer | null; userPicked: boolean }>({
    layer: null,
    userPicked: false,
  });

  // Create the initial tile layer on mount
  useEffect(() => {
    const state = stateRef.current;
    state.layer = L.tileLayer(isDark ? CARTO_DARK : CARTO_VOYAGER, {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: CARTO_ATTR,
    }).addTo(map);

    const onBaseLayerChange = () => {
      // User picked a layer from LayersControl — stop managing the tile
      state.userPicked = true;
      state.layer?.remove();
      state.layer = null;
    };
    map.on('baselayerchange', onBaseLayerChange);

    return () => {
      map.off('baselayerchange', onBaseLayerChange);
      state.layer?.remove();
      state.layer = null;
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap URL when dark mode changes (only while we still own the layer)
  useEffect(() => {
    const state = stateRef.current;
    if (!state.layer || state.userPicked) return;
    state.layer.setUrl(isDark ? CARTO_DARK : CARTO_VOYAGER);
  }, [isDark]);

  return null;
}

// Deselects the active shrine when clicking empty map space.
function MapClickDeselect({ onSelect }: { onSelect: (s: Shrine | null) => void }) {
  useMapEvents({
    click: () => onSelect(null),
  });
  return null;
}

// Reset-view Leaflet control (bottom-right, above zoom)
function ResetViewControl({ onSelect }: { onSelect: (s: Shrine | null) => void }) {
  const map = useMap();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/leaflet doesn't type Control.extend()
    const ResetCtrl = (L.Control as any).extend({
      options: { position: 'bottomright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const btn = L.DomUtil.create('a', 'reset-view-btn', container);
        btn.href = '#';
        btn.title = 'Reset view';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', 'Reset map to default view');
        btn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

        L.DomEvent.on(btn, 'click', (e: Event) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          onSelect(null);
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reduced) {
            map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
          } else {
            map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.9 });
          }
        });

        return container;
      },
    });

    const ctrl = new ResetCtrl();
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map, onSelect]);

  return null;
}

// Handles invalidateSize and sidebar-aware flyTo
function MapController({
  shrines,
  selectedId,
  sidebarOpen,
  isRTL,
  tourActive,
}: {
  shrines: Shrine[];
  selectedId: number | null;
  sidebarOpen: boolean;
  isRTL: boolean;
  tourActive: boolean;
}) {
  const map = useMap();

  // Fix gray tiles on resize
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  // flyTo on selection, offset so selected marker isn't hidden behind sidebar on desktop.
  // Skipped while a tour is active — TourRoute owns the camera then (fitBounds on
  // start, flyTo per stop), so this and TourRoute don't fight over the viewport.
  useEffect(() => {
    if (tourActive) return;
    if (selectedId === null) return;
    const shrine = shrines.find((s) => s.id === selectedId);
    if (!shrine) return;

    const targetZoom = Math.max(map.getZoom(), 13);
    const isDesktop = window.innerWidth > 768;

    let flyTarget: L.LatLng | L.LatLngTuple = [shrine.latLng.lat, shrine.latLng.lng];

    if (isDesktop && sidebarOpen) {
      // Offset the map center so the shrine appears in the visible map area (east of sidebar in LTR)
      const targetPt = map.project([shrine.latLng.lat, shrine.latLng.lng], targetZoom);
      const offsetPx = SIDEBAR_WIDTH / 2;
      // LTR: shift center west (subtract x) so shrine appears right-of-center (visible area)
      // RTL: shift center east (add x) because sidebar is on the right
      const adjustedPt = targetPt.add(L.point(isRTL ? offsetPx : -offsetPx, 0));
      flyTarget = map.unproject(adjustedPt, targetZoom);
    }

    flyToOrSetView(map, flyTarget, targetZoom);
  }, [selectedId, shrines, map, sidebarOpen, isRTL, tourActive]);

  return null;
}

export function ShrineMap({
  shrines,
  selectedId,
  onSelect,
  sidebarOpen,
  isRTL,
  activeTour,
  activeTourStop,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const tourStopSlugs = useMemo(
    () => (activeTour ? activeTour.stops.map((s) => s.shrineSlug) : null),
    [activeTour],
  );

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} zoomControl={false}>
      <ThemeAwareTileLayer isDark={isDark} />
      <MapController
        shrines={shrines}
        selectedId={selectedId}
        sidebarOpen={sidebarOpen}
        isRTL={isRTL}
        tourActive={activeTour !== null}
      />
      <ZoomControl position="bottomright" />
      <ResetViewControl onSelect={onSelect} />
      <MapClickDeselect onSelect={onSelect} />

      <LayersControl position="bottomleft">
        <LayersControl.BaseLayer name="Voyager (CARTO)">
          <TileLayer url={CARTO_VOYAGER} subdomains="abcd" maxZoom={20} attribution={CARTO_ATTR} />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Dark (CARTO)">
          <TileLayer url={CARTO_DARK} subdomains="abcd" maxZoom={20} attribution={CARTO_ATTR} />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Streets (Esri)">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution="Tiles &copy; Esri"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite (Esri)">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Light (CARTO)">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            attribution={CARTO_ATTR}
          />
        </LayersControl.BaseLayer>

        {MAPTILER_KEY && (
          <LayersControl.BaseLayer name="Streets (MapTiler)">
            <TileLayer
              url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={20}
              attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap contributors'
            />
          </LayersControl.BaseLayer>
        )}

        {MAPTILER_KEY && (
          <LayersControl.BaseLayer name="Topo (MapTiler)">
            <TileLayer
              url={`https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={20}
              attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>
        )}
      </LayersControl>

      <ShrineMarkers
        shrines={shrines}
        selectedId={selectedId}
        onSelect={onSelect}
        tourStopSlugs={tourStopSlugs}
      />

      {activeTour && (
        <TourRoute
          key={activeTour.id}
          tour={activeTour}
          stopIdx={activeTourStop}
          shrines={shrines}
          sidebarOpen={sidebarOpen}
          isRTL={isRTL}
        />
      )}
    </MapContainer>
  );
}
