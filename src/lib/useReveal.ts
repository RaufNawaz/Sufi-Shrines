import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal for editorial sections: the element rises in the first time
 * it enters the viewport. Motion in this codebase is opt-in and reversible —
 * the rules that keep it honest:
 *
 * - Content is visible by DEFAULT. The hiding class is added by JS only,
 *   so prerendered HTML, no-JS readers, and print never lose a paragraph.
 * - `prefers-reduced-motion` is respected twice: here (the hook does
 *   nothing) and in CSS (durations collapse to 0ms globally in tokens.css).
 * - A fallback timer reveals the element even if IntersectionObserver never
 *   fires (odd embeds, jsdom) — an animation must never be able to make
 *   content unreachable.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el.classList.add('reveal-pending');

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      el.classList.add('is-revealed');
      observer.disconnect();
      window.clearTimeout(failsafe);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);

    // Never let a missed observation hide prose (RULE 4 in motion form).
    const failsafe = window.setTimeout(reveal, 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
      el.classList.remove('reveal-pending', 'is-revealed');
    };
  }, []);

  return ref;
}
