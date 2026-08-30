// @vitest-environment node
/**
 * Drift guard: the silsila patterns exist twice and must stay one thing.
 *
 * `src/lib/data/silsila.ts` holds the annotated table the app reads, to link a
 * shrine's "Silsila (order)" row to its order page. `scripts/data/lib/silsila.mjs`
 * holds the same table for `build-kg.mjs`, which runs under plain node and
 * cannot load TypeScript — there it *verifies* a seeded order against the
 * figure's own cell rather than resolving anything.
 *
 * Same arrangement as `places.ts` / `places.mjs`, and the same reason it needs a
 * guard rather than good intentions: two tables edited by hand diverge, and the
 * symptom here would be a shrine page linking to an order that the graph builder
 * does not believe the cell names — a contradiction between two pages of one
 * archive, with nothing failing.
 *
 * Structural equality first, then both resolvers over **every `silsila` value in
 * the shipped snapshot**. The behavioural half matters because equal-looking
 * patterns can still differ: `new RegExp(source)` drops the flags, and a stray
 * `g` would make `.test()` depend on how many times it had been called.
 */
import { describe, it, expect } from 'vitest';
import { SILSILA_PATTERNS, ordersNamedIn, orderSlugForSilsila } from '../silsila';
import snapshot from '../../../data/shrines-fallback.json';
import {
  SILSILA_PATTERN_SOURCES,
  ordersNamedIn as ordersNamedInMjs,
  orderSlugForSilsila as orderSlugForSilsilaMjs,
} from '../../../../scripts/data/lib/silsila.mjs';

const silsilaValues = (snapshot.rows as Record<string, string>[])
  .map((row) => String(row.silsila ?? '').trim())
  .filter(Boolean);

describe('the silsila patterns are the same on both sides', () => {
  it('lists the same orders in the same order', () => {
    expect(SILSILA_PATTERN_SOURCES.map(([slug]) => slug)).toEqual(
      SILSILA_PATTERNS.map(([slug]) => slug),
    );
  });

  it('carries each pattern verbatim', () => {
    expect(SILSILA_PATTERN_SOURCES.map(([, source]) => source)).toEqual(
      SILSILA_PATTERNS.map(([, pattern]) => pattern.source),
    );
  });

  it('is case-insensitive and never global on the app side', () => {
    /* A `g` regex used with `.test()` keeps `lastIndex` between calls, so the
       same cell would answer differently depending on how often it was asked. */
    for (const [slug, pattern] of SILSILA_PATTERNS) {
      expect(pattern.flags, `${slug} must be /i and only /i`).toBe('i');
    }
  });

  it('agrees on every silsila value the archive actually holds', () => {
    expect(silsilaValues.length, 'no silsila values in the snapshot to compare').toBeGreaterThan(20);
    for (const value of silsilaValues) {
      expect(ordersNamedInMjs(value), `disagreed on: ${value.slice(0, 60)}`).toEqual(
        ordersNamedIn(value),
      );
      expect(orderSlugForSilsilaMjs(value)).toEqual(orderSlugForSilsila(value));
    }
  });
});

describe('what a silsila cell resolves to', () => {
  it('links only when the cell names exactly one order', () => {
    expect(orderSlugForSilsila('Qadri')).toBe('qadiriyya');
    expect(orderSlugForSilsila('Chishti Nizamia Qadria')).toBeNull();
    expect(orderSlugForSilsila('Not stated as an order.')).toBeNull();
    expect(orderSlugForSilsila('')).toBeNull();
  });

  it('leaves the archive with more text than links, which is the point', () => {
    /* Measured on the shipped snapshot when this was written: 52 cells, 47
       naming one order, 3 naming two, 2 prose. The counts move as the archive
       grows; what must not move is that a dual affiliation stays unlinked —
       picking one of two would assert something the sheet declines to. */
    const resolved = silsilaValues.filter((v) => orderSlugForSilsila(v) !== null).length;
    const several = silsilaValues.filter((v) => ordersNamedIn(v).length > 1).length;
    expect(resolved).toBeGreaterThan(silsilaValues.length / 2);
    expect(resolved + several).toBeLessThanOrEqual(silsilaValues.length);
    for (const value of silsilaValues) {
      if (ordersNamedIn(value).length > 1) expect(orderSlugForSilsila(value)).toBeNull();
    }
  });
});
