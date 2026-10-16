import { useEffect } from 'react';

type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean };
type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> };

/**
 * Keeps the screen on while `active`.
 *
 * For the guided tour: a visitor walking between stops with autoplay or the
 * narration running came back to a dark screen, and iOS and Android suspend
 * both the countdown and speech synthesis when the screen sleeps (council,
 * 15 October 2026). The lock follows the tour's own state — no switch to find.
 *
 * The system drops the lock whenever the page is hidden, so it is requested
 * again on return. Where the Screen Wake Lock API is missing (older Safari)
 * this does nothing, which is exactly the behaviour before it existed.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    if (!active || !wakeLock) return undefined;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      wakeLock
        .request('screen')
        .then((s) => {
          if (cancelled) void s.release().catch(() => {});
          else sentinel = s;
        })
        .catch(() => {
          /* Refused (battery saver, permissions policy): the tour still works. */
        });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
