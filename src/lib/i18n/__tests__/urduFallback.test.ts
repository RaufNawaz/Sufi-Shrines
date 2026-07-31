// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildUrduFallback, resolveFoundedDate, translateToUrdu } from '../urduFallback';

describe('buildUrduFallback', () => {
  it('returns empty string for empty input', () => {
    expect(buildUrduFallback('')).toBe('');
  });

  it('passes through pure Urdu text unchanged', () => {
    expect(buildUrduFallback('مزار')).toBe('مزار');
  });

  it('translates known words from WORD_URDU_MAP', () => {
    expect(buildUrduFallback('lahore')).toBe('لاہور');
    expect(buildUrduFallback('karachi')).toBe('کراچی');
    expect(buildUrduFallback('pakistan')).toBe('پاکستان');
    expect(buildUrduFallback('shrine')).toBe('مزار');
  });

  it('handles century notation', () => {
    expect(buildUrduFallback('11th century')).toBe('11ویں صدی');
    expect(buildUrduFallback('12th century')).toBe('12ویں صدی');
  });

  it('translates special phrases', () => {
    expect(buildUrduFallback('Muslim Shrine')).toBe('مسلم مزار');
    expect(buildUrduFallback('Sikh Gurdwara')).toBe('سکھ گردوارہ');
  });

  it('never transliterates unknown words — leaves them in Latin script', () => {
    const result = buildUrduFallback('unknown');
    expect(result).toBe('unknown');
  });

  it('replaces commas with Urdu commas', () => {
    const result = buildUrduFallback('lahore, pakistan');
    expect(result).toContain('،');
  });
});

describe('translateToUrdu', () => {
  it('resolves known shrine names from the seed dictionary', () => {
    expect(translateToUrdu('Data Darbar')).not.toMatch(/[A-Za-z]/);
  });

  it('resolves known place names via the word-level fallback map', () => {
    const result = translateToUrdu('Lahore');
    expect(result).not.toMatch(/[A-Za-z]/);
  });

  it('returns the original string for unknown Latin input instead of transliterating', () => {
    const input = 'Some Totally Unmapped Proper Noun Xyzzy';
    expect(translateToUrdu(input)).toBe(input);
  });

  it('passes URLs through unchanged', () => {
    const url = 'https://example.com/path';
    expect(translateToUrdu(url)).toBe(url);
  });

  it('passes pure Urdu text through unchanged', () => {
    expect(translateToUrdu('مزار')).toBe('مزار');
  });
});

describe('resolveFoundedDate', () => {
  // Regression coverage: the seed dictionary caches whole-string
  // translations of raw sheet values, so translating "Completed/consecrated
  // 1640" as a whole would yield a fluent but still qualifier-laden Urdu
  // phrase that normalizeFoundedDate (Latin-only) could never clean up
  // afterwards — the qualifier must be stripped before translation, not after.
  it('strips the qualifier before formatting, in English', () => {
    const row = { 'Founded/Opened': 'Completed/consecrated 1640' };
    expect(resolveFoundedDate(row, 'en')).toBe('1640');
  });

  it('strips the qualifier before translation, in Urdu — not a translated qualifier phrase', () => {
    const row = { 'Founded/Opened': 'Completed/consecrated 1640' };
    const result = resolveFoundedDate(row, 'ur');
    expect(result).toBe('1640');
    expect(result).not.toMatch(/[A-Za-z]/);
  });

  it('uses a dedicated Founded/Opened Urdu column when present', () => {
    const row = {
      'Founded/Opened': 'Completed/consecrated 1640',
      'Founded/Opened Urdu': 'Consecrated 1640', // pretend hand-authored Urdu column with its own stray qualifier
    };
    expect(resolveFoundedDate(row, 'ur')).toBe('1640');
  });

  it('returns an empty string when there is no Founded/Opened value', () => {
    expect(resolveFoundedDate({}, 'en')).toBe('');
    expect(resolveFoundedDate({}, 'ur')).toBe('');
  });

  it('falls back to the plain "Founded" column when "Founded/Opened" is absent', () => {
    const row = { Founded: 'Built 1889' };
    expect(resolveFoundedDate(row, 'en')).toBe('1889');
  });
});
