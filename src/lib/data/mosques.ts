import Papa from 'papaparse';
import type { Shrine } from '../../types/shrine';
import { haversineKm } from './shrineModel';

/**
 * The Auqaf mosques connection (decided 22 Aug 2026, EDITORIAL_DECISIONS §6):
 * the companion Awqaf repo (raufnawaz/Awqaf) surveys Auqaf-administered
 * mosques — coordinates, a "Women's prayer section" answer, and a "Shrine
 * Name" join key — and its site already links mosque records to shrine pages
 * here. This module reads the same published CSV that site reads and builds
 * the reverse connection: a shrine page listing its nearby Auqaf mosques and
 * what the survey records about women's prayer access.
 *
 * Everything shown is the survey's own answer, attributed as such (RULE 2):
 * distance is computed; "Yes"/"No"/free text is rendered as recorded; a
 * mosque is called the shrine's own only when the survey's Shrine Name says
 * so — proximity alone never asserts association.
 */

/** The Awqaf site's own published CSV (js/config.js in raufnawaz/Awqaf). */
export const AWQAF_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTzVlDrUr-dFWeLl2lzJhuMZ9h98xNWyZ9yt3o2eIgt-YEObRl1FQJ4IDKWpV0hiQo9ISs8qggVIh1E/pub?output=csv';

export const AWQAF_SITE_BASE = 'https://raufnawaz.github.io/Awqaf';

export interface AuqafMosque {
  /** Their site's row id — `${mosqueId || 'row'}-${rawRowIndex}`, replicated
   * exactly so mosque.html?id= deep links resolve on the same live CSV. */
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** The survey's "Women's prayer section" answer, as recorded
   * ('Yes' | 'No' | free text | ''). */
  womensPrayerSection: string;
  /** The survey's "Shrine Name" join key, '' when absent. */
  shrineName: string;
}

/** Column aliases mirrored from the Awqaf repo's js/config.js. */
const COLS = {
  city: ['City', 'city', 'Town', 'Tehsil'],
  mosqueId: ['Mosque ID'],
  mosqueName: ['Mosque Name'],
  mosqueNameOnGround: ['Mosque Name on Ground'],
  shrineName: ['Shrine Name'],
  womensPrayerSection: ['Women’s prayer section', "Women's prayer section"],
  latitude: ['Latitude'],
  longitude: ['Longitude'],
};

type RawRow = Record<string, string | undefined>;

function pick(row: RawRow, aliases: string[]): string {
  for (const key of aliases) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function parseCoordinate(value: string): number {
  return Number.parseFloat(value.trim());
}

export function parseMosques(rawRows: RawRow[]): AuqafMosque[] {
  const mosques: AuqafMosque[] = [];
  rawRows.forEach((raw, index) => {
    // Header/value trimming mirrors their normalizeRawRow.
    const row: RawRow = {};
    for (const [key, value] of Object.entries(raw)) {
      const k = key.trim();
      if (k) row[k] = typeof value === 'string' ? value.trim() : '';
    }

    const lat = parseCoordinate(pick(row, COLS.latitude));
    const lng = parseCoordinate(pick(row, COLS.longitude));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      return; // same validity rule as their normalizeRow — the index still advances

    const mosqueId = pick(row, COLS.mosqueId);
    const name =
      pick(row, COLS.mosqueName) || pick(row, COLS.mosqueNameOnGround) || pick(row, COLS.shrineName);
    if (!name) return;

    mosques.push({
      id: `${mosqueId || 'row'}-${index}`,
      name,
      city: pick(row, COLS.city),
      lat,
      lng,
      womensPrayerSection: pick(row, COLS.womensPrayerSection),
      shrineName: pick(row, COLS.shrineName),
    });
  });
  return mosques;
}

export function mosquePageUrl(m: AuqafMosque): string {
  return `${AWQAF_SITE_BASE}/mosque.html?id=${encodeURIComponent(m.id)}`;
}

/** Case/punctuation-insensitive key, mirroring their shrine-links matching. */
function matchKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True only when the survey's own Shrine Name column names this shrine —
 * the one association the data actually asserts. */
export function isShrinesOwnMosque(mosque: AuqafMosque, shrine: Shrine): boolean {
  if (!mosque.shrineName) return false;
  const recorded = matchKey(mosque.shrineName);
  const name = matchKey(shrine.name);
  if (!recorded || !name) return false;
  return recorded === name || recorded.includes(name) || name.includes(recorded);
}

export interface NearbyMosque {
  mosque: AuqafMosque;
  distanceKm: number;
  isShrinesMosque: boolean;
}

export function nearbyMosques(
  shrine: Shrine,
  mosques: AuqafMosque[],
  { maxKm = 3, limit = 4 }: { maxKm?: number; limit?: number } = {},
): NearbyMosque[] {
  const from = shrine.latLng;
  if (!from) return []; // unmapped shrine: distance is undefined
  return mosques
    .map((mosque) => ({
      mosque,
      distanceKm: haversineKm(from, { lat: mosque.lat, lng: mosque.lng }),
      isShrinesMosque: isShrinesOwnMosque(mosque, shrine),
    }))
    .filter((entry) => entry.isShrinesMosque || entry.distanceKm <= maxKm)
    .sort(
      (a, b) =>
        Number(b.isShrinesMosque) - Number(a.isShrinesMosque) || a.distanceKm - b.distanceKm,
    )
    .slice(0, limit);
}

// Module-level cache: the CSV is fetched at most once per page load, lazily,
// only from shrine pages — never on the map's critical path.
let mosquesPromise: Promise<AuqafMosque[]> | null = null;

export function fetchMosques(): Promise<AuqafMosque[]> {
  if (!mosquesPromise) {
    mosquesPromise = new Promise<AuqafMosque[]>((resolve) => {
      Papa.parse<RawRow>(AWQAF_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(parseMosques(results.data)),
        // Quiet absence, not an error banner: the block simply doesn't render.
        error: () => resolve([]),
      });
    });
  }
  return mosquesPromise;
}

/** Test hook: clears the module cache. */
export function resetMosquesCache(): void {
  mosquesPromise = null;
}
