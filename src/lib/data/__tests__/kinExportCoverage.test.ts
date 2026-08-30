// @vitest-environment node
/**
 * Every kin tie the archive holds reaches the data release.
 *
 * `kin_of` shipped on 29 August 2026 and was absent from BOTH exports until
 * 30 August — `export-jsonld.mjs` and `export-rdf.mjs` each filtered the
 * relation list for `disciple_of` and `successor_of` by name, so a third
 * relation type was not dropped by a bug so much as never invited. Nothing
 * reported it: both exporters ran green, the graph was complete, the site
 * rendered every tie, and only the data release was missing 43 relations.
 *
 * That is the failure this file exists to prevent, and it is a failure of
 * ADDITION rather than of change — the next relation type will arrive the same
 * way. So the assertion is not "the current seven kin types are mapped", it is
 * **every `kinType` present in the built graph has an export mapping**, which a
 * new type fails on the day it is seeded rather than on the day someone reads
 * the RDF.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KIN_EXPORT_PREDICATE, kinTriples } from '../../../../scripts/data/lib/kinExport.mjs';

const kg = JSON.parse(readFileSync(join(__dirname, '../../../../data/kg.json'), 'utf8')) as {
  relations: { type: string; kinType?: string; id: string; subject: string; object: string }[];
};
const kinEdges = kg.relations.filter((r) => r.type === 'kin_of');

describe('kinship in the data release', () => {
  it('has edges to check', () => {
    expect(kinEdges.length).toBeGreaterThan(20);
  });

  it('maps every kinType the graph actually contains', () => {
    const unmapped = [
      ...new Set(kinEdges.map((r) => r.kinType).filter((t) => !t || !KIN_EXPORT_PREDICATE[t])),
    ].sort();
    expect(
      unmapped,
      'a kin type with no export mapping is a relation that silently leaves the data release',
    ).toEqual([]);
  });

  it('emits one triple per edge, and two for a symmetric one', () => {
    /* The count is derived rather than pinned, so adding a kin edge does not
       fail this test — only adding an edge that does not come out the far end
       does. A symmetric tie is stored once and exported twice on purpose;
       scripts/data/lib/kinExport.mjs explains why that is not a reversal of the
       store-once decision. */
    const symmetric = kinEdges.filter((r) => KIN_EXPORT_PREDICATE[r.kinType!]?.symmetric).length;
    expect(kinTriples(kg.relations)).toHaveLength(kinEdges.length + symmetric);
  });

  it('reaches both figures of a symmetric tie', () => {
    const triples = kinTriples(kg.relations);
    for (const r of kinEdges) {
      if (!KIN_EXPORT_PREDICATE[r.kinType!]?.symmetric) continue;
      const a = r.subject.replace(/^saint:/, '');
      const b = r.object.replace(/^saint:/, '');
      expect(
        triples.some((t) => t.subjectSlug === a && t.objectSlug === b),
        `${r.id}: missing from ${a}`,
      ).toBe(true);
      expect(
        triples.some((t) => t.subjectSlug === b && t.objectSlug === a),
        `${r.id}: a consumer asking for ${b}'s siblings would get nothing`,
      ).toBe(true);
    }
  });

  it('refuses an unmapped type rather than dropping it', () => {
    expect(() =>
      kinTriples([
        { type: 'kin_of', kinType: 'cousin_of', id: 'kin_of:test', subject: 'saint:a', object: 'saint:b' },
      ]),
    ).toThrow(/no export mapping/);
  });
});
