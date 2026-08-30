import type { Shrine } from '../../types/shrine';
import { CATEGORY_ORDER, categoryKey, type CategoryKey } from './categoryKey';
import { haversineKm } from './shrineModel';

/**
 * Which sites stand within walking distance of a given one, and how many
 * traditions are among them.
 *
 * The archive documents six traditions and presents each site as an island.
 * The coordinates say otherwise: 62 of the 169 sites are within 800 m of
 * another, and 40 of those pairings cross a tradition. Data Darbar is 222 m
 * from Gurdwara Chowmala Sahib; Dargah Pir Ratan Nath is 100 m from Gurdwara
 * Bhai Beba Singh. For much of Punjab and Sindh that adjacency *is* the
 * heritage — these communities built on the same streets — and until now
 * nothing in the interface could show it. See
 * `docs/planning/SHARED_GROUND_VISION.md`.
 *
 * **The 40 is a re-measurement, and the number it replaces is why this sentence
 * carries a date.** This docstring, `SharedGround.tsx`'s, the vision doc and
 * `CLAUDE.md` all said "in eight places" — written 20 August 2026 and quoted as
 * current for nine days. Measured 29 August 2026 against
 * `src/data/shrines-fallback.json`: 74 pairs inside 800 m, 40 of them
 * cross-tradition, over 42 distinct sites, and all six traditions appear in at
 * least one. `buildSharedGroundOverview` exists so no view ever has to trust a
 * number written in a comment, this one included.
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
  /** `a`'s tradition. Never 'default' — an unrecognised category cannot be
   *  asserted to differ from anything (see `otherTradition` above). */
  traditionA: Exclude<CategoryKey, 'default'>;
  /** `b`'s tradition. */
  traditionB: Exclude<CategoryKey, 'default'>;
  distanceM: number;
  samePin: boolean;
}

/**
 * Every pair of sites from *different* traditions standing within `radiusM` of
 * each other, nearest first. Each pair appears once.
 *
 * This is the archive-wide view of the same fact: the places where the
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
        traditionA,
        traditionB,
        distanceM: Math.round(distanceM),
        samePin: distanceM <= SAME_PIN_THRESHOLD_M,
      });
    }
  }
  return pairs.sort((p, q) => p.distanceM - q.distanceM);
}

/** How often two given traditions stand within the radius of each other. */
export interface TraditionMeeting {
  /** The pair, in CATEGORY_ORDER, so `muslim + sikh` is never also `sikh + muslim`. */
  traditions: [Exclude<CategoryKey, 'default'>, Exclude<CategoryKey, 'default'>];
  /** Adjacent pairs of sites with exactly these two traditions. */
  pairs: number;
  /**
   * The closest of them, in metres — meaningless, and not to be displayed,
   * when `nearestSamePin`.
   */
  nearestM: number;
  /**
   * True when the closest of these pairs shares one recorded position rather
   * than being a measured distance apart.
   *
   * Without this the summary row contradicts the list it summarises: two of the
   * cross-tradition pairs share a pin, and this column printed "21 m" and "0 m"
   * for them while the rows below correctly said "same recorded location". Same
   * defect the whole feature exists to prevent, one level up — a summary is
   * still a display, and the rule does not stop applying because the number got
   * smaller. Any pair at or under SAME_PIN_THRESHOLD_M is flagged, and the list
   * is sorted by distance, so the first pair seen for a meeting is its nearest.
   */
  nearestSamePin: boolean;
}

export interface SharedGroundOverview {
  /** Sites carrying coordinates. The denominator that means something: an
   *  unmapped row has no ground to share, and counting it as "not adjacent"
   *  would report a gap in the survey as a fact about the geography. */
  mappedSites: number;
  /** Sites with at least one other site inside the radius, of any tradition. */
  sitesWithNeighbours: number;
  /** All adjacent pairs, cross-tradition or not. */
  pairs: number;
  /** The cross-tradition subset, nearest first. */
  crossTradition: CrossTraditionAdjacency[];
  /** Distinct sites appearing in at least one cross-tradition pair. */
  crossTraditionSites: number;
  /** Which traditions meet which, most frequent first. */
  meetings: TraditionMeeting[];
  /** Distinct traditions appearing in any cross-tradition pair, canonical order. */
  traditions: Exclude<CategoryKey, 'default'>[];
  /** Cross-tradition pairs that share a recorded pin rather than a measured
   *  distance. Surfaced rather than buried: a view that prints "40 pairs, the
   *  nearest 0 m apart" without saying two of them are one recorded position
   *  is reporting an approximation as a measurement. */
  samePinPairs: number;
  /** The radius these numbers were computed at, so a view never has to assume
   *  the default. */
  radiusM: number;
}

/**
 * Everything the archive can say about shared ground without naming a place.
 *
 * Deliberately no grouping. `docs/planning/SHARED_GROUND_VISION.md` records
 * what happened when adjacency was chained into clusters: single-linking
 * everything within 800 m produced one "cluster" of 15 sites whose extent was
 * 3358 m — transitive closure had strung together the whole of central Lahore
 * and called it a courtyard. The units here are the two that survive scrutiny:
 * a pair with a measured distance, and a count of pairs. Neither can be read as
 * a claim about a place the archive never measured.
 *
 * Every figure is computed from the data on each render for the reason `/about`
 * computes its own: a number in a document goes stale silently, and this one
 * already has — the vision doc, this file's own header and two component
 * docstrings all said "eight places", written 20 August 2026 and quoted as
 * current afterwards. Measured 29 August 2026 against the shipped snapshot,
 * the cross-tradition pair count is 40.
 */
export function buildSharedGroundOverview(
  all: readonly Shrine[],
  radiusM: number = SHARED_GROUND_RADIUS_M,
): SharedGroundOverview {
  const mapped = all.filter((s) => s.latLng);

  let pairs = 0;
  const withNeighbours = new Set<number>();
  for (let i = 0; i < mapped.length; i++) {
    const a = mapped[i]!;
    for (let j = i + 1; j < mapped.length; j++) {
      const b = mapped[j]!;
      if (haversineKm(a.latLng!, b.latLng!) * 1000 > radiusM) continue;
      pairs += 1;
      withNeighbours.add(a.id);
      withNeighbours.add(b.id);
    }
  }

  const crossTradition = crossTraditionAdjacencies(all, radiusM);

  const meetingByKey = new Map<string, TraditionMeeting>();
  const sites = new Set<number>();
  for (const pair of crossTradition) {
    sites.add(pair.a.id);
    sites.add(pair.b.id);
    // CATEGORY_ORDER, not alphabetical: the pair is a label the reader will see
    // beside the category chips, and it should read in the same order they do.
    const ordered = CATEGORY_ORDER.filter(
      (k) => k === pair.traditionA || k === pair.traditionB,
    ) as [Exclude<CategoryKey, 'default'>, Exclude<CategoryKey, 'default'>];
    const key = ordered.join('+');
    const existing = meetingByKey.get(key);
    if (existing) existing.pairs += 1;
    else
      meetingByKey.set(key, {
        traditions: ordered,
        pairs: 1,
        nearestM: pair.distanceM,
        nearestSamePin: pair.samePin,
      });
  }

  const meetings = [...meetingByKey.values()].sort(
    (m, n) =>
      n.pairs - m.pairs ||
      // A shared pin is as close as two records get, so it leads its tier —
      // and its `nearestM` is not a number to compare against a measured one.
      Number(n.nearestSamePin) - Number(m.nearestSamePin) ||
      m.nearestM - n.nearestM,
  );

  const present = new Set<Exclude<CategoryKey, 'default'>>();
  for (const meeting of meetings) for (const key of meeting.traditions) present.add(key);

  return {
    mappedSites: mapped.length,
    sitesWithNeighbours: withNeighbours.size,
    pairs,
    crossTradition,
    crossTraditionSites: sites.size,
    meetings,
    traditions: CATEGORY_ORDER.filter((k) => present.has(k)),
    samePinPairs: crossTradition.filter((p) => p.samePin).length,
    radiusM,
  };
}

/**
 * The sites taking part in at least one cross-tradition pair.
 *
 * Ids, not slugs, because the map keys its markers by id and a lens that has to
 * translate between the two on every render is a lens that will eventually
 * translate one of them wrong.
 */
export function crossTraditionParticipants(
  pairs: readonly CrossTraditionAdjacency[],
): Set<number> {
  const ids = new Set<number>();
  for (const pair of pairs) {
    ids.add(pair.a.id);
    ids.add(pair.b.id);
  }
  return ids;
}
