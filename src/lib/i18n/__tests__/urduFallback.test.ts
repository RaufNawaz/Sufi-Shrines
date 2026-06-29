import { describe, it, expect } from 'vitest';
import { buildUrduFallback } from '../urduFallback';

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

  it('falls back to transliteration for unknown words', () => {
    const result = buildUrduFallback('unknown');
    // Should produce something non-empty that uses Urdu characters
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('unknown');
  });

  it('replaces commas with Urdu commas', () => {
    const result = buildUrduFallback('lahore, pakistan');
    expect(result).toContain('،');
  });
});
