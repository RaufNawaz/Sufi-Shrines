import { describe, it, expect } from 'vitest';
import { getSaintsForShrine } from '../kg';
import { figureSlugsForShrine, primaryFigureSlug } from '../kgShrineFigures';
import kg from '../../../data/kg.json';

/**
 * `data/kg-shrine-figures.json` is a slim copy of one edge type out of the
 * knowledge graph, shipped so ShrinePage does not have to import the whole
 * 426 KB graph for a single link (see kgShrineFigures.ts). A copy that can
 * drift from its source is worse than no copy at all, so this asserts they
 * agree for every shrine the graph knows about — not a sample.
 *
 * If this fails after editing the graph, the fix is `npm run data:kg`, which
 * regenerates both files from the same relations.
 */
describe('kg-shrine-figures index', () => {
  const shrineSlugs = [
    ...new Set(
      (kg as { relations: { type: string; object: string }[] }).relations
        .filter((r) => r.type === 'buried_at')
        .map((r) => r.object.replace(/^shrine:/, '')),
    ),
  ];

  it('covers every shrine with a buried_at edge', () => {
    expect(shrineSlugs.length).toBeGreaterThan(150);
    const missing = shrineSlugs.filter((slug) => figureSlugsForShrine(slug).length === 0);
    expect(missing, 'shrines the graph links to a figure but the index does not').toEqual([]);
  });

  it('matches the graph, shrine for shrine', () => {
    const drifted: string[] = [];
    for (const slug of shrineSlugs) {
      const fromGraph = getSaintsForShrine(slug).map((s) => s.slug);
      const fromIndex = figureSlugsForShrine(slug);
      if (fromGraph.join('|') !== fromIndex.join('|')) {
        drifted.push(`${slug}: graph [${fromGraph}] vs index [${fromIndex}]`);
      }
    }
    expect(drifted, 'run `npm run data:kg` to regenerate both from the graph').toEqual([]);
  });

  it('primaryFigureSlug is the graph’s first figure', () => {
    for (const slug of shrineSlugs) {
      expect(primaryFigureSlug(slug)).toBe(getSaintsForShrine(slug)[0]?.slug);
    }
  });

  it('returns nothing for an unknown shrine rather than throwing', () => {
    expect(figureSlugsForShrine('no-such-shrine')).toEqual([]);
    expect(primaryFigureSlug('no-such-shrine')).toBeUndefined();
  });
});
