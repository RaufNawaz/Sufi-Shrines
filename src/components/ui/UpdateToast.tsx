import React, { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { OFFLINE_READY_SEEN_STORAGE_KEY } from '../../lib/storageKeys';

/* The first time a service worker takes control, the archive has just been
   precached: say once, ever, that it now works offline (council, 15 October
   2026 — field visitors were never told). Every later controller change is an
   update, as before. */
function offlineReadySeen(): boolean {
  try {
    return localStorage.getItem(OFFLINE_READY_SEEN_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function UpdateToast() {
  const { t } = useLang();
  const [show, setShow] = useState<false | 'update' | 'offline'>(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const hadController = navigator.serviceWorker.controller !== null;
    const handleControllerChange = () => {
      if (hadController) {
        setShow('update');
        return;
      }
      if (offlineReadySeen()) return;
      try {
        localStorage.setItem(OFFLINE_READY_SEEN_STORAGE_KEY, '1');
      } catch {
        /* Unremembered: it may say so once more next visit. */
      }
      setShow('offline');
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!show) return null;

  return (
    <div className="sw-update-toast" role="status" aria-live="polite">
      <span className="sw-update-msg">
        {show === 'offline' ? t('offlineReady') : t('swUpdateAvailable')}
      </span>
      {show === 'update' && (
        <button className="sw-update-reload" onClick={() => window.location.reload()}>
          {t('appErrorReload')}
        </button>
      )}
      <button
        className="sw-update-dismiss"
        onClick={() => setShow(false)}
        aria-label={t('dismiss')}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
