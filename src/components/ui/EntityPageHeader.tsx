import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { DarkModeToggle } from './DarkModeToggle';
import { LanguageToggle } from './LanguageToggle';

/**
 * The header every article page carries, with the title that arrives on scroll.
 *
 * Two things at once, and the second is why this exists as a component.
 *
 * **It was copied into ten pages.** Byte-for-byte in most, and *not* in three:
 * About, Coverage and Place had a back link with no chevron while the other
 * seven had one, so the same control looked like two different controls
 * depending on which page you reached it from. Nothing was going to notice that
 * — it is seven files apart.
 *
 * **And the title now follows the reader down.** A sticky bar that holds only a
 * back button is the least useful sticky bar there is: once the `<h1>` has
 * scrolled away, nothing on screen says which shrine or which figure this is,
 * which on an article eight sections long is most of the reading. The platform's
 * answer is the large title collapsing into the bar, and that is what this does.
 *
 * **Watched, not measured on scroll.** An IntersectionObserver on the page's own
 * `<h1>` fires twice per visit — once out, once back — where a scroll listener
 * fires on every frame of every scroll and has to be throttled into
 * approximating the same answer. The `rootMargin` is the header's own height, so
 * the swap happens exactly as the title passes behind the bar rather than when
 * it leaves the viewport entirely.
 *
 * **Conditionally rendered, never faded.** A cross-fade is the obvious
 * treatment and it is the one thing that must not be used here: axe folds an
 * ancestor's opacity into the colour it measures, so text mid-fade — or parked
 * at `opacity: 0` — reports a contrast failure that does not exist, and this
 * project has already lost an hour to exactly that (HANDOVER §9.46). The entry
 * animation is a transform only.
 */
export function EntityPageHeader({ title }: { title?: string }) {
  const { t } = useLang();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!title) return;
    /* The page's own heading, found rather than passed: the header renders
       inside each page, so the `<h1>` is in the same commit and is present by
       the time an effect runs. Threading a ref through ten pages buys nothing
       and is ten more places to forget. */
    const heading = document.querySelector('h1');
    if (!heading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setCollapsed(!entries[0].isIntersecting),
      // The header's height, so the swap lands as the title goes behind the bar.
      { rootMargin: '-56px 0px 0px 0px' },
    );
    observer.observe(heading);
    return () => observer.disconnect();
  }, [title]);

  return (
    <header className="shrine-page-header no-print">
      <Link to="/" className="back-link" aria-label={t('backToMap')}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {t('backToMap')}
      </Link>
      {collapsed && title && (
        /* `aria-hidden`, and not for tidiness: this is the `<h1>` said twice.
           A screen reader has already announced the page's heading, and a
           second copy appearing on scroll is noise a sighted reader never
           hears. `<bdi>` and `data-latin` because a recorded name may be Latin
           in the Urdu view (i18n rule 7). */
        <span className="page-header-title" aria-hidden="true" data-latin>
          <bdi>{title}</bdi>
        </span>
      )}
      <div className="shrine-page-header-actions">
        <DarkModeToggle />
        <LanguageToggle />
      </div>
    </header>
  );
}
