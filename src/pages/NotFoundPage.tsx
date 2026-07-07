import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { LanguageToggle } from '../components/ui/LanguageToggle';

export default function NotFoundPage() {
  const { t } = useLang();

  return (
    <div className="not-found-page page-enter">
      <header className="shrine-page-header no-print">
        <Link to="/" className="back-link" aria-label={t('backToMap')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('backToMap')}
        </Link>
        <div className="shrine-page-header-actions">
          <DarkModeToggle />
          <LanguageToggle />
        </div>
      </header>

      <div className="not-found-content">
        <div className="not-found-icon-wrap" aria-hidden="true">
          <svg className="not-found-dome" viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 6l-3 6H22v3h2v4.6C18.2 21.4 15 25.5 15 30.5h34c0-5-3.2-9.1-9-11V15h2v-3H35l-3-6zm-14 27v26h28V33H18zm8 8h12v10H26V41z" />
          </svg>
        </div>

        <p className="not-found-code">404</p>
        <h1 className="not-found-title">
          {t('pageNotFoundTitle')}
        </h1>
        <p className="not-found-message">
          {t('pageNotFoundMessage')}
        </p>
        <Link to="/" className="not-found-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {t('backToMap')}
        </Link>
      </div>
    </div>
  );
}
