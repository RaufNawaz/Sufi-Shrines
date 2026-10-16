import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { RECENT_ENTRIES_STORAGE_KEY } from './storageKeys';

/**
 * The entries a reader opened most recently — what the archive search shows
 * before anything is typed.
 *
 * Its empty state was a blank panel (council, 15 October 2026): a reader moving
 * between a shrine, its saint and the next shrine retyped every name, on a
 * phone keyboard, in two scripts. Client-side only, like the saved list
 * (savedShrines.ts, whose shape this follows): it works offline, needs no
 * account, and never leaves the device.
 */

export type RecentKind = 'shrine' | 'figure' | 'order' | 'tradition' | 'place';
export type RecentEntry = { kind: RecentKind; slug: string };

export const RECENT_LIMIT = 8;
const CHANGE_EVENT = 'shrines:recent-changed';
const KINDS: readonly RecentKind[] = ['shrine', 'figure', 'order', 'tradition', 'place'];
const EMPTY: readonly RecentEntry[] = Object.freeze([]);

let cacheRaw: string | null = null;
let cacheParsed: readonly RecentEntry[] = EMPTY;

function read(): readonly RecentEntry[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RECENT_ENTRIES_STORAGE_KEY);
  } catch {
    return cacheParsed;
  }
  if (raw === cacheRaw) return cacheParsed;
  cacheRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cacheParsed = Array.isArray(parsed)
      ? Object.freeze(
          parsed.filter(
            (e): e is RecentEntry =>
              !!e &&
              typeof e === 'object' &&
              KINDS.includes((e as RecentEntry).kind) &&
              typeof (e as RecentEntry).slug === 'string',
          ),
        )
      : EMPTY;
  } catch {
    cacheParsed = EMPTY;
  }
  return cacheParsed;
}

function write(entries: readonly RecentEntry[]): void {
  const raw = JSON.stringify(entries);
  try {
    localStorage.setItem(RECENT_ENTRIES_STORAGE_KEY, raw);
  } catch {
    // Private mode / quota: keep this page view consistent in memory.
  }
  cacheRaw = raw;
  cacheParsed = Object.freeze([...entries]);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getRecentEntries(): readonly RecentEntry[] {
  return read();
}

/** Newest first, one row per entry, at most `RECENT_LIMIT`. */
export function recordRecent(kind: RecentKind, slug: string): void {
  const current = read();
  if (current[0]?.kind === kind && current[0]?.slug === slug) return;
  write(
    [{ kind, slug }, ...current.filter((e) => !(e.kind === kind && e.slug === slug))].slice(
      0,
      RECENT_LIMIT,
    ),
  );
}

export function clearRecent(): void {
  write([]);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useRecentEntries(): readonly RecentEntry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

const ROUTE_KIND: Record<string, RecentKind> = {
  shrine: 'shrine',
  saint: 'figure',
  order: 'order',
  tradition: 'tradition',
  place: 'place',
};

/** The entry a path names, if it names one — `/ur/saint/x` as well as `/saint/x`. */
export function entryForPath(pathname: string): RecentEntry | null {
  const match = /^\/(?:ur\/)?(shrine|saint|order|tradition|place)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  return { kind: ROUTE_KIND[match[1]], slug: decodeURIComponent(match[2]) };
}

/** Records every entry page the reader reaches. One listener on the route,
 *  rather than a call in each of five pages that would drift apart. An unknown
 *  slug is recorded too and simply never shown: the search resolves each entry
 *  against the data and drops what it cannot find. */
export function useRecordRecentEntries(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const entry = entryForPath(pathname);
    if (entry) recordRecent(entry.kind, entry.slug);
  }, [pathname]);
}
