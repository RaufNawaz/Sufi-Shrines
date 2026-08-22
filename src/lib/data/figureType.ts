import type { Lang } from '../../types/shrine';

/**
 * `figure_type` — what kind of figure a site honors. The infobox used to
 * label every principal figure "Saint" / "ولی", which is wrong for a Hindu
 * deity, a Sikh Guru, or a sant — ولی names a Muslim saint specifically.
 * Where the sheet records a figure type, the row label says what the figure
 * actually is; the two survey-prose values fall back to the generic label
 * rather than being paraphrased (RULE 2).
 *
 * Enum label map in the TRADITION_LABELS / CATEGORY_LABELS pattern: sheet
 * values are join keys, these labels are cosmetic.
 */

export type FigureTypeKey =
  | 'sufi-saint'
  | 'deity'
  | 'sikh-guru'
  | 'sant'
  | 'historical-person'
  | 'individual'
  | 'collective';

/** Exact (case-insensitive, trimmed) vocabulary — prose values fall through
 * to null, same contract as siteTypeKey. */
const FIGURE_TYPE_VOCABULARY: Record<string, FigureTypeKey> = {
  'sufi saint': 'sufi-saint',
  deity: 'deity',
  'sikh guru': 'sikh-guru',
  sant: 'sant',
  'historical person': 'historical-person',
  individual: 'individual',
  collective: 'collective',
};

export function figureTypeKey(value: string): FigureTypeKey | null {
  return FIGURE_TYPE_VOCABULARY[(value || '').trim().toLowerCase()] ?? null;
}

export const FIGURE_TYPE_LABELS: Record<FigureTypeKey, { en: string; ur: string }> = {
  'sufi-saint': { en: 'Sufi saint', ur: 'صوفی بزرگ' },
  deity: { en: 'Deity', ur: 'دیوتا' },
  'sikh-guru': { en: 'Sikh Guru', ur: 'سکھ گرو' },
  sant: { en: 'Sant', ur: 'سنت' },
  'historical-person': { en: 'Historical person', ur: 'تاریخی شخصیت' },
  individual: { en: 'Individual', ur: 'شخصیت' },
  collective: { en: 'Figures', ur: 'شخصیات' },
};

/** Row label for the principal-figure infobox row: the figure's actual kind
 * when the sheet records one, or null (caller falls back to the generic
 * saint label). */
export function figureTypeDisplayLabel(value: string, lang: Lang): string | null {
  const key = figureTypeKey(value);
  return key ? FIGURE_TYPE_LABELS[key][lang] : null;
}
