import { describe, it, expect } from 'vitest';
import { LANGUAGES, isRtlLang, dirAttr, langAttr, DEFAULT_LANG } from '../languages';

describe('language metadata (N4 groundwork)', () => {
  it('declares direction for every language', () => {
    for (const meta of Object.values(LANGUAGES)) {
      expect(['ltr', 'rtl']).toContain(meta.dir);
    }
    expect(isRtlLang('ur')).toBe(true);
    expect(isRtlLang('en')).toBe(false);
  });

  it('attribute helpers omit the site default and mark everything else', () => {
    expect(langAttr(DEFAULT_LANG)).toBeUndefined();
    expect(langAttr('ur')).toBe('ur');
    expect(dirAttr('en')).toBeUndefined();
    expect(dirAttr('ur')).toBe('rtl');
  });
});
