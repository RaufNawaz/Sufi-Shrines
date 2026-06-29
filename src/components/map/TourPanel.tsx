import React from 'react';
import type { Tour } from '../../lib/tours/tours';
import { TOURS } from '../../lib/tours/tours';
import type { Shrine } from '../../types/shrine';

interface Props {
  tour: Tour;
  stopIdx: number;
  shrine: Shrine | null;
  lang: string;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

export function TourPanel({ tour, stopIdx, shrine, lang, onNext, onPrev, onExit }: Props) {
  const stop = tour.stops[stopIdx];
  const isFirst = stopIdx === 0;
  const isLast = stopIdx === tour.stops.length - 1;
  const shrineName = shrine?.name ?? stop.shrineSlug;

  const label = lang === 'ur'
    ? `${stopIdx + 1} / ${tour.stops.length}`
    : `Stop ${stopIdx + 1} of ${tour.stops.length}`;

  return (
    <div className="tour-panel" aria-label={lang === 'ur' ? 'رہنما دورہ' : 'Guided tour'}>
      <div className="tour-panel-header">
        <span className="tour-step-badge" aria-live="polite" aria-atomic="true">{label}</span>
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

      <h3 className="tour-stop-name" lang={lang === 'ur' ? 'ur' : undefined}>{shrineName}</h3>

      <p className="tour-narrative" lang={lang === 'ur' ? 'ur' : undefined}>
        {lang === 'ur' ? stop.narrativeUr : stop.narrative}
      </p>

      <div className="tour-progress">
        {tour.stops.map((_, i) => (
          <span
            key={i}
            className={`tour-progress-dot${i === stopIdx ? ' active' : i < stopIdx ? ' visited' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

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

interface TourListProps {
  lang: string;
  onStart: (tourId: string) => void;
}

export function TourList({ lang, onStart }: TourListProps) {
  return (
    <div className="tour-list">
      <h3 className="tour-list-heading">
        {lang === 'ur' ? 'رہنما دورے' : 'Guided Tours'}
      </h3>
      <p className="tour-list-hint">
        {lang === 'ur'
          ? 'ایک دورہ شروع کریں اور نقشے پر مزارات کی سیر کریں'
          : 'Follow a curated route through related shrines'}
      </p>
      <div className="tour-list-cards">
        {TOURS.map((tour) => (
          <button
            key={tour.id}
            className="tour-card"
            onClick={() => onStart(tour.id)}
          >
            <span className="tour-card-title" lang={lang === 'ur' ? 'ur' : undefined}>
              {lang === 'ur' ? tour.titleUr : tour.title}
            </span>
            <span className="tour-card-meta">
              {lang === 'ur' ? `${tour.stops.length} مقامات` : `${tour.stops.length} stops`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
