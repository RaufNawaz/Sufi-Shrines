/**
 * Language metadata — the single place a language's facts live (N4 groundwork,
 * NEXT_STEPS §4). The Shahmukhi/Sindhi plan reuses the entire Nastaliq/RTL
 * stack; what it must NOT require is a sweep of `lang === 'ur'` checks scattered
 * through components. Direction and html-attribute decisions derive from this
 * table, so adding a third language is an entry here plus content — not surgery.
 *
 * Deliberately NOT here: per-language *content* selection (`isRtl ? c.ur :
 * c.en`, `SITE_TYPE_LABELS[key][lang]`) — those are Record<Lang, …> lookups
 * that widen automatically when Lang grows.
 */

export const DEFAULT_LANG = 'en';

export const LANGUAGES = {
  en: { dir: 'ltr' },
  ur: { dir: 'rtl' },
} as const satisfies Record<string, { dir: 'ltr' | 'rtl' }>;

export type Lang = keyof typeof LANGUAGES;

export function isRtlLang(lang: Lang): boolean {
  return LANGUAGES[lang].dir === 'rtl';
}

/** Value for a `dir` attribute on an element whose content is in `lang` —
 * undefined in the document's default direction so no attribute renders. */
export function dirAttr(lang: Lang): 'rtl' | undefined {
  return isRtlLang(lang) ? 'rtl' : undefined;
}

/** Value for a `lang` attribute on an element whose content is in `lang` —
 * undefined for the site default so no attribute renders. */
export function langAttr(lang: Lang): Lang | undefined {
  return lang === DEFAULT_LANG ? undefined : lang;
}
