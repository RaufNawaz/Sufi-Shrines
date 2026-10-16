import { useEffect, useRef } from 'react';

/** How far a horizontal drag must travel to change photograph. */
const SWIPE_PX = 50;
/** How far a downward pull must travel to close the lightbox. */
const DISMISS_PX = 120;
/** A release faster than this (px/ms) counts as a flick whatever the distance. */
const FLICK_SPEED = 0.45;
const MAX_ZOOM = 4;
const DOUBLE_TAP_MS = 300;

/**
 * Touch gestures for the photograph lightbox: the photograph moves under the
 * finger.
 *
 * Until 15 October 2026 the swipe was blind — measured on a phone, through a
 * 150px drag the image stayed where it was and then snapped to the next one on
 * release; a pull down did nothing; and a pinch zoomed the *page*, fixed overlay
 * and buttons included, because nothing claimed the gesture. Now:
 *
 * - a sideways drag carries the photograph and settles on the next or previous
 *   one (with resistance at either end of the set);
 * - a downward pull lifts it away, dimming the scrim with distance, and closes
 *   past `DISMISS_PX` or on a flick;
 * - two fingers zoom the photograph (to `MAX_ZOOM`), one finger then pans it,
 *   and a double tap toggles between whole and 2.5×.
 *
 * Touch only (`pointerType === 'touch'`): a mouse keeps the buttons and arrow
 * keys. Writes transforms straight to the element, no React state per frame.
 * Under reduced motion nothing animates on release — it switches or closes.
 */
export function useLightboxGestures({
  overlayRef,
  imgRef,
  isRTL,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onClose,
  resetKey,
}: {
  overlayRef: React.RefObject<HTMLElement>;
  imgRef: React.RefObject<HTMLElement>;
  isRTL: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  /** Changes with the photograph shown; zoom and offset reset on change. */
  resetKey: unknown;
}): { suppressClick: () => boolean } {
  const latest = useRef({ isRTL, canPrev, canNext, onPrev, onNext, onClose });
  useEffect(() => {
    latest.current = { isRTL, canPrev, canNext, onPrev, onNext, onClose };
  });

  const zoom = useRef({ scale: 1, x: 0, y: 0 });
  const suppressUntil = useRef(0);

  useEffect(() => {
    zoom.current = { scale: 1, x: 0, y: 0 };
  }, [resetKey]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return undefined;
    const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const pointers = new Map<number, { x: number; y: number }>();
    let mode: 'idle' | 'pending' | 'x' | 'y' | 'pan' | 'pinch' = 'idle';
    let start = { x: 0, y: 0, t: 0 };
    let last = { x: 0, y: 0, t: 0 };
    let velocity = { x: 0, y: 0 };
    let pinchStart = { dist: 1, scale: 1, midX: 0, midY: 0, x: 0, y: 0 };
    let lastTap = 0;

    const img = () => imgRef.current;
    const apply = (transform: string, dim = 1, animate = false) => {
      const el = img();
      if (!el) return;
      el.style.transition =
        animate && !reduced() ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
      el.style.transform = transform;
      overlay.style.setProperty('--lightbox-dim', String(dim));
    };
    const zoomTransform = () => {
      const z = zoom.current;
      return z.scale === 1 ? '' : `translate(${z.x}px, ${z.y}px) scale(${z.scale})`;
    };
    const settle = () => apply(zoomTransform(), 1, true);

    const pair = () => {
      const [a, b] = [...pointers.values()];
      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if ((e.target as Element | null)?.closest('button')) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const p = pair();
        const z = zoom.current;
        pinchStart = { ...p, scale: z.scale, x: z.x, y: z.y };
        mode = 'pinch';
        return;
      }
      if (pointers.size > 2) return;
      start = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      last = { ...start };
      velocity = { x: 0, y: 0 };
      mode = 'pending';
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && pointers.size === 2) {
        const p = pair();
        const scale = Math.min(
          MAX_ZOOM,
          Math.max(0.8, (pinchStart.scale * p.dist) / pinchStart.dist),
        );
        zoom.current = {
          scale,
          x: pinchStart.x + (p.midX - pinchStart.midX),
          y: pinchStart.y + (p.midY - pinchStart.midY),
        };
        apply(`translate(${zoom.current.x}px, ${zoom.current.y}px) scale(${scale})`);
        return;
      }
      if (pointers.size !== 1) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dt = Math.max(1, e.timeStamp - last.t);
      velocity = { x: (e.clientX - last.x) / dt, y: (e.clientY - last.y) / dt };
      last = { x: e.clientX, y: e.clientY, t: e.timeStamp };

      if (mode === 'pending') {
        if (Math.hypot(dx, dy) < 8) return;
        if (zoom.current.scale > 1) mode = 'pan';
        else mode = Math.abs(dx) > Math.abs(dy) ? 'x' : dy > 0 ? 'y' : 'idle';
      }
      if (mode === 'pan') {
        const z = zoom.current;
        apply(`translate(${z.x + dx}px, ${z.y + dy}px) scale(${z.scale})`);
      } else if (mode === 'x') {
        const { isRTL: rtl, canPrev: prev, canNext: next } = latest.current;
        const towardNext = rtl ? dx > 0 : dx < 0;
        const blocked = towardNext ? !next : !prev;
        apply(`translateX(${blocked ? dx * 0.3 : dx}px)`);
      } else if (mode === 'y') {
        const lift = Math.max(0, dy);
        apply(
          `translateY(${lift}px) scale(${1 - Math.min(lift / 1200, 0.15)})`,
          1 - Math.min(lift / 400, 0.65),
        );
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const { isRTL: rtl, canPrev: prev, canNext: next } = latest.current;

      if (mode === 'pinch') {
        if (pointers.size === 1) {
          /* One finger stays down: carry on as a pan from here. */
          const [rest] = [...pointers.values()];
          start = { x: rest.x, y: rest.y, t: e.timeStamp };
          mode = zoom.current.scale > 1.05 ? 'pan' : 'idle';
        } else {
          mode = 'idle';
        }
        if (zoom.current.scale < 1.05) {
          zoom.current = { scale: 1, x: 0, y: 0 };
          settle();
        }
        suppressUntil.current = e.timeStamp + 400;
        return;
      }
      if (pointers.size > 0) return;

      const was = mode;
      mode = 'idle';
      if (was === 'pending') {
        /* A tap. Two inside DOUBLE_TAP_MS toggle the zoom. */
        if (e.timeStamp - lastTap < DOUBLE_TAP_MS) {
          lastTap = 0;
          zoom.current =
            zoom.current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 };
          settle();
          suppressUntil.current = e.timeStamp + 400;
        } else {
          lastTap = e.timeStamp;
        }
        return;
      }
      suppressUntil.current = e.timeStamp + 400;
      if (was === 'pan') {
        const z = zoom.current;
        zoom.current = { ...z, x: z.x + dx, y: z.y + dy };
        return;
      }
      if (was === 'x') {
        const flick = Math.abs(velocity.x) > FLICK_SPEED;
        if (Math.abs(dx) > SWIPE_PX || flick) {
          const towardNext = rtl ? dx > 0 : dx < 0;
          if (towardNext && next) {
            latest.current.onNext();
            return;
          }
          if (!towardNext && prev) {
            latest.current.onPrev();
            return;
          }
        }
        settle();
        return;
      }
      if (was === 'y') {
        if (dy > DISMISS_PX || velocity.y > FLICK_SPEED) {
          latest.current.onClose();
          return;
        }
        settle();
      }
    };

    overlay.addEventListener('pointerdown', onDown);
    overlay.addEventListener('pointermove', onMove);
    overlay.addEventListener('pointerup', onUp);
    overlay.addEventListener('pointercancel', onUp);
    return () => {
      overlay.removeEventListener('pointerdown', onDown);
      overlay.removeEventListener('pointermove', onMove);
      overlay.removeEventListener('pointerup', onUp);
      overlay.removeEventListener('pointercancel', onUp);
    };
  }, [overlayRef, imgRef]);

  return {
    /** True just after a gesture, so the click it also produces on the scrim
     *  does not close the lightbox. */
    suppressClick: () => performance.now() < suppressUntil.current,
  };
}
