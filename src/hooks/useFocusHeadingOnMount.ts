import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Returns a heading ref that receives focus on mount (adding tabindex="-1"
 * when the element has none) so screen readers announce the new page.
 *
 * Unless the reader is in a modal. A page's content can mount *after* its
 * route — the data lands, the skeleton swaps for the article — and a reader
 * who opened the search palette in that gap was having the caret pulled out
 * of the input mid-word by a heading they had already left behind. The
 * announcement this hook exists for is "you have navigated"; focus sitting
 * inside an `aria-modal` dialog means they haven't.
 */
export function useFocusHeadingOnMount<T extends HTMLElement = HTMLHeadingElement>(): RefObject<T> {
  const headingRef = useRef<T>(null);
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    if (document.activeElement?.closest('[aria-modal="true"]')) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, []);
  return headingRef;
}
