import { useEffect, useState } from 'react';

/** The reading line: a section is current once its top has passed this
 *  fraction of the viewport height. */
const READING_LINE = 0.3;

/**
 * Which article section the reader is in: the last section whose top has
 * scrolled above the reading line (30% down the viewport). At the very bottom
 * of the page, the last section on screen, so a short final section can still
 * become current.
 *
 * Lifted out of ContentsNav (17 October 2026) so the floating contents pill
 * can say the same thing the rail does.
 *
 * Measured from scroll position, not with an IntersectionObserver, since
 * 25 October 2026. The observer version asked for 10% of a section to sit in
 * the top 30% of the viewport, which a section taller than three screens can
 * never satisfy: on long entries the rail stopped following the reader partway
 * down. It also observed only the sections present when it was set up, so a
 * section rendered later (the Urdu article arriving, the gallery) was never
 * tracked. Looking each id up per frame is a dozen `getBoundingClientRect`
 * calls on a scroll frame, which is nothing.
 */
export function useActiveSection(items: readonly { id: string }[]): string {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    if (items.length === 0) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const line = viewport * READING_LINE;
      const atBottom = viewport + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = items[0]!.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= line || (atBottom && top < viewport)) current = item.id;
      }
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  return activeId;
}
