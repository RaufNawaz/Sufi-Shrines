// @vitest-environment node
/**
 * The mobile sheet's peek height has one source (RULE 4).
 *
 * Three rules depend on it: the collapsed sheet's height, the expanded floor,
 * and the offset that lifts Leaflet's zoom control and attribution clear of the
 * sheet. They were three copies of a literal behind a `var(--sheet-peek-height,
 * 108px)` fallback that nothing ever set — so raising the peek in two places
 * and missing the third puts the zoom control behind the sheet and hides the
 * attribution Leaflet's licence requires be visible. That is not hypothetical:
 * the offset rule's own comment records fixing exactly that once already.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');
const tokens = readFileSync(join(STYLES, 'tokens.css'), 'utf8');
const map = readFileSync(join(STYLES, 'map.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('--sheet-peek-height', () => {
  it('is declared as a token', () => {
    expect(tokens).toMatch(/--sheet-peek-height:\s*\d+px;/);
  });

  it('is used by the rules that depend on it, and by more than one', () => {
    const uses = map.match(/var\(--sheet-peek-height[^)]*\)/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(3);
  });

  it('is never used with a fallback value', () => {
    /* A fallback here is a second source of truth wearing a safety hat: the
       token is declared, so a fallback can only ever mask a typo — or hold a
       stale number, which is what happened (two rules at 184px, one still at
       108). */
    const withFallback = (map.match(/var\(--sheet-peek-height\s*,[^)]*\)/g) ?? []).map((s) =>
      s.trim(),
    );
    expect(withFallback).toEqual([]);
  });
});
