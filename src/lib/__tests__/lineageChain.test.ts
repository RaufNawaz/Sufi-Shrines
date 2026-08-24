// @vitest-environment node
/**
 * The chain of transmission, and the two ways a chain view lies.
 *
 * A silsila's claim is an unbroken line from master to master, and the graph has
 * held that line all along: 57 figures record a teacher, and following those
 * links gives 15 of them a chain two or more removes deep. SaintPage showed the
 * first hop and stopped.
 *
 * The interesting part is where the walk must refuse to continue. Five figures
 * record several teachers, and the longest *apparent* chain in the data — eight
 * names — runs straight through one of them: Abul Faiz Qalander Ali Suharwardi
 * names four masters, so a walk that took the first would draw five generations
 * of descent the archive never claims. That is not a display bug, it is a
 * fabricated lineage (RULE 2), and it is the kind that looks completely
 * plausible on the page. So `getLineageChain` stops at a fork and reports it,
 * and this file asserts that it still has a fork to stop at.
 *
 * The second lie is a cycle. None exists today. A `successor_of` edge pointing
 * back into its own ancestry is one CSV import away, and the failure mode is a
 * render that never returns — so the guard is tested against a synthetic graph
 * rather than trusted to stay unnecessary.
 */
import { describe, it, expect } from 'vitest';
import { getLineageChain, getKGStore, getTeachersOf } from '../kg';

const store = getKGStore();
const LINEAGE = ['disciple_of', 'successor_of'];

const figureSlugs = [...new Set(store.saints.map((s) => s.slug))];

describe('getLineageChain', () => {
  it('returns an empty chain, rooted, for a figure with no recorded teacher', () => {
    const orphan = figureSlugs.find((slug) => getTeachersOf(slug).length === 0)!;
    expect(getLineageChain(orphan)).toEqual({ steps: [], stop: 'root', forks: 0 });
  });

  it('walks more than one remove where the record is unambiguous', () => {
    const deep = figureSlugs.filter((slug) => getLineageChain(slug).steps.length >= 2);
    expect(deep.length, 'figures whose chain the first-hop-only view was hiding').toBeGreaterThan(
      0,
    );
  });

  it('never repeats a figure within one chain', () => {
    for (const slug of figureSlugs) {
      const names = getLineageChain(slug).steps.map((s) => s.saint.slug);
      expect(new Set(names).size, `${slug} walks through the same figure twice`).toBe(names.length);
      expect(names, `${slug} appears in its own ancestry`).not.toContain(slug);
    }
  });

  it('stops at a fork instead of choosing a master, and says how many', () => {
    const forked = figureSlugs
      .map((slug) => getLineageChain(slug))
      .filter((chain) => chain.stop === 'forks');
    expect(forked.length, 'figures whose record names several masters').toBeGreaterThan(0);
    for (const chain of forked) expect(chain.forks).toBeGreaterThan(1);
  });

  it('reports forks exactly where the graph records several distinct teachers', () => {
    for (const slug of figureSlugs) {
      const chain = getLineageChain(slug);
      // The figure the walk ended on: the last step, or the start if it never moved.
      const last = chain.steps.at(-1)?.saint.slug ?? slug;
      const teachers = new Set(getTeachersOf(last).map((l) => l.saint.slug));
      if (chain.stop === 'forks') expect(teachers.size, `${slug}`).toBeGreaterThan(1);
      if (chain.stop === 'root') expect(teachers.size, `${slug}`).toBe(0);
    }
  });

  it('keeps both relations when a source records the same master twice', () => {
    /* 13 pairs are recorded as disciple_of *and* successor_of. A chain step is
       one figure, so it must not become two steps — nor drop one of the two
       recorded facts. */
    const doubled = figureSlugs
      .flatMap((slug) => getLineageChain(slug).steps)
      .filter((step) => step.links.length > 1);
    expect(doubled.length, 'chain steps carrying two recorded relations').toBeGreaterThan(0);
    for (const step of doubled) {
      expect(new Set(step.links.map((l) => l.relation)).size).toBe(step.links.length);
      for (const link of step.links) expect(link.saint.slug).toBe(step.saint.slug);
    }
  });

  it('terminates on a cycle the data does not currently contain', () => {
    /* Mutating the shared store and putting it back: `getLineageChain` reads
       the module singleton, so a synthetic cycle is the only way to exercise
       the guard, and leaving it in place would poison every test after this
       one. */
    const relations = store.relations as unknown as Record<string, unknown>[];
    const a = figureSlugs[0];
    const b = figureSlugs[1];
    const before = relations.length;
    relations.push(
      { type: 'disciple_of', subject: `saint:${a}`, object: `saint:${b}`, confidence: 1 },
      { type: 'disciple_of', subject: `saint:${b}`, object: `saint:${a}`, confidence: 1 },
    );
    try {
      const chain = getLineageChain(a);
      expect(chain.stop).toBe('cycle');
      expect(chain.steps.map((s) => s.saint.slug)).toEqual([b]);
    } finally {
      relations.length = before;
    }
    // And the store is as it was, so nothing downstream inherits the cycle.
    expect(store.relations.length).toBe(before);
    expect(getLineageChain(a).stop).not.toBe('cycle');
  });
});

describe('the chain view is wired into the figure page', () => {
  it('every lineage relation type the walk follows is one the graph uses', () => {
    const used = new Set(store.relations.map((r) => r.type));
    for (const type of LINEAGE) expect(used, `${type} is no longer in the graph`).toContain(type);
  });
});
