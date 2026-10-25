import { useSyncExternalStore } from 'react';

/**
 * Soft visibility gate for project-team-only content. This is NOT security —
 * the site is fully static and its data is a publicly-published Google Sheet
 * CSV fetched at runtime, so the underlying fields are always fetchable
 * directly regardless of what the UI shows. It decides what a reader is
 * *shown*: the public reads a clean page, the team reads every qualification.
 * Plan for replacing the link with a real sign-in: docs/TEAM_ACCESS_PLAN.md.
 *
 * `?team=1` turns the team view on and `?team=0` turns it off. Either is
 * consumed on load by `persistAccessParamIfPresent()` and removed from the
 * address bar, so a link copied afterwards never carries it to someone else.
 *
 * Components read the gate with `useTeamAccess()`, which re-renders when the
 * switch on /settings changes it or when another tab does (the native
 * `storage` event). `hasProjectAccess()` is the same value for non-React code.
 */
const STORAGE_KEY = 'shrines_team_access';
/** Set the first time a browser follows a `?team=1` link and never cleared:
 *  it is what makes the team-view switch appear on /settings (9 October 2026,
 *  Rauf asked where the switch was). The switch is not offered to a browser
 *  that has never had the link — the gate is soft, but it is still a gate. */
const KNOWN_KEY = 'shrines_team_known';
const CHANGE_EVENT = 'shrines:team-access-changed';

/** For a browser whose localStorage throws (some private modes): the choice
 *  made by the link or the switch still holds for the rest of this page's
 *  life, even though the param itself has been stripped from the URL. */
let memoryOverride: boolean | null = null;

function readStored(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeAccess(on: boolean): void {
  memoryOverride = on;
  try {
    if (on) {
      window.localStorage.setItem(STORAGE_KEY, '1');
      window.localStorage.setItem(KNOWN_KEY, '1');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    // Persisted: storage is the truth again, so a later write from another
    // tab is not masked by this one.
    memoryOverride = null;
  } catch {
    // localStorage unavailable — memoryOverride carries it for this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Call once on app load (see App.tsx): promotes `?team=1` / `?team=0` into the
 *  persisted flag, then removes the param from the address bar. */
export function persistAccessParamIfPresent(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const param = url.searchParams.get('team');
  if (param !== '1' && param !== '0') return;
  writeAccess(param === '1');
  url.searchParams.delete('team');
  try {
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // A sandboxed frame can refuse replaceState; the flag is set regardless.
  }
}

export function hasProjectAccess(): boolean {
  if (typeof window === 'undefined') return false;
  if (memoryOverride !== null) return memoryOverride;
  return readStored(STORAGE_KEY);
}

/** Whether this browser has ever followed the team link — the condition for
 *  showing the switch on /settings. */
export function isTeamKnown(): boolean {
  if (typeof window === 'undefined') return false;
  return memoryOverride === true || readStored(KNOWN_KEY);
}

/** The switch on /settings and the Team-view badge: on persists the flag,
 *  off clears it. */
export function setProjectAccess(on: boolean): void {
  if (typeof window === 'undefined') return;
  writeAccess(on);
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

const serverSnapshot = () => false;

/** The gate as a hook: re-renders on the /settings switch and across tabs. */
export function useTeamAccess(): boolean {
  return useSyncExternalStore(subscribe, hasProjectAccess, serverSnapshot);
}
