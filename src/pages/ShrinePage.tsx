import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { ShrineInfobox } from '../components/shrine/ShrineInfobox';
import { ShrineArticle } from '../components/shrine/ShrineArticle';
import { ContentsNav } from '../components/shrine/ContentsNav';
import { useArticleContent } from '../components/shrine/useArticleContent';
import { LocationMap } from '../components/shrine/LocationMap';
import { RelatedShrines } from '../components/shrine/RelatedShrines';
import { SourcesProvenance } from '../components/shrine/SourcesProvenance';
import { ReadingProgressBar } from '../components/shrine/ReadingProgressBar';
import { ShrineImage } from '../components/ui/ShrineImage';
import { getFieldValue } from '../lib/data/fieldAliasing';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { getSaintsForShrine } from '../lib/kg';
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
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const name = localizeShrineName(shrine, lang);

  const primaryKgSaint = useMemo(() => getSaintsForShrine(shrine.slug)[0], [shrine.slug]);

  const category = localizeField(shrine.raw, 'Category') || shrine.category;
  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const saint = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const founded =
    localizeField(shrine.raw, 'Founded/Opened') ||
    localizeField(shrine.raw, 'Founded') ||
    shrine.founded;

  // Move focus to the heading so screen readers announce the shrine name on navigation
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    document.title = `${name} — ${t('siteTitle')}`;
    const meta = document.querySelector('meta[name="description"]');
    const desc = getFieldValue(shrine.raw, 'Description');
    if (meta && desc) meta.setAttribute('content', desc.slice(0, 160));
  }, [name, shrine.raw, t]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  async function shareShrine() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); return; } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 2500);
    } catch { /* ignore */ }
  }

  return (
    <article className="shrine-page" id="main-content" lang={lang === 'ur' ? 'ur' : undefined}>
      {/* Breadcrumb */}
      <nav className="shrine-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">{t('mapBreadcrumb')}</Link></li>
          {category && <li>{category}</li>}
          <li className="shrine-breadcrumb-current" aria-current="page">{name}</li>
        </ol>
      </nav>

      {/* Category kicker */}
      {category && (
        <p className="shrine-category-kicker" aria-label={`Category: ${category}`}>
          {category}
        </p>
      )}

      {/* Title */}
      <h1 ref={headingRef} className="shrine-title">{name}</h1>

      {/* Summary meta */}
      <div className="shrine-summary-meta">
        {location && (
          <span className="shrine-summary-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </span>
        )}
        {founded && (
          <span className="shrine-summary-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {primaryKgSaint ? (
              <Link to={`/saint/${primaryKgSaint.slug}`} className="meta-entity-link">
                {saint}
              </Link>
            ) : saint}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="shrine-actions">
        <button className="action-btn" onClick={shareShrine}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {t('share')}
        </button>
      </div>

      {/* Hero — always rendered (image or branded placeholder) */}
      <div className="shrine-hero">
        <ShrineImage
          src={shrine.imageUrl}
          alt={name}
          category={shrine.category}
          className="shrine-hero-img"
          placeholderClassName="shrine-hero-placeholder"
          loading="eager"
        />
      </div>

      {/* Share toast */}
      <div
        className={`share-toast${toastVisible ? ' share-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {t('copied')}
      </div>

      {/* Article layout: contents rail + prose + infobox */}
      <div className="shrine-article-layout">
        {navItems.length >= 2 && (
          <div className="contents-nav-rail">
            <ContentsNav items={navItems} />
          </div>
        )}
        <div className="shrine-article-main">
          <ShrineArticle shrine={shrine} />
          <LocationMap latLng={shrine.latLng} name={name} />
          <RelatedShrines shrine={shrine} all={allShrines} />
          <SourcesProvenance shrineSlug={shrine.slug} lang={lang} />
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      {error && !shrine && (
        <div className="shrine-page-error">
          {t('errorLoadingData')}
        </div>
      )}

      {shrine && <ShrineContent shrine={shrine} allShrines={shrines} />}

      <ScrollToTop />
    </div>
  );
}
