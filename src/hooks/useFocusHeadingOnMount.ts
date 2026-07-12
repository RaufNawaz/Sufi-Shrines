import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Returns a heading ref that receives focus on mount (adding tabindex="-1"
 * when the element has none) so screen readers announce the new page.
 */
export function useFocusHeadingOnMount<T extends HTMLElement = HTMLHeadingElement>(): RefObject<T> {
  const headingRef = useRef<T>(null);
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, []);
  return headingRef;
}
