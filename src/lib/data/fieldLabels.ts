import type { Lang } from '../../types/shrine';
import type { UI_TEXT } from '../i18n/uiStrings';
import { t } from '../i18n/uiStrings';

/** Sheet column name → uiStrings key for its display label. A column
 * missing here falls back to the raw name (English on both sides — there's
 * nothing to translate without knowing what the column means). Shared by
 * ShrineInfobox and SourcesProvenance so a column's label reads the same
 * wherever it's shown. */
const FIELD_LABEL_KEYS: Record<string, keyof (typeof UI_TEXT)['en']> = {
  Name: 'nameLabel',
  Category: 'categoryLabel',
  Type: 'categoryLabel',
  Location: 'locationLabel',
  District: 'districtLabel',
  Province: 'provinceLabel',
  Region: 'filterByRegion',
  City: 'cityLabel',
  Founded: 'founded',
  'Founded/Opened': 'founded',
  'Sufi Saint': 'saintLabel',
  Saint: 'saintLabel',
  Events: 'eventsLabel',
  'Events & Urs': 'eventsLabel',
  Description: 'descriptionSection',
  'Description Urdu': 'descriptionUrduLabel',
  Latitude: 'latitudeLabel',
  Longitude: 'longitudeLabel',
};

export function localizeFieldName(field: string, lang: Lang): string {
  const imageMatch = field.match(/^Image\s*(\d+)$/i);
  if (imageMatch) return `${t(lang, 'imageLabel')} ${imageMatch[1]}`;

  const key = FIELD_LABEL_KEYS[field];
  return key ? t(lang, key) : field;
}
