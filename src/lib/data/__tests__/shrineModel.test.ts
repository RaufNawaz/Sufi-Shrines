import { describe, it, expect } from 'vitest';
import { buildShrine, buildShrines, haversineKm } from '../shrineModel';
import type { ShrineRow } from '../../../types/shrine';

const baseRow: ShrineRow = {
  Name: 'Data Darbar',
  Latitude: '31.5564',
  Longitude: '74.3093',
  Category: 'Muslim Shrine',
  Location: 'Lahore',
  Founded: '11th century',
  'Sufi Saint': 'Data Ganj Bakhsh',
  Description: 'A famous Sufi shrine.\n\n## History\nBuilt in the 11th century.',
  History: 'Built in the 11th century CE.',
  'Image Link': 'https://example.com/data-darbar.jpg',
};

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
