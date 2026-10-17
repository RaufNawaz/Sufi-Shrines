import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { Stat } from '../components/archive/CoverageStats';
import { useShrineData } from '../hooks/useShrineData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { isRtlLang } from '../lib/i18n/languages';
import { sourceAnchorId } from '../lib/data/sourceIndex';
import {
  bookText,
  buildLibrary,
  READING_LIBRARY,
  type LibrarySource,
  type ShelfWork,
} from '../lib/data/sourceLibrary';
import { SOURCE_TYPE_ORDER, type SourceType } from '../lib/data/sourceType';
import { SourceRow } from '../components/sources/SourceParts';
import {
  dominantTradition,
  LANGUAGE_LABEL_KEYS,
  SOURCE_TYPE_LABEL_KEYS,
} from '../components/sources/sourceLabels';

/**
 * `/sources` — the archive's library, as a tab.
 *
 * Built for three readers, in the order the page serves them:
 *
 * - **the browser**, who wants to see what the archive stands on at a glance —
 *   the shelf, where each spine is as thick as the entries resting on it;
 * - **the scholar**, who wants a particular book — the shelf and the
 *   reading-desk cards each open the book's own page, with the entries, the
 *   map, and search links for a copy;
 * - **the checker**, who arrives from a shrine page's "also cited by…" link
 *   wanting one citation — the full list, searchable and filterable by kind,
 *   which opens and scrolls to the line the URL names.
 *
 * Until this page the only cross-entry view of the sources was a section of
 * `/about` that renders for the team alone, and every shrine page's "also cited
 * by N other entries" link sent a public reader there, to nothing.
 */

const FIRST_PAGE = 40;
const NEXT_PAGE = 80;

/** Diacritic- and case-blind, so "Hujwiri" finds "Hujwīrī" and "ewing" finds "Ewing". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[*‘’“”"]/g, '')
    .toLowerCase();
}

/** A spine is 2.75–5.5rem wide by entries, on a square-root scale so one book
 *  cited 48 times does not reduce every other spine to a hairline. The floor
 *  is 44px because a spine is a tap target before it is a bar. */
function spineWidth(entries: number, max: number): string {
  const share = Math.sqrt(entries) / Math.sqrt(Math.max(max, 1));
  return `${(2.75 + share * 2.75).toFixed(2)}rem`;
}

/**
 * What fits up a spine: the main title without a leading article, cut at a word
 * boundary. The full title is the link's accessible name and its tooltip, so
 * nothing is lost — a spine is a label, not the record.
 */
function spineLabel(title: string, max = 28): string {
  const main = title
    .split(':')[0]!
    .replace(/^(the|a)\s+/i, '')
    .trim();
  if (main.length <= max) return main;
  const cut = main.slice(0, max + 1).replace(/\s+\S*$/, '');
  return `${cut || main.slice(0, max)}…`;
}

/** Spine heights vary a little, as books do, and stably — from the slug. */
function spineHeight(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return `${(13 + (h % 7) * 0.4).toFixed(2)}rem`;
}

function Shelf({ works }: { works: ShelfWork[] }) {
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const max = works[0]?.entries.length ?? 1;
  return (
    <section className="sources-section" aria-labelledby="sources-shelf-heading">
      <h2 id="sources-shelf-heading" className="sources-section-heading">
        {t('sourcesShelfHeading')}
      </h2>
      <p className="sources-section-note">{t('sourcesShelfNote')}</p>
      {/* A list of links that happens to look like a shelf. Scrolls sideways on
          a phone rather than wrapping: a shelf that wraps reads as two shelves. */}
      <div className="sources-shelf-scroller">
        <ul className="sources-shelf">
          {works.map((work) => {
            const tradition = dominantTradition(work.entries);
            return (
              <li key={work.slug} className="sources-shelf-item">
                <Link
                  to={`/source/${work.slug}`}
                  className={`sources-spine${tradition ? ` sources-spine--${tradition}` : ''}`}
                  style={
                    {
                      '--spine-w': spineWidth(work.entries.length, max),
                      '--spine-h': spineHeight(work.slug),
                    } as React.CSSProperties
                  }
                  {...(isRtl
                    ? {}
                    : { title: work.author ? `${work.title} — ${work.author}` : work.title })}
                >
                  {/* The accessible name is the full title and author, as text
                      rather than an aria-label: a citation stays Latin in the
                      Urdu view (i18n rule 7), and text can say so with
                      data-latin where an attribute cannot. The tooltip is the
                      same for a pointer, English view only for that reason. */}
                  <span className="sr-only">
                    <bdi data-latin>{work.title}</bdi>
                    {work.author && (
                      <>
                        {' — '}
                        <bdi data-latin>{work.author}</bdi>
                      </>
                    )}
                    {', '}
                    {fmtNum(tFn(lang, 'coverageRestsEntryCount', work.entries.length))}
                  </span>
                  <span className="sources-spine-title" aria-hidden="true" data-latin>
                    {spineLabel(work.title)}
                  </span>
                  <span className="sources-spine-count" aria-hidden="true">
                    {fmtNum(work.entries.length)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Enough cards to show the range — Urdu, Persian, English — without making a
 *  phone reader scroll past 31 cards to reach the searchable list. */
const DESK_PREVIEW = 9;

function ReadingDesk({ works }: { works: ShelfWork[] }) {
  const { lang, t, fmtNum } = useLang();
  const [all, setAll] = useState(false);
  const pages = READING_LIBRARY.reduce((n, b) => n + (b.pages ?? 0), 0);
  return (
    <section className="sources-section" aria-labelledby="sources-reading-heading">
      <h2 id="sources-reading-heading" className="sources-section-heading">
        {t('sourcesReadingHeading')}
        <span className="sources-section-count">
          {fmtNum(tFn(lang, 'sourcesReadingCount', READING_LIBRARY.length, pages))}
        </span>
      </h2>
      <p className="sources-section-note">{t('sourcesReadingNote')}</p>
      <ul className="sources-desk">
        {(all ? works : works.slice(0, DESK_PREVIEW)).map((work, i) => {
          const book = work.book!;
          const cited = work.entries.length > 0;
          const original = LANGUAGE_LABEL_KEYS[book.original];
          const read = LANGUAGE_LABEL_KEYS[book.read];
          const { year } = bookText(book, undefined, lang);
          return (
            <li
              key={work.slug}
              className="sources-desk-item reveal-rise"
              style={{ '--stagger-index': Math.min(i, 12) } as React.CSSProperties}
            >
              <Link
                to={`/source/${work.slug}`}
                className={`sources-card sources-card--${book.original}`}
              >
                <span className="sources-card-lang">
                  {original ? t(original) : book.original}
                  {read && book.read !== book.original && (
                    <>
                      {' → '}
                      {t(read)}
                    </>
                  )}
                </span>
                <span className="sources-card-title">
                  <bdi data-latin>{work.title}</bdi>
                </span>
                {work.author && (
                  <span className="sources-card-author">
                    <bdi data-latin>{work.author}</bdi>
                  </span>
                )}
                <span className="sources-card-foot">
                  {year && (
                    <span
                      className="sources-card-year"
                      {...(/[A-Za-z]/.test(year) ? { 'data-latin': '' } : {})}
                    >
                      {year}
                    </span>
                  )}
                  <span
                    className={`sources-card-status${cited ? ' sources-card-status--cited' : ''}`}
                  >
                    {cited
                      ? `${t('sourcesReadingCited')} · ${fmtNum(
                          tFn(lang, 'coverageRestsEntryCount', work.entries.length),
                        )}`
                      : t('sourcesReadingInReview')}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {works.length > DESK_PREVIEW && (
        <button
          type="button"
          className="action-btn sources-more"
          aria-expanded={all}
          onClick={() => setAll((open) => !open)}
        >
          {all ? t('sourcesShowFewer') : fmtNum(tFn(lang, 'sourcesShowAllBooks', works.length))}
        </button>
      )}
    </section>
  );
}

function KindsBar({
  counts,
  total,
  active,
  onPick,
}: {
  counts: Record<SourceType, number>;
  total: number;
  active: SourceType | null;
  onPick: (type: SourceType | null) => void;
}) {
  const { t, fmtNum } = useLang();
  const present = SOURCE_TYPE_ORDER.filter((type) => counts[type] > 0);
  return (
    <div className="sources-kinds">
      <div className="sources-kinds-bar" aria-hidden="true">
        {present.map((type) => (
          <span
            key={type}
            className={`sources-kinds-slice sources-type--${type}${active && active !== type ? ' sources-kinds-slice--dim' : ''}`}
            style={{ flexGrow: counts[type] }}
          />
        ))}
      </div>
      {/* The legend is the filter: the bar says how much of each, and the
          chip under each colour is how a reader asks for only those. */}
      <div
        className="filter-chips sources-kinds-chips"
        role="group"
        aria-label={t('sourcesKindsHeading')}
      >
        <button
          type="button"
          className={`filter-chip${active === null ? ' active' : ''}`}
          aria-pressed={active === null}
          onClick={() => onPick(null)}
        >
          {t('sourcesFilterAll')} <span className="sources-chip-count">{fmtNum(total)}</span>
        </button>
        {present.map((type) => (
          <button
            key={type}
            type="button"
            className={`filter-chip${active === type ? ' active' : ''}`}
            aria-pressed={active === type}
            onClick={() => onPick(active === type ? null : type)}
          >
            <span className={`sources-type-dot sources-type--${type}`} aria-hidden="true" />
            {t(SOURCE_TYPE_LABEL_KEYS[type])}{' '}
            <span className="sources-chip-count">{fmtNum(counts[type])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SourcesPage() {
  const { shrines, offline, sourceTimestamp, loading } = useShrineData();
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('sourcesTitle')} — ${t('siteTitle')}`);

  const library = useMemo(() => buildLibrary(shrines), [shrines]);
  const shrinesBySlug = useMemo(() => new Map(shrines.map((s) => [s.slug, s])), [shrines]);
  const worksBySlug = useMemo(
    () => new Map(library.works.map((w) => [w.slug, w])),
    [library.works],
  );
  const shelf = useMemo(() => library.works.filter((w) => w.entries.length > 0), [library.works]);
  const desk = useMemo(() => library.works.filter((w) => w.book), [library.works]);

  const [query, setQuery] = useState('');
  const [type, setType] = useState<SourceType | null>(null);
  const [order, setOrder] = useState<'cited' | 'alpha'>('cited');
  const [limit, setLimit] = useState(FIRST_PAGE);

  /* The line a shrine page's "also cited by…" link asked for. */
  const { hash } = useLocation();
  const wanted = hash.startsWith('#source-') ? hash.slice(1) : '';
  const [opened, setOpened] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    let rows: LibrarySource[] = library.sources;
    if (type) rows = rows.filter((s) => s.type === type);
    if (q) rows = rows.filter((s) => fold(s.name).includes(q));
    if (order === 'alpha') {
      rows = [...rows].sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
    }
    return rows;
  }, [library.sources, query, type, order]);

  /* Arriving with a line in the URL: clear anything that would hide it, show
     enough of the list to include it, open it, and bring it into view. */
  useEffect(() => {
    if (!wanted || library.sources.length === 0) return;
    const at = library.sources.findIndex((s) => sourceAnchorId(s.name) === wanted);
    if (at < 0) return;
    setQuery('');
    setType(null);
    setOrder('cited');
    setLimit((current) => Math.max(current, at + 1));
    setOpened((current) => new Set(current).add(wanted));
    const id = window.requestAnimationFrame(() =>
      document.getElementById(wanted)?.scrollIntoView({ block: 'center' }),
    );
    return () => window.cancelAnimationFrame(id);
  }, [wanted, library.sources]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <EntityPageHeader title={t('sourcesTitle')} />

      <article
        className="entity-page sources-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li aria-current="page">{t('sourcesTitle')}</li>
          </ol>
        </nav>

        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

        <h1 ref={headingRef} className="entity-title">
          {t('sourcesTitle')}
        </h1>
        <p className="typology-intro">{t('sourcesIntro')}</p>

        {loading && shrines.length === 0 ? (
          <p className="coverage-loading page-loading-reserve">{t('loading')}</p>
        ) : (
          <>
            <div className="coverage-stat-grid sources-stats">
              <Stat value={library.citations} label={t('sourcesStatCitations')} />
              <Stat value={library.sources.length} label={t('sourcesStatLines')} />
              <Stat value={shelf.length} label={t('sourcesStatShelf')} />
              <Stat value={READING_LIBRARY.length} label={t('sourcesStatRead')} />
            </div>

            {shelf.length > 0 && <Shelf works={shelf} />}

            <ReadingDesk works={desk} />

            <section className="sources-section" aria-labelledby="sources-all-heading">
              <h2 id="sources-all-heading" className="sources-section-heading">
                {t('sourcesAllHeading')}
              </h2>
              <p className="sources-section-note">{t('sourcesKindsNote')}</p>

              <KindsBar
                counts={library.typeCounts}
                total={library.sources.length}
                active={type}
                onPick={(next) => {
                  setType(next);
                  setLimit(FIRST_PAGE);
                }}
              />

              <div className="sources-toolbar">
                <label className="sources-search">
                  <span className="sr-only">{t('sourcesSearchLabel')}</span>
                  <svg
                    className="sources-search-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    placeholder={t('sourcesSearchPlaceholder')}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(FIRST_PAGE);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <div
                  className="almanac-view-toggle sources-order"
                  role="group"
                  aria-label={t('sourcesSortLabel')}
                >
                  <button
                    type="button"
                    className={`filter-chip${order === 'cited' ? ' active' : ''}`}
                    aria-pressed={order === 'cited'}
                    onClick={() => setOrder('cited')}
                  >
                    {t('sourcesSortCited')}
                  </button>
                  <button
                    type="button"
                    className={`filter-chip${order === 'alpha' ? ' active' : ''}`}
                    aria-pressed={order === 'alpha'}
                    onClick={() => setOrder('alpha')}
                  >
                    {t('sourcesSortAlpha')}
                  </button>
                </div>
              </div>

              <p className="sources-count" aria-live="polite">
                {fmtNum(tFn(lang, 'sourcesShowing', shown.length, filtered.length))}
              </p>

              {filtered.length === 0 ? (
                <p className="sources-empty">{t('sourcesNoMatch')}</p>
              ) : (
                <ul className="sources-list">
                  {shown.map((source) => {
                    const anchor = sourceAnchorId(source.name);
                    return (
                      <SourceRow
                        key={source.key}
                        source={source}
                        shrinesBySlug={shrinesBySlug}
                        worksBySlug={worksBySlug}
                        open={opened.has(anchor)}
                        highlighted={anchor === wanted}
                        onToggle={(isOpen) =>
                          setOpened((current) => {
                            if (isOpen === current.has(anchor)) return current;
                            const next = new Set(current);
                            if (isOpen) next.add(anchor);
                            else next.delete(anchor);
                            return next;
                          })
                        }
                      />
                    );
                  })}
                </ul>
              )}

              {shown.length < filtered.length && (
                <button
                  type="button"
                  className="action-btn sources-more"
                  onClick={() => setLimit((n) => n + NEXT_PAGE)}
                >
                  {t('sourcesShowMore')}
                </button>
              )}
            </section>
          </>
        )}
        <SiteFooter />
      </article>
    </div>
  );
}
