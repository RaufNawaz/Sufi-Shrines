// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { localizeHeading } from '../headingLabels';

describe('localizeHeading', () => {
  it('passes headings through unchanged in English', () => {
    expect(localizeHeading('Overview', 'en')).toBe('Overview');
  });

  it('maps known generic inline headings to Urdu, case-insensitively', () => {
    expect(localizeHeading('Overview', 'ur')).toBe('خلاصہ');
    expect(localizeHeading('overview', 'ur')).toBe('خلاصہ');
    expect(localizeHeading('Significance', 'ur')).toBe('اہمیت');
    expect(localizeHeading('Significance Today', 'ur')).toBe('اہمیت');
    expect(localizeHeading('Bibliography', 'ur')).toBe('کتابیات');
    expect(localizeHeading('References', 'ur')).toBe('کتابیات');
    expect(localizeHeading('Legacy', 'ur')).toBe('ورثہ');
    expect(localizeHeading('The Shrine', 'ur')).toBe('مزار');
  });

  it('maps ARTICLE_SECTION_DEFINITIONS titles to their existing Urdu titles', () => {
    expect(localizeHeading('History', 'ur')).toBe('تاریخ');
    expect(localizeHeading('Saint Biography', 'ur')).toBe('سوانح حیات');
    expect(localizeHeading('Events & Urs', 'ur')).toBe('تقریبات اور عرس');
  });

  it('passes through an unmapped/already-Urdu heading unchanged (never invents a translation)', () => {
    expect(localizeHeading('The Life of the Saint', 'ur')).toBe('The Life of the Saint');
    expect(localizeHeading('خلاصہ', 'ur')).toBe('خلاصہ');
  });
});
