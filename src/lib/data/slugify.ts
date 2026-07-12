const SLUG_REPLACEMENTS: Record<string, string> = {
  '&': 'and',
  '@': 'at',
  '%': 'percent',
  '+': 'plus',
};

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[&@%+]/g, (c) => ` ${SLUG_REPLACEMENTS[c] || c} `)
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Stable slug from name alone. Does NOT include a row-index suffix so it
 * survives sheet reorders. Collision resolution (appending location) is done
 * upstream in buildShrines where the full row set is available.
 */
export function buildStableSlug(name: string): string {
  return slugify(name);
}
