import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { isRtlLang } from '../lib/i18n/languages';
import { CATEGORY_LABELS } from '../lib/data/categoryKey';
import { hasProjectAccess } from '../lib/projectAccess';
import { YEAR_PRECISION_LABEL_KEYS } from '../lib/data/yearPrecision';
import {
  buildChronology,
  packRows,
  type DatedPlacement,
  type TimelineEntry,
  type TraditionBand,
} from '../lib/chronology/timeline';

/**
 * Track C — the archive across the centuries.
 *
 * The one thing to keep in mind when editing this file: **a bar's width is how
 * much the archive does not know.** An exactly dated place is a tick; a place
 * known only to its century is a hundred years wide. Making the marks a uniform
 * size would be easier to look at and would be the false precision this whole
 * track was deferred over (`docs/planning/TRACK_C_CHRONOLOGY.md`).
 *
 * Nothing here decides what a date means — `src/lib/chronology/timeline.ts` does
 * that, in tested pure functions, precisely so a layout change cannot quietly
 * alter what the archive is claiming.
 */

const TICK_STEP = 100;
/** Years of air between two marks in one row of a packed lane. */
const ROW_GAP_YEARS = 4;
/** One packed row: a 7px mark and 3px of air. */
const ROW_PX = 10;
/** Rows shown under each tradition before "Show all". */
const LIST_PREVIEW = 6;

type BandKey = TraditionBand['key'];

/** A place's span as text: one year when the archive has one year, not
 *  "1684–1684". */
function spanText(
  lang: Parameters<typeof tFn>[0],
  fmtNum: (n: number | string) => string,
  from: number,
  to: number,
): string {
  return from === to ? fmtNum(from) : tFn(lang, 'chronologySpan', fmtNum(from), fmtNum(to));
}

function ticksFor(from: number, to: number): number[] {
  const ticks: number[] = [];
  for (let year = from; year <= to; year += TICK_STEP) ticks.push(year);
  return ticks;
}

function Scale({ from, to }: { from: number; to: number }) {
  const { fmtNum } = useLang();
  const span = to - from;
  const ticks = ticksFor(from, to);

  return (
    <div className="chronology-scale" aria-hidden="true">
      {ticks.map((year, i) => (
        <span
          key={year}
          /* The last label is anchored to the end of the axis rather than to its
             own gridline — the same fix `order-timeline-tick--end` carries, for
             the same reason. A tick at 100% *starts* at the right edge and its
             text runs off it: measured at 390px, the scale overflowed its box by
             22px and rocked the whole document 6px sideways. Odd centuries are
             marked minor so a phone can drop their labels and keep the lines. */
          className={[
            'chronology-tick',
            i === ticks.length - 1 && 'chronology-tick--end',
            i % 2 === 1 && 'chronology-tick--minor',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            i === ticks.length - 1
              ? undefined
              : { insetInlineStart: `${((year - from) / span) * 100}%` }
          }
        >
          {fmtNum(year)}
        </span>
      ))}
    </div>
  );
}

/** The century gridlines, drawn once behind every lane so a bar can be read
 *  against the scale without a ruler. */
function Grid({ from, to }: { from: number; to: number }) {
  const span = to - from;
  return (
    <div className="chronology-grid" aria-hidden="true">
      {ticksFor(from, to).map((year) => (
        <span
          key={year}
          className="chronology-gridline"
          style={{ insetInlineStart: `${((year - from) / span) * 100}%` }}
        />
      ))}
    </div>
  );
}

const markClass = (placement: DatedPlacement) =>
  placement.precision === 'century'
    ? 'chronology-mark chronology-mark--century'
    : placement.precision === 'exact'
      ? 'chronology-mark'
      : 'chronology-mark chronology-mark--circa';

interface HoverState {
  slug: string;
  x: number;
  y: number;
}

/**
 * One tradition's row in the chart: its name (a button that shows that
 * tradition's places), and the lane.
 *
 * The lane is a picture, and only a picture. The marks were links until
 * Lighthouse measured this page at 96 for accessibility: a mark is ~7px tall
 * and often 2px wide, so 120 of them are 120 targets far under the 24px
 * minimum — and under this archive's own 44px standard. Shrinking a mark to
 * fit a target size is impossible — the width IS the datum. So the marks are
 * presentational, and every dated place is reachable from the list beneath
 * the chart, where the name, the span and the precision are readable. A
 * pointer gets a label on hover as a convenience; nothing depends on it.
 */
function BandRow({
  band,
  extent,
  dimmed,
  hoveredSlug,
  onChoose,
}: {
  band: TraditionBand;
  extent: { from: number; to: number };
  dimmed: boolean;
  hoveredSlug: string | null;
  onChoose: (key: BandKey) => void;
}) {
  const { lang, t, fmtNum } = useLang();
  const span = extent.to - extent.from;
  const { rows, depth } = useMemo(() => packRows(band.entries, ROW_GAP_YEARS), [band.entries]);

  return (
    <div className={`chronology-band chronology-band--${band.key}${dimmed ? ' is-dimmed' : ''}`}>
      <div className="chronology-band-label">
        <button type="button" className="chronology-band-name" onClick={() => onChoose(band.key)}>
          <span className="chronology-dot" aria-hidden="true" />
          {CATEGORY_LABELS[band.key][lang]}
        </button>
        <span className="chronology-band-count">
          {band.extent
            ? `${fmtNum(band.entries.length)} · ${tFn(lang, 'chronologySpan', fmtNum(band.extent.from), fmtNum(band.extent.to))}`
            : t('chronologyEmptyBand')}
        </span>
      </div>
      {band.entries.length > 0 && (
        <div
          className="chronology-lane"
          aria-hidden="true"
          style={{ blockSize: `${depth * ROW_PX}px` }}
        >
          {band.entries.map(({ shrine, placement }, i) => {
            const left = ((placement.from - extent.from) / span) * 100;
            const width = ((placement.to - placement.from) / span) * 100;
            return (
              <span
                key={shrine.slug}
                data-slug={shrine.slug}
                className={`${markClass(placement)}${hoveredSlug === shrine.slug ? ' is-hot' : ''}`}
                style={{
                  insetInlineStart: `${left}%`,
                  inlineSize: `${width}%`,
                  insetBlockStart: `${rows[i] * ROW_PX}px`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** One tradition's places as an inset list, the first few shown and the rest a
 *  tap away. Every row is in the DOM either way (the rest `hidden`), so a find
 *  in page and the count the e2e suite holds against the marks both still see
 *  all of them. */
function PlacesGroup({ band }: { band: TraditionBand }) {
  const { lang, t, fmtNum } = useLang();
  const [expanded, setExpanded] = useState(false);
  const listId = `places-list-${band.key}`;
  if (band.entries.length === 0) return null;
  const more = band.entries.length > LIST_PREVIEW;

  return (
    <section
      className={`chronology-places-group chronology-band--${band.key}`}
      id={`places-${band.key}`}
      aria-labelledby={`places-heading-${band.key}`}
    >
      <h3 className="inset-list-header" id={`places-heading-${band.key}`}>
        <span className="chronology-dot" aria-hidden="true" />
        {CATEGORY_LABELS[band.key][lang]}
        <span className="inset-list-header-count">{fmtNum(band.entries.length)}</span>
      </h3>
      <ul className="inset-list chronology-band-list" id={listId}>
        {band.entries.map(({ shrine, placement }, i) => (
          <li
            key={shrine.slug}
            className="inset-row inset-row--link"
            hidden={more && !expanded && i >= LIST_PREVIEW}
          >
            <Link to={`/shrine/${shrine.slug}`}>
              <span className="inset-row-label">{localizeShrineName(shrine, lang)}</span>
              <span className="chronology-band-list-date">
                {spanText(lang, fmtNum, placement.from, placement.to)}
                <span className="chronology-precision">
                  {t(YEAR_PRECISION_LABEL_KEYS[placement.precision])}
                </span>
              </span>
              <span className="inset-row-chevron" />
            </Link>
          </li>
        ))}
      </ul>
      {more && (
        <button
          type="button"
          className="action-btn chronology-more"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded
            ? t('chronologyShowFewer')
            : fmtNum(tFn(lang, 'almanacShowList', band.entries.length))}
        </button>
      )}
    </section>
  );
}

export default function ChronologyPage() {
  const { shrines, loading, offline, sourceTimestamp } = useShrineData();
  const { t, lang, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('chronologyTitle')} — ${t('siteTitle')}`);

  const chronology = useMemo(() => buildChronology(shrines), [shrines]);
  const [filter, setFilter] = useState<BandKey | 'all'>('all');
  const [hover, setHover] = useState<HoverState | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const placesRef = useRef<HTMLElement>(null);

  const entryBySlug = useMemo(() => {
    const map = new Map<string, TimelineEntry>();
    for (const band of chronology.bands) for (const e of band.entries) map.set(e.shrine.slug, e);
    return map;
  }, [chronology]);
  const plotted = chronology.bands.filter((band) => band.entries.length > 0);
  const hovered = hover ? entryBySlug.get(hover.slug) : undefined;

  /* The label follows whichever mark is under the pointer — mouse, pen or a
     finger's touch. Read from the event target, so 120 marks need no handlers
     of their own. */
  const trackPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const mark = (event.target as HTMLElement).closest<HTMLElement>('.chronology-mark');
    const box = plotRef.current?.getBoundingClientRect();
    if (!mark?.dataset.slug || !box) {
      if (hover) setHover(null);
      return;
    }
    const markBox = mark.getBoundingClientRect();
    setHover({
      slug: mark.dataset.slug,
      /* Clamped so a label over the first or last century stays inside the
         card instead of hanging off a phone's edge. */
      x: Math.min(Math.max(markBox.left + markBox.width / 2 - box.left, 100), box.width - 100),
      y: markBox.top - box.top,
    });
  };

  /* Choosing a tradition from the chart shows its places and takes the reader
     to them; choosing it again from the filter row does the same without the
     scroll. */
  const chooseFromChart = (key: BandKey) => {
    setFilter(key);
    window.requestAnimationFrame(() =>
      placesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <EntityPageHeader title={t('chronologyTitle')} />

      <article
        className="entity-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li aria-current="page">{t('chronologyTitle')}</li>
          </ol>
        </nav>

        <h1 className="entity-title" ref={headingRef} tabIndex={-1}>
          {t('chronologyTitle')}
        </h1>
        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />
        <p className="chronology-lede">{t('chronologyIntro')}</p>

        {/* Large numerals with small captions, the Apple pass's stat tiles. The
            undated count sits beside the dated one at the same size: what the
            archive cannot date is a headline figure, not a footnote. */}
        <div className="coverage-stat-grid chronology-counts">
          <div className="coverage-stat">
            <div className="coverage-stat-value">{fmtNum(chronology.dated)}</div>
            <div className="coverage-stat-label">{t('chronologyDated')}</div>
          </div>
          <div className="coverage-stat">
            <div className="coverage-stat-value">{fmtNum(chronology.undated.total)}</div>
            <div className="coverage-stat-label">{t('chronologyUndated')}</div>
          </div>
          {chronology.extent && (
            <div className="coverage-stat">
              <div className="coverage-stat-value">
                {tFn(
                  lang,
                  'chronologySpan',
                  fmtNum(chronology.extent.from),
                  fmtNum(chronology.extent.to),
                )}
              </div>
              <div className="coverage-stat-label">{t('chronologySpanLabel')}</div>
            </div>
          )}
          <div className="coverage-stat">
            <div className="coverage-stat-value">{fmtNum(plotted.length)}</div>
            <div className="coverage-stat-label">{t('aboutStateTraditions')}</div>
          </div>
        </div>

        {loading && shrines.length === 0 ? (
          <p className="coverage-loading page-loading-reserve">{t('loading')}</p>
        ) : chronology.extent ? (
          <>
            <div className="chronology-chart">
              <div
                className="chronology-plot"
                ref={plotRef}
                onPointerMove={trackPointer}
                onPointerDown={trackPointer}
                onPointerLeave={() => setHover(null)}
              >
                <Scale from={chronology.extent.from} to={chronology.extent.to} />
                <div className="chronology-rows">
                  <Grid from={chronology.extent.from} to={chronology.extent.to} />
                  {chronology.bands.map((band) => (
                    <BandRow
                      key={band.key}
                      band={band}
                      extent={chronology.extent!}
                      dimmed={filter !== 'all' && filter !== band.key}
                      hoveredSlug={hover?.slug ?? null}
                      onChoose={chooseFromChart}
                    />
                  ))}
                </div>
                {hover && hovered && (
                  <div
                    className="chronology-tooltip"
                    aria-hidden="true"
                    /* Physical `left`: the offset is measured from getBoundingClientRect,
                       which is physical in either direction. */
                    style={{ left: hover.x, top: hover.y }}
                  >
                    <span className="chronology-tooltip-name">
                      {localizeShrineName(hovered.shrine, lang)}
                    </span>
                    <span className="chronology-tooltip-date">
                      {spanText(lang, fmtNum, hovered.placement.from, hovered.placement.to)} ·{' '}
                      {t(YEAR_PRECISION_LABEL_KEYS[hovered.placement.precision])}
                    </span>
                  </div>
                )}
              </div>

              {/* The key, under the chart it explains. Shapes, not colours: the
                  swatches are neutral because they stand for kinds of date, and
                  the bands carry the tradition colour. */}
              <dl className="chronology-key">
                <div>
                  <dt>
                    <span className="chronology-swatch chronology-swatch--exact" />
                  </dt>
                  <dd>{t('precisionExact')}</dd>
                </div>
                <div>
                  <dt>
                    <span className="chronology-swatch chronology-swatch--circa" />
                  </dt>
                  <dd>{t('precisionCirca')}</dd>
                </div>
                <div>
                  <dt>
                    <span className="chronology-swatch chronology-swatch--century" />
                  </dt>
                  <dd>{t('precisionCentury')}</dd>
                </div>
              </dl>
            </div>

            <aside className="chronology-note" aria-labelledby="chronology-legend-heading">
              <span className="chronology-note-icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="7" x2="3" y2="17" />
                  <line x1="21" y1="7" x2="21" y2="17" />
                </svg>
              </span>
              <div className="chronology-note-body">
                <h2 className="chronology-note-heading" id="chronology-legend-heading">
                  {t('chronologyLegendHeading')}
                </h2>
                <p>{t('chronologyLegendWidth')}</p>
                <p>{t('chronologyRangeNote')}</p>
              </div>
            </aside>

            <section
              className="chronology-places"
              aria-labelledby="chronology-places-heading"
              ref={placesRef}
            >
              <h2 className="section-heading" id="chronology-places-heading">
                {t('chronologyPlacesHeading')}
              </h2>
              <div
                className="chronology-filter"
                role="group"
                aria-label={t('chronologyFilterLabel')}
              >
                <button
                  type="button"
                  className="chronology-filter-pill"
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  {t('filterAll')}
                  <span className="chronology-filter-count">{fmtNum(chronology.dated)}</span>
                </button>
                {plotted.map((band) => (
                  <button
                    key={band.key}
                    type="button"
                    className={`chronology-filter-pill chronology-band--${band.key}`}
                    aria-pressed={filter === band.key}
                    onClick={() => setFilter(band.key)}
                  >
                    <span className="chronology-dot" aria-hidden="true" />
                    {CATEGORY_LABELS[band.key][lang]}
                    <span className="chronology-filter-count">{fmtNum(band.entries.length)}</span>
                  </button>
                ))}
              </div>
              {chronology.bands
                .filter((band) => filter === 'all' || band.key === filter)
                .map((band) => (
                  <PlacesGroup key={band.key} band={band} />
                ))}
            </section>

            {/* Team view only since 8 October 2026 (Rauf): the public reads the
                timeline, and the account of what is not on it stays with the
                team, like the self-accounts on /about (CLAUDE.md, "Public view
                and team view"). The data is untouched: the tiles above still
                say how many places have no bar, and every undated place keeps
                its entry. */}
            {hasProjectAccess() && (
              <section className="chronology-undated" aria-labelledby="chronology-undated-heading">
                <h2 className="section-heading" id="chronology-undated-heading">
                  {t('chronologyUndatedHeading')}
                </h2>
                <p className="chronology-lede">{t('chronologyUndatedIntro')}</p>
                <p className="chronology-undated-reasons">
                  <span>
                    {fmtNum(chronology.undated.byReason['no-year'])} · {t('chronologyNoYear')}
                  </span>
                  <span>
                    {fmtNum(chronology.undated.byReason.unknown)} · {t('chronologyUnknownYear')}
                  </span>
                  <span>
                    {fmtNum(chronology.undated.byReason.qualified)} · {t('chronologyQualified')}
                  </span>
                </p>
                <ul className="chronology-undated-list">
                  {chronology.undated.shrines.map((shrine) => (
                    <li key={shrine.slug}>
                      <Link to={`/shrine/${shrine.slug}`}>{localizeShrineName(shrine, lang)}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}

        <SiteFooter />
      </article>
    </div>
  );
}
