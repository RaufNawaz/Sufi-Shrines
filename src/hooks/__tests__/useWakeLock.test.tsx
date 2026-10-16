import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from '../useWakeLock';

function fakeWakeLock() {
  const release = vi.fn(() => Promise.resolve());
  const request = vi.fn(() => Promise.resolve({ release, released: false }));
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, release };
}

describe('useWakeLock', () => {
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).wakeLock;
  });

  it('holds the screen while active and lets it go when the tour stops', async () => {
    const { request, release } = fakeWakeLock();
    const { rerender } = renderHook(({ on }) => useWakeLock(on), { initialProps: { on: true } });
    expect(request).toHaveBeenCalledWith('screen');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    rerender({ on: false });
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it('asks for nothing while inactive, and does nothing where the API is missing', () => {
    const { request } = fakeWakeLock();
    renderHook(() => useWakeLock(false));
    expect(request).not.toHaveBeenCalled();
    delete (navigator as unknown as Record<string, unknown>).wakeLock;
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});
