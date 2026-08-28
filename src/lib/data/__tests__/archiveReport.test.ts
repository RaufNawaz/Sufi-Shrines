import { describe, it, expect } from 'vitest';
import type { Shrine } from '../../../types/shrine';
import { buildArchiveReport, summarizeProvenance } from '../archiveReport';
import { makeShrineRow } from '../../../test/utils';

function shrine(over: Partial<Shrine> & { descriptionUrdu?: string }): Shrine {
  const { descriptionUrdu, ...rest } = over;
  /* The Name reaches `raw` as well as the model, because the Urdu-article count
     joins on the row's name (urduArticleIndex.ts) and the two disagreeing is
     the sort of fixture that tests the harness rather than the code. */
  return {
    id: Math.random(),
    name: 'X',
    category: 'Muslim Shrine',
    supportLevel: '',
    infoLevel: '',
    status: '',
    raw: makeShrineRow({
      ...(descriptionUrdu ? { 'Description Urdu': descriptionUrdu } : {}),
      ...(over.name ? { Name: over.name } : {}),
    }),
    ...rest,
  } as Shrine;
}

describe('buildArchiveReport', () => {
  it('buckets every shrine exactly once per dimension, unknowns included', () => {
    const r = buildArchiveReport([
      shrine({ supportLevel: 'Field-verified', infoLevel: 'Full', status: 'Active' }),
      shrine({ supportLevel: 'Web-compiled', infoLevel: 'Low', status: 'Ruin' }),
      shrine({ supportLevel: '', infoLevel: '', status: '' }), // nothing recorded
    ]);
    expect(r.totalShrines).toBe(3);

    const supportSum =
      Object.values(r.supportLevels).reduce((a, b) => a + b, 0) + r.supportUnknown;
    const infoSum = Object.values(r.infoLevels).reduce((a, b) => a + b, 0) + r.infoUnknown;
    const statusSum = Object.values(r.statuses).reduce((a, b) => a + b, 0) + r.statusUnknown;
    // The invariant that matters: nothing vanishes, nothing double-counts.
    expect(supportSum).toBe(3);
    expect(infoSum).toBe(3);
    expect(statusSum).toBe(3);

    expect(r.supportLevels['field-verified']).toBe(1);
    expect(r.supportUnknown).toBe(1);
    expect(r.statuses.ruin).toBe(1);
  });

  /* `makeShrineRow` names every fixture "Data Darbar", and that entry *does*
     have an Urdu article — so once the count learned to read the in-repo index
     as well as the row (see urduArticleCountIsLanguageIndependent.test.ts), a
     fixture meaning "no Urdu here" had to stop borrowing a real entry's name.
     Both sources are asserted separately now, because they are two ways to be
     counted and a single number cannot tell you which one fired. */
  it('counts an Urdu article from any of the aliased Urdu columns', () => {
    const r = buildArchiveReport([
      shrine({ name: 'Nowhere Sharif', descriptionUrdu: 'مضمون' }),
      shrine({ name: 'Nowhere Sharif' }), // no Urdu column, and no article in the index
    ]);
    expect(r.urduDrafted).toBe(1);
  });

  it('counts an entry whose Urdu article is in the in-repo index, not the sheet', () => {
    // No `Description Urdu` column anywhere in the sheet; the article for this
    // slug lives in src/data/urdu-content.json and is listed in the index.
    const r = buildArchiveReport([shrine({}), shrine({ name: 'Nowhere Sharif' })]);
    expect(r.urduDrafted).toBe(1);
  });

  it('sorts categories by count, descending', () => {
    const r = buildArchiveReport([
      shrine({ category: 'Hindu Temple' }),
      shrine({ category: 'Muslim Shrine' }),
      shrine({ category: 'Muslim Shrine' }),
    ]);
    expect(r.categories.map((c) => c.label)).toEqual(['Muslim Shrine', 'Hindu Temple']);
  });
});

describe('summarizeProvenance', () => {
  it('summarizes citations and tiers from Description provenance only', () => {
    const s = summarizeProvenance({
      shrines: [
        { fields: { Description: { contentTier: 'ai-researched', citations: [{}] } } },
        { fields: { Description: { contentTier: 'tier1-ocr', citations: [] } } },
        { fields: {} }, // no Description provenance at all
      ],
    });
    expect(s.tracked).toBe(3);
    expect(s.withCitations).toBe(1);
    expect(s.aiResearched).toBe(1);
    expect(s.primarySource).toBe(1);
  });
});
