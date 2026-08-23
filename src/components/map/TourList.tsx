import { useCallback, useMemo, useState } from 'react';
import type { TourTradition } from '../../lib/tours/tours';
import {
  TOURS,
  TRADITION_LABELS,
  REGION_LABELS,
  THEME_LABELS,
  ERA_LABELS,
  localizeTourTitle,
} from '../../lib/tours/tours';
import { resolveTourStops } from '../../lib/tours/tourRoute';
import { totalDistanceKm } from '../../lib/tours/tourGeo';
import { getTourProgressState, clearLastActive } from '../../lib/tours/tourProgress';
import { haversineKm } from '../../lib/data/shrineModel';
import { t, tFn } from '../../lib/i18n/uiStrings';
import { TourPreview } from './TourPreview';
import type { Shrine, Lang } from '../../types/shrine';
import { langAttr } from '../../lib/i18n/languages';

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
  const previewTour = previewId ? (TOURS.find((tr) => tr.id === previewId) ?? null) : null;
  // Read fresh on every render — TourList remounts whenever the user leaves
  // an active tour, so this always reflects the latest recorded progress.
  const [progress, setProgress] = useState(getTourProgressState);

  const [traditionFilter, setTraditionFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [eraFilter, setEraFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeTourFilterCount =
    (traditionFilter ? 1 : 0) +
    (regionFilter ? 1 : 0) +
    (themeFilter ? 1 : 0) +
    (eraFilter ? 1 : 0);

  const clearTourFilters = useCallback(() => {
    setTraditionFilter('');
    setRegionFilter('');
    setThemeFilter('');
    setEraFilter('');
  }, []);

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
    ? (TOURS.find((tr) => tr.id === progress.lastActive!.tourId) ?? null)
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
        <h3 className="tour-list-heading">{t(lang, 'guidedTours')}</h3>
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
            <strong lang={langAttr(lang)}>{localizeTourTitle(resumableTour, lang)}</strong>
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
              <svg
                width="12"
                height="12"
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
        </div>
      )}
      {enabled && (
        <>
          <p className="tour-list-hint">{t(lang, 'guidedToursHint')}</p>

          <button
            type="button"
            className="tour-near-me-btn"
            onClick={handleNearMe}
            disabled={geoStatus === 'loading'}
          >
            {t(lang, 'nearMe')}
          </button>
          {geoStatus === 'error' && (
            <p className="tour-geo-error">{t(lang, 'locationUnavailable')}</p>
          )}

          {/* Four rows of filter chips — tradition, region, theme, era — used to
              stand between the "near me" button and the tours themselves, which
              on a phone meant scrolling past twenty controls to reach eight
              cards. Folded behind one summary control now, with a count of what
              is on, in the same shape as the palette's filters button. The chips
              are unchanged inside. */}
          <div className="tour-filter-bar">
            <button
              type="button"
              className={`tour-filter-toggle${filtersOpen ? ' active' : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="tour-filters"
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
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              {t(lang, 'filtersLabel')}
              {activeTourFilterCount > 0 && (
                <span className="tour-filter-count">{fmtNum(activeTourFilterCount)}</span>
              )}
            </button>
            {/* The count of what survived the filters, so the effect is visible
                without opening the drawer. */}
            <span className="tour-filter-result-count">
              {fmtNum(tFn(lang, 'tourCount', filteredTours.length))}
            </span>
            {activeTourFilterCount > 0 && (
              <button type="button" className="tour-filter-clear" onClick={clearTourFilters}>
                {t(lang, 'clearFilters')}
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="tour-filters" id="tour-filters">
              {traditions.length > 1 && (
                <div className="filter-section">
                  <span className="filter-section-label" aria-hidden="true">
                    {t(lang, 'filterByTradition')}
                  </span>
                  <div
                    className="filter-chips"
                    role="group"
                    aria-label={t(lang, 'filterByTradition')}
                  >
                    <button
                      className={`filter-chip${!traditionFilter ? ' active' : ''}`}
                      onClick={() => setTraditionFilter('')}
                      aria-pressed={!traditionFilter}
                    >
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
                  <span className="filter-section-label" aria-hidden="true">
                    {t(lang, 'filterByRegion')}
                  </span>
                  <div className="filter-chips" role="group" aria-label={t(lang, 'filterByRegion')}>
                    <button
                      className={`filter-chip${!regionFilter ? ' active' : ''}`}
                      onClick={() => setRegionFilter('')}
                      aria-pressed={!regionFilter}
                    >
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
                  <span className="filter-section-label" aria-hidden="true">
                    {t(lang, 'filterByTheme')}
                  </span>
                  <div className="filter-chips" role="group" aria-label={t(lang, 'filterByTheme')}>
                    <button
                      className={`filter-chip${!themeFilter ? ' active' : ''}`}
                      onClick={() => setThemeFilter('')}
                      aria-pressed={!themeFilter}
                    >
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
                  <span className="filter-section-label" aria-hidden="true">
                    {t(lang, 'filterByEra')}
                  </span>
                  <div className="filter-chips" role="group" aria-label={t(lang, 'filterByEra')}>
                    <button
                      className={`filter-chip${!eraFilter ? ' active' : ''}`}
                      onClick={() => setEraFilter('')}
                      aria-pressed={!eraFilter}
                    >
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
                  className={`tour-card hover-lift${isNearest ? ' tour-card--nearest' : ''}`}
                  onClick={() => setPreviewId(tour.id)}
                >
                  <span className="tour-card-title" lang={langAttr(lang)}>
                    {localizeTourTitle(tour, lang)}
                  </span>
                  <span className="tour-card-meta">
                    <span className="tour-card-meta-text">
                      {fmtNum(tour.stops.length)} {t(lang, 'stopsLabel')}
                      {km !== undefined && ` · ${fmtNum(Math.round(km))} ${t(lang, 'kmUnit')}`}
                    </span>
                    {tourProgress && (
                      <span className={`tour-card-status tour-card-status--${tourProgress.status}`}>
                        {tourProgress.status === 'completed'
                          ? t(lang, 'tourCompletedBadge')
                          : `${t(lang, 'tourInProgressBadge')} ${fmtNum(tourProgress.stopIdx + 1)}/${fmtNum(tour.stops.length)}`}
                      </span>
                    )}
                    {isNearest && (
                      <span className="tour-card-nearest-badge">
                        {t(lang, 'nearestToYou')} ({fmtNum(Math.round(nearest!.km))}{' '}
                        {t(lang, 'kmUnit')})
                      </span>
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
