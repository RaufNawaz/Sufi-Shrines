import { readStorage, writeStorage } from '../safeStorage';
import { detectInitialLang } from '../i18n/detectLang';

/* Safari with "Block All Cookies" throws on reading localStorage, not only on
   writing it: these are the startup paths that used to leave a blank page. */
describe('safeStorage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads and writes normally', () => {
    expect(writeStorage('safe-storage-test', 'x')).toBe(true);
    expect(readStorage('safe-storage-test')).toBe('x');
    localStorage.removeItem('safe-storage-test');
  });

  it('degrades to null / false when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(readStorage('anything')).toBeNull();
    expect(writeStorage('anything', 'x')).toBe(false);
    expect(['en', 'ur']).toContain(detectInitialLang());
  });
});
