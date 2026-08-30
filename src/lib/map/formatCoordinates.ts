/**
 * Printing a coordinate at the precision the archive actually holds.
 *
 * ## What was wrong
 *
 * `LocationMap` rendered `lat.toFixed(5)`, and the Ziyarat print pack
 * `toFixed(4)`. A fixed width does two different wrong things at once:
 *
 * - It **manufactures digits nobody measured.** `/shrine/sant-satram-dham-…`
 *   holds `28.3, 69.39` and displayed `28.30000, 69.39000` — under a heading, a
 *   "Copy coordinates" button and a link to Google Maps. One decimal place is
 *   about 11 km; five implies about one metre. Measured against the shipped
 *   snapshot on 30 August 2026: **12 rows carry two decimal places or fewer on
 *   at least one axis, and two of those carry one.**
 * - It **truncates the ones that are precise.** Rahman Baba Mausoleum holds
 *   `33.99333333` and printed `33.99333`. That direction is harmless — it is a
 *   metre of rounding — and it is why the cap stays.
 *
 * The padding is not harmless, and this archive is the wrong place for it. Ten
 * *other* entries carry a written caveat saying their pin is approximate, which
 * is what makes silence on these twelve read as a statement. `/about` publishes
 * a count of approximate pins; `pipeline/audit_coordinates.py` fails the build
 * if the placeholder count rises. The number of digits on the page was the one
 * surface still asserting otherwise.
 *
 * ## What this deliberately does not decide
 *
 * Whether the page should *say* a pin is approximate, and in what words, is an
 * editorial question that belongs to Rauf — `/about` says 8 entries admit an
 * approximate pin in their own prose while `audit_coordinates.py` records 22
 * placeholders, and the two count different things. Not padding decides none of
 * that. It only stops the archive claiming precision it never recorded, which
 * needs no ruling because there was never a source for the extra zeros.
 *
 * Per axis, not per pair: `Gurdwara Chakki Sahib` holds `32.0422, 74.26`, where
 * the latitude has four real decimals and the longitude two.
 */

/** One metre, near enough, at these latitudes. Above this the extra digits are
 *  noise from the float, not from the survey. */
export const MAX_COORD_DECIMALS = 5;

/**
 * The decimals the source actually recorded, capped at `max`.
 *
 * `String(value)` gives the shortest representation that round-trips, so it
 * recovers the digits the sheet held: `String(74.26)` is `'74.26'`, not
 * `'74.2600000000001'`. Exponential form (`1e-7`) has no digits to count and
 * cannot come from a coordinate in this dataset, so it falls back to the cap
 * rather than silently reporting zero decimals.
 */
export function coordinateDecimals(value: number, max = MAX_COORD_DECIMALS): number {
  const text = String(value);
  if (text.includes('e') || text.includes('E')) return max;
  const fractional = text.split('.')[1];
  return Math.min(fractional?.length ?? 0, max);
}

/** `value` at its own precision — never padded, capped at `max`. */
export function formatCoordinate(value: number, max = MAX_COORD_DECIMALS): string {
  return value.toFixed(coordinateDecimals(value, max));
}

/** A displayed `lat, lng` pair, each axis at its own recorded precision. */
export function formatLatLng(lat: number, lng: number, max = MAX_COORD_DECIMALS): string {
  return `${formatCoordinate(lat, max)}, ${formatCoordinate(lng, max)}`;
}
