// @vitest-environment node
/**
 * The archive's temporal shape, and what the century filter must not claim.
 *
 * `/graph` could be searched by name and by tradition and not by *when*, on an
 * archive spanning the 8th to the 21st century. The filter added for that is
 * three lines of `useMemo`; what needs asserting is the data it rests on, and
 * one number in particular:
 *
 * **63 of the 136 documented figures cannot be placed in a century at all** —
 * because the record gives a Hijri year, or no year. `figureCentury` returns
 * null rather than converting, since converting a Hijri year would be the
 * archive inventing a date (RULE 2). So the undated bucket is the *largest*
 * group in the row, and a filter that quietly dropped those figures would hide
 * nearly half the archive behind a control that looks complete.
 *
 * Asserted here rather than in the page, because it is a fact about the data.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { figureCentury } from '../figureDates';

const ROOT = join(__dirname, '..', '..', '..', '..');
const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));

interface Figure {
  slug: string;
  lineageOnly?: boolean;
  born?: string;
  died?: string;
  era?: string;
}
/* The figures the archive documents — `lineageOnly` nodes are masters named in
   someone else's chain with no site here, and the explorer excludes them so its
   counts describe the archive rather than the graph. */
const figures: Figure[] = (kg.saints as Figure[]).filter((s) => !s.lineageOnly);

const centuries = figures.map((f) => figureCentury(f));

describe('the centuries the archive can place a figure in', () => {
  it('documents a substantial set of figures', () => {
    expect(figures.length).toBeGreaterThan(100);
  });

  it('places some figures and refuses to place others', () => {
    const dated = centuries.filter((c) => c !== null);
    const undated = centuries.filter((c) => c === null);
    expect(dated.length).toBeGreaterThan(40);
    /* The number that makes the undated chip necessary. If this ever falls to a
       handful, the chip stops being the largest group and the note above the row
       ("nearly half") needs rewording. */
    expect(undated.length).toBeGreaterThan(30);
  });

  it('spans a range wide enough for the filter to be worth having', () => {
    const dated = centuries.filter((c): c is number => c !== null);
    expect(Math.min(...dated)).toBeLessThanOrEqual(11);
    expect(Math.max(...dated)).toBeGreaterThanOrEqual(20);
  });

  it('never invents a century from a Hijri-only date', () => {
    /* The rule the whole filter depends on. A figure whose only recorded dates
       are Hijri must come back null — a converted year would be a date the
       archive does not have. */
    const hijriOnly = figures.filter(
      (f) =>
        /\bAH\b|hijri|hijrah/i.test(`${f.born ?? ''} ${f.died ?? ''}`) &&
        !/\bCE\b|\bAD\b/i.test(`${f.born ?? ''} ${f.died ?? ''}`),
    );
    expect(hijriOnly.length).toBeGreaterThan(0);
    for (const figure of hijriOnly) {
      expect(figureCentury(figure), figure.slug).toBeNull();
    }
  });

  it('partitions the figures exactly once each', () => {
    /* Every figure lands in exactly one chip — a century or the undated
       bucket — so the chip counts sum to the whole. A filter whose parts do not
       add up to the total is one a reader cannot trust. */
    const counts = new Map<string, number>();
    for (const century of centuries) {
      const key = century === null ? 'undated' : String(century);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const summed = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(summed).toBe(figures.length);
  });
});
