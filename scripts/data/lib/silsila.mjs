/**
 * The silsila-cell patterns, for scripts that run under plain node.
 *
 * Mirror of `src/lib/data/silsila.ts`, which is the annotated original and the
 * one the app reads. Same arrangement as `places.mjs` / `places.ts` and
 * `slugs.mjs` / `slugify.ts`, and held to it by
 * `src/lib/data/__tests__/silsilaSync.test.ts` — two tables edited by hand
 * diverge, and here the symptom would be a shrine page linking to an order that
 * `build-kg` does not believe the cell names.
 *
 * Patterns are stored as source strings rather than literals so the guard can
 * compare them to the app's `.source` without the flags getting in the way.
 * Rebuilt with `i` and never `g`: a global regex used with `.test()` keeps
 * `lastIndex` between calls, so the same cell answers differently depending on
 * how many times it has been asked.
 */

/** Order slug → pattern source, in the order the app declares them. */
export const SILSILA_PATTERN_SOURCES = [
  ['chishtiyya', 'chisht'],
  ['suhrawardiyya', 'suhraward'],
  ['qadiriyya', 'qad[ir]{1,2}i?'],
  ['qalandariyya', 'qalandar'],
  ['naqshbandiyya', 'naqshband'],
  ['rashidi', 'rashidi'],
  ['malamati', 'malamat'],
  ['azeemia', 'azeemia'],
  ['shattari', 'shattar'],
];

/** Order slug → RegExp, rebuilt case-insensitive and non-global. */
export const ORDER_CELL_PATTERNS = Object.fromEntries(
  SILSILA_PATTERN_SOURCES.map(([slug, source]) => [slug, new RegExp(source, 'i')]),
);

/** Every order a cell names, in table order. */
export function ordersNamedIn(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  return SILSILA_PATTERN_SOURCES.filter(([slug]) => ORDER_CELL_PATTERNS[slug].test(text)).map(
    ([slug]) => slug,
  );
}

/** The single order this cell names, or null when it names none or several. */
export function orderSlugForSilsila(value) {
  const named = ordersNamedIn(value);
  return named.length === 1 ? named[0] : null;
}
