import type { UI_TEXT } from '../i18n/uiStrings';

export type SiteStatusKey = 'active' | 'occasional' | 'heritage' | 'ruin' | 'destroyed';

/** Normalize the sheet's `status` value (Active | Occasional | Heritage |
 * Ruin | Destroyed). Blank or unrecognized values return null. */
export function siteStatusKey(value: string): SiteStatusKey | null {
  const v = (value || '').trim().toLowerCase();
  if (v === 'active') return 'active';
  if (v === 'occasional') return 'occasional';
  if (v === 'heritage') return 'heritage';
  if (v === 'ruin') return 'ruin';
  if (v === 'destroyed') return 'destroyed';
  return null;
}

/** Visitor-facing wording for every non-Active status — someone should not
 * travel to a site expecting active worship when there is none. `active`
 * intentionally has no label key: it renders nothing. */
export const SITE_STATUS_LABEL_KEYS: Record<
  Exclude<SiteStatusKey, 'active'>,
  keyof (typeof UI_TEXT)['en']
> = {
  occasional: 'statusOccasional',
  heritage: 'statusHeritage',
  ruin: 'statusRuin',
  destroyed: 'statusDestroyed',
};
