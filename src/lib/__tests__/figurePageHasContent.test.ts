// @vitest-environment node
/**
 * No figure page is empty.
 *
 * A lineage-only figure has no shrine, no dates and usually no biography — the
 * whole of its page is the relation that brought it into the graph. There are
 * 107 of them, and 73 have exactly one relation and nothing else. So the single
 * thing that makes such a page worth serving is that the relation exists, and a
 * figure node with none is a published URL that says nothing about anybody.
 *
 * That is not hypothetical. Every one of these nodes is created by an `IsNew`
 * flag on a seed or proposal, and the edge that justified it is created
 * separately, further down the same build. The two have come apart before:
 * §9.161's rename broke a name-join and left `bhai-gurdas` existing twice with
 * the lineage on one node and the site on the other, and §9.168's split founder
 * had a page whose only content was a son, beside another page holding
 * everything else about the same man. Both were found by reading, not by a gate.
 *
 * Written after rendering all 42 figures added on 30 August 2026 in both
 * languages — 84 pages, no defects. Checking the data precondition costs
 * milliseconds and catches the same class the render sweep did, which is why
 * this is a unit test and not an e2e spec: 241 figures × 2 languages is 482 page
 * loads to answer a question the graph can answer directly.
 */
import { describe, it, expect } from 'vitest';
import { getKGStore } from '../kg';

const kg = getKGStore();

describe('every figure page has something on it', () => {
  it('has figures to check', () => {
    expect(kg.saints.length).toBeGreaterThan(200);
  });

  it('gives every figure at least one relation', () => {
    /* Counted over both ends: a figure reached only as the OBJECT of someone
       else's edge — a father, a master — still has a page with that edge on it.
       `getKinOf` and the lineage views both read in both directions. */
    const connected = new Set<string>();
    for (const r of kg.relations) {
      connected.add(r.subject);
      connected.add(r.object);
    }
    const orphans = kg.saints
      .filter((s) => !connected.has(s.id))
      .map((s) => `${s.slug} (${s.name})`)
      .sort();
    expect(
      orphans,
      'these figures have a page and no relation of any kind, so the page renders a name and ' +
        'nothing else. Usually it means an `IsNew` flag minted a node whose edge did not survive ' +
        'the build — check kg-review-needed.json for a join or a dropped self-loop.',
    ).toEqual([]);
  });

  it('gives every LINEAGE-ONLY figure a relation carrying evidence', () => {
    /* Stricter where it matters most. A figure with a shrine has an entry to
       stand on; a lineage-only figure has only the sentence it came from, so an
       edge without a quote leaves the reader a claim and no reason to believe
       it — which is what docs/allo_mahar_resolution.md is a monument to. */
    const byEnd = new Map<string, typeof kg.relations>();
    for (const r of kg.relations) {
      for (const id of [r.subject, r.object]) {
        if (!byEnd.has(id)) byEnd.set(id, []);
        byEnd.get(id)!.push(r);
      }
    }
    const unevidenced = kg.saints
      .filter((s) => (s.shrines?.length ?? 0) === 0)
      .filter((s) => {
        const rels = byEnd.get(s.id) ?? [];
        /* Order membership and burial are derived from the sheet by rule and
           carry no quote by design; they are also never the whole of a
           lineage-only figure's page. Ask the question of the claim types. */
        const claims = rels.filter(
          (r) => r.type === 'kin_of' || r.type === 'disciple_of' || r.type === 'successor_of',
        );
        return claims.length > 0 && !claims.some((r) => r.quote?.trim());
      })
      .map((s) => s.slug)
      .sort();
    expect(
      unevidenced,
      'these lineage-only figures exist solely because of a relation, and not one of those ' +
        'relations shows the sentence it was read from',
    ).toEqual([]);
  });
});
