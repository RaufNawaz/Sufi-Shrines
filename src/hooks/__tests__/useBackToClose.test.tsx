import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { useBackToClose } from '../useBackToClose';
import { OVERLAY_KEY, isOverlayHistoryPop } from '../../lib/nav/overlayHistory';

function Overlay({ onClosed }: { onClosed: () => void }) {
  const [open, setOpen] = useState(true);
  useBackToClose(open, () => {
    setOpen(false);
    onClosed();
  });
  return open ? (
    <button type="button" onClick={() => setOpen(false)}>
      Done
    </button>
  ) : null;
}

const marker = () => (window.history.state as Record<string, unknown> | null)?.[OVERLAY_KEY];

describe('useBackToClose', () => {
  it('pushes one entry on open, and back closes the overlay without a real navigation', async () => {
    const before = window.history.length;
    let closed = 0;
    render(<Overlay onClosed={() => closed++} />);
    expect(window.history.length).toBe(before + 1);
    expect(marker()).toBeTruthy();

    await act(async () => {
      window.history.back();
      await new Promise<void>((resolve) => {
        const once = () => {
          /* While the listeners for this pop run, the overlay is still
             registered: a page's own popstate handler can tell it apart. */
          expect(isOverlayHistoryPop()).toBe(true);
          window.removeEventListener('popstate', once);
          resolve();
        };
        window.addEventListener('popstate', once);
      });
    });
    expect(closed).toBe(1);
    expect(marker()).toBeUndefined();
  });

  it('closing with Done takes its own entry back off the stack', async () => {
    const { getByRole } = render(<Overlay onClosed={() => {}} />);
    expect(marker()).toBeTruthy();
    act(() => getByRole('button').click());
    await waitFor(() => expect(marker()).toBeUndefined());
  });
});
