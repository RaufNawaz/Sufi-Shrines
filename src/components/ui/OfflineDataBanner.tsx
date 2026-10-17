import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { currentDataSource } from '../../hooks/useShrineData';
import type { Lang } from '../../lib/i18n/languages';

/** Day-month-year in each language's own order and month names. */
const DATE_LOCALE: Record<Lang, string> = { en: 'en-GB', ur: 'ur-PK' };

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
  const { lang, t, fmtNum } = useLang();
  if (!offline) return null;

  /* A date in the reader's own words. It was an ISO string ("2026-10-12"),
     which in the Urdu view read as three numbers joined by dashes. */
  const dateLabel = sourceTimestamp
    ? fmtNum(
        new Intl.DateTimeFormat(DATE_LOCALE[lang], {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          numberingSystem: 'latn',
        }).format(new Date(sourceTimestamp)),
      )
    : null;

  /* Offline only when the browser says so. A sheet that failed or stalled for
     a reader who is online was announced as "You're offline… saved on this
     device… will update when you reconnect", none of which was true — the
     copy shown was the one published with the site, and reconnecting never
     happens to someone who never disconnected (loading council, 17 October
     2026). Then: which copy it is, its date, and a way to try again. */
  const reallyOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const source = currentDataSource();
  const message = reallyOffline
    ? dateLabel
      ? tFn(lang, 'offlineDataBannerDated', dateLabel)
      : t('offlineDataBanner')
    : dateLabel
      ? source === 'snapshot'
        ? tFn(lang, 'liveUnreachablePublished', dateLabel)
        : tFn(lang, 'liveUnreachableSaved', dateLabel)
      : t('liveUnreachable');

  return (
    <div className={`offline-data-banner offline-data-banner--${variant}`} role="status">
      {message}
      {!reallyOffline && (
        <>
          {' '}
          <button
            type="button"
            className="offline-data-retry"
            onClick={() => window.location.reload()}
          >
            {t('retry')}
          </button>
        </>
      )}
    </div>
  );
}
