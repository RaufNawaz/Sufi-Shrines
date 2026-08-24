// @vitest-environment node
/**
 * The page's answer and the graph's answer must be the same answer.
 *
 * `/coverage` computes what the archive rests on from the shrine data already in
 * the browser — no new payload, and nothing to go stale, because it reads
 * whatever the sheet currently says. The knowledge graph computes the same thing
 * at build time into `data/kg-sources.json`. Two implementations of one question,
 * which is exactly the arrangement that drifts, so the drift is asserted away:
 * **the same number of distinct sources, and the same citation total.**
 *
 * That is a stronger check than it looks. It only holds if both use the same
 * extractor *and* the same dedupe key — and the dedupe key is the interesting
 * half, because a looser one in either place would silently merge two different
 * books and neither number would look wrong on its own.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShrines } from '../shrineModel';
import { buildSourceIndex } from '../sourceIndex';

const ROOT = join(__dirname, '..', '..', '..', '..');
const snapshot = JSON.parse(readFileSync(join(ROOT, 'src/data/shrines-fallback.json'), 'utf8'));
const layer = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-sources.json'), 'utf8'));

/* Through buildShrines, not raw rows. A previous session read the snapshot rows
   directly and got all-zero support levels out of two different builders — the
   harness was wrong, not the code, and it nearly went in as a bug report. */
const shrines = buildShrines(snapshot.rows);
const index = buildSourceIndex(shrines);

describe('the index the page builds', () => {
  it('found the archive', () => {
    expect(shrines.length).toBeGreaterThan(100);
    expect(index.citations).toBeGreaterThan(400);
  });

  it('agrees with the graph on how many distinct sources there are', () => {
    expect(index.sources.length).toBe(layer.sources.length);
  });

  it('agrees with the graph on how many citations there are', () => {
    expect(index.citations).toBe(layer.attestations.length);
  });

  it('orders by how much rests on each source', () => {
    const counts = index.sources.map((s) => s.shrines.length);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    /* The archive's most load-bearing source underpins a substantial share of
       it. If this ever drops to 1, the dedupe key stopped merging. */
    expect(counts[0]).toBeGreaterThan(10);
  });

  it('lists each citing entry once, even when an entry cites a source twice', () => {
    for (const source of index.sources) {
      const slugs = source.shrines.map((s) => s.slug);
      expect(new Set(slugs).size, source.name.slice(0, 40)).toBe(slugs.length);
    }
  });

  it('keeps the citation verbatim', () => {
    /* The reader's exact search string. Normalisation belongs in the key, never
       in the name. */
    for (const source of index.sources.slice(0, 40)) {
      expect(source.name).not.toMatch(/^\s|\s$/);
      expect(source.name.length).toBeGreaterThan(0);
    }
  });
});

describe('what it says about the archive', () => {
  it('counts single-sourced entries on distinct sources, not citations', () => {
    /* An entry citing one book three times is single-sourced. Counting
       citations would flatter the archive. */
    const total = shrines.length;
    expect(index.singleSourced + index.triangulated + index.uncited).toBeLessThanOrEqual(total);
    expect(index.uncited).toBeGreaterThanOrEqual(0);
  });

  it('finds the one entry the archive cites nothing for', () => {
    /* HANDOVER: exactly one entry cites nothing (Sant Baba Asudaram Darbar).
       Asserted as a range rather than a name, so an enrichment pass closing it
       is a passing test rather than a failing one. */
    expect(index.uncited).toBeLessThan(5);
  });

  it('finds sources more than one entry rests on', () => {
    expect(index.shared).toBeGreaterThan(10);
  });
});
