import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { LineageView } from '../components/kg/LineageView';
import { getOrderBySlug, getSaintsInOrder, slugToLabel } from '../lib/kg';
import { translateToUrdu } from '../lib/i18n/urduFallback';

export default function OrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, fmtNum } = useLang();
  const headingRef = useFocusHeadingOnMount();

  const order = useMemo(() => (slug ? getOrderBySlug(slug) : undefined), [slug]);
  const members = useMemo(() => (slug ? getSaintsInOrder(slug) : []), [slug]);

  useDocumentTitle(order ? `${order.name} — ${t('siteTitle')}` : null);

  if (!order) return <Navigate to="/" replace />;

  const isRtl = lang === 'ur';
  const founded = isRtl && order.founded ? translateToUrdu(order.founded) : order.founded;

  return (
    <div className="page-enter entity-page-wrapper">
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

      <article
        className="entity-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        {/* Breadcrumb */}
        <nav className="shrine-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li className="shrine-breadcrumb-current" aria-current="page">
              {order.name}
            </li>
          </ol>
        </nav>

        <p className="entity-type-kicker">{t('sufiOrder')}</p>

        <h1 ref={headingRef} className="entity-title">
          {order.name}
          {order.arabicName && (
            <span
              lang="ar"
              style={{ marginInlineStart: 'var(--space-3)', fontSize: '0.7em', opacity: 0.75 }}
            >
              {order.arabicName}
            </span>
          )}
        </h1>

        <div className="entity-meta">
          {founded && (
            <span className="entity-meta-item">
              {t('founded')}: {fmtNum(founded)}
            </span>
          )}
          {members.length > 0 && (
            <span className="entity-meta-item">
              {fmtNum(members.length)}{' '}
              {isRtl ? t('saintLabel') : `saint${members.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>

        <div className="entity-article-layout">
          {/* Main content */}
          <div>
            {/* Description */}
            {order.description && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('description')}</h2>
                <p>{order.description}</p>
              </section>
            )}

            {/* Members */}
            {members.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('orderMembers')}</h2>
                <ul className="entity-saint-list">
                  {members.map((saint) => (
                    <li key={saint.slug} className="entity-saint-item">
                      <div className="entity-saint-item-name">
                        <Link to={`/saint/${saint.slug}`}>
                          {isRtl && saint.nameUr ? saint.nameUr : saint.name}
                        </Link>
                        {saint.altNames?.[0] && (
                          <span
                            style={{
                              fontWeight: 400,
                              color: 'var(--color-text-muted)',
                              fontSize: 'var(--text-sm)',
                              marginInlineStart: 'var(--space-2)',
                            }}
                          >
                            {saint.altNames[0]}
                          </span>
                        )}
                      </div>
                      {saint.shrines.length > 0 && (
                        <div className="entity-saint-item-shrines">
                          {saint.shrines.map((shrineSlug) => (
                            <Link
                              key={shrineSlug}
                              to={`/shrine/${shrineSlug}`}
                              className="entity-saint-shrine-tag"
                            >
                              {slugToLabel(shrineSlug)}
                            </Link>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Spiritual lineage */}
            <section className="kg-section">
              <h2 className="kg-section-heading">{t('spiritualLineage')}</h2>
              <LineageView order={order} members={members} />
            </section>
          </div>

          {/* Infobox sidebar */}
          <aside className="entity-infobox">
            <div className="entity-infobox-title">{order.name}</div>
            <div className="entity-infobox-body">
              {order.arabicName && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('arabicName')}</span>
                  <span className="entity-infobox-value" lang="ar">
                    {order.arabicName}
                  </span>
                </div>
              )}
              {founded && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('founded')}</span>
                  <span className="entity-infobox-value">{fmtNum(founded)}</span>
                </div>
              )}
              {members.length > 0 && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('saintLabel')}</span>
                  <span className="entity-infobox-value">{fmtNum(members.length)}</span>
                </div>
              )}
              {order.wikidataQid && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">Wikidata</span>
                  <span className="entity-infobox-value">
                    <a
                      href={`https://www.wikidata.org/entity/${order.wikidataQid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="meta-entity-link"
                    >
                      {order.wikidataQid}
                    </a>
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="site-footer">
          <Link to="/">{t('backToMap')}</Link>
          {' · '}
          <span>{t('footerCredit')}</span>
        </footer>
      </article>

      <ScrollToTop />
    </div>
  );
}
