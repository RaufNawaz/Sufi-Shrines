import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { dirAttr, isRtlLang } from '../../lib/i18n/languages';
import { useBackToClose } from '../../hooks/useBackToClose';

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
 * - Escape closes it, and so does the back gesture (`useBackToClose`);
 * - it leaves as it arrived — sinking on a phone, settling on a wide screen —
 *   instead of vanishing in one frame, and on a phone the grabber and header
 *   pull it down: it follows the finger and closes past a threshold or on a
 *   flick (council, 15 October 2026: the grabber was drawn and did nothing).
 *   A caller that sets `open` false itself still closes it at once.
 */

/** The motion token, read live: it is 0ms under reduced motion (tokens.css),
 *  and then a close is immediate. */
function durationBaseMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-base');
  const ms = parseFloat(raw);
  return Number.isFinite(ms) ? ms : 0;
}

const DISMISS_PX = 120;
const FLICK_SPEED = 0.45;
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
  /* 'animate': the exit keyframes run; 'dragged': the finger already moved the
     panel, so only the scrim fades while the panel finishes its slide. */
  const [closing, setClosing] = useState<null | 'animate' | 'dragged'>(null);
  const closeTimer = useRef<number | null>(null);

  const requestClose = useCallback(
    (how: 'animate' | 'dragged' = 'animate') => {
      if (closeTimer.current !== null) return;
      const ms = durationBaseMs();
      if (ms <= 0) {
        onClose();
        return;
      }
      setClosing(how);
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = null;
        setClosing(null);
        onClose();
      }, ms);
    },
    [onClose],
  );
  useEffect(() => {
    if (open) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setClosing(null);
  }, [open]);
  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );
  useBackToClose(open, requestClose);

  /* Pull-down on a phone. Native listeners so the move can be cancelled, and the
     transform written to the panel directly — no React state per frame. */
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return undefined;
    let drag: { y0: number; lastY: number; lastT: number; v: number; moved: boolean } | null = null;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (!window.matchMedia?.('(max-width: 640px)').matches) return;
      const target = e.target as Element | null;
      if (!target?.closest('.sheet-grabber, .sheet-header') || target.closest('button')) return;
      const y = e.touches[0].clientY;
      drag = { y0: y, lastY: y, lastT: e.timeStamp, v: 0, moved: false };
    };
    const onMove = (e: TouchEvent) => {
      if (!drag) return;
      const y = e.touches[0].clientY;
      const dy = Math.max(0, y - drag.y0);
      if (!drag.moved && dy < 6) return;
      drag.moved = true;
      drag.v = (y - drag.lastY) / Math.max(1, e.timeStamp - drag.lastT);
      drag.lastY = y;
      drag.lastT = e.timeStamp;
      panel.style.transition = 'none';
      panel.style.animation = 'none';
      panel.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      if (!drag) return;
      const { moved, v, y0 } = drag;
      drag = null;
      if (!moved) return;
      const dy = (e.changedTouches[0]?.clientY ?? y0) - y0;
      const ms = durationBaseMs();
      panel.style.transition = `transform ${ms}ms var(--easing)`;
      if (dy > DISMISS_PX || v > FLICK_SPEED) {
        panel.style.transform = 'translateY(100%)';
        requestClose('dragged');
      } else {
        panel.style.transform = '';
      }
    };
    panel.addEventListener('touchstart', onStart, { passive: true });
    panel.addEventListener('touchmove', onMove, { passive: false });
    panel.addEventListener('touchend', onEnd);
    panel.addEventListener('touchcancel', onEnd);
    return () => {
      panel.removeEventListener('touchstart', onStart);
      panel.removeEventListener('touchmove', onMove);
      panel.removeEventListener('touchend', onEnd);
      panel.removeEventListener('touchcancel', onEnd);
    };
  }, [open, requestClose]);

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
        requestClose();
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
  }, [open, requestClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`sheet-backdrop${closing ? ' sheet-backdrop--closing' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={panelRef}
        className={`sheet${closing === 'animate' ? ' sheet--closing' : ''}${className ? ` ${className}` : ''}`}
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
          <button type="button" className="sheet-done" onClick={() => requestClose()}>
            {t('sheetDone')}
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
