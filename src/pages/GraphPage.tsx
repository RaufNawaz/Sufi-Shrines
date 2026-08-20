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
import { getKGStore, getSaintsInOrder, getAllLineageEdges, getArchiveFigures } from '../lib/kg';
import {
  FIGURE_GROUP_ORDER,
  figureGroup,
  figureGroupLabel,
  isProseFigureType,
} from '../lib/data/figureType';
import type { FigureGroup } from '../lib/data/figureType';
import type { KGSaint } from '../types/kg';
import { localizeFigureName, localizeOrderName } from '../lib/i18n/localizeKgName';

/**
 * A standalone knowledge-graph explorer: browse every Sufi order, see its
 * saints as a network (reusing the same NetworkGraph used on SaintPage),
 * and jump to any saint's own lineage view. PROJECT_VISION.md Track 2 asks
 * for this as a dedicated page rather than only the per-saint embed.
 */
export default function GraphPage() {
  const { lang, t, fmtNum } = useLang();
  const isRtl = lang === 'ur';
  const headingRef = useFocusHeadingOnMount();
  const kg = useMemo(() => getKGStore(), []);
  const [activeOrderSlug, setActiveOrderSlug] = useState<string | null>(kg.orders[0]?.slug ?? null);

  useDocumentTitle(`${t('graphExplorerTitle')} — ${t('siteTitle')}`);

  const activeOrder = kg.orders.find((o) => o.slug === activeOrderSlug) ?? null;
  const orderDescription =
    activeOrder && (lang === 'ur' ? activeOrder.descriptionUr : activeOrder.description);
  const orderSaints = useMemo(
    () => (activeOrder ? getSaintsInOrder(activeOrder.slug) : []),
    [activeOrder],
  );

  const centerNode: GraphNode | null = activeOrder
    ? {
        id: activeOrder.id,
        label: localizeOrderName(activeOrder, lang),
        type: 'order',
        href: `/order/${activeOrder.slug}`,
      }
    : null;
  const connectedNodes: GraphNode[] = orderSaints.map((s) => ({
    id: s.id,
    label: localizeFigureName(s, lang),
    type: 'saint',
    href: `/saint/${s.slug}`,
  }));

  const lineageEdges = useMemo(() => getAllLineageEdges(), []);

  /* The graph types every principal figure as `saint` because that is its only
     entity type for a person — so this list previously ran 130 names under a
     heading reading "All saints", Durga and Guru Nanak among them. Group by the
     dataset's own figure_type instead, which it fills for 168 of 169 rows.
     Sorted within a group by locale so the Urdu view collates as Urdu. */
  const groupedFigures = useMemo(() => {
    const buckets = new Map<FigureGroup, KGSaint[]>();
    /* getArchiveFigures(), not kg.saints: the graph also holds ~60 figures who
       exist only as a link in someone else's lineage — teachers named in the
       prose with no shrine in this archive. Counting them here would overstate
       what the archive documents. */
    for (const saint of getArchiveFigures()) {
      const group = figureGroup(saint.figureType);
      const list = buckets.get(group);
      if (list) list.push(saint);
      else buckets.set(group, [saint]);
    }
    const collator = new Intl.Collator(lang === 'ur' ? 'ur' : 'en');
    return FIGURE_GROUP_ORDER.filter((g) => buckets.has(g)).map((group) => ({
      group,
      figures: [...buckets.get(group)!].sort((a, b) =>
        collator.compare(localizeFigureName(a, lang), localizeFigureName(b, lang)),
      ),
    }));
  }, [lang]);

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
              {localizeOrderName(order, lang)}
            </button>
          ))}
        </div>

        {centerNode && (
          <section className="graph-page-section">
            {/* `translateToUrdu` used to be applied to this whole sentence,
                which of course missed and returned the English — the dictionary
                is keyed on names, not prose. The Urdu comes from
                `descriptionUr` in data/kg-seeds.json, and an order without one
                shows no summary rather than an English one. */}
            {orderDescription && <p lang={isRtl ? 'ur' : undefined}>{orderDescription}</p>}
            <NetworkGraph center={centerNode} connected={connectedNodes} />
          </section>
        )}

        {lineageEdges.length > 0 && (
          <section className="graph-page-section">
            <h2>{t('graphLineageHeading')}</h2>
            <p className="graph-figures-note">
              {t('graphLineageNote')} {fmtNum(lineageEdges.length)}
              {' · '}
              {fmtNum(lineageEdges.filter((e) => !e.reviewed).length)} {t('lineageUnreviewed')}
            </p>
            <ul className="graph-lineage-list">
              {lineageEdges.map((edge) => (
                <li key={`${edge.subject.slug}-${edge.relation}-${edge.object.slug}`}>
                  <div className="graph-lineage-edge">
                    <Link to={`/saint/${edge.subject.slug}`} lang={isRtl ? 'ur' : undefined}>
                      {fmtNum(localizeFigureName(edge.subject, lang))}
                    </Link>
                    <span className="graph-lineage-relation">
                      {t(edge.relation === 'successor_of' ? 'successorOfLabel' : 'discipleOfLabel')}
                    </span>
                    <Link to={`/saint/${edge.object.slug}`} lang={isRtl ? 'ur' : undefined}>
                      {fmtNum(localizeFigureName(edge.object, lang))}
                    </Link>
                    {/* An edge nobody has read yet says so. The archive's claim is
                        honesty about provenance, so a lineage drawn from
                        machine-extracted prose must not look like a reviewed one. */}
                    {!edge.reviewed && (
                      <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
                        {t('lineageUnreviewed')}
                      </span>
                    )}
                  </div>
                  {edge.quote && (
                    /* The source's own words and the file they came from. Latin
                       on purpose in either language: this is the evidence for
                       an unreviewed edge, and an archive whose claim is
                       provenance must leave the reader an exact search string
                       (CLAUDE.md i18n rule 7). `lang`/`dir` so an English
                       sentence inside an RTL page keeps its punctuation, and
                       `data-latin` so the no-leak guard reads it as
                       deliberate rather than untranslated. */
                    <blockquote className="graph-lineage-quote" lang="en" dir="ltr" data-latin>
                      {edge.quote}
                      {edge.source && <cite className="graph-lineage-cite">{edge.source}</cite>}
                    </blockquote>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="graph-page-section">
          <h2>{t('graphExplorerAllFigures')}</h2>
          <p className="graph-figures-note">{t('graphExplorerFiguresNote')}</p>
          {groupedFigures.map(({ group, figures }) => (
            <div key={group} className="graph-figure-group">
              <h3 className="graph-figure-group-heading">
                {figureGroupLabel(group, lang)}
                <span className="graph-figure-group-count">{fmtNum(figures.length)}</span>
              </h3>
              <ul className="graph-saints-list">
                {figures.map((saint, i) => (
                  <li
                    key={saint.slug}
                    className="reveal-rise"
                    style={{ '--stagger-index': i } as React.CSSProperties}
                  >
                    <Link to={`/saint/${saint.slug}`} lang={isRtl ? 'ur' : undefined}>
                      {fmtNum(localizeFigureName(saint, lang))}
                    </Link>
                    {/* A figure_type that is a sentence rather than a category is
                        content, not a defect (RULE 2) — show it as recorded
                        instead of filing it under a label it may contradict. */}
                    {isProseFigureType(saint.figureType) && (
                      <span className="graph-figure-as-recorded">{saint.figureType}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
