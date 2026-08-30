import type { Shrine } from '../../types/shrine';
import { isPlaceholderSource } from './sourceKind';
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
  /**
   * True when the line points at a body of literature rather than at something
   * a reader could go and find — the archive's own `GENERIC` rule, which had
   * been applied to the provenance badge and never to this count.
   */
  placeholder: boolean;
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
  /**
   * How many of `sources` are placeholders rather than citations.
   *
   * 57 of 464 when this was added (30 August 2026), including one notice that a
   * source had been *withdrawn*. Exposed rather than subtracted: the lines
   * belong on the page (RULE 2), and whether the headline should read 464, or
   * 407, or 464-with-57-marked is a wording decision recorded for Rauf in
   * `docs/SESSION_RESUME.md`. Nothing renders this yet.
   */
  placeholders: number;
}

/**
 * A short, stable digest of a citation key — the tail of an anchor whose head
 * had to be cut.
 *
 * FNV-1a, because it needs to be deterministic across builds and languages and
 * to fit in six characters, and needs no cryptographic property at all.
 */
function digest(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(6, '0').slice(-6);
}

/** How much of the citation the anchor spells out before it gives up. */
const ANCHOR_SLUG_MAX = 60;

/**
 * The URL fragment a source is reachable at, inside `/about`'s index.
 *
 * `citationKey` is the dedupe key and is free text — lowercased, but still full
 * of spaces, commas, brackets and the occasional URL. This is that made safe to
 * put after a `#`, and it is deliberately derived from the key rather than
 * invented: two spellings of one citation dedupe to one entry in the index, so
 * they must also dedupe to one anchor, or a shrine page would link to a
 * fragment the index does not contain.
 *
 * **Truncated, and therefore suffixed.** A handful of these citations are a
 * full sentence with a URL in it, and a 300-character fragment is not a link
 * anyone can read or paste. Cutting to 60 characters alone collided **22 times**
 * in the current 464 — five separate volumes of Alam Faqri's *Tazkirah* share
 * their first sixty characters, and would have shared one anchor, sending a
 * reader from one volume's citation to another's. So a cut slug carries a
 * digest of the whole key; an uncut one does not, which keeps the common case
 * readable. `sourceIndex.test.ts` asserts zero collisions over the shipped data.
 */
export function sourceAnchorId(nameOrKey: string): string {
  const key = citationKey(nameOrKey);
  const full = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (full.length <= ANCHOR_SLUG_MAX) return `source-${full || 'untitled'}`;
  const head = full.slice(0, ANCHOR_SLUG_MAX).replace(/-+$/, '');
  return `source-${head}-${digest(key)}`;
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
        source = { name: item, key, shrines: [], placeholder: isPlaceholderSource(item) };
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
    placeholders: sources.filter((s) => s.placeholder).length,
    singleSourced,
    triangulated,
    uncited,
  };
}
