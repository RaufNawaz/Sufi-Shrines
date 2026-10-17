import type { UI_TEXT } from '../../lib/i18n/uiStrings';
import type { SourceType } from '../../lib/data/sourceType';
import { CATEGORY_ORDER, categoryKey } from '../../lib/data/categoryKey';
import type { Shrine } from '../../types/shrine';

/**
 * The non-component half of the library's shared parts — label maps and the
 * tradition tally — kept out of `SourceParts.tsx` so that file exports
 * components only and keeps fast refresh.
 */

type UiKey = keyof (typeof UI_TEXT)['en'];

export const SOURCE_TYPE_LABEL_KEYS: Record<SourceType, UiKey> = {
  book: 'sourceTypeBook',
  article: 'sourceTypeArticle',
  press: 'sourceTypePress',
  record: 'sourceTypeRecord',
  web: 'sourceTypeWeb',
  tradition: 'sourceTypeTradition',
  field: 'sourceTypeField',
  general: 'sourceTypeGeneral',
};

export const LANGUAGE_LABEL_KEYS: Record<string, UiKey> = {
  urdu: 'sourceLangUrdu',
  persian: 'sourceLangPersian',
  english: 'sourceLangEnglish',
  sindhi: 'sourceLangSindhi',
  punjabi: 'sourceLangPunjabi',
};

type Tradition = (typeof CATEGORY_ORDER)[number];

export function traditionMix(entries: readonly Shrine[]): { key: Tradition; count: number }[] {
  const counts = new Map<Tradition, number>();
  for (const s of entries) {
    const key = categoryKey(s.category);
    if (key === 'default') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return CATEGORY_ORDER.filter((k) => counts.has(k)).map((key) => ({
    key,
    count: counts.get(key)!,
  }));
}

/** The tradition a set of entries mostly belongs to — a spine's colour. */
export function dominantTradition(entries: readonly Shrine[]): Tradition | null {
  const mix = traditionMix(entries);
  if (mix.length === 0) return null;
  return mix.reduce((a, b) => (b.count > a.count ? b : a)).key;
}
