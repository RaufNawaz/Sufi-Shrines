import { useEffect, useState } from 'react';

/**
 * Which article section the reader is in: the first section whose heading is
 * in the top 30% of the viewport.
 *
 * Lifted out of ContentsNav (17 October 2026) so the floating contents pill
 * can say the same thing the rail does. The pill read "Contents" wherever the
 * reader was, and its sheet did not mark the current section — in a fifteen-
 * section entry, no answer to "where am I" (reading council).
 */
export function useActiveSection(items: readonly { id: string }[]): string {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    if (items.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0]!.target.id);
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0.1 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return activeId;
}
