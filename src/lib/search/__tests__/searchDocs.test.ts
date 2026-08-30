import { describe, it, expect } from 'vitest';
import MiniSearch from 'minisearch';
import type { Shrine } from '../../../types/shrine';
import { buildSearchDocs } from '../searchDocs';
import { processTerm, INDEX_FIELDS } from '../search.worker';
import { makeShrineRow } from '../../../test/utils';

/** Only the fields buildSearchDocs reads; everything else is irrelevant to
 * the index and would just be noise here. */
function makeShrine(overrides: Partial<Shrine>): Shrine {
  return {
    id: 1,
    name: 'Data Darbar',
    location: 'Lahore, Punjab, Pakistan',
    sufiSaint: 'Hazrat Data Ganj Bakhsh (Ali Hujwiri)',
    category: 'Muslim Shrine',
    raw: makeShrineRow(),
    ...overrides,
  } as Shrine;
}

describe('buildSearchDocs — the Urdu side of the index', () => {
  // The 21 Aug 2026 parity bug: urduName was read from a sheet column that
  // doesn't exist, so it was '' for every document and Urdu-script queries
  // found nothing the UI itself displays. These tests pin the fix: the index
  // carries the same Urdu strings the reader sees.

  it('indexes the dictionary Urdu name the UI displays, not just the (absent) sheet column', () => {
    const [doc] = buildSearchDocs([makeShrine({})]);
    // 'Data Darbar' is a seed-dictionary entry; the exact rendering comes
    // from urdu-seed.json, so assert script rather than one fixed spelling.
    expect(doc.urduName).not.toBe('');
    expect(doc.urduName).toMatch(/[؀-ۿ]/);
    expect(doc.urduName).not.toMatch(/[A-Za-z]/);
  });

  it('prefers a sheet-provided Urdu Name column when one exists', () => {
    const [doc] = buildSearchDocs([
      makeShrine({ raw: makeShrineRow({ 'Urdu Name': 'داتا دربار (شیٹ)' }) }),
    ]);
    expect(doc.urduName).toBe('داتا دربار (شیٹ)');
  });

  it('leaves urduName empty when no translation exists, instead of duplicating the English', () => {
    const [doc] = buildSearchDocs([
      makeShrine({
        name: 'Zz Nonexistent Placeholder Shrine',
        raw: makeShrineRow({ Name: 'Zz Nonexistent Placeholder Shrine' }),
      }),
    ]);
    expect(doc.urduName).toBe('');
  });

  it('carries Urdu location and saint variants when the dictionary has them', () => {
    const [doc] = buildSearchDocs([makeShrine({})]);
    // Both source strings are covered by the seed dictionary's location/saint
    // maps (the dictionary build gates on 100% coverage of dataset values).
    expect(doc.urduLocation).toMatch(/[؀-ۿ]/);
    expect(doc.urduSaint).toMatch(/[؀-ۿ]/);
  });

  it('emits exactly the fields the worker indexes, and no others', () => {
    /* The invariant that would have caught §9.146. Production built its
       documents from a second, inlined copy of this builder for nine days, and
       nothing could see the difference: MiniSearch indexes a missing field as
       undefined and ignores an unknown one, so a drifted document set neither
       throws nor logs — it just searches differently. Both halves now read one
       list. */
    const [doc] = buildSearchDocs([makeShrine({})]);
    expect(Object.keys(doc).sort()).toEqual(['id', ...INDEX_FIELDS].sort());
  });

  it('leaves urduCategory empty rather than duplicating the English category', () => {
    const [doc] = buildSearchDocs([makeShrine({ category: 'Zz Nonexistent Category' })]);
    expect(doc.urduCategory).toBe('');
  });

  it('an Urdu-script query finds the shrine through the same index config the worker uses', () => {
    const docs = buildSearchDocs([
      makeShrine({}),
      makeShrine({
        id: 2,
        name: 'Zz Nonexistent Placeholder Shrine',
        location: '',
        sufiSaint: '',
        raw: makeShrineRow({ Name: 'Zz Nonexistent Placeholder Shrine' }),
      }),
    ]);
    const ms = new MiniSearch({
      idField: 'id',
      fields: ['name', 'urduName', 'location', 'urduLocation', 'saint', 'urduSaint'],
      storeFields: [],
      processTerm,
      searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'OR' },
    });
    ms.addAll(docs);

    const urduQuery = docs[0].urduName.split(/\s+/)[0]; // first word of the displayed Urdu name
    const hits = ms.search(urduQuery).map((r) => r.id);
    expect(hits).toContain(1);
    expect(hits).not.toContain(2);
  });
});
