// @vitest-environment node
/**
 * Every slug in a seed or proposals file points at something that exists.
 *
 * These files are full of **pointers**: `saintSlug`, `objectSlug`, `orderSlug`,
 * `shrineSlug`. A pointer at nobody is the quietest defect this project has,
 * because `build-kg.mjs` is deliberately forgiving — it skips what it cannot
 * resolve rather than crashing, which is right for a build that must survive a
 * sheet edit, and which means a dead pointer produces no error, no log line and
 * no visible gap.
 *
 * Three were found by hand on 30 August 2026 (§9.178): date proposals using
 * short-form slugs for figures that exist under longer ones. They were dropped
 * at `if (!saint) continue;` and took `datePrecision`, `titles` — *Sakhi
 * Lajpal*, *Gharib Nawaz*, *wali-e-kamil* — `altNames` and a `biographySource`
 * with them. Nobody noticed for weeks because the dates themselves were already
 * right, from the sheet: **the most visible field looked correct while
 * everything around it was missing.**
 *
 * Written after sweeping every family by hand and finding those three and
 * nothing else. The sweep is the kind of thing that gets done once and never
 * again, so it is here instead.
 *
 * SLUGS ARE RESOLVED THROUGH `retiredSlugs` before being checked. A proposal
 * naming a figure that has since been merged is not stale — it is a pointer to
 * an address that still forwards, which is the whole reason retirements exist.
 * A check that ignored them would report a merge as a defect, which is how the
 * first draft of this sweep reported ten failures that were not.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const kg = read('data/kg.json') as {
  saints: { slug: string }[];
  orders: { slug: string }[];
  retiredSlugs: Record<string, string>;
};
const seeds = read('data/kg-seeds.json');
const shrineFigures = read('data/kg-shrine-figures.json') as Record<string, string[]>;

const resolve = (s: string) => kg.retiredSlugs[s] ?? s;
const FIGURES = new Set(kg.saints.map((s) => s.slug));
const ORDERS = new Set(kg.orders.map((o) => o.slug));
const SHRINES = new Set(Object.keys(shrineFigures));

/** `[label, slugs, universe]`, with the universe named so a failure says which. */
const POINTERS: [string, string[], Set<string>, string][] = [
  ['familyRelations.subjectSlug', (seeds.familyRelations ?? []).map((f: { subjectSlug: string }) => f.subjectSlug), FIGURES, 'figure'],
  ['familyRelations.objectSlug', (seeds.familyRelations ?? []).map((f: { objectSlug: string }) => f.objectSlug), FIGURES, 'figure'],
  ['lineageRelations.subjectSlug', (seeds.lineageRelations ?? []).map((l: { subjectSlug: string }) => l.subjectSlug), FIGURES, 'figure'],
  ['lineageRelations.objectSlug', (seeds.lineageRelations ?? []).map((l: { objectSlug: string }) => l.objectSlug), FIGURES, 'figure'],
  ['kinNotes.saintSlug', (seeds.kinNotes ?? []).map((n: { saintSlug: string }) => n.saintSlug), FIGURES, 'figure'],
  ['saintOrders (keys)', Object.keys(seeds.saintOrders ?? {}), FIGURES, 'figure'],
  ['saintDisplayNames (keys)', Object.keys(seeds.saintDisplayNames ?? {}), FIGURES, 'figure'],
  ['saintRetiredSlugs (targets)', Object.values(seeds.saintRetiredSlugs ?? {}) as string[], FIGURES, 'figure'],
  ['orderProse.orderSlug', (seeds.orderProse ?? []).map((o: { orderSlug: string }) => o.orderSlug), ORDERS, 'order'],
  ['orderProse.shrineSlug', (seeds.orderProse ?? []).map((o: { shrineSlug: string }) => o.shrineSlug), SHRINES, 'shrine'],
  ['traditionMemberships.shrineSlug', (seeds.traditionMemberships ?? []).map((m: { shrineSlug: string }) => m.shrineSlug), SHRINES, 'shrine'],
];

describe('seed and proposal pointers', () => {
  it('has pointers to check', () => {
    expect(POINTERS.reduce((n, [, s]) => n + s.length, 0)).toBeGreaterThan(150);
  });

  for (const [label, slugs, universe, kind] of POINTERS) {
    it(`${label} all resolve to a live ${kind}`, () => {
      const dangling = [...new Set(slugs.filter(Boolean).filter((s) => !universe.has(resolve(s))))].sort();
      expect(
        dangling,
        `these ${label} values point at no ${kind}. build-kg skips what it cannot resolve rather ` +
          `than failing, so a dead pointer produces no error and no log line — the record simply ` +
          `does nothing. Check for a short-form slug, or a merge that needs a retiredSlugs entry.`,
      ).toEqual([]);
    });
  }

  it('every date proposal names a figure, because a date cannot create one', () => {
    /* The family that actually broke. Kin and lineage proposals mint a node from
       their `IsNew` flag and so can never dangle; a date proposal has nothing to
       attach to and is silently discarded. `verify-kg-proposals.mjs` gates this
       too — kept here as well because that script is a data gate a person runs
       and this suite is what CI runs. */
    const dates = read('data/kg-saint-dates-proposals.json') as { proposals?: { saintSlug: string }[] };
    const dangling = (dates.proposals ?? [])
      .map((p) => p.saintSlug)
      .filter((s) => s && !FIGURES.has(resolve(s)));
    expect(dangling).toEqual([]);
  });
});
