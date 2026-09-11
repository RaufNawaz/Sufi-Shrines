import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { AlmanacEntry } from '../../lib/data/almanac';
import type { Lang } from '../../types/shrine';
import { ObservanceCard } from './ObservanceCard';

/**
 * The detail a calendar chip opens.
 *
 * Google Calendar's grid names an event and shows the rest on a click; this is
 * that click. On a desktop it is a small panel anchored under the chip, inside
 * the calendar's own box so it never leaves the page column; on a phone it is a
 * bottom sheet, because a 22rem panel anchored to a 50px cell has nowhere to
 * go. Both render `ObservanceCard` — the same card the list view uses, so the
 * recorded date, the projection and the caveat that separates them cannot be
 * present in one place and missing in another (HANDOVER §9.85).
 *
 * Not `aria-modal`: it is a disclosure, the page behind it stays reachable, and
 * a modal that trapped focus in a calendar would be worse than the grid it
 * covers. Escape closes it and hands focus back to the chip that opened it;
 * pressing elsewhere closes it too.
 */
export function ObservancePopover({
  entries,
  title,
  anchor,
  container,
  lang,
  showApproximateFlag,
  onClose,
}: {
  entries: AlmanacEntry[];
  /** The date, in words — the dialog's accessible name. */
  title: string;
  /** The chip or "+N more" button that opened this; focus returns to it. */
  anchor: HTMLElement;
  /** The calendar root, which the panel is positioned within. */
  container: HTMLElement;
  lang: Lang;
  showApproximateFlag: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  /* Under the anchor, left-aligned with it, and clamped so the panel's far edge
     stays inside the calendar. Physical `left`, not a logical inset: the
     numbers come from `getBoundingClientRect`, which is physical in both
     directions, and in RTL the clamp is the same clamp. */
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      const width = rootRef.current?.offsetWidth ?? 352;
      const left = Math.max(0, Math.min(a.left - c.left, c.width - width));
      setPos({ top: a.bottom - c.top + 4, left });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, container]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      // The chips toggle themselves; closing here as well would reopen on click.
      if ((target as Element).closest?.('[data-almanac-chip]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointerDown);
      anchor.focus();
    };
  }, [anchor, onClose]);

  return (
    <div
      ref={rootRef}
      className="almanac-pop reveal-rise"
      role="dialog"
      aria-labelledby={titleId}
      style={
        pos
          ? ({ '--pop-top': `${pos.top}px`, '--pop-left': `${pos.left}px` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="almanac-pop-head">
        <p id={titleId} className="almanac-pop-title">
          {title}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="almanac-pop-close"
          aria-label={t('almanacCalendarClose')}
          onClick={onClose}
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
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
      <ul className="almanac-list almanac-pop-list">
        {entries.map((entry, i) => (
          <ObservanceCard
            key={`${entry.shrine.slug}-${i}`}
            entry={entry}
            lang={lang}
            index={i}
            showApproximateFlag={showApproximateFlag}
          />
        ))}
      </ul>
    </div>
  );
}
