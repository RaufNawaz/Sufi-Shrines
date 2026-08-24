// @vitest-environment node
/**
 * Two copies of the citation rule, held identical.
 *
 * `bibliography.ts` answers "what is one citation" for `/coverage`; the build
 * scripts need the same answer to turn those citations into graph nodes, and
 * they are plain ESM that cannot import a `.ts`. So there are two copies — the
 * same arrangement `places.mjs` has — and this is the guard that makes that
 * honest rather than merely convenient.
 *
 * Run over **every shipped row**, not over samples: the rule's edge cases are
 * things like a citation ending in a URL (nine do, and mishandling one of them
 * is what made `/coverage` report 544 citations where the archive holds 533).
 * A hand-written pair of fixtures would agree on the easy 524.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bibliographyItems, bibliographyRegion } from '../bibliography';
import {
  bibliographyItems as mirrorItems,
  bibliographyRegion as mirrorRegion,
} from '../../../../scripts/data/lib/bibliography.mjs';

const ROOT = join(__dirname, '..', '..', '..', '..');
const dataset = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
const rows: Record<string, string>[] = dataset.rows ?? dataset;

describe('the two copies of the citation rule', () => {
  it('has rows to compare', () => {
    expect(rows.length).toBeGreaterThan(100);
  });

  it('extracts identical items from every row', () => {
    const divergent: string[] = [];
    for (const row of rows) {
      const sources = String(row['Sources'] ?? '');
      const description = String(row['Description'] ?? '');
      const a = bibliographyItems(sources, description);
      const b = mirrorItems(sources, description) as string[];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        divergent.push(`${row['Name']}: ${a.length} vs ${b.length}`);
      }
    }
    expect(
      divergent,
      'scripts/data/lib/bibliography.mjs has drifted from src/lib/data/bibliography.ts. ' +
        'Whichever is right, both have to say it.',
    ).toEqual([]);
  });

  it('finds the same bibliography region', () => {
    for (const row of rows) {
      const sources = String(row['Sources'] ?? '');
      const description = String(row['Description'] ?? '');
      expect(mirrorRegion(sources, description)).toBe(bibliographyRegion(sources, description));
    }
  });

  it('still finds the citations the archive holds', () => {
    /* A floor, so the equality above cannot be satisfied by both copies
       returning nothing. 533 as measured on 24 August 2026; it rises when
       entries gain citations, so this asserts the order of magnitude. */
    const total = rows.reduce(
      (sum, row) =>
        sum + bibliographyItems(String(row['Sources'] ?? ''), String(row['Description'] ?? '')).length,
      0,
    );
    expect(total).toBeGreaterThan(400);
  });
});
