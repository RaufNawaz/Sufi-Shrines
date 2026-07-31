import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { translateToUrdu } from '../../lib/i18n/urduFallback';
import { categoryKey } from '../../lib/data/categoryKey';
import { ShrineGlyph } from '../ui/ShrineGlyph';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useDebounce } from '../../hooks/useDebounce';
import { useSearch } from '../../lib/search/useSearch';
import { parseEra, ERA_MIN, ERA_MAX } from '../../lib/data/era';
import { TimeSlider } from './TimeSlider';
import type { Tour } from '../../lib/tours/tours';
import { TourPanel } from './TourPanel';
import { TourList } from './TourList';
import { WelcomeCard } from './WelcomeCard';
import { ShrinePreview } from './ShrinePreview';
import { highlightMatch, ShrineListSkeleton, sortByRank } from './mapSidebarHelpers';

const SEARCH_DEBOUNCE_MS = 200;

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
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useDebounce(searchRaw, SEARCH_DEBOUNCE_MS);

  const hasEraFilter = eraMin !== ERA_MIN || eraMax !== ERA_MAX;
  const hasActiveFilter = Boolean(activeCategory || activeRegion || activeSaint || hasEraFilter);
  const hasSaintOrEraFilter = Boolean(activeSaint || hasEraFilter);

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

  const localizeName = useCallback((shrine: Shrine) => localizeShrineName(shrine, lang), [lang]);

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
        // Worker results available (ranked, fuzzy) — filter to matches, then
        // sort by that rank so the best match shows first instead of falling
        // back to the list's original order.
        const idSet = new Set(searchIds);
        result = sortByRank(
          result.filter((s) => idSet.has(s.id)),
          searchIds,
        );
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
  }, [
    shrines,
    activeCategory,
    activeRegion,
    activeSaint,
    search,
    searchIds,
    localizeName,
    hasEraFilter,
    eraMin,
    eraMax,
  ]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Shrine[]>();
    for (const shrine of filtered) {
      const cat = shrine.category || t('uncategorized');
      const group = groups.get(cat) || [];
      group.push(shrine);
      groups.set(cat, group);
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b, lang === 'ur' ? 'ur' : 'en'),
    );
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
            <h1 className="sidebar-title">{t('title')}</h1>
          </div>
          <div className="sidebar-actions">
            {lang === 'ur' && (
              <button
                type="button"
                className="icon-btn numerals-toggle"
                onClick={() => setNumerals(numerals === 'eastern' ? 'western' : 'eastern')}
                aria-label={
                  numerals === 'eastern'
                    ? t('switchToWesternNumerals')
                    : t('switchToEasternNumerals')
                }
                title={
                  numerals === 'eastern'
                    ? t('switchToWesternNumerals')
                    : t('switchToEasternNumerals')
                }
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
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
              <svg
                className="search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
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

          {/* More filters disclosure: saint + era, collapsed by default so
              category chips and the shrine list get more default room. */}
          <div className="filter-section">
            <button
              type="button"
              className={`more-filters-toggle${filtersExpanded ? ' active' : ''}`}
              onClick={() => setFiltersExpanded((v) => !v)}
              aria-expanded={filtersExpanded}
            >
              <svg
                className="more-filters-chevron"
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
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {t('moreFiltersLabel')}
              {hasSaintOrEraFilter && (
                <span className="filter-active-dot" aria-label="filters active" />
              )}
            </button>
          </div>

          {filtersExpanded && (
            <>
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
                        {localizeField(shrines.find((s) => s.sufiSaint === saint)!.raw, 'Sufi Saint') ||
                          saint}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time-slider by founding era */}
              <TimeSlider value={[eraMin, eraMax]} onChange={onEraChange} lang={lang} fmtNum={fmtNum} />
            </>
          )}

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
                  <svg
                    className="shrine-list-empty-icon"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <p className="shrine-list-empty-title">{t('noMatches')}</p>
                  {search && <p className="shrine-list-empty-query">"{search}"</p>}
                  {(search || hasActiveFilter) && (
                    <button className="shrine-list-empty-clear" onClick={clearAllFilters}>
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
                        <div
                          className={`shrine-list-thumb-slot${shrine.imageUrl ? '' : ` shrine-list-thumb-slot--empty shrine-list-thumb-slot--${catKey}`}`}
                        >
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
                          {location && <div className="shrine-list-meta">{location}</div>}
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
        <div className="sidebar-detail">
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
