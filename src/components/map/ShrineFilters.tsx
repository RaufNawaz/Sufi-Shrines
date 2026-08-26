import React, { useCallback, useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';

import { CATEGORY_LABELS, CATEGORY_ORDER, categoryKey } from '../../lib/data/categoryKey';
import type { CategoryKey } from '../../lib/data/categoryKey';
import { TimeSlider } from './TimeSlider';

import { localizeRecordedName } from '../../lib/i18n/localizeRecordedName';
/**
 * The filter controls for the archive — one component, two homes.
 *
 * These chips lived inline in `MapSidebar`, which was fine while the sidebar
 * was the only place a reader could filter. The command palette needs exactly
 * the same controls behind its filters button, and two copies of a filter UI is
 * how a filter ends up working in one place and not the other. So the JSX moved
 * here unchanged — same class names, so every existing selector and e2e test
 * still finds it — and both surfaces render this.
 *
 * It owns no state. Every value and setter is a prop, because the filter state
 * lives in `MapPage` (the map, the list and the palette all read it) and a
 * component that kept its own copy would drift from the map on the first
 * interaction.
 */
export interface ShrineFiltersProps {
  shrines: Shrine[];
  activeCategories: CategoryKey[];
  onCategoriesChange: (categories: CategoryKey[]) => void;
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (verifiedOnly: boolean) => void;
  activeRegion: string;
  onRegionChange: (region: string) => void;
  eraMin: number;
  eraMax: number;
  onEraChange: (range: [number, number]) => void;
  /** Whether the saved/era/provenance group is open. Lifted, so the palette and
   *  the sidebar each remember their own disclosure without fighting. */
  filtersExpanded: boolean;
  onFiltersExpandedChange: (expanded: boolean) => void;
  hasMoreFiltersActive: boolean;
  /* The reader's own ziyarat list. Optional: this block was added to the
     sidebar's inline filters on one branch while the extraction to this
     component happened on another, so a call site that predates it (or has no
     list to offer) simply omits these and the section does not render. */
  savedSlugs?: readonly string[];
  savedOnly?: boolean;
  onSavedOnlyChange?: (savedOnly: boolean) => void;
  listLinkCopied?: boolean;
  onShareList?: () => void;
}

export function ShrineFilters({
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
  filtersExpanded,
  onFiltersExpandedChange,
  hasMoreFiltersActive,
  savedSlugs = [],
  savedOnly = false,
  onSavedOnlyChange,
  listLinkCopied = false,
  onShareList,
}: ShrineFiltersProps) {
  const { lang, t, fmtNum } = useLang();

  const categories = useMemo(() => {
    const present = new Set(shrines.map((s) => categoryKey(s.category)));
    return CATEGORY_ORDER.filter((key) => present.has(key));
  }, [shrines]);

  const regions = useMemo(() => {
    const regs = new Set(shrines.map((s) => s.region).filter(Boolean));
    return Array.from(regs).sort();
  }, [shrines]);

  // Additive toggle — selecting chips accumulates categories (kept in
  // canonical order); an empty selection means all categories are shown.
  const toggleCategory = useCallback(
    (key: CategoryKey) => {
      onCategoriesChange(
        activeCategories.includes(key)
          ? activeCategories.filter((k) => k !== key)
          : CATEGORY_ORDER.filter((k) => k === key || activeCategories.includes(k)),
      );
    },
    [activeCategories, onCategoriesChange],
  );

  const setFiltersExpanded = (fn: (v: boolean) => boolean) =>
    onFiltersExpandedChange(fn(filtersExpanded));

  return (
    <>
      {/* Category chips — additive: each chip toggles its category into
          the selection; no selection = all categories shown. */}
      {categories.length > 1 && (
        <div className="filter-section">
          <div className="filter-chips" role="group" aria-label={t('ariaFilterByCategory')}>
            <button
              className={`filter-chip${activeCategories.length === 0 ? ' active' : ''}`}
              onClick={() => onCategoriesChange([])}
              aria-pressed={activeCategories.length === 0}
            >
              {t('filterAll')}
            </button>
            {categories.map((key) => (
              <button
                key={key}
                className={`filter-chip${activeCategories.includes(key) ? ' active' : ''}`}
                onClick={() => toggleCategory(key)}
                aria-pressed={activeCategories.includes(key)}
              >
                {CATEGORY_LABELS[key][lang]}
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
          <div className="filter-chips" role="group" aria-label={t('ariaFilterByRegion')}>
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
                {localizeRecordedName(reg, lang)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* More filters disclosure: saved list + era + provenance, collapsed by
          default so category chips and the shrine list get more default room.
          (A saint chip list lived here until 26 August 2026 — one chip per
          distinct sufiSaint value, over a hundred of them — and was removed:
          a reader looking for one saint has search, and the sidebar has the
          figure pages.) */}
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
          {hasMoreFiltersActive && (
            <span className="filter-active-dot" aria-label={t('ariaFiltersActive')} />
          )}
        </button>
      </div>

      {filtersExpanded && (
        <>
          {/* The reader's own ziyarat list — first in the group: it is the one
              filter that is *theirs*, and it should not sit below controls
              about the data. Hidden while empty: a filter that can only
              produce zero results is noise, not a control. */}
          {onSavedOnlyChange && savedSlugs.length > 0 && (
            <div className="filter-section">
              <span className="filter-section-label" aria-hidden="true">
                {t('savedFilterLabel')}
              </span>
              <div className="filter-chips" role="group" aria-label={t('savedFilterLabel')}>
                <button
                  className={`filter-chip${savedOnly ? ' active' : ''}`}
                  onClick={() => onSavedOnlyChange(!savedOnly)}
                  aria-pressed={savedOnly}
                  title={t('saveShrineFull')}
                >
                  {t('savedOnlyFilter')} · {fmtNum(savedSlugs.length)}
                </button>
                {savedOnly && (
                  <>
                    <button className="filter-chip" onClick={() => window.print()}>
                      {t('ziyaratPackPrint')}
                    </button>
                    {onShareList && (
                      <button
                        className={`filter-chip${listLinkCopied ? ' active' : ''}`}
                        onClick={onShareList}
                      >
                        {listLinkCopied ? t('copied') : t('ziyaratShareLink')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Time-slider by founding era */}
          <TimeSlider value={[eraMin, eraMax]} onChange={onEraChange} lang={lang} fmtNum={fmtNum} />

          {/* Provenance (support_level) — show only field-verified sites.
              Describes how the info was gathered, never a site's importance. */}
          <div className="filter-section">
            <span className="filter-section-label" aria-hidden="true">
              {t('provenanceFilterLabel')}
            </span>
            <div className="filter-chips" role="group" aria-label={t('ariaFilterByProvenance')}>
              <button
                className={`filter-chip${verifiedOnly ? ' active' : ''}`}
                onClick={() => onVerifiedOnlyChange(!verifiedOnly)}
                aria-pressed={verifiedOnly}
                title={t('supportLevelTooltip')}
              >
                {t('verifiedOnlyFilter')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
