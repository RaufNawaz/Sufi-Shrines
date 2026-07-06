import { haversineKm } from '../data/shrineModel';
import type { LatLng } from '../../types/shrine';

/**
 * Rough average road-travel speed (km/h) between shrines — a mix of
 * highway and city driving typical for inter-city trips in Pakistan.
 * Used only to give visitors a ballpark estimate, not a routed ETA.
 */
export const AVERAGE_DRIVE_SPEED_KMH = 60;

/** Straight-line distance (km) from each point to the one before it; the
 * first point has no previous leg, so its entry is null. */
export function legDistancesKm(points: LatLng[]): (number | null)[] {
  return points.map((p, i) => (i === 0 ? null : haversineKm(points[i - 1], p)));
}

/** Total straight-line distance (km) across all points, in order. */
export function totalDistanceKm(points: LatLng[]): number {
  return legDistancesKm(points).reduce((sum: number, leg) => sum + (leg ?? 0), 0);
}

export interface DriveTimeEstimate {
  hours: number;
  minutes: number;
}

/** Rough total drive-time estimate for a given distance. */
export function estimateDriveTime(km: number): DriveTimeEstimate {
  const roundedTotalMinutes = Math.round((km / AVERAGE_DRIVE_SPEED_KMH) * 60);
  return {
    hours: Math.floor(roundedTotalMinutes / 60),
    minutes: roundedTotalMinutes % 60,
  };
}
