import { describe, it, expect } from 'vitest';
import { metaDescription } from '../articleParsing';
import snapshot from '../../../data/shrines-fallback.json';

/**
 * What a shrine page tells a crawler about itself.
 *
 * `ShrinePage` set `<meta name="description">` to `Description.slice(0, 160)`
 * straight from the sheet. **123 of the archive's 171 descriptions open with a
 * markdown heading**, so the live DOM for `/shrine/allo-mahar` read
 * "## Overview\n\nAllo Mahar Sharif is a village in the Daska *tehsil* of…" —
 * which is what a JavaScript-rendering crawler indexes.
 *
 * `scripts/prerender.mjs` had always written a clean one into the file, so the
 * card a messaging app shows was correct and the runtime then overwrote it.
 * Nothing renders a meta tag, so nobody saw it and no test compared them.
 *
 * These assert the *output*, not equality with the prerenderer's own stripper.
 * A third copy of the same string-munging is how copies start disagreeing, and
 * everything that actually matters here is checkable directly.
 */
const descriptions = (snapshot.rows as Record<string, string>[])
  .map((row) => String(row.Description ?? ''))
  .filter(Boolean);

describe('the meta description a reader would see quoted', () => {
  it('has descriptions to check', () => {
    expect(descriptions.length).toBeGreaterThan(100);
  });

  it('never starts with a markdown heading', () => {
    const bad = descriptions.map(metaDescription).filter((d) => /^#{1,6}\s/.test(d));
    expect(bad.slice(0, 3), `${bad.length} descriptions begin with a heading`).toEqual([]);
  });

  it('carries no emphasis or link markup', () => {
    const bad = descriptions
      .map(metaDescription)
      .filter((d) => /[*_`~]/.test(d) || /\[[^\]]+\]\([^)]+\)/.test(d));
    expect(bad.slice(0, 3).map((d) => d.slice(0, 60)), `${bad.length} carry markdown`).toEqual([]);
  });

  it('is one line, and short enough for a card to show whole', () => {
    for (const description of descriptions.map(metaDescription)) {
      expect(description).not.toMatch(/\n/);
      expect(description.length).toBeLessThanOrEqual(200);
    }
  });

  it('still says something — stripping must not empty it', () => {
    /* The failure mode of an over-eager stripper: a description that is nothing
       but a heading and a link would reduce to "". */
    const empty = descriptions.filter((d) => metaDescription(d).length < 20);
    expect(empty.length, `${empty.length} descriptions reduced to almost nothing`).toBe(0);
  });
});
