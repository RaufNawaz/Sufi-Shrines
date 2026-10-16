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

/** Start (once) loading the page a link leads to. */
export function preloadForHref(href: string, base: string): void {
  const key = moduleKeyForHref(href, base);
  if (!key) return;
  if (key in ROUTE_MODULES) {
    void preloadRoute(key);
    return;
  }
  if (started.has(key)) return;
  const pending = SEGMENT_MODULES[key as keyof typeof SEGMENT_MODULES]().catch(() => {
    started.delete(key);
  });
  started.set(key, pending);
}
