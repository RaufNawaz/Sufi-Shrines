import { useMemo } from 'react';
import type { Tour } from '../../lib/tours/tours';
import { TOURS, localizeTourTitle, localizeTourDescription } from '../../lib/tours/tours';
import { resolveTourStops } from '../../lib/tours/tourRoute';
import { totalDistanceKm, estimateDriveTime } from '../../lib/tours/tourGeo';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { t } from '../../lib/i18n/uiStrings';
import type { Shrine, Lang } from '../../types/shrine';
import { langAttr } from '../../lib/i18n/languages';

function formatDriveTime(km: number, lang: Lang, fmtNum: (n: number | string) => string): string {
  const { hours, minutes } = estimateDriveTime(km);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${fmtNum(hours)}${t(lang, 'hoursAbbrev')}`);
  parts.push(`${fmtNum(minutes)}${t(lang, 'minutesAbbrev')}`);
  return parts.join(' ');
}

interface TourPreviewProps {
  tour: Tour;
  lang: Lang;
  fmtNum: (n: number | string) => string;
  shrines: Shrine[];
  onStart: () => void;
  onBack: () => void;
  onPreviewTour: (tourId: string) => void;
}

export function TourPreview({
  tour,
  lang,
  fmtNum,
  shrines,
  onStart,
  onBack,
  onPreviewTour,
}: TourPreviewProps) {
  const points = useMemo(() => resolveTourStops(tour, shrines), [tour, shrines]);
  const km = useMemo(() => totalDistanceKm(points.map((p) => p.shrine.latLng)), [points]);
  const hasDistance = points.length > 1;

  const relatedTours = useMemo(() => {
    const others = TOURS.filter((tr) => tr.id !== tour.id);
    const sameTradition = others.filter((tr) => tr.tradition === tour.tradition);
    return (sameTradition.length > 0 ? sameTradition : others).slice(0, 2);
  }, [tour]);

  return (
    <div className="tour-preview">
      <button className="tour-back-btn" onClick={onBack} aria-label={t(lang, 'tourBackButton')}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {t(lang, 'tourBackButton')}
      </button>

      <h3 className="tour-preview-title" lang={langAttr(lang)}>
        {localizeTourTitle(tour, lang)}
      </h3>
      <p className="tour-preview-description" lang={langAttr(lang)}>
        {localizeTourDescription(tour, lang)}
      </p>

      <dl className="tour-preview-stats">
        <div className="tour-preview-stat">
          <dt>{t(lang, 'stopsLabel')}</dt>
          <dd>{fmtNum(tour.stops.length)}</dd>
        </div>
        {hasDistance && (
          <>
            <div className="tour-preview-stat">
              <dt>{t(lang, 'tourTotalDistance')}</dt>
              <dd>
                {fmtNum(Math.round(km))} {t(lang, 'kmUnit')}
              </dd>
            </div>
            <div className="tour-preview-stat">
              <dt>{t(lang, 'tourEstDriveTime')}</dt>
              <dd>{formatDriveTime(km, lang, fmtNum)}</dd>
            </div>
          </>
        )}
      </dl>

      <ol className="tour-preview-stops">
        {points.map((p, i) => (
          <li key={p.shrine.id} lang={langAttr(lang)}>
            {fmtNum(i + 1)}. {localizeShrineName(p.shrine, lang)}
          </li>
        ))}
      </ol>

      <button className="tour-nav-btn tour-nav-btn--next tour-start-btn" onClick={onStart}>
        {t(lang, 'tourStartButton')}
      </button>

      {relatedTours.length > 0 && (
        <div className="tour-related">
          <h4 className="tour-related-heading">{t(lang, 'relatedToursHeading')}</h4>
          <div className="tour-related-cards">
            {relatedTours.map((related) => (
              <button
                key={related.id}
                className="tour-related-card"
                onClick={() => onPreviewTour(related.id)}
              >
                <span lang={langAttr(lang)}>{localizeTourTitle(related, lang)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
