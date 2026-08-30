import { useMemo, useState } from 'react';
import type { Tour } from '../../lib/tours/tours';
import {
  localizeTourTitle,
  localizeTourDescription,
  localizeStopNarrative,
} from '../../lib/tours/tours';
import { resolveTourStops } from '../../lib/tours/tourRoute';
import { legDistancesKm } from '../../lib/tours/tourGeo';
import { useTourAudio } from '../../lib/tours/useTourAudio';
import { useAutoplay } from '../../lib/tours/useAutoplay';
import { getFieldValue, getUrduFieldValue } from '../../lib/data/fieldAliasing';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { ARTICLE_SECTION_DEFINITIONS } from '../../lib/data/constants';
import { t, tFn } from '../../lib/i18n/uiStrings';
import { ShrineImage } from '../ui/ShrineImage';
import { IMAGE_WIDTH } from '../../lib/images/thumbnail';
import { useShareLink } from '../../hooks/useShareLink';
import { useUrduArticles } from '../../hooks/useUrduArticlesReady';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { Shrine, Lang } from '../../types/shrine';
import { langAttr } from '../../lib/i18n/languages';
import { formatDistance } from '../../lib/i18n/formatDistance';
import { useReaderPreferences } from '../../lib/preferences/ReaderPreferencesContext';

/** How long each stop gets in autoplay before advancing to the next. */
const AUTOPLAY_STOP_DURATION_MS = 12000;

const VISITING_INFO_TITLE = ARTICLE_SECTION_DEFINITIONS.find((d) => d.id === 'visiting')!.title;

/** `urduArticlesReady` for the same reason as in ShrinePreview: the English
 *  fallback is correct for an entry with no Urdu section and wrong for every
 *  entry in the seconds after a language switch, when they are indistinguishable
 *  from a row (see `useUrduArticlesReady`). */
function localizedVisitingInfo(shrine: Shrine, lang: Lang, urduArticlesReady: boolean): string {
  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: getUrduFieldValue reads the sheet's Urdu-only Visiting Info column
  if (lang === 'ur') {
    return (
      getUrduFieldValue(shrine.raw, 'Visiting Info') ||
      (urduArticlesReady ? getFieldValue(shrine.raw, 'Visiting Info') : '')
    );
  }
  return getFieldValue(shrine.raw, 'Visiting Info');
}

interface AutoplayCountdownProps {
  active: boolean;
  paused: boolean;
  onTogglePause: () => void;
  resetKey: number;
  onComplete: () => void;
  lang: Lang;
  fmtNum: (n: number | string) => string;
}

/** Owns the 10Hz autoplay countdown so each tick re-renders only this small
 * pause-button/label leaf instead of the whole TourPanel. Stays mounted while
 * autoplay is off so a paused countdown keeps its remaining time. */
function AutoplayCountdown({
  active,
  paused,
  onTogglePause,
  resetKey,
  onComplete,
  lang,
  fmtNum,
}: AutoplayCountdownProps) {
  const { remainingMs } = useAutoplay({
    enabled: active && !paused,
    durationMs: AUTOPLAY_STOP_DURATION_MS,
    resetKey,
    onComplete,
  });
  const autoplaySecondsLeft = Math.ceil(remainingMs / 1000);

  if (!active) return null;

  return (
    <button
      type="button"
      className="tour-autoplay-pause"
      onClick={onTogglePause}
      aria-label={paused ? t(lang, 'autoplayResume') : t(lang, 'autoplayPause')}
      title={paused ? t(lang, 'autoplayResume') : t(lang, 'autoplayPause')}
    >
      {paused ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="6 4 20 12 6 20 6 4" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" />
          <rect x="14" y="5" width="4" height="14" />
        </svg>
      )}
      <span aria-live="polite" aria-atomic="true">
        {!paused && fmtNum(tFn(lang, 'nextIn', autoplaySecondsLeft))}
      </span>
    </button>
  );
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
  /* The reader's units, read here rather than threaded through as a prop:
     these components already take `lang` and `fmtNum` from the map, and a
     third formatting prop on four components is a prop drilled for a
     preference that every surface reads the same way. */
  const { units } = useReaderPreferences();
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

  const urduArticlesReady = useUrduArticles();
  const visitingInfo = shrine ? localizedVisitingInfo(shrine, lang, urduArticlesReady) : '';
  const { share, copied } = useShareLink();
  const tourTitle = localizeTourTitle(tour, lang);
  const narrativeText = localizeStopNarrative(stop, lang);

  const audio = useTourAudio({ tourId: tour.id, stopIndex: stopIdx, text: narrativeText, lang });

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [autoplayOn, setAutoplayOn] = useState(false);
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  return (
    <div className="tour-panel" aria-label={t(lang, 'guidedTourAriaLabel')}>
      <div className="tour-panel-header">
        <span className="tour-step-badge" aria-live="polite" aria-atomic="true">
          {label}
        </span>
        <div className="tour-panel-header-actions">
          <button
            className={`tour-share-btn${copied ? ' copied' : ''}`}
            onClick={() => share(window.location.href, tourTitle)}
            aria-label={copied ? t(lang, 'copied') : t(lang, 'share')}
            title={copied ? t(lang, 'copied') : t(lang, 'share')}
          >
            {copied ? (
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
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
                <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
              </svg>
            )}
          </button>
          <button
            className="tour-share-btn no-print"
            onClick={() => window.print()}
            aria-label={t(lang, 'printItinerary')}
            title={t(lang, 'printItinerary')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
          <button
            className="tour-exit-btn"
            onClick={onExit}
            aria-label={t(lang, 'endTourAriaLabel')}
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
        width={IMAGE_WIDTH.preview}
      />

      <h3 className="tour-stop-name" lang={langAttr(lang)}>
        {shrineName}
      </h3>

      <p className="tour-narrative" lang={langAttr(lang)}>
        {narrativeText}
      </p>

      <div className="tour-audio">
        {audio.state === 'playing' ? (
          <button
            className="tour-audio-btn"
            onClick={audio.pause}
            aria-label={t(lang, 'audioPause')}
            title={t(lang, 'audioPause')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        ) : (
          <button
            className="tour-audio-btn"
            onClick={audio.play}
            aria-label={t(lang, 'audioPlay')}
            title={t(lang, 'audioPlay')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </button>
        )}
        {audio.state !== 'idle' && (
          <button
            className="tour-audio-btn"
            onClick={audio.stop}
            aria-label={t(lang, 'audioStop')}
            title={t(lang, 'audioStop')}
          >
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
        <p className="tour-visiting-info" lang={langAttr(lang)}>
          <strong>{VISITING_INFO_TITLE[lang]}: </strong>
          {visitingInfo}
        </p>
      )}

      {nextLegKm !== null && (
        <p className="tour-next-distance">
          {formatDistance(nextLegKm, units, lang, fmtNum, { style: 'bare' })}{' '}
          {t(lang, 'tourNextStopDistance')}
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
          <AutoplayCountdown
            active={autoplayOn}
            paused={autoplayPaused}
            onTogglePause={() => setAutoplayPaused((v) => !v)}
            resetKey={stopIdx}
            onComplete={onNext}
            lang={lang}
            fmtNum={fmtNum}
          />
        </div>
      )}

      <div className="tour-print-itinerary">
        <h1>{tourTitle}</h1>
        <p>{localizeTourDescription(tour, lang)}</p>
        <ol>
          {points.map((p) => (
            <li key={p.shrine.id}>
              <h2 lang={langAttr(lang)}>{localizeShrineName(p.shrine, lang)}</h2>
              <p lang={langAttr(lang)}>{localizeStopNarrative(tour.stops[p.stopIndex], lang)}</p>
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
          {t(lang, 'previousButton')}
        </button>
        <button
          className="tour-nav-btn tour-nav-btn--next"
          onClick={onNext}
          aria-label={isLast ? t(lang, 'finishTourAriaLabel') : t(lang, 'nextStopAriaLabel')}
        >
          {isLast ? t(lang, 'finishButton') : t(lang, 'nextButton')}
          {!isLast && (
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
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
