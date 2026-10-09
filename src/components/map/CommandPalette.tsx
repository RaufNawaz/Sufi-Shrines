import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { CATEGORY_LABELS, CATEGORY_ORDER, categoryKey } from '../../lib/data/categoryKey';
import type { CategoryKey } from '../../lib/data/categoryKey';
import { ShrineImage } from '../ui/ShrineImage';
import { IMAGE_WIDTH } from '../../lib/images/thumbnail';
import { ShrineFilters, type ShrineFiltersProps } from './ShrineFilters';

import { isRtlLang } from '../../lib/i18n/languages';
/**
 * Search the archive from the middle of the screen.
 *
 * The search field used to be the third row of a sidebar that is a 184px sheet
 * on a phone, with five rows of filter chips stacked under it — so the two
 * things a reader most wants (type a name, narrow the set) were the two things
 * competing hardest for space with the list they act on. This is the same
 * search and the same filters, given the whole viewport: an overlay that opens
 * on ⌘K, on `/`, or from the button in the sidebar, with the filters folded
 * behind a control at the trailing end of the input rather than spread down the
 * page.
 *
 * It owns no data. The query, the filter state and the result set all live in
 * `MapSidebar`/`MapPage`, so the list behind the overlay and the map show
 * exactly what the overlay shows — there is one query in this app, not two.
 *
 * Keyboard: ↑/↓ move, Enter opens, Esc closes, Tab is trapped inside the
 * dialog. The active row is announced through `aria-activedescendant` on the
 * input rather than by moving focus, which is what a combobox is supposed to do
 * and what lets a reader keep typing while they move through results.
 */

/** How many results the overlay renders. The list behind it is not capped; this
 *  is a "best matches" surface, and 40 DOM rows keep the open animation at
 *  60fps on a phone. */
const MAX_RESULTS = 40;

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Raw query text (uncontrolled by the debounce, so typing feels instant). */
  query: string;
  onQueryChange: (query: string) => void;
  /** Already filtered and ranked by the caller — the same list the sidebar
   *  renders, so the two can never disagree. */
  results: Shrine[];
  onSelect: (shrine: Shrine) => void;
  /** Total sites before the query, for the "N of M" line. */
  total: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  filters: Omit<ShrineFiltersProps, 'filtersExpanded' | 'onFiltersExpandedChange'>;
  /** Sites per tradition under every filter but the category one — what each
   *  chip under the field says. Computed by the caller, which owns the filters. */
  categoryCounts: Partial<Record<CategoryKey, number>>;
}

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  results,
  onSelect,
  total,
  activeFilterCount,
  onClearFilters,
  filters,
  categoryCounts,
}: CommandPaletteProps) {
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  /* Browse mode — no query — is grouped by tradition and uncapped; a query is
     ranked and capped at MAX_RESULTS. Asked for on 8 October 2026 (Rauf): the
     palette showed the six traditions as one undifferentiated list, with the
     chips that tell them apart behind the Filters control. Grouping is a browse
     affordance only, for the reason `MapSidebar` gives: bucketing a *ranked*
     list would bury the best match under a weaker one from a tradition whose
     heading happens to come first. The cap goes with it because a capped,
     grouped list would show the first tradition and nothing else — the first
     forty of 171 are all one group. Rows past the first two dozen skip the
     entrance animation (`.palette-result--still`), which is what the cap was
     protecting. */
  const browsing = !query.trim();
  const groups = useMemo(() => {
    if (!browsing) return null;
    const byKey = new Map<CategoryKey, Shrine[]>();
    for (const shrine of results) {
      const key = categoryKey(shrine.category);
      const rows = byKey.get(key);
      if (rows) rows.push(shrine);
      else byKey.set(key, [shrine]);
    }
    const order: CategoryKey[] = [...CATEGORY_ORDER, 'default'];
    return order.filter((key) => byKey.has(key)).map((key) => ({ key, rows: byKey.get(key)! }));
  }, [browsing, results]);
  const visible = useMemo(
    () => (groups ? groups.flatMap((group) => group.rows) : results.slice(0, MAX_RESULTS)),
    [groups, results],
  );

  /* The tradition chips under the field. Additive, like the chips they replace
     in the drawer (`ShrineFilters`, which the palette now asks to hide its own
     copy); "All" clears. The state is the caller's — one query, one filter set,
     for the map, the list and this overlay alike. */
  const { activeCategories, onCategoriesChange } = filters;
  const chipCategories = useMemo(() => {
    const present = new Set(filters.shrines.map((shrine) => categoryKey(shrine.category)));
    return CATEGORY_ORDER.filter((key) => present.has(key));
  }, [filters.shrines]);
  const allCount = Object.values(categoryCounts).reduce<number>((sum, n) => sum + (n ?? 0), 0);
  const toggleCategory = (key: CategoryKey) =>
    onCategoriesChange(
      activeCategories.includes(key)
        ? activeCategories.filter((k) => k !== key)
        : CATEGORY_ORDER.filter((k) => k === key || activeCategories.includes(k)),
    );

  /* Capture the trigger *before* focus moves into the dialog, and put it back
     on close. Same pattern as the gallery lightbox, and for the same reason: a
     reader who opened this from the keyboard has to land back where they were,
     not at the top of the document. */
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  // A new query means the best match is the one to act on.
  useEffect(() => setActiveIndex(0), [query, results]);

  // The page behind must not scroll while a full-viewport overlay is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const commit = useCallback(
    (shrine: Shrine | undefined) => {
      if (!shrine) return;
      onSelect(shrine);
      onClose();
    },
    [onSelect, onClose],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (visible.length === 0) return;
        setActiveIndex((i) => {
          const next = event.key === 'ArrowDown' ? i + 1 : i - 1;
          // Wraps, because a 40-row list read with the keyboard should not dead
          // end at either edge.
          return (next + visible.length) % visible.length;
        });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        commit(visible[activeIndex]);
        return;
      }
      if (event.key === 'Tab') {
        // Focus trap: the dialog is modal, so Tab must not reach the map behind
        // it. Collected live because the filters drawer changes what is in here.
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [visible, activeIndex, commit, onClose],
  );

  // Keep the active row in view when the keyboard is driving.
  useEffect(() => {
    // By index, not by child position: group headings share the list now.
    const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return createPortal(
    <div
      className="palette-backdrop"
      /* Mousedown rather than click: a click that *starts* on a result row and
         ends on the backdrop (a sloppy tap on a phone) would otherwise dismiss
         the overlay instead of opening the shrine. */
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('paletteTitle')}
        ref={panelRef}
        onKeyDown={onKeyDown}
        dir={isRtl ? 'rtl' : undefined}
        lang={isRtl ? 'ur' : undefined}
      >
        <div className="palette-search">
          <svg
            className="palette-search-icon"
            width="18"
            height="18"
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
          {/* `.search-input` is kept as a second class: every existing selector
              and e2e test for the archive's search box matches on it, and this
              *is* that box now. */}
          <input
            ref={inputRef}
            type="search"
            className="palette-input search-input"
            role="combobox"
            /* The same two lies `ArchiveSearch` carried, found by measuring
               this one as the control while fixing that one. A zero-result
               query left `aria-expanded` at the literal "true" and
               `aria-controls` pointing at an id that is not in the document —
               a screen reader told a popup is open and sent to nothing. axe
               grades the dangling reference *incomplete* rather than a
               violation, which is why the zero-serious gate never saw it. */
            aria-expanded={visible.length > 0}
            {...(visible.length > 0 ? { 'aria-controls': listId } : {})}
            aria-autocomplete="list"
            aria-activedescendant={
              visible.length > 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            dir={isRtl ? 'rtl' : undefined}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="palette-clear"
              onClick={() => {
                onQueryChange('');
                inputRef.current?.focus();
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
          {/* The filters live behind this, at the trailing end of the field —
              not in five chip rows underneath it. */}
          <button
            type="button"
            className={`palette-filters-btn${showFilters ? ' active' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls={`${listId}-filters`}
          >
            <svg
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
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            <span className="palette-filters-label">{t('filtersLabel')}</span>
            {activeFilterCount > 0 && (
              <span className="palette-filters-count" aria-hidden="true">
                {fmtNum(activeFilterCount)}
              </span>
            )}
          </button>
          <button
            type="button"
            className="palette-close"
            onClick={onClose}
            aria-label={t('paletteClose')}
          >
            <span className="palette-kbd" aria-hidden="true">
              esc
            </span>
          </button>
        </div>

        {chipCategories.length > 1 && (
          <div className="palette-cats" role="group" aria-label={t('ariaFilterByCategory')}>
            <button
              type="button"
              className={`filter-chip palette-cat${activeCategories.length === 0 ? ' active' : ''}`}
              aria-pressed={activeCategories.length === 0}
              onClick={() => onCategoriesChange([])}
            >
              {t('filterAll')}
              <span className="palette-cat-count">{fmtNum(allCount)}</span>
            </button>
            {chipCategories.map((key) => {
              const on = activeCategories.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`filter-chip palette-cat${on ? ' active' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggleCategory(key)}
                >
                  <span
                    className={`palette-result-dot palette-result-dot--${key}`}
                    aria-hidden="true"
                  />
                  {CATEGORY_LABELS[key][lang]}
                  <span className="palette-cat-count">{fmtNum(categoryCounts[key] ?? 0)}</span>
                </button>
              );
            })}
          </div>
        )}

        {showFilters && (
          <div className="palette-filters" id={`${listId}-filters`}>
            <ShrineFilters
              {...filters}
              hideCategories
              filtersExpanded={moreFiltersOpen}
              onFiltersExpandedChange={setMoreFiltersOpen}
            />
            {activeFilterCount > 0 && (
              <button type="button" className="palette-filters-clear" onClick={onClearFilters}>
                {t('clearFilters')}
              </button>
            )}
          </div>
        )}

        {/* Both numbers when the list is capped, not one in place of the other.
            It reported `results.length` — "44 of 171 sites" — while rendering
            `MAX_RESULTS` of them, so four matching sites were unreachable
            through search and nothing said so. Reporting `visible.length`
            instead would have been a different falsehood: the reader would be
            told 40 sites match when 44 do. */}
        <div className="palette-status" aria-live="polite" aria-atomic="true">
          {fmtNum(tFn(lang, 'paletteResultCount', results.length, total))}
          {visible.length < results.length
            ? ` · ${fmtNum(tFn(lang, 'paletteShowingFirst', visible.length))}`
            : ''}
        </div>

        {visible.length === 0 ? (
          <p className="palette-empty">{t('noMatches')}</p>
        ) : (
          <ul className="palette-results" id={listId} role="listbox" ref={listRef}>
            {(() => {
              const sections = groups ?? [{ key: null as CategoryKey | null, rows: visible }];
              /* A heading per tradition only when there is more than one to
                 tell apart; a list narrowed to one chip is just that list. */
              const showHeadings = sections.length > 1;
              let index = -1;
              return sections.map((section) => (
                <React.Fragment key={section.key ?? '__all__'}>
                  {showHeadings && section.key && (
                    /* `aria-hidden` and outside the option list, as
                       ArchiveSearch does it: a listbox may contain only
                       options, and the row's own dot and the chips above
                       already say the tradition. */
                    <li className="archive-search-group palette-group" aria-hidden="true">
                      <span className={`palette-result-dot palette-result-dot--${section.key}`} />
                      {section.key === 'default' ? (
                        <bdi>{section.rows[0]?.category ?? ''}</bdi>
                      ) : (
                        CATEGORY_LABELS[section.key][lang]
                      )}
                      <span className="palette-group-count">{fmtNum(section.rows.length)}</span>
                    </li>
                  )}
                  {section.rows.map((shrine) => {
                    index += 1;
                    const i = index;
                    const name = localizeShrineName(shrine, lang);
                    return (
                      <li
                        key={shrine.id}
                        id={`${listId}-option-${i}`}
                        data-index={i}
                        role="option"
                        aria-selected={i === activeIndex}
                        className={`palette-result${i === activeIndex ? ' active' : ''}${
                          i >= 24 ? ' palette-result--still' : ''
                        }`}
                        style={{ '--stagger-index': Math.min(i, 12) } as React.CSSProperties}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => commit(shrine)}
                      >
                        <ShrineImage
                          src={shrine.imageUrl}
                          alt=""
                          category={shrine.category}
                          className="palette-result-img"
                          placeholderClassName="palette-result-placeholder"
                          loading="lazy"
                          width={IMAGE_WIDTH.marker}
                        />
                        <span className="palette-result-body">
                          <span className="palette-result-name">
                            <bdi>{name}</bdi>
                          </span>
                          {shrine.location && (
                            /* The Location column as recorded — English on many
                               rows, hence data-latin (RULE 2, and the no-leak
                               guard counts it as declared debt rather than a
                               silent leak). */
                            <span className="palette-result-meta" data-latin>
                              <bdi>{shrine.location}</bdi>
                            </span>
                          )}
                        </span>
                        <span
                          className={`palette-result-dot palette-result-dot--${categoryKey(shrine.category)}`}
                          aria-hidden="true"
                        />
                      </li>
                    );
                  })}
                </React.Fragment>
              ));
            })()}
          </ul>
        )}

        <div className="palette-footer">
          <span className="palette-hint">
            <span className="palette-kbd" aria-hidden="true">
              ↑
            </span>
            <span className="palette-kbd" aria-hidden="true">
              ↓
            </span>
            {t('paletteHintMove')}
          </span>
          <span className="palette-hint">
            <span className="palette-kbd" aria-hidden="true">
              ↵
            </span>
            {t('paletteHintOpen')}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
