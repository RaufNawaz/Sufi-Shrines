/**
 * A shrine's `silsila` cell, resolved to the order page it names — when it
 * names exactly one.
 *
 * ## Why this exists
 *
 * `/order/qadiriyya` links out to 90 shrines, 88 figures and 12 places. **Not
 * one shrine page linked back.** The infobox row read "Silsila (order): Qadiri"
 * as inert text, sitting directly beneath "Built form" and "Tradition", both of
 * which are links — so the entity graph had exactly one one-way edge, and the
 * chain `/shrine/data-darbar → /saint/… → /order/qadiriyya` could not be walked
 * forwards.
 *
 * ## Why "exactly one", and why the rest stay text
 *
 * Measured against the shipped snapshot: of **52** rows carrying a `silsila`,
 * **47** name exactly one of the archive's nine orders. Three name two —
 * "Chishti Nizamia Qadria", "Qadri Shattari", and one whose cell recites a
 * *bai'at* to a shaykh of both — and two are prose rather than an affiliation
 * ("Not stated as an order…", "As recorded: 'Ahl e Sunnat - Ghaznavi silsila'").
 *
 * A dual affiliation is a fact about the figure, not an ambiguity to resolve:
 * linking it to whichever pattern matched first would assert something the
 * sheet declines to. So a cell that matches two orders renders exactly as it
 * does today, and `silsila_note` beneath it already carries the survey's own
 * wording. RULE 2.
 *
 * ## Why the patterns live here and are mirrored, not the other way round
 *
 * They were `ORDER_CELL_PATTERNS` inside `scripts/data/build-kg.mjs`, where
 * they *verify* a seeded order against the figure's own cell rather than
 * resolving anything. The app cannot import a `.mjs` build script's internals,
 * and copying nine regexes into a component is how two tables start disagreeing.
 * So the table moves here, `scripts/data/lib/silsila.mjs` mirrors it for the
 * scripts, and `silsilaSync.test.ts` refuses drift — the same arrangement
 * `places.ts` / `places.mjs` and `slugify.ts` / `slugs.mjs` already use, and the
 * reason those have held is the guard rather than the good intentions.
 */

/** Order slug → the pattern that recognises it in a `silsila` cell. */
export const SILSILA_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['chishtiyya', /chisht/i],
  ['suhrawardiyya', /suhraward/i],
  ['qadiriyya', /qad[ir]{1,2}i?/i],
  ['qalandariyya', /qalandar/i],
  ['naqshbandiyya', /naqshband/i],
  ['rashidi', /rashidi/i],
  ['malamati', /malamat/i],
  ['azeemia', /azeemia/i],
  ['shattari', /shattar/i],
];

/** Every order a cell names, in table order. */
export function ordersNamedIn(value: string): string[] {
  const text = (value ?? '').trim();
  if (!text) return [];
  return SILSILA_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([slug]) => slug);
}

/**
 * The single order this cell names, or `null`.
 *
 * `null` for a cell that names none — it is prose — and for a cell that names
 * two, which is a real dual affiliation and not this function's to pick between.
 */
export function orderSlugForSilsila(value: string): string | null {
  const named = ordersNamedIn(value);
  return named.length === 1 ? named[0]! : null;
}
