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
