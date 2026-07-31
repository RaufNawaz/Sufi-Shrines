import { describe, it, expect } from 'vitest';
import { sortByRank } from '../mapSidebarHelpers';

describe('sortByRank', () => {
  it('orders items by rank (best match first), not their original array order', () => {
    // Simulates the real bug: MiniSearch ranks "Mian Mir" (id 3) as the
    // strongest match, but it sits last in the underlying shrines array.
    const shrines = [
      { id: 1, name: 'Weak incidental match' },
      { id: 2, name: 'Another weak match' },
      { id: 3, name: 'Mian Mir' },
    ];
    const rankedIds = [3, 1, 2]; // Mian Mir ranked strongest by MiniSearch

    const sorted = sortByRank(shrines, rankedIds);

    expect(sorted.map((s) => s.id)).toEqual([3, 1, 2]);
    expect(sorted[0].name).toBe('Mian Mir');
  });

  it('does not mutate the input array', () => {
    const shrines = [{ id: 1 }, { id: 2 }];
    const original = [...shrines];
    sortByRank(shrines, [2, 1]);
    expect(shrines).toEqual(original);
  });

  it('places items missing from rankedIds after all ranked items', () => {
    const shrines = [
      { id: 1, name: 'Unranked' },
      { id: 2, name: 'Ranked second' },
      { id: 3, name: 'Ranked first' },
    ];
    const rankedIds = [3, 2]; // id 1 has no rank

    const sorted = sortByRank(shrines, rankedIds);

    expect(sorted.map((s) => s.id)).toEqual([3, 2, 1]);
  });
});
