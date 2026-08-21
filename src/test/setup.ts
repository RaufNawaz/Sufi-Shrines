import '@testing-library/jest-dom';
import { loadUrduSeed } from '../lib/i18n/urduFallback';

// jsdom does not implement IntersectionObserver (scroll-spy, etc.)
if (typeof IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

// jsdom does not implement ResizeObserver
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// This jsdom/Node combination doesn't expose window.localStorage /
// sessionStorage (throws-on-opaque-origin behavior misfiring even with a
// http: URL configured) — polyfill with a minimal in-memory Storage.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

// Guarded so pure-logic tests can run in the node environment (no window).
if (typeof window !== 'undefined') {
  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', { value: createMemoryStorage(), writable: true });
  }
  if (!window.sessionStorage) {
    Object.defineProperty(window, 'sessionStorage', {
      value: createMemoryStorage(),
      writable: true,
    });
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/* The Urdu dictionary is loaded on demand in the app (see the header of
 * src/lib/i18n/urduFallback.ts — 80 KB that an English reader never needs), so
 * a test that expects `translateToUrdu('Lahore')` to return لاہور has to say so.
 * Loaded here for every test file, because the loaded state is the one almost
 * every test means. A case that wants the *un*-loaded behaviour — an English
 * string returned unchanged rather than transliterated — calls
 * `resetUrduSeedForTests()` itself. */
await loadUrduSeed();
