/**
 * localStorage that never throws.
 *
 * Safari with "Block All Cookies", some in-app webviews (Instagram, Facebook)
 * and older iOS private tabs throw on *reading* `localStorage`, not only on
 * writing it. An unguarded read at startup (main.tsx's pre-paint theme block)
 * left a blank page; an unguarded write inside the theme toggle stopped the
 * toggle working at all. Every preference read and write goes through these,
 * and the feature degrades to "not remembered" instead.
 */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns whether the value was stored. */
export function writeStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
