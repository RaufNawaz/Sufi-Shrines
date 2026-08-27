/**
 * The reading size, stored and applied.
 *
 * The contract worth pinning is the attribute half: `medium` writes *no*
 * attribute rather than `data-text-size="medium"`, so the default state of the
 * DOM is the default state of the preference and the stylesheet has one way to
 * say "unchanged" instead of two. Two ways is how one of them drifts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TEXT_SIZE_STORAGE_KEY } from '../storageKeys';
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZES,
  applyTextSize,
  readTextSize,
  writeTextSize,
} from '../textSizePreference';

describe('textSizePreference', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-size');
  });

  it('offers three steps and defaults to the middle one', () => {
    expect([...TEXT_SIZES]).toEqual(['small', 'medium', 'large']);
    expect(DEFAULT_TEXT_SIZE).toBe('medium');
    expect(readTextSize()).toBe('medium');
  });

  it('round-trips every step', () => {
    for (const size of TEXT_SIZES) {
      writeTextSize(size);
      expect(readTextSize()).toBe(size);
    }
  });

  it('falls back to the default for a value it did not write', () => {
    for (const stored of ['huge', 'MEDIUM', '', '1.5', 'null']) {
      localStorage.setItem(TEXT_SIZE_STORAGE_KEY, stored);
      expect(readTextSize(), `stored ${JSON.stringify(stored)}`).toBe(DEFAULT_TEXT_SIZE);
    }
  });

  it('writes no attribute for the default, so the plain DOM is the default', () => {
    const root = document.documentElement;
    applyTextSize('large', root);
    expect(root.getAttribute('data-text-size')).toBe('large');
    applyTextSize('medium', root);
    expect(root.hasAttribute('data-text-size')).toBe(false);
  });

  it('replaces rather than accumulates when the reader changes their mind', () => {
    const root = document.documentElement;
    applyTextSize('small', root);
    applyTextSize('large', root);
    expect(root.getAttribute('data-text-size')).toBe('large');
  });

  it('survives storage that throws', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem() {
          throw new Error('denied');
        },
        setItem() {
          throw new Error('denied');
        },
      },
      writable: true,
    });
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE);
    expect(() => writeTextSize('large')).not.toThrow();
    Object.defineProperty(window, 'localStorage', { value: original, writable: true });
  });
});
