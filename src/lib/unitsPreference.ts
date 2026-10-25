/**
 * Kilometres or miles.
 *
 * Metric by default, because the archive's subject is in Pakistan and every
 * distance in its data and its documents is metric — `SHARED_GROUND_VISION` is
 * built on "within 800 m of another site". The option exists because the
 * readership is not only in Pakistan, and a reader who does not think in
 * kilometres was being asked to convert six numbers a page.
 *
 * Read while rendering, so it lives in `ReaderPreferencesContext` alongside the
 * calendar preference rather than as a document attribute.
 */
import { UNITS_STORAGE_KEY } from './storageKeys';
import { readStorage, writeStorage } from './safeStorage';

export type DistanceUnits = 'km' | 'mi';

export const DEFAULT_UNITS: DistanceUnits = 'km';

export function readUnits(): DistanceUnits {
  return readStorage(UNITS_STORAGE_KEY) === 'mi' ? 'mi' : DEFAULT_UNITS;
}

export function writeUnits(units: DistanceUnits): void {
  writeStorage(UNITS_STORAGE_KEY, units);
}
