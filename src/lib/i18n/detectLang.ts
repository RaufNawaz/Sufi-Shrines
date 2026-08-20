import type { Lang } from '../../types/shrine';
import { LANGUAGE_STORAGE_KEY } from '../storageKeys';
import { isUrPrefixedPath } from './urlLangPrefix';

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
export function detectInitialLang(): Lang {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param === 'en' || param === 'ur') return param;
  // A /ur/* prerendered route (see urlLangPrefix.ts) is as explicit a signal
  // as ?lang=ur — checked before localStorage so a shared /ur/shrine/<slug>
  // link never flashes the wrong language before App.tsx's normalizer runs.
  if (isUrPrefixedPath(window.location.pathname)) return 'ur';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'ur') return stored;
  if (navigator.language?.toLowerCase().startsWith('ur')) return 'ur';
  return 'en';
}
