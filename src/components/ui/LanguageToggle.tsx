import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();

  return (
    <div
      className={`lang-toggle-segment${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={t('selectLanguage')}
    >
      <button
        className={`lang-seg${lang === 'en' ? ' active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        lang="en"
      >
        <bdi data-latin>EN</bdi>
      </button>
      <button
        // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: this segment *is* the Urdu one; its label is اردو
        className={`lang-seg${lang === 'ur' ? ' active' : ''}`}
        onClick={() => setLang('ur')}
        // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: this segment *is* the Urdu one; its label is اردو
        aria-pressed={lang === 'ur'}
        lang="ur"
      >
        اردو
      </button>
    </div>
  );
}
