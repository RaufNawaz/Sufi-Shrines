import type { UI_TEXT } from '../i18n/uiStrings';

export type YearPrecisionKey = 'exact' | 'circa' | 'century' | 'range' | 'unknown';

/** Normalize the sheet's `year_built_precision` value (exact | circa |
 * century | range | unknown). Free-form qualifiers (e.g. "uncertain /
 * referent disputed") return null and are rendered verbatim in <bdi>,
 * like the source notes. */
export function yearPrecisionKey(value: string): YearPrecisionKey | null {
  const v = (value || '').trim().toLowerCase();
  if (v === 'exact') return 'exact';
  if (v === 'circa') return 'circa';
  if (v === 'century') return 'century';
  if (v === 'range') return 'range';
  if (v === 'unknown') return 'unknown';
  return null;
}

export const YEAR_PRECISION_LABEL_KEYS: Record<YearPrecisionKey, keyof (typeof UI_TEXT)['en']> = {
  exact: 'precisionExact',
  circa: 'precisionCirca',
  century: 'precisionCentury',
  range: 'precisionRange',
  unknown: 'precisionUnknown',
};
