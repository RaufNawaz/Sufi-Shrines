// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildUrduFallback, translateToUrdu } from '../urduFallback';

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
