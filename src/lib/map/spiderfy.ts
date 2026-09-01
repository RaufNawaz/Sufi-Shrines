/**
 * Fanning a pile of markers out so each one can be reached.
 *
 * ## The measurement this exists for
 *
 * At the map's opening view, on 30 August 2026, the archive's 169 markers
 * formed **21 visually distinct shapes**. The median distance between a pin's
 * centre and its nearest neighbour's was **1 pixel**; 152 of 169 had another
 * pin's centre inside their own 22 px tap radius. Eight pins stood alone. The
 * largest single shape held **66 sites** — 39% of the archive — over Lahore.
 *
 * A reader who tapped that shape got whichever of 66 markers Leaflet had put on
 * top, with no way to reach the other 65 and no way to know they were there.
 * Full numbers in `docs/planning/MAP_PIN_DENSITY_2026-08-30.md`.
 *
 * ## What was chosen, and what it does not fix
 *
 * Ruled 30 August 2026, by Rauf, from four costed options: **fan on tap, and
 * leave the resting map alone.** Amended by Rauf on 1 September 2026: the tap
 * gesture went. A tap on a pile now flies the map toward it, and whatever
 * depth cannot separate — ten of these sites share exact coordinates — fans
 * out on its own at fan depth (`AUTO_FAN_ZOOM` in ShrineMarkers), gathering
 * again on the way back out. The resting-map half of the ruling stands: the
 * map still opens looking like a 21-entry collection, that half was considered
 * and declined, and this module does not quietly do it anyway. What it fixes
 * is reachability: at depth, every site is individually tappable,
 * keyboard-reachable and announced.
 *
 * ## Why the geometry is here and not in the component
 *
 * It is arithmetic with no Leaflet in it, which means it can be tested against
 * the property that actually matters — *no two fanned positions land within a
 * tap target of each other* — rather than against a screenshot. The component
 * that consumes it is doing DOM and event work that a unit test cannot see.
 */

export interface FanPoint {
  x: number;
  y: number;
}

/**
 * Below this many markers a ring reads better than a spiral: it is symmetrical,
 * it has an obvious centre, and every leader line is the same length. Above it
 * a ring's radius has to grow so fast that the fan leaves the viewport.
 */
const RING_LIMIT = 9;

/** Centre-to-centre spacing the fan tries to keep. A 30 px pin plus a 6 px gap
 *  — enough that two fanned pins never share a 22 px tap radius, which is the
 *  property `spiderfy.test.ts` asserts rather than assumes. */
const SEPARATION = 36;

/**
 * Where to put `count` markers that all sit at one point.
 *
 * Returns offsets in screen pixels from the pile's own position, in the order
 * the markers were given. Index 0 is *not* the centre — every marker moves,
 * because a pin left at the anchor is a pin the reader cannot tell apart from
 * the pile they just tapped.
 */
export function fanPositions(count: number): FanPoint[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0 }];

  if (count <= RING_LIMIT) {
    /* Radius from the chord: for `count` points evenly spaced on a circle, the
       centre-to-centre distance is 2·r·sin(π/count). Solving for r gives the
       smallest ring that still keeps SEPARATION between neighbours. */
    const radius = Math.max(SEPARATION, SEPARATION / (2 * Math.sin(Math.PI / count)));
    /* Start at -π/2 so the first marker is due north of the pile: a fan that
       begins at 3 o'clock reads as lopsided, and north is where a leader line
       is least likely to run under the marker's own tooltip. */
    return Array.from({ length: count }, (_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    });
  }

  /* An Archimedean spiral, so arc spacing stays near-constant as the radius
     grows: the angular step shrinks in proportion to the current leg length,
     which is what keeps two adjacent markers SEPARATION apart at turn 1 and at
     turn 5 alike. A ring of 66 would need a radius of 378 px and would leave
     every phone viewport; this reaches 66 in about five turns. */
  const points: FanPoint[] = [];
  let legLength = SEPARATION * 1.2;
  let angle = -Math.PI / 2;
  for (let i = 0; i < count; i += 1) {
    points.push({ x: legLength * Math.cos(angle), y: legLength * Math.sin(angle) });
    angle += SEPARATION / legLength;
    /* Grow the radius by one separation per full turn. Written as the fraction
       of a turn just taken, so the growth does not depend on how many markers
       happened to fall in this turn. */
    legLength += (SEPARATION * (SEPARATION / legLength)) / (2 * Math.PI);
  }
  return points;
}

/**
 * The markers that sit close enough to `target` to be one shape.
 *
 * Transitive on purpose — A near B and B near C puts all three in the pile even
 * when A and C are 40 px apart, because that is what the reader sees: one
 * connected smudge. Single-link clustering is also exactly how the 21 shapes in
 * the finding were counted, so the fan and the measurement agree about what a
 * pile is.
 */
export function pileAround<T>(positions: ReadonlyMap<T, FanPoint>, target: T, radius: number): T[] {
  const anchor = positions.get(target);
  if (!anchor) return [];

  const pile: T[] = [target];
  const seen = new Set<T>([target]);
  const queue: FanPoint[] = [anchor];

  while (queue.length) {
    const from = queue.pop() as FanPoint;
    for (const [id, point] of positions) {
      if (seen.has(id)) continue;
      if (Math.hypot(from.x - point.x, from.y - point.y) >= radius) continue;
      seen.add(id);
      pile.push(id);
      queue.push(point);
    }
  }
  return pile;
}
