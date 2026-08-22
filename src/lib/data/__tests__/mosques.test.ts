import { describe, it, expect } from 'vitest';
import { parseMosques, nearbyMosques, isShrinesOwnMosque, mosquePageUrl } from '../mosques';
import { buildShrine } from '../shrineModel';
import { makeShrineRow } from '../../../test/utils';

const DATA_DARBAR = buildShrine(
  makeShrineRow({ Name: 'Data Darbar', Latitude: '31.5789', Longitude: '74.3046' }),
  0,
)!;

function raw(over: Record<string, string>) {
  return {
    'Mosque Name': 'Jamia Masjid Test',
    Latitude: '31.579',
    Longitude: '74.305',
    ...over,
  };
}

describe('parseMosques', () => {
  it("replicates the Awqaf site's id contract — raw row index, even past skipped rows", () => {
    const mosques = parseMosques([
      raw({ 'Mosque ID': 'M-1' }),
      raw({ Latitude: 'not-a-number' }), // skipped, but the index advances
      raw({}),
    ]);
    expect(mosques.map((m) => m.id)).toEqual(['M-1-0', 'row-2']);
    expect(mosquePageUrl(mosques[0]!)).toBe(
      'https://raufnawaz.github.io/Awqaf/mosque.html?id=M-1-0',
    );
  });

  it('keeps the women’s-prayer answer as recorded, including free text', () => {
    const mosques = parseMosques([
      raw({ "Women's prayer section": 'Yes' }),
      raw({ "Women's prayer section": 'Under construction' }),
      raw({}),
    ]);
    expect(mosques.map((m) => m.womensPrayerSection)).toEqual([
      'Yes',
      'Under construction',
      '',
    ]);
  });

  it('rejects out-of-range coordinates like the source site does', () => {
    expect(parseMosques([raw({ Latitude: '91' })])).toHaveLength(0);
    expect(parseMosques([raw({ Longitude: '181' })])).toHaveLength(0);
  });
});

describe('nearbyMosques', () => {
  it('sorts by distance within range and drops the far ones', () => {
    const mosques = parseMosques([
      raw({ 'Mosque Name': 'Near', Latitude: '31.58', Longitude: '74.305' }),
      raw({ 'Mosque Name': 'Nearer', Latitude: '31.5789', Longitude: '74.3047' }),
      raw({ 'Mosque Name': 'Karachi', Latitude: '24.86', Longitude: '67.0' }),
    ]);
    const result = nearbyMosques(DATA_DARBAR, mosques);
    expect(result.map((e) => e.mosque.name)).toEqual(['Nearer', 'Near']);
  });

  it("only the survey's own Shrine Name asserts association — and it ranks first", () => {
    const mosques = parseMosques([
      raw({ 'Mosque Name': 'Very Close', Latitude: '31.5789', Longitude: '74.3047' }),
      raw({
        'Mosque Name': 'Jamia Masjid Data Darbar',
        'Shrine Name': 'Data Darbar',
        Latitude: '31.581',
        Longitude: '74.306',
      }),
    ]);
    const result = nearbyMosques(DATA_DARBAR, mosques);
    expect(result[0]!.mosque.shrineName).toBe('Data Darbar');
    expect(result[0]!.isShrinesMosque).toBe(true);
    expect(result[1]!.isShrinesMosque).toBe(false);
    expect(isShrinesOwnMosque(result[1]!.mosque, DATA_DARBAR)).toBe(false);
  });
});
