/**
 * Single source of truth for the app's localStorage keys, shared by app code,
 * unit tests, and Playwright specs so the literal strings aren't duplicated.
 *
 * These key VALUES are part of the app's persisted contract with returning
 * visitors' browsers — renaming a constant is fine, changing its value is a
 * breaking change (it silently discards every user's saved preference).
 */

/** Persisted UI language ('en' | 'ur') — read by LanguageContext and, because
 * it must work even when a provider crashed, AppErrorBoundary. */
export const LANGUAGE_STORAGE_KEY = 'shrines_language';

/** Persisted numeral-system preference ('eastern' | 'western') for Urdu. */
export const NUMERALS_STORAGE_KEY = 'shrines_numerals';

/** Persisted theme ('light' | 'dark') — also read pre-mount in main.tsx to
 * avoid a flash of the wrong theme. */
export const THEME_STORAGE_KEY = 'shrines_theme';

/** Guided-tours opt-in switch on the map sidebar ('on' | 'off'). */
export const TOURS_STORAGE_KEY = 'shrines_tours';

/** Preferred destination for the map's "Table of Shrines" button. */
export const DIRECTORY_MODE_STORAGE_KEY = 'shrines_directory_mode';

/** Per-tour progress + the "Resume tour" pointer (JSON, see tourProgress.ts). */
export const TOUR_PROGRESS_STORAGE_KEY = 'shrines_tour_progress';

/** The reader's saved shrines — a personal ziyarat list (JSON array of
 * slugs, see savedShrines.ts). */
export const SAVED_SHRINES_STORAGE_KEY = 'shrines_saved';
