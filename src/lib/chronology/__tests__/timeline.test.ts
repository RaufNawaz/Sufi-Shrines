import { describe, it, expect } from 'vitest';
import {
  placeShrine,
  plainYear,
  centurySpan,
  buildChronology,
  CIRCA_BAND_YEARS,
} from '../timeline';
import { buildShrines } from '../../data/shrineModel';
import snapshot from '../../../data/shrines-fallback.json';
import type { ShrineRow } from '../../../types/shrine';

/**
 * Measured against the shipped snapshot, so every count here is a claim that can
 * go stale — which is the point. The one that must never go stale quietly is the
 * last describe block: an undated row must never acquire a year.
 */
const shrines = buildShrines((snapshot as { rows: ShrineRow[] }).rows);

describe('plainYear — a CE integer or nothing', () => {
  it('accepts a bare year', () => {
    expect(plainYear('950')).toBe(950);
    expect(plainYear(' 1772 ')).toBe(1772);
  });

  it('refuses the cells that carry prose, a calendar, or a disclaimer', () => {
    /* These are real values from the snapshot. Digging the digits out of any of
       them would be inventing a construction date the archive does not hold. */
    expect(plainYear('1024 AH (as given in the form; not a construction date)')).toBeNull();
    expect(plainYear('1041 (as given: "8 August 1041")')).toBeNull();
    expect(plainYear('681 CE / c. 63 AH (popular tradition) — see note')).toBeNull();
    expect(plainYear('')).toBeNull();
  });
});

describe('centurySpan', () => {
  it('returns the century containing the year', () => {
    expect(centurySpan(950)).toEqual({ from: 900, to: 999 });
    expect(centurySpan(1072)).toEqual({ from: 1000, to: 1099 });
    expect(centurySpan(1900)).toEqual({ from: 1900, to: 1999 });
  });
});

describe('placeShrine — width carries the uncertainty', () => {
  const shrine = (yearBuilt: string, yearBuiltPrecision: string) =>
    ({ yearBuilt, yearBuiltPrecision, category: 'Muslim Shrine' }) as never;

  it('draws an exact year as a point', () => {
    expect(placeShrine(shrine('1772', 'exact'))).toMatchObject({
      kind: 'dated',
      from: 1772,
      to: 1772,
    });
  });

  it('draws circa as a band around the year', () => {
    expect(placeShrine(shrine('1898', 'circa'))).toMatchObject({
      kind: 'dated',
      from: 1898 - CIRCA_BAND_YEARS,
      to: 1898 + CIRCA_BAND_YEARS,
    });
  });

  it('draws a century as the whole century, not as its midpoint', () => {
    expect(placeShrine(shrine('950', 'century'))).toMatchObject({
      kind: 'dated',
      from: 900,
      to: 999,
    });
  });

  it('draws range at the circa width, because the extent is not recorded', () => {
    /* Both `range` rows in the snapshot record a single year. Widening them to
       a guessed span would be the laundering this module exists to prevent. */
    const placed = placeShrine(shrine('1300', 'range'));
    expect(placed).toMatchObject({ kind: 'dated', from: 1275, to: 1325, precision: 'range' });
  });

  it('leaves unknown, prose and non-CE cells undated', () => {
    expect(placeShrine(shrine('1850', 'unknown'))).toMatchObject({
      kind: 'undated',
      reason: 'unknown',
    });
    expect(
      placeShrine(shrine('1024 AH (as given in the form; not a construction date)', 'Uncertain —')),
    ).toMatchObject({ kind: 'undated', reason: 'qualified' });
    expect(placeShrine(shrine('', 'exact'))).toMatchObject({ kind: 'undated', reason: 'no-year' });
  });
});

describe('buildChronology over the shipped snapshot', () => {
  const chronology = buildChronology(shrines);

  it('accounts for every row exactly once', () => {
    expect(chronology.dated + chronology.undated.total).toBe(shrines.length);
  });

  it('plots a majority and says so about the rest', () => {
    /* 28 August 2026: 126 rows carry a precision from the controlled set. */
    expect(chronology.dated).toBeGreaterThan(100);
    expect(chronology.undated.total).toBeGreaterThan(0);
    expect(chronology.undated.byReason.unknown).toBeGreaterThan(0);
    expect(chronology.undated.byReason.qualified).toBeGreaterThan(0);
  });

  it('spans the archive without inverting any interval', () => {
    expect(chronology.extent).not.toBeNull();
    expect(chronology.extent!.from).toBeLessThan(chronology.extent!.to);
    for (const band of chronology.bands) {
      for (const entry of band.entries) {
        expect(entry.placement.from, entry.shrine.name).toBeLessThanOrEqual(entry.placement.to);
      }
    }
  });

  it('sorts each band and keeps its extent consistent with its entries', () => {
    for (const band of chronology.bands) {
      if (!band.entries.length) {
        expect(band.extent).toBeNull();
        continue;
      }
      const froms = band.entries.map((e) => e.placement.from);
      expect(froms).toEqual([...froms].sort((a, b) => a - b));
      expect(band.extent!.from).toBe(Math.min(...froms));
    }
  });

  it('never draws a span into the future', () => {
    /* A `circa 2015` row would otherwise reach 2040 and push the axis to 2100 —
       a heritage archive appearing to document the next century. The clip is a
       statement of fact (nothing was built after today), not a guess. */
    const now = 2026;
    const clipped = buildChronology(shrines, now);
    expect(clipped.extent!.to).toBeLessThanOrEqual(now);
    for (const band of clipped.bands) {
      for (const entry of band.entries) {
        expect(entry.placement.to, entry.shrine.name).toBeLessThanOrEqual(now);
      }
    }
  });

  /* The invariant the whole track was deferred over. */
  it('never gives an undated row a year', () => {
    const plotted = new Set(chronology.bands.flatMap((b) => b.entries.map((e) => e.shrine.slug)));
    for (const shrine of chronology.undated.shrines) {
      expect(plotted.has(shrine.slug), `${shrine.name} is both undated and plotted`).toBe(false);
    }
  });
});
