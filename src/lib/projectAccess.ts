/**
 * Soft visibility gate for project-team-only content (currently: the
 * source/provenance section on a shrine page). This is NOT security — the
 * site is fully static and its data is a publicly-published Google Sheet CSV
 * fetched at runtime, so the underlying fields are always fetchable directly
 * regardless of what the UI shows. It only keeps casual visitors from
 * stumbling into internal editorial/provenance detail; anyone with the
 * `?team=1` link (or who sets the flag directly) sees it.
 */
const STORAGE_KEY = 'shrines_team_access';
/** Set the first time a browser follows a `?team=1` link and never cleared:
 *  it is what makes the team-view switch appear on /settings (9 October 2026,
 *  Rauf asked where the switch was). The switch is not offered to a browser
 *  that has never had the link — the gate is soft, but it is still a gate. */
const KNOWN_KEY = 'shrines_team_known';

function accessParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('team');
}

function hasAccessParam(): boolean {
  return accessParam() === '1';
}

/** `?team=0` — the way back. Added 9 October 2026 because switching the team
 * view off meant clearing localStorage by hand. */
function hasClearParam(): boolean {
  return accessParam() === '0';
}

/** Call once on app load (see App.tsx): promotes a `?team=1` visit into a
 * persisted flag, so the team doesn't need to re-add the param on every
 * link they follow around the site. */
export function persistAccessParamIfPresent(): void {
  if (typeof window === 'undefined') return;
  if (hasAccessParam()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
      window.localStorage.setItem(KNOWN_KEY, '1');
    } catch {
      // localStorage unavailable (private browsing etc.) — the param still
      // works for this page view via hasProjectAccess() below.
    }
  } else if (hasClearParam()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing persisted to clear
    }
  }
}

export function hasProjectAccess(): boolean {
  if (hasAccessParam()) return true;
  if (hasClearParam()) return false;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Whether this browser has ever followed the team link — the condition for
 *  showing the switch on /settings. */
export function isTeamKnown(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KNOWN_KEY) === '1';
  } catch {
    return false;
  }
}

/** The switch on /settings: on persists the flag, off clears it. */
export function setProjectAccess(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (on) {
      window.localStorage.setItem(STORAGE_KEY, '1');
      window.localStorage.setItem(KNOWN_KEY, '1');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // nothing to persist to
  }
}
