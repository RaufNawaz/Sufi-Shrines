/**
 * The opening view, on a screen the archive does not fit.
 *
 * ## What was measured, 30 August 2026
 *
 * The map opens at a fixed centre and zoom — `DEFAULT_CENTER` is Lahore
 * (31.52, 74.36) at `DEFAULT_ZOOM` 6 — regardless of viewport. The archive
 * spans **24.36–34.79° latitude and 65.52–75.02° longitude**, so Lahore is not
 * near its middle: it is in the north-east corner. On a desktop viewport the
 * surrounding map is wide enough that this does not show. On a phone, in
 * portrait, with the sheet occupying the bottom 184px, it crops the south-west
 * away.
 *
 * Marker centres falling outside the visible map rectangle, counted per
 * viewport:
 *
 *     390×664   60 of 169        414×896   54 of 169
 *     390×844   54 of 169        360×780   56 of 169
 *     1280×900   0 of 169
 *
 * **And it is not a random third.** Broken down by tradition at 390×664:
 * **14 of 14 Nanakpanthi/Udasi darbars**, 16 of 36 Hindu temples, 2 of 3 Jain
 * temples, against 23 of 79 Muslim shrines and 4 of 33 gurdwaras. Every size
 * measured put *all fourteen* Nanakpanthi sites off-screen. The archive's
 * distinguishing claim is that it holds six traditions, and a phone reader was
 * being shown four of them.
 *
 * ## What this does, and what it deliberately leaves alone
 *
 * On a narrow viewport the opening view is fitted to the sites themselves, with
 * the sheet's height as bottom padding so the fit targets the *unoccluded*
 * rectangle rather than the viewport. On desktop nothing changes: it measures
 * 0 of 169 outside, and a view that is already correct is not worth the risk of
 * recomputing.
 *
 * This does not reopen the pin-density ruling (`MAP_PIN_DENSITY_2026-08-30.md`,
 * *fan on tap, and leave the resting map alone*). That decision was about not
 * clustering or redrawing the markers; this changes where the camera starts on
 * a phone, draws every pin exactly as before, and adds no cluster bubble.
 */

/** Above this width the opening view is already correct — measured, not chosen. */
export const NARROW_MAX_WIDTH = 768;

/** The sheet's peek height when the stylesheet cannot be read. Matches
 *  `--sheet-peek-height`; used only as a fallback so a missing custom property
 *  degrades to a slightly generous pad rather than to none. */
export const SHEET_PEEK_FALLBACK = 184;

/** Breathing room around the fitted bounds, so edge pins are not on the rim. */
export const FIT_MARGIN = 24;

export interface Point {
  lat: number;
  lng: number;
}

/** True when the viewport is one of the sizes measured to crop the archive. */
export function isNarrowViewport(width: number): boolean {
  return width <= NARROW_MAX_WIDTH;
}

/**
 * The south-west / north-east corners enclosing every mapped site, or `null`
 * when there is nothing to enclose.
 *
 * Returns `null` rather than a degenerate box for the empty case on purpose:
 * the first render has no shrines yet, and fitting to an empty bounds throws in
 * Leaflet. The caller keeps the default view until there is something to fit.
 */
export function boundsOfPoints(
  points: readonly Point[],
): [[number, number], [number, number]] | null {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  let seen = 0;

  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    seen += 1;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  if (seen === 0) return null;
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * The sheet's peek height in pixels, read from the stylesheet that owns it.
 *
 * Read rather than hardcoded because `--sheet-peek-height` carries a measured
 * decision of its own — 184px, chosen so the "Table of Shrines" button clears
 * the fold — and a second copy of that number here would be one to keep in sync
 * by hand. A non-px value or a missing property falls back.
 */
export function sheetPeekHeight(read: (name: string) => string): number {
  const raw = read('--sheet-peek-height').trim();
  const parsed = Number.parseFloat(raw);
  return raw.endsWith('px') && Number.isFinite(parsed) && parsed > 0 ? parsed : SHEET_PEEK_FALLBACK;
}

/**
 * Leaflet `fitBounds` padding for a narrow viewport: uniform margin, plus the
 * sheet's height along the bottom edge, which is the whole point — the visible
 * map is the viewport minus the sheet, and fitting to the viewport is what put
 * a third of the archive underneath it.
 */
export function fitPadding(sheetHeight: number): {
  paddingTopLeft: [number, number];
  paddingBottomRight: [number, number];
} {
  return {
    paddingTopLeft: [FIT_MARGIN, FIT_MARGIN],
    paddingBottomRight: [FIT_MARGIN, sheetHeight + FIT_MARGIN],
  };
}
