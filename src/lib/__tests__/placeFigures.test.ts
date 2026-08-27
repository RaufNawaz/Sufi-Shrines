// @vitest-environment node
/**
 * The place page's join: which figures a set of sites commemorates, and where
 * the two halves of a figure's identity are allowed to come from.
 *
 * Three failures are asserted impossible, and the third is the one that would
 * have shipped.
 *
 * **Counting a figure once per site.** Six of Nankana Sahib's seven gurdwaras
 * name Guru Nanak. A join that pushed a row per `buried_at` edge would print his
 * name six times under a heading reading "Figures commemorated here", which is
 * the archive over-reporting itself in the one place where the sites genuinely
 * do share a subject.
 *
 * **Pulling the graph in to do it.** `getSaintsForShrine` is the same edge and
 * the obvious call; it costs 305 KB, because `src/lib/kg.ts` statically imports
 * the 426 KB graph and `/place/:slug` had never carried it. The first attempt at
 * this feature took the route from 292 KB to 608 KB of eager JavaScript and
 * `check-bundle-budget` refused the build. The last test here is the standing
 * guard on that.
 *
 * **And deriving the figure's slug from the sheet instead.** The natural fix for
 * the 305 KB is to skip the index too — the sheet has `principal_figure` on
 * every row, so `slugify` it and link. Measured: **86 of 169 slugs and 90 of 169
 * names diverge from the graph.** The graph normalises the sheet's
 * parentheticals and merges variants, so "Sayyid Abdul Latif Kazmi (Bari Imam)"
 * is `bari-imam`, "Shiva (Mahadev)" and "Shiva (associated)" are both `shiva`,
 * and "Durga (Mata)" is `goddess-durga`. That shortcut produces 86 links to
 * figure pages that do not exist, every one of them plausible. It is asserted
 * here as a *counter*-test: the divergence is real, it is large, and it is the
 * reason the index exists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { figuresAtShrines } from '../data/placeFigures';
import { figureSlugsForShrine } from '../kgShrineFigures';
import { slugify } from '../data/slugify';
import { buildShrines } from '../data/shrineModel';
import snapshot from '../../data/shrines-fallback.json';
import type { ShrineRow } from '../../types/shrine';

const shrines = buildShrines((snapshot as { rows: ShrineRow[] }).rows);
const bySlug = new Map(shrines.map((s) => [s.slug, s]));
const pick = (...slugs: string[]) => slugs.map((s) => bySlug.get(s)!).filter(Boolean);

describe('the figures a place holds', () => {
  it('names a figure once, however many of the place’s sites keep them', () => {
    const nankana = shrines.filter((s) => /Nankana Sahib/i.test(s.location ?? ''));
    expect(nankana.length).toBeGreaterThan(5);

    const figures = figuresAtShrines(nankana);
    const slugs = figures.map((f) => f.slug);
    expect(new Set(slugs).size, 'a figure was listed twice').toBe(slugs.length);
    expect(figures.length).toBeLessThan(nankana.length);

    /* And the sites are kept rather than collapsed away with the duplicate: a
       figure commemorated at several of a place's sites must be able to say
       which. */
    const busiest = figures.slice().sort((a, b) => b.shrineSlugs.length - a.shrineSlugs.length)[0]!;
    expect(busiest.shrineSlugs.length).toBeGreaterThan(1);
    expect(new Set(busiest.shrineSlugs).size).toBe(busiest.shrineSlugs.length);
  });

  it('returns nothing for no sites', () => {
    expect(figuresAtShrines([])).toEqual([]);
  });

  it('keeps the order the sites were given', () => {
    const [a, b] = ['data-darbar', 'shrine-of-bibi-pak-daman'];
    const forward = figuresAtShrines(pick(a, b)).map((f) => f.slug);
    const backward = figuresAtShrines(pick(b, a)).map((f) => f.slug);
    expect(forward.length).toBe(2);
    expect(forward).toEqual([...backward].reverse());
  });

  it('carries a recorded name for every figure it returns', () => {
    const figures = figuresAtShrines(shrines);
    expect(figures.length).toBeGreaterThan(100);
    expect(figures.filter((f) => !f.recordedName.trim())).toEqual([]);
  });

  it('every slug it returns is one the index actually holds', () => {
    /* i.e. `/saint/<slug>` resolves. The index is itself held against the graph
       by `kgShrineFigures.test.ts`, so this closes the chain from a place page's
       link back to a figure entity. */
    const known = new Set(shrines.flatMap((s) => figureSlugsForShrine(s.slug)));
    for (const figure of figuresAtShrines(shrines)) {
      expect(known.has(figure.slug), `${figure.slug} is not in the index`).toBe(true);
    }
  });
});

describe('why the slug comes from the index and not from the sheet', () => {
  it('records how far the sheet’s own wording is from the graph’s identity', () => {
    /* A counter-test. If this number ever falls to zero the shortcut becomes
       safe and this module can drop its dependency; while it is large, the
       shortcut silently breaks more than half the archive's figure links. The
       assertion is a floor rather than an equality so that normalising a few
       rows in the sheet does not fail a build — but a collapse to zero should
       be noticed, so it is bounded on both sides. */
    let diverging = 0;
    let compared = 0;
    for (const shrine of shrines) {
      const fromIndex = figureSlugsForShrine(shrine.slug)[0];
      if (!fromIndex || !shrine.sufiSaint) continue;
      compared += 1;
      if (slugify(shrine.sufiSaint) !== fromIndex) diverging += 1;
    }
    expect(compared).toBeGreaterThan(150);
    expect(diverging).toBeGreaterThan(50);
    expect(diverging).toBeLessThan(compared);
  });
});

describe('the place page does not pull the knowledge graph', () => {
  it('placeFigures imports the slim index, never src/lib/kg', () => {
    /* The 305 KB guard, as source text rather than as a bundle measurement:
       `check-bundle-budget` catches it too, but only after a full build, and it
       reports the symptom (a route doubled) rather than the cause. */
    const source = readFileSync(join(__dirname, '..', 'data', 'placeFigures.ts'), 'utf8');
    expect(source).toContain("from '../kgShrineFigures'");
    expect(source.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/from '\.\.\/kg'/);
  });

  it('PlacePage imports neither the graph nor the graph-backed name helper', () => {
    const page = readFileSync(join(__dirname, '..', '..', 'pages', 'PlacePage.tsx'), 'utf8');
    const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(code).not.toMatch(/from '\.\.\/lib\/kg'/);
    /* `localizeKgName` is the other door onto the same 426 KB: it imports
       `slugToLabel` from `../kg`. `localizeRecordedName` is the graph-free
       equivalent and is what this page uses. */
    expect(code).not.toMatch(/localizeKgName/);
  });
});
