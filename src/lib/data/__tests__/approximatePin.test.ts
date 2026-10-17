import { describe, it, expect } from 'vitest';
import { pinIsApproximate } from '../approximatePin';
import { buildShrines } from '../shrineModel';
import { makeShrineRow } from '../../../test/utils';
import fallback from '../../../data/shrines-fallback.json';
import type { ShrineRow } from '../../../types/shrine';

describe('pinIsApproximate', () => {
  it('reads the entry’s own words about its pin', () => {
    const [landmark, precise] = buildShrines([
      makeShrineRow({
        Name: 'Landmark',
        Location: "Pin is Mochi Gate's own coordinate (an approximate landmark).",
      }),
      makeShrineRow({ Name: 'Precise', Location: 'Lahore, Punjab, Pakistan' }),
    ]);
    expect(pinIsApproximate(landmark)).toBe(true);
    expect(pinIsApproximate(precise)).toBe(false);
  });

  it('is not fooled by an approximate date', () => {
    const [s] = buildShrines([
      makeShrineRow({
        Name: 'Dated',
        year_built_note: 'death as 1141 AH, which converts to approximately 1728 CE',
      }),
    ]);
    expect(pinIsApproximate(s)).toBe(false);
  });

  it('flags exactly the entries whose notes say so in the shipped data', () => {
    /* Read each new hit before updating this list: the public page tells a
       reader not to trust directions to these pins. */
    const rows = fallback.rows as unknown as ShrineRow[];
    const flagged = buildShrines(rows)
      .filter(pinIsApproximate)
      .map((s) => s.slug)
      .sort();
    expect(flagged).toMatchSnapshot();
  });
});
