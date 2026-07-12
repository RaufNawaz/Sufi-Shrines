import type { Shrine } from '../../types/shrine';
import type { Tour } from './tours';

export interface TourStopPoint {
  shrine: Shrine;
  /** Index into tour.stops — preserved even if earlier stops are unresolved. */
  stopIndex: number;
}

/**
 * Resolve each tour stop to its Shrine, in tour order. A stop is skipped
 * (rather than crashing) if its shrineSlug isn't in the current shrine list —
 * e.g. shrine data hasn't finished loading yet.
 */
export function resolveTourStops(tour: Tour, shrines: Shrine[]): TourStopPoint[] {
  const bySlug = new Map(shrines.map((s) => [s.slug, s]));
  const points: TourStopPoint[] = [];
  tour.stops.forEach((stop, stopIndex) => {
    const shrine = bySlug.get(stop.shrineSlug);
    if (shrine) points.push({ shrine, stopIndex });
  });
  return points;
}

export interface SimpleBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Bounding box around a set of coordinates. Returns null for an empty list. */
export function computeBounds(points: { lat: number; lng: number }[]): SimpleBounds | null {
  if (points.length === 0) return null;
  let south = points[0].lat;
  let north = points[0].lat;
  let west = points[0].lng;
  let east = points[0].lng;
  for (const p of points) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lng < west) west = p.lng;
    if (p.lng > east) east = p.lng;
  }
  return { south, west, north, east };
}
