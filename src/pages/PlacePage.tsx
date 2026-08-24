import React, { useMemo } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link, useParams } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';

import { buildPlaces, type PlaceRecord } from '../lib/data/places';
import { ShrineImage } from '../components/ui/ShrineImage';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { CATEGORY_LABELS } from '../lib/data/categoryKey';
import type { Lang } from '../types/shrine';

import { isRtlLang } from '../lib/i18n/languages';
import { localizeRecordedName } from '../lib/i18n/localizeRecordedName';
/**
 * One place, and what the archive records in it.
 *
 * Track B of `docs/planning/SHARED_GROUND_VISION.md`: "Uch Sharif" and "Nankana
 * Sahib" should be readable subjects rather than filter values. 35 of 169 sites
 * are in or around Lahore and the shrine pages never said so.
 *
 * The page states only what `places.ts` can derive from the `Location` column —
 * which sites, which traditions, and the span of the dates it can actually read.
 * It deliberately does not describe the place: this archive has no prose about
 * Lahore, and writing some here would be inventing content (RULE 2).
 */

function PlaceContent({ place, lang }: { place: PlaceRecord; lang: Lang }) {
  const { t, fmtNum } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const displayName = localizeRecordedName(place.name, lang);

  /* Up to five photographs from the place's own sites.
   *
   * Only sites that actually have one, and only when there are at least two:
   * 51 of 169 entries carry no photograph (see /coverage), and a strip of
   * category glyphs standing in for missing photos would advertise an absence
   * as if it were content. */
  const photos = React.useMemo(
    () => place.shrines.filter((s) => s.imageUrl).slice(0, 5),
    [place.shrines],
  );

  useDocumentTitle(`${displayName} — ${t('siteTitle')}`);

  return (
    <>
      {/* `entity-type-kicker` and `coverage-intro` rather than new class names:
          the first draft used `entity-kicker` and `entity-lede`, neither of
          which exists in any stylesheet, so the page would have rendered
          unstyled while looking correct in the JSX. */}
      <p className="entity-type-kicker">{t('placeKicker')}</p>
      <h1 ref={headingRef} className="entity-title">
        {displayName}
      </h1>
      <p className="coverage-intro">{t('placeIntro')}</p>

      {photos.length >= 2 && (
        <div className="place-photo-strip">
          {photos.map((shrine) => {
            const name = localizeShrineName(shrine, lang);
            return (
              <Link
                key={shrine.slug}
                to={`/shrine/${shrine.slug}`}
                className="place-photo hover-lift"
                /* Named on the link, not left to the image: ShrineImage falls
                   back to an aria-hidden glyph when a photo 404s, and a link
                   whose only child is hidden has no accessible name at all. */
                aria-label={name}
              >
                <ShrineImage
                  src={shrine.imageUrl}
                  alt=""
                  category={shrine.category}
                  className="place-photo-img"
                  placeholderClassName="place-photo-placeholder"
                  loading="lazy"
                  width={IMAGE_WIDTH.preview}
                />
                <span className="place-photo-caption">
                  <bdi>{name}</bdi>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="entity-meta">
        <span className="entity-meta-item">
          {fmtNum(tFn(lang, 'placeSiteCount', place.shrines.length))}
        </span>
        <span className="entity-meta-item">
          {place.yearSpan
            ? fmtNum(tFn(lang, 'placeSpan', place.yearSpan.earliest, place.yearSpan.latest))
            : t('placeSpanNone')}
        </span>
      </div>

      {place.traditions.length > 0 && (
        <section className="kg-section">
          <h2 className="kg-section-heading">{t('placeTraditionsHeading')}</h2>
          <ul className="place-tradition-list">
            {place.traditions.map(({ key, count }) => (
              <li key={key} className={`place-tradition place-tradition--${key}`}>
                <span className="place-tradition-name">{CATEGORY_LABELS[key][lang]}</span>
                <span className="place-tradition-count">{fmtNum(count)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="kg-section">
        <h2 className="kg-section-heading">{t('placeSitesHeading')}</h2>
        <ul className="place-site-list inset-list">
          {place.shrines.map((shrine, i) => (
            <li
              key={shrine.slug}
              className="inset-row inset-row--link reveal-rise"
              style={{ '--stagger-index': i } as React.CSSProperties}
            >
              <Link to={`/shrine/${shrine.slug}`}>
                <span className="inset-row-label inset-row-label--stacked">
                  <span className="inset-row-title">
                    <bdi>{localizeShrineName(shrine, lang)}</bdi>
                  </span>
                  {/* The Location column, as recorded. Often an English survey
                      qualification rather than a place name, hence data-latin. */}
                  <span className="inset-row-sub" data-latin>
                    <bdi>{shrine.location}</bdi>
                  </span>
                </span>
                <span className="inset-row-chevron" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function PlacePage() {
  const { slug } = useParams<{ slug: string }>();
  const { shrines, loading } = useShrineData();
  const { lang, t } = useLang();
  const isRtl = isRtlLang(lang);

  const place = useMemo(() => {
    const { places } = buildPlaces(shrines);
    return places.find((p) => p.slug === slug) ?? null;
  }, [shrines, slug]);

  return (
    <div className="page-enter entity-page-wrapper">
      {/* The place's own name once it has scrolled away, resolved here as well as
          in the article below — the header is in the outer component and the
          article is in the inner one. */}
      <EntityPageHeader {...(place ? { title: localizeRecordedName(place.name, lang) } : {})} />

      <article
        className="entity-page place-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <Link to="/">{t('title')}</Link>
          <span aria-hidden="true"> › </span>
          <span>{t('placesTitle')}</span>
        </nav>

        {loading && shrines.length === 0 ? (
          <p className="coverage-loading">{t('loading')}</p>
        ) : place ? (
          <PlaceContent place={place} lang={lang} />
        ) : (
          <>
            <h1 className="entity-title">{t('placesTitle')}</h1>
            <p className="coverage-intro">{t('placeNotFound')}</p>
          </>
        )}
        <SiteFooter />
      </article>

      <ScrollToTop />
    </div>
  );
}
