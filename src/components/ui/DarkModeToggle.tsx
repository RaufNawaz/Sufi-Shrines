import React from 'react';
import { useTheme } from '../../lib/i18n/ThemeContext';
import { useLang } from '../../lib/i18n/LanguageContext';

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function DarkModeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const isDark = theme === 'dark';

  return (
    <button
      className={`icon-btn ${className || ''}`}
      onClick={toggleTheme}
      aria-label={isDark ? t('lightMode') : t('darkMode')}
      title={isDark ? t('lightMode') : t('darkMode')}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
