import type { Lang } from '../../types/shrine';
import { LANGUAGE_STORAGE_KEY } from '../storageKeys';
import { isUrPrefixedPath } from './urlLangPrefix';
import { readStorage } from '../safeStorage';

/**
 * The reader's language, decided from the request itself.
 *
 * Lives outside LanguageContext so the data layer can ask the question
 * without importing React: `useShrineData` needs to know, before it builds a
 * single shrine, whether the ~1 MB Urdu article payload is required at all
 * (see urduContentOverride.ts). Importing the provider there would drag the
 * whole i18n surface into the data path and create a cycle.
 *
 * Precedence — explicit signal, then remembered choice, then the browser:
 *   ?lang=  ·  /ur/* prerendered path  ·  localStorage  ·  navigator.language
 *
 * `setLang` writes both the query parameter and localStorage, so calling this
 * again after a runtime switch returns the new language.
 */
/**
 * A language chosen by the link a reader arrived on, remembered when they have
 * never chosen one themselves. An Urdu reader who came by a shared
 * `?lang=ur` link and never touched the switch got English on their next
 * visit — and on a home-screen start — since phones in Pakistan are rarely set
 * to Urdu (settings council, 17 October 2026). A choice made with the switch
 * is stored by `setLang` and always wins over this.
 */
function rememberIfUnset(lang: Lang): Lang {
  try {
    if (localStorage.getItem(LANGUAGE_STORAGE_KEY) === null) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  } catch {
    // Storage may be unavailable; the link still sets this visit's language.
  }
  return lang;
}

export function detectInitialLang(): Lang {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param === 'en' || param === 'ur') return rememberIfUnset(param);
  // A /ur/* prerendered route (see urlLangPrefix.ts) is as explicit a signal
  // as ?lang=ur — checked before localStorage so a shared /ur/shrine/<slug>
  // link never flashes the wrong language before App.tsx's normalizer runs.
  if (isUrPrefixedPath(window.location.pathname)) return rememberIfUnset('ur');
  const stored = readStorage(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'ur') return stored;
  if (navigator.language?.toLowerCase().startsWith('ur')) return 'ur';
  return 'en';
}
