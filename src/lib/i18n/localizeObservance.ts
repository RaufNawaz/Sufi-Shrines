import type { Lang } from '../../types/shrine';
import { translateToUrdu } from './urduFallback';

/**
 * The `Events` column, translated segment by segment.
 *
 * The column is semicolon-joined — "Annual urs; qawwali and naat; daily
 * langar" — so 318 occurrences across the archive reduce to 190 distinct
 * segments, and the 34 in `OBSERVANCES` (urdu-i18n/build_dictionary.py) cover
 * 157 of them. Looking up the whole cell would match almost none; looking up
 * each segment matches most.
 *
 * Two decisions worth stating:
 *
 * 1. **A segment with no entry is left exactly as it is.** RULE 2 — the
 *    alternative is composing Urdu out of tokens and letting this file decide
 *    word order, which is the bug that made the almanac's own coverage line
 *    read "169 places out of 32". A visibly untranslated observance is better
 *    than a confidently wrong one, and `e2e/urdu-no-leak.spec.ts` counts what
 *    is left so the debt does not disappear.
 * 2. **The separator is localised too.** Urdu's semicolon is `؛` (U+061B).
 *    Rejoining Urdu segments with an ASCII `;` leaves a Latin punctuation mark
 *    steering the bidi run, and it simply reads wrong. But if *nothing*
 *    translated, the original separator is kept: Arabic punctuation wrapped
 *    around English fragments looks like a bug rather than a translation.
 */
export function localizeObservance(text: string | undefined | null, lang: Lang): string {
  const raw = String(text ?? '').trim();
  if (!raw || lang !== 'ur') return raw;

  const parts = raw.split(';');
  if (parts.length === 0) return raw;

  let translatedAny = false;
  const out = parts.map((part) => {
    const trimmed = part.trim();
    if (!trimmed) return trimmed;
    const urdu = translateToUrdu(trimmed);
    // translateToUrdu returns the input when it has nothing better.
    if (urdu && urdu !== trimmed && !/[A-Za-z]/.test(urdu)) {
      translatedAny = true;
      return urdu;
    }
    return trimmed;
  });

  return out.filter(Boolean).join(translatedAny ? '؛ ' : '; ');
}
