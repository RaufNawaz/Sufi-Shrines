import React, { useMemo } from 'react';
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
import { YEAR_PRECISION_LABEL_KEYS } from '../lib/data/yearPrecision';
import {
  buildChronology,
  type DatedPlacement,
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

function Scale({ from, to }: { from: number; to: number }) {
  const { fmtNum } = useLang();
  const span = to - from;
  const ticks: number[] = [];
  for (let year = from; year <= to; year += TICK_STEP) ticks.push(year);

  return (
    <div className="chronology-scale" aria-hidden="true">
      {ticks.map((year) => (
        <span
          key={year}
          className="chronology-tick"
          style={{ insetInlineStart: `${((year - from) / span) * 100}%` }}
        >
          {fmtNum(year)}
        </span>
      ))}
    </div>
  );
}

function Band({ band, extent }: { band: TraditionBand; extent: { from: number; to: number } }) {
  const { lang, t, fmtNum } = useLang();
  const span = extent.to - extent.from;

  const markClass = (placement: DatedPlacement) =>
    placement.precision === 'century'
      ? 'chronology-mark chronology-mark--century'
      : placement.precision === 'exact'
        ? 'chronology-mark'
        : 'chronology-mark chronology-mark--circa';

  return (
    <section className="chronology-band" aria-labelledby={`band-${band.key}`}>
      <h2 className="chronology-band-heading" id={`band-${band.key}`}>
        {CATEGORY_LABELS[band.key][lang]}
        <span className="chronology-band-count">
          {band.extent
            ? `${fmtNum(band.entries.length)} · ${tFn(lang, 'chronologySpan', fmtNum(band.extent.from), fmtNum(band.extent.to))}`
            : t('chronologyEmptyBand')}
        </span>
      </h2>
      {band.entries.length === 0 ? (
        <p className="chronology-lane-empty">{t('chronologyEmptyBand')}</p>
      ) : (
        <>
          {/* The lane is a picture, and only a picture. The marks were links
              until Lighthouse measured this page at 96 for accessibility: a
              mark is ~10px tall and often 2px wide, so 120 of them are 120
              targets far under the 24px minimum — and under this archive's own
              44px standard. The axe run in e2e could not see it, because
              `target-size` is a WCAG 2.2 rule and the scan asked for
              wcag2a/wcag2aa (now widened; see e2e/a11y.spec.ts).

              Shrinking a mark to fit a target size is impossible — the width
              IS the datum. So the picture stops pretending to be an interface:
              the marks are presentational, and every dated place is reachable
              from the list beneath its own lane, where the name, the span and
              the precision are readable rather than hover-only. That is better
              for everyone, not only for assistive technology. */}
          <div className="chronology-lane" aria-hidden="true">
            {band.entries.map(({ shrine, placement }) => {
              const left = ((placement.from - extent.from) / span) * 100;
              const width = ((placement.to - placement.from) / span) * 100;
              return (
                <span
                  key={shrine.slug}
                  className={markClass(placement)}
                  style={{ insetInlineStart: `${left}%`, inlineSize: `${width}%` }}
                />
              );
            })}
          </div>
          <ul className="chronology-band-list">
            {band.entries.map(({ shrine, placement }) => (
              <li key={shrine.slug}>
                <Link to={`/shrine/${shrine.slug}`}>{localizeShrineName(shrine, lang)}</Link>{' '}
                <span className="chronology-band-list-date">
                  {tFn(lang, 'chronologySpan', fmtNum(placement.from), fmtNum(placement.to))} ·{' '}
                  {t(YEAR_PRECISION_LABEL_KEYS[placement.precision])}
                </span>
              </li>
            ))}
          </ul>
        </>
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
        <nav className="shrine-breadcrumb" aria-label="Breadcrumb">
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

        <p className="chronology-counts">
          <span>
            {fmtNum(chronology.dated)} {t('chronologyDated')}
          </span>
          <span>
            {fmtNum(chronology.undated.total)} {t('chronologyUndated')}
          </span>
        </p>

        {loading && shrines.length === 0 ? (
          <p className="coverage-loading page-loading-reserve">{t('loading')}</p>
        ) : chronology.extent ? (
          <>
            <Scale from={chronology.extent.from} to={chronology.extent.to} />
            {chronology.bands.map((band) => (
              <Band key={band.key} band={band} extent={chronology.extent!} />
            ))}

            <section className="chronology-legend" aria-labelledby="chronology-legend-heading">
              <h2 id="chronology-legend-heading">{t('chronologyLegendHeading')}</h2>
              <p className="chronology-lede">{t('chronologyLegendWidth')}</p>
              <dl>
                <dt>
                  <span className="chronology-swatch" style={{ inlineSize: '2px' }} />
                </dt>
                <dd>{t('precisionExact')}</dd>
                <dt>
                  <span
                    className="chronology-swatch chronology-swatch--circa"
                    style={{ inlineSize: '3rem' }}
                  />
                </dt>
                <dd>{t('precisionCirca')}</dd>
                <dt>
                  <span
                    className="chronology-swatch chronology-swatch--century"
                    style={{ inlineSize: '6rem' }}
                  />
                </dt>
                <dd>{t('precisionCentury')}</dd>
              </dl>
              <p className="chronology-lede">{t('chronologyRangeNote')}</p>
            </section>

            <section className="chronology-undated" aria-labelledby="chronology-undated-heading">
              <h2 id="chronology-undated-heading">{t('chronologyUndatedHeading')}</h2>
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
          </>
        ) : null}

        <SiteFooter />
      </article>
    </div>
  );
}
