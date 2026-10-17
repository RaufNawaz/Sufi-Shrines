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
  /** The current path: a new one clears the error, so the tab bar still
   *  works after one page fails (loading council, 17 October 2026). */
  resetKey?: string;
}

/** A route's code could not be fetched — after a deploy, the previous build's
 *  chunks are gone from the server and from the service worker's cache. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError/i.test(
    message,
  );
}

const RELOADED_KEY = 'shrines_chunk_reload';

/** Reload once to fetch the current build; a second failure on the same path
 *  shows the card instead of looping. */
export function reloadOnceForChunkError(): boolean {
  try {
    const path = window.location.pathname;
    if (sessionStorage.getItem(RELOADED_KEY) === path) return false;
    sessionStorage.setItem(RELOADED_KEY, path);
  } catch {
    return false;
  }
  window.location.reload();
  return true;
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
    /* A page whose code is from a build no longer served: the reader did
       nothing wrong, and a reload fetches the current one. */
    if (isChunkLoadError(error)) reloadOnceForChunkError();
  }

  override componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
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
