// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { normalizeFoundedDate } from '../fieldAliasing';

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
