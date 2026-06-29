import React, { useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl, LayersControl, useMap } from 'react-leaflet';
import type { Shrine } from '../../types/shrine';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../lib/data/constants';
import { ShrineMarkers } from './ShrineMarkers';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

interface Props {
  shrines: Shrine[];
  selectedId: number | null;
  onSelect: (shrine: Shrine | null) => void;
}

// Bug 2+3: MapController handles flyTo-on-select and invalidateSize via ResizeObserver
function MapController({ shrines, selectedId }: { shrines: Shrine[]; selectedId: number | null }) {
  const map = useMap();

  // Fix gray tiles: invalidateSize on mount + whenever container resizes
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  // Fix no-zoom on select: flyTo with zoom ≥ 13; respect prefers-reduced-motion
  useEffect(() => {
    if (selectedId === null) return;
    const shrine = shrines.find((s) => s.id === selectedId);
    if (!shrine) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetZoom = Math.max(map.getZoom(), 13);
    if (reducedMotion) {
      map.setView([shrine.latLng.lat, shrine.latLng.lng], targetZoom);
    } else {
      map.flyTo([shrine.latLng.lat, shrine.latLng.lng], targetZoom, {
        duration: 0.9,
        easeLinearity: 0.25,
      });
    }
  }, [selectedId, shrines, map]);

  return null;
}

export function ShrineMap({ shrines, selectedId, onSelect }: Props) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <MapController shrines={shrines} selectedId={selectedId} />
      <ZoomControl position="bottomright" />

      <LayersControl position="bottomleft">
        {/* Default: CARTO Voyager — free, no key, ODbL */}
        <LayersControl.BaseLayer checked name="Voyager (CARTO)">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          />
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
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
              attribution='&copy; MapTiler &copy; OpenStreetMap contributors'
            />
          </LayersControl.BaseLayer>
        )}
      </LayersControl>

      <ShrineMarkers shrines={shrines} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
