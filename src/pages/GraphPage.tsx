import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { NetworkGraph } from '../components/kg/NetworkGraph';
import type { GraphNode } from '../components/kg/NetworkGraph';
import { getKGStore, getSaintsInOrder, getAllLineageEdges } from '../lib/kg';
import { translateToUrdu } from '../lib/i18n/urduFallback';

/**
 * A standalone knowledge-graph explorer: browse every Sufi order, see its
 * saints as a network (reusing the same NetworkGraph used on SaintPage),
 * and jump to any saint's own lineage view. PROJECT_VISION.md Track 2 asks
 * for this as a dedicated page rather than only the per-saint embed.
 */
export default function GraphPage() {
  const { lang, t } = useLang();
  const isRtl = lang === 'ur';
  const headingRef = useFocusHeadingOnMount();
  const kg = useMemo(() => getKGStore(), []);
  const [activeOrderSlug, setActiveOrderSlug] = useState<string | null>(kg.orders[0]?.slug ?? null);

  useDocumentTitle(`${t('graphExplorerTitle')} — ${t('siteTitle')}`);

  const activeOrder = kg.orders.find((o) => o.slug === activeOrderSlug) ?? null;
  const orderSaints = useMemo(
    () => (activeOrder ? getSaintsInOrder(activeOrder.slug) : []),
    [activeOrder],
  );

  const centerNode: GraphNode | null = activeOrder
    ? {
        id: activeOrder.id,
        label: activeOrder.name,
        type: 'order',
        href: `/order/${activeOrder.slug}`,
      }
    : null;
  const connectedNodes: GraphNode[] = orderSaints.map((s) => ({
    id: s.id,
    label: s.name,
    type: 'saint',
    href: `/saint/${s.slug}`,
  }));

  const lineageEdges = useMemo(() => getAllLineageEdges(), []);

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
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
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li aria-current="page">{t('graphExplorerTitle')}</li>
          </ol>
        </nav>

        <h1 ref={headingRef} className="entity-title">
          {t('graphExplorerTitle')}
        </h1>
        <p className="graph-page-intro">{t('graphExplorerIntro')}</p>

        <div
          className="filter-chips graph-order-chips"
          role="group"
          aria-label={t('graphExplorerOrders')}
        >
          {kg.orders.map((order) => (
            <button
              key={order.slug}
              className={`filter-chip${activeOrderSlug === order.slug ? ' active' : ''}`}
              onClick={() => setActiveOrderSlug(order.slug)}
              aria-pressed={activeOrderSlug === order.slug}
            >
              {isRtl ? translateToUrdu(order.name) : order.name}
            </button>
          ))}
        </div>

        {centerNode && (
          <section className="graph-page-section">
            {activeOrder?.description && (
              <p lang={isRtl ? 'ur' : undefined}>
                {isRtl ? translateToUrdu(activeOrder.description) : activeOrder.description}
              </p>
            )}
            <NetworkGraph center={centerNode} connected={connectedNodes} />
          </section>
        )}

        {lineageEdges.length > 0 && (
          <section className="graph-page-section">
            <h2>{t('graphLineageHeading')}</h2>
            <ul className="graph-lineage-list">
              {lineageEdges.map((edge) => (
                <li key={`${edge.subject.slug}-${edge.relation}-${edge.object.slug}`}>
                  <Link to={`/saint/${edge.subject.slug}`} lang={isRtl ? 'ur' : undefined}>
                    {edge.subject.name}
                  </Link>
                  <span className="graph-lineage-relation">
                    {t(edge.relation === 'successor_of' ? 'successorOfLabel' : 'discipleOfLabel')}
                  </span>
                  <Link to={`/saint/${edge.object.slug}`} lang={isRtl ? 'ur' : undefined}>
                    {edge.object.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="graph-page-section">
          <h2>{t('graphExplorerAllSaints')}</h2>
          <ul className="graph-saints-list">
            {kg.saints.map((saint) => (
              <li key={saint.slug}>
                <Link to={`/saint/${saint.slug}`} lang={isRtl ? 'ur' : undefined}>
                  {saint.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
