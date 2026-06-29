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

export function buildSlug(name: string, id: number): string {
  const base = slugify(name);
  return base ? `${base}-${id}` : `shrine-${id}`;
}
