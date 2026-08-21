import { describe, it, expect } from 'vitest';
import { localizeObservance } from '../localizeObservance';

describe('localizeObservance', () => {
  it('leaves English alone', () => {
    expect(localizeObservance('Annual urs; daily langar', 'en')).toBe('Annual urs; daily langar');
  });

  it('translates each segment it knows', () => {
    const out = localizeObservance('Annual urs; daily langar', 'ur');
    expect(out).toContain('سالانہ عرس');
    expect(out).toContain('روزانہ لنگر');
    expect(out).not.toMatch(/[A-Za-z]/);
  });

  it('uses the Urdu semicolon once something translated', () => {
    expect(localizeObservance('Annual urs; qawwali', 'ur')).toContain('؛');
  });

  it('keeps an unknown segment verbatim rather than guessing', () => {
    // RULE 2: an invented Urdu observance would be worse than a visible gap.
    const out = localizeObservance('Annual urs; nightly Shah jo Raag', 'ur');
    expect(out).toContain('سالانہ عرس');
    expect(out).toContain('nightly Shah jo Raag');
  });

  it('keeps ASCII punctuation when nothing translated', () => {
    // Arabic punctuation around English fragments reads as a bug, not a
    // translation.
    const out = localizeObservance('nightly Shah jo Raag; ash-immersion rites', 'ur');
    expect(out).not.toContain('؛');
    expect(out).toContain('; ');
  });

  it('handles empty and missing values', () => {
    expect(localizeObservance('', 'ur')).toBe('');
    expect(localizeObservance(undefined, 'ur')).toBe('');
    expect(localizeObservance(null, 'ur')).toBe('');
  });
});
