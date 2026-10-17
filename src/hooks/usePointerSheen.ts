import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from '../lib/motionPreference';

/**
 * The rim light of a glass surface, following the pointer.
 *
 * Apple's Liquid Glass lights the edge of a pane nearest the pointer; the web
 * cannot refract, but it can move a highlight. This writes the pointer's
 * position over `ref` as `--sheen-x` / `--sheen-y` (px), once per frame at
 * most, and the `.sheen` rule in motion.css draws a radial gradient there,
 * masked to a one-pixel rim.
 *
 * Fine pointers only, and nothing under reduced motion: on a touch screen
 * there is no pointer to follow, and a highlight that jumps to each tap reads
 * as a glitch. No React state — a re-render per mouse move would be the
 * opposite of the point.
 */
export function usePointerSheen(ref: RefObject<HTMLElement>, enabled = true): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduce = prefersReducedMotion();
    if (!fine || reduce) return undefined;

    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      el.style.setProperty('--sheen-x', `${x}px`);
      el.style.setProperty('--sheen-y', `${y}px`);
    };
    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      x = event.clientX - box.left;
      y = event.clientY - box.top;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onEnter = () => el.classList.add('sheen--lit');
    const onLeave = () => el.classList.remove('sheen--lit');
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.classList.remove('sheen--lit');
    };
  }, [ref, enabled]);
}
