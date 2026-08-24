// @vitest-environment node
/**
 * A figure's silsila, and the two ways a page can quietly under-report it.
 *
 * The knowledge graph records 64 `belongs_to_order` edges across 52 figures, so
 * 11 of them hold two or three allegiances at once. Each is a separate edge with
 * its own quoted source — "Chishti Qadri" is not an inference from a Chishti
 * edge and a Qadri edge, it is what a survey sheet says. `getOrderForSaint`
 * returns the first of those edges and nothing else, which is a fine accessor
 * for "pick one order to seed a diagram with" and a wrong one for "show this
 * figure's affiliation". SaintPage used it for the latter for months, while
 * `/order/:slug` had already grown an "Also in" row — so a compound allegiance
 * was visible from the order's page and invisible on the person's own.
 *
 * The second under-report is subtler. 13 subject/object pairs are recorded
 * *twice*, once `disciple_of` and once `successor_of`, because a source says
 * both. `LineageView` keyed its list items on the saint's slug alone, so React
 * saw a duplicate key and one of the two recorded facts did not render.
 *
 * A third thing this file pins down is a rule that was *not* worth having: an
 * earlier `asRecordedAddsDetail` hid any recorded silsila that looked like a
 * restatement of the order's name. On the real data that rule had to know that
 * "Qadri", "Qadiri" and "Qadiriyya" are one name while "Rashidi" under
 * Qadiriyya is another — a transliteration judgement whose wrong answers delete
 * a source's own hedge. It is gone; the field is shown as recorded.
 *
 * Neither failure raises anything. TypeScript is happy — both accessors return
 * well-typed values. Lint is happy. The page renders, looks complete, and is
 * short by exactly the rows nobody counted. So per RULE 4 the invariants are
 * checked here rather than trusted: the data still has multi-order figures and
 * duplicate-relation pairs (if it stops having them, this test says so and the
 * comments above become history), and the pages that display affiliation do not
 * reach for the single-order accessor.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  recordedSilsilas,
  getArchiveFigures,
  getKGStore,
  getOrderMemberships,
  getTeachersOf,
  getDisciplesOf,
  type OrderMembership,
} from '../kg';

const SRC = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

/** Every figure the graph records an order for, not just those with a shrine —
 * a lineage-only teacher can carry an affiliation too. */
const figureSlugs = [
  ...new Set(
    getKGStore()
      .relations.filter((r) => r.type === 'belongs_to_order')
      .map((r) => r.subject.replace(/^saint:/, '')),
  ),
];

describe('order memberships', () => {
  it('still holds figures with more than one recorded silsila', () => {
    const multi = figureSlugs.filter((slug) => getOrderMemberships(slug).length > 1);
    expect(
      multi.length,
      'figures whose second affiliation a single-order accessor drops',
    ).toBeGreaterThan(0);
  });

  it('never reports the same order twice for one figure', () => {
    for (const slug of figureSlugs) {
      const orders = getOrderMemberships(slug).map((m) => m.order.slug);
      expect(new Set(orders).size, `duplicate order edge on ${slug}`).toBe(orders.length);
    }
  });

  it('resolves every belongs_to_order edge to a known order', () => {
    const edges = getKGStore().relations.filter((r) => r.type === 'belongs_to_order');
    const resolved = figureSlugs.reduce((n, slug) => n + getOrderMemberships(slug).length, 0);
    expect(resolved, 'an edge pointing at an order the store does not hold').toBe(edges.length);
  });
});

describe('recordedSilsilas', () => {
  const membership = (asRecorded?: string): OrderMembership =>
    ({
      order: { slug: 'qadiriyya', name: 'Qadiriyya' } as OrderMembership['order'],
      reviewed: false,
      confidence: 1,
      ...(asRecorded ? { asRecorded } : {}),
    }) as OrderMembership;

  it('is empty when nothing is recorded', () => {
    expect(recordedSilsilas([])).toEqual([]);
    expect(recordedSilsilas([membership()])).toEqual([]);
    expect(recordedSilsilas([membership('   ')])).toEqual([]);
  });

  it('collapses the one cell a figure carries on all of its order edges', () => {
    // The shape that made this a helper: two edges, one silsila cell.
    expect(recordedSilsilas([membership('Suhrawardi'), membership('Suhrawardi')])).toEqual([
      'Suhrawardi',
    ]);
  });

  it('keeps a hedge exactly as recorded', () => {
    const hedge = 'Qadri (see year_built_note / Description for a discrepancy)';
    expect(recordedSilsilas([membership(hedge)])).toEqual([hedge]);
  });

  it('does not drop a string for restating the order name', () => {
    /* The rule this replaced would have. Deciding that "Qadri" restates
       "Qadiriyya" while "Rashidi" does not is a transliteration judgement, and
       getting it wrong deletes a source's own hedge. */
    expect(recordedSilsilas([membership('Qadri')])).toEqual(['Qadri']);
  });

  it('still finds recorded silsilas in the shipped graph', () => {
    const withRecord = figureSlugs.filter(
      (slug) => recordedSilsilas(getOrderMemberships(slug)).length > 0,
    );
    expect(withRecord.length, 'figures whose row records its own silsila wording').toBeGreaterThan(
      0,
    );
  });

  it('finds at least one figure whose recorded wording names a sub-line the order does not', () => {
    /* Not a heuristic in the product — an assertion that the field is worth
       rendering at all. "Naqshbandi-Mujaddidi", "Qadri Shattari",
       "Chishti Nizamia Qadria": the badge above cannot say any of this. */
    const compound = figureSlugs
      .flatMap((slug) => recordedSilsilas(getOrderMemberships(slug)))
      .filter((value) => /[\s\u2014-]/.test(value));
    expect(compound.length, 'recorded silsilas that are more than a bare nisba').toBeGreaterThan(0);
  });
});

describe('lineage links are addressable per relation, not per figure', () => {
  const allFigureSlugs = [...new Set([...getArchiveFigures().map((f) => f.slug), ...figureSlugs])];

  it('still records some pairs under two relation types at once', () => {
    const doubled = allFigureSlugs.filter((slug) => {
      const slugs = getTeachersOf(slug).map((l) => l.saint.slug);
      return new Set(slugs).size !== slugs.length;
    });
    expect(
      doubled.length,
      'figures whose teacher list repeats a slug under two relations',
    ).toBeGreaterThan(0);
  });

  it('is unique once the relation is part of the key', () => {
    for (const slug of allFigureSlugs) {
      for (const links of [getTeachersOf(slug), getDisciplesOf(slug)]) {
        const keys = links.map((l) => `${l.saint.slug}:${l.relation}`);
        expect(new Set(keys).size, `duplicate lineage key on ${slug}`).toBe(keys.length);
      }
    }
  });

  it('keys LineageView list items on slug and relation', () => {
    const src = read('components/kg/LineageView.tsx');
    // A `key={link.saint.slug}` here silently drops one of two recorded facts.
    expect(src).not.toMatch(/key=\{link\.saint\.slug\}/);
    expect(src).toContain('${link.saint.slug}:${link.relation}');
  });
});

describe('pages that display affiliation read every edge', () => {
  /* Not a style rule. `getOrderForSaint` returns one order and a page that
     shows "this figure's silsila" from it is wrong for the 11 figures who hold
     more than one — which is the bug this file exists because of. */
  for (const page of ['pages/SaintPage.tsx', 'pages/OrderPage.tsx']) {
    it(`${page} does not call the single-order accessor`, () => {
      /* A call, not a mention — SaintPage's own comment names the accessor to
         explain why it stopped using it, and a check that cannot tell those
         apart is a check that gets its comment deleted. */
      expect(read(page)).not.toMatch(/getOrderForSaint\s*\(/);
    });
  }

  it('SaintPage shows the source wording and the evidence for each membership', () => {
    const src = read('pages/SaintPage.tsx');
    expect(src).toContain('getOrderMemberships');
    expect(src).toContain('recordedSilsilas');
    expect(src).toContain('membership.quote');
  });

  it('LineageView shows the evidence for a lineage edge', () => {
    const src = read('components/kg/LineageView.tsx');
    expect(src).toContain('link.quote');
    expect(src).toContain('lineageUnreviewed');
  });
});
