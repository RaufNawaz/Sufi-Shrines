import { describe, it, expect, beforeEach } from 'vitest';
import { getSavedSlugs, isSaved, toggleSaved } from '../savedShrines';
import { SAVED_SHRINES_STORAGE_KEY } from '../storageKeys';

beforeEach(() => {
  localStorage.clear();
  // Reset the module's raw-string cache by toggling through a known state.
  // (The cache keys on the raw localStorage string, so clearing storage and
  // reading again yields the empty list.)
});

describe('savedShrines store', () => {
  it('starts empty and round-trips a toggle through localStorage', () => {
    expect(getSavedSlugs()).toEqual([]);
    toggleSaved('data-darbar');
    expect(isSaved('data-darbar')).toBe(true);
    expect(JSON.parse(localStorage.getItem(SAVED_SHRINES_STORAGE_KEY)!)).toEqual(['data-darbar']);
  });

  it('toggle removes an already-saved slug and preserves the rest', () => {
    toggleSaved('a');
    toggleSaved('b');
    toggleSaved('a');
    expect(getSavedSlugs()).toEqual(['b']);
  });

  it('survives garbage in storage instead of crashing the app', () => {
    localStorage.setItem(SAVED_SHRINES_STORAGE_KEY, '{not json');
    expect(getSavedSlugs()).toEqual([]);
    localStorage.setItem(SAVED_SHRINES_STORAGE_KEY, JSON.stringify({ nope: 1 }));
    expect(getSavedSlugs()).toEqual([]);
    localStorage.setItem(SAVED_SHRINES_STORAGE_KEY, JSON.stringify(['ok', 42, null, 'fine']));
    expect(getSavedSlugs()).toEqual(['ok', 'fine']);
  });

  it('returns a stable reference between writes (useSyncExternalStore contract)', () => {
    toggleSaved('a');
    const first = getSavedSlugs();
    expect(getSavedSlugs()).toBe(first);
    toggleSaved('b');
    expect(getSavedSlugs()).not.toBe(first);
  });
});
