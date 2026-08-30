import React, { useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { thumbnailUrl, IMAGE_WIDTH } from '../../lib/images/thumbnail';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { categoryKey } from '../../lib/data/categoryKey';
import { fanPositions, pileAround, type FanPoint } from '../../lib/map/spiderfy';

/**
 * How close two pin centres have to be before a reader sees one shape.
 *
 * One pin diameter. It is the same 30 px the finding used to count the opening
 * view's 21 blobs, so what fans out is exactly what was measured as a pile —
 * `docs/planning/MAP_PIN_DENSITY_2026-08-30.md`.
 */
const PILE_RADIUS = 30;

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
  const { lang, fmtNum } = useLang();

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

  /* ── Fanning a pile out ──────────────────────────────────────────────────
     At the opening view the archive's 169 markers form 21 visually distinct
     shapes; the largest holds 66 sites, and the median distance from a pin
     centre to its nearest neighbour is 1 px. Tapping that shape opened
     whichever marker Leaflet had put on top, with no way to reach the other 65.

     Ruled 30 August 2026 from four costed options: fan on tap, and leave the
     resting map alone. So this does nothing until a reader taps a pile — the
     first impression of the map is deliberately unchanged, and the half of the
     problem that fixes (reachability) is not the half it does not (a reader
     still cannot see that 66 sites are under one mark).
     Geometry and its tests: `src/lib/map/spiderfy.ts`. */
  const fanRef = useRef<{
    ids: number[];
    /** Where each fanned marker really is, so collapsing is exact rather than
     *  recomputed — a marker must never drift from its coordinates. */
    origins: Map<number, L.LatLng>;
    lines: L.Polyline[];
  } | null>(null);
  /** Drives the live region only. Kept in state rather than read off the ref so
   *  a screen reader hears the fan open; nothing else re-renders on it. */
  const [fannedCount, setFannedCount] = useState(0);

  const collapseFan = React.useCallback(() => {
    const fan = fanRef.current;
    if (!fan) return;
    for (const [id, latLng] of fan.origins) {
      const marker = markerMapRef.current.get(id);
      marker?.setLatLng(latLng);
      marker?.getElement()?.classList.remove('shrine-dot--fanned');
    }
    for (const line of fan.lines) map.removeLayer(line);
    fanRef.current = null;
    setFannedCount(0);
  }, [map]);

  /**
   * Fan the pile containing `targetId`, if there is one. Returns whether it
   * did, so the click handler can fall through to selecting a lone marker.
   */
  const fanOut = React.useCallback(
    (targetId: number): boolean => {
      collapseFan();

      /* Collision is measured in layer points — pixels at the current zoom —
         because that is the space the reader's finger is in. Comparing
         latitudes would call two markers separate at z13 and piled at z6 while
         reporting the same distance. */
      const positions = new Map<number, FanPoint>();
      for (const [id, marker] of markerMapRef.current) {
        const point = map.latLngToLayerPoint(marker.getLatLng());
        positions.set(id, { x: point.x, y: point.y });
      }

      const pile = pileAround(positions, targetId, PILE_RADIUS);
      if (pile.length < 2) return false;

      const anchor = positions.get(targetId);
      if (!anchor) return false;
      const offsets = fanPositions(pile.length);
      const origins = new Map<number, L.LatLng>();
      const lines: L.Polyline[] = [];

      pile.forEach((id, index) => {
        const marker = markerMapRef.current.get(id);
        const offset = offsets[index];
        if (!marker || !offset) return;
        const from = marker.getLatLng();
        origins.set(id, from);
        const to = map.layerPointToLatLng(
          L.point(anchor.x + offset.x, anchor.y + offset.y) as L.Point,
        );
        /* A leader line from where the site actually is to where its marker has
           been moved. Without it the fan is a lie about coordinates; with it,
           it is a labelled detour. `interactive: false` so the lines never
           swallow a tap meant for a marker, and the overlay pane puts them
           under the marker pane without any z-index of their own. */
        const line = L.polyline([from, to], {
          className: 'shrine-fan-leg',
          interactive: false,
        });
        line.addTo(map);
        lines.push(line);
        marker.setLatLng(to);
        marker.getElement()?.classList.add('shrine-dot--fanned');
      });

      fanRef.current = { ids: pile, origins, lines };
      setFannedCount(pile.length);

      /* A pile near an edge fans off the screen — most of the way to useless on
         a 390 px phone, where a 66-marker spiral is half the viewport wide. Pan
         the fan into view rather than shrinking it: the reader tapped a place,
         and moving the map keeps every marker reachable where making the ring
         tighter would put two back inside one tap target.

         Panning is safe where zooming is not. The offsets were computed in layer
         points, and a pan does not change them; a zoom does, which is why
         `zoomstart` collapses and `movestart` does not. */
      const padding = 48;
      /* Container points, not layer points. A layer point is already relative to
         the map's pixel origin, so subtracting `getPixelOrigin()` from one — the
         first thing this did — double-counts the offset and panned all 66
         markers clean off the screen. Measured, not reasoned: the probe went
         from 0 off-screen to 66. `layerPointToContainerPoint` is the conversion
         and it is one call. */
      const corners = offsets.map((o) =>
        map.layerPointToContainerPoint(L.point(anchor.x + o.x, anchor.y + o.y) as L.Point),
      );
      const size = map.getSize();
      const left = Math.min(...corners.map((c) => c.x)) - padding;
      const right = Math.max(...corners.map((c) => c.x)) + padding;
      const top = Math.min(...corners.map((c) => c.y)) - padding;
      const bottom = Math.max(...corners.map((c) => c.y)) + padding;
      /* Only ever pans toward the fan, and never past it: if the fan is wider
         than the viewport there is no offset that shows all of it, and pulling
         one edge in would push the other out. Clamped to zero in that case, so
         a fan too big for the screen simply stays where the reader tapped. */
      const dx = Math.min(0, size.x - right) + Math.max(0, -left);
      const dy = Math.min(0, size.y - bottom) + Math.max(0, -top);
      if (dx !== 0 || dy !== 0) map.panBy(L.point(-dx, -dy), { animate: false });

      return true;
    },
    [map, collapseFan],
  );

  /* The marker-building effect must not depend on these, or every fan would
     rebuild all 169 markers and destroy the one it just built. */
  const fanOutRef = useRef(fanOut);
  fanOutRef.current = fanOut;
  const collapseFanRef = useRef(collapseFan);
  collapseFanRef.current = collapseFan;

  /* Anything that moves the map invalidates the fan, because the offsets were
     computed in layer points at one zoom. Escape closes it from the keyboard,
     and a background click closes it the way every other transient thing on
     this map closes. */
  React.useEffect(() => {
    const collapse = () => collapseFanRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') collapse();
    };
    map.on('zoomstart', collapse);
    map.on('click', collapse);
    document.addEventListener('keydown', onKey);
    return () => {
      map.off('zoomstart', collapse);
      map.off('click', collapse);
      document.removeEventListener('keydown', onKey);
    };
  }, [map]);

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
        /* A tap on a pile fans it; a tap on anything already fanned selects it.
           Without that second clause the first marker of a fan would re-fan its
           own pile forever and never open. */
        const inFan = fanRef.current?.ids.includes(shrine.id) ?? false;
        if (!inFan && fanOutRef.current(shrine.id)) return;
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
            const inFan = fanRef.current?.ids.includes(shrine.id) ?? false;
            if (!inFan && fanOutRef.current(shrine.id)) {
              /* Keyboard only. A fan opened by mouse leaves focus where the
                 reader put it; a fan opened by keyboard has to hand focus to
                 something inside itself, or the reader has just scattered 66
                 markers they cannot get to. Tab order follows the DOM, which is
                 the order the markers were added, so this is the pile's first
                 member rather than the nearest one — predictable beats clever
                 when you cannot see the ring. */
              const first = markerMapRef.current.get(shrine.id)?.getElement();
              first?.focus();
              return;
            }
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
      /* Before the layer goes: a fan holds Leaflet polylines on the map and
         `origins` for markers that are about to stop existing. Collapsing first
         removes the lines; skipping it leaks a leader line per fanned marker
         every time the language, the tour or a filter changes. */
      collapseFanRef.current();
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

  /* The fan is a silent rearrangement of 66 things, so it says how many.
     `resultCount` rather than a new sentence: it is the archive's own reviewed
     string in both languages ("66 shrines" / "۶۶ مزار"), and `fmtNum` puts it in
     Eastern numerals for an Urdu reader. Terse on purpose — an announcement
     that needed new Urdu prose would have needed a fluent speaker, and the
     count is the part a reader cannot otherwise get. */
  return (
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {fannedCount > 1 ? fmtNum(tFn(lang, 'resultCount', fannedCount)) : ''}
    </span>
  );
}
