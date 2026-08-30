import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CrossTraditionAdjacency } from '../../lib/data/sharedGround';

interface Props {
  /** Pairs whose both ends are currently rendered. Computed by the caller with
   *  `visibleCrossTraditionPairs`, so this component draws and nothing else. */
  pairs: CrossTraditionAdjacency[];
}

/**
 * The shared-ground lens: a line between every pair of sites from different
 * traditions standing within 800 m of each other.
 *
 * ## The thing to understand before changing this
 *
 * **Every line here is shorter than 800 m, and at the zoom that shows Pakistan
 * that is under one pixel.** A layer of forty sub-pixel lines is a layer of
 * nothing. This is why `docs/planning/SHARED_GROUND_VISION.md` recorded the
 * lens as a design question rather than an afternoon's work, and why the lens
 * does not rely on the lines to carry it:
 *
 * - what the reader sees at country zoom is **which pins stay lit** — the 42
 *   sites that stand beside another tradition, against 169 dimmed ones. That
 *   is `ShrineMarkers`' job, not this file's, and it works at every zoom
 *   because a marker has a minimum size.
 * - the lines are what the walled city resolves *into* as you approach. A
 *   stroke has a minimum width too, so at country zoom they read as marks
 *   rather than vanishing — which is honest: something is there, and it is too
 *   small to read yet.
 *
 * ## Two records sharing one pin get a ring, not a line
 *
 * A line of length zero draws nothing, so two of the forty pairs would silently
 * not exist. They are the ones where the survey gives no separate position —
 * the documented approximations — so of all the pairs on this map they are the
 * two that must not disappear. They get a ring at the shared point instead,
 * which is also visibly *not* a line, so the lens never draws a distance the
 * archive did not measure (`docs/planning/SHARED_GROUND_VISION.md`, and the
 * same rule `NearbyShrines` and `/shared-ground` follow).
 *
 * Non-interactive throughout. The markers underneath are the interface — a
 * line that swallowed a click would put a dead zone over two shrines.
 */
export function SharedGroundLayer({ pairs }: Props) {
  const map = useMap();

  // A stable key so the layer is rebuilt when the drawn set changes and not on
  // every parent render — the same shape TourRoute uses.
  const pairsKey = pairs.map((p) => `${p.a.id}-${p.b.id}`).join(',');

  useEffect(() => {
    if (pairs.length === 0) return;

    const group = L.layerGroup();

    for (const pair of pairs) {
      const from = pair.a.latLng;
      const to = pair.b.latLng;
      if (!from || !to) continue; // unmapped rows never reach here, but the types allow it

      if (pair.samePin) {
        L.circleMarker([from.lat, from.lng], {
          className: 'shared-ground-pin-ring',
          radius: 11,
          interactive: false,
          // Stroke only. A filled disc would read as a marker of its own, and
          // there are already two markers underneath this exact point.
          fill: false,
        }).addTo(group);
        continue;
      }

      L.polyline(
        [
          [from.lat, from.lng],
          [to.lat, to.lng],
        ],
        { className: 'shared-ground-link', interactive: false },
      ).addTo(group);
    }

    group.addTo(map);
    return () => {
      map.removeLayer(group);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pairsKey]);

  return null;
}
