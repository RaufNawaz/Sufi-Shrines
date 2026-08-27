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

/**
 * Replace the whole list — the import path.
 *
 * Separate from `toggleSaved` because an import is one write and one event
 * rather than N of each: toggling in a loop would fire a re-render per slug and,
 * on a list of thirty, leave the intermediate states visible.
 */
export function replaceSavedSlugs(slugs: readonly string[]): void {
  // De-duplicated on the way in: a merge of two devices' lists will overlap,
  // and the list is a set that happens to be stored in order.
  write([...new Set(slugs)]);
}

/** Empty the list. Its own function so the caller reads as what it means. */
export function clearSaved(): void {
  write([]);
}

/**
 * The reader's list as a file they can keep.
 *
 * **Slugs only, and no names.** A slug is the archive's stable identity — the
 * same contract the published photo URLs ride on, so renaming one is already a
 * breaking change — while a site's name is editorial and gets corrected. A file
 * carrying names would look more readable and be wrong a year later, and the
 * importer would have to ignore them anyway. `data-darbar` is legible enough.
 *
 * `exported` is for the person reading the file, not for the importer: nothing
 * in it is trusted on the way back in.
 */
export interface SavedListFile {
  version: 1;
  exported: string;
  saved: readonly string[];
}

export function buildSavedListFile(now: Date): SavedListFile {
  return { version: 1, exported: now.toISOString(), saved: [...read()] };
}

/**
 * Read a list back, refusing anything it cannot vouch for.
 *
 * Returns the slugs, or null when the file is not one of ours. Deliberately
 * strict about *shape* and deliberately silent about *membership*: a slug that
 * no longer exists in the archive is kept rather than dropped, because the
 * archive gains entries and a reader who saved a site before it was published
 * should not have it quietly deleted by an import. The pages that render the
 * list already skip slugs they cannot resolve.
 */
export function parseSavedListFile(text: string): readonly string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const saved = (parsed as { saved?: unknown }).saved;
  if (!Array.isArray(saved)) return null;
  const slugs = saved.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  // An empty array is a valid list; a file whose `saved` held nothing usable is
  // not, and the difference matters because one of them should report a failure.
  if (slugs.length === 0 && saved.length > 0) return null;
  return slugs;
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
