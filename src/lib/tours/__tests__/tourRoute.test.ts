// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveTourStops, computeBounds } from '../tourRoute';
import { buildShrine } from '../../data/shrineModel';
import type { Tour } from '../tours';
import type { ShrineRow } from '../../../types/shrine';

function makeShrine(name: string, lat: string, lng: string) {
  const row: ShrineRow = { Name: name, Latitude: lat, Longitude: lng, Category: 'Muslim Shrine' };
  return buildShrine(row, 0)!;
}

const tour: Tour = {
  id: 'test-tour',
  title: 'Test Tour',
  titleUr: 'ٹیسٹ ٹور',
  description: '',
  descriptionUr: '',
  tradition: 'sufi',
  region: 'Test Region',
  theme: 'Test Theme',
  era: 'Test Era',
  stops: [
    { shrineSlug: 'data-darbar', narrative: '', narrativeUr: '' },
    { shrineSlug: 'missing-shrine', narrative: '', narrativeUr: '' },
    { shrineSlug: 'mazar-of-bulleh-shah', narrative: '', narrativeUr: '' },
  ],
};

describe('resolveTourStops', () => {
  it('maps stops to shrines in tour order, preserving stopIndex', () => {
    const shrines = [
      makeShrine('Data Darbar', '31.5564', '74.3093'),
      makeShrine('Mazar of Bulleh Shah', '31.1156', '74.4547'),
    ];
    const points = resolveTourStops(tour, shrines);
    expect(points).toHaveLength(2);
    expect(points[0].stopIndex).toBe(0);
    expect(points[0].shrine.name).toBe('Data Darbar');
    expect(points[1].stopIndex).toBe(2);
    expect(points[1].shrine.name).toBe('Mazar of Bulleh Shah');
  });

  it('skips stops whose shrine has not loaded yet', () => {
    const points = resolveTourStops(tour, []);
    expect(points).toEqual([]);
  });
});

describe('computeBounds', () => {
  it('returns null for an empty list', () => {
    expect(computeBounds([])).toBeNull();
  });

  it('returns a degenerate box for a single point', () => {
    const bounds = computeBounds([{ lat: 31.5, lng: 74.3 }]);
    expect(bounds).toEqual({ south: 31.5, west: 74.3, north: 31.5, east: 74.3 });
  });

  it('computes the enclosing box for multiple points', () => {
    const bounds = computeBounds([
      { lat: 31.5564, lng: 74.3093 },
      { lat: 24.8465, lng: 67.0322 },
      { lat: 27.7167, lng: 68.8611 },
    ]);
    expect(bounds).toEqual({ south: 24.8465, west: 67.0322, north: 31.5564, east: 74.3093 });
  });
});
