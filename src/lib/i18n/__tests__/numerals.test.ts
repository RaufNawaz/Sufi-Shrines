import { describe, it, expect } from 'vitest';
import { toEasternDigits, localizeDigits } from '../numerals';

describe('toEasternDigits', () => {
  it('converts each Western digit to its Eastern Arabic-Indic equivalent', () => {
    expect(toEasternDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
  });

  it('converts digits embedded in a larger string, leaving other characters alone', () => {
    expect(toEasternDigits('8 stops · 42 km')).toBe('۸ stops · ۴۲ km');
  });

  it('accepts a number directly', () => {
    expect(toEasternDigits(2024)).toBe('۲۰۲۴');
  });

  it('is a no-op on strings with no digits', () => {
    expect(toEasternDigits('صوفی مزارات')).toBe('صوفی مزارات');
  });
});

describe('localizeDigits', () => {
  it('converts digits for Urdu when eastern is enabled', () => {
    expect(localizeDigits('12 km', 'ur', true)).toBe('۱۲ km');
  });

  it('leaves digits untouched for Urdu when eastern is disabled (Western toggle)', () => {
    expect(localizeDigits('12 km', 'ur', false)).toBe('12 km');
  });

  it('never converts digits for English regardless of the eastern flag', () => {
    expect(localizeDigits('12 km', 'en', true)).toBe('12 km');
    expect(localizeDigits('12 km', 'en', false)).toBe('12 km');
  });
});
