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
 * 3. **Each segment is bidi-isolated in the string itself**, with U+2068 FSI /
 *    U+2069 PDI. A partly-translated list is the common case — "سالانہ عرس؛
 *    Heer recitation and qawwali" — and a single `<bdi>` around the whole
 *    joined value does not help: the isolation has to be per run, or the bidi
 *    algorithm reorders the English fragments against the Urdu ones and the
 *    list reads jumbled. Measured on the Urdu almanac before this: segments
 *    appearing in an order that matched neither the source nor the translation.
 *
 *    Isolates rather than more markup because this returns a *string*, used in
 *    a `<dd>` value, in a list item, and (via the infobox) potentially in a
 *    `title` attribute where no element can reach. FSI/PDI are invisible and
 *    are exactly what Unicode provides for this.
 */

/** First Strong Isolate / Pop Directional Isolate — the plain-text `<bdi>`. */
const FSI = '\u2068';
const PDI = '\u2069';

export function localizeObservance(text: string | undefined | null, lang: Lang): string {
  const raw = String(text ?? '').trim();
  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: the observance segment dictionary is Urdu-only
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

  const kept = out.filter(Boolean);
  // Only worth isolating when the list actually mixes scripts; a uniform list
  // needs no help, and leaving the characters out keeps copied text clean.
  const mixed =
    kept.some((seg) => /[A-Za-z]/.test(seg)) && kept.some((seg) => /[\u0600-\u06FF]/.test(seg));
  const wrapped = mixed ? kept.map((seg) => `${FSI}${seg}${PDI}`) : kept;

  return wrapped.join(translatedAny ? '؛ ' : '; ');
}
