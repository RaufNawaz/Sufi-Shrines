import { useEffect, useRef, useState } from 'react';
import { readMotionPreference } from '../lib/motionPreference';

/**
 * A number that counts up to its value the first time it scrolls into view.
 *
 * For the stat tiles (coverage on `/almanac`, 9 October 2026): a figure that
 * arrives is read, a figure that is simply there is skimmed. Three rules keep
 * it honest rather than decorative:
 *
 * - **The real number is in the HTML.** State starts at `target`, so the
 *   prerendered page, a crawler and a reader without JavaScript all get the
 *   true figure; only the browser animates.
 * - **Nothing blinks.** If the tile is already on screen when it mounts, the
 *   reader would see the number drop to zero and climb back — so a tile that is
 *   intersecting within its first 150ms does not animate at all. The count-up
 *   is for the tile that scrolls in.
 * - **Reduced motion means none.** Both the OS setting and the archive's own
 *   preference (`/settings`) switch it off.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(
  target: number,
  durationMs = 900,
): { ref: React.RefObject<T>; value: number } {
  const ref = useRef<T>(null);
  const [value, setValue] = useState(target);

  useEffect(() => {
    setValue(target);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (readMotionPreference() === 'reduced') return;
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const mounted = performance.now();
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        if (performance.now() - mounted < 150) return;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs]);

  return { ref, value };
}
