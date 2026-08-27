import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { useArchiveSearch } from '../search/ArchiveSearchProvider';
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
/** What the observer uses before the first measurement lands — the token's
 * value, so the behaviour before paint is the behaviour this file replaced
 * rather than nothing at all. */
const FALLBACK_HEADER_HEIGHT = 56;

export function EntityPageHeader({ title }: { title?: string }) {
  const { t } = useLang();
  const search = useArchiveSearch();
  const [collapsed, setCollapsed] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(FALLBACK_HEADER_HEIGHT);

  /* The header's actual height, measured and published.
   *
   * `--header-height` is 56px and this header is not: it measures 71px on a
   * desktop viewport and 93px on a phone, because the action row wraps and its
   * controls grow to a 44px touch target. Nothing had noticed, for a reason
   * worth writing down — the three things that offset themselves against the
   * token (`.contents-nav`, `.shrine-infobox`, `.entity-infobox`) all add
   * `--space-4` to it, and 56 + 16 = 72 happens to clear a 71px header by a
   * pixel. The number was wrong and the sum was right, on desktop, by
   * coincidence. Those three are desktop-only layouts and are left alone; what
   * the coincidence does not survive is a phone, which is where the first
   * sticky element on a narrow screen found it (the order page's century
   * scale).
   *
   * So the height is measured rather than assumed, in a layout effect so it is
   * written before paint, and republished by a ResizeObserver because the thing
   * that changes it — the action row wrapping — is a resize. Guarded for the
   * prerenderer, which has no ResizeObserver. */
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => {
      const measured = Math.round(el.getBoundingClientRect().height);
      if (measured <= 0) return;
      document.documentElement.style.setProperty('--page-header-height', `${measured}px`);
      setHeaderHeight(measured);
    };
    publish();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      /* The header's own height, so the swap lands exactly as the title passes
         behind the bar. This was the literal `-56px`, which on a phone fired
         37px late — the title had been behind an opaque bar for most of a
         thumb-flick before the bar admitted to holding it. */
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );
    observer.observe(heading);
    return () => observer.disconnect();
  }, [title, headerHeight]);

  return (
    <header ref={headerRef} className="shrine-page-header no-print">
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
        {/* Guarded on `available` even though every page that renders this
            header is off the map today: the guard is what keeps two overlays
            from ever answering the same button if that stops being true. */}
        {search.available && (
          <button
            type="button"
            className="icon-btn"
            onClick={search.open}
            aria-label={t('paletteTitle')}
            title={t('paletteTitle')}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
        <DarkModeToggle />
        <LanguageToggle />
      </div>
    </header>
  );
}
