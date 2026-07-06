import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoplay } from '../useAutoplay';

const TICK_MS = 100;

// Fake timers + effect-driven re-scheduling need a React commit between each
// tick to pick up the next setTimeout, so advance in TICK_MS-sized steps
// rather than one large jump.
function advance(totalMs: number) {
  for (let elapsed = 0; elapsed < totalMs; elapsed += TICK_MS) {
    act(() => {
      vi.advanceTimersByTime(TICK_MS);
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoplay', () => {
  it('does not tick or complete while disabled', () => {
    const onComplete = vi.fn();
    renderHook(() => useAutoplay({ enabled: false, durationMs: 1000, resetKey: 0, onComplete }));
    advance(5000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('counts down and reports progress over time', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useAutoplay({ enabled: true, durationMs: 1000, resetKey: 0, onComplete }),
    );
    expect(result.current.remainingMs).toBe(1000);

    advance(400);
    expect(result.current.remainingMs).toBe(600);
    expect(result.current.progress).toBeCloseTo(0.4, 5);
  });

  it('calls onComplete exactly once when the countdown reaches zero', () => {
    const onComplete = vi.fn();
    renderHook(() => useAutoplay({ enabled: true, durationMs: 500, resetKey: 0, onComplete }));

    advance(500);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Time keeps advancing but resetKey hasn't changed — no repeat firing.
    advance(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('restarts the countdown when resetKey changes', () => {
    const onComplete = vi.fn();
    const { result, rerender } = renderHook(
      ({ resetKey }) => useAutoplay({ enabled: true, durationMs: 1000, resetKey, onComplete }),
      { initialProps: { resetKey: 0 } },
    );

    advance(700);
    expect(result.current.remainingMs).toBe(300);

    act(() => {
      rerender({ resetKey: 1 });
    });
    expect(result.current.remainingMs).toBe(1000);
  });
});
