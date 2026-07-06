import { useEffect, useRef, useState } from 'react';

const TICK_MS = 100;

interface UseAutoplayOptions {
  /** User has opted in and the countdown isn't paused. */
  enabled: boolean;
  /** How long each stop gets before auto-advancing. */
  durationMs: number;
  /** Changing this (e.g. the stop index) restarts the countdown. */
  resetKey: string | number;
  onComplete: () => void;
}

interface UseAutoplayResult {
  remainingMs: number;
  /** 0 at the start of the countdown, 1 when it completes. */
  progress: number;
}

/** Ticking countdown that calls onComplete once, then waits for resetKey to
 * change (e.g. the caller advancing to the next stop) before running again. */
export function useAutoplay({ enabled, durationMs, resetKey, onComplete }: UseAutoplayOptions): UseAutoplayResult {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setRemainingMs(durationMs);
  }, [resetKey, durationMs]);

  useEffect(() => {
    if (!enabled) return;
    if (remainingMs <= 0) {
      onCompleteRef.current();
      return;
    }
    const id = setTimeout(() => {
      setRemainingMs((ms) => Math.max(0, ms - TICK_MS));
    }, TICK_MS);
    return () => clearTimeout(id);
  }, [enabled, remainingMs]);

  return { remainingMs, progress: durationMs > 0 ? 1 - remainingMs / durationMs : 1 };
}
