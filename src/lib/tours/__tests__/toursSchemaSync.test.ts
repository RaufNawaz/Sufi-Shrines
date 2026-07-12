// @vitest-environment node
/**
 * Drift guard: the authoring-time Zod schema (scripts/data/toursSchema.mjs,
 * used by validate-tours.mjs) and the app's defensive runtime check
 * (loadTours in src/lib/tours/tours.ts) must accept and reject exactly the
 * same tours. If this test fails, one side's constraints changed without the
 * other — update both, they are two implementations of one contract.
 */
import { describe, it, expect } from 'vitest';
import type { Tour } from '../tours';
import { TRADITION_LABELS, loadTours } from '../tours';
import { TOUR_TRADITIONS, validateTour } from '../../../../scripts/data/toursSchema.mjs';

const VALID_TOUR: Tour = {
  id: 'test-tour',
  title: 'Test Tour',
  titleUr: 'آزمائشی سیر',
  description: 'A two-stop test tour.',
  descriptionUr: 'دو مقامات کی آزمائشی سیر۔',
  tradition: 'sufi',
  region: 'Punjab',
  theme: 'Pilgrimage route',
  era: '13th–15th century',
  stops: [
    { shrineSlug: 'first-shrine', narrative: 'First stop.', narrativeUr: 'پہلا مقام۔' },
    { shrineSlug: 'second-shrine', narrative: 'Second stop.', narrativeUr: 'دوسرا مقام۔' },
  ],
};

/** Both validators' verdicts on the same candidate tour. */
function verdicts(candidate: unknown): { schema: boolean; app: boolean } {
  return {
    schema: validateTour(candidate).success,
    app: loadTours([candidate]).length === 1,
  };
}

function expectBothReject(candidate: unknown, label: string): void {
  const v = verdicts(candidate);
  expect(v.schema, `Zod schema should reject: ${label}`).toBe(false);
  expect(v.app, `loadTours should reject: ${label}`).toBe(false);
}

describe('tradition vocabulary stays in sync', () => {
  it('TRADITION_LABELS keys deep-equal TOUR_TRADITIONS', () => {
    expect(Object.keys(TRADITION_LABELS)).toEqual(TOUR_TRADITIONS);
  });
});

describe('toursSchema.mjs and loadTours give identical verdicts', () => {
  it('both accept a fully valid tour', () => {
    expect(verdicts(VALID_TOUR)).toEqual({ schema: true, app: true });
  });

  const REQUIRED_TOUR_FIELDS = [
    'id',
    'title',
    'titleUr',
    'description',
    'descriptionUr',
    'tradition',
    'region',
    'theme',
    'era',
    'stops',
  ] as const;

  it.each(REQUIRED_TOUR_FIELDS)('both reject a tour missing %s', (field) => {
    const mutant: Record<string, unknown> = { ...VALID_TOUR };
    delete mutant[field];
    expectBothReject(mutant, `missing ${field}`);
  });

  const EMPTYABLE_STRING_FIELDS = REQUIRED_TOUR_FIELDS.filter(
    (f) => f !== 'tradition' && f !== 'stops',
  );

  it.each(EMPTYABLE_STRING_FIELDS)('both reject a tour with empty %s', (field) => {
    expectBothReject({ ...VALID_TOUR, [field]: '' }, `empty ${field}`);
  });

  it('both reject an unknown tradition', () => {
    expectBothReject({ ...VALID_TOUR, tradition: 'buddhist' }, 'unknown tradition');
  });

  it('both reject a 1-stop tour', () => {
    expectBothReject({ ...VALID_TOUR, stops: [VALID_TOUR.stops[0]] }, '1-stop tour');
  });

  it('both reject a 0-stop tour', () => {
    expectBothReject({ ...VALID_TOUR, stops: [] }, '0-stop tour');
  });

  const REQUIRED_STOP_FIELDS = ['shrineSlug', 'narrative', 'narrativeUr'] as const;

  it.each(REQUIRED_STOP_FIELDS)('both reject a stop missing %s', (field) => {
    const badStop: Record<string, unknown> = { ...VALID_TOUR.stops[1] };
    delete badStop[field];
    expectBothReject(
      { ...VALID_TOUR, stops: [VALID_TOUR.stops[0], badStop] },
      `stop missing ${field}`,
    );
  });

  it.each(REQUIRED_STOP_FIELDS)('both reject a stop with empty %s', (field) => {
    const badStop = { ...VALID_TOUR.stops[1], [field]: '' };
    expectBothReject(
      { ...VALID_TOUR, stops: [VALID_TOUR.stops[0], badStop] },
      `stop with empty ${field}`,
    );
  });
});
