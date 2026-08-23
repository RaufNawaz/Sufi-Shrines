import { describe, it, expect } from 'vitest';
import { buildShrine, findNearbyShrines, findRelatedShrines } from '../shrineModel';
import { nearbyMosques, parseMosques } from '../mosques';
import { makeShrineRow } from '../../../test/utils';

// The 22 Aug ruling: a named row without coordinates is KEPT, unmapped —
// it gets a page and list/search presence; nothing geographic pretends to
// know where it is.

const UNMAPPED = buildShrine(
  makeShrineRow({ Name: 'Darbar Hazrat Shah Gohar Peer', Latitude: '', Longitude: '' }),
  0,
)!;
const MAPPED_A = buildShrine(
  makeShrineRow({ Name: 'A', Latitude: '31.58', Longitude: '74.30' }),
  1,
)!;
const MAPPED_B = buildShrine(
  makeShrineRow({ Name: 'B', Latitude: '31.59', Longitude: '74.31' }),
  2,
)!;

describe('unmapped shrines (22 Aug ruling)', () => {
  it('keeps a named row without coordinates, with latLng null', () => {
    expect(UNMAPPED).not.toBeNull();
    expect(UNMAPPED.latLng).toBeNull();
    expect(UNMAPPED.slug).toBe('darbar-hazrat-shah-gohar-peer');
  });

  it('still drops rows with neither name nor coordinates (parser noise)', () => {
    expect(buildShrine(makeShrineRow({ Name: '', Latitude: '', Longitude: '' }), 3)).toBeNull();
  });

  it('still drops rows with garbage coordinates but keeps blank ones', () => {
    // Garbage coordinates on a named row: kept unmapped would hide the
    // corruption; the row is kept but its latLng is null and DEV warns —
    // parseLatLng treats non-numeric as absent, which is the honest reading
    // of a cell that holds no usable coordinate.
    const garbage = buildShrine(
      makeShrineRow({ Name: 'X', Latitude: 'abc', Longitude: 'def' }),
      4,
    )!;
    expect(garbage.latLng).toBeNull();
  });

  it('findNearbyShrines: unmapped rows neither anchor nor appear', () => {
    expect(findNearbyShrines(UNMAPPED, [MAPPED_A, MAPPED_B])).toEqual([]);
    const near = findNearbyShrines(MAPPED_A, [UNMAPPED, MAPPED_B]);
    expect(near.map((s) => s.name)).toEqual(['B']);
  });

  it('findRelatedShrines: unmapped rows rank by similarity, not distance', () => {
    const related = findRelatedShrines(MAPPED_A, [UNMAPPED, MAPPED_B]);
    expect(related).toHaveLength(2); // nothing vanishes
  });

  it('nearbyMosques: an unmapped shrine gets no distance-based list', () => {
    const mosques = parseMosques([
      { 'Mosque Name': 'M', Latitude: '31.58', Longitude: '74.30' },
    ]);
    expect(nearbyMosques(UNMAPPED, mosques)).toEqual([]);
  });
});
