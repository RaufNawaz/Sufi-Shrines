import { describe, it, expect } from 'vitest';
import MiniSearch from 'minisearch';
import { processTerm } from '../search.worker';

describe('processTerm', () => {
  it.each([
    ['علي', 'علی'], // ي (Arabic yeh) -> ی (Urdu yeh)
    ['مكة', 'مکہ'], // ك (Arabic kaf) -> ک; ة (teh marbuta) -> ہ
    ['اهل', 'اہل'], // ه (Arabic heh) -> ہ (Urdu heh)
    ['أحمد', 'احمد'], // أ -> ا
    ['إحسان', 'احسان'], // إ -> ا
    ['آصف', 'اصف'], // آ -> ا
    ['قائد', 'قاید'], // ئ -> ی
    ['ABC', 'abc'], // lowercases Latin
  ])('folds %s to %s', (input, expected) => {
    expect(processTerm(input)).toBe(expected);
  });

  it('strips Arabic harakat (U+064B-U+0652)', () => {
    const withHarakat = 'مُحَمَّد';
    expect(processTerm(withHarakat)).toBe('محمد');
  });

  it('strips the superscript alef (U+0670)', () => {
    const withSuperscriptAlef = 'رَحْمٰن';
    expect(processTerm(withSuperscriptAlef)).not.toMatch(/[ٰ]/);
  });

  it('strips ZWNJ/ZWJ (U+200C/U+200D)', () => {
    const withZwnj = `می${'‌'}ں`;
    expect(processTerm(withZwnj)).toBe('میں');
  });
});

describe('search index with processTerm applied', () => {
  function makeIndex(docs: { id: number; urduName: string }[]) {
    const ms = new MiniSearch<{ id: number; urduName: string }>({
      idField: 'id',
      fields: ['urduName'],
      processTerm,
      searchOptions: { prefix: true, fuzzy: 0.2 },
    });
    ms.addAll(docs);
    return ms;
  }

  it('an Arabic-keyboard spelling matches an Urdu-keyboard-spelled doc', () => {
    const ms = makeIndex([{ id: 1, urduName: 'علی ہجویری' }]);
    // Every yeh below is the Arabic form (U+064A) instead of Urdu (U+06CC).
    const results = ms.search('علي ہجويري');
    expect(results.map((r) => r.id)).toContain(1);
  });

  it('prefix-matches a partial Urdu query', () => {
    const ms = makeIndex([{ id: 1, urduName: 'داتا دربار' }]);
    const results = ms.search('داتا');
    expect(results.map((r) => r.id)).toContain(1);
  });
});
