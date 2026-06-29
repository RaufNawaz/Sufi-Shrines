import React, { useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { translateToUrdu } from '../../lib/i18n/urduFallback';

interface Props {
  shrines: Shrine[];
  selectedId: number | null;
  onSelect: (shrine: Shrine | null) => void;
}

function buildDivIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="shrine-dot${selected ? ' selected' : ''}" role="button" tabindex="0" aria-pressed="${selected}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10],
  });
}

export function ShrineMarkers({ shrines, selectedId, onSelect }: Props) {
  const map = useMap();
  const { lang, isRTL } = useLang();

  const handleClick = useCallback(
    (shrine: Shrine) => {
      onSelect(shrine.id === selectedId ? null : shrine);
    },
    [selectedId, onSelect],
  );

  // Use imperative Leaflet since react-leaflet divIcon + click events are cleaner this way
  React.useEffect(() => {
    const leafletMarkers: L.Marker[] = [];

    for (const shrine of shrines) {
      const isSelected = shrine.id === selectedId;
      const icon = buildDivIcon(isSelected);
      const localName =
        lang === 'ur'
          ? getUrduFieldValue(shrine.raw, 'Name') ||
            translateToUrdu(getFieldValue(shrine.raw, 'Name'))
          : shrine.name;

      const marker = L.marker([shrine.latLng.lat, shrine.latLng.lng], {
        icon,
        title: localName,
        alt: localName,
      });

      marker.on('click', () => handleClick(shrine));

      // Keyboard support
      marker.on('add', () => {
        const el = marker.getElement();
        if (!el) return;
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', localName);
        el.setAttribute('aria-pressed', String(isSelected));
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(shrine);
          }
        });
      });

      marker.addTo(map);
      leafletMarkers.push(marker);
    }

    return () => {
      for (const m of leafletMarkers) m.remove();
    };
  }, [shrines, selectedId, map, handleClick, lang, isRTL]);

  return null;
}
