import { describe, it, expect } from 'vitest';
import snapshot from '../../../data/shrines-fallback.json';
import {
  boundsOfPoints,
  fitPadding,
  isNarrowViewport,
  sheetPeekHeight,
  FIT_MARGIN,
  NARROW_MAX_WIDTH,
  SHEET_PEEK_FALLBACK,
} from '../openingView';

/**
 * The geometry behind the opening view. The browser half — that no marker ends
 * up under the sheet — is `e2e/map-opening-view.spec.ts`; this holds the parts
 * that can be checked without a map.
 */

const rows = snapshot.rows as Record<string, unknown>[];

describe('boundsOfPoints', () => {
  it('encloses the points it is given', () => {
    expect(
      boundsOfPoints([
        { lat: 31.5, lng: 74.3 },
        { lat: 24.9, lng: 67.1 },
        { lat: 34.0, lng: 71.6 },
      ]),
    ).toEqual([
      [24.9, 67.1],
      [34.0, 74.3],
    ]);
  });

  it('returns null for an empty set rather than a degenerate box', () => {
    /* The first render has no shrines. Leaflet throws on empty bounds, so the
       caller needs to be told to keep the default view, not handed a point. */
    expect(boundsOfPoints([])).toBeNull();
    expect(boundsOfPoints([{ lat: Number.NaN, lng: 0 }])).toBeNull();
  });

  it('skips a non-finite coordinate instead of poisoning the box', () => {
    /* One bad row must not drag the bounds to infinity and zoom the map out to
       the whole globe — the sheet's data comes from a spreadsheet with no
       review step (RULE 3). */
    const bounds = boundsOfPoints([
      { lat: 31.5, lng: 74.3 },
      { lat: Number.POSITIVE_INFINITY, lng: 74.3 },
      { lat: 24.9, lng: 67.1 },
    ]);
    expect(bounds).toEqual([
      [24.9, 67.1],
      [31.5, 74.3],
    ]);
  });

  it('encloses every mapped site in the shipped archive', () => {
    /* Ties the helper to the data it exists for. The e2e spec asserts no marker
       falls outside the visible rectangle; this asserts the bounds it fits to
       actually contain the archive, so the two cannot disagree. */
    const points = rows
      .map((r) => ({ lat: Number(r.Latitude), lng: Number(r.Longitude) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    expect(points.length, 'no mapped sites in the snapshot — vacuous').toBeGreaterThan(150);

    const bounds = boundsOfPoints(points)!;
    const [[swLat, swLng], [neLat, neLng]] = bounds;
    const escaped = points.filter(
      (p) => p.lat < swLat || p.lat > neLat || p.lng < swLng || p.lng > neLng,
    );
    expect(escaped).toEqual([]);
  });
});

describe('isNarrowViewport', () => {
  it('treats the measured phone sizes as narrow and desktop as not', () => {
    /* The four sizes the defect was measured at, and the one it was not. */
    for (const width of [360, 390, 414, 430]) expect(isNarrowViewport(width)).toBe(true);
    expect(isNarrowViewport(1280)).toBe(false);
  });

  it('switches exactly at the documented boundary', () => {
    expect(isNarrowViewport(NARROW_MAX_WIDTH)).toBe(true);
    expect(isNarrowViewport(NARROW_MAX_WIDTH + 1)).toBe(false);
  });
});

describe('sheetPeekHeight', () => {
  it('reads the stylesheet rather than repeating its number', () => {
    expect(sheetPeekHeight(() => '184px')).toBe(184);
    expect(sheetPeekHeight(() => '  200px ')).toBe(200);
  });

  it('falls back when the property is missing or not a pixel length', () => {
    /* `getPropertyValue` returns '' for an unset custom property, and a build
       that renamed the variable would otherwise pad by zero and put the
       southern sites back under the sheet — silently. */
    for (const raw of ['', 'auto', '0px', '80%', 'calc(80dvh)']) {
      expect(sheetPeekHeight(() => raw)).toBe(SHEET_PEEK_FALLBACK);
    }
  });
});

describe('fitPadding', () => {
  it('pads the bottom by the sheet, because that is the occluded edge', () => {
    const pad = fitPadding(184);
    expect(pad.paddingTopLeft).toEqual([FIT_MARGIN, FIT_MARGIN]);
    expect(pad.paddingBottomRight).toEqual([FIT_MARGIN, 184 + FIT_MARGIN]);
    /* The whole defect in one assertion: the bottom pad must exceed the
       margin, or the fit is to the viewport and not to the visible map. */
    expect(pad.paddingBottomRight[1]).toBeGreaterThan(pad.paddingTopLeft[1]);
  });
});
