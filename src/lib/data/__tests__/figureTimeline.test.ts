// @vitest-environment node
/**
 * A bar has two ends. The record often has one, and sometimes none.
 *
 * Every other surface in this archive can hedge a date in prose — "c. 1643",
 * "1416 AH, which may be the saint's death rather than the building's", "date
 * not recorded". A strip cannot. A mark on a century axis is a position, and a
 * position is a claim; there is no way to draw "we do not know" and no way to
 * draw "one of these two years" that a reader will not read as a lifespan.
 *
 * That makes this the same class of surface as `/almanac`'s calendar grid, and
 * it gets the same treatment: the refusals live in the builder, where a test can
 * hold them, rather than in the component, where they would be one careless
 * refactor from disappearing. Three failures are asserted impossible, and each
 * of them is the *plausible* implementation:
 *
 *  - reading `figureCentury` (which falls back died → born) and drawing a bar
 *    across the century it names — six of the fifty-one order members have one
 *    year, and each would gain a hundred-year life;
 *  - treating a Hijri-only date as a number because it contains digits —
 *    Shah Gohar Peer's "11 Rabīʿ al-Sānī 729 AH" would file a man who died
 *    around 1422 CE in the eighth century;
 *  - sorting two years and calling the smaller one the birth, which turns a
 *    contradiction in the source into a tidy bar.
 *
 * The last of those fires on no row in the shipped graph. It is tested with
 * synthetic input for the same reason the check exists: the day it fires is the
 * day nobody is looking.
 */
import { describe, it, expect } from 'vitest';
import {
  axisPosition,
  buildFigureTimeline,
  labelledCenturies,
  type FigureTimeline,
} from '../figureTimeline';
import kg from '../../../../data/kg.json';
import type { KGSaint, KGStore } from '../../../types/kg';

const store = kg as unknown as KGStore;

/** The members of one order, the way OrderPage assembles them. */
function membersOf(orderSlug: string): KGSaint[] {
  const slugs = new Set(
    store.relations
      .filter((r) => r.type === 'belongs_to_order' && r.object === `order:${orderSlug}`)
      .map((r) => r.subject.replace(/^saint:/, '')),
  );
  return store.saints.filter((s) => slugs.has(s.slug));
}

describe('a figure the record cannot place is not on the axis', () => {
  it('leaves a figure with no date off the rows and names the reason', () => {
    const t = buildFigureTimeline([
      { born: '1500', died: '1590' },
      { born: '1600', died: '1670' },
      { born: null, died: null },
    ])!;
    expect(t.rows).toHaveLength(2);
    expect(t.unplaced).toEqual([{ figure: { born: null, died: null }, reason: 'undated' }]);
  });

  it('refuses a Hijri-only date rather than converting it', () => {
    /* Two real strings from the graph. Converting either is arithmetic anyone
       could do and neither is this archive's to do (RULE 2) — a Hijri year
       spans parts of two Gregorian ones, and the entries that care hedge it in
       prose. */
    const t = buildFigureTimeline([
      { born: '1500', died: '1590' },
      { born: '1600', died: '1670' },
      { born: null, died: '11 Rabīʿ al-Sānī 729 AH / 21 Ramzan 825 AH' },
    ])!;
    expect(t.rows).toHaveLength(2);
    expect(t.unplaced.map((u) => u.reason)).toEqual(['undated']);
  });

  it('accepts a Hijri date the source itself converted', () => {
    /* Rule 1 of `gregorianYear`: a year marked CE wins even beside an AH one,
       because that conversion is the source's, not ours. */
    const t = buildFigureTimeline([
      { born: '1500', died: '1590' },
      { born: '1576 CE, Lahore', died: '8 Muharram 1040 AH / 8 August 1630 CE' },
    ])!;
    expect(t.rows.map((r) => [r.from, r.to])).toContainEqual([1576, 1630]);
  });
});

describe('one recorded year is a point, never a bar', () => {
  it('marks a death-only figure at the death year and says so', () => {
    const t = buildFigureTimeline([
      { born: '1170', died: '1267' },
      { born: null, died: '1245' },
    ])!;
    const point = t.rows.find((r) => r.point !== null)!;
    expect(point.point).toBe('died');
    expect(point.from).toBe(1245);
    expect(point.to).toBe(1245);
  });

  it('marks a birth-only figure at the birth year and says so', () => {
    /* Khwaja Muhammad Qasim Sadiq, born 1846, no death year recorded. */
    const t = buildFigureTimeline([
      { born: '1713', died: '1775' },
      { born: '1846', died: null },
    ])!;
    const point = t.rows.find((r) => r.point !== null)!;
    expect(point.point).toBe('born');
    expect(point.from).toBe(1846);
  });

  it('never gives a one-year figure a span', () => {
    for (const slug of ['chishtiyya', 'suhrawardiyya', 'qadiriyya', 'qalandariyya', 'naqshbandiyya']) {
      const t = buildFigureTimeline(membersOf(slug))!;
      for (const row of t.rows) {
        if (row.point !== null) {
          expect(row.from, `${slug}/${row.figure.slug} drew a span from one year`).toBe(row.to);
        }
      }
    }
  });
});

describe('two years in the wrong order are reported, not tidied', () => {
  it('does not swap them into a bar', () => {
    const bad = { born: '1700', died: '1650' };
    const t = buildFigureTimeline([{ born: '1500', died: '1590' }, { born: '1600', died: '1670' }, bad])!;
    expect(t.rows.map((r) => r.figure)).not.toContain(bad);
    expect(t.unplaced).toContainEqual({ figure: bad, reason: 'contradictory' });
  });

  it('fires on nothing in the shipped graph, which is why it is synthetic above', () => {
    const reasons = ['chishtiyya', 'suhrawardiyya', 'qadiriyya', 'qalandariyya', 'naqshbandiyya']
      .flatMap((slug) => buildFigureTimeline(membersOf(slug))!.unplaced)
      .map((u) => u.reason);
    expect(reasons).not.toContain('contradictory');
  });
});

describe('the axis', () => {
  it('snaps out to whole centuries and opens on a century’s first year', () => {
    const t = buildFigureTimeline([
      { born: '1173', died: '1266' },
      { born: '1859', died: '1937' },
    ])!;
    expect([t.fromCentury, t.toCentury]).toEqual([12, 20]);
    expect([t.axisFrom, t.axisTo]).toEqual([1101, 2000]);
    expect(t.centuries).toHaveLength(9);
  });

  it('keeps every placed year inside 0–100', () => {
    for (const slug of ['chishtiyya', 'suhrawardiyya', 'qadiriyya', 'qalandariyya', 'naqshbandiyya']) {
      const t: FigureTimeline<KGSaint> = buildFigureTimeline(membersOf(slug))!;
      for (const row of t.rows) {
        for (const year of [row.from, row.to]) {
          const pct = axisPosition(t, year);
          expect(pct, `${slug}/${row.figure.slug} at ${year}`).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('reads chronologically down the page', () => {
    const t = buildFigureTimeline(membersOf('qadiriyya'))!;
    const ends = t.rows.map((r) => r.to);
    expect([...ends].sort((a, b) => a - b)).toEqual(ends);
  });
});

describe('the section hides rather than draw one bar', () => {
  it('returns null when fewer than two figures can be placed', () => {
    expect(buildFigureTimeline([{ born: '1600', died: '1670' }])).toBeNull();
    expect(buildFigureTimeline([{ born: '1600', died: '1670' }, { born: null, died: null }])).toBeNull();
    expect(buildFigureTimeline([])).toBeNull();
  });
});

describe('century labels thin without losing the ends', () => {
  it('keeps everything when it fits', () => {
    expect(labelledCenturies([12, 13, 14])).toEqual([12, 13, 14]);
  });

  it('always names the first and the last century of the span', () => {
    const out = labelledCenturies([12, 13, 14, 15, 16, 17, 18, 19, 20], 4);
    expect(out[0]).toBe(12);
    expect(out[out.length - 1]).toBe(20);
    expect(out.length).toBeLessThanOrEqual(5);
  });
});

describe('every order page has a strip worth drawing', () => {
  it('places at least two members of all five orders', () => {
    for (const slug of ['chishtiyya', 'suhrawardiyya', 'qadiriyya', 'qalandariyya', 'naqshbandiyya']) {
      const t = buildFigureTimeline(membersOf(slug));
      expect(t, `${slug} has no strip`).not.toBeNull();
      expect(t!.rows.length).toBeGreaterThanOrEqual(2);
    }
  });
});
