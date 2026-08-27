/**
 * Guided tours: on or off, persisted.
 *
 * Extracted from `MapPage`, which read and wrote `TOURS_STORAGE_KEY` inline. It
 * needs a module now because a second surface reads the same switch — the
 * settings page — and two `localStorage.getItem` calls with two ideas of what
 * counts as "on" is how a preference starts disagreeing with itself.
 *
 * Same shape as `directoryPreference.ts` deliberately: read, write, an exported
 * default, and every access wrapped, because storage throws rather than
 * returning null in a locked-down browser and a preference is never worth an
 * error boundary.
 *
 * **Off is the default and that is an editorial choice, not an oversight.** The
 * tours are eight curated routes through the archive; the map's own job is the
 * 169 sites. Anyone who has switched them on has said they want them.
 */
import { TOURS_STORAGE_KEY } from './storageKeys';

export const DEFAULT_TOURS_ENABLED = false;

export function readToursEnabled(): boolean {
  if (typeof window === 'undefined') return DEFAULT_TOURS_ENABLED;
  try {
    return window.localStorage.getItem(TOURS_STORAGE_KEY) === 'on';
  } catch {
    return DEFAULT_TOURS_ENABLED;
  }
}

export function writeToursEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOURS_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}
