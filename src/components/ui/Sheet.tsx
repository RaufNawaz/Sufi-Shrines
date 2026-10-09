import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { dirAttr, isRtlLang } from '../../lib/i18n/languages';

/**
 * A sheet: a page laid over the current one for a scoped task, in the shape
 * Apple's Human Interface Guidelines give it — focused, modal, dismissed with
 * Done (or Escape, or a tap on the dimmed page behind it). Centred and large on
 * a wide screen; on a phone it rises from the bottom to nearly the full height,
 * with a grabber, the way an iOS page sheet does.
 *
 * Added 9 October 2026 for the figure index on /graph (Rauf: "an interactable
 * thing that opens an overlayed page"). Kept generic because the archive has
 * other long lists that are reference rather than reading.
 *
 * What it owns, so a caller does not have to remember it:
 * - `role="dialog"` + `aria-modal`, named by its own title;
 * - focus moves in on open, Tab cycles inside, and focus returns to whatever
 *   opened it on close;
 * - the page behind does not scroll while it is open;
 * - Escape closes it.
 */
export function Sheet({
  open,
  title,
  subtitle,
  onClose,
  children,
  className,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { lang, t } = useLang();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    /* The first field if there is one — a sheet that holds a search is opened
       to search — otherwise the panel itself. */
    const panel = panelRef.current;
    const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? true;
    /* …but only where there is a keyboard to type with: on a phone, focusing
       the field raises the on-screen keyboard over the list the reader came to
       browse. There the panel takes focus, and the field is one tap away. */
    const first = finePointer
      ? panel?.querySelector<HTMLElement>('input, [data-sheet-autofocus]')
      : null;
    (first ?? panel)?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      returnFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`sheet${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        lang={isRtlLang(lang) ? 'ur' : undefined}
        dir={dirAttr(lang)}
      >
        <span className="sheet-grabber" aria-hidden="true" />
        <header className="sheet-header">
          <div className="sheet-heading">
            <h2 id={titleId} className="sheet-title">
              {title}
            </h2>
            {subtitle && <p className="sheet-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="sheet-done" onClick={onClose}>
            {t('sheetDone')}
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
