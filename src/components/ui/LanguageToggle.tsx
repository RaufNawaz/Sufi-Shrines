import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={`lang-toggle-segment${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Select language"
    >
      <button
        className={`lang-seg${lang === 'en' ? ' active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        lang="en"
      >
        EN
      </button>
      <button
        className={`lang-seg${lang === 'ur' ? ' active' : ''}`}
        onClick={() => setLang('ur')}
        aria-pressed={lang === 'ur'}
        lang="ur"
      >
        اردو
      </button>
    </div>
  );
}
