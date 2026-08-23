import type { LatLng, Shrine, ShrineRow } from '../../types/shrine';
import { buildArticleSections, parsedArticleFromRow } from './articleParsing';
import { getFieldValue } from './fieldAliasing';
import { getPrimaryImageCredit, getPrimaryImageUrl, parseGallery } from './galleryParsing';
import { buildStableSlug, slugify } from './slugify';

export function parseLatLng(row: ShrineRow): LatLng | null {
  const lat = parseFloat(row?.Latitude || '');
  const lng = parseFloat(row?.Longitude || '');
  if (!isFinite(lat) || !isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Pakistan's first-level administrative units, plus the country itself as a
 * last resort. A closed vocabulary rather than "whatever the last comma-
 * separated segment happens to be" — see `extractRegion` for why.
 *
 * Both spellings of Balochistan appear in the data; they normalise to one value
 * so the filter does not offer the same province twice.
 */
const ADMIN_UNITS: { match: RegExp; value: string }[] = [
  { match: /^Azad\s+(?:Jammu\s+and\s+)?Kashmir\b/i, value: 'Azad Kashmir' },
  { match: /^Gilgit[-\s]Baltistan\b/i, value: 'Gilgit-Baltistan' },
  { match: /^Islamabad(?:\s+Capital\s+Territory)?\b/i, value: 'Islamabad Capital Territory' },
  { match: /^Khyber\s+Pakhtunkhwa\b/i, value: 'Khyber Pakhtunkhwa' },
  { match: /^Bal[ou]chistan\b/i, value: 'Balochistan' },
  { match: /^Punjab\b/i, value: 'Punjab' },
  { match: /^Sindh\b/i, value: 'Sindh' },
];

const COUNTRY = { match: /^Pakistan\b/i, value: 'Pakistan' };

/**
 * The province (or territory) a shrine sits in, read out of its Location.
 *
 * This used to be "the last comma-separated segment", which broke in two ways
 * at once — both visible on the live site until 20 August 2026.
 *
 * First, **six rows carry a paragraph in the Location column** rather than an
 * address. That is deliberate, honest content (a field survey that can only say
 * "Lahore" and says so, at length, is exactly what CLAUDE.md RULE 2 asks for) —
 * but its commas are sentence commas, so the "last segment" was the tail of a
 * sentence. The map's region filter offered chips reading "and no
 * coordinates.", "not the grave's exact position." and "not the shrine's exact
 * position) — ask Saifullah for a precise pin when possible." An internal note
 * to a colleague was a filter option.
 *
 * Second, for the 124 rows that *are* addresses the last segment is
 * "Pakistan" — so a filter meant to narrow by region had one option matching
 * 73% of the archive.
 *
 * So: scan segments from the end for a known administrative unit, preferring a
 * province over the country. Measured across the 169-row snapshot, that turns
 * `{Pakistan: 124, Punjab: 30, Sindh: 6, …}` plus six sentence fragments into
 * `{Punjab: 87, Sindh: 43, Khyber Pakhtunkhwa: 15, Balochistan: 10, Islamabad
 * Capital Territory: 4, Pakistan: 5}` with five rows honestly unknown. It also
 * recovers one province out of prose: a Location reading "…, Punjab. The field
 * survey places the shrine…" yields Punjab, because the unit is matched at the
 * head of a segment rather than as the whole of one.
 *
 * A row whose Location names no unit returns '' — unknown, not guessed.
 */
function extractRegion(location: string): string {
  if (!location) return '';
  const parts = location
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // A single-segment Location is a bare place name, not an address; there is no
  // region in it to read.
  if (parts.length < 2) return '';

  for (const part of [...parts].reverse()) {
    for (const unit of ADMIN_UNITS) {
      if (unit.match.test(part)) return unit.value;
    }
  }
  for (const part of [...parts].reverse()) {
    if (COUNTRY.match.test(part)) return COUNTRY.value;
  }
  return '';
}

export function buildShrine(row: ShrineRow, id: number): Shrine | null {
  const latLng = parseLatLng(row);
  // A named row without coordinates is KEPT, unmapped (22 Aug ruling): it
  // gets a page and list/search presence, honestly marked. A row with
  // neither name nor coordinates is parser noise and is dropped.
  if (!latLng && !getFieldValue(row, 'Name')) return null;
  if (!latLng && import.meta.env.DEV) {
    console.warn(`[shrines] "${row.Name}" has no coordinates — kept, unmapped`);
  }

  const name = getFieldValue(row, 'Name') || `Shrine ${id}`;
  // Slug is resolved after the full-set collision pass in buildShrines;
  // store a placeholder here and replace it below.
  const explicitSlug = getFieldValue(row, 'Slug');
  const slug = explicitSlug || buildStableSlug(name);

  const location = getFieldValue(row, 'Location');
  return {
    id,
    slug,
    name,
    latLng,
    // New `category` column (six values) drives when present; the legacy
    // `Category` column keeps working until it is retired in a later change.
    category: getFieldValue(row, 'category') || getFieldValue(row, 'Category'),
    infoLevel: getFieldValue(row, 'info_level'),
    supportLevel: getFieldValue(row, 'support_level'),
    status: getFieldValue(row, 'status'),
    statusNote: getFieldValue(row, 'status_note'),
    siteType: getFieldValue(row, 'site_type'),
    siteTypeNote: getFieldValue(row, 'site_type_note'),
    figureType: getFieldValue(row, 'figure_type'),
    silsila: getFieldValue(row, 'silsila'),
    silsilaNote: getFieldValue(row, 'silsila_note'),
    location,
    region: extractRegion(location),
    founded: getFieldValue(row, 'Founded/Opened') || getFieldValue(row, 'Founded'),
    yearBuilt: getFieldValue(row, 'year_built'),
    yearBuiltPrecision: getFieldValue(row, 'year_built_precision'),
    yearBuiltNote: getFieldValue(row, 'year_built_note'),
    figureBorn: getFieldValue(row, 'figure_born'),
    figureDied: getFieldValue(row, 'figure_died'),
    eventYear: getFieldValue(row, 'event_year'),
    eventNote: getFieldValue(row, 'event_note'),
    sufiSaint: getFieldValue(row, 'Sufi Saint'),
    imageUrl: getPrimaryImageUrl(row),
    imageCredit: getPrimaryImageCredit(row),
    gallery: parseGallery(row),
    parsedArticle: parsedArticleFromRow(row),
    articleSections: buildArticleSections(row, 'en'),
    raw: row,
  };
}

export function buildShrines(rows: ShrineRow[]): Shrine[] {
  const shrines = rows
    .map((row, i) => buildShrine(row, i))
    .filter((s): s is Shrine => s !== null);

  // Resolve slug collisions: disambiguate with location, then saint, then index.
  // Shrines that already have an explicit Slug column value are never changed.
  const seen = new Map<string, number>(); // slug → count of uses so far
  for (const shrine of shrines) {
    const hasExplicit = Boolean(getFieldValue(shrine.raw, 'Slug'));
    if (hasExplicit) {
      seen.set(shrine.slug, (seen.get(shrine.slug) ?? 0) + 1);
      continue;
    }

    const base = buildStableSlug(shrine.name);
    const withLoc = base && shrine.location ? `${base}-${slugify(shrine.location)}` : base;
    const withSaint = withLoc && shrine.sufiSaint ? `${withLoc}-${slugify(shrine.sufiSaint)}` : withLoc;

    // Pick the shortest candidate that is not yet taken
    let chosen = base || `shrine-${shrine.id}`;
    for (const candidate of [base, withLoc, withSaint]) {
      if (candidate && !seen.has(candidate)) {
        chosen = candidate;
        break;
      }
    }

    // Last resort: append numeric suffix (stable within a given data snapshot)
    if (seen.has(chosen)) {
      let n = 2;
      while (seen.has(`${chosen}-${n}`)) n++;
      chosen = `${chosen}-${n}`;
    }

    shrine.slug = chosen;
    seen.set(chosen, (seen.get(chosen) ?? 0) + 1);
  }

  return shrines;
}

export function haversineKm(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findRelatedShrines(shrine: Shrine, all: Shrine[], limit = 5): Shrine[] {
  const from = shrine.latLng;
  return all
    .filter((s) => s.id !== shrine.id)
    .map((s) => ({
      shrine: s,
      score:
        (s.category && s.category === shrine.category ? 3 : 0) +
        (s.location && s.location === shrine.location ? 2 : 0) -
        // Unmapped rows (22 Aug ruling) contribute no distance signal —
        // similarity alone ranks them.
        (from && s.latLng ? haversineKm(from, s.latLng) / 500 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.shrine);
}

/** Purely geographic nearest-shrines, unlike findRelatedShrines() above
 * (which weights category/location similarity ahead of distance) — for a
 * pilgrim asking "what else is nearby", not "what else is like this".
 * Unmapped rows have no geography: they neither anchor nor appear here. */
export function findNearbyShrines(shrine: Shrine, all: Shrine[], limit = 5): Shrine[] {
  const from = shrine.latLng;
  if (!from) return [];
  return all
    .filter((s) => s.id !== shrine.id && s.latLng)
    .map((s) => ({ shrine: s, distanceKm: haversineKm(from, s.latLng!) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
    .map((r) => r.shrine);
}
