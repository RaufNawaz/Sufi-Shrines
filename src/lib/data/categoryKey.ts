import type { Lang } from '../../types/shrine';

export type CategoryKey =
  | 'muslim'
  | 'hindu'
  | 'sikh'
  | 'nanakpanthi'
  | 'jain'
  | 'secular'
  | 'default';

/** Normalize a free-text category to the design-token key used for colors.
 * Nanakpanthi/Udasi is checked before hindu/sikh — its display label
 * ("Nanakpanthi (Hindu–Sikh)") contains both words and must not be claimed
 * by either tradition. */
export function categoryKey(category: string): CategoryKey {
  const c = (category || '').toLowerCase();
  if (c.includes('nanakpanthi') || c.includes('udasi')) return 'nanakpanthi';
  if (c.includes('jain')) return 'jain';
  if (c.includes('secular') || c.includes('memorial')) return 'secular';
  if (c.includes('muslim')) return 'muslim';
  if (c.includes('hindu')) return 'hindu';
  if (c.includes('sikh')) return 'sikh';
  return 'default';
}

/** Canonical chip/legend order for the six sheet categories. */
export const CATEGORY_ORDER: Exclude<CategoryKey, 'default'>[] = [
  'muslim',
  'hindu',
  'sikh',
  'nanakpanthi',
  'jain',
  'secular',
];

/** Display labels for the sheet's `category` values (model: TRADITION_LABELS
 * in lib/tours/tours.ts). The Nanakpanthi label is deliberately
 * "Nanakpanthi (Hindu–Sikh)": these darbars install the Guru Granth Sahib
 * alongside Hindu images, and the label must not imply they are one or the
 * other. */
export const CATEGORY_LABELS: Record<Exclude<CategoryKey, 'default'>, { en: string; ur: string }> =
  {
    muslim: { en: 'Muslim Shrine', ur: 'مسلم مزار' },
    hindu: { en: 'Hindu Temple', ur: 'ہندو مندر' },
    sikh: { en: 'Sikh Gurdwara', ur: 'سکھ گردوارہ' },
    nanakpanthi: { en: 'Nanakpanthi (Hindu–Sikh)', ur: 'نانک پنتھی (ہندو–سکھ)' },
    jain: { en: 'Jain Temple', ur: 'جین مندر' },
    secular: { en: 'Secular / Memorial', ur: 'سیکولر / یادگار' },
  };

/** Bilingual label for a raw category value, or null when the value doesn't
 * map to one of the six known categories (caller falls back to the raw
 * sheet value / localizeField). */
export function categoryDisplayLabel(category: string, lang: Lang): string | null {
  const key = categoryKey(category);
  if (key === 'default') return null;
  return CATEGORY_LABELS[key][lang];
}
