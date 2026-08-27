/**
 * The sheet's bytes, requested before React exists.
 *
 * ## The measurement
 *
 * On a preview build at 390px under Lighthouse's mobile preset — 4× CPU, slow
 * 4G, via `scripts/measure-blocking.mjs` — the CSV request on `/?lang=ur` did
 * not *start* until **3,790ms**, finished at 8,310ms, and LCP landed at
 * 8,840ms. Nothing was slow about the request; it had not been made yet.
 *
 * `main.tsx` gates the first render on `loadUiStrings(lang)`, deliberately: an
 * Urdu reader must not see a frame of English chrome. So React does not mount
 * until that chunk lands, and the fetch inside `useShrineData` cannot begin
 * until React mounts. The interface strings, both Nastaliq faces and the 253 KB
 * Urdu content payload therefore all download *ahead of the data the page is
 * about*.
 *
 * ## Why this module exists at all, rather than a call into the hook
 *
 * The first attempt exported `prefetchShrines()` from `useShrineData` and called
 * it from `main.tsx`. That put the hook — and PapaParse, and the shrine model —
 * into the **entry** chunk, so `/settings`, `/review` and the 404 each grew
 * 18–30 KB of parser they will never run, and `check-bundle-budget` failed the
 * build. It was right to: `index.html` is every route's eager cost, and the
 * guard's own header was written about this exact mistake one directory over.
 *
 * So the prefetch is bytes only. This module imports one string constant and
 * nothing else, `fetch` is the platform's, and the parsing stays where it was —
 * in the hook, in the lazily-loaded route that needs it.
 *
 * ## Why the text and not a warm HTTP cache
 *
 * The tempting version is a bare `fetch(CSV_URL)` whose response the hook's
 * existing `Papa.parse(url, { download: true })` then picks up from cache. That
 * depends on Google's cache headers for a published sheet being what we hope,
 * and the failure mode — two full downloads of a megabyte on a metered phone —
 * is worse than the problem. Holding the text is not a guess.
 */
import { CSV_URL } from './constants';

let primed: Promise<string> | null = null;

/**
 * Start the download. Safe to call more than once; only the first does anything.
 */
export function prefetchCsvText(): void {
  if (primed) return;
  primed = fetchCsvText();
  /* Nothing is awaiting it yet, and an early failure must not surface as an
     unhandled rejection. The consumer sees the same rejection when it takes
     the promise. */
  primed.catch(() => {});
}

/**
 * The primed download, once, or null if there is none to take.
 *
 * Handed over rather than shared, so a later background refresh makes a fresh
 * request instead of re-reading a copy of the sheet from page load.
 */
export function takeCsvText(): Promise<string> | null {
  const taken = primed;
  primed = null;
  return taken;
}

/**
 * One request for the sheet as text.
 *
 * `cache: 'no-store'` is deliberately *not* set: the browser's own caching of a
 * published sheet is fine and desirable. What matters is that this is the only
 * request, which is what `primed` guarantees.
 */
export async function fetchCsvText(): Promise<string> {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    // The hook's offline path keys off a rejection, and a 4xx that resolved
    // would be parsed as a CSV whose first row is an HTML error page.
    throw new Error(`Sheet request failed: HTTP ${response.status}`);
  }
  return response.text();
}
