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

/** Legacy: generates a name+id slug. Only kept for redirect generation. */
export function buildSlug(name: string, id: number): string {
  const base = slugify(name);
  return base ? `${base}-${id}` : `shrine-${id}`;
}

/**
 * Stable slug from name alone. Does NOT include a row-index suffix so it
 * survives sheet reorders. Collision resolution (appending location) is done
 * upstream in buildShrines where the full row set is available.
 */
export function buildStableSlug(name: string): string {
  return slugify(name);
}
