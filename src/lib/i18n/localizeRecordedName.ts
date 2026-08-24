import type { Lang } from '../../types/shrine';
import { translateToUrdu } from './urduFallback';

/**
 * "Render this recorded string in the reader's language", as one lookup.
 *
 * Four places open-coded `lang === 'ur' ? translateToUrdu(x) : x` — the place
 * name on a shrine page, on `/coverage`, on `/place/:slug`, and the region chip
 * in the sidebar filters. Each was correct, each would have needed finding again
 * when a second translated language arrives, and the obvious generalisation is a
 * trap: a `translateToUrdu` call guarded by "is this language translated" rather
 * than "is this language Urdu" returns *Urdu* for Shahmukhi, which is the kind of
 * wrong that looks right on the page.
 *
 * A map keyed on the language cannot make that mistake. A language with no entry
 * gets its string back unchanged, which is the documented behaviour (i18n rule 3
 * — never character-transliterate), and adding a language is one entry.
 *
 * **Why this is its own module and not part of `localizeKgName.ts`.** That file
 * imports `slugToLabel` from `../kg`, which statically imports `data/kg.json` —
 * 426 KB. Putting this helper there and calling it from the map, shrine, place
 * and coverage routes pulled the entire knowledge graph onto all four:
 * `check-bundle-budget.mjs` reported MapPage at 891 KB against a 580 KB budget,
 * and three others 300 KB over. The helper needs the dictionary and nothing else,
 * so it lives where its dependencies are. `localizeKgName` re-exports it, so
 * there is still one implementation.
 */
const NAME_DICTIONARIES: Partial<Record<Lang, (value: string) => string>> = {
  ur: translateToUrdu,
};

export function localizeRecordedName(value: string, lang: Lang): string {
  const translate = NAME_DICTIONARIES[lang];
  return translate ? translate(value) : value;
}
