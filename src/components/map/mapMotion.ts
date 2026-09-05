import type L from 'leaflet';

/**
 * How long a map flight takes, in seconds — the one place it is written.
 *
 * ## Why it is a constant now
 *
 * It was `0.9` at **four separate call sites** (`mapMotion`, two in
 * `ShrineMarkers`, two in `ShrineMap`), which is how a motion design drifts:
 * changing the feel of the map meant finding all of them and getting all of
 * them right.
 *
 * ## The measurement, for whoever changes this number
 *
 * Leaflet's `flyTo` runs a rAF loop calling `_move()` with a **different zoom
 * every frame**, and `_move` fires `zoom` whenever the zoom changed. Measured on
 * 4 September 2026 (performance council): one tap on a pin fires **34 `zoom`
 * events**, and each reaches **170 listeners** — the 169 markers, whose
 * `Marker.getEvents()` is `{zoom: this.update}`, plus the GL basemap. So a
 * single flight costs roughly **5,750 `Marker.update()` calls** (a projection
 * and two style writes each) and **34 `maplibregl.jumpTo()` calls**, the latter
 * unthrottled because the plugin throttles `move` but binds `zoom` straight
 * through.
 *
 * **The duration is the multiplier on all of that**: halve it and both fan-outs
 * halve, because the count is frames and frames are time. That is the whole of
 * the performance argument, and it is why this is worth knowing before touching
 * the number.
 *
 * It is also a design decision and not only a performance one — the tap-flight
 * motion was deliberately shaped on 1 September 2026 — so the value is left
 * where it was set. **To try another, change this one constant**; the dev server
 * hot-reloads, so 0.9 / 0.65 / 0.45 can be compared back to back on
 * http://localhost:5173 without a rebuild.
 */
export const FLIGHT_DURATION_S = 0.9;

/** Fly the map to a target, or jump instantly under prefers-reduced-motion. */
export function flyToOrSetView(map: L.Map, target: L.LatLngExpression, zoom: number): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    map.setView(target, zoom);
  } else {
    map.flyTo(target, zoom, { duration: FLIGHT_DURATION_S, easeLinearity: 0.25 });
  }
}
