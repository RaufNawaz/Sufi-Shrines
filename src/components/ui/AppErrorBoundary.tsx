import React from 'react';
import type { Lang } from '../../types/shrine';
import { t } from '../../lib/i18n/uiStrings';
import { LANGUAGE_STORAGE_KEY } from '../../lib/storageKeys';

/** The boundary can't use useLang() (class component, and it must work even
 * if a provider itself crashed), so it reads the persisted language the same
 * way LanguageContext does, falling back to English. */
function detectLang(): Lang {
  try {
    const param = new URLSearchParams(window.location.search).get('lang');
    if (param === 'en' || param === 'ur') return param;
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'ur') return stored;
  } catch {
    // storage unavailable — fall through to English
  }
  return 'en';
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort error boundary: a render/lifecycle crash anywhere below shows
 * a recoverable reload prompt instead of a blank screen.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) console.error('[app] render error:', error, errorInfo);
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    const lang = detectLang();
    return (
      <div className="page-fallback" role="alert">
        <div className="error-card">
          <p className="error-message">{t(lang, 'appErrorMessage')}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            {t(lang, 'appErrorReload')}
          </button>
        </div>
      </div>
    );
  }
}
