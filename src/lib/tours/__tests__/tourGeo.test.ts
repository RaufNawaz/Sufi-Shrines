// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { legDistancesKm, totalDistanceKm, estimateDriveTime, AVERAGE_DRIVE_SPEED_KMH } from '../tourGeo';

// Two points ~1 degree of latitude apart ≈ 111.19 km (haversineKm's own math).
const A = { lat: 24.0, lng: 67.0 };
const B = { lat: 25.0, lng: 67.0 };
const C = { lat: 26.0, lng: 67.0 };

describe('legDistancesKm', () => {
  it('returns null for the first point and a positive distance for the rest', () => {
    const legs = legDistancesKm([A, B, C]);
    expect(legs[0]).toBeNull();
    expect(legs[1]).toBeGreaterThan(100);
    expect(legs[2]).toBeGreaterThan(100);
  });

  it('returns an empty array for an empty input', () => {
    expect(legDistancesKm([])).toEqual([]);
  });

  it('returns a single null entry for a single point', () => {
    expect(legDistancesKm([A])).toEqual([null]);
  });
});

describe('totalDistanceKm', () => {
  it('sums the legs across all points', () => {
    const legs = legDistancesKm([A, B, C]);
    const total = totalDistanceKm([A, B, C]);
    expect(total).toBeCloseTo((legs[1] ?? 0) + (legs[2] ?? 0), 5);
  });

  it('is zero for fewer than two points', () => {
    expect(totalDistanceKm([])).toBe(0);
    expect(totalDistanceKm([A])).toBe(0);
  });
});

describe('estimateDriveTime', () => {
  it('converts a whole number of hours with no remainder', () => {
    expect(estimateDriveTime(AVERAGE_DRIVE_SPEED_KMH)).toEqual({ hours: 1, minutes: 0 });
    expect(estimateDriveTime(AVERAGE_DRIVE_SPEED_KMH * 2)).toEqual({ hours: 2, minutes: 0 });
  });

  it('splits a fractional distance into hours and minutes', () => {
    // 90 km at 60 km/h = 1.5h = 1h 30m
    expect(estimateDriveTime(90)).toEqual({ hours: 1, minutes: 30 });
  });

  it('returns zero for zero distance', () => {
    expect(estimateDriveTime(0)).toEqual({ hours: 0, minutes: 0 });
  });

  it('never reports 60 minutes due to rounding', () => {
    // 119.9 km ≈ 119.9 min, which would round to 120min = 2h 0m, not 1h 60m
    const result = estimateDriveTime(119.9);
    expect(result.minutes).toBeLessThan(60);
  });
});
