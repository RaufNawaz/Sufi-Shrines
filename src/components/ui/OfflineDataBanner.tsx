import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

interface Props {
  offline: boolean;
  sourceTimestamp: number | null;
  /**
   * `overlay` floats it over a full-height layout — the map, which has no
   * document flow to sit in. `inline` puts it in the flow at the top of an
   * article, which is every other page.
   */
  variant?: 'overlay' | 'inline';
}

/**
 * Shown only once a live CSV fetch has actually failed (see useShrineData's
 * `offline` flag) — not during the normal instant-cache-then-background-refresh
 * path every healthy load goes through.
 *
 * ## Why this is on eight pages and not one
 *
 * It was on the map alone. Measured offline on 27 August 2026, with the service
 * worker doing its job: `/about`, `/almanac`, `/place/:slug`, `/saint/:slug` and
 * `/shrine/:slug` all render completely from cache, and **none of them said so.**
 *
 * `/about` is the one that decides it. That page computes the archive's coverage
 * figures from the shipped data on every load *specifically* so they cannot go
 * stale — HANDOVER's standing-findings note says a page "cannot go stale the way
 * a note can", and that argument is the reason those numbers are computed rather
 * than written down. Offline it printed "171 sites" from a cache of unknown age
 * with nothing to say so, which is the failure the design was built to avoid.
 *
 * An archive whose distinguishing claim is provenance owes the reader the date
 * of what they are looking at, and that is as true of one entry as of the map.
 */
export function OfflineDataBanner({ offline, sourceTimestamp, variant = 'inline' }: Props) {
  const { t, fmtNum } = useLang();
  if (!offline) return null;

  const dateLabel = sourceTimestamp ? new Date(sourceTimestamp).toISOString().slice(0, 10) : null;

  return (
    <div className={`offline-data-banner offline-data-banner--${variant}`} role="status">
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
