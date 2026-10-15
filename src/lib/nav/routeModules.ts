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
