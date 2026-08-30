import { describe, it, expect } from 'vitest';
import { filterShrines, hasActiveFilter } from '../shrineFilters';
import type { ShrineFilterState } from '../shrineFilters';
import type { Shrine } from '../../../types/shrine';

/**
 * The filters, as a function, because they used to be a `useMemo` in the
 * sidebar and the map never saw them — `/?category=jain` reported "3 of 171
 * sites" beside 169 pins, on a URL built to be shared.
 *
 * These cases pin the two rules that are decisions rather than mechanics, plus
 * the conjunction, because those are what a future reader would most reasonably
 * get wrong while "tidying".
 */
const NONE: ShrineFilterState = {
  categories: [],
  verifiedOnly: false,
  savedOnly: false,
  region: '',
  eraMin: 1,
  eraMax: 21,
};

const CONTEXT = { savedSlugs: [], sharedSlugs: [], hasEraFilter: false };

function shrine(overrides: Partial<Shrine>): Shrine {
  return {
    id: 1,
    slug: 's',
    name: 'S',
    category: 'Muslim Shrine',
    supportLevel: 'Web-compiled',
    region: 'Punjab',
    founded: '',
    ...overrides,
  } as Shrine;
}

describe('filterShrines', () => {
  it('treats an empty category list as every category, not as none', () => {
    /* The additive all-on default. Read the other way — "nothing selected, so
       show nothing" — the front door is an empty map, which is the kind of
       inversion that looks like a data outage. */
    const all = [shrine({ id: 1 }), shrine({ id: 2, category: 'Jain Temple' })];
    expect(filterShrines(all, NONE, CONTEXT)).toHaveLength(2);
  });

  it('excludes an undated entry from an era filter rather than keeping it', () => {
    /* A century range is a claim about when a place was built, and "we do not
       know" is not an answer to it. The opposite rule would put every undated
       entry in every century. */
    const rows = [shrine({ id: 1, founded: '12th century' }), shrine({ id: 2, founded: '' })];
    const kept = filterShrines(
      rows,
      { ...NONE, eraMin: 11, eraMax: 13 },
      { ...CONTEXT, hasEraFilter: true },
    );
    expect(kept.map((s) => s.id)).toEqual([1]);
  });

  it('leaves an undated entry alone when the era filter is off', () => {
    const rows = [shrine({ id: 1, founded: '' })];
    expect(filterShrines(rows, { ...NONE, eraMin: 11, eraMax: 13 }, CONTEXT)).toHaveLength(1);
  });

  it('combines filters as a conjunction, not a union', () => {
    const rows = [
      shrine({ id: 1, category: 'Jain Temple', supportLevel: 'Field-verified' }),
      shrine({ id: 2, category: 'Jain Temple', supportLevel: 'Web-compiled' }),
      shrine({ id: 3, category: 'Muslim Shrine', supportLevel: 'Field-verified' }),
    ];
    const kept = filterShrines(rows, { ...NONE, categories: ['jain'], verifiedOnly: true }, CONTEXT);
    expect(kept.map((s) => s.id)).toEqual([1]);
  });

  it('never mutates the array it is given', () => {
    /* The map and the sidebar both call this on the same array in the same
       render. */
    const rows = [shrine({ id: 1 }), shrine({ id: 2, category: 'Jain Temple' })];
    const before = [...rows];
    filterShrines(rows, { ...NONE, categories: ['jain'] }, CONTEXT);
    expect(rows).toEqual(before);
  });
});

describe('hasActiveFilter', () => {
  it('is false when nothing narrows the archive', () => {
    expect(hasActiveFilter(NONE, { sharedSlugs: [], hasEraFilter: false })).toBe(false);
  });

  it('is true for each filter on its own', () => {
    const cases: ShrineFilterState[] = [
      { ...NONE, categories: ['jain'] },
      { ...NONE, verifiedOnly: true },
      { ...NONE, savedOnly: true },
      { ...NONE, region: 'Sindh' },
    ];
    for (const filters of cases) {
      expect(hasActiveFilter(filters, { sharedSlugs: [], hasEraFilter: false })).toBe(true);
    }
    expect(hasActiveFilter(NONE, { sharedSlugs: ['a'], hasEraFilter: false })).toBe(true);
    expect(hasActiveFilter(NONE, { sharedSlugs: [], hasEraFilter: true })).toBe(true);
  });
});
