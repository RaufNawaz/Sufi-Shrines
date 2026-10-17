import { describe, it, expect } from 'vitest';
import { shelfTitles } from '../sourceShelf';
import { buildLibrary } from '../sourceLibrary';
import { buildShrines } from '../shrineModel';
import fallback from '../../../data/shrines-fallback.json';
import type { ShrineRow } from '../../../types/shrine';

describe('shelfTitles', () => {
  it('names exactly the books the library shelf has pages for', () => {
    const library = buildLibrary(buildShrines(fallback.rows as unknown as ShrineRow[]));
    const shelfSlugs = library.works.map((w) => w.slug).sort();
    expect(
      shelfTitles()
        .map((w) => w.slug)
        .sort(),
    ).toEqual(shelfSlugs);
  });
});
