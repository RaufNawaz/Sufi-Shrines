import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { localizeProseDigits } from '../../lib/i18n/numerals';
import { Sheet } from '../ui/Sheet';
import type { ArticleNavItem } from './useArticleContent';
import { prefersReducedMotion } from '../../lib/motionPreference';

/**
 * The article's contents on a phone: a floating pill that opens a sheet of
 * the sections. Under 640px the contents rail is hidden (shrine.css), so a
 * reader of a thirteen-section entry otherwise had no way to jump within it.
 * The pill is `display: none` above that width.
 */
export function MobileContents({ items }: { items: ArticleNavItem[] }) {
  const { lang, t, fmtNum, numerals } = useLang();
  const [open, setOpen] = useState(false);
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
        className="mobile-sections-btn no-print"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
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
        <span>{t('contents')}</span>
      </button>
      <Sheet open={open} onClose={close} title={t('contents')} className="mobile-toc-sheet">
        <div className="mobile-toc-sheet-body">
          <ul className="inset-list mobile-toc-list">
            {items.map((item, i) => (
              <li key={item.id} className="inset-row inset-row--link">
                <button
                  type="button"
                  className="mobile-toc-item-btn"
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
