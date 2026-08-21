// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildCoverage } from '../coverage';
import { buildShrines } from '../shrineModel';
import { makeShrineRow } from '../../../test/utils';
import type { ShrineRow } from '../../../types/shrine';

/**
 * A page that states what the archive does not know must be right about it, or
 * it is worse than saying nothing. So this checks the arithmetic against
 * fixtures *and* the claims against the shipped snapshot.
 */
describe('buildCoverage', () => {
  it('counts bibliography items from a Description heading', () => {
    const rows = [
      makeShrineRow({
        Name: 'Cited',
        Description: 'Prose.\n\n## Sources\n- One item\n- Two items\n',
      }),
      makeShrineRow({ Name: 'Uncited', Description: 'Prose with no bibliography.' }),
    ];
    const c = buildCoverage(buildShrines(rows));
    expect(c.bibliography.items).toBe(2);
    expect(c.bibliography.withAny).toBe(1);
    expect(c.bibliography.withNone).toBe(1);
  });

  it('counts a bare URL as a bibliography item', () => {
    const rows = [
      makeShrineRow({ Name: 'Linked', Description: '## Sources\nSee https://example.org/x\n' }),
    ];
    expect(buildCoverage(buildShrines(rows)).bibliography.items).toBe(1);
  });

  it('ignores list items that appear before the bibliography heading', () => {
    // Article prose uses `- ` lists too; counting those would inflate the one
    // number on this page that is a claim about rigour.
    const rows = [
      makeShrineRow({
        Name: 'Listy',
        Description: '- a ritual\n- another ritual\n\n## Sources\n- One real citation\n',
      }),
    ];
    expect(buildCoverage(buildShrines(rows)).bibliography.items).toBe(1);
  });

  it('separates unrecorded values from recognised ones', () => {
    const rows = [
      makeShrineRow({ Name: 'A', support_level: 'Field-verified' }),
      makeShrineRow({ Name: 'B', support_level: '' }),
      makeShrineRow({ Name: 'C', support_level: 'Something Unmapped' }),
    ];
    const c = buildCoverage(buildShrines(rows));
    expect(c.support.counts['field-verified']).toBe(1);
    // Blank and unrecognised both mean "the archive does not say", which is a
    // different statement from any level.
    expect(c.support.unrecorded).toBe(2);
  });

  it('counts photographs across all image columns', () => {
    const rows = [
      makeShrineRow({ Name: 'Photographed', 'Image 1': 'a.jpg', 'Image 5': 'b.jpg' }),
      makeShrineRow({ Name: 'Bare' }),
    ] as ShrineRow[];
    const c = buildCoverage(buildShrines(rows));
    expect(c.photos.items).toBe(2);
    expect(c.photos.withNone).toBe(1);
  });

  it('reports an approximate pin from the entry’s own words', () => {
    const rows = [
      makeShrineRow({
        Name: 'Approximate',
        Location: "Lahore. Pin is a landmark, not the shrine's exact position.",
      }),
      makeShrineRow({ Name: 'Precise', Location: 'Lahore, Punjab, Pakistan' }),
    ];
    expect(buildCoverage(buildShrines(rows)).location.approximatePin).toBe(1);
  });

  it('counts a recorded date hedge as content, not as a missing value', () => {
    const rows = [
      makeShrineRow({ Name: 'Hedged', year_built: '1041', year_built_note: 'may be a death date' }),
      makeShrineRow({ Name: 'Plain', year_built: '1900', year_built_precision: 'exact' }),
    ] as ShrineRow[];
    const c = buildCoverage(buildShrines(rows));
    expect(c.dates.withYear).toBe(2);
    expect(c.dates.exact).toBe(1);
    expect(c.dates.hedged).toBe(1);
  });
});

describe('coverage of the shipped snapshot', () => {
  it('matches what the data actually says', async () => {
    /*
     * Measured 21 August 2026. These are floors and ceilings rather than
     * equalities — the sheet is production and moves — but they pin the claims
     * the page makes.
     *
     * One of them is a correction: CLAUDE.md's standing finding that "49 of 167
     * entries have no bibliography at all" was true when written and is now
     * wrong. 168 of 169 carry one, 544 items in total. A page computed from the
     * data cannot go stale like a note can, which is the argument for building
     * it.
     */
    const snapshot = (await import('../../../data/shrines-fallback.json')).default as {
      rows: ShrineRow[];
    };
    const c = buildCoverage(buildShrines(snapshot.rows));

    expect(c.total).toBeGreaterThan(150);
    expect(c.bibliography.withNone).toBeLessThanOrEqual(3);
    expect(c.bibliography.items).toBeGreaterThan(400);
    expect(c.bibliography.withThreeOrMore).toBeGreaterThan(80);

    // Every level and tradition tallied must add up to the whole archive.
    for (const dist of [c.support, c.info, c.tradition]) {
      const summed = Object.values(dist.counts).reduce((a, b) => a + b, 0) + dist.unrecorded;
      expect(summed).toBe(c.total);
    }

    // The gaps the archive really does have, and should say so.
    expect(c.photos.withNone).toBeGreaterThan(20);
    expect(c.support.counts['field-verified']).toBeLessThan(c.total / 2);
  });
});
