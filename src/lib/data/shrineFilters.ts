import type { Shrine } from '../../types/shrine';
import type { CategoryKey } from './categoryKey';
import { categoryKey } from './categoryKey';
import { supportLevelKey } from './supportLevel';
import { parseEra } from './era';

/**
 * The filters a reader can put in the URL, and the one place they are applied.
 *
 * ## Why this is a module and not a `useMemo` in the sidebar
 *
 * It was a `useMemo` in the sidebar, and the map never saw it. Measured on the
 * running site, 30 August 2026: `/?category=jain` reported "3 of 171 sites" in
 * the list and drew **169 markers**. So did `?category=sikh`, `?category=hindu`
 * and `?savedOnly=1` — every filter, all 169 pins, every time.
 *
 * That is worse than a filter that does nothing, because **the URL is
 * shareable**. `MapPage` writes these into the address bar deliberately, for the
 * reason its own comment gives: so a reader can send someone the view they are
 * looking at. What they actually sent was a link that promises a filter and
 * delivers the whole archive.
 *
 * Both surfaces now call this function. Two call sites, one implementation —
 * the distinction matters and this project has the scar: `searchDocs.ts` had
 * five tests pinning it while production ran a second, drifted copy of the same
 * map, and nothing could see the difference for nine days.
 *
 * ## What is deliberately not here
 *
 * **The search query.** It narrows the list and must not narrow the map: it is
 * not in the URL, so it is not part of what a reader shares, and re-drawing 169
 * markers on every keystroke is a different feature with a different cost. The
 * sidebar applies search on top of what this returns.
 */
export interface ShrineFilterState {
  /** Selected category keys. Empty means every category — the additive
   *  all-on default, not "none selected". */
  categories: CategoryKey[];
  /** Only `support_level = Field-verified` sites. */
  verifiedOnly: boolean;
  savedOnly: boolean;
  region: string;
  eraMin: number;
  eraMax: number;
}

/** State the filters read that does not live in the URL. */
export interface ShrineFilterContext {
  /** Slugs on the reader's ziyarat list, for `savedOnly`. */
  savedSlugs: readonly string[];
  /** Slugs the shared-ground link narrowed to, empty when it is not active. */
  sharedSlugs: readonly string[];
  /** True when the era slider is away from its full range; passed in rather
   *  than derived, because "the whole range" is the caller's own constant. */
  hasEraFilter: boolean;
}

/**
 * Apply every URL-persisted filter, in the order the sidebar always applied
 * them. Order is not observable — each step is a conjunction — but it is kept
 * so a reader comparing this against the original sees the same list.
 */
export function filterShrines(
  shrines: readonly Shrine[],
  filters: ShrineFilterState,
  context: ShrineFilterContext,
): Shrine[] {
  let result = shrines as Shrine[];

  if (filters.categories.length)
    result = result.filter((s) => filters.categories.includes(categoryKey(s.category)));

  if (filters.verifiedOnly)
    result = result.filter((s) => supportLevelKey(s.supportLevel) === 'field-verified');

  if (filters.savedOnly) result = result.filter((s) => context.savedSlugs.includes(s.slug));

  if (context.sharedSlugs.length)
    result = result.filter((s) => context.sharedSlugs.includes(s.slug));

  if (filters.region) result = result.filter((s) => s.region === filters.region);

  if (context.hasEraFilter) {
    result = result.filter((s) => {
      /* An undated entry is excluded by an era filter rather than kept.
         Deliberate, and the same rule the sidebar has always used: a century
         range is a claim about when a place was built, and "we do not know"
         is not an answer to it. */
      if (!s.founded) return false;
      const era = parseEra(s.founded);
      if (!era) return false;
      return era.maxCentury >= filters.eraMin && era.minCentury <= filters.eraMax;
    });
  }

  return result;
}

/** True when any filter is narrowing the archive — used to decide whether the
 *  map is showing everything, which is a different statement from "no filters
 *  are set". */
export function hasActiveFilter(
  filters: ShrineFilterState,
  context: Pick<ShrineFilterContext, 'sharedSlugs' | 'hasEraFilter'>,
): boolean {
  return Boolean(
    filters.categories.length ||
      filters.verifiedOnly ||
      filters.savedOnly ||
      filters.region ||
      context.sharedSlugs.length ||
      context.hasEraFilter,
  );
}
