/**
 * Turning the animations off without an operating system that offers it.
 *
 * The contract in `styles/motion.css` is a medical one and the OS setting is its
 * primary channel, correctly — it should follow the person, not the site. This
 * preference is for the reader it leaves out: a borrowed phone, a shared
 * machine, an Android build whose accessibility panel does not expose it.
 *
 * The design decision under test is the *absence* of a third value. There is no
 * `full`, because honouring "the OS says reduce and I want the animations
 * anyway" would mean un-disabling twelve per-selector escapes across eight
 * stylesheets, each of which exists so a specific animation cannot come back by
 * accident. This preference can only ever reduce motion.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MOTION_STORAGE_KEY } from '../storageKeys';
import {
  DEFAULT_MOTION,
  applyMotionPreference,
  readMotionPreference,
  writeMotionPreference,
} from '../motionPreference';

describe('motionPreference', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-motion');
  });

  it('follows the device until the reader says otherwise', () => {
    expect(DEFAULT_MOTION).toBe('system');
    expect(readMotionPreference()).toBe('system');
  });

  it('round-trips', () => {
    writeMotionPreference('reduced');
    expect(readMotionPreference()).toBe('reduced');
    writeMotionPreference('system');
    expect(readMotionPreference()).toBe('system');
  });

  it('can only ever reduce, never restore', () => {
    /* A stored 'full' — from a hand-edited storage entry, or a future version
       that added one and was rolled back — must not be honoured, because
       honouring it means overriding a medical setting. */
    for (const stored of ['full', 'always', 'on', 'true']) {
      localStorage.setItem(MOTION_STORAGE_KEY, stored);
      expect(readMotionPreference(), `stored ${stored}`).toBe('system');
    }
  });

  it('writes no attribute for the default, so the plain DOM follows the OS', () => {
    const root = document.documentElement;
    applyMotionPreference('reduced', root);
    expect(root.getAttribute('data-motion')).toBe('reduced');
    applyMotionPreference('system', root);
    expect(root.hasAttribute('data-motion')).toBe(false);
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
    expect(readMotionPreference()).toBe(DEFAULT_MOTION);
    expect(() => writeMotionPreference('reduced')).not.toThrow();
    Object.defineProperty(window, 'localStorage', { value: original, writable: true });
  });
});
