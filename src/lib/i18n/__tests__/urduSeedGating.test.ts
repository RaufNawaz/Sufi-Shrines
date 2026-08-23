/**
 * The Urdu dictionary is loaded on demand, and the un-loaded window has to be
 * safe rather than merely brief.
 *
 * 80 KB of dictionary used to ride on every route, English readers included
 * (see the header of urduFallback.ts). Making it lazy introduces a window in
 * which `translateToUrdu` is called and the dictionary is not there — and
 * `translateToUrdu` is called *synchronously during render*, so that window is
 * real, not theoretical. Two things must hold in it, and one must hold after it:
 *
 * 1. An unknown string comes back unchanged. It must never be transliterated
 *    character by character — that path was removed from this codebase
 *    deliberately (CLAUDE.md i18n rule 3) and a missing dictionary must not
 *    resurrect it.
 * 2. Nothing is *poisoned*. A lookup that misses is remembered in a `_misses`
 *    set so a permanent miss is not re-derived on every render; if that set
 *    survived the dictionary's arrival, the string would stay English for the
 *    rest of the session with its translation sitting in memory. This is the
 *    test that matters, and it is the one a hand-check would not think of.
 * 3. Once loaded, the dictionary is used.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  translateToUrdu,
  translateNameToUrdu,
  loadUrduSeed,
  isUrduSeedLoaded,
  onUrduSeedLoaded,
  resetUrduSeedForTests,
} from '../urduFallback';

/* The shared setup file loads the dictionary for every test file, because the
   loaded state is what nearly every test means. This file is the exception, so
   it starts from the un-loaded state and restores the loaded one at the end —
   worth being careful about, since the module's caches are module-level and a
   file left in the wrong state would change results elsewhere. */
beforeEach(() => {
  localStorage.clear();
  resetUrduSeedForTests();
});

afterAll(async () => {
  await loadUrduSeed();
});

describe('the Urdu dictionary before it arrives', () => {
  it('is reported as not loaded', () => {
    expect(isUrduSeedLoaded()).toBe(false);
  });

  /* "Uch Sharif" and not "Lahore": measured, 894 of the seed's 960 entries are
     translatable *only* from the seed, but the 66 that are not include the
     common city words, which urduFallback's own built-in maps already cover.
     Testing one of those would have proved nothing about the gating — the first
     draft of this file did exactly that and passed while measuring the built-in
     map. */
  it('returns a place name unchanged rather than transliterating it', () => {
    const out = translateToUrdu('Uch Sharif');
    expect(out).toBe('Uch Sharif');
    // Specifically: no Urdu letters invented from Latin ones.
    expect(out).not.toMatch(/[؀-ۿ]/);
  });

  it('returns a personal name unchanged too', () => {
    expect(translateNameToUrdu('Shah Rukn-e-Alam')).toBe('Shah Rukn-e-Alam');
  });

  it('still passes through text that needs no dictionary', () => {
    expect(translateToUrdu('داتا دربار')).toBe('داتا دربار');
    expect(translateToUrdu('https://example.org/x')).toBe('https://example.org/x');
    expect(translateToUrdu('')).toBe('');
  });
});

describe('the Urdu dictionary once it arrives', () => {
  it('translates what it holds', async () => {
    await loadUrduSeed();
    expect(isUrduSeedLoaded()).toBe(true);
    expect(translateToUrdu('Uch Sharif')).toBe('اوچ شریف');
    expect(translateNameToUrdu('Shah Rukn-e-Alam')).toBe('شاہ رکنِ عالم');
  });

  it('translates a string that was looked up and missed beforehand', async () => {
    /* Lowercased on purpose. `translateToUrdu` checks the exact key *before*
       the miss set, so a seed entry matched exactly survives a stale miss; the
       case-insensitive index is consulted *after* it, so this is the shape that
       actually gets poisoned — and the sheet is not consistent about case. The
       first draft of this test used the exact spelling and passed with
       `_misses.clear()` deleted, which proved the invalidation was untested
       rather than unnecessary. */
    expect(translateToUrdu('uch sharif')).toBe('uch sharif');
    expect(translateToUrdu('sehwan sharif')).toBe('sehwan sharif');
    await loadUrduSeed();
    expect(translateToUrdu('uch sharif')).toBe('اوچ شریف');
    expect(translateToUrdu('sehwan sharif')).toBe('سیہون شریف');
  });

  it('notifies subscribers, so a rendered view can re-render', async () => {
    let fired = 0;
    const unsubscribe = onUrduSeedLoaded(() => {
      fired++;
    });
    await loadUrduSeed();
    expect(fired).toBe(1);
    unsubscribe();
    // …and not again after unsubscribing.
    resetUrduSeedForTests();
    await loadUrduSeed();
    expect(fired).toBe(1);
  });

  it('shares one request between concurrent callers', async () => {
    const [a, b] = await Promise.all([loadUrduSeed(), loadUrduSeed()]);
    expect(a).toBe(b);
  });
});
