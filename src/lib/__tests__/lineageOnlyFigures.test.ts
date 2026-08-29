// @vitest-environment node
/**
 * The figures no index listed — 60 when this was written, 68 since kinship
 * landed.
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
  getKinOf,
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

/* What a lineage-only node has to be connected BY.
 *
 * This was `disciple_of`/`successor_of` alone until 29 August 2026, and the
 * name of the flag is why: every one of them arrived through a lineage
 * proposal, so "connected to a chain" and "connected to anything" were the same
 * predicate and nothing distinguished them. Kinship broke the tie. Eight of
 * these figures are now in the graph because an entry names them as somebody's
 * father, uncle or forebear and for no other reason — Sri Chand has four Udasi
 * darbars in this archive that invoke him and not one recorded discipleship —
 * so the chain-only test called all eight orphans.
 *
 * Widening it is the correct reading and not a concession: what justifies the
 * node was never the *kind* of edge, it was that some entry names the person and
 * a page would otherwise have nothing to point at. */
const connections = (slug: string) => [
  ...getDisciplesOf(slug),
  ...getTeachersOf(slug),
  ...getKinOf(slug),
];

describe('every lineage-only figure is there for a reason', () => {
  it('is connected to something in one direction or the other', () => {
    /* A `lineageOnly` node nobody names is an orphan — no site, no count, and
       no relation that needs it. */
    const orphans = lineageOnly
      .filter((saint) => connections(saint.slug).length === 0)
      .map((s) => s.slug);
    expect(orphans, 'a lineage-only figure nothing names has no reason to exist').toEqual([]);
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
    /* The third population, added with the kinship pass: named as family and
       never as a link in a chain. Kept as its own term rather than folded into
       the two above, because a note that says "teacher of X" or "disciple of X"
       is wrong about all of them. */
    const kinOnly = lineageOnly.filter(
      (s) =>
        getDisciplesOf(s.slug).length === 0 &&
        getTeachersOf(s.slug).length === 0 &&
        getKinOf(s.slug).length > 0,
    );
    expect(teachers.length).toBeGreaterThan(20);
    expect(disciples.length).toBeGreaterThan(5);
    expect(kinOnly.length).toBeGreaterThan(0);
    expect(teachers.length + disciples.length + kinOnly.length).toBe(lineageOnly.length);
  });

  it('can always name at least one figure it is connected to', () => {
    /* The row's note. If this were ever empty the list would be bare names. */
    for (const saint of lineageOnly) {
      expect(connections(saint.slug)[0]?.saint.name, saint.slug).toBeTruthy();
    }
  });
});
