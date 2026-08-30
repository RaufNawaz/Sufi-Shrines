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
  /**
   * Ids to keep lit while the shared-ground lens is on; everything else dims.
   * Null when no lens is active.
   *
   * Dimming was a single boolean for the whole layer until this arrived, which
   * is fine for a tour — where every non-stop is dimmed — and wrong for a lens,
   * where the point is the *difference* between two sets of markers. The
   * per-marker decision is `isDimmed()` below, and both callers go through it
   * so the two reasons to dim can never disagree about a marker.
   */
  litIds?: ReadonlySet<number> | null;
}

/** Leaflet tooltip content is injected as HTML — escape sheet-sourced text. */
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** Escapes a string for safe use inside a double-quoted HTML attribute
 * (marker HTML is injected directly via Leaflet's divIcon, not through React,
 * so this can't rely on JSX escaping). The apostrophe rule is percent-encoding
 * rather than an entity because every string that reaches this is a URL. */
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '%27');
}

/**
 * Marker photographs that the browser could not load.
 *
 * Module-level on purpose: the marker layer is rebuilt whenever the language,
 * the tour or the lens changes, and a dead URL is dead for the whole visit. A
 * `Set` here means one failed request per URL per page rather than one per
 * rebuild, and it means a rebuilt marker comes back as the plain dot instead
 * of flashing a broken photograph again.
 *
 * Keyed by the sheet's own URL, not by shrine and not by the thumbnail URL
 * actually requested: what failed is the address, the sheet points two entries
 * at one file often enough that the distinction matters, and the sheet's URL is
 * the one string both sides of this — the icon builder and the error handler —
 * hold without having to re-derive it through attribute escaping.
 */
const deadPhotoUrls = new Set<string>();

function buildDivIcon(
  selected: boolean,
  category: string,
  dimmed: boolean,
  imageUrl?: string | null,
): L.DivIcon {
  const catKey = categoryKey(category);
  // The dot is 30px. Asking for the original here was the single biggest
  // cost on the map (see lib/images/thumbnail.ts).
  const thumb =
    imageUrl && !deadPhotoUrls.has(imageUrl) ? thumbnailUrl(imageUrl, IMAGE_WIDTH.marker) : '';
  const hasPhoto = thumb !== '';
  const classes = [
    'shrine-dot',
    `shrine-dot--${catKey}`,
    hasPhoto ? 'shrine-dot--photo' : '',
    selected ? 'selected' : '',
    dimmed ? 'shrine-dot--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  /* An <img>, not a CSS background — and this is the whole point of the
     element. A background that 404s fires no event at all, so a marker whose
     photograph has rotted keeps its 30px photo size and paints a flat category
     disc: a large blank circle among photographs, where the 14px dot is what a
     site with no picture correctly gets. 242 of the sheet's image URLs sit on
     hosts this project does not control, and an archive built to outlive its
     author will lose more of them. An <img> reports its own failure, on the
     one request the marker was going to make anyway.

     alt is empty deliberately: the marker element already carries the shrine's
     name as its aria-label, and a second name here would announce it twice. */
  const photo = hasPhoto
    ? `<img class="shrine-dot__photo" src="${escapeAttr(thumb)}" alt="" decoding="async">`
    : '';
  const size = hasPhoto ? 30 : 14;
  return L.divIcon({
    className: '',
    html: `<div class="${classes}">${photo}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 3],
  });
}

export function ShrineMarkers({
  shrines,
  selectedId,
  onSelect,
  tourStopSlugs = null,
  litIds = null,
}: Props) {
  const map = useMap();
  const { lang } = useLang();

  const tourStopSlugSet = useMemo(
    () => (tourStopSlugs ? new Set(tourStopSlugs) : null),
    [tourStopSlugs],
  );

  /* One marker, two reasons it might be dimmed, and they compose: a tour dims
     everything that is not a stop, a lens dims everything it does not light. A
     marker dimmed by either stays dimmed. */
  const isDimmed = React.useCallback(
    (id: number) => tourStopSlugSet !== null || (litIds !== null && !litIds.has(id)),
    [tourStopSlugSet, litIds],
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
        icon: buildDivIcon(isSelected, shrine.category, isDimmed(shrine.id), shrine.imageUrl),
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

        /* A photograph that no longer loads demotes its marker to the plain
           dot. Registered in the capture phase because `error` does not bubble
           — and on `el` rather than on the <img>, because `setIcon` replaces
           the icon's innerHTML while Leaflet's DivIcon reuses the outer DIV. A
           listener on the stable element therefore keeps catching failures
           through every selection change and rebuild; one on the <img> would
           be discarded with it. */
        el.addEventListener(
          'error',
          (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target?.classList.contains('shrine-dot__photo')) return;
            if (!shrine.imageUrl || deadPhotoUrls.has(shrine.imageUrl)) return;
            deadPhotoUrls.add(shrine.imageUrl);
            marker.setIcon(
              buildDivIcon(
                shrine.id === selectedIdRef.current,
                shrine.category,
                isDimmed(shrine.id),
                shrine.imageUrl,
              ),
            );
          },
          true,
        );
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
  }, [shrines, map, lang, tourStopSlugSet, isDimmed]); // selectedId intentionally excluded — handled separately below

  // Update only the two affected markers when selection changes
  React.useEffect(() => {
    const prevId = selectedIdRef.current;
    selectedIdRef.current = selectedId;

    if (prevId !== null) {
      const marker = markerMapRef.current.get(prevId);
      const shrine = shrines.find((s) => s.id === prevId);
      if (marker && shrine) {
        marker.setIcon(buildDivIcon(false, shrine.category, isDimmed(prevId), shrine.imageUrl));
        marker.setZIndexOffset(0);
        marker.getElement()?.setAttribute('aria-pressed', 'false');
      }
    }

    if (selectedId !== null) {
      const marker = markerMapRef.current.get(selectedId);
      const shrine = shrines.find((s) => s.id === selectedId);
      if (marker && shrine) {
        marker.setIcon(buildDivIcon(true, shrine.category, isDimmed(selectedId), shrine.imageUrl));
        marker.setZIndexOffset(1000);
        marker.getElement()?.setAttribute('aria-pressed', 'true');
      }
    }
  }, [selectedId, shrines, isDimmed]);

  return null;
}
