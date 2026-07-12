import type L from 'leaflet';

/** Fly the map to a target, or jump instantly under prefers-reduced-motion. */
export function flyToOrSetView(map: L.Map, target: L.LatLngExpression, zoom: number): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    map.setView(target, zoom);
  } else {
    map.flyTo(target, zoom, { duration: 0.9, easeLinearity: 0.25 });
  }
}
