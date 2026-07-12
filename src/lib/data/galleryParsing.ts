import type { GalleryItem, ShrineRow } from '../../types/shrine';
import { getFieldValue, normalizeUrl } from './fieldAliasing';

function getNumberedImageIndex(key: string): number | null {
  const normalized = String(key || '').trim();
  const galleryMatch = normalized.match(
    /^Gallery\s*(\d+)\s*(Image|Photo|Link|Url|Caption|Title)$/i,
  );
  if (galleryMatch) return parseInt(galleryMatch[1], 10);

  const imageMatch = normalized.match(/^(Image|Photo)\s*(\d+)(?:\s*(Caption|Title))?$/i);
  if (imageMatch) return parseInt(imageMatch[2], 10);

  const captionMatch = normalized.match(/^Caption\s*(\d+)$/i);
  if (captionMatch) return parseInt(captionMatch[1], 10);

  return null;
}

function getImageCandidates(index: number): string[] {
  return [
    `Image ${index}`,
    `Photo ${index}`,
    `Gallery ${index} Image`,
    `Gallery ${index} Photo`,
    `Gallery ${index} Link`,
    `Gallery ${index} Url`,
  ];
}

function getCaptionCandidates(index: number): string[] {
  return [
    `Gallery ${index} Caption`,
    `Gallery ${index} Title`,
    `Image ${index} Caption`,
    `Caption ${index}`,
  ];
}

function getCreditCandidates(index: number): string[] {
  return [
    `Image ${index} Credit`,
    `Gallery ${index} Credit`,
    `Photo ${index} Credit`,
    `Credit ${index}`,
  ];
}

export function parseGallery(row: ShrineRow): GalleryItem[] {
  const indexes = Array.from(
    new Set(
      Object.keys(row)
        .map(getNumberedImageIndex)
        .filter((v): v is number => v !== null && v > 0),
    ),
  ).sort((a, b) => a - b);

  const items: GalleryItem[] = [];
  for (const index of indexes) {
    const imageUrl = normalizeUrl(
      getImageCandidates(index)
        .map((key) => getFieldValue(row, key))
        .find(Boolean),
    );
    if (!imageUrl) continue;

    const caption = getCaptionCandidates(index)
      .map((key) => getFieldValue(row, key))
      .find(Boolean) || '';

    const credit = getCreditCandidates(index)
      .map((key) => getFieldValue(row, key))
      .find(Boolean) || '';

    items.push({ imageUrl, caption, credit, index });
  }

  return items;
}

export function getPrimaryImageUrl(row: ShrineRow): string | null {
  const direct = normalizeUrl(
    getFieldValue(row, 'Image Link') ||
      getFieldValue(row, 'Image') ||
      getFieldValue(row, 'image') ||
      getFieldValue(row, 'image_url') ||
      getFieldValue(row, 'photo') ||
      getFieldValue(row, 'photo_url'),
  );
  if (direct) return direct;

  const gallery = parseGallery(row);
  return gallery[0]?.imageUrl ?? null;
}

/** Photo credit for the primary/hero image — mirrors getPrimaryImageUrl's
 * fallback to the first gallery item, since the hero image is usually
 * "Image 1" under the hood. */
export function getPrimaryImageCredit(row: ShrineRow): string {
  const gallery = parseGallery(row);
  return gallery[0]?.credit ?? '';
}
