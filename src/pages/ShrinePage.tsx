import React, { useEffect, useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useShareLink } from '../hooks/useShareLink';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { ShrineInfobox } from '../components/shrine/ShrineInfobox';
import { ShrineArticle } from '../components/shrine/ShrineArticle';
import { ShrineMasthead } from '../components/shrine/ShrineMasthead';
import { ContentsNav } from '../components/shrine/ContentsNav';
import { useArticleContent } from '../components/shrine/useArticleContent';
import { LocationMap } from '../components/shrine/LocationMap';
import { RelatedShrines } from '../components/shrine/RelatedShrines';
import { NearbyShrines } from '../components/shrine/NearbyShrines';
import { SharedGround } from '../components/shrine/SharedGround';
import { SourcesProvenance } from '../components/shrine/SourcesProvenance';
import { ReadingProgressBar } from '../components/shrine/ReadingProgressBar';
import { ShrineImage } from '../components/ui/ShrineImage';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { getFieldValue } from '../lib/data/fieldAliasing';
import { categoryDisplayLabel } from '../lib/data/categoryKey';
import { infoLevelKey } from '../lib/data/infoLevel';
import { siteStatusKey, SITE_STATUS_LABEL_KEYS } from '../lib/data/siteStatus';
import { CONTACT_EMAIL, correctionIssueUrl } from '../lib/data/constants';
import { InfoLevelBadge } from '../components/ui/InfoLevelBadge';
import { SupportLevelBadge } from '../components/ui/SupportLevelBadge';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { resolveFoundedDate } from '../lib/i18n/urduFallback';
import { primaryFigureSlug } from '../lib/kgShrineFigures';
import { hasProjectAccess } from '../lib/projectAccess';
import type { Shrine } from '../types/shrine';

function SkeletonPage() {
  return (
    <div className="shrine-loading">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text skeleton-text--90" />
      <div className="skeleton skeleton-text skeleton-text--80" />
      <div className="skeleton skeleton-text" />
    </div>
  );
}

function ShrineContent({ shrine, allShrines }: { shrine: Shrine; allShrines: Shrine[] }) {
  const { lang, t, localizeField, fmtNum } = useLang();
  const { navItems } = useArticleContent(shrine);
  const { share, copied } = useShareLink();
  // Move focus to the heading so screen readers announce the shrine name on navigation
  const headingRef = useFocusHeadingOnMount();

  const name = localizeShrineName(shrine, lang);

  const primaryFigure = primaryFigureSlug(shrine.slug);

  const category =
    categoryDisplayLabel(shrine.category, lang) ??
    (localizeField(shrine.raw, 'Category') || shrine.category);
  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const saint = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const founded = resolveFoundedDate(shrine.raw, lang);

  const statusKey = siteStatusKey(shrine.status);
  const statusLabel =
    statusKey && statusKey !== 'active' ? t(SITE_STATUS_LABEL_KEYS[statusKey]) : '';
  const isLowInfo = infoLevelKey(shrine.infoLevel) === 'low';

  useDocumentTitle(`${name} — ${t('siteTitle')}`);

  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const desc = getFieldValue(shrine.raw, 'Description');
    if (meta && desc) meta.setAttribute('content', desc.slice(0, 160));
  }, [shrine.raw]);

  return (
    <article className="shrine-page" id="main-content" lang={lang === 'ur' ? 'ur' : undefined}>
      {/* Breadcrumb */}
      <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
        <ol>
          <li>
            <Link to="/">{t('mapBreadcrumb')}</Link>
          </li>
          {category && <li>{category}</li>}
          <li className="shrine-breadcrumb-current" aria-current="page">
            {name}
          </li>
        </ol>
      </nav>

      {/* Category kicker */}
      {category && (
        <p className="shrine-category-kicker" aria-label={tFn(lang, 'ariaCategoryOf', category)}>
          {category}
        </p>
      )}

      {/* Title — the Nastaliq name rides above the Latin one in the English
          view and *is* the heading in the Urdu view. See ShrineMasthead. */}
      <ShrineMasthead shrine={shrine} lang={lang} latinName={name} headingRef={headingRef} />

      {/* Summary meta */}
      <div className="shrine-summary-meta">
        {location && (
          <span className="shrine-summary-meta-item">
            <svg
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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </span>
        )}
        {founded && (
          <span className="shrine-summary-meta-item">
            <svg
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {fmtNum(founded)}
          </span>
        )}
        {saint && (
          <span className="shrine-summary-meta-item">
            <svg
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {primaryFigure ? (
              <Link to={`/saint/${primaryFigure}`} className="meta-entity-link">
                {saint}
              </Link>
            ) : (
              saint
            )}
          </span>
        )}
        <InfoLevelBadge level={shrine.infoLevel} className="shrine-summary-badge" />
        <SupportLevelBadge level={shrine.supportLevel} className="shrine-summary-badge" />
      </div>

      {/* Non-Active site status — plain wording so a visitor doesn't travel
          expecting a functioning site. statusNote (e.g. "reconstructed 2022")
          is shown regardless of status, including for Active sites. */}
      {(statusLabel || shrine.statusNote) && (
        <p className="shrine-status-note">
          {statusLabel}
          {statusLabel && shrine.statusNote && ' — '}
          {shrine.statusNote && <bdi>{shrine.statusNote}</bdi>}
        </p>
      )}

      {/* Actions */}
      <div className="shrine-actions">
        <button className="action-btn" onClick={() => share(window.location.href, name)}>
          <svg
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
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {t('share')}
        </button>
      </div>

      {/* Share toast */}
      <div
        className={`share-toast${copied ? ' share-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {t('copied')}
      </div>

      {/* Article layout: hero + contents rail + prose + infobox.
          The hero lives inside the grid so the contents nav and infobox are
          visible beside the photo as soon as the page opens. */}
      <div className="shrine-article-layout">
        {/* Hero — always rendered (image or branded placeholder) */}
        <div className="shrine-hero">
          <ShrineImage
            src={shrine.imageUrl}
            alt={name}
            category={shrine.category}
            className="shrine-hero-img"
            placeholderClassName="shrine-hero-placeholder"
            loading="eager"
            width={IMAGE_WIDTH.hero}
          />
          {shrine.imageUrl && shrine.imageCredit && (
            <p className="shrine-hero-credit">
              {t('photoCredit')}: <bdi>{shrine.imageCredit}</bdi>
            </p>
          )}
        </div>
        {navItems.length >= 2 && (
          <div className="contents-nav-rail">
            <ContentsNav items={navItems} />
          </div>
        )}
        <div className="shrine-article-main">
          <ShrineArticle shrine={shrine} />
          <LocationMap latLng={shrine.latLng} name={name} />
          {/* Directly under the map, because it is a fact about this ground:
              which other sites — and which other traditions — stand within
              walking distance. Renders nothing when there are none. */}
          <SharedGround shrine={shrine} all={allShrines} />
          <RelatedShrines shrine={shrine} all={allShrines} />
          <NearbyShrines shrine={shrine} all={allShrines} />
          {/* Provenance/sources detail is project-team-only visibility (not
              security — see src/lib/projectAccess.ts for why). */}
          {hasProjectAccess() && <SourcesProvenance shrineSlug={shrine.slug} lang={lang} />}
          {/* Quiet contribution prompt — only on pages we know little about */}
          {isLowInfo && (
            <aside className="contribute-note">
              <p>{t('contributePrompt')}</p>
              <a
                className="contribute-note-link"
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Information about ${shrine.name}`)}`}
              >
                {t('contributeAction')}
              </a>
            </aside>
          )}
        </div>
        <aside>
          <ShrineInfobox shrine={shrine} />
        </aside>
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <Link to="/">{t('backToMap')}</Link>
        {' · '}
        <span>{t('footerCredit')}</span>
        {' · '}
        {/* Licence and citation must be reachable from any page — a public
            archive that states neither is not publishable. */}
        <Link to="/about">{t('aboutTitle')}</Link>
        {' · '}
        <a href={correctionIssueUrl(shrine.slug)} target="_blank" rel="noopener noreferrer">
          {t('reportCorrection')}
        </a>
      </footer>
    </article>
  );
}

export default function ShrinePage() {
  const { slug } = useParams<{ slug: string }>();
  const { shrines, loading, error } = useShrineData();
  const { t } = useLang();

  const shrine = useMemo(() => {
    if (!slug || !shrines.length) return null;
    // Handle legacy id-N slugs
    const idMatch = slug.match(/^id-(\d+)$/);
    if (idMatch) {
      const id = parseInt(idMatch[1], 10);
      return shrines.find((s) => s.id === id) ?? null;
    }
    // Match by slug
    return shrines.find((s) => s.slug === slug) ?? null;
  }, [slug, shrines]);

  if (!loading && !shrine && shrines.length > 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-enter shrine-page-wrapper">
      <ReadingProgressBar />
      {/* Sticky header */}
      <header className="shrine-page-header no-print">
        <Link to="/" className="back-link" aria-label={t('backToMap')}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('backToMap')}
        </Link>
        <div className="shrine-page-header-actions">
          <DarkModeToggle />
          <LanguageToggle />
        </div>
      </header>

      {loading && !shrine && <SkeletonPage />}

      {error && !shrine && <div className="shrine-page-error">{t('errorLoadingData')}</div>}

      {shrine && <ShrineContent shrine={shrine} allShrines={shrines} />}

      <ScrollToTop />
    </div>
  );
}
