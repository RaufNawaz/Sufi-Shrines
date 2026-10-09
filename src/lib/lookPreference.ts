import { LOOK_STORAGE_KEY } from './storageKeys';

/**
 * The archive's look: the Apple pass of 9 October 2026, or the warm serif
 * design it replaced.
 *
 * Rauf asked for the redesign to be reversible from `/settings`. What reverts
 * is the *theme* — the neutral palette, the sans display titles and section
 * headings, the pill buttons — through one attribute on `<html>` that the
 * stylesheets key their overrides on (`[data-look='classic']` in tokens.css and
 * components.css). The structural changes (the calendar card and agenda, the
 * inset lists, the stat tiles) are the same under both looks; keeping two
 * layouts alive would be two sites.
 */
export type LookPreference = 'modern' | 'classic';

export const DEFAULT_LOOK: LookPreference = 'modern';

export function readLookPreference(): LookPreference {
  if (typeof window === 'undefined') return DEFAULT_LOOK;
  try {
    return window.localStorage.getItem(LOOK_STORAGE_KEY) === 'classic' ? 'classic' : DEFAULT_LOOK;
  } catch {
    return DEFAULT_LOOK;
  }
}

export function writeLookPreference(look: LookPreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOOK_STORAGE_KEY, look);
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}

export function applyLookPreference(look: LookPreference, root: HTMLElement): void {
  if (look === 'classic') root.setAttribute('data-look', 'classic');
  else root.removeAttribute('data-look');
}
