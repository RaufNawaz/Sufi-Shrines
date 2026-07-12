// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Tour } from '../tours';
import {
  loadTours,
  TOURS,
  REGION_LABELS,
  THEME_LABELS,
  ERA_LABELS,
  TRADITION_LABELS,
  localizeTourTitle,
  localizeTourDescription,
  localizeStopNarrative,
} from '../tours';

const validTour: Tour = {
  id: 'test-tour',
  title: 'Test Tour',
  titleUr: 'ٹیسٹ ٹور',
  description: 'A test tour.',
  descriptionUr: 'ایک ٹیسٹ ٹور۔',
  tradition: 'sufi',
  region: 'Test Region',
  theme: 'Test Theme',
  era: 'Test Era',
  stops: [
    { shrineSlug: 'a', narrative: 'A', narrativeUr: 'اے' },
    { shrineSlug: 'b', narrative: 'B', narrativeUr: 'بی' },
  ],
};

describe('loadTours', () => {
  it('keeps well-formed tours', () => {
    expect(loadTours([validTour])).toEqual([validTour]);
  });

  it('returns an empty array for non-array input', () => {
    expect(loadTours(null)).toEqual([]);
    expect(loadTours(undefined)).toEqual([]);
    expect(loadTours({})).toEqual([]);
  });

  it('drops a tour with an unknown tradition', () => {
    const bad = { ...validTour, tradition: 'buddhist' };
    expect(loadTours([bad, validTour])).toEqual([validTour]);
  });

  it('drops a tour with fewer than two stops', () => {
    const bad = { ...validTour, stops: [validTour.stops[0]] };
    expect(loadTours([bad])).toEqual([]);
  });

  it('drops a tour with a malformed stop', () => {
    const bad = { ...validTour, stops: [{ shrineSlug: 'a' }, validTour.stops[1]] };
    expect(loadTours([bad])).toEqual([]);
  });

  it('drops a tour missing a required bilingual field', () => {
    const { titleUr, ...rest } = validTour;
    void titleUr;
    expect(loadTours([rest])).toEqual([]);
  });
});

describe('TOURS (real data)', () => {
  it('loads at least the three curated tours with no data dropped', () => {
    expect(TOURS.length).toBeGreaterThanOrEqual(3);
  });

  it('every tour has a unique id', () => {
    const ids = TOURS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every tradition/region/theme/era value in the real data has a label', () => {
    for (const tour of TOURS) {
      expect(TRADITION_LABELS[tour.tradition], `tradition "${tour.tradition}"`).toBeDefined();
      expect(REGION_LABELS[tour.region], `region "${tour.region}"`).toBeDefined();
      expect(THEME_LABELS[tour.theme], `theme "${tour.theme}"`).toBeDefined();
      expect(ERA_LABELS[tour.era], `era "${tour.era}"`).toBeDefined();
    }
  });
});

describe('enum label maps', () => {
  it('every label has non-empty Urdu text with no Latin leakage', () => {
    for (const map of [REGION_LABELS, THEME_LABELS, ERA_LABELS, TRADITION_LABELS]) {
      for (const [key, label] of Object.entries(map)) {
        expect(label.ur, `ur label for "${key}"`).toBeTruthy();
        expect(label.ur, `ur label for "${key}"`).not.toMatch(/[A-Za-z]/);
      }
    }
  });
});

describe('localizeTourTitle / localizeTourDescription / localizeStopNarrative', () => {
  const tour = validTour;

  it('picks the English field for lang=en', () => {
    expect(localizeTourTitle(tour, 'en')).toBe(tour.title);
    expect(localizeTourDescription(tour, 'en')).toBe(tour.description);
    expect(localizeStopNarrative(tour.stops[0], 'en')).toBe(tour.stops[0].narrative);
  });

  it('picks the Urdu field for lang=ur', () => {
    expect(localizeTourTitle(tour, 'ur')).toBe(tour.titleUr);
    expect(localizeTourDescription(tour, 'ur')).toBe(tour.descriptionUr);
    expect(localizeStopNarrative(tour.stops[0], 'ur')).toBe(tour.stops[0].narrativeUr);
  });
});
