/**
 * The /ur/* route prefix exists only so search engines/social crawlers get a
 * genuinely distinct, separately-prerendered static file for the Urdu
 * variant of a page (see scripts/prerender.mjs) — a query string like
 * ?lang=ur can't select a different static file on GitHub Pages. Once a real
 * browser loads one of these routes, App.tsx's UrPrefixNormalizer silently
 * rewrites the URL back to the app's actual, long-established scheme
 * (path without /ur + ?lang=ur), so every other part of the app (setLang,
 * persistence, sharing, the e2e suite) keeps working exactly as before.
 */

/** Strips Vite's BASE_URL from a raw pathname, returning a root-relative path. */
function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL;
  return pathname.startsWith(base) ? `/${pathname.slice(base.length)}` : pathname;
}

/** True when the (base-relative) path is the /ur prerender-discovery prefix. */
export function isUrPrefixedPath(pathname: string): boolean {
  return /^\/ur(\/|$)/.test(stripBase(pathname));
}

/** Rewrites a raw (base-included) pathname, stripping a leading /ur segment. */
export function stripUrPrefix(pathname: string): string {
  const base = import.meta.env.BASE_URL;
  const rest = stripBase(pathname).replace(/^\/ur(\/|$)/, '/');
  return base.replace(/\/$/, '') + rest;
}
