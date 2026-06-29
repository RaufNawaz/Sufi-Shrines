import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { translateToUrdu } from '../../lib/i18n/urduFallback';
import { extractLeadPreviewText } from '../../lib/data/articleParsing';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const SEARCH_DEBOUNCE_MS = 200;

function categoryKey(category: string): 'muslim' | 'hindu' | 'sikh' | 'default' {
  const c = (category || '').toLowerCase();
  if (c.includes('muslim')) return 'muslim';
  if (c.includes('hindu')) return 'hindu';
  if (c.includes('sikh')) return 'sikh';
  return 'default';
}

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
}: Props) {
  const { lang, t, tCount, localizeField } = useLang();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchRaw, setSearchRaw] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [showList, setShowList] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useDebounce(searchRaw, SEARCH_DEBOUNCE_MS);

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
    (shrine: Shrine) => {
      if (lang !== 'ur') return shrine.name;
      return (
        getUrduFieldValue(shrine.raw, 'Name') ||
        translateToUrdu(shrine.name)
      );
    },
    [lang],
  );

  const categories = useMemo(() => {
    const cats = new Set(shrines.map((s) => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [shrines]);

  const filtered = useMemo(() => {
    let result = shrines;
    if (activeCategory) result = result.filter((s) => s.category === activeCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => {
        const name = localizeName(s).toLowerCase();
        const location = (s.location || '').toLowerCase();
        const saint = (s.sufiSaint || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const desc = getFieldValue(s.raw, 'Description').toLowerCase();
        return (
          name.includes(q) ||
          location.includes(q) ||
          saint.includes(q) ||
          cat.includes(q) ||
          desc.includes(q)
        );
      });
    }
    return result;
  }, [shrines, activeCategory, search, localizeName]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Shrine[]>();
    for (const shrine of filtered) {
      const cat = shrine.category || t('uncategorized');
      const group = groups.get(cat) || [];
      group.push(shrine);
      groups.set(cat, group);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, t]);

  const selectedShrine = useMemo(
    () => (selectedId !== null ? shrines.find((s) => s.id === selectedId) : null),
    [selectedId, shrines],
  );

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

      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12 1.5l-1.5 3H8a.5.5 0 0 0 0 1h.5v2.3C6.3 8.5 5 10.4 5 12.5h14c0-2.1-1.3-4-3.5-4.7V5.5H16a.5.5 0 0 0 0-1h-2.5L12 1.5zM5.5 14v7h13v-7h-13zm4 2.5h5v2.5h-5V16.5z" />
          </svg>
          <h1 className="sidebar-title">
            {lang === 'ur' ? 'صوفی مزارات' : 'Sufi Shrines'}
          </h1>
        </div>
        <div className="sidebar-actions">
          <DarkModeToggle />
          <LanguageToggle />
        </div>
      </div>

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

      {/* Table-of-shrines toggle */}
      {!error && (
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
            <div className="filter-chips" role="group" aria-label="Filter by category">
              <button
                className={`filter-chip${!activeCategory ? ' active' : ''}`}
                onClick={() => setActiveCategory('')}
                aria-pressed={!activeCategory}
              >
                {t('filterAll')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-chip${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
                  aria-pressed={activeCategory === cat}
                >
                  {localizeField(shrines.find((s) => s.category === cat)!.raw, 'Category') || cat}
                </button>
              ))}
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
                  {(search || activeCategory) && (
                    <button
                      className="shrine-list-empty-clear"
                      onClick={() => { setSearchRaw(''); setActiveCategory(''); }}
                    >
                      {lang === 'ur' ? 'فلٹر ہٹائیں' : 'Clear filters'}
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
                            <svg className="shrine-list-thumb-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12 1.5l-1.5 3H8a.5.5 0 0 0 0 1h.5v2.3C6.3 8.5 5 10.4 5 12.5h14c0-2.1-1.3-4-3.5-4.7V5.5H16a.5.5 0 0 0 0-1h-2.5L12 1.5zM5.5 14v7h13v-7h-13zm4 2.5h5v2.5h-5V16.5z" />
                            </svg>
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
          {selectedShrine ? (
            <ShrinePreview shrine={selectedShrine} lang={lang} localizeField={localizeField} />
          ) : (
            <WelcomeCard lang={lang} t={t} />
          )}
        </div>
      )}
    </aside>
  );
}

function WelcomeCard({ lang, t }: { lang: string; t: (k: Parameters<ReturnType<typeof useLang>['t']>[0]) => string }) {
  return (
    <div className="welcome-card">
      <div className="welcome-card-icon-wrap" aria-hidden="true">
        <svg className="welcome-card-icon" viewBox="0 0 64 64" fill="currentColor">
          <path d="M32 6l-3 6H22v3h2v4.6C18.2 21.4 15 25.5 15 30.5h34c0-5-3.2-9.1-9-11V15h2v-3H35l-3-6zm-14 27v26h28V33H18zm8 8h12v10H26V41z" />
        </svg>
      </div>
      <h2 className="welcome-card-title">
        {lang === 'ur' ? 'مزارات دریافت کریں' : 'Explore Sufi Shrines'}
      </h2>
      <p className="welcome-card-text">{t('noSelection')}</p>
      <p className="welcome-card-hint">{t('exploreHint')}</p>
    </div>
  );
}

function ShrinePreview({
  shrine,
  lang,
  localizeField,
}: {
  shrine: Shrine;
  lang: string;
  localizeField: (row: typeof shrine.raw, field: string) => string;
}) {
  const name =
    lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Name') || translateToUrdu(shrine.name)
      : shrine.name;

  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const category = localizeField(shrine.raw, 'Category') || shrine.category;
  const saint = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const founded = shrine.founded;

  const descRaw =
    lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') ||
        getFieldValue(shrine.raw, 'Description')
      : getFieldValue(shrine.raw, 'Description');
  const leadText = descRaw ? extractLeadPreviewText(descRaw) : '';

  return (
    <div className="preview-card">
      {shrine.imageUrl ? (
        <img
          src={shrine.imageUrl}
          alt={name}
          className="preview-card-hero"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="preview-card-hero-placeholder" aria-hidden="true">
          <svg className="preview-card-hero-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1.5l-1.5 3H8a.5.5 0 0 0 0 1h.5v2.3C6.3 8.5 5 10.4 5 12.5h14c0-2.1-1.3-4-3.5-4.7V5.5H16a.5.5 0 0 0 0-1h-2.5L12 1.5zM5.5 14v7h13v-7h-13zm4 2.5h5v2.5h-5V16.5z" />
          </svg>
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
      <Link to={`/shrine/${shrine.slug}`} className="preview-view-link">
        {lang === 'ur' ? 'مکمل تفصیل دیکھیں' : 'View full details'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}
