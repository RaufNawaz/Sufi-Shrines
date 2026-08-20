import type { KGSaint } from '../../types/kg';
import { localizeFigureName } from '../i18n/localizeKgName';
import { figureGroup, figureGroupLabel } from './figureType';

/**
 * Client-side search over the archive's figures, for the explorer's list of
 * 136 names under seven headings — a list you scroll past rather than find
 * anything in.
 *
 * Both scripts, always, regardless of the reader's current language. Someone
 * reading in English may only know a figure by their Urdu name, and an Urdu
 * reader may only have seen the Latin transliteration; making the haystack
 * bilingual costs nothing and means "قادری" finds Bulleh Shah in the English
 * view (his recorded Urdu name is بلھے شاہ (عبداللہ شاہ قادری)) while "qadri"
 * finds him in the Urdu view.
 *
 * Deliberately not MiniSearch, which the shrine list uses through a worker:
 * this set is 136 short strings already in memory, so an indexed search would
 * add a worker round-trip and a build step to beat a substring scan that takes
 * well under a millisecond.
 */

/** Everything a reader might reasonably type to find one figure. */
export function figureHaystack(saint: KGSaint): string {
  return [
    saint.name,
    saint.nameUr ?? '',
    // Resolves the dictionary, so a figure with no `nameUr` field still
    // matches on its Urdu name.
    localizeFigureName(saint, 'ur'),
    ...(saint.altNames ?? []),
    ...(saint.titles ?? []),
    saint.figureType ?? '',
    // The bucket's own label, so "sikh guru" finds the whole group.
    figureGroupLabel(figureGroup(saint.figureType), 'en'),
    figureGroupLabel(figureGroup(saint.figureType), 'ur'),
  ]
    .join(' ')
    .toLowerCase();
}

/** Precomputed haystacks, keyed by slug. Build once per figure set. */
export function buildFigureIndex(figures: readonly KGSaint[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const saint of figures) index.set(saint.slug, figureHaystack(saint));
  return index;
}

/**
 * Figures matching every whitespace-separated term in `query`.
 *
 * Every term must appear *somewhere* in the haystack rather than as one
 * contiguous phrase, so "sikh guru" and "guru sikh" both work and a reader who
 * half-remembers a name in the wrong order still lands on it. An empty query
 * returns the input unchanged — and the same array identity, so a caller's
 * `useMemo` downstream does not invalidate on every keystroke that clears it.
 */
export function matchFigures<T extends KGSaint>(
  figures: readonly T[],
  query: string,
  index: Map<string, string>,
): readonly T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return figures;
  const terms = trimmed.split(/\s+/);
  return figures.filter((saint) => {
    const hay = index.get(saint.slug) ?? figureHaystack(saint);
    return terms.every((term) => hay.includes(term));
  });
}
