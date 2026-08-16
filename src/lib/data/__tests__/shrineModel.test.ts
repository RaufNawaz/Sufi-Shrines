// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildShrine, buildShrines, haversineKm, findNearbyShrines } from '../shrineModel';
import { makeShrineRow } from '../../../test/utils';
import type { ShrineRow } from '../../../types/shrine';

const baseRow: ShrineRow = makeShrineRow({
  Location: 'Lahore',
  Founded: '11th century',
  'Sufi Saint': 'Data Ganj Bakhsh',
  Description: 'A famous Sufi shrine.\n\n## History\nBuilt in the 11th century.',
  History: 'Built in the 11th century CE.',
  'Image Link': 'https://example.com/data-darbar.jpg',
});

describe('buildShrine', () => {
  it('builds a shrine from valid row', () => {
    const shrine = buildShrine(baseRow, 0);
    expect(shrine).not.toBeNull();
    expect(shrine!.name).toBe('Data Darbar');
    expect(shrine!.latLng).toEqual({ lat: 31.5564, lng: 74.3093 });
    expect(shrine!.category).toBe('Muslim Shrine');
    expect(shrine!.location).toBe('Lahore');
    expect(shrine!.imageUrl).toBe('https://example.com/data-darbar.jpg');
  });

  it('returns null for rows without coordinates', () => {
    const result = buildShrine({ Name: 'Test' }, 0);
    expect(result).toBeNull();
  });

  it('generates a slug from the name', () => {
    const shrine = buildShrine(baseRow, 5);
    expect(shrine!.slug).toMatch(/data-darbar/);
  });

  it('uses explicit Slug column when present', () => {
    const shrine = buildShrine({ ...baseRow, Slug: 'my-custom-slug' }, 3);
    expect(shrine!.slug).toBe('my-custom-slug');
  });
});

describe('buildShrines', () => {
  it('skips rows without coordinates', () => {
    const rows: ShrineRow[] = [
      baseRow,
      { Name: 'No coords' },
      { Name: 'Also no coords', Latitude: 'abc', Longitude: '0' },
    ];
    const shrines = buildShrines(rows);
    expect(shrines).toHaveLength(1);
    expect(shrines[0].name).toBe('Data Darbar');
  });

  it('assigns sequential IDs matching row index', () => {
    const rows = [baseRow, { ...baseRow, Name: 'Second', Latitude: '30.0', Longitude: '70.0' }];
    const shrines = buildShrines(rows);
    expect(shrines[0].id).toBe(0);
    expect(shrines[1].id).toBe(1);
  });

  it('generates stable slug without row-index suffix', () => {
    const rows = [baseRow, { ...baseRow, Name: 'Bari Imam', Latitude: '33.7', Longitude: '73.0' }];
    const shrines = buildShrines(rows);
    // Stable slug: just the name, no trailing "-0" or "-1"
    expect(shrines[0].slug).toBe('data-darbar');
    expect(shrines[1].slug).toBe('bari-imam');
  });

  it('disambiguates duplicate names with location', () => {
    const row1: ShrineRow = { ...baseRow, Name: 'Shah Hussain', Location: 'Lahore', Latitude: '31.5', Longitude: '74.3' };
    const row2: ShrineRow = { ...baseRow, Name: 'Shah Hussain', Location: 'Multan', Latitude: '30.2', Longitude: '71.4' };
    const shrines = buildShrines([row1, row2]);
    expect(shrines[0].slug).toBe('shah-hussain');
    expect(shrines[1].slug).toBe('shah-hussain-multan');
  });

  it('slug does not change when row order changes', () => {
    const row1: ShrineRow = { ...baseRow, Name: 'Bari Imam', Latitude: '33.7', Longitude: '73.0' };
    const row2: ShrineRow = { ...baseRow, Name: 'Data Darbar', Latitude: '31.6', Longitude: '74.3' };
    // Order: bari-imam first
    const s1 = buildShrines([row1, row2]);
    // Order: data-darbar first
    const s2 = buildShrines([row2, row1]);
    // Slugs are name-derived — should be identical regardless of order
    expect(s1.find(s => s.name === 'Bari Imam')!.slug).toBe(s2.find(s => s.name === 'Bari Imam')!.slug);
    expect(s1.find(s => s.name === 'Data Darbar')!.slug).toBe(s2.find(s => s.name === 'Data Darbar')!.slug);
  });

  it('explicit Slug column overrides generated slug', () => {
    const rows = [{ ...baseRow, Slug: 'my-canonical-slug' }];
    const shrines = buildShrines(rows);
    expect(shrines[0].slug).toBe('my-canonical-slug');
  });
});

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    const p = { lat: 31.5204, lng: 74.3587 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it('computes approximate distance between Lahore and Karachi', () => {
    const lahore = { lat: 31.5204, lng: 74.3587 };
    const karachi = { lat: 24.8607, lng: 67.0011 };
    const dist = haversineKm(lahore, karachi);
    // ~1030 km expected (haversine great-circle)
    expect(dist).toBeGreaterThan(950);
    expect(dist).toBeLessThan(1100);
  });
});

describe('findNearbyShrines', () => {
  // Lahore-area anchor plus three candidates at increasing distance, and one
  // Karachi-area shrine sharing the anchor's category — findNearbyShrines
  // must rank by distance alone and ignore that shared category, unlike
  // findRelatedShrines' weighted score.
  const rows: ShrineRow[] = [
    { ...baseRow, Name: 'Anchor', Latitude: '31.52', Longitude: '74.36', Category: 'Muslim Shrine' },
    { ...baseRow, Name: 'Nearest', Latitude: '31.53', Longitude: '74.37', Category: 'Hindu Temple' },
    { ...baseRow, Name: 'Middle', Latitude: '31.60', Longitude: '74.40', Category: 'Hindu Temple' },
    { ...baseRow, Name: 'Farthest same-category', Latitude: '24.86', Longitude: '67.00', Category: 'Muslim Shrine' },
  ];
  const shrines = buildShrines(rows);
  const anchor = shrines.find((s) => s.name === 'Anchor')!;

  it('excludes the shrine itself', () => {
    const nearby = findNearbyShrines(anchor, shrines);
    expect(nearby.find((s) => s.id === anchor.id)).toBeUndefined();
  });

  it('orders strictly by distance, not category match', () => {
    const nearby = findNearbyShrines(anchor, shrines);
    expect(nearby.map((s) => s.name)).toEqual(['Nearest', 'Middle', 'Farthest same-category']);
  });

  it('respects the limit', () => {
    const nearby = findNearbyShrines(anchor, shrines, 1);
    expect(nearby).toHaveLength(1);
    expect(nearby[0].name).toBe('Nearest');
  });
});
