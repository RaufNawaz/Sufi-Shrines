import { useLocation } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { useArchiveSearch } from '../search/ArchiveSearchProvider';

/**
 * The way on from an address that names nothing: the archive search, already
 * holding the address's words. A reader with /shrine/data-darbaar or
 * /saint/mian-meer was offered only "Back to map", twice (loading council,
 * 17 October 2026); the search forgives the typo and finds the page meant.
 */
export function NotFoundSearch() {
  const { lang } = useLang();
  const { pathname } = useLocation();
  const search = useArchiveSearch();
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  let words = last;
  try {
    words = decodeURIComponent(last);
  } catch {
    // A malformed escape: search for it as written.
  }
  words = words.replace(/[-_]+/g, ' ').trim();
  if (!words) return null;
  return (
    <p className="coverage-intro">
      <button type="button" className="action-btn" onClick={() => search.open(words)}>
        {tFn(lang, 'notFoundSearch', words)}
      </button>
    </p>
  );
}
