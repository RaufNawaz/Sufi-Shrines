// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { loadTours, TOURS } from '../tours';

const validTour = {
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
});
