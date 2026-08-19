// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { localizeProseDigits } from '../numerals';

const ur = (s: string) => localizeProseDigits(s, 'ur', true);

describe('localizeProseDigits', () => {
  it('converts years inside Urdu prose', () => {
    expect(ur('(تقریباً 1873–1966)')).toBe('(تقریباً ۱۸۷۳–۱۹۶۶)');
  });

  it('leaves English and the Western-numeral setting alone', () => {
    expect(localizeProseDigits('c. 1873–1966', 'en', true)).toBe('c. 1873–1966');
    expect(localizeProseDigits('1873', 'ur', false)).toBe('1873');
  });

  it('returns the input untouched when it holds no digits', () => {
    const text = 'شمس علی قلندر';
    expect(ur(text)).toBe(text);
  });

  describe('never rewrites an identifier', () => {
    it('keeps URL digits Western', () => {
      const out = ur('دیکھیے https://example.org/a/1873/page2 سنہ 1966 میں');
      expect(out).toContain('https://example.org/a/1873/page2');
      expect(out).toContain('۱۹۶۶');
    });

    it('keeps a bare domain intact', () => {
      expect(ur('www.archive1.org پر 1966')).toContain('www.archive1.org');
    });

    it('keeps DOIs and ISBNs intact', () => {
      expect(ur('doi: 10.1093/oi/1234 اور 1966')).toContain('10.1093/oi/1234');
      expect(ur('ISBN 978-0-19-512559-4 اور 1966')).toContain('978-0-19-512559-4');
    });

    it('keeps an email address intact', () => {
      expect(ur('rauf1@example.org کو 1966 میں')).toContain('rauf1@example.org');
    });

    it('converts on both sides of a locked run', () => {
      const out = ur('1873 https://x.org/9 1966');
      expect(out).toBe('۱۸۷۳ https://x.org/9 ۱۹۶۶');
    });
  });
});
