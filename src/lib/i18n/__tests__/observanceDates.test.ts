/**
 * Which of an observance's two dates leads, and what travels with each.
 *
 * The archive prints every observance twice — what it recorded ("18–20 Safar")
 * and what it computed from that ("22–24 July 2027") — with an `approximate`
 * flag on the computed one, because a Hijri month begins on moon sighting and a
 * projection is a forecast rather than a date. `calendarPreference` lets the
 * reader choose which is printed first, and the whole risk of that feature is
 * that **two labels have to follow the value they describe rather than the
 * position they sit in**: the approximate flag belongs to the projection, and
 * the "(Hijri)" note belongs to the recorded date. Both were wrong in the first
 * draft, and the second one shipped a Gregorian date labelled "(Hijri)".
 */
import { describe, it, expect } from 'vitest';
import { observanceDateDisplay } from '../observanceDates';
import type { Observance } from '../../data/ursDates';
import type { DateWindow } from '../../data/hijriCalendar';

const fmtNum = (n: number | string) => String(n);

/** "18–20 Safar", Hijri — the shape most of the archive's ʿurs records take. */
const hijriObservance: Observance = {
  sourceText: '18-20 Safar',
  calendar: 'hijri',
  month: 2,
  monthEnd: null,
  dayStart: 18,
  dayEnd: 20,
  season: null,
  precision: 'day',
  ruleBased: false,
};

/** "7 February", Gregorian — a fixed civil date that recurs exactly. */
const gregorianObservance: Observance = {
  ...hijriObservance,
  sourceText: '7 February',
  calendar: 'gregorian',
  month: 2,
  dayStart: 7,
  dayEnd: null,
};

const window: DateWindow = {
  start: new Date(Date.UTC(2027, 6, 22)),
  end: new Date(Date.UTC(2027, 6, 24)),
};

describe('observanceDateDisplay', () => {
  describe('with the Gregorian calendar leading (the default)', () => {
    const d = observanceDateDisplay(hijriObservance, window, true, 'en', fmtNum, 'gregorian');

    it('leads with the projection and flags it as one', () => {
      expect(d.lead).toContain('July');
      expect(d.leadIsProjection).toBe(true);
      expect(d.secondaryIsProjection).toBe(false);
    });

    it('names the second value as what the archive recorded', () => {
      expect(d.secondaryLabelKey).toBe('almanacSourceLabel');
      expect(d.secondary).toContain('Safar');
    });

    it('puts the "(Hijri)" note on the recorded date, which is second here', () => {
      expect(d.calendarNoteOn).toBe('secondary');
    });
  });

  describe('with the Hijri calendar leading', () => {
    const d = observanceDateDisplay(hijriObservance, window, true, 'en', fmtNum, 'hijri');

    it('leads with the recorded date and does not flag it approximate', () => {
      /* The recorded date is the one the archive stands behind. Flagging it as a
         forecast would be the opposite of the truth. */
      expect(d.lead).toContain('Safar');
      expect(d.leadIsProjection).toBe(false);
    });

    it('moves the projection second, keeping its flag', () => {
      expect(d.secondary).toContain('July');
      expect(d.secondaryLabelKey).toBe('almanacProjectedLabel');
      expect(d.secondaryIsProjection).toBe(true);
    });

    it('moves the "(Hijri)" note to the lead with the recorded date', () => {
      /* The bug this pins: the note stayed in second position and rendered
         "Projected: 22–24 July 2027 (Hijri)" — a Gregorian date labelled Hijri,
         which is worse than no label at all. */
      expect(d.calendarNoteOn).toBe('lead');
    });
  });

  describe('a Gregorian-recorded observance under Hijri-first', () => {
    const d = observanceDateDisplay(gregorianObservance, window, false, 'en', fmtNum, 'hijri');

    it('is left exactly as it was, because no Hijri date was recorded for it', () => {
      /* RULE 2. Converting a fixed civil date into a Hijri one is the same
         moon-sighting approximation running the other way, and the archive holds
         no such record — so the preference reads "which calendar leads *where
         the archive recorded one*". */
      expect(d.lead).toContain('July');
      expect(d.secondaryLabelKey).toBe('almanacSourceLabel');
      expect(d.secondary).toContain('February');
    });

    it('claims no projection and shows no calendar note', () => {
      expect(d.hasProjection).toBe(false);
      expect(d.leadIsProjection).toBe(false);
      expect(d.secondaryIsProjection).toBe(false);
      expect(d.calendarNoteOn).toBe('none');
    });
  });

  it('never leads with an empty string', () => {
    /* A month-only Hijri record can format to an empty recorded string, and
       leading with it would replace a date with a blank line. */
    const monthOnly: Observance = {
      ...hijriObservance,
      month: null,
      dayStart: null,
      dayEnd: null,
      precision: 'month',
    };
    for (const calendar of ['gregorian', 'hijri'] as const) {
      const d = observanceDateDisplay(monthOnly, window, true, 'en', fmtNum, calendar);
      expect(d.lead.trim(), `calendar=${calendar}`).not.toBe('');
    }
  });

  it('shows both dates in every combination — the preference reorders, never hides', () => {
    for (const observance of [hijriObservance, gregorianObservance]) {
      for (const calendar of ['gregorian', 'hijri'] as const) {
        const d = observanceDateDisplay(observance, window, true, 'en', fmtNum, calendar);
        expect(d.lead.trim().length, `${observance.calendar}/${calendar}`).toBeGreaterThan(0);
        expect(d.secondary.trim().length, `${observance.calendar}/${calendar}`).toBeGreaterThan(0);
      }
    }
  });

  it('marks exactly one value as the projection, never both', () => {
    for (const calendar of ['gregorian', 'hijri'] as const) {
      const d = observanceDateDisplay(hijriObservance, window, true, 'en', fmtNum, calendar);
      expect([d.leadIsProjection, d.secondaryIsProjection].filter(Boolean)).toHaveLength(1);
    }
  });
});
