import React, { useEffect, useRef } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

/**
 * The thin bar at the top of an article that fills as the reader scrolls.
 *
 * **No React state, and no `width`.** It used to `setState` on every scroll
 * event and animate `width`, which cost a style recalc, a layout and a render
 * per event: 523 layouts over one scroll of Data Darbar on a throttled phone
 * profile, against 1–3 on pages without the bar (mobile council, 9 October
 * 2026). Now one frame-coalesced write to `transform: scaleX()` — composited,
 * no layout — and the ARIA value written to the same element directly.
 */
export function ReadingProgressBar() {
  const { t } = useLang();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      frame = 0;
      const bar = barRef.current;
      if (!bar) return;
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, el.scrollTop / total)) : 0;
      bar.style.transform = `scaleX(${progress})`;
      bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    paint();
    return () => {
      window.removeEventListener('scroll', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="reading-progress-bar"
      role="progressbar"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('ariaReadingProgress')}
    />
  );
}
