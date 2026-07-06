import React, { useMemo, useState } from 'react';
import type { Tour } from '../../lib/tours/tours';
import { TOURS } from '../../lib/tours/tours';
import { resolveTourStops } from '../../lib/tours/tourRoute';
import { legDistancesKm, totalDistanceKm, estimateDriveTime } from '../../lib/tours/tourGeo';
import { getTourProgressState, clearLastActive } from '../../lib/tours/tourProgress';
import { useTourAudio } from '../../lib/tours/useTourAudio';
import { useAutoplay } from '../../lib/tours/useAutoplay';
import { getFieldValue, getUrduFieldValue } from '../../lib/data/fieldAliasing';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { ARTICLE_SECTION_DEFINITIONS } from '../../lib/data/constants';
import { t } from '../../lib/i18n/uiStrings';
import { ShrineImage } from '../ui/ShrineImage';
import { useShareLink } from '../../hooks/useShareLink';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { Shrine, Lang } from '../../types/shrine';

/** How long each stop gets in autoplay before advancing to the next. */
const AUTOPLAY_STOP_DURATION_MS = 12000;

const VISITING_INFO_TITLE = ARTICLE_SECTION_DEFINITIONS.find((d) => d.id === 'visiting')!.title;

function localizedVisitingInfo(shrine: Shrine, lang: Lang): string {
  if (lang === 'ur') {
    return getUrduFieldValue(shrine.raw, 'Visiting Info') || getFieldValue(shrine.raw, 'Visiting Info');
  }
  return getFieldValue(shrine.raw, 'Visiting Info');
}

function formatDriveTime(km: number, lang: Lang): string {
  const { hours, minutes } = estimateDriveTime(km);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${t(lang, 'hoursAbbrev')}`);
  parts.push(`${minutes}${t(lang, 'minutesAbbrev')}`);
  return parts.join(' ');
}

interface Props {
  tour: Tour;
  stopIdx: number;
  shrine: Shrine | null;
  shrines: Shrine[];
  lang: Lang;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

export function TourPanel({ tour, stopIdx, shrine, shrines, lang, onNext, onPrev, onExit }: Props) {
  const stop = tour.stops[stopIdx];
  const isFirst = stopIdx === 0;
  const isLast = stopIdx === tour.stops.length - 1;
  const shrineName = shrine?.name ?? stop.shrineSlug;

  const label = lang === 'ur'
    ? `${stopIdx + 1} / ${tour.stops.length}`
    : `Stop ${stopIdx + 1} of ${tour.stops.length}`;

  const points = useMemo(() => resolveTourStops(tour, shrines), [tour, shrines]);
  const legsKm = useMemo(() => legDistancesKm(points.map((p) => p.shrine.latLng)), [points]);
  const activePointIdx = points.findIndex((p) => p.stopIndex === stopIdx);
  const nextLegKm =
    activePointIdx >= 0 && activePointIdx < points.length - 1 ? legsKm[activePointIdx + 1] : null;

  const visitingInfo = shrine ? localizedVisitingInfo(shrine, lang) : '';
  const { share, copied } = useShareLink();
  const tourTitle = lang === 'ur' ? tour.titleUr : tour.title;
  const narrativeText = lang === 'ur' ? stop.narrativeUr : stop.narrative;

  const audio = useTourAudio({ tourId: tour.id, stopIndex: stopIdx, text: narrativeText, lang });

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [autoplayOn, setAutoplayOn] = useState(false);
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const autoplayActive = autoplayOn && !autoplayPaused && !isLast && !reducedMotion;
  const { remainingMs } = useAutoplay({
    enabled: autoplayActive,
    durationMs: AUTOPLAY_STOP_DURATION_MS,
    resetKey: stopIdx,
    onComplete: onNext,
  });
  const autoplaySecondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="tour-panel" aria-label={lang === 'ur' ? 'رہنما دورہ' : 'Guided tour'}>
      <div className="tour-panel-header">
        <span className="tour-step-badge" aria-live="polite" aria-atomic="true">{label}</span>
        <div className="tour-panel-header-actions">
          <button
            className={`tour-share-btn${copied ? ' copied' : ''}`}
            onClick={() => share(window.location.href, tourTitle)}
            aria-label={copied ? t(lang, 'copied') : t(lang, 'share')}
            title={copied ? t(lang, 'copied') : t(lang, 'share')}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
              </svg>
            )}
          </button>
          <button
            className="tour-exit-btn"
            onClick={onExit}
            aria-label={lang === 'ur' ? 'دورہ ختم کریں' : 'End tour'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {lang === 'ur' ? 'ختم کریں' : 'End tour'}
          </button>
        </div>
      </div>

      <ShrineImage
        src={shrine?.imageUrl ?? null}
        alt={shrineName}
        category={shrine?.category ?? ''}
        className="related-card-img tour-stop-image"
        placeholderClassName="related-card-img-placeholder tour-stop-image"
        loading="eager"
      />

      <h3 className="tour-stop-name" lang={lang === 'ur' ? 'ur' : undefined}>{shrineName}</h3>

      <p className="tour-narrative" lang={lang === 'ur' ? 'ur' : undefined}>
        {narrativeText}
      </p>

      <div className="tour-audio">
        {audio.state === 'playing' ? (
          <button className="tour-audio-btn" onClick={audio.pause} aria-label={t(lang, 'audioPause')} title={t(lang, 'audioPause')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        ) : (
          <button className="tour-audio-btn" onClick={audio.play} aria-label={t(lang, 'audioPlay')} title={t(lang, 'audioPlay')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </button>
        )}
        {audio.state !== 'idle' && (
          <button className="tour-audio-btn" onClick={audio.stop} aria-label={t(lang, 'audioStop')} title={t(lang, 'audioStop')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" />
            </svg>
          </button>
        )}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {audio.state === 'playing' && t(lang, 'audioStatusPlaying')}
          {audio.state === 'paused' && t(lang, 'audioStatusPaused')}
        </span>
      </div>

      {visitingInfo && (
        <p className="tour-visiting-info" lang={lang === 'ur' ? 'ur' : undefined}>
          <strong>{VISITING_INFO_TITLE[lang]}: </strong>
          {visitingInfo}
        </p>
      )}

      {nextLegKm !== null && (
        <p className="tour-next-distance">
          {Math.round(nextLegKm)} {t(lang, 'kmUnit')} {t(lang, 'tourNextStopDistance')}
        </p>
      )}

      <div className="tour-progress">
        {tour.stops.map((_, i) => (
          <span
            key={i}
            className={`tour-progress-dot${i === stopIdx ? ' active' : i < stopIdx ? ' visited' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      {!reducedMotion && !isLast && (
        <div className="tour-autoplay">
          <span className="tour-autoplay-label">{t(lang, 'autoplayLabel')}</span>
          <button
            type="button"
            className="tour-toggle"
            role="switch"
            aria-checked={autoplayOn}
            aria-label={t(lang, 'autoplayLabel')}
            onClick={() => {
              setAutoplayOn((v) => !v);
              setAutoplayPaused(false);
            }}
          >
            <span className="tour-toggle-knob" aria-hidden="true" />
          </button>
          {autoplayOn && (
            <button
              type="button"
              className="tour-autoplay-pause"
              onClick={() => setAutoplayPaused((v) => !v)}
              aria-label={autoplayPaused ? t(lang, 'autoplayResume') : t(lang, 'autoplayPause')}
              title={autoplayPaused ? t(lang, 'autoplayResume') : t(lang, 'autoplayPause')}
            >
              {autoplayPaused ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" />
                </svg>
              )}
              <span aria-live="polite" aria-atomic="true">
                {!autoplayPaused && (lang === 'ur' ? `اگلا مقام ${autoplaySecondsLeft} سیکنڈ میں` : `Next in ${autoplaySecondsLeft}s`)}
              </span>
            </button>
          )}
        </div>
      )}

      <div className="tour-nav">
        <button
          className="tour-nav-btn"
          onClick={onPrev}
          disabled={isFirst}
          aria-label={lang === 'ur' ? 'پچھلا مقام' : 'Previous stop'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {lang === 'ur' ? 'پچھلا' : 'Previous'}
        </button>
        <button
          className="tour-nav-btn tour-nav-btn--next"
          onClick={onNext}
          aria-label={isLast
            ? (lang === 'ur' ? 'دورہ مکمل کریں' : 'Finish tour')
            : (lang === 'ur' ? 'اگلا مقام' : 'Next stop')}
        >
          {isLast
            ? (lang === 'ur' ? 'مکمل ✓' : 'Finish ✓')
            : (lang === 'ur' ? 'اگلا' : 'Next')}
          {!isLast && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

interface TourPreviewProps {
  tour: Tour;
  lang: Lang;
  shrines: Shrine[];
  onStart: () => void;
  onBack: () => void;
}

function TourPreview({ tour, lang, shrines, onStart, onBack }: TourPreviewProps) {
  const points = useMemo(() => resolveTourStops(tour, shrines), [tour, shrines]);
  const km = useMemo(() => totalDistanceKm(points.map((p) => p.shrine.latLng)), [points]);
  const hasDistance = points.length > 1;

  return (
    <div className="tour-preview">
      <button
        className="tour-back-btn"
        onClick={onBack}
        aria-label={t(lang, 'tourBackButton')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {t(lang, 'tourBackButton')}
      </button>

      <h3 className="tour-preview-title" lang={lang === 'ur' ? 'ur' : undefined}>
        {lang === 'ur' ? tour.titleUr : tour.title}
      </h3>
      <p className="tour-preview-description" lang={lang === 'ur' ? 'ur' : undefined}>
        {lang === 'ur' ? tour.descriptionUr : tour.description}
      </p>

      <dl className="tour-preview-stats">
        <div className="tour-preview-stat">
          <dt>{lang === 'ur' ? 'مقامات' : 'Stops'}</dt>
          <dd>{tour.stops.length}</dd>
        </div>
        {hasDistance && (
          <>
            <div className="tour-preview-stat">
              <dt>{t(lang, 'tourTotalDistance')}</dt>
              <dd>{Math.round(km)} {t(lang, 'kmUnit')}</dd>
            </div>
            <div className="tour-preview-stat">
              <dt>{t(lang, 'tourEstDriveTime')}</dt>
              <dd>{formatDriveTime(km, lang)}</dd>
            </div>
          </>
        )}
      </dl>

      <ol className="tour-preview-stops">
        {points.map((p, i) => (
          <li key={p.shrine.id} lang={lang === 'ur' ? 'ur' : undefined}>
            {i + 1}. {localizeShrineName(p.shrine, lang)}
          </li>
        ))}
      </ol>

      <button className="tour-nav-btn tour-nav-btn--next tour-start-btn" onClick={onStart}>
        {t(lang, 'tourStartButton')}
      </button>
    </div>
  );
}

interface TourListProps {
  lang: Lang;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onStart: (tourId: string) => void;
  onResume: (tourId: string, stopIdx: number) => void;
  shrines: Shrine[];
}

export function TourList({ lang, enabled, onToggle, onStart, onResume, shrines }: TourListProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTour = previewId ? TOURS.find((tr) => tr.id === previewId) ?? null : null;
  // Read fresh on every render — TourList remounts whenever the user leaves
  // an active tour, so this always reflects the latest recorded progress.
  const [progress, setProgress] = useState(getTourProgressState);

  const tourDistances = useMemo(() => {
    const map = new Map<string, number>();
    for (const tour of TOURS) {
      const points = resolveTourStops(tour, shrines);
      if (points.length > 1) map.set(tour.id, totalDistanceKm(points.map((p) => p.shrine.latLng)));
    }
    return map;
  }, [shrines]);

  const toggleLabel = enabled
    ? (lang === 'ur' ? 'رہنما دورے بند کریں' : 'Turn off guided tours')
    : (lang === 'ur' ? 'رہنما دورے آن کریں' : 'Turn on guided tours');

  const resumableTour = progress.lastActive
    ? TOURS.find((tr) => tr.id === progress.lastActive!.tourId) ?? null
    : null;

  if (previewTour) {
    return (
      <TourPreview
        tour={previewTour}
        lang={lang}
        shrines={shrines}
        onStart={() => {
          onStart(previewTour.id);
          setPreviewId(null);
        }}
        onBack={() => setPreviewId(null)}
      />
    );
  }

  return (
    <div className="tour-list">
      <div className="tour-list-header">
        <h3 className="tour-list-heading">
          {lang === 'ur' ? 'رہنما دورے' : 'Guided Tours'}
        </h3>
        <button
          type="button"
          className="tour-toggle"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <span className="tour-toggle-knob" aria-hidden="true" />
        </button>
      </div>
      {enabled && resumableTour && progress.lastActive && (
        <div className="tour-resume-banner">
          <div className="tour-resume-text">
            <strong lang={lang === 'ur' ? 'ur' : undefined}>
              {lang === 'ur' ? resumableTour.titleUr : resumableTour.title}
            </strong>
            <span>{t(lang, 'resumeTourPrompt')}</span>
          </div>
          <div className="tour-resume-actions">
            <button
              className="tour-resume-btn"
              onClick={() => onResume(resumableTour.id, progress.lastActive!.stopIdx)}
            >
              {t(lang, 'resumeButton')}
            </button>
            <button
              className="tour-resume-dismiss"
              onClick={() => {
                clearLastActive();
                setProgress(getTourProgressState());
              }}
              aria-label={t(lang, 'dismiss')}
              title={t(lang, 'dismiss')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {enabled && (
        <>
          <p className="tour-list-hint">
            {lang === 'ur'
              ? 'ایک دورہ شروع کریں اور نقشے پر مزارات کی سیر کریں'
              : 'Follow a curated route through related shrines'}
          </p>
          <div className="tour-list-cards">
            {TOURS.map((tour) => {
              const km = tourDistances.get(tour.id);
              const tourProgress = progress.tours[tour.id];
              return (
                <button
                  key={tour.id}
                  className="tour-card"
                  onClick={() => setPreviewId(tour.id)}
                >
                  <span className="tour-card-title" lang={lang === 'ur' ? 'ur' : undefined}>
                    {lang === 'ur' ? tour.titleUr : tour.title}
                  </span>
                  <span className="tour-card-meta">
                    {lang === 'ur' ? `${tour.stops.length} مقامات` : `${tour.stops.length} stops`}
                    {km !== undefined && ` · ${Math.round(km)} ${t(lang, 'kmUnit')}`}
                    {tourProgress && (
                      <>
                        {' · '}
                        <span className={`tour-card-status tour-card-status--${tourProgress.status}`}>
                          {tourProgress.status === 'completed'
                            ? t(lang, 'tourCompletedBadge')
                            : `${t(lang, 'tourInProgressBadge')} ${tourProgress.stopIdx + 1}/${tour.stops.length}`}
                        </span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
