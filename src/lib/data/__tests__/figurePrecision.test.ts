// @vitest-environment node
/**
 * A date the archive knows is approximate never renders as a bare number.
 *
 * `datePrecision` is set on 97 of the graph's figures and, until this existed,
 * was rendered by nothing. The result was the one failure this archive is built
 * not to commit: **23 figures shown bare years the data itself calls imprecise.**
 * Bulleh Shah "1680 / 1757" where the record says `circa`. Data Ganj Bakhsh
 * "1009 / 1072", `range`. Abdullah Shah Ghazi "773", `century`. Abul Faiz
 * Qalander Ali Suharwardi "1885 / 1958" where the record says `disputed` — and
 * whose own `disputedDates` lists two competing birth dates, so the page
 * asserted a settled year over data saying the sources do not agree.
 *
 * Nothing could have caught it. A number is a valid string, the page renders, the
 * dates are the ones the sheet holds. It is only wrong in what it implies, and
 * the field that says so was sitting one property away the whole time.
 *
 * So the assertions run in both directions, because both are ways to be wrong:
 * an imprecise date with no marker is the original bug, and a marker on a date
 * that already hedges ("c. 1165 · circa") is the archive failing to read itself.
 */
import { describe, it, expect } from 'vitest';
import {
  figurePrecisionKey,
  figurePrecisionMarker,
  statesItsOwnHedge,
} from '../figurePrecision';
import { getKGStore } from '../../kg';

const saints = getKGStore().saints;

describe('figurePrecisionKey', () => {
  it('accepts the vocabulary the shipped graph uses', () => {
    for (const v of ['exact-date', 'year', 'circa', 'century', 'range', 'disputed', 'unrecorded']) {
      expect(figurePrecisionKey(v), v).toBe(v);
    }
  });

  it('rejects anything else rather than guessing', () => {
    expect(figurePrecisionKey(undefined)).toBeNull();
    expect(figurePrecisionKey('')).toBeNull();
    expect(figurePrecisionKey('approximately')).toBeNull();
    // Not `unknown` — that is the *shrine* column's word for it, and quietly
    // accepting the wrong vocabulary is how two columns drift into one.
    expect(figurePrecisionKey('unknown')).toBeNull();
  });
});

describe('statesItsOwnHedge', () => {
  it('recognises a date that qualifies itself', () => {
    expect(statesItsOwnHedge('c. 1165')).toBe(true);
    expect(statesItsOwnHedge('between 1450 and 1470')).toBe(true);
    expect(statesItsOwnHedge('11th century')).toBe(true);
    expect(statesItsOwnHedge(null, 'circa 1700')).toBe(true);
    expect(statesItsOwnHedge('تقریباً ۱۱۶۵')).toBe(true);
  });

  it('does not see a hedge in a plain year', () => {
    expect(statesItsOwnHedge('1680')).toBe(false);
    expect(statesItsOwnHedge('1680', '1757')).toBe(false);
    expect(statesItsOwnHedge(undefined, undefined)).toBe(false);
  });
});

describe('figurePrecisionMarker', () => {
  it('marks a bare year the record calls approximate', () => {
    expect(figurePrecisionMarker({ datePrecision: 'circa', born: '1680', died: '1757' }))
      .toEqual({ key: 'circa', labelKey: 'precisionCirca' });
    expect(figurePrecisionMarker({ datePrecision: 'range', born: '1009', died: '1072' })?.key)
      .toBe('range');
    expect(figurePrecisionMarker({ datePrecision: 'century', died: '773' })?.key).toBe('century');
    expect(figurePrecisionMarker({ datePrecision: 'disputed', born: '1885' })?.labelKey)
      .toBe('disputedDatesLabel');
  });

  it('stays quiet where the record claims the date is the date', () => {
    expect(figurePrecisionMarker({ datePrecision: 'exact-date', died: '9 September 1958' }))
      .toBeNull();
    expect(figurePrecisionMarker({ datePrecision: 'year', born: '1617' })).toBeNull();
  });

  it('stays quiet where there is no date to qualify', () => {
    expect(figurePrecisionMarker({ datePrecision: 'unrecorded' })).toBeNull();
    expect(figurePrecisionMarker({ datePrecision: 'circa' })).toBeNull();
  });

  it('does not repeat a hedge the date already carries', () => {
    /* "c. 1165 · circa" makes the archive look like it cannot read its own
       data, which is worse than the silence it replaced. */
    expect(figurePrecisionMarker({ datePrecision: 'circa', born: 'c. 1165' })).toBeNull();
    expect(
      figurePrecisionMarker({ datePrecision: 'century', era: '11th century' }),
    ).toBeNull();
  });
});

describe('against the shipped graph', () => {
  it('still has figures that need marking, or this ships dead code', () => {
    const marked = saints.filter((s) => figurePrecisionMarker(s) !== null);
    expect(marked.length, 'no figure needs a precision marker — has datePrecision gone?').toBeGreaterThan(
      10,
    );
  });

  it('marks every figure whose dates the record calls imprecise and which does not say so', () => {
    /* The original bug, stated as an invariant. Any figure the data hedges about
       and whose own strings do not, must get a marker — so a future import that
       adds such a figure cannot slip a bare approximate year onto a page. */
    const unmarked = saints.filter((s) => {
      const key = figurePrecisionKey(s.datePrecision);
      if (!key || !['circa', 'century', 'range', 'disputed'].includes(key)) return false;
      if (!s.born && !s.died && !s.era) return false;
      if (statesItsOwnHedge(s.born, s.died, s.era)) return false;
      return figurePrecisionMarker(s) === null;
    });
    expect(
      unmarked.map((s) => `${s.slug} (${s.datePrecision}): ${s.born ?? '—'} / ${s.died ?? '—'}`),
      'these render a bare date the archive itself calls imprecise',
    ).toEqual([]);
  });

  it('never marks a figure the record calls exact', () => {
    const wrong = saints
      .filter((s) => ['exact-date', 'year'].includes(s.datePrecision ?? ''))
      .filter((s) => figurePrecisionMarker(s) !== null);
    expect(wrong.map((s) => s.slug), 'a precise date was flagged as approximate').toEqual([]);
  });
});
