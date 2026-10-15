/**
 * Back closes the overlay, not the page.
 *
 * On a phone the back gesture (Android's system back, iOS's edge swipe in a
 * standalone PWA, the browser's back button anywhere) is how a reader
 * dismisses whatever is laid over the page. Until 15 October 2026 every sheet
 * and both search palettes ignored history, so that gesture left the entry the
 * reader was on — measured: /about → /shrine/data-darbar, open Contents, back,
 * and the reader was on /about with the entry gone.
 *
 * An open overlay pushes one history entry carrying the same URL and a marker
 * under `OVERLAY_KEY`; back pops it and the overlay closes. Closing any other
 * way (Done, Escape, the scrim) takes that entry back off, so the stack is
 * left exactly as it was found. React Router's own keys in `history.state`
 * are copied onto the pushed entry, so the router sees the same location.
 */
export const OVERLAY_KEY = '__overlay';

/** Overlays open right now, innermost last. Module state on purpose: the
 *  popstate listeners of unrelated components need to agree on it. */
const openOverlays: string[] = [];

function currentOverlay(): unknown {
  try {
    return (window.history.state as Record<string, unknown> | null)?.[OVERLAY_KEY];
  } catch {
    return undefined;
  }
}

/** True while the current history entry is one an overlay pushed. A caller
 *  that is about to push its own entry (the map's `?selected=`) replaces this
 *  one instead, so a choice made from a palette does not leave a dead back
 *  step behind it. */
export function isOnOverlayEntry(): boolean {
  return currentOverlay() != null;
}

/** For a `popstate` listener elsewhere: true when this pop is an overlay being
 *  dismissed rather than a real navigation, which the listener must ignore.
 *  Order-independent — the overlay leaves `openOverlays` only when it
 *  unmounts, after every listener for this event has run. */
export function isOverlayHistoryPop(): boolean {
  const top = openOverlays[openOverlays.length - 1];
  return top !== undefined && currentOverlay() !== top;
}

export function registerOverlay(id: string): void {
  if (currentOverlay() !== id) {
    const state = (window.history.state as Record<string, unknown> | null) ?? {};
    window.history.pushState({ ...state, [OVERLAY_KEY]: id }, '');
  }
  openOverlays.push(id);
}

/** Returns the deferred clean-up, so a remount in the same tick (React's
 *  StrictMode runs every effect twice in development) can cancel it rather
 *  than have the queued `history.back()` close the overlay it just reopened. */
export function unregisterOverlay(id: string): () => void {
  const at = openOverlays.lastIndexOf(id);
  if (at !== -1) openOverlays.splice(at, 1);
  const timer = window.setTimeout(() => {
    if (currentOverlay() === id) window.history.back();
  }, 0);
  return () => window.clearTimeout(timer);
}
