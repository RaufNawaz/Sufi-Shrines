import toursData from '../../data/tours.json';
import type { Lang } from '../../types/shrine';

export type TourTradition = 'sufi' | 'sikh' | 'hindu-jain';

export interface TourStop {
  shrineSlug: string;
  narrative: string;
  narrativeUr: string;
}

export interface Tour {
  id: string;
  title: string;
  titleUr: string;
  description: string;
  descriptionUr: string;
  tradition: TourTradition;
  region: string;
  theme: string;
  era: string;
  stops: TourStop[];
}

const TRADITIONS: TourTradition[] = ['sufi', 'sikh', 'hindu-jain'];

export const TRADITION_LABELS: Record<TourTradition, { en: string; ur: string }> = {
  sufi: { en: 'Sufi', ur: 'صوفی' },
  sikh: { en: 'Sikh', ur: 'سکھ' },
  'hindu-jain': { en: 'Hindu & Jain', ur: 'ہندو اور جین' },
};

/** English value → { en, ur } label. Sourced from urdu-i18n/urdu-dictionary.json
 * (tourRegions/tourThemes/tourEras sections) — keep these two in sync. */
export const REGION_LABELS: Record<string, { en: string; ur: string }> = {
  'Sindh & Punjab': { en: 'Sindh & Punjab', ur: 'سندھ اور پنجاب' },
  Punjab: { en: 'Punjab', ur: 'پنجاب' },
  'Punjab, Sindh & Balochistan': {
    en: 'Punjab, Sindh & Balochistan',
    ur: 'پنجاب، سندھ اور بلوچستان',
  },
  Sindh: { en: 'Sindh', ur: 'سندھ' },
  'Khyber Pakhtunkhwa': { en: 'Khyber Pakhtunkhwa', ur: 'خیبر پختونخوا' },
};

export const THEME_LABELS: Record<string, { en: string; ur: string }> = {
  'Pilgrimage route': { en: 'Pilgrimage route', ur: 'زیارت کا راستہ' },
  'Founding history': { en: 'Founding history', ur: 'تاریخِ بنیاد' },
  'Ancient architecture': { en: 'Ancient architecture', ur: 'قدیم فنِ تعمیر' },
  'Sacred city': { en: 'Sacred city', ur: 'مقدس شہر' },
  "Guru's childhood": { en: "Guru's childhood", ur: 'گرو کا بچپن' },
  'Frontier Sufism': { en: 'Frontier Sufism', ur: 'سرحدی تصوف' },
  'Urban pilgrimage': { en: 'Urban pilgrimage', ur: 'شہری زیارت' },
};

export const ERA_LABELS: Record<string, { en: string; ur: string }> = {
  '8th–20th century': { en: '8th–20th century', ur: '8ویں–20ویں صدی' },
  '15th–20th century': { en: '15th–20th century', ur: '15ویں–20ویں صدی' },
  '7th–15th century': { en: '7th–15th century', ur: '7ویں–15ویں صدی' },
  '12th–19th century': { en: '12th–19th century', ur: '12ویں–19ویں صدی' },
  '13th–15th century': { en: '13th–15th century', ur: '13ویں–15ویں صدی' },
  '16th–20th century': { en: '16th–20th century', ur: '16ویں–20ویں صدی' },
  '18th–20th century': { en: '18th–20th century', ur: '18ویں–20ویں صدی' },
};

function isValidStop(value: unknown): value is TourStop {
  const s = value as Partial<TourStop> | null;
  return (
    typeof s?.shrineSlug === 'string' &&
    s.shrineSlug.length > 0 &&
    typeof s?.narrative === 'string' &&
    s.narrative.length > 0 &&
    typeof s?.narrativeUr === 'string' &&
    s.narrativeUr.length > 0
  );
}

function isValidTour(value: unknown): value is Tour {
  const t = value as Partial<Tour> | null;
  return (
    typeof t?.id === 'string' &&
    t.id.length > 0 &&
    typeof t?.title === 'string' &&
    t.title.length > 0 &&
    typeof t?.titleUr === 'string' &&
    t.titleUr.length > 0 &&
    typeof t?.description === 'string' &&
    t.description.length > 0 &&
    typeof t?.descriptionUr === 'string' &&
    t.descriptionUr.length > 0 &&
    typeof t?.tradition === 'string' &&
    TRADITIONS.includes(t.tradition as TourTradition) &&
    typeof t?.region === 'string' &&
    t.region.length > 0 &&
    typeof t?.theme === 'string' &&
    t.theme.length > 0 &&
    typeof t?.era === 'string' &&
    t.era.length > 0 &&
    Array.isArray(t?.stops) &&
    t.stops.length >= 2 &&
    t.stops.every(isValidStop)
  );
}

/**
 * Defensive runtime check: a malformed tour (bad data, failed migration)
 * should never crash the map — drop it and keep the rest working. Authoring
 * mistakes are caught earlier by `npm run data:validate` (see
 * scripts/data/validate-tours.mjs), which reports them with detail; this is
 * the last line of defense in the shipped bundle.
 */
export function loadTours(raw: unknown): Tour[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidTour);
}

export const TOURS: Tour[] = loadTours(toursData);

/** Language-appropriate tour title/description/stop-narrative — the single
 * place that picks between a tour's English and hand-authored Urdu fields,
 * so components don't repeat `lang === 'ur' ? x.titleUr : x.title` inline. */
export function localizeTourTitle(tour: Tour, lang: Lang): string {
  return lang === 'ur' ? tour.titleUr : tour.title;
}

export function localizeTourDescription(tour: Tour, lang: Lang): string {
  return lang === 'ur' ? tour.descriptionUr : tour.description;
}

export function localizeStopNarrative(stop: TourStop, lang: Lang): string {
  return lang === 'ur' ? stop.narrativeUr : stop.narrative;
}
