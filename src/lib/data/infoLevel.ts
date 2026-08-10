import type { UI_TEXT } from '../i18n/uiStrings';

export type InfoLevelKey = 'full' | 'moderate' | 'low';

/** Normalize the sheet's `info_level` value (Full | Moderate | Low). Blank or
 * unrecognized values return null — callers render nothing rather than
 * "undefined". The level describes how much documentation WE hold for a
 * site, never the site's importance. */
export function infoLevelKey(value: string): InfoLevelKey | null {
  const v = (value || '').trim().toLowerCase();
  if (v === 'full') return 'full';
  if (v === 'moderate') return 'moderate';
  if (v === 'low') return 'low';
  return null;
}

export const INFO_LEVEL_LABEL_KEYS: Record<InfoLevelKey, keyof (typeof UI_TEXT)['en']> = {
  full: 'infoLevelFull',
  moderate: 'infoLevelModerate',
  low: 'infoLevelLow',
};
