import { useEffect, useRef } from 'react';

/**
 * Reveal a page's sections as they scroll into view.
 *
 * A shrine article can run to eight sections; they all arrive at once, which
 * reads as a wall of text rather than a document. This fades and lifts each
 * section as it crosses into view — the same 12px rise the list items already
 * use, so the page moves in one vocabulary.
 *
 * Three things make it safe rather than decorative:
 *
 * 1. **It degrades to visible.** The hook adds the `.js-reveal` class itself,
 *    which is what applies `opacity: 0`. If the script never runs — a crawler,
 *    a chunk that failed, scripts off — the CSS is never applied and the content
 *    is simply there. Putting the hidden state in the markup instead is how
 *    scroll-reveal turns into a blank page.
 * 2. **It respects the motion setting** and skips the whole mechanism under
 *    `prefers-reduced-motion: reduce`, rather than relying on a CSS override to
 *    undo it.
 * 3. **It reveals once and stops observing.** A section that fades out again on
 *    the way back up is a distraction, and re-triggering costs work on every
 *    scroll.
 *
 * Anything already on screen at mount is revealed on the first observer
 * callback, so the top of the page never animates in behind the reader.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLElement>(
  /** Selector for the children to reveal, scoped to the container. */
  selector: string,
  /** Re-run when this changes — e.g. once the data has arrived and the sections
   *  it renders actually exist. */
  deps: readonly unknown[] = [],
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return;

    for (const el of targets) el.classList.add('js-reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      },
      /* A little before the edge, so a section is settled by the time it is
         properly in view rather than animating under the reader's eye. */
      { rootMargin: '0px 0px -8% 0px', threshold: 0.02 },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);

  return containerRef;
}
