// @vitest-environment node
/**
 * The 60 figures no index listed.
 *
 * `getArchiveFigures` excludes `lineageOnly` nodes so that every count
 * describing the archive describes the archive — Hujwiri's master al-Khuttali is
 * in the graph because a chain must not stop at the first teacher without a
 * shrine in Pakistan, not because this archive documents him. That exclusion is
 * right and must stay.
 *
 * But excluded from the counts had become excluded from the site: each of these
 * 60 has a reachable page, **all 60 appear in a recorded lineage relation**, and
 * none appeared in any list. The only way to reach one was to already be walking
 * the chain that names it — which is how Prince Dara Shikoh came to be
 * unreachable from anywhere.
 *
 * What is asserted here is the pair of properties that makes the new list safe:
 * it is disjoint from the archive's own figures, and together they are the whole
 * graph. If either ever fails, some figure is either double-counted or invisible.
 */
import { describe, it, expect } from 'vitest';
import {
  getArchiveFigures,
  getLineageOnlyFigures,
  getDisciplesOf,
  getTeachersOf,
  getKGStore,
} from '../kg';

const archive = getArchiveFigures();
const lineageOnly = getLineageOnlyFigures();
const kg = getKGStore();

describe('the two figure lists', () => {
  it('both hold figures', () => {
    expect(archive.length).toBeGreaterThan(100);
    expect(lineageOnly.length).toBeGreaterThan(30);
  });

  it('are disjoint', () => {
    const inArchive = new Set(archive.map((s) => s.slug));
    const overlap = lineageOnly.filter((s) => inArchive.has(s.slug)).map((s) => s.slug);
    expect(overlap, 'a figure counted twice would inflate the archive').toEqual([]);
  });

  it('together are the whole graph', () => {
    /* The other direction: a figure in neither list is one no page can reach. */
    expect(archive.length + lineageOnly.length).toBe(kg.saints.length);
  });

  it('never puts a figure with a shrine in the lineage-only list', () => {
    /* The definition, asserted rather than assumed. `lineageOnly` is set by the
       build script; a figure that later gains a site must leave this list, or
       the archive under-reports itself by one and nothing says so. */
    const withSites = lineageOnly.filter((s) => s.shrines.length > 0).map((s) => s.slug);
    expect(withSites).toEqual([]);
  });
});

describe('every lineage-only figure is there for a reason', () => {
  it('is connected to a chain in one direction or the other', () => {
    /* What justifies their presence in the graph at all: a `lineageOnly` node
       nobody names is an orphan — no site, no count, and no chain that needs
       it. */
    const orphans = lineageOnly
      .filter(
        (saint) =>
          getDisciplesOf(saint.slug).length === 0 && getTeachersOf(saint.slug).length === 0,
      )
      .map((s) => s.slug);
    expect(orphans, 'a lineage-only figure no chain names has no reason to exist').toEqual([]);
  });

  it('is named in both directions across the set, not just as teachers', () => {
    /*
     * The assumption the first draft of the explorer's list made, and it was
     * wrong: **17 of the 60 are recorded as somebody's disciple rather than as a
     * teacher** — Dara Shikoh, Princess Jahanara, and Nizamuddin Auliya, whose
     * dargah is in Delhi and so is rightly not an entry in an archive of
     * Pakistan. A note that assumed "teacher of X" left those 17 rows blank.
     */
    const teachers = lineageOnly.filter((s) => getDisciplesOf(s.slug).length > 0);
    const disciples = lineageOnly.filter(
      (s) => getDisciplesOf(s.slug).length === 0 && getTeachersOf(s.slug).length > 0,
    );
    expect(teachers.length).toBeGreaterThan(20);
    expect(disciples.length).toBeGreaterThan(5);
    expect(teachers.length + disciples.length).toBe(lineageOnly.length);
  });

  it('can always name at least one figure it is connected to', () => {
    /* The row's note. If this were ever empty the list would be bare names. */
    for (const saint of lineageOnly) {
      const linked = [...getDisciplesOf(saint.slug), ...getTeachersOf(saint.slug)];
      expect(linked[0]?.saint.name, saint.slug).toBeTruthy();
    }
  });
});
