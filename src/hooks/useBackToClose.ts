import { useEffect, useId, useRef } from 'react';
import { registerOverlay, unregisterOverlay, OVERLAY_KEY } from '../lib/nav/overlayHistory';

/**
 * While `open`, the back gesture closes this overlay instead of leaving the
 * page. See `lib/nav/overlayHistory.ts` for why and how.
 */
export function useBackToClose(open: boolean, onClose: () => void): void {
  const id = useId();
  const onCloseRef = useRef(onClose);
  const cancelPendingBack = useRef<(() => void) | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    cancelPendingBack.current?.();
    cancelPendingBack.current = null;
    registerOverlay(id);

    const onPop = (event: PopStateEvent) => {
      const marker = (event.state as Record<string, unknown> | null)?.[OVERLAY_KEY];
      if (marker !== id) onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      cancelPendingBack.current = unregisterOverlay(id);
    };
  }, [open, id]);
}
