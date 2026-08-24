import type { Lang } from '../../types/shrine';
import { HIJRI_MONTH_NAMES_UR } from '../data/ursDates';

/**
 * A recorded date, read in Urdu.
 *
 * The archive records dates as the source wrote them — "11 Rabīʿ al-Sānī 729
 * AH", "16 Rabi ul Awal 1024 Hijri", "8 Muharram 1040 AH / 8 August 1630 CE" —
 * and in the Urdu view those arrived with Eastern digits around a Latin month:
 * ۱۱ Rabīʿ al-Sānī ۷۲۹ AH. Half-translated, which is the one thing worse than
 * either language on its own.
 *
 * **Why substitution is safe here and is refused for prose.**
 * `localizeObservance` states the rule this file has to live under: never
 * compose Urdu out of tokens, because that means deciding word order, and a
 * wrong word order produced a sentence that read "169 places out of 32". A date
 * is the case where no such decision exists — Urdu writes day, month, year in
 * that same order, so `ربیع الثانی` goes exactly where `Rabīʿ al-Sānī` was and
 * nothing is reordered. The month name and the calendar marker are the whole
 * substitution; every other character is passed through untouched (RULE 2).
 *
 * **A wrong month is a wrong date**, so the variant table is curated by hand
 * from the strings actually in the shipped data, not generated. `Rabi` alone is
 * deliberately absent: matching it would map both `Rabi al-Awwal` and
 * `Rabi al-Thani` to whichever entry came first, which is a five-week error in
 * a death date. Longest form always wins.
 *
 * **And it only fires in a date context.** The month words appear in English
 * prose too ("Muharram observances", "during Ramadan"), and this must never
 * reach into a sentence. A substitution needs a day before the month, a year
 * after it, `(Month)` as a whole parenthetical, or the words "month of" — the
 * four shapes the recorded data actually uses. Anything else is left alone.
 */

/**
 * Latin spellings of each Hijri month, longest first within each entry.
 *
 * Indexed to match `HIJRI_MONTH_NAMES_UR`, so the Urdu names have one home. The
 * marked variants are those present in `data/kg.json` or the shipped snapshot as
 * of 24 August 2026; the rest are the standard romanisations, included so a
 * future sheet edit does not have to wait for a code change to read correctly.
 */
const MONTH_VARIANTS: readonly (readonly string[])[] = [
  ['Muharram', 'Muharam', 'Moharram'], // in data
  ['Safar', 'Safr'], // in data
  [
    'Rabiʿ al-Awwal',
    'Rabiʻ al-Awwal',
    'Rabi al-Awwal',
    'Rabi ul-Awwal',
    'Rabi ul Awal', // in data
    'Rabi al Awwal',
    'Rabi-ul-Awwal',
    'Rabi I',
  ],
  [
    'Rabīʿ al-Thānī', // in data
    'Rabīʿ al-Sānī', // in data
    'Rabiʿ al-Thani',
    'Rabi al-Thani', // in data
    'Rabi ul-Sani',
    'Rabi ul Sani',
    'Rabi al Thani',
    'Rabi II',
  ],
  ['Jumada al-Awwal', 'Jumadi al-Awwal', 'Jumada I', 'Jamadi ul Awwal'],
  ['Jumada al-Thani', 'Jumada al-Akhir', 'Jumadi al-Thani', 'Jumada II', 'Jamadi us Sani'],
  ['Rajab'], // in data
  ['Shaʿban', 'Shaʻban', "Sha'ban", 'Shaban', 'Shabaan'], // in data
  ['Ramadan', 'Ramadhan', 'Ramazan', 'Ramzan'], // in data
  ['Shawwal', 'Shawaal'], // in data
  ['Dhu al-Qaʿdah', "Dhu al-Qa'dah", 'Zil Qad', 'Zul Qaida', 'Zilqad'],
  ['Dhu al-Hijjah', 'Dhu al-Hijja', 'Zil Hajj', 'Zil Hijjah', 'Zul Hajj', 'Zilhaj'], // in data
];

/**
 * Calendar markers.
 *
 * `ہجری` and `عیسوی` rather than a bare `ھ`: the archive's readers include
 * people for whom the abbreviation is not obvious, and a spelled-out era costs
 * two words in a field that is otherwise digits.
 */
const ERA_MARKERS: readonly (readonly [string, string])[] = [
  ['A.H.', 'ہجری'],
  ['AH', 'ہجری'],
  ['Hijrah', 'ہجری'],
  ['Hijri', 'ہجری'],
  ['C.E.', 'عیسوی'],
  ['CE', 'عیسوی'],
  ['A.D.', 'عیسوی'],
  ['AD', 'عیسوی'],
  ['B.C.E.', 'قبل مسیح'],
  ['BCE', 'قبل مسیح'],
  ['BC', 'قبل مسیح'],
];

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Longest first across the whole set, so `Rabi al-Thani` is matched before any
 *  shorter form can claim its prefix. */
function alternation(values: readonly string[]): string {
  return [...values]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');
}

const MONTH_INDEX = new Map<string, number>();
for (const [i, variants] of MONTH_VARIANTS.entries()) {
  for (const variant of variants) MONTH_INDEX.set(variant.toLowerCase(), i);
}

const ALL_MONTHS = MONTH_VARIANTS.flat();
/* No `\b` on either side: several variants end in a letter but others contain
   `.` and `ʿ`, where `\b` behaves differently. A lookaround on the letter class
   is what "not part of a longer word" actually means here. */
const MONTH_RE = new RegExp(`(?<![A-Za-z])(${alternation(ALL_MONTHS)})(?![A-Za-z])`, 'g');

const ERA_RE = new RegExp(
  `(?<![A-Za-z])(${alternation(ERA_MARKERS.map(([latin]) => latin))})(?![A-Za-z])`,
  'g',
);
const ERA_INDEX = new Map(ERA_MARKERS.map(([latin, urdu]) => [latin.toLowerCase(), urdu]));

/**
 * Whether this occurrence of a month name is part of a date rather than of a
 * sentence.
 *
 * The four shapes the recorded data uses: a day number before it, a year after
 * it, the month alone in parentheses, or "month of Rajab". English prose that
 * merely mentions a month — "Muharram observances", "during Ramadan" — matches
 * none of them and is left exactly as written.
 */
function inDateContext(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 24), start);
  const after = text.slice(end, end + 12);
  if (/\d\s*(?:[–—-]\s*\d+\s*)?$/.test(before)) return true; // "11 ", "15–17 "
  if (/^[\s,]*\d/.test(after)) return true; // " 729", ", 1119"
  if (/^\s+in\s+\d/.test(after)) return true; // "Ramazan in 1575"
  if (/\($/.test(before) && /^\)/.test(after)) return true; // "(Safar)"
  if (/month of\s*$/i.test(before)) return true;
  return false;
}

/**
 * The recorded string with its Hijri month and calendar marker in Urdu, and
 * everything else exactly as recorded.
 *
 * Returns the input unchanged for English, for an empty value, and — the case
 * that matters — for any string whose Latin is not a date. Digits are not
 * touched here: `fmtNum` at the render site is the single place numerals are
 * localised (i18n rule 5).
 */
export function localizeRecordedDate(value: string | null | undefined, lang: Lang): string {
  const raw = String(value ?? '');
  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: this is a Latin→Urdu date table
  if (!raw || lang !== 'ur') return raw;

  let touchedMonth = false;
  const withMonths = raw.replace(MONTH_RE, (match, _m, offset: number) => {
    if (!inDateContext(raw, offset, offset + match.length)) return match;
    const index = MONTH_INDEX.get(match.toLowerCase());
    if (index === undefined) return match;
    touchedMonth = true;
    return HIJRI_MONTH_NAMES_UR[index];
  });

  /* The era marker only follows the month, never leads. Substituted only where
     a month was — or where a number precedes it, which is the "1045 AH" and
     "681 CE" shape. Left alone in prose, where "AD" could be an initialism and
     `CE` could be anything. */
  return withMonths.replace(ERA_RE, (match, _m, offset: number) => {
    const before = withMonths.slice(Math.max(0, offset - 16), offset);
    if (!touchedMonth && !/[\d۰-۹]\s*$/.test(before)) return match;
    return ERA_INDEX.get(match.toLowerCase()) ?? match;
  });
}

/** True when a localised value still carries Latin, so a caller knows whether it
 *  must still declare and isolate the run. */
export function hasLatin(value: string): boolean {
  return /[A-Za-z]/.test(value);
}
