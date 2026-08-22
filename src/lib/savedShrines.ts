import { useSyncExternalStore } from 'react';
import { SAVED_SHRINES_STORAGE_KEY } from './storageKeys';

/**
 * The reader's saved shrines — a personal ziyarat list. Deliberately
 * client-side only (localStorage): it works offline in the PWA, needs no
 * account, and never leaves the device. Slugs are the identity, matching
 * the app's stable-slug contract (renaming a slug is already a breaking
 * change for photo URLs; this list rides the same rule).
 *
 * Cross-component sync via a custom event; cross-tab sync via the native
 * 'storage' event. Snapshots are cached by raw string so
 * useSyncExternalStore sees a stable reference between writes.
 */

const CHANGE_EVENT = 'shrines:saved-changed';

const EMPTY: readonly string[] = Object.freeze([]);
let cacheRaw: string | null = null;
let cacheParsed: readonly string[] = EMPTY;

function read(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVED_SHRINES_STORAGE_KEY);
  } catch {
    return EMPTY; // storage unavailable (private mode etc.) — feature degrades quietly
  }
  if (raw === cacheRaw) return cacheParsed;
  cacheRaw = raw;
  if (!raw) {
    cacheParsed = EMPTY;
    return cacheParsed;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cacheParsed = Array.isArray(parsed)
      ? Object.freeze(parsed.filter((s): s is string => typeof s === 'string'))
      : EMPTY;
  } catch {
    cacheParsed = EMPTY;
  }
  return cacheParsed;
}

function write(slugs: readonly string[]): void {
  try {
    localStorage.setItem(SAVED_SHRINES_STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Quota/private mode: the toggle still updates the in-memory cache below,
    // so the UI stays consistent for this page view.
    cacheRaw = JSON.stringify(slugs);
    cacheParsed = Object.freeze([...slugs]);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getSavedSlugs(): readonly string[] {
  return read();
}

export function isSaved(slug: string): boolean {
  return read().includes(slug);
}

export function toggleSaved(slug: string): void {
  const current = read();
  write(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Reactive saved list — re-renders on toggle, in any component, any tab. */
export function useSavedShrines(): readonly string[] {
  return useSyncExternalStore(subscribe, getSavedSlugs, () => EMPTY);
}
