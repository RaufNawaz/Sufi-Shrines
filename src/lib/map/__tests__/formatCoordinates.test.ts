import { describe, it, expect } from 'vitest';
import snapshot from '../../../data/shrines-fallback.json';
import { coordinateDecimals, formatCoordinate, formatLatLng } from '../formatCoordinates';

/**
 * A coordinate is displayed at the precision the archive recorded, never more.
 *
 * `LocationMap` used `toFixed(5)` and the Ziyarat print pack `toFixed(4)`, so
 * `28.3, 69.39` — one decimal place, about 11 km — reached the reader as
 * `28.30000, 69.39000`, which implies about a metre, under a "Copy coordinates"
 * button and a link to Google Maps. Measured against this same snapshot on
 * 30 August 2026: **12 rows carry two decimal places or fewer on at least one
 * axis, and two carry one.**
 *
 * The dataset assertion below is the one that matters. The unit cases fix the
 * behaviour; the dataset case is what notices when a *new* low-precision row
 * arrives, which is the way this defect got in and the way it would return.
 */

const rows = snapshot.rows as Record<string, unknown>[];

/** Decimals in the source string, which is the claim being checked. */
function sourceDecimals(raw: string): number {
  return raw.split('.')[1]?.length ?? 0;
}

describe('formatCoordinate — never pads a coordinate it was not given', () => {
  it('keeps a two-decimal value at two decimals', () => {
    expect(formatCoordinate(74.26)).toBe('74.26');
    expect(formatCoordinate(69.39)).toBe('69.39');
  });

  it('keeps a one-decimal value at one decimal — the 11 km case', () => {
    expect(formatCoordinate(28.3)).toBe('28.3');
    expect(formatCoordinate(73.5)).toBe('73.5');
  });

  it('still caps a value more precise than the archive can justify', () => {
    /* Rahman Baba Mausoleum holds 33.99333333. Rounding that to a metre is
       harmless and is why the cap stays — the defect was the other direction. */
    expect(formatCoordinate(33.99333333)).toBe('33.99333');
    expect(coordinateDecimals(33.99333333)).toBe(5);
  });

  it('formats each axis independently', () => {
    /* Gurdwara Chakki Sahib: four real decimals of latitude, two of longitude.
       A pair-wide precision would pad one of them. */
    expect(formatLatLng(32.0422, 74.26)).toBe('32.0422, 74.26');
  });

  it('honours a lower cap for the print pack', () => {
    expect(formatLatLng(33.99333333, 74.26, 4)).toBe('33.9933, 74.26');
  });

  it('handles a whole number and exponential form without inventing decimals', () => {
    expect(formatCoordinate(28)).toBe('28');
    /* No coordinate here is exponential, but returning 0 decimals for one
       would be a silent truncation rather than a padding — so it takes the cap. */
    expect(coordinateDecimals(1e-7)).toBe(5);
  });
});

describe('every shipped coordinate is displayed at its own precision', () => {
  const mapped = rows.filter(
    (r) => String(r.Latitude ?? '').trim() && String(r.Longitude ?? '').trim(),
  );

  it('the snapshot still contains low-precision rows — otherwise this is vacuous', () => {
    /* The premise. If every row were five decimals, the assertion below would
       pass over a padding bug, so it says so instead. */
    const low = mapped.filter(
      (r) =>
        Math.min(
          sourceDecimals(String(r.Latitude).trim()),
          sourceDecimals(String(r.Longitude).trim()),
        ) <= 2,
    );
    expect(low.length, 'no low-precision coordinates left to protect').toBeGreaterThanOrEqual(10);
  });

  it('adds no digit to any of them', () => {
    const padded: string[] = [];
    for (const row of mapped) {
      for (const axis of ['Latitude', 'Longitude'] as const) {
        const raw = String(row[axis]).trim();
        const shown = formatCoordinate(Number(raw));
        if (sourceDecimals(shown) > sourceDecimals(raw)) {
          padded.push(`${String(row.Name)} ${axis}: ${raw} displayed as ${shown}`);
        }
      }
    }
    expect(padded, `${padded.length} coordinates gained digits: ${padded[0] ?? ''}`).toEqual([]);
  });
});
