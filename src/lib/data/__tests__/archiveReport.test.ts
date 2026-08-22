import { describe, it, expect } from 'vitest';
import type { Shrine } from '../../../types/shrine';
import { buildArchiveReport, summarizeProvenance } from '../archiveReport';
import { makeShrineRow } from '../../../test/utils';

function shrine(over: Partial<Shrine> & { descriptionUrdu?: string }): Shrine {
  const { descriptionUrdu, ...rest } = over;
  return {
    id: Math.random(),
    name: 'X',
    category: 'Muslim Shrine',
    supportLevel: '',
    infoLevel: '',
    status: '',
    raw: makeShrineRow(descriptionUrdu ? { 'Description Urdu': descriptionUrdu } : {}),
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

  it('counts an Urdu article from any of the aliased Urdu columns', () => {
    const r = buildArchiveReport([
      shrine({ descriptionUrdu: 'مضمون' }),
      shrine({}), // none
    ]);
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
