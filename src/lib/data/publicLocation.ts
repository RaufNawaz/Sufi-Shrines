import type { Lang, Shrine } from '../../types/shrine';
import { placesForShrine } from './places';
import { localizeRecordedName } from '../i18n/localizeRecordedName';

/** Longer than this and a recorded Location is a paragraph, not a place name. */
export const LOCATION_MAX_CHARS = 60;

/**
 * The Location a public reader is shown for a site.
 *
 * The sheet's `Location` column is the survey's own words, and for many rows
 * that is a paragraph of qualification rather than an address — 397 characters
 * on one row, saying which street the survey did *not* record. That wording is
 * data (RULE 2) and stays on the shrine page and in the team view. Everywhere a
 * site is one row in a list — the map preview, an order's sites, a saint's
 * resting places, a place page — the public reads a place name instead.
 *
 * The rule the map preview adopted on 11 September 2026, moved here on
 * 13 September so the entity pages stop printing the raw cell under every row:
 * a recorded value short enough to be a place name is shown as recorded;
 * otherwise the closed place vocabulary the entry already resolves to (the same
 * `placesForShrine` behind `/place/:slug`), then the recorded region, then
 * nothing. Nothing is invented — the place is derived from that same column,
 * and the absence of a place name in a summary row is not a claim.
 *
 * `rawLocation` is passed in rather than read here because the Urdu view
 * localizes the column first (`localizeField(shrine.raw, 'Location')`), and
 * this module should not depend on the language context. `omitPlaceSlugs` are
 * places the page already names — the place page's own subject, the tags above
 * a saint's resting-place row — because a derived name that repeats them is
 * noise; when every resolved place is one the page already shows, the row says
 * nothing rather than falling through to the region.
 */
export function publicLocation(
  rawLocation: string,
  shrine: Shrine,
  lang: Lang,
  omitPlaceSlugs: readonly string[] = [],
): string {
  const raw = rawLocation.trim();
  if (raw.length <= LOCATION_MAX_CHARS) return raw;
  const places = placesForShrine(shrine);
  if (places.length > 0) {
    return places
      .filter((p) => !omitPlaceSlugs.includes(p.slug))
      .map((p) => localizeRecordedName(p.name, lang))
      .join(' · ');
  }
  return shrine.region ? localizeRecordedName(shrine.region, lang) : '';
}
