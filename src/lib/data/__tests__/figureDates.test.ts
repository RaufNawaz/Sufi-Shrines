// @vitest-environment node
/**
 * The dates a figure page must refuse to answer.
 *
 * `parseEra` reads every 3–4 digit number in a string as a Gregorian year,
 * which is correct for the `founded` column and wrong for a person's dates:
 * five of the graph's 77 dated figures carry a Hijri year. Two carry only
 * Hijri, and the failure is not subtle in size while being invisible on the
 * page — Shah Gohar Peer, who died around 1422 CE, would be filed in the 9th
 * century, and Hazrat Tahir Bandagi's "8 Muharram 1040 AH / 8 August 1630 CE"
 * would give one man a six-century lifespan. A century label is exactly the
 * kind of derived value nobody double-checks.
 *
 * So the cases below are the real strings out of `data/kg.json`, and the
 * assertions include the ones where the honest answer is `null`. A span
 * computed over the figures it could place and presented as the whole order's
 * span is the same fabrication one step downstream, which is why
 * `centurySpan` reports `undated` and every caller has to render it.
 */
import { describe, it, expect } from 'vitest';
import {
  gregorianYear,
  centuryOf,
  figureCentury,
  centurySpan,
} from '../figureDates';
import { getKGStore } from '../../kg';

describe('gregorianYear', () => {
  it('has no answer for nothing', () => {
    expect(gregorianYear(undefined)).toBeNull();
    expect(gregorianYear(null)).toBeNull();
    expect(gregorianYear('   ')).toBeNull();
    expect(gregorianYear('year not stated in the survey')).toBeNull();
  });

  it('reads a lone unmarked year as CE', () => {
    expect(gregorianYear('1630')).toBe(1630);
    expect(gregorianYear('c. 1165')).toBe(1165);
    expect(gregorianYear('c. 1728')).toBe(1728);
  });

  it('takes the CE year when the source gives both calendars', () => {
    // The whole point: the source did the conversion, so the answer is its own.
    expect(gregorianYear('8 Muharram 1040 AH / 8 August 1630 CE')).toBe(1630);
    expect(gregorianYear('1341 AH (c. 1922–23 CE by calendar conversion)')).toBe(1922);
  });

  it('refuses a Hijri-only date rather than converting it', () => {
    expect(gregorianYear('11 Rabīʿ al-Sānī 729 AH')).toBeNull();
    expect(gregorianYear('21 Ramzan 825 AH')).toBeNull();
    expect(gregorianYear('16 Rabi ul Awal 1024 AH (as related in the survey)')).toBeNull();
    expect(gregorianYear('10 Zil Hajj 960 AH, Kirman, Iran (as related in the survey)')).toBeNull();
    expect(gregorianYear('۱۲۳۴ ہجری')).toBeNull();
  });

  it('refuses two unmarked years rather than picking one', () => {
    expect(gregorianYear('between 1450 and 1470')).toBeNull();
  });

  it('ignores numbers that are not years', () => {
    expect(gregorianYear('aged 92')).toBeNull();
    expect(gregorianYear('9999')).toBeNull();
  });
});

describe('centuryOf', () => {
  it('puts a year in the century that contains it', () => {
    expect(centuryOf(1630)).toBe(17);
    expect(centuryOf(1700)).toBe(17);
    expect(centuryOf(1701)).toBe(18);
    expect(centuryOf(1000)).toBe(10);
  });
});

describe('figureCentury', () => {
  it('prefers the death year — a shrine commemorates a death', () => {
    expect(figureCentury({ born: '1576 CE, Lahore', died: '1630 CE' })).toBe(17);
  });

  it('falls back to birth when death is unrecorded or unconvertible', () => {
    expect(figureCentury({ born: '1576 CE, Lahore', died: null })).toBe(16);
    expect(figureCentury({ born: 'c. 1922 CE', died: '25 Rabīʿ al-Thānī; year not stated' })).toBe(
      20,
    );
  });

  it('has no answer when neither date can be placed', () => {
    expect(figureCentury({ born: '11 Rabīʿ al-Sānī 729 AH', died: '21 Ramzan 825 AH' })).toBeNull();
    expect(figureCentury({ born: null, died: null })).toBeNull();
  });
});

describe('centurySpan', () => {
  it('is null when it can place nobody', () => {
    expect(centurySpan([])).toBeNull();
    expect(centurySpan([{ born: null, died: '825 AH' }])).toBeNull();
  });

  it('reports the span and the figures it could not place', () => {
    expect(
      centurySpan([
        { born: null, died: '1630 CE' },
        { born: null, died: 'c. 1073' },
        { born: null, died: '825 AH' },
      ]),
    ).toEqual({ from: 11, to: 17, dated: 2, undated: 1 });
  });

  it('never reports a span without also reporting what it left out', () => {
    /* The invariant, not a case: `dated + undated` must equal the input, or the
       span describes a subset while looking like it describes the whole. */
    const rows = [
      { born: null, died: '1630 CE' },
      { born: '1200', died: null },
      { born: null, died: '729 AH' },
      { born: null, died: null },
    ];
    const span = centurySpan(rows)!;
    expect(span.dated + span.undated).toBe(rows.length);
  });
});

describe('against the shipped graph', () => {
  const saints = getKGStore().saints;

  it('places nobody by converting a Hijri-only date', () => {
    const hijriOnly = saints.filter((s) => {
      const text = `${s.born ?? ''} ${s.died ?? ''}`;
      return /\bAH\b/.test(text) && !/\bCE\b/.test(text);
    });
    expect(hijriOnly.length, 'the graph no longer has a Hijri-only figure to guard').toBeGreaterThan(
      0,
    );
    for (const s of hijriOnly) {
      expect(figureCentury(s), `${s.slug} was given a century by calendar arithmetic`).toBeNull();
    }
  });

  it('places every figure it does place inside the archive’s own era bounds', () => {
    /* A mis-read Hijri year lands in the 8th–11th century, which is inside
       ERA_MIN..ERA_MAX and so would pass a range check — this asserts the
       weaker, honest thing, and the test above is what catches the real error. */
    for (const s of saints) {
      const century = figureCentury(s);
      if (century === null) continue;
      expect(century, `${s.slug}: ${s.born} / ${s.died}`).toBeGreaterThanOrEqual(1);
      expect(century).toBeLessThanOrEqual(21);
    }
  });

  it('still has figures it cannot place, so the undated count is not decoration', () => {
    const span = centurySpan(saints)!;
    expect(span.undated).toBeGreaterThan(0);
    expect(span.dated).toBeGreaterThan(0);
  });
});
