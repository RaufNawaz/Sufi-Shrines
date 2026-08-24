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

/**
 * One row per language, carrying the properties the codebase actually branches
 * on.
 *
 * `dir` was here from the start; the other two are the rest of the same idea.
 * `grep -rn "lang === 'ur'" src/` finds 55 comparisons (measured 24 August 2026)
 * and they are not asking one question — they are asking four:
 *
 *   · is this script right-to-left?          → `dir`
 *   · should numerals be Eastern?            → `numerals`
 *   · does this need the Nastaliq stack?     → `script`
 *   · is there a translation for this datum?  → a Record<Lang, …> lookup, which
 *                                               widens on its own and is not a
 *                                               property of the language
 *
 * Every one of them is correct today and roughly half go silently wrong the
 * moment a second RTL language exists, because nothing distinguishes "RTL" from
 * "Urdu specifically". Naming the four is what makes Shahmukhi an entry in this
 * table rather than a sweep through 55 files — see
 * docs/planning/LANGUAGE_LAYER_2026-08-24.md.
 */
export const LANGUAGES = {
  en: { dir: 'ltr', numerals: 'western', script: 'latin', speech: 'en-US' },
  ur: { dir: 'rtl', numerals: 'eastern', script: 'nastaliq', speech: 'ur-PK' },
} as const satisfies Record<
  string,
  {
    dir: 'ltr' | 'rtl';
    /** Which digit set this language renders by default. The reader can still
     * toggle; this is the default the toggle starts from (i18n rule 5). */
    numerals: 'western' | 'eastern';
    /** Which type stack the language needs. `nastaliq` implies the connected
     * Arabic script, which is also why tracking must collapse to `normal` — see
     * the `--tracking-*` tokens. */
    script: 'latin' | 'nastaliq';
    /** BCP-47 tag for speech synthesis — the guided tours' narration. A regional
     * subtag is unavoidable here (`ur-PK`, not `ur`): a voice list is matched on
     * the full tag, and this is the one property where the *country* matters
     * rather than the language. It lived in useTourAudio as a ternary, which is
     * exactly the kind of per-language fact that goes missing when a language is
     * added. */
    speech: string;
  }
>;

export type Lang = keyof typeof LANGUAGES;

export function isRtlLang(lang: Lang): boolean {
  return LANGUAGES[lang].dir === 'rtl';
}

/** Whether this language renders Eastern digits by default. Not the same
 * question as `isRtlLang` — Arabic is RTL and conventionally uses Western digits
 * in much of the Maghreb — so the two must not be conflated even though they
 * happen to agree for `en` and `ur`. */
export function usesEasternNumerals(lang: Lang): boolean {
  return LANGUAGES[lang].numerals === 'eastern';
}

/**
 * Whether this language is set in Latin script.
 *
 * The question behind `<bdi lang="en">` and the `/[A-Za-z]/` checks: a Latin run
 * inside a non-Latin page has to be declared, so the bidi algorithm isolates it
 * and a screen reader switches voice. Asked as "is the page Urdu" it is right by
 * accident — the property that matters is the *page's* script, not which
 * non-Latin language it happens to be.
 */
export function usesLatinScript(lang: Lang): boolean {
  return LANGUAGES[lang].script === 'latin';
}

/** Whether this language needs the Nastaliq type stack: the `--font-urdu`
 * family, the Urdu leading tokens, and no letter-spacing. Distinct from
 * `isRtlLang` for the same reason — a future RTL language set in Naskh would
 * answer yes to one and no to the other. */
export function needsNastaliq(lang: Lang): boolean {
  return LANGUAGES[lang].script === 'nastaliq';
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
