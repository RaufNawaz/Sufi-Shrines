// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildSharedGroundOverview,
  crossTraditionAdjacencies,
  findSharedGround,
  SAME_PIN_THRESHOLD_M,
  SHARED_GROUND_RADIUS_M,
} from '../sharedGround';
import { buildShrines } from '../shrineModel';
import type { ShrineRow } from '../../../types/shrine';

/**
 * Tested against the real snapshot as well as fixtures. The claim this feature
 * makes — that the traditions this archive documents stand on the same streets —
 * is a claim about *this data*, so a fixture-only test would prove nothing about
 * it. See docs/planning/SHARED_GROUND_VISION.md.
 */

const row = (over: Partial<ShrineRow>): ShrineRow =>
  ({
    Name: 'X',
    Latitude: '31.5',
    Longitude: '74.3',
    Category: 'Muslim Shrine',
    ...over,
  }) as ShrineRow;

describe('findSharedGround', () => {
  it('finds a neighbour inside the radius and ignores one outside it', () => {
    // ~0.009° of latitude is roughly 1 km.
    const shrines = buildShrines([
      row({ Name: 'Anchor', Latitude: '31.5000', Longitude: '74.3000' }),
      row({ Name: 'Close', Latitude: '31.5027', Longitude: '74.3000' }), // ~300 m
      row({ Name: 'Far', Latitude: '31.5200', Longitude: '74.3000' }), // ~2.2 km
    ]);
    const { neighbours } = findSharedGround(shrines[0]!, shrines);
    expect(neighbours.map((n) => n.shrine.name)).toEqual(['Close']);
    expect(neighbours[0]!.distanceM).toBeGreaterThan(250);
    expect(neighbours[0]!.distanceM).toBeLessThan(350);
  });

  it('marks a shared pin instead of reporting a distance of zero', () => {
    /*
     * Every identical-coordinate group in the real data is a documented
     * approximation: four Miani Sahib darbars share one pin because the survey
     * gives no position within the graveyard. Rendering that as "0.0 km"
     * presents an approximation the archive recorded as a measurement it made.
     */
    const shrines = buildShrines([
      row({ Name: 'A', Latitude: '31.5498', Longitude: '74.3170' }),
      row({ Name: 'B', Latitude: '31.5498', Longitude: '74.3170' }),
    ]);
    const { neighbours, samePinCount } = findSharedGround(shrines[0]!, shrines);
    expect(neighbours[0]!.samePin).toBe(true);
    expect(samePinCount).toBe(1);
  });

  it('does not call a few metres of rounding a measured distance', () => {
    // The threshold exists so a sheet rounding difference does not become a
    // spurious "12 m apart" between two records of the same spot.
    const shrines = buildShrines([
      row({ Name: 'A', Latitude: '31.50000', Longitude: '74.30000' }),
      row({ Name: 'B', Latitude: '31.50010', Longitude: '74.30000' }), // ~11 m
    ]);
    const { neighbours } = findSharedGround(shrines[0]!, shrines);
    expect(neighbours[0]!.distanceM).toBeLessThan(SAME_PIN_THRESHOLD_M);
    expect(neighbours[0]!.samePin).toBe(true);
  });

  it('reports a neighbour from another tradition as such', () => {
    const shrines = buildShrines([
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5000' }),
      row({ Name: 'Gurdwara', Category: 'Sikh Gurdwara', Latitude: '31.5027' }),
    ]);
    const { neighbours, otherTraditions } = findSharedGround(shrines[0]!, shrines);
    expect(neighbours[0]!.otherTradition).toBe(true);
    expect(otherTraditions).toEqual(['sikh']);
  });

  it('never infers a different tradition from an unrecognised category', () => {
    // 'default' is the bucket for a category the code does not know. Counting
    // it as "another tradition" would be an inference drawn from a gap.
    const shrines = buildShrines([
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5000' }),
      row({ Name: 'Mystery', Category: 'Something Unmapped', Latitude: '31.5027' }),
    ]);
    const { neighbours, otherTraditions } = findSharedGround(shrines[0]!, shrines);
    expect(neighbours).toHaveLength(1);
    expect(neighbours[0]!.otherTradition).toBe(false);
    expect(otherTraditions).toEqual([]);
  });

  it('orders shared pins first, then by distance', () => {
    const shrines = buildShrines([
      row({ Name: 'Anchor', Latitude: '31.5000' }),
      row({ Name: 'Mid', Latitude: '31.5036' }), // ~400 m
      row({ Name: 'SamePin', Latitude: '31.5000' }),
      row({ Name: 'Near', Latitude: '31.5018' }), // ~200 m
    ]);
    const { neighbours } = findSharedGround(shrines[0]!, shrines);
    expect(neighbours.map((n) => n.shrine.name)).toEqual(['SamePin', 'Near', 'Mid']);
  });
});

describe('crossTraditionAdjacencies', () => {
  it('lists each cross-tradition pair once, nearest first', () => {
    const shrines = buildShrines([
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5000' }),
      row({ Name: 'Temple', Category: 'Hindu Temple', Latitude: '31.5045' }), // ~500 m
      row({ Name: 'Gurdwara', Category: 'Sikh Gurdwara', Latitude: '31.5018' }), // ~200 m
    ]);
    const pairs = crossTraditionAdjacencies(shrines);
    expect(pairs).toHaveLength(3);
    expect(pairs[0]!.distanceM).toBeLessThan(pairs[1]!.distanceM);
    // No mirrored duplicates.
    const keys = pairs.map((p) => [p.a.name, p.b.name].sort().join('|'));
    expect(new Set(keys).size).toBe(pairs.length);
  });

  it('ignores pairs from the same tradition', () => {
    const shrines = buildShrines([
      row({ Name: 'A', Category: 'Sikh Gurdwara', Latitude: '31.5000' }),
      row({ Name: 'B', Category: 'Sikh Gurdwara', Latitude: '31.5018' }),
    ]);
    expect(crossTraditionAdjacencies(shrines)).toEqual([]);
  });
});

describe('against the shipped snapshot', () => {
  it('the archive really does hold cross-tradition adjacency', async () => {
    /*
     * The measured claim this whole feature rests on, asserted rather than
     * asserted-about. Re-measured 29 August 2026 against this snapshot: 74
     * pairs within 800 m, 40 of them crossing a tradition — Data Darbar 222 m
     * from Gurdwara Chowmala Sahib, Dargah Pir Ratan Nath 100 m from Gurdwara
     * Bhai Beba Singh. (The comment here read "65 pairs … of which several
     * cross traditions", from 20 August; the floors below passed either way,
     * which is exactly how a stale number survives in a green suite.)
     *
     * Floors, not equalities: the sheet is production and moves. A drop to zero
     * means the coordinates or the categories broke, not that the heritage did.
     */
    const snapshot = (await import('../../../data/shrines-fallback.json')).default as {
      rows: ShrineRow[];
    };
    const shrines = buildShrines(snapshot.rows);
    expect(shrines.length).toBeGreaterThan(150);

    const pairs = crossTraditionAdjacencies(shrines);
    expect(pairs.length).toBeGreaterThanOrEqual(8);

    const withNeighbours = shrines.filter(
      (s) => findSharedGround(s, shrines).neighbours.length > 0,
    );
    expect(withNeighbours.length).toBeGreaterThanOrEqual(50);
  });

  it('no neighbour is reported beyond the radius', () => {
    return import('../../../data/shrines-fallback.json').then((mod) => {
      const shrines = buildShrines((mod.default as { rows: ShrineRow[] }).rows);
      for (const shrine of shrines) {
        for (const n of findSharedGround(shrine, shrines).neighbours) {
          expect(n.distanceM).toBeLessThanOrEqual(SHARED_GROUND_RADIUS_M);
        }
      }
    });
  });

  it('every identical-pin group in the data is flagged, not measured', () => {
    return import('../../../data/shrines-fallback.json').then((mod) => {
      const shrines = buildShrines((mod.default as { rows: ShrineRow[] }).rows);
      // Four such groups exist; each is a documented approximation.
      const flagged = shrines.filter((s) => findSharedGround(s, shrines).samePinCount > 0);
      expect(flagged.length).toBeGreaterThanOrEqual(8);
    });
  });
});

describe('buildSharedGroundOverview', () => {
  it('counts every adjacent pair, not only the cross-tradition ones', () => {
    const shrines = buildShrines([
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5000' }),
      row({ Name: 'Another shrine', Category: 'Muslim Shrine', Latitude: '31.5018' }), // ~200 m
      row({ Name: 'Gurdwara', Category: 'Sikh Gurdwara', Latitude: '31.5036' }), // ~400 m
    ]);
    const overview = buildSharedGroundOverview(shrines);
    expect(overview.pairs).toBe(3);
    expect(overview.crossTradition).toHaveLength(2);
    expect(overview.sitesWithNeighbours).toBe(3);
    expect(overview.crossTraditionSites).toBe(3);
  });

  it('never counts an unmapped row as a site with no neighbours', () => {
    /*
     * A row with no coordinates has no ground to share. Putting it in the
     * denominator would report a gap in the survey — the 22 August ruling keeps
     * such a row as a page — as a fact about the geography.
     */
    const shrines = buildShrines([
      row({ Name: 'Mapped', Latitude: '31.5000' }),
      row({ Name: 'Also mapped', Latitude: '31.5018' }),
      row({ Name: 'Unmapped', Latitude: '', Longitude: '' }),
    ]);
    const overview = buildSharedGroundOverview(shrines);
    expect(overview.mappedSites).toBe(2);
    expect(overview.sitesWithNeighbours).toBe(2);
  });

  it('names a meeting in CATEGORY_ORDER, whichever way round the pair was found', () => {
    // 'sikh + muslim' and 'muslim + sikh' must be one row, not two.
    const shrines = buildShrines([
      row({ Name: 'Gurdwara', Category: 'Sikh Gurdwara', Latitude: '31.5000' }),
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5018' }),
      row({ Name: 'Shrine 2', Category: 'Muslim Shrine', Latitude: '31.5027' }),
    ]);
    const { meetings } = buildSharedGroundOverview(shrines);
    expect(meetings).toHaveLength(1);
    expect(meetings[0]!.traditions).toEqual(['muslim', 'sikh']);
    expect(meetings[0]!.pairs).toBe(2);
  });

  it('orders meetings by frequency, then by the closest pair', () => {
    const shrines = buildShrines([
      row({ Name: 'A', Category: 'Muslim Shrine', Latitude: '31.5000' }),
      row({ Name: 'B', Category: 'Sikh Gurdwara', Latitude: '31.5009' }), // ~100 m
      row({ Name: 'C', Category: 'Sikh Gurdwara', Latitude: '31.5018' }), // ~200 m
      row({ Name: 'D', Category: 'Hindu Temple', Latitude: '31.5045' }), // ~500 m
    ]);
    const { meetings } = buildSharedGroundOverview(shrines);
    expect(meetings[0]!.traditions).toEqual(['muslim', 'sikh']);
    expect(meetings[0]!.pairs).toBe(2);
    expect(meetings.map((m) => m.pairs)).toEqual([...meetings.map((m) => m.pairs)].sort((a, b) => b - a));
  });

  it('never summarises a shared pin as the nearest measured distance', () => {
    /*
     * The defect this assertion was written for. Two of the real
     * cross-tradition pairs share a pin, and the meetings row printed "21 m"
     * and "0 m" for them while the list below correctly read "same recorded
     * location" — the archive contradicting itself between a summary and the
     * thing it summarises. A summary is still a display.
     */
    const shrines = buildShrines([
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5000', Longitude: '74.3000' }),
      row({ Name: 'Temple', Category: 'Hindu Temple', Latitude: '31.5000', Longitude: '74.3000' }),
      row({ Name: 'Temple 2', Category: 'Hindu Temple', Latitude: '31.5036', Longitude: '74.3000' }),
    ]);
    const { meetings } = buildSharedGroundOverview(shrines);
    expect(meetings).toHaveLength(1);
    expect(meetings[0]!.pairs).toBe(2);
    expect(meetings[0]!.nearestSamePin).toBe(true);
  });

  it('leaves nearestSamePin false when every pair was actually measured', () => {
    const shrines = buildShrines([
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5000' }),
      row({ Name: 'Temple', Category: 'Hindu Temple', Latitude: '31.5018' }), // ~200 m
    ]);
    const { meetings } = buildSharedGroundOverview(shrines);
    expect(meetings[0]!.nearestSamePin).toBe(false);
    expect(meetings[0]!.nearestM).toBeGreaterThan(SAME_PIN_THRESHOLD_M);
  });

  it('reports shared pins separately from measured distances', () => {
    const shrines = buildShrines([
      row({ Name: 'Shrine', Category: 'Muslim Shrine', Latitude: '31.5498', Longitude: '74.3170' }),
      row({ Name: 'Temple', Category: 'Hindu Temple', Latitude: '31.5498', Longitude: '74.3170' }),
    ]);
    const overview = buildSharedGroundOverview(shrines);
    expect(overview.crossTradition).toHaveLength(1);
    expect(overview.samePinPairs).toBe(1);
  });

  it('carries the radius it was computed at, so no view assumes the default', () => {
    const shrines = buildShrines([
      row({ Name: 'A', Category: 'Muslim Shrine', Latitude: '31.5000' }),
      row({ Name: 'B', Category: 'Sikh Gurdwara', Latitude: '31.5090' }), // ~1 km
    ]);
    expect(buildSharedGroundOverview(shrines).crossTradition).toHaveLength(0);
    const wider = buildSharedGroundOverview(shrines, 2000);
    expect(wider.radiusM).toBe(2000);
    expect(wider.crossTradition).toHaveLength(1);
  });
});

describe('the overview against the shipped snapshot', () => {
  /*
   * Floors, not equalities, for the same reason the block above uses them: the
   * sheet is production and moves. But the floors are set at the numbers
   * measured on 29 August 2026 rather than well below them, because the failure
   * this page can actually have is the quiet one — adjacency silently dropping
   * to a handful because a coordinate column changed name — and a floor of 8
   * would not have noticed the archive losing three quarters of its shared
   * ground.
   */
  it('holds cross-tradition adjacency across every tradition it documents', async () => {
    const snapshot = (await import('../../../data/shrines-fallback.json')).default as {
      rows: ShrineRow[];
    };
    const overview = buildSharedGroundOverview(buildShrines(snapshot.rows));

    expect(overview.mappedSites).toBeGreaterThanOrEqual(160);
    expect(overview.pairs).toBeGreaterThanOrEqual(70);
    expect(overview.crossTradition.length).toBeGreaterThanOrEqual(38);
    expect(overview.crossTraditionSites).toBeGreaterThanOrEqual(40);
    expect(overview.sitesWithNeighbours).toBeGreaterThanOrEqual(60);

    // All six. This is the claim the page's headline makes, so it is the claim
    // the test makes: not "several traditions are adjacent somewhere" but that
    // every tradition the archive documents stands beside another one.
    expect(overview.traditions).toEqual([
      'muslim',
      'hindu',
      'sikh',
      'nanakpanthi',
      'jain',
      'secular',
    ]);
  });

  it('every pair it reports is genuinely two different traditions', async () => {
    const snapshot = (await import('../../../data/shrines-fallback.json')).default as {
      rows: ShrineRow[];
    };
    const overview = buildSharedGroundOverview(buildShrines(snapshot.rows));
    for (const pair of overview.crossTradition) {
      expect(pair.traditionA).not.toEqual(pair.traditionB);
      expect(pair.a.id).not.toEqual(pair.b.id);
      expect(pair.distanceM).toBeLessThanOrEqual(overview.radiusM);
    }
    // The meetings partition the pairs exactly — no pair counted twice, none lost.
    const counted = overview.meetings.reduce((sum, m) => sum + m.pairs, 0);
    expect(counted).toBe(overview.crossTradition.length);

    // No meeting reports a measured distance that is really a shared pin. Two
    // of the real pairs are, which is what made this a defect rather than a
    // hypothetical.
    for (const meeting of overview.meetings) {
      if (meeting.nearestSamePin) continue;
      expect(meeting.nearestM).toBeGreaterThan(SAME_PIN_THRESHOLD_M);
    }
    expect(overview.meetings.some((m) => m.nearestSamePin)).toBe(true);
  });
});
