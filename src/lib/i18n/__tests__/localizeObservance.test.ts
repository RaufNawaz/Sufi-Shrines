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

  it('isolates each run when the list ends up mixing scripts', () => {
    // Without per-run isolation the bidi algorithm reorders the English
    // fragments against the Urdu ones and the list reads jumbled.
    const mixed = localizeObservance('Annual urs; nightly Shah jo Raag', 'ur');
    expect(mixed).toContain('\u2068');
    expect(mixed).toContain('\u2069');
    // The Urdu segment must come first, as written.
    expect(mixed.indexOf('سالانہ عرس')).toBeLessThan(mixed.indexOf('nightly'));
  });

  it('adds no isolates to a list that does not mix scripts', () => {
    // Invisible control characters in text a reader may copy are a cost; only
    // pay it where it buys correct ordering.
    expect(localizeObservance('Annual urs; daily langar', 'ur')).not.toContain('\u2068');
    expect(localizeObservance('nightly Shah jo Raag', 'ur')).not.toContain('\u2068');
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
