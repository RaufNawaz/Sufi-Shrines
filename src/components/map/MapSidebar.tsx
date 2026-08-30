import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
import { useSavedShrines } from '../../lib/savedShrines';
import { parseEra, ERA_MIN, ERA_MAX } from '../../lib/data/era';
import type { Tour } from '../../lib/tours/tours';
import { TourPanel } from './TourPanel';
import { TourList } from './TourList';
import { WelcomeCard } from './WelcomeCard';
import { ShrinePreview } from './ShrinePreview';
import { ZiyaratPrintPack } from './ZiyaratPrintPack';
import { buildSharedListUrl } from '../../lib/sharedList';
import { useShareLink } from '../../hooks/useShareLink';
import { dirAttr, usesEasternNumerals } from '../../lib/i18n/languages';
import { CommandPalette } from './CommandPalette';
import { ShrineFilters } from './ShrineFilters';
import { SettingsMenu } from '../ui/SettingsMenu';
import { readDirectoryMode, type DirectoryMode } from '../../lib/directoryPreference';

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
  /**
   * The shared-ground lens — a *lens*, not a filter, and the distinction is the
   * reason it sits above the filter chips with its own heading rather than
   * among them. A filter removes sites; this one removes nothing and changes
   * what is emphasised. Putting it in `ShrineFilters` would have been less code
   * and would have taught the reader the wrong thing about what it does — and
   * would have buried it behind the command palette's filters button too.
   */
  sharedGroundLens: boolean;
  onSharedGroundLensChange: (on: boolean) => void;
  /** Cross-tradition pairs currently drawn. Zero while the lens is off, because
   *  MapPage does not sweep for a layer nobody asked for. */
  crossingCount: number;
  /** Additive category selection (CategoryKey values); empty = all shown. */
  activeCategories: CategoryKey[];
  onCategoriesChange: (categories: CategoryKey[]) => void;
  /** Show only info_level = Full ("Field-verified") sites. */
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (verifiedOnly: boolean) => void;
  savedOnly: boolean;
  onSavedOnlyChange: (savedOnly: boolean) => void;
  /** Slugs of a shared list arriving via ?list= — narrows the list while the
   * banner on MapPage is open; empty otherwise. */
  sharedSlugs: string[];
  activeRegion: string;
  onRegionChange: (region: string) => void;
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
  sharedGroundLens,
  onSharedGroundLensChange,
  crossingCount,
  activeCategories,
  onCategoriesChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  savedOnly,
  onSavedOnlyChange,
  sharedSlugs,
  activeRegion,
  onRegionChange,
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
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>(readDirectoryMode);
  /* The sidebar's own field and disclosure. Both moved into the overlay on
     the branch that added it; they are back here because the sidebar renders
     the field and ShrineFilters too, and each surface remembers its own
     disclosure rather than fighting the other's. */
  const searchRef = useRef<HTMLInputElement>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const search = useDebounce(searchRaw, SEARCH_DEBOUNCE_MS);

  const hasEraFilter = eraMin !== ERA_MIN || eraMax !== ERA_MAX;
  const hasActiveFilter = Boolean(
    activeCategories.length || activeRegion || hasEraFilter || verifiedOnly || savedOnly,
  );
  const hasMoreFiltersActive = Boolean(hasEraFilter || verifiedOnly || savedOnly);
  const activeFilterCount =
    activeCategories.length +
    (activeRegion ? 1 : 0) +
    (hasEraFilter ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (savedOnly ? 1 : 0);

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
  const savedSlugs = useSavedShrines();
  const savedShrineObjects = useMemo(
    () => shrines.filter((s) => savedSlugs.includes(s.slug)),
    [shrines, savedSlugs],
  );
  const { copy: copyListLink, copied: listLinkCopied } = useShareLink({ copiedMs: 2000 });

  const filtered = useMemo(() => {
    let result = shrines;
    if (activeCategories.length)
      result = result.filter((s) => activeCategories.includes(categoryKey(s.category)));
    if (verifiedOnly)
      result = result.filter((s) => supportLevelKey(s.supportLevel) === 'field-verified');
    if (savedOnly) result = result.filter((s) => savedSlugs.includes(s.slug));
    // (the print pack below recomputes this from `shrines` so search/era
    // narrowing never silently drops entries from the printed list)
    if (sharedSlugs.length) result = result.filter((s) => sharedSlugs.includes(s.slug));
    if (activeRegion) result = result.filter((s) => s.region === activeRegion);
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
    savedOnly,
    savedSlugs,
    sharedSlugs,
    activeRegion,
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
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, lang));
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
    onEraChange([ERA_MIN, ERA_MAX]);
  }, [onCategoriesChange, onVerifiedOnlyChange, onRegionChange, onEraChange]);

  /* What the sidebar does about the choice, not the persisting of it:
     `SettingsMenu` writes `directoryPreference` for every surface that renders
     it, and this mirrors the value the list button reads. Writing here as well
     would be two writers for one key and a question about which ran last. */
  const chooseDirectoryMode = useCallback((mode: DirectoryMode) => {
    setDirectoryMode(mode);
    if (mode === 'spotlight') setShowList(false);
  }, []);
  const directoryOpen = directoryMode === 'spotlight' ? paletteOpen : showList;

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
            {/* Gated on the digit set, not on the language. This control exists
                because Eastern numerals are the reader's default here and some
                readers prefer Western — a question about `numerals`, so a future
                Eastern-numeral language gets the toggle instead of silently
                losing it. */}
            {usesEasternNumerals(lang) && (
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
            {/* Every page carries this gear now — `EntityPageHeader` renders
                the same component — so its placement and dismissal lessons
                (§9.82–84) live with it rather than here. The sidebar passes the
                two preferences it owns and expands the bottom sheet first. */}
            <SettingsMenu
              directoryMode={directoryMode}
              onDirectoryModeChange={chooseDirectoryMode}
              toursEnabled={toursEnabled}
              onToursToggle={onToursToggle}
              onBeforeOpen={() => {
                if (isMobile && !isOpen) onToggle?.();
              }}
            />
            <DarkModeToggle />
            <LanguageToggle />
          </div>
        </div>
      )}
      {/* The toggle sits ABOVE the status bar, and the order is the point. It used to sit below, so
      when `loading` ended the status bar was removed and everything under it rose 56px. On a 390px
      phone the collapsed sheet is a fixed 184px, so that 56px is the difference between this button
      being 10px below the fold and being on screen: measured 29 August 2026 at 4x CPU and slow 4G,
      the bar sat at y=782..854 from 4,484ms and only rose to 726..817 at 8,562ms, when the sheet's
      one route into 169 sites finally became visible. It is also the archive's Urdu LCP element —
      Nastaliq makes this two-line button the largest contentful thing on the viewport — so the same
      56px was four seconds of largest-contentful-paint (HANDOVER §9, 28 Aug). A transient element
      must never sit above a permanent one in a fixed-height sheet. */}
      {/* Table-of-shrines toggle — hidden in embed mode */}
      {!error && !embed && (
        <div className="list-toggle-bar">
          <button
            className={`list-toggle-btn${directoryOpen ? ' active' : ''}`}
            onClick={() => {
              if (directoryMode === 'spotlight') {
                setPaletteOpen(true);
                return;
              }
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
            aria-expanded={directoryOpen}
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
      {/* List view */}
      {showList ? (
        <>
          {/* Search: the field, plus the palette as the faster way in.
              The field stayed here rather than moving wholly into the overlay —
              an archive's search box is the primary thing a reader looks for,
              and a button that merely looks like one costs a tap to discover.
              The trigger beside it opens CommandPalette (⌘K), which is the same
              query and the same ShrineFilters on a surface big enough to show
              them; on a 184px phone sheet that overlay is the only place five
              rows of chips fit.

              The field unmounts while the overlay is open: two live
              `.search-input` elements would be two focusable copies of one
              control, and every selector that reaches for it would have to
              choose. */}
          <div className="search-bar">
            {!paletteOpen && (
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
                  dir={dirAttr(lang)}
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
                    aria-label={t('ariaClearSearch')}
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
            )}
            <button
              type="button"
              className="palette-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('ariaOpenPalette')}
            >
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
              {/* The shortcut is shown only where there is a keyboard to
                    press it with. */}
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

          {/* The same filters the palette shows, in the sidebar as well — one
              component, two homes (see ShrineFilters). Rendering it here is not
              a duplicate of the overlay's copy: it is the same JSX and the same
              class names, so a reader who never discovers ⌘K still has every
              control, and every selector that predates the overlay still finds
              them. */}
          <ShrineFilters
            shrines={shrines}
            activeCategories={activeCategories}
            onCategoriesChange={onCategoriesChange}
            verifiedOnly={verifiedOnly}
            onVerifiedOnlyChange={onVerifiedOnlyChange}
            activeRegion={activeRegion}
            onRegionChange={onRegionChange}
            eraMin={eraMin}
            eraMax={eraMax}
            onEraChange={onEraChange}
            filtersExpanded={filtersExpanded}
            onFiltersExpandedChange={setFiltersExpanded}
            hasMoreFiltersActive={hasMoreFiltersActive}
            savedSlugs={savedSlugs}
            savedOnly={savedOnly}
            onSavedOnlyChange={onSavedOnlyChange}
            listLinkCopied={listLinkCopied}
            onShareList={() =>
              copyListLink(
                buildSharedListUrl(
                  savedSlugs,
                  `${window.location.origin}${window.location.pathname}`,
                ),
              )
            }
          />

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
          {/* The shared-ground lens.
              Here rather than beside the filter chips, and the placement is the
              second attempt: the chips live inside the sidebar's *list* view,
              which is opt-in behind a button and closed by default, so the lens
              rendered nowhere a reader would find it. Verified by looking —
              `.filter-section` count was 0 on a fresh load.

              This is the sidebar's default state, and it is above the tour list
              for the same reason it is not in `ShrineFilters`: it is a way of
              seeing the whole archive at once, which is what the reader is
              looking at when they land here. It stays mounted while a shrine is
              selected only if nothing else claims the panel — see below. */}
          {!activeTour && (
            <div className="lens-section">
              <button
                type="button"
                className={`lens-toggle${sharedGroundLens ? ' active' : ''}`}
                onClick={() => onSharedGroundLensChange(!sharedGroundLens)}
                aria-pressed={sharedGroundLens}
              >
                <span className="lens-toggle-label">{t('sharedGroundHeading')}</span>
                {/* The count appears only once the lens is on, because until
                    then nothing has counted: the sweep is gated in MapPage. A
                    placeholder would be a number the archive has not computed. */}
                {sharedGroundLens && (
                  <span className="lens-toggle-count">{fmtNum(crossingCount)}</span>
                )}
              </button>
              {sharedGroundLens && (
                /* Said plainly, because it is a real limit rather than a hint:
                   at the zoom that shows Pakistan every one of these lines is
                   under a pixel long. What the reader can read from here is
                   which pins stay lit. */
                <p className="lens-note">{t('sharedGroundLensNote')}</p>
              )}
              {/* Only while the lens is on, and for two reasons: the welcome
                  card below already lists this page among the archive's
                  destinations, so with the lens off this was the same link
                  twice in one panel — and with it on, "40" is exactly the
                  moment a reader wants to see which forty. */}
              {sharedGroundLens && (
                <p className="lens-link">
                  <Link to="/shared-ground">{t('sharedGroundFromShrine')}</Link>
                </p>
              )}
            </div>
          )}

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
      {/* Printable ziyarat pack (F6): hidden on screen, becomes the page
          under @media print. Mounted only while the saved filter is active
          and no tour is running — the tour itinerary owns printing then,
          and the two :has-scoped print blocks must never coexist. */}
      {savedOnly && !activeTour && savedShrineObjects.length > 0 && (
        <ZiyaratPrintPack shrines={savedShrineObjects} />
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
          eraMin,
          eraMax,
          onEraChange,
          hasMoreFiltersActive,
          savedSlugs,
          savedOnly,
          onSavedOnlyChange,
          listLinkCopied,
          onShareList: () =>
            copyListLink(
              buildSharedListUrl(
                savedSlugs,
                `${window.location.origin}${window.location.pathname}`,
              ),
            ),
        }}
      />
    </aside>
  );
}
