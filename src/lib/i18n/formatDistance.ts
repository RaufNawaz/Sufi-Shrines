/**
 * A distance, in the reader's units, as a whole phrase.
 *
 * ## Two problems, one fix
 *
 * **The units.** Every distance in this archive was kilometres with no way to
 * read it otherwise, and the whole shared-ground phase is built on "within
 * 800 m of another site" — distance is a unit of argument here, not a
 * decoration.
 *
 * **The assembly.** Six call sites printed `{fmtNum(round(km))} {t('distanceKm')}`
 * — a number, a space, and the fragment "km away" — which is precisely the
 * construction `noSentenceFragments.test.ts` exists to prevent: the *component*
 * decides the word order, so Urdu gets English syntax. Urdu happens to put the
 * unit in the same place, which is why it survived; a language that does not
 * would have had no way to say so.
 *
 * So each language writes the whole phrase and this function chooses which
 * phrase to ask for. `distanceKm`/`kmUnit` are gone; four keys replace them,
 * one per unit and position.
 *
 * ## Rounding is per call site, deliberately
 *
 * The precisions the archive already used are kept rather than unified: nearby
 * shrines round to whole units, nearby mosques keep one decimal because several
 * stand inside the same complex, and the tour legs round to whole units because
 * a driving estimate with a decimal claims a precision the average-speed model
 * does not have.
 *
 * ## Under a unit: what to do about 400 metres
 *
 * The archive had three answers already, and `below` keeps all of them —
 * `'metres'` for the shared-ground surfaces, whose whole argument is "within
 * 800 m"; `'decimal'` where a tenth is meaningful; `'lessThanOne'` where "0"
 * would be a lie about a site that is not zero away.
 *
 * `'metres'` has no miles equivalent and does not get invented one. Feet and
 * yards are a third and fourth unit for the sake of one row, so a miles reader
 * sees `'decimal'` — "0.2 miles away" — which is the same information in the
 * unit they asked for.
 */
import { tFn } from './uiStrings';
import type { Lang } from '../../types/shrine';
import type { DistanceUnits } from '../unitsPreference';

/** Exact, not 1.6: the conversion is a definition and rounding it is a slow
 *  drift on a long tour. */
const MILES_PER_KM = 0.621371;

export interface FormatDistanceOptions {
  /** `away` reads "3 km away"; `bare` reads "3 km", for a leg of a route. */
  style: 'away' | 'bare';
  /** One decimal where sites share a complex; whole units elsewhere. */
  decimals?: 0 | 1;
  /** How to render a distance under one unit. Default: round it like any
   *  other, which is what the tour legs want. */
  below?: 'metres' | 'decimal' | 'lessThanOne';
}

export function formatDistance(
  km: number,
  units: DistanceUnits,
  lang: Lang,
  fmtNum: (n: number | string) => string,
  { style, decimals = 0, below }: FormatDistanceOptions,
): string {
  const value = units === 'mi' ? km * MILES_PER_KM : km;

  if (value < 1 && below) {
    if (below === 'metres' && units === 'km') {
      return tFn(lang, 'distanceAwayMetres', fmtNum(Math.round(km * 1000)));
    }
    if (below === 'lessThanOne') {
      return unitPhrase(style, units, lang, fmtNum('< 1'));
    }
    // 'decimal', and the miles fallback for 'metres'.
    return unitPhrase(style, units, lang, fmtNum(String(Math.round(value * 10) / 10)));
  }

  const rounded = decimals === 1 ? Math.round(value * 10) / 10 : Math.round(value);
  return unitPhrase(style, units, lang, fmtNum(String(rounded)));
}

function unitPhrase(
  style: 'away' | 'bare',
  units: DistanceUnits,
  lang: Lang,
  value: string,
): string {
  if (style === 'bare') {
    return units === 'mi' ? tFn(lang, 'distanceBareMi', value) : tFn(lang, 'distanceBareKm', value);
  }
  return units === 'mi' ? tFn(lang, 'distanceAwayMi', value) : tFn(lang, 'distanceAwayKm', value);
}
