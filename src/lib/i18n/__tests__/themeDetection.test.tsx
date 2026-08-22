import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { THEME_STORAGE_KEY } from '../../storageKeys';

/** Minimal controllable matchMedia: `matches` reflects `systemDark`, and
 * `fire(dark)` simulates the device flipping theme (sunset auto-switch). */
function installMatchMedia(initialDark: boolean) {
  let systemDark = initialDark;
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const original = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      get matches() {
        return query.includes('prefers-color-scheme: dark') ? systemDark : false;
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) =>
        listeners.delete(cb),
      dispatchEvent: () => false,
    }),
  });
  return {
    fire(dark: boolean) {
      systemDark = dark;
      listeners.forEach((cb) => cb({ matches: dark }));
    },
    restore() {
      Object.defineProperty(window, 'matchMedia', { writable: true, value: original });
    },
  };
}

function Probe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

let mm: ReturnType<typeof installMatchMedia>;
afterEach(() => mm?.restore());
beforeEach(() => localStorage.clear());

describe('theme detection', () => {
  it('follows the device when the reader has not chosen (dark phone gets the dark site)', () => {
    mm = installMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('an explicit stored choice beats the device preference', () => {
    mm = installMatchMedia(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('tracks a live device flip until a choice pins the theme', () => {
    mm = installMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');

    act(() => mm.fire(true)); // sunset: device goes dark, site follows
    expect(screen.getByTestId('theme').textContent).toBe('dark');

    localStorage.setItem(THEME_STORAGE_KEY, 'dark'); // reader pins dark
    act(() => mm.fire(false)); // device flips back — pinned choice holds
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});
