import type { UI_TEXT } from '../i18n/uiStrings';

export type SupportLevelKey = 'field-verified' | 'source-documented' | 'source-seeded' | 'web-compiled';

/** Normalize the sheet's `support_level` value (Field-verified |
 * Source-documented | Source-seeded | Web-compiled). Blank or unrecognized
 * values return null — callers render nothing rather than "undefined". This
 * describes how the underlying information was gathered, distinct from
 * `info_level` (how complete our writeup is) — see infoLevel.ts. */
export function supportLevelKey(value: string): SupportLevelKey | null {
  const v = (value || '').trim().toLowerCase();
  if (v === 'field-verified') return 'field-verified';
  if (v === 'source-documented') return 'source-documented';
  if (v === 'source-seeded') return 'source-seeded';
  if (v === 'web-compiled') return 'web-compiled';
  return null;
}

export const SUPPORT_LEVEL_LABEL_KEYS: Record<SupportLevelKey, keyof (typeof UI_TEXT)['en']> = {
  'field-verified': 'supportLevelFieldVerified',
  'source-documented': 'supportLevelSourceDocumented',
  'source-seeded': 'supportLevelSourceSeeded',
  'web-compiled': 'supportLevelWebCompiled',
};
