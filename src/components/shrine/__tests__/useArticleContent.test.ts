import { describe, it, expect } from 'vitest';
import { anchorSlug } from '../useArticleContent';

describe('anchorSlug', () => {
  it('slugifies Latin headings as before', () => {
    expect(anchorSlug('History')).toBe('history');
    expect(anchorSlug('Events & Urs')).toBe('eventsurs');
  });

  it('gives distinct Urdu headings distinct, stable ids instead of colliding on "section"', () => {
    const a = anchorSlug('خلاصہ');
    const b = anchorSlug('تاریخی پس منظر');
    const c = anchorSlug('مذہبی اہمیت');
    expect(new Set([a, b, c]).size).toBe(3);
    // stable across calls
    expect(anchorSlug('خلاصہ')).toBe(a);
  });
});
