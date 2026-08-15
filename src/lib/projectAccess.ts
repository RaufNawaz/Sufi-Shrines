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

function hasAccessParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('team') === '1';
}

/** Call once on app load (see App.tsx): promotes a `?team=1` visit into a
 * persisted flag, so the team doesn't need to re-add the param on every
 * link they follow around the site. */
export function persistAccessParamIfPresent(): void {
  if (typeof window === 'undefined') return;
  if (hasAccessParam()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage unavailable (private browsing etc.) — the param still
      // works for this page view via hasProjectAccess() below.
    }
  }
}

export function hasProjectAccess(): boolean {
  if (hasAccessParam()) return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
