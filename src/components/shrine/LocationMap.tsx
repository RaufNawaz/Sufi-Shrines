import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';

interface Props {
  latLng: LatLng;
  name: string;
}

// Custom marker matching the shrine-dot style; CSS vars work in DOM innerHTML
const miniMarkerIcon = L.divIcon({
  className: '',
  html: `<div class="mini-marker-dot"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function buildDirectionsUrl(lat: number, lng: number): string {
  if (/iPhone|iPad|Mac/i.test(navigator.userAgent)) {
    return `maps://maps.apple.com/?daddr=${lat},${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function LocationMap({ latLng, name }: Props) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const coords = `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;

  async function copyCoords() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(coords);
      } else {
        const ta = document.createElement('textarea');
        ta.value = coords;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  }

  async function shareLocation() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `${name} — ${coords}`,
          url: buildMapsUrl(latLng.lat, latLng.lng),
        });
        return;
      } catch {
        // fall through to clipboard copy
      }
    }
    copyCoords();
  }

  return (
    <section className="location-section article-section" id="location" aria-labelledby="location-heading">
      <h2 className="article-section-heading" id="location-heading">
        {t('locationMap')}
      </h2>

      {/* Leaflet mini-map: non-interactive-but-zoomable, CARTO Voyager */}
      <MapContainer
        center={[latLng.lat, latLng.lng]}
        zoom={14}
        className="location-map-embed"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={true}
        attributionControl={true}
        aria-label={`Map showing location of ${name}`}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <Marker position={[latLng.lat, latLng.lng]} icon={miniMarkerIcon} title={name} />
      </MapContainer>

      <div className="location-actions">
        <a
          href={buildDirectionsUrl(latLng.lat, latLng.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="action-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          {t('getDirections')}
        </a>

        <button className="action-btn" onClick={copyCoords} aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? t('coordinatesCopied') : t('copyCoordinates')}
        </button>

        {typeof navigator.share === 'function' && (
          <button className="action-btn" onClick={shareLocation}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {t('share')}
          </button>
        )}
      </div>

      <p className="location-coords">
        {t('coordinatesLabel')}: {coords}
      </p>
    </section>
  );
}
