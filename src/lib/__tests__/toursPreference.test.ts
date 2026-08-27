/**
 * The tours switch is one switch, whichever surface flips it.
 *
 * `MapPage` read and wrote `TOURS_STORAGE_KEY` inline, with `=== 'on'` as its
 * idea of enabled and no written value for "off" on one of the two paths. Now
 * that `/settings` flips the same switch, two independent readings of one key is
 * how a preference starts disagreeing with itself — so both go through this
 * module and these tests pin the contract it has to keep.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TOURS_STORAGE_KEY } from '../storageKeys';
import { readToursEnabled, writeToursEnabled, DEFAULT_TOURS_ENABLED } from '../toursPreference';

describe('toursPreference', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to off, which is the editorial choice and not an accident', () => {
    expect(DEFAULT_TOURS_ENABLED).toBe(false);
    expect(readToursEnabled()).toBe(false);
  });

  it('round-trips both directions', () => {
    writeToursEnabled(true);
    expect(readToursEnabled()).toBe(true);
    writeToursEnabled(false);
    expect(readToursEnabled()).toBe(false);
  });

  it("writes an explicit 'off' rather than clearing the key", () => {
    /* The old inline code wrote 'on' and, on one path, nothing at all. An
       explicit 'off' is what lets "the reader turned this off" be told apart
       from "the reader has never seen it", which is the difference between
       respecting a choice and re-offering it. */
    writeToursEnabled(false);
    expect(localStorage.getItem(TOURS_STORAGE_KEY)).toBe('off');
  });

  it('treats any unexpected stored value as off rather than as on', () => {
    /* Fail closed: a stored value this module did not write must not switch on
       a feature the reader never asked for. */
    for (const stored of ['ON', 'true', '1', 'yes', '']) {
      localStorage.setItem(TOURS_STORAGE_KEY, stored);
      expect(readToursEnabled(), `stored ${JSON.stringify(stored)}`).toBe(false);
    }
  });

  it('survives storage that throws rather than returns null', () => {
    /* Safari in private mode, and any browser with site data blocked, throws
       from getItem. A preference is never worth an error boundary. */
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
    expect(() => readToursEnabled()).not.toThrow();
    expect(readToursEnabled()).toBe(DEFAULT_TOURS_ENABLED);
    expect(() => writeToursEnabled(true)).not.toThrow();
    Object.defineProperty(window, 'localStorage', { value: original, writable: true });
  });
});
