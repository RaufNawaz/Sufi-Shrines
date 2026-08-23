import React, { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

export function UpdateToast() {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const hadController = navigator.serviceWorker.controller !== null;
    const handleControllerChange = () => {
      if (hadController) setShow(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!show) return null;

  return (
    <div className="sw-update-toast" role="status" aria-live="polite">
      <span className="sw-update-msg">{t('swUpdateAvailable')}</span>
      <button className="sw-update-reload" onClick={() => window.location.reload()}>
        {t('appErrorReload')}
      </button>
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
