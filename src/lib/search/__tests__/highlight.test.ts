// @vitest-environment node
/**
 * A highlight is a claim about the text.
 *
 * The archive's search is MiniSearch with prefix and fuzzy matching, so a row can
 * match a query that appears nowhere in the name it displays — through an
 * alternative name, a location, or a fuzzy edit. The tempting behaviour is to
 * mark *something* anyway so every row looks explained. That is a small lie in
 * the one place a reader is checking the archive's work, so the rule asserted
 * here is: mark only a literal run, and mark nothing when there is none.
 */
import { describe, it, expect } from 'vitest';
import { highlightRanges, highlightSegments } from '../highlight';

const marked = (text: string, query: string) =>
  highlightSegments(text, query)
    .filter((s) => s.match)
    .map((s) => s.text);

describe('highlighting a match', () => {
  it('marks the literal run, case-insensitively', () => {
    expect(marked('Shrine of Baba Shah Chiragh', 'chiragh')).toEqual(['Chiragh']);
    expect(marked('Data Darbar', 'DATA')).toEqual(['Data']);
  });

  it('marks nothing when the query is not in the text', () => {
    /* A fuzzy or alternative-name hit. The row is still a correct result; the
       name simply does not contain the query, and pretending otherwise would
       put a mark under text that does not match it. */
    expect(highlightRanges('Data Darbar', 'hujwiri')).toEqual([]);
    expect(marked('Data Darbar', 'hujwiri')).toEqual([]);
  });

  it('marks every token of a multi-word query', () => {
    expect(marked('Shrine of Shah Jamal', 'shah jamal')).toEqual(['Shah', 'Jamal']);
  });

  it('merges overlapping runs rather than nesting them', () => {
    const segments = highlightSegments('Shahjamal', 'shah shahj');
    expect(segments.filter((s) => s.match).map((s) => s.text)).toEqual(['Shahj']);
    expect(segments.map((s) => s.text).join('')).toBe('Shahjamal');
  });

  it('works in Urdu, which has no case to fold', () => {
    expect(marked('مزار بابا شاہ چراغ', 'شاہ')).toEqual(['شاہ']);
    expect(marked('داتا دربار', 'دربار')).toEqual(['دربار']);
  });

  it('ignores a one-character query rather than striping the list', () => {
    expect(highlightRanges('Data Darbar', 'a')).toEqual([]);
  });

  it('treats a query as text, not as a pattern', () => {
    /* The query is whatever the reader typed. `.` must match a dot. */
    expect(marked('Shrine of A.B. Qadri', '.b.')).toEqual(['.B.']);
    expect(() => highlightRanges('anything', '(')).not.toThrow();
    expect(highlightRanges('anything', '(')).toEqual([]);
  });

  it('always reassembles into exactly the original string', () => {
    /* The property that matters most: this drives what a reader sees, so a
       dropped or duplicated character is a corrupted name on screen. */
    for (const [text, query] of [
      ['Shrine of Baba Shah Chiragh', 'shah'],
      ['مزار بابا شاہ چراغ', 'شاہ'],
      ['Data Darbar', ''],
      ['Data Darbar', 'data darbar'],
      ['', 'x'],
    ] as const) {
      expect(
        highlightSegments(text, query)
          .map((s) => s.text)
          .join(''),
      ).toBe(text);
    }
  });
});
