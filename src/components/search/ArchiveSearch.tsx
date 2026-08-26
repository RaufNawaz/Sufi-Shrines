import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { isRtlLang } from '../../lib/i18n/languages';
import { useShrineData } from '../../hooks/useShrineData';
import { useSearch } from '../../lib/search/useSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { matchEntities, type SearchEntity } from '../../lib/search/entitySearch';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { localizeFigureName, localizeOrderName } from '../../lib/i18n/localizeKgName';
import { localizeRecordedName } from '../../lib/i18n/localizeRecordedName';
import { categoryKey } from '../../lib/data/categoryKey';
import { buildPlaces } from '../../lib/data/places';
import { tFn } from '../../lib/i18n/uiStrings';
import type { Shrine } from '../../types/shrine';

/**
 * Search, from anywhere in the archive.
 *
 * There was a search field on one of thirteen routes — inside the map's sidebar
 * — and it searched shrines. A reader on a saint's page who wanted a different
 * saint had to go back to the map first, and ⌘K, which that sidebar advertises
 * as the way to search, did nothing on any other page.
 *
 * This is the same idea one level up: sites, figures, orders and places, from
 * every route. It is deliberately *not* the map's palette lifted out. That one
 * owns the map's query and filter state and its job is to narrow what the map
 * shows; this one's job is to leave for somewhere else. Sharing a component
 * would have meant one of the two pretending to be the other.
 *
 * **Nothing is paid for until it is opened.** The host below mounts this only
 * when the reader asks for it, so the shrine worker starts and the 27 KB entity
 * index is fetched on first open, not on first paint of every page. Shrine data
 * itself is already in memory by then on any route that renders entries.
 *
 * The visual language is the map palette's, class for class, because it is the
 * same act. Two search overlays that looked different would be two features.
 */

/** Per group, so no single kind can crowd out the others. A reader searching
 *  "chishti" wants the order, the figures and the sites — not eight figures. */
const PER_GROUP = { shrine: 6, figure: 5, order: 3, place: 4 } as const;

/* `| undefined` on the optional fields, not just `?`: this project runs
   `exactOptionalPropertyTypes`, under which `meta?: string` refuses an explicit
   `undefined` — and every one of these is computed from data that may not be
   there. */
type Row = {
  kind: 'shrine' | 'figure' | 'order' | 'place';
  key: string;
  name: string;
  meta?: string | undefined;
  to: string;
  tone?: string | undefined;
};

export function ArchiveSearch({ onClose }: { onClose: () => void }) {
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const navigate = useNavigate();
  const { shrines } = useShrineData();

  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 120);
  const [activeIndex, setActiveIndex] = useState(0);
  const [entities, setEntities] = useState<readonly SearchEntity[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const listId = useId();

  /* The figures and orders, fetched once per open rather than bundled. 27 KB of
     names is small next to the 416 KB graph it was extracted from, and a reader
     who never searches downloads neither. */
  useEffect(() => {
    let cancelled = false;
    import('../../../data/kg-search-index.json')
      .then((m) => {
        if (!cancelled) setEntities(m.default as SearchEntity[]);
      })
      .catch(() => {
        /* A search that finds sites but no figures is worth more than an
           overlay that fails to open. The shrine half does not depend on this. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { ids } = useSearch(shrines as Shrine[], debounced);
  const places = useMemo(() => buildPlaces(shrines).places, [shrines]);

  const rows = useMemo<Row[]>(() => {
    const q = debounced.trim();
    if (!q) return [];

    const shrineRows: Row[] = (ids ?? [])
      .slice(0, PER_GROUP.shrine)
      .map((i) => shrines[i])
      .filter(Boolean)
      .map((shrine) => ({
        kind: 'shrine' as const,
        key: `shrine:${shrine.slug}`,
        name: localizeShrineName(shrine, lang),
        meta: shrine.location ? localizeRecordedName(shrine.location, lang) : undefined,
        to: `/shrine/${shrine.slug}`,
        tone: categoryKey(shrine.category),
      }));

    const byType = (type: 'figure' | 'order') =>
      matchEntities(
        entities.filter((e) => e.type === type),
        q,
        PER_GROUP[type],
      ).map(({ entity }) => ({
        kind: type,
        key: `${type}:${entity.slug}`,
        name:
          type === 'figure' ? localizeFigureName(entity, lang) : localizeOrderName(entity, lang),
        /* A lineage-only figure has a page but is not an entry of this archive,
           and the row says so rather than letting the reader assume one. */
        meta: entity.lineageOnly
          ? t('figureLineageOnly')
          : entity.note
            ? localizeOrderName({ name: entity.note }, lang)
            : undefined,
        to: `/${type === 'figure' ? 'saint' : 'order'}/${entity.slug}`,
      }));

    const placeRows: Row[] = matchEntities(
      places.map((place) => ({ type: 'order' as const, slug: place.slug, name: place.name })),
      q,
      PER_GROUP.place,
    ).map(({ entity }) => {
      const place = places.find((p) => p.slug === entity.slug)!;
      return {
        kind: 'place' as const,
        key: `place:${place.slug}`,
        name: localizeRecordedName(place.name, lang),
        meta: fmtNum(tFn(lang, 'placeSiteCount', place.shrines.length)),
        to: `/place/${place.slug}`,
      };
    });

    return [...shrineRows, ...byType('figure'), ...byType('order'), ...placeRows];
  }, [debounced, ids, shrines, entities, places, lang, t, fmtNum]);

  /* Group headings are rendered from the row list rather than stored on it, so
     the keyboard walks one flat array and cannot land on a heading. */
  const headingFor = (kind: Row['kind']): string =>
    kind === 'shrine'
      ? t('coverageSitesHeading')
      : kind === 'figure'
        ? t('tabExplore')
        : kind === 'order'
          ? t('sufiOrders')
          : t('placesTitle');

  useEffect(() => setActiveIndex(0), [rows]);

  /* Capture the trigger before focus moves in, and put it back on close — the
     same contract as the map palette and the gallery lightbox. A reader who
     opened this from the keyboard has to land back where they were. */
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, []);

  const commit = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      navigate(row.to);
      onClose();
    },
    [navigate, onClose],
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
        if (rows.length === 0) return;
        setActiveIndex((i) => {
          const next = event.key === 'ArrowDown' ? i + 1 : i - 1;
          return (next + rows.length) % rows.length;
        });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        commit(rows[activeIndex]);
        return;
      }
      if (event.key === 'Tab') {
        // Modal: Tab must not reach the page behind.
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'input, button, [href], [tabindex]:not([tabindex="-1"])',
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
    [rows, activeIndex, commit, onClose],
  );

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return createPortal(
    <div
      className="palette-backdrop"
      /* Mousedown, not click: a drag that starts on a row and ends on the
         backdrop would otherwise dismiss instead of opening. */
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
          <input
            ref={inputRef}
            type="search"
            className="palette-input search-input"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={rows.length > 0 ? `${listId}-option-${activeIndex}` : undefined}
            dir={isRtl ? 'rtl' : undefined}
            placeholder={t('paletteTitle')}
            aria-label={t('paletteTitle')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button
            type="button"
            className="palette-close"
            onClick={onClose}
            aria-label={t('paletteClose')}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {rows.length > 0 ? (
          <ul
            className="palette-results archive-search-results"
            id={listId}
            role="listbox"
            ref={listRef}
          >
            {rows.map((row, i) => (
              <React.Fragment key={row.key}>
                {(i === 0 || rows[i - 1].kind !== row.kind) && (
                  /* `aria-hidden` and outside the option list: a listbox may
                     contain only options, and a screen reader gets the kind from
                     each option's own label instead. */
                  <li className="archive-search-group" aria-hidden="true">
                    {headingFor(row.kind)}
                  </li>
                )}
                <li
                  id={`${listId}-option-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`palette-result${i === activeIndex ? ' active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(row)}
                >
                  <span
                    className={`palette-result-dot${
                      row.kind === 'shrine' && row.tone ? ` palette-result-dot--${row.tone}` : ''
                    } archive-search-dot--${row.kind}`}
                    aria-hidden="true"
                  />
                  <span className="palette-result-body">
                    <span className="palette-result-name">
                      <bdi>{row.name}</bdi>
                    </span>
                    {row.meta && (
                      <span className="palette-result-meta">
                        <bdi>{row.meta}</bdi>
                      </span>
                    )}
                  </span>
                </li>
              </React.Fragment>
            ))}
          </ul>
        ) : (
          debounced.trim() !== '' && <p className="palette-empty">{t('noMatches')}</p>
        )}

        <div className="palette-footer">
          <span className="palette-hint">
            <kbd className="palette-kbd">↑</kbd>
            <kbd className="palette-kbd">↓</kbd> {t('paletteHintMove')}
          </span>
          <span className="palette-hint">
            <kbd className="palette-kbd">↵</kbd> {t('paletteHintOpen')}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
