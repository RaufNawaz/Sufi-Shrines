import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

interface Props {
  offline: boolean;
  sourceTimestamp: number | null;
}

/** Shown only once a live CSV fetch has actually failed (see useShrineData's
 * `offline` flag) — not during the normal instant-cache-then-background-
 * refresh path every healthy load goes through. */
export function OfflineDataBanner({ offline, sourceTimestamp }: Props) {
  const { t, fmtNum } = useLang();
  if (!offline) return null;

  const dateLabel = sourceTimestamp ? new Date(sourceTimestamp).toISOString().slice(0, 10) : null;

  return (
    <div className="offline-data-banner" role="status">
      {t('offlineDataBanner')}
      {dateLabel && (
        <>
          {' '}
          <bdi>{fmtNum(dateLabel)}</bdi>
        </>
      )}
    </div>
  );
}
