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

  /*
   * Try the whole cell before splitting it.
   *
   * `SPECIAL_URDU_PHRASES` in `urduFallback.ts` holds 170 hand-translated
   * *whole* `Events` cells, and `ShrineInfobox` reaches them because it looks
   * the entire cell up first. Every other caller — `/almanac` in both views,
   * `RecordedObservanceList` (so all 9 order pages, all 64 place pages and 143
   * saint pages) and the archive search — passed the raw English cell, and this
   * function split on `;` before any lookup. **A whole-cell entry was
   * unreachable from four surfaces.**
   *
   * Measured 30 August 2026 over the 170 live cells: the whole-cell path
   * resolves 168, the segment path 88. **80 cells had a reviewed Urdu
   * translation sitting in the repository that four surfaces never asked for.**
   * On `/almanac` — the page whose entire subject is when the gatherings happen
   * — 32 of 80 rows read half in English, and some read as
   * `Annual urs (۱۸-۲۰ Safar)`, which is worse than plain English because the
   * Eastern digits make it look translated.
   *
   * Fixed here rather than at the three call sites so the fourth caller cannot
   * forget it. Nothing is authored: these are the existing reviewed strings.
   */
  const whole = translateToUrdu(raw);
  if (whole && whole !== raw && !/[A-Za-z]/.test(whole)) {
    /* The separator still has to be normalised. None of the 170 hand-translated
       whole-cell entries carries an ASCII semicolon — 112 already use `؛` — but
       `translateToUrdu` also composes results of its own, and one of those comes
       back as `سالانہ عرس; قوالی`: fully Urdu around a Latin punctuation mark.
       Returning it verbatim would have skipped the normalisation the segment
       path below does, so the whole-cell path would have fixed 80 cells and
       quietly broken the punctuation of others. Caught by an existing
       assertion. */
    return whole.replace(/;\s*/g, '؛ ').trimEnd();
  }

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
