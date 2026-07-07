import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine, Lang } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { translateToUrdu } from '../../lib/i18n/urduFallback';
import { categoryKey } from '../../lib/data/categoryKey';
import { ShrineGlyph } from '../ui/ShrineGlyph';
import { extractLeadPreviewText } from '../../lib/data/articleParsing';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useSearch } from '../../lib/search/useSearch';
import { parseEra, ERA_MIN, ERA_MAX } from '../../lib/data/era';
import { TimeSlider } from './TimeSlider';
import type { Tour } from '../../lib/tours/tours';
import { TOURS, localizeTourTitle } from '../../lib/tours/tours';
import { TourPanel, TourList } from './TourPanel';
import { t as translate } from '../../lib/i18n/uiStrings';

const SEARCH_DEBOUNCE_MS = 200;

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-match">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

function ShrineListSkeleton() {
  return (
    <div className="shrine-list-panel" aria-hidden="true" aria-busy="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="shrine-list-item shrine-list-item--skeleton">
          <div className="shrine-list-thumb-slot skeleton" />
          <div className="shrine-list-info">
            <div className="skeleton skeleton-list-name" />
            <div className="skeleton skeleton-list-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  shrines: Shrine[];
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  onSelect: (shrine: Shrine | null) => void;
  onRetry: () => void;
  isOpen: boolean;
  onToggle?: () => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  activeRegion: string;
  onRegionChange: (region: string) => void;
  activeSaint: string;
  onSaintChange: (saint: string) => void;
  eraMin: number;
  eraMax: number;
  onEraChange: (range: [number, number]) => void;
  toursEnabled: boolean;
  onToursToggle: (enabled: boolean) => void;
  activeTour: Tour | null;
  activeTourStop: number;
  activeTourShrine: Shrine | null;
  onStartTour: (tourId: string) => void;
  onResumeTour: (tourId: string, stopIdx: number) => void;
  onTourNext: () => void;
  onTourPrev: () => void;
  onTourExit: () => void;
  /** `?embed=1` — hides the header, search, and browse chrome for iframes. */
  embed?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function MapSidebar({
  shrines,
  selectedId,
  loading,
  error,
  onSelect,
  onRetry,
  isOpen,
  onToggle,
  activeCategory,
  onCategoryChange,
  activeRegion,
  onRegionChange,
  activeSaint,
  onSaintChange,
  eraMin,
  eraMax,
  onEraChange,
  toursEnabled,
  onToursToggle,
  activeTour,
  activeTourStop,
  activeTourShrine,
  onStartTour,
  onResumeTour,
  onTourNext,
  onTourPrev,
  onTourExit,
  embed = false,
}: Props) {
  const { lang, t, tCount, localizeField, numerals, setNumerals, fmtNum } = useLang();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchRaw, setSearchRaw] = useState('');
  const [showList, setShowList] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useDebounce(searchRaw, SEARCH_DEBOUNCE_MS);

  const hasEraFilter = eraMin !== ERA_MIN || eraMax !== ERA_MAX;
  const hasActiveFilter = Boolean(activeCategory || activeRegion || activeSaint || hasEraFilter);

  // Collapse list whenever a shrine is selected (from map marker or any other source)
  useEffect(() => {
    if (selectedId !== null) setShowList(false);
  }, [selectedId]);

  // `/` key opens the list and focuses the search field
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      setShowList(true);
      setTimeout(() => searchRef.current?.focus(), 0);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const localizeName = useCallback(
    (shrine: Shrine) => localizeShrineName(shrine, lang),
    [lang],
  );

  const categories = useMemo(() => {
    const cats = new Set(shrines.map((s) => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [shrines]);

  const regions = useMemo(() => {
    const regs = new Set(shrines.map((s) => s.region).filter(Boolean));
    return Array.from(regs).sort();
  }, [shrines]);

  const saints = useMemo(() => {
    const saintSet = new Set(shrines.map((s) => s.sufiSaint).filter(Boolean));
    return Array.from(saintSet).sort();
  }, [shrines]);

  // Worker-based fuzzy search — falls back to "show all" until the index is ready
  const { ids: searchIds } = useSearch(shrines, search);

  const filtered = useMemo(() => {
    let result = shrines;
    if (activeCategory) result = result.filter((s) => s.category === activeCategory);
    if (activeRegion) result = result.filter((s) => s.region === activeRegion);
    if (activeSaint) result = result.filter((s) => s.sufiSaint === activeSaint);
    if (hasEraFilter) {
      result = result.filter((s) => {
        if (!s.founded) return false;
        const era = parseEra(s.founded);
        if (!era) return false;
        return era.maxCentury >= eraMin && era.minCentury <= eraMax;
      });
    }
    if (search.trim()) {
      if (searchIds !== null) {
        // Worker results available — use them (ranked, fuzzy)
        result = result.filter((s) => searchIds.has(s.id));
      } else {
        // Worker not ready yet — fall back to instant substring match
        const q = search.trim().toLowerCase();
        result = result.filter((s) => {
          const name = localizeName(s).toLowerCase();
          return (
            name.includes(q) ||
            (s.location || '').toLowerCase().includes(q) ||
            (s.sufiSaint || '').toLowerCase().includes(q) ||
            (s.category || '').toLowerCase().includes(q)
          );
        });
      }
    }
    return result;
  }, [shrines, activeCategory, activeRegion, activeSaint, search, searchIds, localizeName, hasEraFilter, eraMin, eraMax]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Shrine[]>();
    for (const shrine of filtered) {
      const cat = shrine.category || t('uncategorized');
      const group = groups.get(cat) || [];
      group.push(shrine);
      groups.set(cat, group);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, lang === 'ur' ? 'ur' : 'en'));
  }, [filtered, t, lang]);

  const selectedShrine = useMemo(
    () => (selectedId !== null ? shrines.find((s) => s.id === selectedId) : null),
    [selectedId, shrines],
  );

  const clearAllFilters = useCallback(() => {
    setSearchRaw('');
    onCategoryChange('');
    onRegionChange('');
    onSaintChange('');
    onEraChange([ERA_MIN, ERA_MAX]);
  }, [onCategoryChange, onRegionChange, onSaintChange, onEraChange]);

  return (
    <aside
      className={`sidebar${isOpen ? '' : ' collapsed'}`}
      id="sidebar"
      aria-label="Shrine browser"
    >
      {/* Mobile drag handle — tap to toggle peek/full */}
      {isMobile && (
        <button
          className="sidebar-sheet-handle"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse sheet' : 'Expand sheet'}
          aria-expanded={isOpen}
          aria-controls="sidebar"
        >
          <div className="sheet-handle-pill" aria-hidden="true" />
        </button>
      )}

      {/* Header — hidden in embed mode for minimal iframe chrome */}
      {!embed && (
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <ShrineGlyph className="brand-icon" />
            <h1 className="sidebar-title">
              {t('title')}
            </h1>
          </div>
          <div className="sidebar-actions">
            {lang === 'ur' && (
              <button
                type="button"
                className="icon-btn numerals-toggle"
                onClick={() => setNumerals(numerals === 'eastern' ? 'western' : 'eastern')}
                aria-label={numerals === 'eastern' ? t('switchToWesternNumerals') : t('switchToEasternNumerals')}
                title={numerals === 'eastern' ? t('switchToWesternNumerals') : t('switchToEasternNumerals')}
              >
                {numerals === 'eastern' ? '۱۲۳' : '123'}
              </button>
            )}
            <DarkModeToggle />
            <LanguageToggle />
          </div>
        </div>
      )}

      {/* Status bar */}
      {loading && (
        <div className="status-bar" role="status" aria-live="polite">
          <span className="spinner" />
          <span>{t('loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="error-card" role="alert">
          <p className="error-message">{t('errorLoadingData')}</p>
          <button className="retry-btn" onClick={onRetry}>
            {t('retry')}
          </button>
        </div>
      )}

      {/* Table-of-shrines toggle — hidden in embed mode */}
      {!error && !embed && (
        <div className="list-toggle-bar">
          <button
            className={`list-toggle-btn${showList ? ' active' : ''}`}
            onClick={() => setShowList((v) => !v)}
            aria-expanded={showList}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {t('tableButton')}
            {hasActiveFilter && <span className="filter-active-dot" aria-label="filters active" />}
          </button>
        </div>
      )}

      {/* List view */}
      {showList ? (
        <>
          {/* Search */}
          <div className="search-bar">
            <div className="search-input-wrap">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                className="search-input"
                dir={lang === 'ur' ? 'rtl' : undefined}
                placeholder={t('searchPlaceholder')}
                value={searchRaw}
                onChange={(e) => setSearchRaw(e.target.value)}
                aria-label={t('searchPlaceholder')}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              {searchRaw && (
                <button
                  className="search-clear"
                  onClick={() => {
                    setSearchRaw('');
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          {categories.length > 1 && (
            <div className="filter-section">
              <div className="filter-chips" role="group" aria-label="Filter by category">
                <button
                  className={`filter-chip${!activeCategory ? ' active' : ''}`}
                  onClick={() => onCategoryChange('')}
                  aria-pressed={!activeCategory}
                >
                  {t('filterAll')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-chip${activeCategory === cat ? ' active' : ''}`}
                    onClick={() => onCategoryChange(activeCategory === cat ? '' : cat)}
                    aria-pressed={activeCategory === cat}
                  >
                    {localizeField(shrines.find((s) => s.category === cat)!.raw, 'Category') || cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Region chips */}
          {regions.length > 1 && (
            <div className="filter-section">
              <span className="filter-section-label" aria-hidden="true">
                {t('filterByRegion')}
              </span>
              <div className="filter-chips" role="group" aria-label="Filter by region">
                <button
                  className={`filter-chip${!activeRegion ? ' active' : ''}`}
                  onClick={() => onRegionChange('')}
                  aria-pressed={!activeRegion}
                >
                  {t('filterAll')}
                </button>
                {regions.map((reg) => (
                  <button
                    key={reg}
                    className={`filter-chip${activeRegion === reg ? ' active' : ''}`}
                    onClick={() => onRegionChange(activeRegion === reg ? '' : reg)}
                    aria-pressed={activeRegion === reg}
                  >
                    {lang === 'ur' ? translateToUrdu(reg) : reg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saint chips */}
          {saints.length > 1 && (
            <div className="filter-section">
              <span className="filter-section-label" aria-hidden="true">
                {t('saintLabel')}
              </span>
              <div className="filter-chips" role="group" aria-label="Filter by Sufi saint">
                <button
                  className={`filter-chip${!activeSaint ? ' active' : ''}`}
                  onClick={() => onSaintChange('')}
                  aria-pressed={!activeSaint}
                >
                  {t('filterAll')}
                </button>
                {saints.map((saint) => (
                  <button
                    key={saint}
                    className={`filter-chip${activeSaint === saint ? ' active' : ''}`}
                    onClick={() => onSaintChange(activeSaint === saint ? '' : saint)}
                    aria-pressed={activeSaint === saint}
                  >
                    {localizeField(shrines.find((s) => s.sufiSaint === saint)!.raw, 'Sufi Saint') || saint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time-slider by founding era */}
          <TimeSlider
            value={[eraMin, eraMax]}
            onChange={onEraChange}
            lang={lang}
            fmtNum={fmtNum}
          />

          {/* Result count */}
          <div className="shrine-list-status" aria-live="polite" aria-atomic="true">
            {tCount(filtered.length)}
          </div>

          {/* Grouped list or skeleton while first load */}
          {loading && shrines.length === 0 ? (
            <ShrineListSkeleton />
          ) : (
            <div className="shrine-list-panel" role="list" aria-label="Shrine list">
              {filtered.length === 0 && !loading && (
                <div className="shrine-list-empty-state">
                  <svg className="shrine-list-empty-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <p className="shrine-list-empty-title">{t('noMatches')}</p>
                  {search && (
                    <p className="shrine-list-empty-query">"{search}"</p>
                  )}
                  {(search || hasActiveFilter) && (
                    <button
                      className="shrine-list-empty-clear"
                      onClick={clearAllFilters}
                    >
                      {t('clearFilters')}
                    </button>
                  )}
                </div>
              )}
              {grouped.map(([cat, items]) => (
                <div key={cat}>
                  {grouped.length > 1 && (
                    <div className="shrine-list-group-heading" aria-label={`Category: ${cat}`}>
                      {localizeField(items[0].raw, 'Category') || cat}
                    </div>
                  )}
                  {items.map((shrine) => {
                    const name = localizeName(shrine);
                    const location = localizeField(shrine.raw, 'Location') || shrine.location;
                    const catKey = categoryKey(shrine.category);
                    return (
                      <button
                        key={shrine.id}
                        className={`shrine-list-item${shrine.id === selectedId ? ' selected' : ''}`}
                        role="listitem"
                        onClick={() => {
                          onSelect(shrine);
                          setShowList(false);
                        }}
                        aria-pressed={shrine.id === selectedId}
                      >
                        <div className={`shrine-list-thumb-slot${shrine.imageUrl ? '' : ` shrine-list-thumb-slot--empty shrine-list-thumb-slot--${catKey}`}`}>
                          {shrine.imageUrl ? (
                            <img
                              className="shrine-list-thumb-img"
                              src={shrine.imageUrl}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                const slot = (e.target as HTMLImageElement).parentElement;
                                if (slot) {
                                  slot.classList.add('shrine-list-thumb-slot--empty');
                                  slot.classList.add(`shrine-list-thumb-slot--${catKey}`);
                                }
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ShrineGlyph className="shrine-list-thumb-icon" />
                          )}
                        </div>
                        <div className="shrine-list-info">
                          <div className="shrine-list-name">{highlightMatch(name, search)}</div>
                          {location && (
                            <div className="shrine-list-meta">{location}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Detail view */
        <div className="sidebar-detail" id="main-content">
          {activeTour ? (
            <TourPanel
              tour={activeTour}
              stopIdx={activeTourStop}
              shrine={activeTourShrine}
              shrines={shrines}
              lang={lang}
              fmtNum={fmtNum}
              onNext={onTourNext}
              onPrev={onTourPrev}
              onExit={onTourExit}
            />
          ) : selectedShrine ? (
            <ShrinePreview
              shrine={selectedShrine}
              lang={lang}
              localizeField={localizeField}
              toursEnabled={toursEnabled}
              onStartTour={onStartTour}
            />
          ) : (
            <>
              <WelcomeCard t={t} embed={embed} />
              <TourList
                lang={lang}
                fmtNum={fmtNum}
                enabled={toursEnabled}
                onToggle={onToursToggle}
                onStart={onStartTour}
                onResume={onResumeTour}
                shrines={shrines}
              />
            </>
          )}
        </div>
      )}
    </aside>
  );
}

function WelcomeCard({
  t,
  embed = false,
}: {
  t: (k: Parameters<ReturnType<typeof useLang>['t']>[0]) => string;
  embed?: boolean;
}) {
  return (
    <div className="welcome-card">
      <div className="welcome-card-icon-wrap" aria-hidden="true">
        <svg className="welcome-card-icon" viewBox="0 0 64 64" fill="currentColor">
          <path d="M32 6l-3 6H22v3h2v4.6C18.2 21.4 15 25.5 15 30.5h34c0-5-3.2-9.1-9-11V15h2v-3H35l-3-6zm-14 27v26h28V33H18zm8 8h12v10H26V41z" />
        </svg>
      </div>
      <h2 className="welcome-card-title">
        {t('exploreTitle')}
      </h2>
      <p className="welcome-card-text">{t('noSelection')}</p>
      {/* The "list button above" this hint refers to is hidden in embed mode */}
      {!embed && <p className="welcome-card-hint">{t('exploreHint')}</p>}
    </div>
  );
}

function ShrinePreview({
  shrine,
  lang,
  localizeField,
  toursEnabled,
  onStartTour,
}: {
  shrine: Shrine;
  lang: string;
  localizeField: (row: typeof shrine.raw, field: string) => string;
  toursEnabled: boolean;
  onStartTour: (tourId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const relatedTour = toursEnabled
    ? TOURS.find((tr) => tr.stops.some((s) => s.shrineSlug === shrine.slug)) ?? null
    : null;

  const name = localizeShrineName(shrine, lang);

  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const category = localizeField(shrine.raw, 'Category') || shrine.category;
  const saint = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const founded =
    localizeField(shrine.raw, 'Founded/Opened') ||
    localizeField(shrine.raw, 'Founded') ||
    shrine.founded;

  const descRaw =
    lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') ||
        getFieldValue(shrine.raw, 'Description')
      : getFieldValue(shrine.raw, 'Description');
  const leadText = descRaw ? extractLeadPreviewText(descRaw) : '';

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Clear timer on unmount
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  return (
    <div className="preview-card">
      {shrine.imageUrl ? (
        <img
          src={shrine.imageUrl}
          alt={name}
          className="preview-card-hero"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="preview-card-hero-placeholder" aria-hidden="true">
          <ShrineGlyph className="preview-card-hero-icon" />
        </div>
      )}
      <h2 className="preview-title">
        <Link to={`/shrine/${shrine.slug}`} lang={lang === 'ur' ? 'ur' : undefined}>
          {name}
        </Link>
      </h2>
      <div className="preview-meta-row">
        {category && <span>{category}</span>}
        {location && <span>· {location}</span>}
        {founded && <span>· {founded}</span>}
      </div>
      {saint && (
        <div className="preview-meta-row">
          <span>🕌 {saint}</span>
        </div>
      )}
      {leadText && <p className="preview-description">{leadText}</p>}
      {relatedTour && (
        <div className="preview-related-tour">
          <span>
            {translate(lang as Lang, 'partOfTour')}: {localizeTourTitle(relatedTour, lang as Lang)}
          </span>
          <button className="preview-related-tour-btn" onClick={() => onStartTour(relatedTour.id)}>
            {translate(lang as Lang, 'viewTour')}
          </button>
        </div>
      )}
      <div className="preview-actions">
        <Link to={`/shrine/${shrine.slug}`} className="preview-view-link">
          {translate(lang as Lang, 'viewFullDetails')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <button
          className={`preview-copy-link${copied ? ' copied' : ''}`}
          onClick={handleCopyLink}
          aria-label={copied ? translate(lang as Lang, 'linkCopied') : translate(lang as Lang, 'copyLink')}
          title={translate(lang as Lang, 'copyLink')}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
          <span>{copied ? translate(lang as Lang, 'copied') : translate(lang as Lang, 'share')}</span>
        </button>
      </div>
    </div>
  );
}
