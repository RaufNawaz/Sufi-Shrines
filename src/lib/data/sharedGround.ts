import type { Shrine } from '../../types/shrine';
import { categoryKey, type CategoryKey } from './categoryKey';
import { haversineKm } from './shrineModel';

/**
 * Which sites stand within walking distance of a given one, and how many
 * traditions are among them.
 *
 * The archive documents six traditions and presents each site as an island.
 * The coordinates say otherwise: 62 of 169 sites are within 800 m of another,
 * and in eight places those neighbours belong to a different tradition. Data
 * Darbar is 222 m from Gurdwara Chowmala Sahib; Dargah Pir Ratan Nath is 100 m
 * from Gurdwara Bhai Beba Singh. For much of Punjab and Sindh that adjacency
 * *is* the heritage — these communities built on the same streets — and until
 * now nothing in the interface could show it. See
 * `docs/planning/SHARED_GROUND_VISION.md`.
 *
 * **Exact, never chained.** The tempting model is a cluster: single-link
 * everything within the radius and call each component a complex. Measured,
 * that yields one "cluster" of 15 sites whose extent is 3358 m — transitive
 * closure had strung together the whole of central Lahore and called it a
 * courtyard. So the unit here is "within R of *this* site", which means exactly
 * what it says.
 */

/** Walking distance, in metres. Roughly ten minutes on foot. */
export const SHARED_GROUND_RADIUS_M = 800;

/**
 * Below this, two records are treated as sharing a pin rather than as being a
 * measured distance apart. Every identical-coordinate group in the data is a
 * documented approximation — the four Miani Sahib darbars share one pin because
 * the survey gives no position within the graveyard; Darbar Malik Ahmad Ayaz
 * carries Data Darbar's pin because the survey ties its location to it. A few
 * metres of slack so a rounding difference in the sheet does not turn one of
 * those into a spurious "12 m apart".
 */
export const SAME_PIN_THRESHOLD_M = 25;

export interface Neighbour {
  shrine: Shrine;
  /** Great-circle distance in metres, rounded. Meaningless when `samePin`. */
  distanceM: number;
  /**
   * True when the two records share a recorded position rather than being a
   * measured distance apart. Views must say "same recorded location" instead of
   * printing a distance: a distance this archive did not measure must never be
   * displayed as one it did.
   */
  samePin: boolean;
  tradition: CategoryKey;
  /** True when this neighbour belongs to a different tradition than the anchor. */
  otherTradition: boolean;
}

export interface SharedGround {
  neighbours: Neighbour[];
  /** Distinct traditions among the neighbours, excluding the anchor's own. */
  otherTraditions: CategoryKey[];
  /** How many neighbours share the anchor's recorded pin. */
  samePinCount: number;
}

/**
 * Sites within `radiusM` of `shrine`, nearest first, with same-pin records
 * ordered ahead of measured ones (they are the closest thing to "here").
 */
export function findSharedGround(
  shrine: Shrine,
  all: readonly Shrine[],
  radiusM: number = SHARED_GROUND_RADIUS_M,
): SharedGround {
  const anchorTradition = categoryKey(shrine.category);

  const neighbours: Neighbour[] = [];
  // An unmapped row (no coordinates — the 22 Aug ruling keeps it as a page) has
  // no ground to share, and cannot anchor or appear in this list.
  const from = shrine.latLng;
  if (!from) return { neighbours: [], otherTraditions: [], samePinCount: 0 };
  for (const other of all) {
    if (other.id === shrine.id) continue;
    if (!other.latLng) continue;
    const distanceM = haversineKm(from, other.latLng) * 1000;
    if (distanceM > radiusM) continue;
    const tradition = categoryKey(other.category);
    neighbours.push({
      shrine: other,
      distanceM: Math.round(distanceM),
      samePin: distanceM <= SAME_PIN_THRESHOLD_M,
      tradition,
      // 'default' is the bucket for a category the code does not recognise;
      // claiming it is "a different tradition" would be an inference from a
      // gap, so it never counts as one.
      otherTradition:
        tradition !== anchorTradition && tradition !== 'default' && anchorTradition !== 'default',
    });
  }

  neighbours.sort((a, b) => {
    if (a.samePin !== b.samePin) return a.samePin ? -1 : 1;
    if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
    return a.shrine.name.localeCompare(b.shrine.name);
  });

  const otherTraditions = [
    ...new Set(neighbours.filter((n) => n.otherTradition).map((n) => n.tradition)),
  ];

  return {
    neighbours,
    otherTraditions,
    samePinCount: neighbours.filter((n) => n.samePin).length,
  };
}

export interface CrossTraditionAdjacency {
  a: Shrine;
  b: Shrine;
  distanceM: number;
  samePin: boolean;
}

/**
 * Every pair of sites from *different* traditions standing within `radiusM` of
 * each other, nearest first. Each pair appears once.
 *
 * This is the archive-wide view of the same fact: eight places where the
 * traditions it documents share a street.
 */
export function crossTraditionAdjacencies(
  all: readonly Shrine[],
  radiusM: number = SHARED_GROUND_RADIUS_M,
): CrossTraditionAdjacency[] {
  const pairs: CrossTraditionAdjacency[] = [];
  for (let i = 0; i < all.length; i++) {
    const a = all[i]!;
    const traditionA = categoryKey(a.category);
    if (traditionA === 'default') continue;
    for (let j = i + 1; j < all.length; j++) {
      const b = all[j]!;
      const traditionB = categoryKey(b.category);
      if (traditionB === 'default' || traditionB === traditionA) continue;
      if (!a.latLng || !b.latLng) continue; // unmapped: no geography to compare
      const distanceM = haversineKm(a.latLng, b.latLng) * 1000;
      if (distanceM > radiusM) continue;
      pairs.push({
        a,
        b,
        distanceM: Math.round(distanceM),
        samePin: distanceM <= SAME_PIN_THRESHOLD_M,
      });
    }
  }
  return pairs.sort((p, q) => p.distanceM - q.distanceM);
}
