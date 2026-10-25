/**
 * The page modules behind the five tab destinations, as importers.
 *
 * One table, used twice: `App.tsx` hands these to `React.lazy`, and `TabLink`
 * calls the same function on hover, focus or touch so the chunk is already
 * arriving before the click. The bundler dedupes the two calls — they are the
 * same `import()` — so a prefetch is the route's real load started early, not
 * a second download.
 */
export const ROUTE_MODULES = {
  '/': () => import('../../pages/MapPage'),
  '/graph': () => import('../../pages/GraphPage'),
  '/almanac': () => import('../../pages/AlmanacPage'),
  '/typology': () => import('../../pages/TypologyPage'),
  '/sources': () => import('../../pages/SourcesPage'),
  '/about': () => import('../../pages/AboutPage'),
} as const;

export type TabPath = keyof typeof ROUTE_MODULES;

const started = new Map<string, Promise<unknown>>();

/** Start (once) loading the page module for `path`; resolves when it is in. */
export function preloadRoute(path: string): Promise<unknown> {
  const load = ROUTE_MODULES[path as TabPath];
  if (!load) return Promise.resolve();
  let pending = started.get(path);
  if (!pending) {
    pending = load().catch(() => {
      // A failed prefetch must not poison the real navigation, which retries.
      started.delete(path);
    });
    started.set(path, pending);
  }
  return pending;
}

/**
 * The page modules behind the archive's other routes, keyed by the path's
 * first segment — the entry pages a reader reaches from a list, a card or a
 * search row. Same contract as `ROUTE_MODULES`: `App.tsx` lazy-loads from this
 * table, and `preloadForHref` starts the same import early.
 */
export const SEGMENT_MODULES = {
  shrine: () => import('../../pages/ShrinePage'),
  saint: () => import('../../pages/SaintPage'),
  order: () => import('../../pages/OrderPage'),
  place: () => import('../../pages/PlacePage'),
  tradition: () => import('../../pages/TraditionPage'),
  source: () => import('../../pages/SourcePage'),
  chronology: () => import('../../pages/ChronologyPage'),
  'shared-ground': () => import('../../pages/SharedGroundPage'),
  settings: () => import('../../pages/SettingsPage'),
} as const;

/** The module a link leads to, if it is one of ours: the router's basename
 *  and the `/ur` prefix are stripped, external and hash-only links ignored. */
export function moduleKeyForHref(href: string, base: string): string | null {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  let path = url.pathname;
  const trimmedBase = base.replace(/\/$/, '');
  if (trimmedBase && path.startsWith(trimmedBase)) path = path.slice(trimmedBase.length);
  path = path.replace(/^\/ur(?=\/|$)/, '') || '/';
  if (path in ROUTE_MODULES) return path;
  const segment = path.split('/')[1] ?? '';
  return segment in SEGMENT_MODULES ? segment : null;
}

/** Start (once) loading the page a link leads to; resolves when it is in
 *  (at once for a link that is not to one of these pages). */
export function preloadForHref(href: string, base: string): Promise<unknown> {
  const key = moduleKeyForHref(href, base);
  if (!key) return Promise.resolve();
  if (key in ROUTE_MODULES) return preloadRoute(key);
  let pending = started.get(key);
  if (!pending) {
    pending = SEGMENT_MODULES[key as keyof typeof SEGMENT_MODULES]().catch(() => {
      started.delete(key);
    });
    started.set(key, pending);
  }
  return pending;
}

/** How long a tap waits for the destination's code before navigating anyway. */
const PRELOAD_WAIT_MS = 250;

/**
 * Resolves when `preload` does or after PRELOAD_WAIT_MS, whichever is first.
 *
 * Taps await the destination's chunk so the view transition captures a painted
 * page rather than the Suspense fallback. Unbounded, that wait was the whole
 * download: on slow mobile data a tap sat with no response for seconds
 * (mobile audit, 25 October 2026). Past the cap, the route's own Suspense
 * fallback is the feedback.
 */
export function preloadBriefly(preload: Promise<unknown>): Promise<void> {
  return Promise.race([
    preload.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_WAIT_MS)),
  ]);
}

/** First path segments the router owns (with or without the `/ur` prefix). A
 *  same-origin link outside these — a dataset download, a vendored file — is
 *  a file, not a page, and must be left to the browser. */
const APP_SEGMENTS = new Set([
  '',
  ...Object.keys(SEGMENT_MODULES),
  'graph',
  'almanac',
  'typology',
  'sources',
  'about',
  'review',
  'coverage',
  'report',
]);

/** The router location (`/shrine/x?y#z`, basename removed) an in-app link
 *  points at, or null when it is not a page of this app. */
export function routerPathForHref(href: string, base: string): string | null {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const trimmedBase = base.replace(/\/$/, '');
  let path = url.pathname;
  if (trimmedBase) {
    if (!path.startsWith(trimmedBase)) return null;
    path = path.slice(trimmedBase.length) || '/';
  }
  const segments = path.split('/');
  const first = segments[1] === 'ur' ? (segments[2] ?? '') : (segments[1] ?? '');
  if (!APP_SEGMENTS.has(first)) return null;
  return `${path}${url.search}${url.hash}`;
}
