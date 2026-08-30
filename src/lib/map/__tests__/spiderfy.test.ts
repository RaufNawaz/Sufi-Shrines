import { describe, it, expect } from 'vitest';
import { fanPositions, pileAround, type FanPoint } from '../spiderfy';

/**
 * The fan has one job a test can check: after it, no two markers are on top of
 * each other. Everything else about it is taste.
 *
 * These assert the property, not the coordinates — a different spiral constant
 * that still separates every pair is a legitimate change and should not turn
 * this file red.
 */

/** The radius the marker layer treats as one tap. Two fanned pins closer than
 *  twice this share a target, which is the bug being fixed. */
const TAP_RADIUS = 22;

function closestPair(points: FanPoint[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i += 1)
    for (let j = i + 1; j < points.length; j += 1)
      min = Math.min(min, Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y));
  return min;
}

describe('fanPositions', () => {
  it('gives one offset per marker', () => {
    for (const n of [1, 2, 5, 9, 10, 66, 169]) expect(fanPositions(n)).toHaveLength(n);
  });

  it('degenerates safely', () => {
    expect(fanPositions(0)).toEqual([]);
    expect(fanPositions(-3)).toEqual([]);
  });

  /* The whole point. 66 is the archive's real worst case — the Lahore pile
     measured on 30 August 2026 — and 169 is every marker at once, which cannot
     happen today but is one bad filter away from happening. */
  it.each([2, 3, 4, 5, 8, 9, 10, 12, 30, 66, 169])(
    'keeps %i markers a full tap target apart',
    (n) => {
      expect(closestPair(fanPositions(n))).toBeGreaterThan(TAP_RADIUS * 1.4);
    },
  );

  it('moves every marker off the pile, including the first', () => {
    /* A marker left at the anchor is indistinguishable from the pile the reader
       just tapped, so index 0 is not the centre. */
    for (const p of fanPositions(12)) expect(Math.hypot(p.x, p.y)).toBeGreaterThan(TAP_RADIUS);
  });

  it('stays inside a phone viewport for the pile that actually exists', () => {
    /* 66 markers, iPhone 13 at 390x844. A ring of 66 would need a 378px radius
       and put half the fan off-screen; the spiral is the reason this passes. */
    const extent = Math.max(...fanPositions(66).map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
    expect(extent).toBeLessThan(195);
  });
});

describe('pileAround', () => {
  const at = (entries: Array<[string, number, number]>) =>
    new Map(entries.map(([id, x, y]) => [id, { x, y }]));

  it('returns just the target when nothing is near', () => {
    expect(
      pileAround(
        at([
          ['a', 0, 0],
          ['b', 500, 500],
        ]),
        'a',
        30,
      ),
    ).toEqual(['a']);
  });

  it('is transitive — a chain of near-misses is one shape to a reader', () => {
    /* a—b and b—c are each 25px; a—c is 50px and outside the radius. The reader
       sees one smudge, so all three fan. */
    const pile = pileAround(
      at([
        ['a', 0, 0],
        ['b', 25, 0],
        ['c', 50, 0],
      ]),
      'a',
      30,
    );
    expect(pile.sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not cross a real gap', () => {
    const pile = pileAround(
      at([
        ['a', 0, 0],
        ['b', 25, 0],
        ['far', 200, 0],
        ['far2', 225, 0],
      ]),
      'a',
      30,
    );
    expect(pile.sort()).toEqual(['a', 'b']);
  });

  it('finds the same pile whichever member is tapped', () => {
    const positions = at([
      ['a', 0, 0],
      ['b', 20, 5],
      ['c', 35, 12],
      ['d', 400, 400],
    ]);
    const fromA = pileAround(positions, 'a', 30).sort();
    const fromC = pileAround(positions, 'c', 30).sort();
    expect(fromA).toEqual(fromC);
    expect(fromA).toEqual(['a', 'b', 'c']);
  });

  it('returns nothing for an id it does not hold', () => {
    expect(pileAround(at([['a', 0, 0]]), 'ghost', 30)).toEqual([]);
  });

  it('puts the tapped marker first, so the fan can keep it under the cursor', () => {
    const pile = pileAround(
      at([
        ['a', 0, 0],
        ['b', 10, 0],
        ['c', 20, 0],
      ]),
      'b',
      30,
    );
    expect(pile[0]).toBe('b');
  });
});
