/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Theme } from '../../types/shrine';
import { THEME_STORAGE_KEY } from '../storageKeys';
import { withViewTransition } from '../nav/viewTransition';
import { syncThemeColor } from '../themeColor';

function detectInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  // No explicit choice: follow the device (mirrors the pre-paint block in
  // main.tsx). A phone in dark mode used to get the light site.
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(detectInitialTheme);

  /* One change, not two. The page flipped at once while ~130 chips, segments
     and tags ran their own 150ms colour transitions, so the active language
     segment lingered light blue on black (motion council, 17 October 2026).
     Element transitions are suspended for the switch, and the switch itself is
     a single crossfade where the browser has View Transitions and motion is
     allowed — otherwise an instant, uniform flip. */
  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-switching');
    withViewTransition(() => {
      root.setAttribute('data-theme', next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      setTheme(next);
    });
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => root.classList.remove('theme-switching')),
    );
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeColor();
  }, [theme]);

  // Until the reader chooses explicitly, track live device-theme changes
  // (sunset auto-switch on phones). The moon button writes to storage and
  // pins the choice from then on.
  useEffect(() => {
    if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      // Re-check at event time: a choice made after mount pins the theme.
      if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
