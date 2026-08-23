// @vitest-environment node
/**
 * Drift guard: the place vocabulary exists twice and must stay one thing.
 *
 * `src/lib/data/places.ts` holds the annotated table the app reads;
 * `scripts/data/lib/places.mjs` holds the same table for the prerenderer, which
 * runs under plain node and cannot load TypeScript. The arrangement is copied
 * from `slugs.mjs` / `slugify.ts`, and the reason that one has held is the
 * guard, not the good intentions: two tables edited by hand diverge, and the
 * symptom here would be a `/place/lahore` page that the app renders and the
 * sitemap never mentions — or worse, a prerendered file for a place the app
 * routes to 'not recorded'.
 *
 * Structural equality is checked field by field, and then the two matchers are
 * run over **every Location in the shipped snapshot**. The behavioural half
 * matters because equal-looking patterns can still differ: `new RegExp(source)`
 * drops the flags, and a stray `g` would make `test()` depend on how many times
 * it had been called before.
 */
import { describe, it, expect } from 'vitest';
import { PLACES, placesForShrine } from '../places';
import { buildShrines } from '../shrineModel';
import type { ShrineRow } from '../../../types/shrine';
import { getFieldValue } from '../fieldAliasing';
import {
  PLACE_VOCABULARY,
  placesForLocation,
  countPlaces,
  locationOfRow,
} from '../../../../scripts/data/lib/places.mjs';

describe('the place vocabulary is the same on both sides', () => {
  it('has the same entries in the same order', () => {
    expect(PLACE_VOCABULARY.map((p) => p.slug)).toEqual(PLACES.map((p) => p.slug));
    expect(PLACE_VOCABULARY.map((p) => p.name)).toEqual(PLACES.map((p) => p.name));
  });

  it('carries each pattern verbatim, with the app-side flags', () => {
    expect(PLACE_VOCABULARY.map((p) => p.pattern)).toEqual(PLACES.map((p) => p.match.source));
    // Case-insensitive, and *not* global: a `g` regex used with .test() keeps a
    // lastIndex, so the same string would match on one call and miss on the
    // next.
    for (const place of PLACES) {
      expect(place.match.flags, `${place.slug} flags`).toBe('i');
    }
  });

  it('matches every Location in the shipped snapshot identically', async () => {
    const snapshot = (await import('../../../data/shrines-fallback.json')).default as {
      rows: ShrineRow[];
    };
    const shrines = buildShrines(snapshot.rows);
    expect(shrines.length).toBeGreaterThan(150);

    let withPlace = 0;
    for (const shrine of shrines) {
      const app = placesForShrine(shrine).map((p) => p.slug);
      const script = placesForLocation(shrine.location ?? '').map((p) => p.slug);
      expect(script, `Location: ${shrine.location}`).toEqual(app);
      if (app.length > 0) withPlace++;
    }
    // Anchor: a guard that compared two empty lists 169 times would pass.
    expect(withPlace).toBeGreaterThan(140);
  });

  it('reads the Location column the way the app reads it', async () => {
    /* The prerenderer works from raw sheet rows, not from the app's model, so
       the two can disagree one step earlier than the vocabulary: a row whose
       location the script finds under a different column name would be placed
       in dist and unplaced in the app. */
    const snapshot = (await import('../../../data/shrines-fallback.json')).default as {
      rows: ShrineRow[];
    };
    let nonEmpty = 0;
    for (const row of snapshot.rows) {
      expect(locationOfRow(row as Record<string, unknown>)).toBe(getFieldValue(row, 'Location'));
      if (getFieldValue(row, 'Location')) nonEmpty++;
    }
    expect(nonEmpty).toBeGreaterThan(150);
  });

  it('counts the same places the app would build pages for', async () => {
    const snapshot = (await import('../../../data/shrines-fallback.json')).default as {
      rows: ShrineRow[];
    };
    const shrines = buildShrines(snapshot.rows);
    const scriptSide = countPlaces(shrines, (s) => s.location ?? '');
    // The prerenderer's list is what ends up in dist and in the sitemap, so it
    // must be exactly the set of places the /coverage index links to.
    const { buildPlaces } = await import('../places');
    const appSide = buildPlaces(shrines).places;
    expect([...scriptSide.map((p) => p.slug)].sort()).toEqual(
      [...appSide.map((p) => p.slug)].sort(),
    );
    for (const place of scriptSide) {
      const app = appSide.find((p) => p.slug === place.slug);
      expect(place.count, place.slug).toBe(app?.shrines.length);
    }
  });
});
