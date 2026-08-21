import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { LanguageToggle } from '../ui/LanguageToggle';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { thumbnailUrl, IMAGE_WIDTH } from '../../lib/images/thumbnail';
import { categoryKey, categoryDisplayLabel } from '../../lib/data/categoryKey';
import type { CategoryKey } from '../../lib/data/categoryKey';
import { supportLevelKey } from '../../lib/data/supportLevel';
import { ShrineGlyph } from '../ui/ShrineGlyph';
import { InfoLevelBadge } from '../ui/InfoLevelBadge';
import { SupportLevelBadge } from '../ui/SupportLevelBadge';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useDebounce } from '../../hooks/useDebounce';
import { useSearch } from '../../lib/search/useSearch';
import { parseEra, ERA_MIN, ERA_MAX } from '../../lib/data/era';
import type { Tour } from '../../lib/tours/tours';
import { TourPanel } from './TourPanel';
import { TourList } from './TourList';
import { WelcomeCard } from './WelcomeCard';
import { ShrinePreview } from './ShrinePreview';
import { CommandPalette } from './CommandPalette';
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
  /** Additive category selection (CategoryKey values); empty = all shown. */
  activeCategories: CategoryKey[];
  onCategoriesChange: (categories: CategoryKey[]) => void;
  /** Show only info_level = Full ("Field-verified") sites. */
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (verifiedOnly: boolean) => void;
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
  activeCategories,
  onCategoriesChange,
  verifiedOnly,
  onVerifiedOnlyChange,
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const search = useDebounce(searchRaw, SEARCH_DEBOUNCE_MS);

  const hasEraFilter = eraMin !== ERA_MIN || eraMax !== ERA_MAX;
  const hasActiveFilter = Boolean(
    activeCategories.length || activeRegion || activeSaint || hasEraFilter || verifiedOnly,
  );
  const hasMoreFiltersActive = Boolean(activeSaint || hasEraFilter || verifiedOnly);
  const activeFilterCount =
    activeCategories.length +
    (activeRegion ? 1 : 0) +
    (activeSaint ? 1 : 0) +
    (hasEraFilter ? 1 : 0) +
    (verifiedOnly ? 1 : 0);

  // Collapse list whenever a shrine is selected (from map marker or any other source)
  useEffect(() => {
    if (selectedId !== null) setShowList(false);
  }, [selectedId]);

  /* `/` and ⌘K (Ctrl+K off the Mac) open the palette.
   *
   * `/` was here before and focused the sidebar's own field; it now opens the
   * overlay, which is where that field went. ⌘K is the convention every reader
   * who has used a command palette already knows, and it costs one listener. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey;
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
      if (!isSlash && !isCmdK) return;
      const tag = (e.target as HTMLElement).tagName;
      // `/` is a character; never steal it from a field someone is typing in.
      // ⌘K is not, so it opens from anywhere.
      if (isSlash && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
      e.preventDefault();
      setShowList(true);
      setPaletteOpen(true);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  /* Which shortcut to *show*. Reading the platform is the only way to label a
     modifier key honestly, and getting it wrong ("Ctrl K" on a Mac) is the kind
     of detail that makes an interface feel foreign. */
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || ''),
    [],
  );

  const localizeName = useCallback((shrine: Shrine) => localizeShrineName(shrine, lang), [lang]);

  // Worker-based fuzzy search — falls back to "show all" until the index is ready
  const { ids: searchIds } = useSearch(shrines, search);

  const filtered = useMemo(() => {
    let result = shrines;
    if (activeCategories.length)
      result = result.filter((s) => activeCategories.includes(categoryKey(s.category)));
    if (verifiedOnly)
      result = result.filter((s) => supportLevelKey(s.supportLevel) === 'field-verified');
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
    activeCategories,
    verifiedOnly,
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
    // While actively searching, keep `filtered`'s rank order intact as one
    // flat list — bucketing by category and sorting the buckets
    // alphabetically would bury the single best match under an unrelated
    // category's weak matches (e.g. a strong "Muslim Shrine" match sorting
    // after every "Hindu Temple" match, however weak, just because "H" comes
    // before "M"). Grouping is a browse-mode affordance, not a search one.
    if (search.trim()) {
      return filtered.length > 0 ? ([['__search__', filtered]] as [string, Shrine[]][]) : [];
    }
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
  }, [filtered, t, lang, search]);

  const selectedShrine = useMemo(
    () => (selectedId !== null ? shrines.find((s) => s.id === selectedId) : null),
    [selectedId, shrines],
  );

  const clearAllFilters = useCallback(() => {
    setSearchRaw('');
    onCategoriesChange([]);
    onVerifiedOnlyChange(false);
    onRegionChange('');
    onSaintChange('');
    onEraChange([ERA_MIN, ERA_MAX]);
  }, [onCategoriesChange, onVerifiedOnlyChange, onRegionChange, onSaintChange, onEraChange]);

  return (
    <aside
      className={`sidebar${isOpen ? '' : ' collapsed'}`}
      id="sidebar"
      aria-label={t('ariaShrineBrowser')}
    >
      {/* Mobile drag handle — tap to toggle peek/full */}
      {isMobile && (
        <button
          className="sidebar-sheet-handle"
          onClick={onToggle}
          /* Was a hardcoded English 'Collapse sheet' / 'Expand sheet'. The
             Urdu accessible-name sweep never saw it: that suite runs at a
             desktop viewport, and this control only exists under 768px. */
          aria-label={isOpen ? t('ariaCollapseSheet') : t('ariaExpandSheet')}
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
                aria-pressed={numerals === 'eastern'}
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
            onClick={() => {
              const next = !showList;
              setShowList(next);
              /* On a phone this button is the one thing visible in the
                 collapsed sheet, so it has to be the whole gesture: opening
                 the list inside a 184px peek would show two rows of a
                 169-row list. Expand on open; leave the sheet alone on close,
                 because collapsing it would yank the map out from under a
                 reader who only wanted the list shut. */
              if (next && isMobile && !isOpen) onToggle?.();
            }}
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
            {hasActiveFilter && (
              <span className="filter-active-dot" aria-label={t('ariaFiltersActive')} />
            )}
          </button>
        </div>
      )}

      {/* List view */}
      {showList ? (
        <>
          {/* Search and filters — one control, opening the overlay.
              The field itself used to live here, with five rows of chips
              stacked under it, inside a panel that is a 184px sheet on a phone.
              Now this is a button that looks like the field it opens
              (CommandPalette), which is where the typing and the filtering
              happen. */}
          <div className="search-bar">
            <button
              type="button"
              className="palette-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('ariaOpenPalette')}
            >
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
              <span className="palette-trigger-label">{searchRaw || t('searchPlaceholder')}</span>
              <span className="palette-trigger-filters" aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="10" y1="18" x2="14" y2="18" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="palette-trigger-count">{fmtNum(activeFilterCount)}</span>
                )}
              </span>
              {/* The shortcut is shown only where there is a keyboard to press
                  it with. */}
              {!isMobile && (
                <span className="palette-kbd palette-trigger-shortcut" aria-hidden="true">
                  {isMac ? '⌘K' : 'Ctrl K'}
                </span>
              )}
            </button>
          </div>

          {/* Active-filter summary — persistent count + one-click reset,
              independent of the empty-results clear button below. */}
          {hasActiveFilter && (
            <div className="filter-summary-bar">
              <span className="filter-summary-count">
                {fmtNum(tFn(lang, 'activeFiltersCount', activeFilterCount))}
              </span>
              <button className="filter-summary-clear" onClick={clearAllFilters}>
                {t('clearFilters')}
              </button>
            </div>
          )}

          {/* Result count */}
          <div className="shrine-list-status" aria-live="polite" aria-atomic="true">
            {tCount(filtered.length)}
          </div>

          {/* Grouped list or skeleton while first load */}
          {loading && shrines.length === 0 ? (
            <ShrineListSkeleton />
          ) : (
            /* A listbox, not a list.
                axe reported two criticals here, both invisible until the
                command palette's a11y scan happened to open this panel — the
                route sweep scans the map with the list collapsed, so 169 rows
                had never been scanned at all. `aria-pressed` is not allowed on
                `role="listitem"` (it was on every row), and a `role="list"`
                may own only `listitem` children (each category heading was a
                `div` inside it).

                These rows *are* a single-select list of options: clicking one
                selects that shrine on the map. So listbox / group / option is
                both the valid structure and the honest one, and
                `aria-selected` replaces the `aria-pressed` that could not be
                there. */
            <div className="shrine-list-panel" role="listbox" aria-label={t('ariaShrineList')}>
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
                <div
                  key={cat}
                  role="group"
                  aria-label={
                    grouped.length > 1
                      ? tFn(
                          lang,
                          'ariaCategoryOf',
                          categoryDisplayLabel(items[0].category, lang) ??
                            localizeField(items[0].raw, 'Category') ??
                            cat,
                        )
                      : t('ariaShrineList')
                  }
                >
                  {grouped.length > 1 && (
                    /* One label, used for both the visible heading and the
                       accessible name. They used to diverge: the heading was
                       localised and the aria-label interpolated the raw English
                       `cat`, so a screen reader announced the English category
                       over the Urdu the page was showing. */
                    /* `aria-hidden` because the group above now carries this
                       same string as its accessible name — announcing it twice
                       is worse than once, and a bare div inside a listbox is
                       not an allowed child. */
                    <div className="shrine-list-group-heading" aria-hidden="true">
                      {categoryDisplayLabel(items[0].category, lang) ??
                        (localizeField(items[0].raw, 'Category') || cat)}
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
                        role="option"
                        onClick={() => {
                          onSelect(shrine);
                          setShowList(false);
                        }}
                        aria-selected={shrine.id === selectedId}
                      >
                        <div
                          className={`shrine-list-thumb-slot${shrine.imageUrl ? '' : ` shrine-list-thumb-slot--empty shrine-list-thumb-slot--${catKey}`}`}
                        >
                          {shrine.imageUrl ? (
                            <img
                              className="shrine-list-thumb-img"
                              src={thumbnailUrl(shrine.imageUrl, IMAGE_WIDTH.marker)}
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
                          <div className="shrine-list-badges">
                            <InfoLevelBadge
                              level={shrine.infoLevel}
                              className="shrine-list-badge"
                            />
                            <SupportLevelBadge
                              level={shrine.supportLevel}
                              className="shrine-list-badge"
                            />
                          </div>
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
            /* `key` on the shrine id remounts the card when the selection
               changes. Without it React reuses the same DOM node, a CSS
               entrance animation runs once for the first shrine and never
               again, and every subsequent selection swaps content in place with
               no acknowledgement that anything happened. */
            <ShrinePreview
              key={selectedShrine.id}
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
      {/* Search and filters, in the middle of the screen. Rendered here (not in
          MapPage) because this component owns the query and the derived result
          list; it portals to document.body, so the 184px sheet it lives inside
          on a phone does not clip it. */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        query={searchRaw}
        onQueryChange={setSearchRaw}
        results={filtered}
        total={shrines.length}
        onSelect={(shrine) => onSelect(shrine)}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearAllFilters}
        filters={{
          shrines,
          activeCategories,
          onCategoriesChange,
          verifiedOnly,
          onVerifiedOnlyChange,
          activeRegion,
          onRegionChange,
          activeSaint,
          onSaintChange,
          eraMin,
          eraMax,
          onEraChange,
          hasMoreFiltersActive,
        }}
      />
    </aside>
  );
}
