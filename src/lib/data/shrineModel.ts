import type { LatLng, Shrine, ShrineRow } from '../../types/shrine';
import { buildArticleSections, parsedArticleFromRow } from './articleParsing';
import { getFieldValue } from './fieldAliasing';
import { getPrimaryImageUrl, parseGallery } from './galleryParsing';
import { buildSlug } from './slugify';

export function parseLatLng(row: ShrineRow): LatLng | null {
  const lat = parseFloat(row?.Latitude || '');
  const lng = parseFloat(row?.Longitude || '');
  if (!isFinite(lat) || !isFinite(lng)) return null;
  return { lat, lng };
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
  const explicitSlug = getFieldValue(row, 'Slug');
  const slug = explicitSlug ? explicitSlug : buildSlug(name, id);

  return {
    id,
    slug,
    name,
    latLng,
    category: getFieldValue(row, 'Category'),
    location: getFieldValue(row, 'Location'),
    founded: getFieldValue(row, 'Founded'),
    sufiSaint: getFieldValue(row, 'Sufi Saint'),
    imageUrl: getPrimaryImageUrl(row),
    gallery: parseGallery(row),
    parsedArticle: parsedArticleFromRow(row),
    articleSections: buildArticleSections(row, 'en'),
    raw: row,
  };
}

export function buildShrines(rows: ShrineRow[]): Shrine[] {
  return rows
    .map((row, i) => buildShrine(row, i))
    .filter((s): s is Shrine => s !== null);
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
