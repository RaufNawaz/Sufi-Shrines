/**
 * The entry page's two optional sections: two switches, two keys, one default.
 *
 * The contract is `toursPreference`'s, and the tests below are deliberately its
 * tests — default off, an explicit `'off'` on the way down, fail closed on a
 * value this module did not write, and never throw on storage that does. What
 * this file adds is the only thing that is different here: **there are two of
 * them, and they must not be able to move each other.** A reader who turns on
 * the mosque list has said nothing about shared ground.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  NEARBY_MOSQUES_SECTION_STORAGE_KEY,
  SHARED_GROUND_SECTION_STORAGE_KEY,
} from '../storageKeys';
import {
  DEFAULT_NEARBY_MOSQUES_SECTION,
  DEFAULT_SHARED_GROUND_SECTION,
  readNearbyMosquesSection,
  readSharedGroundSection,
  writeNearbyMosquesSection,
  writeSharedGroundSection,
} from '../shrineSectionPreferences';

const SWITCHES = [
  {
    name: 'shared ground',
    key: SHARED_GROUND_SECTION_STORAGE_KEY,
    read: readSharedGroundSection,
    write: writeSharedGroundSection,
    fallback: DEFAULT_SHARED_GROUND_SECTION,
  },
  {
    name: 'nearby Auqaf mosques',
    key: NEARBY_MOSQUES_SECTION_STORAGE_KEY,
    read: readNearbyMosquesSection,
    write: writeNearbyMosquesSection,
    fallback: DEFAULT_NEARBY_MOSQUES_SECTION,
  },
];

describe('shrineSectionPreferences', () => {
  beforeEach(() => localStorage.clear());

  for (const s of SWITCHES) {
    describe(s.name, () => {
      it('defaults to off, which is the editorial choice and not an accident', () => {
        expect(s.fallback).toBe(false);
        expect(s.read()).toBe(false);
      });

      it('round-trips both directions', () => {
        s.write(true);
        expect(s.read()).toBe(true);
        s.write(false);
        expect(s.read()).toBe(false);
      });

      it("writes an explicit 'off' rather than clearing the key", () => {
        /* What lets "the reader turned this off" be told apart from "the reader
           has never seen it". */
        s.write(false);
        expect(localStorage.getItem(s.key)).toBe('off');
      });

      it('treats any unexpected stored value as off rather than as on', () => {
        for (const stored of ['ON', 'true', '1', 'yes', '']) {
          localStorage.setItem(s.key, stored);
          expect(s.read(), `stored ${JSON.stringify(stored)}`).toBe(false);
        }
      });
    });
  }

  it('keeps the two switches independent', () => {
    writeSharedGroundSection(true);
    expect(readSharedGroundSection()).toBe(true);
    expect(readNearbyMosquesSection()).toBe(false);
    expect(localStorage.getItem(NEARBY_MOSQUES_SECTION_STORAGE_KEY)).toBeNull();

    writeNearbyMosquesSection(true);
    writeSharedGroundSection(false);
    expect(readNearbyMosquesSection()).toBe(true);
    expect(readSharedGroundSection()).toBe(false);
  });

  it('uses two distinct storage keys, neither of them another preference’s', () => {
    /* Cheap, and it is the mistake this shape invites: two switches written
       from one module, one of them pointed at the wrong constant. Nothing about
       the behaviour above would notice. */
    expect(SHARED_GROUND_SECTION_STORAGE_KEY).not.toBe(NEARBY_MOSQUES_SECTION_STORAGE_KEY);
    writeSharedGroundSection(true);
    expect(localStorage.getItem(SHARED_GROUND_SECTION_STORAGE_KEY)).toBe('on');
    expect(localStorage.length).toBe(1);
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
    for (const s of SWITCHES) {
      expect(() => s.read()).not.toThrow();
      expect(s.read()).toBe(s.fallback);
      expect(() => s.write(true)).not.toThrow();
    }
    Object.defineProperty(window, 'localStorage', { value: original, writable: true });
  });
});
