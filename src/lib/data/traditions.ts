import traditionsData from '../../../data/kg-traditions.json';

/**
 * The six traditions the graph had no word for.
 *
 * `belongs_to_order` is the knowledge graph's only affiliation vocabulary and
 * every order in it is Sufi. 90 of the archive's 169 sites are not Muslim
 * shrines and exactly one of those 90 carries a `silsila` cell, so for the
 * other 89 the graph knew a tradition only as `category` — a six-value bucket —
 * while the entries themselves carry authored sections naming and describing
 * Nath, Udasi, Pranami, Swaminarayan, Daduvansi, Shakti Peetha, Nanakpanthi
 * and Sevapanthi. Nothing could reach one of them. Built by the knowledge-base session on 29 August
 * 2026 (`scripts/data/build-traditions.mjs`, `docs/briefs/TRADITION_LAYER.md`);
 * this module is the reading half.
 *
 * ## Why the JSON is imported here and not in `src/lib/kg.ts`
 *
 * `kg.ts` statically imports `kg.json`, so anything added there rides onto
 * every route that touches the graph — the lesson of HANDOVER §9.125, where
 * 33 KB of eager JS turned out to be relation notes no page had ever rendered.
 * This file is imported by `/tradition/:slug` and by nothing else that loads
 * eagerly, so it lives in that route's chunk. `ShrineInfobox` needs the same
 * data for ten shrines and reaches it through a **dynamic** import for exactly
 * this reason (see `useShrineTradition`): a static one there would put 13 KB on
 * `ShrinePage`, which had 3 KB of budget headroom.
 *
 * ## What the fields mean
 *
 * `definition` is **the page's account** — a passage sliced verbatim from the
 * entry named in `definitionShrine` — so its Urdu half is not optional and the
 * Urdu view must never fall back to the English (i18n rule 7; the no-leak guard
 * fails on it, as it did for the order passages, §9.128). A membership `quote`
 * is the opposite case: it is *evidence for* a claim the reader already has in
 * their own language, so it may stay English inside a declared blockquote.
 */
export interface Tradition {
  slug: string;
  name: string;
  nameUr: string;
  /**
   * Other names the corpus uses for the same tradition.
   *
   * **Optional, and kept optional deliberately.** It was declared `string[]` on
   * the reasonable-looking assumption that a list field is always a list;
   * `daduvansi` had no such key, `tradition.alsoKnownAs.length` threw, and
   * `/tradition/daduvansi` rendered a blank page. TypeScript could not catch
   * it — the JSON is imported, so its inferred element type is whatever the
   * file happens to contain, and a field absent from one record of eight does
   * not announce itself.
   *
   * `build-traditions.mjs` now always emits the key (commit `647ff60`), so in
   * practice it is never missing. The type still says otherwise, because a
   * generator's promise is not something this file can check: nothing in the
   * type system connects the two, and the cost of being wrong is a blank page
   * rather than a caught error. Read it through `alsoKnownAsFor()`.
   */
  alsoKnownAs?: string[];
  /** The six-value schema bucket this tradition sits inside. */
  category: string;
  /** Verbatim from the entry named by `definitionShrine`. */
  definition: string;
  definitionUr: string;
  definitionShrine: string;
  source: string;
}

export interface TraditionMembership {
  traditionSlug: string;
  shrineSlug: string;
  shrineName: string;
  /** Verbatim evidence from the site's own entry. */
  quote: string;
  source: string;
}

const data = traditionsData as { traditions: Tradition[]; memberships: TraditionMembership[] };

export const TRADITIONS: readonly Tradition[] = data.traditions;
export const TRADITION_MEMBERSHIPS: readonly TraditionMembership[] = data.memberships;

/** The other names for a tradition, never undefined. One of the eight records
 *  omits the key entirely; see the field's comment. */
export function alsoKnownAsFor(tradition: Tradition): string[] {
  return tradition.alsoKnownAs ?? [];
}

export function getTraditionBySlug(slug: string): Tradition | undefined {
  return TRADITIONS.find((t) => t.slug === slug);
}

/** The sites recorded in a tradition, in the order the build recorded them —
 *  which is the order of the picks, not an alphabetical one, so the entry the
 *  definition was taken from leads. */
export function getTraditionMembers(slug: string): TraditionMembership[] {
  return TRADITION_MEMBERSHIPS.filter((m) => m.traditionSlug === slug);
}

/**
 * The traditions recorded for a site — plural, and that is not defensive.
 *
 * 18 sites of 169, and **three of them hold two**: Khatwari Darbar is Udasi and
 * Nanakpanthi, Guru Gurpat Mandir is both in one breath ("the Jagiasi lineage
 * of Nanakpanthi Sants — spiritual descendants of Guru Nanak through Baba Sri
 * Chand's Udasi line"), and Sevapanthi Darbar is Nanakpanthi and Sevapanthi.
 *
 * This returned a single tradition via `.find()` when the layer held six
 * traditions and ten memberships, none of them overlapping. The layer then grew
 * to eight and twenty-one, and `.find()` does not fail when a second answer
 * appears — it silently returns the first, so a site would have quietly shown
 * one of its two traditions with nothing anywhere reporting the loss. Written
 * down because the bug was in the *shape* of the accessor rather than in any
 * line of it, and the data was always going to grow.
 *
 * Absence means the entry does not name a tradition — never that a site has
 * none, and never something to fill in from its `category`: the category is a
 * filing bucket and a tradition is a claim. Seven term matches that look like
 * memberships are recorded as deliberate *non*-memberships for exactly that
 * reason (`udasi` is also Guru Nanak's four journeys; `jogi` catches Ranjha in
 * Waris Shah's poem). See `docs/briefs/TRADITION_LAYER.md`.
 */
export function getTraditionsForShrine(shrineSlug: string): Tradition[] {
  return TRADITION_MEMBERSHIPS.filter((m) => m.shrineSlug === shrineSlug)
    .map((m) => getTraditionBySlug(m.traditionSlug))
    .filter((t): t is Tradition => t !== undefined);
}
