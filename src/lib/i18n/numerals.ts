import type { Lang } from '../../types/shrine';

const EASTERN = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Converts Western digits 0-9 in a string to Eastern Arabic-Indic ۰-۹. */
export const toEasternDigits = (s: string | number): string =>
  String(s).replace(/[0-9]/g, (d) => EASTERN[+d]);

/**
 * Applies the Eastern-numeral toggle: only affects Urdu, and only when the
 * toggle is on. Coordinates and other Western-locked values should never be
 * passed through this — callers opt in per render site (see fmtNum in
 * LanguageContext).
 */
export function localizeDigits(text: string, lang: Lang, eastern: boolean): string {
  return lang === 'ur' && eastern ? toEasternDigits(text) : text;
}

/**
 * Matches runs that must keep Western digits even inside Urdu prose: URLs,
 * bare domains, DOIs, and ISBN-like identifiers. Converting a digit inside
 * any of these breaks the thing it identifies.
 */
const WESTERN_LOCKED =
  /(https?:\/\/\S+|www\.\S+|\b(?:doi|DOI):\s*\S+|\b(?:ISBN|isbn)[\s:-]*[\d-]+X?\b|\S+@\S+\.\S+)/g;

/**
 * Eastern numerals for running Urdu prose.
 *
 * `localizeDigits` is for a single value a caller already knows is safe.
 * Article bodies are not: a bibliography line can carry a URL, a DOI or an
 * ISBN in the middle of an Urdu sentence, and rewriting those digits would
 * turn a working citation into a dead one. This converts everything *except*
 * those runs, so a year reads ۱۸۷۳ while the link beside it still resolves.
 *
 * Prose was the one number-render site the Eastern-numeral rule (CLAUDE.md
 * i18n rule 5) never reached: dates inside translated article text kept
 * rendering as 1873–1966 in the middle of Nastaliq.
 */
export function localizeProseDigits(text: string, lang: Lang, eastern: boolean): string {
  if (lang !== 'ur' || !eastern) return text;
  if (!/[0-9]/.test(text)) return text;

  let out = '';
  let lastIndex = 0;
  for (const match of text.matchAll(WESTERN_LOCKED)) {
    const start = match.index ?? 0;
    out += toEasternDigits(text.slice(lastIndex, start));
    out += match[0];
    lastIndex = start + match[0].length;
  }
  return out + toEasternDigits(text.slice(lastIndex));
}
