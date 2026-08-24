import type { Lang } from '../../types/shrine';
import { translateNameToUrdu } from './urduFallback';
/* Re-exported, not reimplemented: this module cannot *host* it — it imports
   `slugToLabel` from `../kg`, which pulls in the 426 KB graph, and four routes
   that need only the dictionary were paying for it. See localizeRecordedName.ts. */
import { localizeRecordedName } from './localizeRecordedName';

export { localizeRecordedName };
import { slugToLabel } from '../kg';

/**
 * Urdu display names for knowledge-graph entities.
 *
 * The Saints & Orders explorer, the order pages and the lineage views were
 * rendering every entity name in Latin script even in the Urdu view — order
 * titles, figure names, the shrine tags under each figure. The archive's whole
 * stated standard is that the Urdu experience is as complete as the English
 * one, and `?lang=ur` on an order page was reading as English with Urdu
 * furniture around it.
 *
 * Nothing here is new content. `urdu-seed.json` already holds Urdu for these
 * strings — it is keyed on the *English* string (case-insensitively), which is
 * why `translateToUrdu` can resolve a KG name it was never told about. As of
 * 20 August 2026 that covers 67 of 136 archive figures, 92 of 169 shrine
 * labels and all 5 orders. The rest fall through to the English string, which
 * is the documented behaviour (i18n rule 3: never character-transliterate) and
 * strictly better than what was on screen before.
 *
 * The coverage figure is a ratchet, not a target: see
 * `src/lib/i18n/__tests__/kgNameCoverage.test.ts`.
 */

interface NamedEntity {
  name: string;
  nameUr?: string | undefined;
  altNames?: readonly string[] | undefined;
}

/** A figure's name — an explicit `nameUr` wins, then the dictionary. */
export function localizeFigureName(saint: NamedEntity, lang: Lang): string {
  if (lang !== 'ur') return saint.name;
  return saint.nameUr || translateNameToUrdu(saint.name, saint.altNames ?? []);
}

interface NamedOrder extends NamedEntity {
  /** The silsila's name in Arabic script — which for all five orders in the
   * archive *is* its Urdu name (قادریہ, چشتیہ, …), so it is used before the
   * dictionary rather than after it. */
  arabicName?: string | undefined;
}

export function localizeOrderName(order: NamedOrder, lang: Lang): string {
  if (lang !== 'ur') return order.name;
  return order.nameUr || order.arabicName || translateNameToUrdu(order.name);
}

/**
 * A figure's alternative recorded name.
 *
 * Mostly absent from the dictionary — these are the sheet's parenthetical
 * variants ("Shah Abdul Latif Kazmi", "Bahu (\u201cwith Hoo\u201d)"), not
 * headline names. Whatever comes back must be wrapped in `<bdi>` at the render
 * site: an untranslated Latin name inside an RTL paragraph reorders the
 * punctuation around it, which is how `Bahu ("with Hoo")` ended up with its
 * bracket on the wrong side. `<bdi>` is the sanctioned exception in CLAUDE.md's
 * i18n rules for exactly this case.
 */
export function localizeAltName(altName: string, lang: Lang): string {
  return localizeRecordedName(altName, lang);
}

/**
 * A shrine slug rendered for display. `slugToLabel` title-cases every word, so
 * it produces "Shrine Of Baba Shah Kamal" where the dictionary is keyed on
 * "Shrine of Baba Shah Kamal" — the case-insensitive lookup inside
 * `translateToUrdu` is what makes that match.
 */
export function localizeShrineSlug(slug: string, lang: Lang): string {
  const label = slugToLabel(slug);
  return lang === 'ur' ? translateNameToUrdu(label) : label;
}
