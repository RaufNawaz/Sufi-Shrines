// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  normalizeFoundedDate,
  normalizeRow,
  joinContinuationColumns,
  getFieldValue,
} from '../fieldAliasing';

describe('normalizeFoundedDate', () => {
  it('strips a combined "Completed/consecrated" qualifier', () => {
    expect(normalizeFoundedDate('Completed/consecrated 1640')).toBe('1640');
  });

  it('strips standalone qualifier words', () => {
    expect(normalizeFoundedDate('Completed 1889')).toBe('1889');
    expect(normalizeFoundedDate('Consecrated 1889')).toBe('1889');
    expect(normalizeFoundedDate('Built 1640')).toBe('1640');
    expect(normalizeFoundedDate('Founded 1210')).toBe('1210');
    expect(normalizeFoundedDate('Opened 1998')).toBe('1998');
    expect(normalizeFoundedDate('Constructed 1300')).toBe('1300');
    expect(normalizeFoundedDate('Established 1750')).toBe('1750');
  });

  it('is case-insensitive', () => {
    expect(normalizeFoundedDate('completed/consecrated 1640')).toBe('1640');
    expect(normalizeFoundedDate('BUILT 1640')).toBe('1640');
  });

  it('handles a qualifier followed by "in"', () => {
    expect(normalizeFoundedDate('Built in 1640')).toBe('1640');
    expect(normalizeFoundedDate('Founded in 1210 CE')).toBe('1210 CE');
  });

  it('handles a qualifier followed by a colon', () => {
    expect(normalizeFoundedDate('Founded: 1640')).toBe('1640');
  });

  it('does not mangle values that are already clean', () => {
    expect(normalizeFoundedDate('1640')).toBe('1640');
    expect(normalizeFoundedDate('17th century')).toBe('17th century');
    expect(normalizeFoundedDate('1210 CE')).toBe('1210 CE');
    expect(normalizeFoundedDate('')).toBe('');
  });

  it('does not strip qualifier-like words that are not a leading match', () => {
    expect(normalizeFoundedDate('1640, rebuilt 1820')).toBe('1640, rebuilt 1820');
  });
});

describe('continuation columns (Description 2..N, HANDOVER §9.336)', () => {
  const article = '## A\n\nfirst part\n\n## B\n\nsecond part\n\n## C\n\nthird part';

  it('joins Description 2..N back into Description with a blank line, in numeric order', () => {
    const row = normalizeRow({
      Name: 'X',
      'Description 3': '## C\n\nthird part',
      Description: '## A\n\nfirst part',
      'Description 2': '## B\n\nsecond part',
      'Description 4': '',
    });
    expect(row.Description).toBe(article);
    expect(getFieldValue(row, 'Description')).toBe(article);
  });

  it('leaves no Description N key behind (they would render as infobox fields)', () => {
    const row = normalizeRow({ Description: 'a', 'Description 2': 'b', 'Description 3': '' });
    expect(Object.keys(row).filter((k) => /^Description \d+$/.test(k))).toEqual([]);
    expect(row.Description).toBe('a\n\nb');
  });

  it('is a no-op on a row with no continuation columns, or with them all empty', () => {
    expect(normalizeRow({ Description: 'only' }).Description).toBe('only');
    expect(normalizeRow({ Description: 'only', 'Description 2': '  ' }).Description).toBe('only');
  });

  it('does not touch columns that merely end in a number', () => {
    const row = joinContinuationColumns({ Description: 'a', 'Image 2': 'u', 'Description Urdu': 'x' });
    expect(row['Image 2']).toBe('u');
    expect(row['Description Urdu']).toBe('x');
    expect(row.Description).toBe('a');
  });

  it('build-dataset.mjs carries the same join (the two copies must not drift)', () => {
    const src = readFileSync(
      new URL('../../../../scripts/data/build-dataset.mjs', import.meta.url),
      'utf8',
    );
    expect(src).toContain(
      "for (let n = 2, k = 'Description 2'; k in row; k = `Description ${++n}`) {",
    );
    expect(src).toContain(
      'if (s) row.Description = row.Description ? `${row.Description}\\n\\n${s}` : s;',
    );
    expect(src).toContain('return joinContinuationColumns(out);');
  });
});
