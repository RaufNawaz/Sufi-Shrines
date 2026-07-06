import toursData from '../../data/tours.json';

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

function isValidStop(value: unknown): value is TourStop {
  const s = value as Partial<TourStop> | null;
  return (
    typeof s?.shrineSlug === 'string' && s.shrineSlug.length > 0 &&
    typeof s?.narrative === 'string' && s.narrative.length > 0 &&
    typeof s?.narrativeUr === 'string' && s.narrativeUr.length > 0
  );
}

function isValidTour(value: unknown): value is Tour {
  const t = value as Partial<Tour> | null;
  return (
    typeof t?.id === 'string' && t.id.length > 0 &&
    typeof t?.title === 'string' && t.title.length > 0 &&
    typeof t?.titleUr === 'string' && t.titleUr.length > 0 &&
    typeof t?.description === 'string' && t.description.length > 0 &&
    typeof t?.descriptionUr === 'string' && t.descriptionUr.length > 0 &&
    typeof t?.tradition === 'string' && TRADITIONS.includes(t.tradition as TourTradition) &&
    typeof t?.region === 'string' && t.region.length > 0 &&
    typeof t?.theme === 'string' && t.theme.length > 0 &&
    typeof t?.era === 'string' && t.era.length > 0 &&
    Array.isArray(t?.stops) && t.stops.length >= 2 && t.stops.every(isValidStop)
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
