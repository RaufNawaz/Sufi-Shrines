import React, { useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { thumbnailUrl, IMAGE_WIDTH } from '../../lib/images/thumbnail';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { categoryKey } from '../../lib/data/categoryKey';

interface Props {
  shrines: Shrine[];
  selectedId: number | null;
  onSelect: (shrine: Shrine | null) => void;
  /**
   * Slugs of the active tour's stops, or null when no tour is running.
   * Stop shrines are skipped here — TourRoute renders their numbered
   * marker instead — and every other shrine is dimmed.
   */
  tourStopSlugs?: string[] | null;
}

/** Leaflet tooltip content is injected as HTML — escape sheet-sourced text. */
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** Escapes a string for safe use inside a double-quoted HTML attribute AND
 * a single-quoted CSS url() within it (marker HTML is injected directly via
 * Leaflet's divIcon, not through React, so this can't rely on JSX escaping). */
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '%27');
}

function buildDivIcon(
  selected: boolean,
  category: string,
  dimmed: boolean,
  imageUrl?: string | null,
): L.DivIcon {
  const catKey = categoryKey(category);
  const classes = [
    'shrine-dot',
    `shrine-dot--${catKey}`,
    imageUrl ? 'shrine-dot--photo' : '',
    selected ? 'selected' : '',
    dimmed ? 'shrine-dot--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  // The dot is 30px. Asking for the original here was the single biggest
  // cost on the map (see lib/images/thumbnail.ts).
  const thumb = imageUrl ? thumbnailUrl(imageUrl, IMAGE_WIDTH.marker) : '';
  const style = thumb ? ` style="background-image: url('${escapeAttr(thumb)}')"` : '';
  const size = imageUrl ? 30 : 14;
  return L.divIcon({
    className: '',
    html: `<div class="${classes}"${style}></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 3],
  });
}

export function ShrineMarkers({ shrines, selectedId, onSelect, tourStopSlugs = null }: Props) {
  const map = useMap();
  const { lang } = useLang();

  const tourStopSlugSet = useMemo(
    () => (tourStopSlugs ? new Set(tourStopSlugs) : null),
    [tourStopSlugs],
  );

  // Stable refs so the selectedId effect never needs to rebuild all markers
  const groupRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<number, L.Marker>>(new Map());
  const selectedIdRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Build layer group + all markers once when shrines/lang/tour state changes.
  // While a tour is active, its stop shrines are skipped — TourRoute renders
  // their numbered marker instead — and every other shrine is dimmed.
  React.useEffect(() => {
    if (groupRef.current) map.removeLayer(groupRef.current);

    const group = L.layerGroup();
    const newMap = new Map<number, L.Marker>();

    for (const shrine of shrines) {
      if (tourStopSlugSet?.has(shrine.slug)) continue;
      // Unmapped (22 Aug ruling): no marker, page-only. `continue`, never
      // `return` — this is a for...of, not a forEach callback, so a `return`
      // here abandons the whole effect before map.addLayer(group) below and
      // the two coordinate-less rows erase all 169 markers that do have
      // coordinates. That shipped to production; see e2e/map.spec.ts's
      // marker-count invariant.
      if (!shrine.latLng) continue;

      const isSelected = shrine.id === selectedIdRef.current;
      const localName = localizeShrineName(shrine, lang);

      const marker = L.marker([shrine.latLng.lat, shrine.latLng.lng], {
        icon: buildDivIcon(isSelected, shrine.category, tourStopSlugSet !== null, shrine.imageUrl),
        title: localName,
        alt: localName,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindTooltip(escapeHtml(localName), {
        direction: 'top',
        offset: [0, -8],
        opacity: 1,
        className: 'shrine-tooltip',
      });

      // Raise the hovered marker above its neighbors via CSS z-index only —
      // NOT `riseOnHover` (which reorders the DOM node). Reordering a node
      // under the pointer triggers a spurious mouseout/mouseover loop and
      // breaks click delivery in Safari.
      marker.on('mouseover', () => {
        if (shrine.id !== selectedIdRef.current) marker.setZIndexOffset(500);
      });
      marker.on('mouseout', () => {
        if (shrine.id !== selectedIdRef.current) marker.setZIndexOffset(0);
      });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
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

      group.addLayer(marker);
      newMap.set(shrine.id, marker);
    }

    map.addLayer(group);
    groupRef.current = group;
    markerMapRef.current = newMap;

    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [shrines, map, lang, tourStopSlugSet]); // selectedId intentionally excluded — handled separately below

  // Update only the two affected markers when selection changes
  React.useEffect(() => {
    const prevId = selectedIdRef.current;
    selectedIdRef.current = selectedId;
    const dimmed = tourStopSlugSet !== null;

    if (prevId !== null) {
      const marker = markerMapRef.current.get(prevId);
      const shrine = shrines.find((s) => s.id === prevId);
      if (marker && shrine) {
        marker.setIcon(buildDivIcon(false, shrine.category, dimmed, shrine.imageUrl));
        marker.setZIndexOffset(0);
        marker.getElement()?.setAttribute('aria-pressed', 'false');
      }
    }

    if (selectedId !== null) {
      const marker = markerMapRef.current.get(selectedId);
      const shrine = shrines.find((s) => s.id === selectedId);
      if (marker && shrine) {
        marker.setIcon(buildDivIcon(true, shrine.category, dimmed, shrine.imageUrl));
        marker.setZIndexOffset(1000);
        marker.getElement()?.setAttribute('aria-pressed', 'true');
      }
    }
  }, [selectedId, shrines, tourStopSlugSet]);

  return null;
}
