import React, { useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { translateToUrdu } from '../../lib/i18n/urduFallback';

interface Props {
  shrines: Shrine[];
  selectedId: number | null;
  onSelect: (shrine: Shrine | null) => void;
}

function categoryKey(category: string): 'muslim' | 'hindu' | 'sikh' | 'default' {
  const c = (category || '').toLowerCase();
  if (c.includes('muslim')) return 'muslim';
  if (c.includes('hindu')) return 'hindu';
  if (c.includes('sikh')) return 'sikh';
  return 'default';
}

function buildDivIcon(selected: boolean, category: string): L.DivIcon {
  const catKey = categoryKey(category);
  return L.divIcon({
    className: '',
    html: `<div class="shrine-dot shrine-dot--${catKey}${selected ? ' selected' : ''}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10],
  });
}

export function ShrineMarkers({ shrines, selectedId, onSelect }: Props) {
  const map = useMap();
  const { lang } = useLang();

  // Stable refs so the selectedId effect never needs to rebuild all markers
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMapRef = useRef<Map<number, L.Marker>>(new Map());
  const selectedIdRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Build cluster group + all markers once when shrines/lang changes
  React.useEffect(() => {
    if (clusterRef.current) map.removeLayer(clusterRef.current);

    const cluster = (L as unknown as { markerClusterGroup: (opts: object) => L.MarkerClusterGroup }).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      animate: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c: L.MarkerCluster) => L.divIcon({
        className: '',
        html: `<div class="shrine-cluster-bubble"><span class="shrine-cluster-count">${c.getChildCount()}</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    });

    const newMap = new Map<number, L.Marker>();

    for (const shrine of shrines) {
      const isSelected = shrine.id === selectedIdRef.current;
      const localName =
        lang === 'ur'
          ? getUrduFieldValue(shrine.raw, 'Name') || translateToUrdu(getFieldValue(shrine.raw, 'Name'))
          : shrine.name;

      const marker = L.marker([shrine.latLng.lat, shrine.latLng.lng], {
        icon: buildDivIcon(isSelected, shrine.category),
        title: localName,
        alt: localName,
      });

      marker.bindTooltip(localName, {
        direction: 'top',
        offset: [0, -8],
        opacity: 1,
        className: 'shrine-tooltip',
      });

      marker.on('click', () => {
        onSelectRef.current(shrine.id === selectedIdRef.current ? null : shrine);
      });

      marker.on('add', () => {
        const el = marker.getElement();
        if (!el) return;
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', localName);
        el.setAttribute('aria-pressed', String(shrine.id === selectedIdRef.current));
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectRef.current(shrine.id === selectedIdRef.current ? null : shrine);
          }
        });
      });

      cluster.addLayer(marker);
      newMap.set(shrine.id, marker);
    }

    map.addLayer(cluster);
    clusterRef.current = cluster;
    markerMapRef.current = newMap;

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
    };
  }, [shrines, map, lang]); // selectedId intentionally excluded — handled separately below

  // Update only the two affected markers when selection changes
  React.useEffect(() => {
    const prevId = selectedIdRef.current;
    selectedIdRef.current = selectedId;

    if (prevId !== null) {
      const marker = markerMapRef.current.get(prevId);
      const shrine = shrines.find((s) => s.id === prevId);
      if (marker && shrine) {
        marker.setIcon(buildDivIcon(false, shrine.category));
        marker.getElement()?.setAttribute('aria-pressed', 'false');
      }
    }

    if (selectedId !== null) {
      const marker = markerMapRef.current.get(selectedId);
      const shrine = shrines.find((s) => s.id === selectedId);
      if (marker && shrine) {
        marker.setIcon(buildDivIcon(true, shrine.category));
        marker.getElement()?.setAttribute('aria-pressed', 'true');
      }
    }
  }, [selectedId, shrines]);

  return null;
}
