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

/**
 * The zoom at and beyond which overlap stops waiting for a gesture: piles fan
 * out on their own, and zooming back out gathers them. At 16, PILE_RADIUS is
 * roughly 60 m of ground over Lahore — measured against the dataset (1 Sep
 * 2026), that is 19 of 169 sites, 10 of them sharing *exact* coordinates that
 * no zoom could ever separate. Everything else stands apart on its own by this
 * depth: the median nearest-neighbour distance is 1.8 km.
 */
const AUTO_FAN_ZOOM = 16;

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

  /* ── Fanning piles of markers out ────────────────────────────────────────
     At the opening view the archive's 169 markers form 21 visually distinct
     shapes; the largest holds 66 sites, and the median distance from a pin
     centre to its nearest neighbour is 1 px. Tapping that shape opened
     whichever marker Leaflet had put on top, with no way to reach the other 65.

     Ruled 30 August 2026 from four costed options: fan on tap, and leave the
     resting map alone. Amended by Rauf on 1 September 2026 — the tap gesture
     went: a tap on a pile now *flies the map toward it*, and whatever that
     depth cannot separate fans out on its own at AUTO_FAN_ZOOM, gathering
     again on the way back out. The fan stopped being a transient the reader
     opens and became how the map presents overlap at depth — which is why
     nothing here dismisses it any more: not Escape, not a background tap, only
     zooming away. The resting-map half of the ruling stands: the opening view
     sits ten zoom levels above fan depth, so its first impression is unchanged.
     Geometry and its tests: `src/lib/map/spiderfy.ts`. */
  const fanRef = useRef<{
    ids: Set<number>;
    /** Where each fanned marker really is, so collapsing is exact rather than
     *  recomputed — a marker must never drift from its coordinates. */
    origins: Map<number, L.LatLng>;
    lines: L.Polyline[];
  } | null>(null);
  /** Drives the live region only. Kept in state rather than read off the ref so
   *  a screen reader hears the fan open; nothing else re-renders on it. */
  const [fannedCount, setFannedCount] = useState(0);

  /* Collision is measured in layer points — pixels at the current zoom —
     because that is the space the reader's finger is in. Comparing latitudes
     would call two markers separate at z13 and piled at z6 while reporting the
     same distance. */
  const layerPositions = React.useCallback(() => {
    const positions = new Map<number, FanPoint>();
    for (const [id, marker] of markerMapRef.current) {
      const point = map.latLngToLayerPoint(marker.getLatLng());
      positions.set(id, { x: point.x, y: point.y });
    }
    return positions;
  }, [map]);

  const collapseFan = React.useCallback(() => {
    const fan = fanRef.current;
    if (!fan) return;
    for (const [id, latLng] of fan.origins) {
      const marker = markerMapRef.current.get(id);
      /* Class off *before* the move back. The class carries the outward glide
         (map.css), and a collapse happens at `zoomstart` — a marker still
         gliding home while the zoom animation scales the pane is drawn at
         neither place. With the class gone first, the return is instant. */
      marker?.getElement()?.classList.remove('shrine-dot--fanned');
      marker?.setLatLng(latLng);
    }
    for (const line of fan.lines) map.removeLayer(line);
    fanRef.current = null;
    setFannedCount(0);
  }, [map]);

  /**
   * Fan every pile on the map, if the zoom is at fan depth. Runs on `zoomend`,
   * so at AUTO_FAN_ZOOM and deeper the invariant is simply: no two markers
   * share a tap target, with no gesture required.
   *
   * All piles, not the visible ones: layer points do not change on a pan, so
   * fanning everything once per zoom means panning can never reveal a stacked
   * pile — and never needs a `moveend` recompute. The whole pass is one
   * projection of 169 points and a partition; the expensive half, the DOM
   * writes, happens only for the ~19 markers that actually share ground.
   */
  const fanOverlaps = React.useCallback(() => {
    collapseFan();
    if (map.getZoom() < AUTO_FAN_ZOOM) return;

    const positions = layerPositions();
    const ids = new Set<number>();
    const origins = new Map<number, L.LatLng>();
    const lines: L.Polyline[] = [];
    const moves: { marker: L.Marker; to: L.LatLng }[] = [];
    const seen = new Set<number>();

    for (const id of positions.keys()) {
      if (seen.has(id)) continue;
      const pile = pileAround(positions, id, PILE_RADIUS);
      for (const member of pile) seen.add(member);
      if (pile.length < 2) continue;

      /* Around the pile's centroid, not the first member found: the fan is
         nobody's tap any more, and a ring centred on an arbitrary member sits
         lopsided over the ground it describes. */
      let cx = 0;
      let cy = 0;
      for (const member of pile) {
        const p = positions.get(member) as FanPoint;
        cx += p.x;
        cy += p.y;
      }
      cx /= pile.length;
      cy /= pile.length;

      const offsets = fanPositions(pile.length);
      pile.forEach((member, index) => {
        const marker = markerMapRef.current.get(member);
        const offset = offsets[index];
        if (!marker || !offset) return;
        const from = marker.getLatLng();
        const to = map.layerPointToLatLng(L.point(cx + offset.x, cy + offset.y) as L.Point);
        origins.set(member, from);
        ids.add(member);
        /* A leader line from where the site actually is to where its marker is
           moving. Without it the fan is a lie about coordinates; with it, it is
           a labelled detour. `interactive: false` so the lines never swallow a
           tap meant for a marker, and the overlay pane puts them under the
           marker pane without any z-index of their own. */
        const line = L.polyline([from, to], {
          className: 'shrine-fan-leg',
          interactive: false,
        });
        line.addTo(map);
        lines.push(line);
        marker.getElement()?.classList.add('shrine-dot--fanned');
        moves.push({ marker, to });
      });
    }

    if (ids.size === 0) return;

    /* Classes first, one layout flush, then every move: the outward glide in
       map.css lives on the class, and a transform written in the same style
       pass the class arrives in is not guaranteed to transition from the old
       position. One flush for all markers — reading layout inside the loop
       above would force one per marker. */
    void map.getContainer().offsetWidth;
    for (const { marker, to } of moves) marker.setLatLng(to);

    fanRef.current = { ids, origins, lines };
    setFannedCount(ids.size);
  }, [map, collapseFan, layerPositions]);

  /**
   * Fly the map toward the pile containing `targetId`, if there is one.
   * Returns whether it did, so the click handler can fall through to selecting
   * a lone marker.
   *
   * This is what a tap on a pile buys now: not the fan itself, but the flight
   * toward it. Fitting the pile's bounds separates everything a zoom *can*
   * separate; the cap at AUTO_FAN_ZOOM means whatever it cannot — ten of these
   * sites share exact coordinates — lands exactly where `fanOverlaps` takes
   * over. One gesture, and the map never fans what mere depth would have
   * untangled anyway.
   */
  const zoomIntoPile = React.useCallback(
    (targetId: number): boolean => {
      /* At fan depth every overlap is already fanned, so a tap that reaches
         here is a tap on a marker standing alone: select it. */
      if (map.getZoom() >= AUTO_FAN_ZOOM) return false;

      const pile = pileAround(layerPositions(), targetId, PILE_RADIUS);
      if (pile.length < 2) return false;

      const points: L.LatLng[] = [];
      for (const member of pile) {
        const marker = markerMapRef.current.get(member);
        if (marker) points.push(marker.getLatLng());
      }
      const tapped = markerMapRef.current.get(targetId)?.getLatLng();
      if (points.length < 2 || !tapped) return false;

      /* The zoom at which the whole pile would fit the viewport. For a compact
         pile that is well above the current zoom, and fitting it is the right
         flight. But a *transitive* pile can sprawl: on a phone's fitted
         opening view the chain connects most of the archive into one blob, so
         its bounds ARE the current view and the "flight" reproduces it — a
         dead tap, forever. Measured, not imagined: `selectMarker` in the e2e
         fixtures tapped Data Darbar eight times on a 390 px viewport and the
         map never moved. So a fit that would not descend is replaced by a
         two-level step toward the *tapped marker* — the reader named a place,
         and the descent stays anchored on it rather than on the blob's
         centroid, which for a country-wide chain is a field in mid-Punjab. */
      const padding = L.point(64, 64) as L.Point;
      const bounds = L.latLngBounds(points);
      /* `padding.add(padding)`, because that is what `fitBounds` itself does:
         its `padding` option is shorthand for paddingTopLeft AND
         paddingBottomRight, so the zoom it will actually fly to is computed
         against twice this point. Asking `getBoundsZoom` with the padding
         un-doubled predicted "the fit will descend" on a 390 px viewport where
         the real fit went nowhere — 128 of 390 px is a third of the screen —
         and every tap on the phone's opening view was a dead one. */
      const fitZoom = Math.min(
        map.getBoundsZoom(bounds, false, padding.add(padding)),
        AUTO_FAN_ZOOM,
      );
      const current = map.getZoom();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      /* The same contract as mapMotion's flyToOrSetView: motion is the point
         here — the flight is what tells the reader the tap was heard — but
         never against their stated preference. */
      if (fitZoom > current) {
        const options = { padding, maxZoom: AUTO_FAN_ZOOM };
        if (reduced) map.fitBounds(bounds, { ...options, animate: false });
        else map.flyToBounds(bounds, { ...options, duration: 0.9, easeLinearity: 0.25 });
      } else {
        const target = Math.min(current + 2, AUTO_FAN_ZOOM);
        if (reduced) map.setView(tapped, target);
        else map.flyTo(tapped, target, { duration: 0.9, easeLinearity: 0.25 });
      }
      return true;
    },
    [map, layerPositions],
  );

  /* The marker-building effect must not depend on these, or every zoom would
     rebuild all 169 markers and destroy the fan it just opened. */
  const zoomIntoPileRef = useRef(zoomIntoPile);
  zoomIntoPileRef.current = zoomIntoPile;
  const fanOverlapsRef = useRef(fanOverlaps);
  fanOverlapsRef.current = fanOverlaps;
  const collapseFanRef = useRef(collapseFan);
  collapseFanRef.current = collapseFan;

  /* A zoom invalidates every fan — the offsets were computed in layer points
     at one zoom — so `zoomstart` collapses instantly, before the zoom
     animation owns the pane, and `zoomend` re-fans whatever the new depth
     still cannot separate. A pan changes neither layer points nor piles, so it
     costs nothing and collapses nothing. */
  React.useEffect(() => {
    const collapse = () => collapseFanRef.current();
    const refan = () => fanOverlapsRef.current();
    map.on('zoomstart', collapse);
    map.on('zoomend', refan);
    return () => {
      map.off('zoomstart', collapse);
      map.off('zoomend', refan);
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
        /* A tap on a pile flies the map toward it; a tap on anything fanned or
           standing alone selects it. The fanned clause matters: without it a
           fanned marker would read as piled with its own neighbours and spend
           the tap on a flight to where the reader already is. */
        const inFan = fanRef.current?.ids.has(shrine.id) ?? false;
        if (!inFan && zoomIntoPileRef.current(shrine.id)) return;
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
            /* The same contract as a tap. Focus needs no hand-off any more:
               the flight frames the pile the reader activated, the marker
               element survives both the flight and the auto-fan, and focus
               stays exactly where they put it — on a marker that is now
               individually reachable. */
            const inFan = fanRef.current?.ids.has(shrine.id) ?? false;
            if (!inFan && zoomIntoPileRef.current(shrine.id)) return;
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

    /* A rebuild at fan depth must re-open what its own cleanup collapsed —
       without this, switching the language at z16 would leave every pile
       stacked until the next zoom. Ten levels above fan depth (the opening
       view) this returns immediately. */
    fanOverlapsRef.current();

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
