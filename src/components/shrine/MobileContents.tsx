import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { localizeProseDigits } from '../../lib/i18n/numerals';
import { Sheet } from '../ui/Sheet';
import type { ArticleNavItem } from './useArticleContent';
import { prefersReducedMotion } from '../../lib/motionPreference';
import { useActiveSection } from './useActiveSection';

/**
 * The article's contents on a phone: a floating pill that opens a sheet of
 * the sections. Under 640px the contents rail is hidden (shrine.css), so a
 * reader of a thirteen-section entry otherwise had no way to jump within it.
 * The pill is `display: none` above that width.
 */
export function MobileContents({ items }: { items: ArticleNavItem[] }) {
  const { lang, t, fmtNum, numerals } = useLang();
  const [open, setOpen] = useState(false);
  const activeId = useActiveSection(items);
  const active = items.find((item) => item.id === activeId);
  /* Between the phone and the wide-screen rail (640–1339px) the contents list
     is a static block near the top of the article, and once it had scrolled
     away there was nothing to navigate a fifteen-section entry with. The pill
     appears there too — only once that block is out of view. */
  const [railGone, setRailGone] = useState(false);
  useEffect(() => {
    const rail = document.querySelector('.contents-nav-rail');
    if (!rail || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setRailGone(!entry!.isIntersecting && entry!.boundingClientRect.top < 0),
    );
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);
  /* Stable, because `Sheet` keys its open effect on `onClose`: an inline arrow
     re-ran it on every render, re-recording the element to return focus to. */
  const close = useCallback(() => setOpen(false), []);
  /* The jump waits for the sheet to close. Scrolling from inside the click ran
     while the body was still scroll-locked, and the sheet's cleanup then
     returned focus to the pill. This effect runs after the sheet's cleanup in
     the same commit, so the scroll lands last. */
  const target = useRef<string | null>(null);
  useEffect(() => {
    if (open || !target.current) return;
    const el = document.getElementById(target.current);
    target.current = null;
    const reduce = prefersReducedMotion();
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`mobile-sections-btn no-print${railGone ? ' mobile-sections-btn--floating' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        /* The section a reader is in, as the pill's text; "Contents" is what
           it opens, so it leads the accessible name. */
        aria-label={
          active
            ? `${t('contents')}: ${localizeProseDigits(active.label, lang, numerals === 'eastern')}`
            : undefined
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
        <span className="mobile-sections-label">
          {active ? localizeProseDigits(active.label, lang, numerals === 'eastern') : t('contents')}
        </span>
      </button>
      <Sheet open={open} onClose={close} title={t('contents')} className="mobile-toc-sheet">
        <div className="mobile-toc-sheet-body">
          <ul className="inset-list mobile-toc-list">
            {items.map((item, i) => (
              <li
                key={item.id}
                className={`inset-row inset-row--link${item.id === activeId ? ' mobile-toc-current' : ''}`}
              >
                <button
                  type="button"
                  className="mobile-toc-item-btn"
                  aria-current={item.id === activeId ? 'location' : undefined}
                  onClick={() => {
                    target.current = item.id;
                    setOpen(false);
                  }}
                >
                  <span className="mobile-toc-num">{fmtNum(i + 1)}</span>
                  <span className="inset-row-label">
                    {localizeProseDigits(item.label, lang, numerals === 'eastern')}
                  </span>
                  <span className="inset-row-chevron" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Sheet>
    </>
  );
}
