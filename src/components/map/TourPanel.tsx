import React, { useCallback, useMemo, useState } from 'react';
import type { Tour, TourTradition } from '../../lib/tours/tours';
import {
  TOURS,
  TRADITION_LABELS,
  REGION_LABELS,
  THEME_LABELS,
  ERA_LABELS,
  localizeTourTitle,
  localizeTourDescription,
  localizeStopNarrative,
} from '../../lib/tours/tours';
import { resolveTourStops } from '../../lib/tours/tourRoute';
import { legDistancesKm, totalDistanceKm, estimateDriveTime } from '../../lib/tours/tourGeo';
import { getTourProgressState, clearLastActive } from '../../lib/tours/tourProgress';
import { useTourAudio } from '../../lib/tours/useTourAudio';
import { useAutoplay } from '../../lib/tours/useAutoplay';
import { getFieldValue, getUrduFieldValue } from '../../lib/data/fieldAliasing';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { haversineKm } from '../../lib/data/shrineModel';
import { ARTICLE_SECTION_DEFINITIONS } from '../../lib/data/constants';
import { t, tFn } from '../../lib/i18n/uiStrings';
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

function formatDriveTime(km: number, lang: Lang, fmtNum: (n: number | string) => string): string {
  const { hours, minutes } = estimateDriveTime(km);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${fmtNum(hours)}${t(lang, 'hoursAbbrev')}`);
  parts.push(`${fmtNum(minutes)}${t(lang, 'minutesAbbrev')}`);
  return parts.join(' ');
}

interface Props {
  tour: Tour;
  stopIdx: number;
  shrine: Shrine | null;
  shrines: Shrine[];
  lang: Lang;
  fmtNum?: (n: number | string) => string;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

export function TourPanel({
  tour,
  stopIdx,
  shrine,
  shrines,
  lang,
  fmtNum = (n) => String(n),
  onNext,
  onPrev,
  onExit,
}: Props) {
  const stop = tour.stops[stopIdx];
  const isFirst = stopIdx === 0;
  const isLast = stopIdx === tour.stops.length - 1;
  const shrineName = shrine ? localizeShrineName(shrine, lang) : stop.shrineSlug;

  const label = fmtNum(tFn(lang, 'stopOf', stopIdx + 1, tour.stops.length));

  const points = useMemo(() => resolveTourStops(tour, shrines), [tour, shrines]);
  const legsKm = useMemo(() => legDistancesKm(points.map((p) => p.shrine.latLng)), [points]);
  const activePointIdx = points.findIndex((p) => p.stopIndex === stopIdx);
  const nextLegKm =
    activePointIdx >= 0 && activePointIdx < points.length - 1 ? legsKm[activePointIdx + 1] : null;

  const visitingInfo = shrine ? localizedVisitingInfo(shrine, lang) : '';
  const { share, copied } = useShareLink();
  const tourTitle = localizeTourTitle(tour, lang);
  const narrativeText = localizeStopNarrative(stop, lang);

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
    <div className="tour-panel" aria-label={t(lang, 'guidedTourAriaLabel')}>
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
            className="tour-share-btn no-print"
            onClick={() => window.print()}
            aria-label={t(lang, 'printItinerary')}
            title={t(lang, 'printItinerary')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
          <button
            className="tour-exit-btn"
            onClick={onExit}
            aria-label={t(lang, 'endTourAriaLabel')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {t(lang, 'endTour')}
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
          {fmtNum(Math.round(nextLegKm))} {t(lang, 'kmUnit')} {t(lang, 'tourNextStopDistance')}
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
                {!autoplayPaused && fmtNum(tFn(lang, 'nextIn', autoplaySecondsLeft))}
              </span>
            </button>
          )}
        </div>
      )}

      <div className="tour-print-itinerary">
        <h1>{tourTitle}</h1>
        <p>{localizeTourDescription(tour, lang)}</p>
        <ol>
          {points.map((p) => (
            <li key={p.shrine.id}>
              <h2 lang={lang === 'ur' ? 'ur' : undefined}>{localizeShrineName(p.shrine, lang)}</h2>
              <p lang={lang === 'ur' ? 'ur' : undefined}>
                {localizeStopNarrative(tour.stops[p.stopIndex], lang)}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="tour-nav">
        <button
          className="tour-nav-btn"
          onClick={onPrev}
          disabled={isFirst}
          aria-label={t(lang, 'previousStopAriaLabel')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t(lang, 'previousButton')}
        </button>
        <button
          className="tour-nav-btn tour-nav-btn--next"
          onClick={onNext}
          aria-label={isLast ? t(lang, 'finishTourAriaLabel') : t(lang, 'nextStopAriaLabel')}
        >
          {isLast ? t(lang, 'finishButton') : t(lang, 'nextButton')}
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
  fmtNum: (n: number | string) => string;
  shrines: Shrine[];
  onStart: () => void;
  onBack: () => void;
  onPreviewTour: (tourId: string) => void;
}

function TourPreview({ tour, lang, fmtNum, shrines, onStart, onBack, onPreviewTour }: TourPreviewProps) {
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
        {localizeTourTitle(tour, lang)}
      </h3>
      <p className="tour-preview-description" lang={lang === 'ur' ? 'ur' : undefined}>
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
              <dd>{fmtNum(Math.round(km))} {t(lang, 'kmUnit')}</dd>
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
          <li key={p.shrine.id} lang={lang === 'ur' ? 'ur' : undefined}>
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
                <span lang={lang === 'ur' ? 'ur' : undefined}>
                  {localizeTourTitle(related, lang)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TourListProps {
  lang: Lang;
  fmtNum?: (n: number | string) => string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onStart: (tourId: string) => void;
  onResume: (tourId: string, stopIdx: number) => void;
  shrines: Shrine[];
}

export function TourList({
  lang,
  fmtNum = (n) => String(n),
  enabled,
  onToggle,
  onStart,
  onResume,
  shrines,
}: TourListProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTour = previewId ? TOURS.find((tr) => tr.id === previewId) ?? null : null;
  // Read fresh on every render — TourList remounts whenever the user leaves
  // an active tour, so this always reflects the latest recorded progress.
  const [progress, setProgress] = useState(getTourProgressState);

  const [traditionFilter, setTraditionFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [eraFilter, setEraFilter] = useState('');

  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [nearest, setNearest] = useState<{ tourId: string; km: number } | null>(null);

  const tourDistances = useMemo(() => {
    const map = new Map<string, number>();
    for (const tour of TOURS) {
      const points = resolveTourStops(tour, shrines);
      if (points.length > 1) map.set(tour.id, totalDistanceKm(points.map((p) => p.shrine.latLng)));
    }
    return map;
  }, [shrines]);

  const traditions = useMemo(() => Array.from(new Set(TOURS.map((tr) => tr.tradition))), []);
  const regions = useMemo(() => Array.from(new Set(TOURS.map((tr) => tr.region))), []);
  const themes = useMemo(() => Array.from(new Set(TOURS.map((tr) => tr.theme))), []);
  const eras = useMemo(() => Array.from(new Set(TOURS.map((tr) => tr.era))), []);

  const filteredTours = useMemo(
    () =>
      TOURS.filter(
        (tr) =>
          (!traditionFilter || tr.tradition === traditionFilter) &&
          (!regionFilter || tr.region === regionFilter) &&
          (!themeFilter || tr.theme === themeFilter) &&
          (!eraFilter || tr.era === eraFilter),
      ),
    [traditionFilter, regionFilter, themeFilter, eraFilter],
  );

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let best: { tourId: string; km: number } | null = null;
        for (const tour of TOURS) {
          for (const point of resolveTourStops(tour, shrines)) {
            const km = haversineKm(userLoc, point.shrine.latLng);
            if (!best || km < best.km) best = { tourId: tour.id, km };
          }
        }
        setNearest(best);
        setGeoStatus('idle');
      },
      () => setGeoStatus('error'),
      { timeout: 10000 },
    );
  }, [shrines]);

  const toggleLabel = enabled ? t(lang, 'turnOffTours') : t(lang, 'turnOnTours');

  const resumableTour = progress.lastActive
    ? TOURS.find((tr) => tr.id === progress.lastActive!.tourId) ?? null
    : null;

  if (previewTour) {
    return (
      <TourPreview
        tour={previewTour}
        lang={lang}
        fmtNum={fmtNum}
        shrines={shrines}
        onStart={() => {
          onStart(previewTour.id);
          setPreviewId(null);
        }}
        onBack={() => setPreviewId(null)}
        onPreviewTour={setPreviewId}
      />
    );
  }

  return (
    <div className="tour-list">
      <div className="tour-list-header">
        <h3 className="tour-list-heading">
          {t(lang, 'guidedTours')}
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
              {localizeTourTitle(resumableTour, lang)}
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
            {t(lang, 'guidedToursHint')}
          </p>

          <button type="button" className="tour-near-me-btn" onClick={handleNearMe} disabled={geoStatus === 'loading'}>
            {t(lang, 'nearMe')}
          </button>
          {geoStatus === 'error' && <p className="tour-geo-error">{t(lang, 'locationUnavailable')}</p>}

          {traditions.length > 1 && (
            <div className="filter-section">
              <span className="filter-section-label" aria-hidden="true">{t(lang, 'filterByTradition')}</span>
              <div className="filter-chips" role="group" aria-label={t(lang, 'filterByTradition')}>
                <button className={`filter-chip${!traditionFilter ? ' active' : ''}`} onClick={() => setTraditionFilter('')} aria-pressed={!traditionFilter}>
                  {t(lang, 'filterAll')}
                </button>
                {traditions.map((tr) => (
                  <button
                    key={tr}
                    className={`filter-chip${traditionFilter === tr ? ' active' : ''}`}
                    onClick={() => setTraditionFilter(traditionFilter === tr ? '' : tr)}
                    aria-pressed={traditionFilter === tr}
                  >
                    {TRADITION_LABELS[tr as TourTradition][lang]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {regions.length > 1 && (
            <div className="filter-section">
              <span className="filter-section-label" aria-hidden="true">{t(lang, 'filterByRegion')}</span>
              <div className="filter-chips" role="group" aria-label={t(lang, 'filterByRegion')}>
                <button className={`filter-chip${!regionFilter ? ' active' : ''}`} onClick={() => setRegionFilter('')} aria-pressed={!regionFilter}>
                  {t(lang, 'filterAll')}
                </button>
                {regions.map((r) => (
                  <button
                    key={r}
                    className={`filter-chip${regionFilter === r ? ' active' : ''}`}
                    onClick={() => setRegionFilter(regionFilter === r ? '' : r)}
                    aria-pressed={regionFilter === r}
                  >
                    {REGION_LABELS[r]?.[lang] ?? r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {themes.length > 1 && (
            <div className="filter-section">
              <span className="filter-section-label" aria-hidden="true">{t(lang, 'filterByTheme')}</span>
              <div className="filter-chips" role="group" aria-label={t(lang, 'filterByTheme')}>
                <button className={`filter-chip${!themeFilter ? ' active' : ''}`} onClick={() => setThemeFilter('')} aria-pressed={!themeFilter}>
                  {t(lang, 'filterAll')}
                </button>
                {themes.map((th) => (
                  <button
                    key={th}
                    className={`filter-chip${themeFilter === th ? ' active' : ''}`}
                    onClick={() => setThemeFilter(themeFilter === th ? '' : th)}
                    aria-pressed={themeFilter === th}
                  >
                    {THEME_LABELS[th]?.[lang] ?? th}
                  </button>
                ))}
              </div>
            </div>
          )}

          {eras.length > 1 && (
            <div className="filter-section">
              <span className="filter-section-label" aria-hidden="true">{t(lang, 'filterByEra')}</span>
              <div className="filter-chips" role="group" aria-label={t(lang, 'filterByEra')}>
                <button className={`filter-chip${!eraFilter ? ' active' : ''}`} onClick={() => setEraFilter('')} aria-pressed={!eraFilter}>
                  {t(lang, 'filterAll')}
                </button>
                {eras.map((e) => (
                  <button
                    key={e}
                    className={`filter-chip${eraFilter === e ? ' active' : ''}`}
                    onClick={() => setEraFilter(eraFilter === e ? '' : e)}
                    aria-pressed={eraFilter === e}
                  >
                    {fmtNum(ERA_LABELS[e]?.[lang] ?? e)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="tour-list-cards">
            {filteredTours.map((tour) => {
              const km = tourDistances.get(tour.id);
              const tourProgress = progress.tours[tour.id];
              const isNearest = nearest?.tourId === tour.id;
              return (
                <button
                  key={tour.id}
                  className={`tour-card${isNearest ? ' tour-card--nearest' : ''}`}
                  onClick={() => setPreviewId(tour.id)}
                >
                  <span className="tour-card-title" lang={lang === 'ur' ? 'ur' : undefined}>
                    {localizeTourTitle(tour, lang)}
                  </span>
                  <span className="tour-card-meta">
                    {fmtNum(tour.stops.length)} {t(lang, 'stopsLabel')}
                    {km !== undefined && ` · ${fmtNum(Math.round(km))} ${t(lang, 'kmUnit')}`}
                    {tourProgress && (
                      <>
                        {' · '}
                        <span className={`tour-card-status tour-card-status--${tourProgress.status}`}>
                          {tourProgress.status === 'completed'
                            ? t(lang, 'tourCompletedBadge')
                            : `${t(lang, 'tourInProgressBadge')} ${fmtNum(tourProgress.stopIdx + 1)}/${fmtNum(tour.stops.length)}`}
                        </span>
                      </>
                    )}
                    {isNearest && (
                      <>
                        {' · '}
                        <span className="tour-card-nearest-badge">
                          {t(lang, 'nearestToYou')} ({fmtNum(Math.round(nearest!.km))} {t(lang, 'kmUnit')})
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
