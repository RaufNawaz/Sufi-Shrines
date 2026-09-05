import { describe, it, expect } from 'vitest';
import { buildSourceIndex } from '../sourceIndex';
import { buildShrine } from '../shrineModel';
import { makeShrineRow } from '../../../test/utils';
import type { Shrine } from '../../../types/shrine';

/**
 * One source index per dataset — the invariant, not the intention.
 *
 * `SourceReach` renders once per bibliography line and each instance called
 * `buildSourceIndex`. A `useMemo` is per component instance, so it deduplicated
 * nothing across siblings: a median entry rebuilt the whole-archive index three
 * times per navigation and Data Darbar seven, each pass walking all 169
 * Descriptions and `localeCompare`-sorting 464 sources — profiled at ~44 ms of a
 * 273 ms navigation, ~85% of it redundant (performance council, 4 Sep 2026).
 *
 * The fix caches on the function rather than at the call site, so the property
 * holds for callers that do not know about it — `ArchiveKnows` computes the same
 * index for `/about`. This test is what stops the cache being quietly removed,
 * and equally what stops it being made *too* eager: a cache that returned a
 * stale index for a changed dataset would be a correctness bug, so both
 * directions are asserted.
 */
/* Distinct `Name`s, because the index counts entries by slug and
   `makeShrineRow` defaults every row to the same one — two rows sharing a slug
   collapse into a single citing entry and the shared-source case under test
   disappears. */
function dataset(descriptions: string[]): Shrine[] {
  return descriptions
    .map((Description, i) => buildShrine(makeShrineRow({ Description, Name: `Entry ${i + 1}` }), i))
    .filter((s): s is Shrine => Boolean(s));
}

const BIBLIO = '## Bibliography\n\n- Chishti, Nur Ahmad. *Tahqiqat-i-Chishti*. Lahore, 1867.\n';

describe('buildSourceIndex memoization', () => {
  it('returns the identical object for the same dataset identity', () => {
    const shrines = dataset([`Prose.\n\n${BIBLIO}`, `Other prose.\n\n${BIBLIO}`]);
    const first = buildSourceIndex(shrines);
    const second = buildSourceIndex(shrines);
    // Identity, not deep equality: deep equality would pass even if every
    // caller recomputed, which is the exact defect this guards.
    expect(second).toBe(first);
  });

  it('recomputes for a different dataset rather than serving a stale index', () => {
    const a = dataset([`Prose.\n\n${BIBLIO}`]);
    const b = dataset([
      `Prose.\n\n${BIBLIO}`,
      'Second entry.\n\n## Bibliography\n\n- Latif, Syad Muhammad. *Lahore*. Lahore, 1892.\n',
    ]);
    const indexA = buildSourceIndex(a);
    const indexB = buildSourceIndex(b);
    expect(indexB).not.toBe(indexA);
    expect(indexB.sources.length).toBeGreaterThan(indexA.sources.length);
  });

  it('counts the same as an uncached build would', () => {
    const shrines = dataset([`Prose.\n\n${BIBLIO}`, `More prose.\n\n${BIBLIO}`]);
    const index = buildSourceIndex(shrines);
    // One source, cited by both entries — the shared-source case SourceReach exists for.
    expect(index.sources).toHaveLength(1);
    expect(index.sources[0].shrines).toHaveLength(2);
    expect(index.citations).toBe(2);
  });
});
