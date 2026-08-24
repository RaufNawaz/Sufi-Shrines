import type { Shrine } from '../../types/shrine';
import { getFieldValue } from './fieldAliasing';
import { bibliographyItems, citationKey } from './bibliography';

/**
 * What the archive rests on, computed from the shipped data on every page load.
 *
 * The knowledge graph gained a source layer on 24 August 2026 — 464 sources from
 * 533 citations — and it is a build-time file (`data/kg-sources.json`) precisely
 * so it stays out of the browser's bundle. So a page cannot read it. This
 * rebuilds the same index from the shrine data the app has already loaded: **no
 * new payload at all**, and no snapshot to go stale, because the sheet is
 * production and this reads whatever the sheet currently says.
 *
 * It agrees with the graph by construction — same extractor, same dedupe key —
 * and `sourceIndex.test.ts` asserts the two produce the same number of distinct
 * sources rather than trusting that.
 *
 * **Why a reader wants this.** Per-entry citations are already on every shrine
 * page. What no surface could answer is the question across entries: what does
 * this archive actually rest on? It rests, in large part, on one book — Alam
 * Faqri's *Tazkirah Awliya-e-Pakistan* underpins 25 of 169 entries. An archive
 * that claims provenance should be able to say that about itself, including the
 * uncomfortable part.
 */

export interface IndexedSource {
  /** The citation verbatim, as first recorded. The reader's search string. */
  name: string;
  /** The dedupe key, stable and usable as a React key. */
  key: string;
  /** The entries citing it, in the order encountered. */
  shrines: { slug: string; name: string }[];
}

export interface SourceIndex {
  /** Distinct sources, most-cited first. */
  sources: IndexedSource[];
  /** Total citations — the sum of every entry's bibliography. */
  citations: number;
  /** Sources cited by more than one entry. */
  shared: number;
  /** Entries whose every claim rests on a single source. */
  singleSourced: number;
  /** Entries citing three or more, where a reader can triangulate. */
  triangulated: number;
  /** Entries citing nothing at all. */
  uncited: number;
}

export function buildSourceIndex(shrines: readonly Shrine[]): SourceIndex {
  const byKey = new Map<string, IndexedSource>();
  let citations = 0;
  let singleSourced = 0;
  let triangulated = 0;
  let uncited = 0;

  for (const shrine of shrines) {
    const items = bibliographyItems(
      getFieldValue(shrine.raw, 'Sources'),
      getFieldValue(shrine.raw, 'Description'),
    );
    citations += items.length;

    /* Counted per *entry* on distinct sources, not on citations: an entry that
       cites one book three times is single-sourced, and saying otherwise would
       flatter the archive. */
    const distinctHere = new Set<string>();
    for (const item of items) {
      const key = citationKey(item);
      if (!key) continue;
      distinctHere.add(key);
      let source = byKey.get(key);
      if (!source) {
        source = { name: item, key, shrines: [] };
        byKey.set(key, source);
      }
      if (!source.shrines.some((s) => s.slug === shrine.slug)) {
        source.shrines.push({ slug: shrine.slug, name: shrine.name });
      }
    }

    if (distinctHere.size === 0) uncited++;
    else if (distinctHere.size === 1) singleSourced++;
    if (distinctHere.size >= 3) triangulated++;
  }

  const sources = [...byKey.values()].sort(
    (a, b) => b.shrines.length - a.shrines.length || a.name.localeCompare(b.name),
  );

  return {
    sources,
    citations,
    shared: sources.filter((s) => s.shrines.length > 1).length,
    singleSourced,
    triangulated,
    uncited,
  };
}
