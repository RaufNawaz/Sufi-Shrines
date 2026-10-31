import { useSyncExternalStore } from 'react';

/**
 * The gate for project-team-only content. It decides what a reader is *shown*:
 * the public reads a clean page, the team reads every qualification. The data
 * itself is a published Google Sheet, so no gate makes a field secret.
 *
 * Since 31 October 2026 the gate is fixed per build (docs/TEAM_ACCESS_PLAN.md,
 * vite.config.ts): the public build has it off and contains no team-only code,
 * strings or data; the team build has it on and is published only encrypted,
 * behind a passphrase. The switchable behaviour below survives only in the
 * runtime build (dev server, vitest, build:e2e), so both views can be reviewed
 * and tested.
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

/** The team edition: a separate build under `<base>team/`, published encrypted and
 *  opened with a passphrase (scripts/team/, docs/TEAM_ACCESS_PLAN.md). */
export function teamSiteUrl(): string {
  return `${import.meta.env.BASE_URL}team/`;
}

function stripTeamParam(url: URL): void {
  url.searchParams.delete('team');
  try {
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // A sandboxed frame can refuse replaceState; the flag is set regardless.
  }
}

/** Call once on app load (see App.tsx). The public build has no team view to
 *  switch on: `?team=1` sends the reader to the team edition's passphrase page
 *  instead (old links keep working, and still reveal nothing). The team build
 *  is always in team view. Only the switchable (runtime) build, used by the dev
 *  server and the tests, still promotes `?team=1` / `?team=0` into the
 *  persisted flag. Every build removes the param from the address bar. */
export function persistAccessParamIfPresent(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const param = url.searchParams.get('team');
  if (param !== '1' && param !== '0') return;
  if (!__TEAM_CODE__ && param === '1') {
    window.location.replace(teamSiteUrl());
    return;
  }
  if (__TEAM_CODE__ && !__TEAM_ALWAYS__) writeAccess(param === '1');
  stripTeamParam(url);
}

export function hasProjectAccess(): boolean {
  if (!__TEAM_CODE__) return false;
  if (__TEAM_ALWAYS__) return true;
  if (typeof window === 'undefined') return false;
  if (memoryOverride !== null) return memoryOverride;
  return readStored(STORAGE_KEY);
}

/** Whether this browser has ever followed the team link — the condition for
 *  showing the switch on /settings. Only the switchable build has a switch. */
export function isTeamKnown(): boolean {
  if (!__TEAM_CODE__ || __TEAM_ALWAYS__) return false;
  if (typeof window === 'undefined') return false;
  return memoryOverride === true || readStored(KNOWN_KEY);
}

/** The switch on /settings and the Team-view badge: on persists the flag,
 *  off clears it. In the team build, "off" locks the edition: the team service
 *  worker forgets the key and shows the passphrase page again. */
export function setProjectAccess(on: boolean): void {
  if (typeof window === 'undefined') return;
  if (__TEAM_ALWAYS__) {
    if (!on) window.location.assign(`${import.meta.env.BASE_URL}lock`);
    return;
  }
  if (__TEAM_CODE__) writeAccess(on);
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

function useSwitchableTeamAccess(): boolean {
  return useSyncExternalStore(subscribe, hasProjectAccess, serverSnapshot);
}

/** The gate as a hook. In the public and team builds it is a constant (the choice
 *  is made per build, so no rule of hooks is bent); in the switchable build it
 *  re-renders on the /settings switch and across tabs. */
export const useTeamAccess: () => boolean = !__TEAM_CODE__
  ? () => false
  : __TEAM_ALWAYS__
    ? () => true
    : useSwitchableTeamAccess;
