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

function extractRegion(location: string): string {
  if (!location) return '';
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : '';
}

export function buildShrine(row: ShrineRow, id: number): Shrine | null {
  const latLng = parseLatLng(row);
  if (!latLng) {
    if (import.meta.env.DEV) {
      const name = row?.Name || `(row ${id})`;
      console.warn(`[shrines] Skipped "${name}" — missing or non-numeric Latitude/Longitude`);
    }
    return null;
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
  return all
    .filter((s) => s.id !== shrine.id)
    .map((s) => ({
      shrine: s,
      score:
        (s.category && s.category === shrine.category ? 3 : 0) +
        (s.location && s.location === shrine.location ? 2 : 0) -
        haversineKm(shrine.latLng, s.latLng) / 500,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.shrine);
}
