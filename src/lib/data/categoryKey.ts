export type CategoryKey = 'muslim' | 'hindu' | 'sikh' | 'default';

/** Normalize a free-text category to the design-token key used for colors. */
export function categoryKey(category: string): CategoryKey {
  const c = (category || '').toLowerCase();
  if (c.includes('muslim')) return 'muslim';
  if (c.includes('hindu')) return 'hindu';
  if (c.includes('sikh')) return 'sikh';
  return 'default';
}
