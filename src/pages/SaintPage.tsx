import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useShrineData } from '../hooks/useShrineData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { LineageView } from '../components/kg/LineageView';
import { NetworkGraph } from '../components/kg/NetworkGraph';
import type { GraphNode } from '../components/kg/NetworkGraph';
import {
  getSaintBySlug,
  getOrderForSaint,
  getSaintsInOrder,
  getTeachersOf,
  getDisciplesOf,
  slugToLabel,
} from '../lib/kg';
import { translateToUrdu } from '../lib/i18n/urduFallback';

export default function SaintPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, fmtNum } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const { shrines } = useShrineData();

  const saint = useMemo(() => (slug ? getSaintBySlug(slug) : undefined), [slug]);
  const order = useMemo(() => (slug ? getOrderForSaint(slug) : undefined), [slug]);
  const orderMembers = useMemo(() => (order ? getSaintsInOrder(order.slug) : []), [order]);
  const teachers = useMemo(() => (slug ? getTeachersOf(slug) : []), [slug]);
  const disciples = useMemo(() => (slug ? getDisciplesOf(slug) : []), [slug]);

  const shrineMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of shrines) m.set(s.slug, s.name);
    return m;
  }, [shrines]);

  useDocumentTitle(saint ? `${saint.name} — ${t('siteTitle')}` : null);

  if (!saint) return <Navigate to="/" replace />;

  const networkCenter: GraphNode = {
    id: saint.slug,
    label: saint.name,
    type: 'saint',
    href: `/saint/${saint.slug}`,
  };

  const networkConnected: GraphNode[] = [
    ...(order
      ? [
          {
            id: order.slug,
            label: order.name,
            type: 'order' as const,
            href: `/order/${order.slug}`,
          },
        ]
      : []),
    ...saint.shrines.map((s) => ({
      id: s,
      label: shrineMap.get(s) ?? slugToLabel(s),
      type: 'shrine' as const,
      href: `/shrine/${s}`,
    })),
  ];

  const displayName = lang === 'ur' && saint.nameUr ? saint.nameUr : saint.name;
  const isRtl = lang === 'ur';
  const born = isRtl && saint.born ? translateToUrdu(saint.born) : saint.born;
  const died = isRtl && saint.died ? translateToUrdu(saint.died) : saint.died;
  const era = isRtl && saint.era ? translateToUrdu(saint.era) : saint.era;

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
              {displayName}
            </li>
          </ol>
        </nav>

        <p className="entity-type-kicker" aria-label={t('sufiOrder')}>
          {t('saintLabel')}
        </p>

        <h1 ref={headingRef} className="entity-title">
          {displayName}
        </h1>

        {/* Meta row */}
        <div className="entity-meta">
          {born && (
            <span className="entity-meta-item">
              <span aria-label={t('born')}>{t('born')}:</span> {fmtNum(born)}
            </span>
          )}
          {died && (
            <span className="entity-meta-item">
              <span aria-label={t('died')}>{t('died')}:</span> {fmtNum(died)}
            </span>
          )}
          {era && (
            <span className="entity-meta-item">
              <span aria-label={t('era')}>{t('era')}:</span> {fmtNum(era)}
            </span>
          )}
          {order && (
            <span className="entity-meta-item">
              <Link to={`/order/${order.slug}`} className="order-badge">
                {order.name}
              </Link>
            </span>
          )}
        </div>

        <div className="entity-article-layout">
          {/* Main content */}
          <div>
            {/* Alt names */}
            {saint.altNames && saint.altNames.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('alsoKnownAs')}</h2>
                <p>{saint.altNames.join(' · ')}</p>
              </section>
            )}

            {/* Description */}
            {saint.description && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('description')}</h2>
                <p>{saint.description}</p>
              </section>
            )}

            {/* Sufi order */}
            {order && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('sufiOrder')}</h2>
                <p>
                  <Link to={`/order/${order.slug}`} className="order-badge">
                    {order.name}
                    {order.arabicName && (
                      <>
                        {' '}
                        · <span lang="ar">{order.arabicName}</span>
                      </>
                    )}
                  </Link>
                </p>
                {order.description && (
                  <p style={{ marginTop: 'var(--space-3)' }}>{order.description}</p>
                )}
              </section>
            )}

            {/* Associated shrines */}
            {saint.shrines.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('shrinesAssociated')}</h2>
                <ul className="entity-shrine-list">
                  {saint.shrines.map((shrineSlug) => (
                    <li key={shrineSlug} className="entity-shrine-list-item">
                      <Link to={`/shrine/${shrineSlug}`}>
                        <svg
                          width="13"
                          height="13"
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
                        {shrineMap.get(shrineSlug) ?? slugToLabel(shrineSlug)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Spiritual lineage */}
            {(order || teachers.length > 0 || disciples.length > 0) && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('spiritualLineage')}</h2>
                <LineageView
                  order={order}
                  members={orderMembers}
                  currentSlug={saint.slug}
                  teachers={teachers}
                  disciples={disciples}
                />
              </section>
            )}

            {/* Network graph */}
            {networkConnected.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('networkConnections')}</h2>
                <NetworkGraph center={networkCenter} connected={networkConnected} />
              </section>
            )}
          </div>

          {/* Infobox sidebar */}
          <aside className="entity-infobox">
            <div className="entity-infobox-title">{saint.name}</div>
            <div className="entity-infobox-body">
              {saint.altNames?.[0] && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('alsoKnownAs')}</span>
                  <span className="entity-infobox-value">{saint.altNames[0]}</span>
                </div>
              )}
              {born && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('born')}</span>
                  <span className="entity-infobox-value">{fmtNum(born)}</span>
                </div>
              )}
              {died && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('died')}</span>
                  <span className="entity-infobox-value">{fmtNum(died)}</span>
                </div>
              )}
              {era && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('era')}</span>
                  <span className="entity-infobox-value">{fmtNum(era)}</span>
                </div>
              )}
              {order && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('sufiOrder')}</span>
                  <span className="entity-infobox-value">
                    <Link to={`/order/${order.slug}`} className="meta-entity-link">
                      {order.name}
                    </Link>
                  </span>
                </div>
              )}
              {saint.shrines.length > 0 && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('shrinesAssociated')}</span>
                  <span className="entity-infobox-value">{saint.shrines.length}</span>
                </div>
              )}
              {saint.wikidataQid && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">Wikidata</span>
                  <span className="entity-infobox-value">
                    <a
                      href={`https://www.wikidata.org/entity/${saint.wikidataQid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="meta-entity-link"
                    >
                      {saint.wikidataQid}
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
