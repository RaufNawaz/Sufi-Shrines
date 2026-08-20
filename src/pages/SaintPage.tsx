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
} from '../lib/kg';
import { translateToUrdu } from '../lib/i18n/urduFallback';
import {
  localizeAltName,
  localizeFigureName,
  localizeOrderName,
  localizeShrineSlug,
} from '../lib/i18n/localizeKgName';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { figureGroup, figureGroupLabelSingular, isProseFigureType } from '../lib/data/figureType';

export default function SaintPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, fmtNum } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const { shrines } = useShrineData();

  const saint = useMemo(() => (slug ? getSaintBySlug(slug) : undefined), [slug]);
  const figureBucket = useMemo(() => figureGroup(saint?.figureType), [saint?.figureType]);
  const order = useMemo(() => (slug ? getOrderForSaint(slug) : undefined), [slug]);
  const orderMembers = useMemo(() => (order ? getSaintsInOrder(order.slug) : []), [order]);
  const teachers = useMemo(() => (slug ? getTeachersOf(slug) : []), [slug]);
  const disciples = useMemo(() => (slug ? getDisciplesOf(slug) : []), [slug]);

  // Shrine names in the reader's language, from the live dataset. The slug
  // fallback is for a shrine the graph knows but the sheet has dropped.
  const shrineMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of shrines) m.set(s.slug, localizeShrineName(s, lang));
    return m;
  }, [shrines, lang]);

  const shrineLabel = (slug: string) => shrineMap.get(slug) ?? localizeShrineSlug(slug, lang);

  useDocumentTitle(saint ? `${localizeFigureName(saint, lang)} — ${t('siteTitle')}` : null);

  if (!saint) return <Navigate to="/" replace />;

  const networkCenter: GraphNode = {
    id: saint.slug,
    label: localizeFigureName(saint, lang),
    type: 'saint',
    href: `/saint/${saint.slug}`,
  };

  /*
   * The figure's whole recorded neighbourhood, not just half of it.
   *
   * This diagram used to plot the order and the shrines and stop there, while
   * the page below it listed teachers and disciples the graph knew about the
   * whole time — so the one picture of a figure's place in a silsila left out
   * the silsila. Teachers and disciples are the lineage; they belong on the
   * ring. Ordered teachers → order → disciples → shrines so the edges trace
   * outward in something like the order a reader would follow them.
   */
  /* One person is one node. `getTeachersOf` returns a link per *relation*, so a
     figure recorded as both `disciple_of` and `successor_of` the same master
     came back twice and the ring drew them at two positions with two labels.
     The relation list below keeps both — two recorded relations are two facts —
     but the diagram plots people, so it dedupes by slug. */
  const uniqueBySlug = (links: typeof teachers) => {
    const seen = new Set<string>();
    return links.filter((link) => {
      if (seen.has(link.saint.slug)) return false;
      seen.add(link.saint.slug);
      return true;
    });
  };

  const networkConnected: GraphNode[] = [
    ...uniqueBySlug(teachers).map((link) => ({
      id: `teacher:${link.saint.slug}`,
      label: localizeFigureName(link.saint, lang),
      type: 'teacher' as const,
      href: `/saint/${link.saint.slug}`,
    })),
    ...(order
      ? [
          {
            id: order.slug,
            label: localizeOrderName(order, lang),
            type: 'order' as const,
            href: `/order/${order.slug}`,
          },
        ]
      : []),
    ...uniqueBySlug(disciples).map((link) => ({
      id: `disciple:${link.saint.slug}`,
      label: localizeFigureName(link.saint, lang),
      type: 'disciple' as const,
      href: `/saint/${link.saint.slug}`,
    })),
    ...saint.shrines.map((s) => ({
      id: s,
      label: shrineLabel(s),
      type: 'shrine' as const,
      href: `/shrine/${s}`,
    })),
  ];

  /* Only the kinds actually on the ring — a legend row for something absent
     is noise, and with one kind the colours need no explaining. */
  const networkLegend = [
    ...(teachers.length > 0 ? [{ type: 'teacher' as const, label: t('teachersHeading') }] : []),
    ...(order ? [{ type: 'order' as const, label: t('sufiOrder') }] : []),
    ...(disciples.length > 0 ? [{ type: 'disciple' as const, label: t('disciplesHeading') }] : []),
    ...(saint.shrines.length > 0
      ? [{ type: 'shrine' as const, label: t('shrinesAssociated') }]
      : []),
  ];

  // fmtNum because a recorded name can carry a lifespan in parentheses —
  // Eastern numerals reach every number site, names included (i18n rule 5).
  const displayName = fmtNum(localizeFigureName(saint, lang));
  const isRtl = lang === 'ur';
  const born = isRtl && saint.born ? translateToUrdu(saint.born) : saint.born;
  const died = isRtl && saint.died ? translateToUrdu(saint.died) : saint.died;
  const era = isRtl && saint.era ? translateToUrdu(saint.era) : saint.era;
  const orderDescription = order && (isRtl ? order.descriptionUr : order.description);

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

        {/* The kicker read "Saint" for every figure in the archive, including
            its Hindu deities and Sikh Gurus. It now names what the record says
            this figure is; where the record answers with a sentence rather than
            a category, that sentence is shown under the title instead of being
            filed under a label it may contradict (RULE 2). */}
        <p className="entity-type-kicker">{figureGroupLabelSingular(figureBucket, lang)}</p>

        <h1 ref={headingRef} className="entity-title">
          {displayName}
        </h1>

        {isProseFigureType(saint.figureType) && (
          <p className="entity-figure-as-recorded">{saint.figureType}</p>
        )}

        {/* Honorifics, verbatim from the sources. These carry a lot of what a
            figure means to the people who visit — "Data Ganj Bakhsh", "Sultan
            al-Aulia", "Khatib-ul-Islam" — and the graph held none of them until
            they were extracted. */}
        {saint.titles && saint.titles.length > 0 && (
          <ul className="entity-titles" aria-label={t('titlesLabel')}>
            {saint.titles.map((title) => (
              <li key={title} className="entity-title-chip">
                {title}
              </li>
            ))}
          </ul>
        )}

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
                {localizeOrderName(order, lang)}
              </Link>
            </span>
          )}
        </div>

        {/* Dates the sources will not agree on, shown as a disagreement rather
            than resolved into one number. This is the archive's editorial
            standard applied to the graph: a reported contradiction is better
            content than a clean value that hides one. */}
        {saint.disputedDates && saint.disputedDates.length > 0 && (
          <section className="entity-disputed" aria-label={t('disputedDatesLabel')}>
            <h2 className="entity-disputed-heading">{t('disputedDatesLabel')}</h2>
            {saint.disputedDates.map((d) => (
              <div key={`${d.field}-${d.values.join('|')}`} className="entity-disputed-row">
                <span className="entity-disputed-field">{d.field}</span>
                <span className="entity-disputed-values">
                  {d.values.map((v, i) => (
                    <React.Fragment key={v}>
                      {i > 0 && <span className="entity-disputed-vs">{t('disputedVersus')}</span>}
                      <span className="entity-disputed-value">{fmtNum(v)}</span>
                    </React.Fragment>
                  ))}
                </span>
                {d.spreadYears != null && d.spreadYears > 0 && (
                  <span className="entity-disputed-spread">
                    {fmtNum(d.spreadYears)} {t('yearsApart')}
                  </span>
                )}
              </div>
            ))}
          </section>
        )}

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
                    {localizeOrderName(order, lang)}
                    {/* In Urdu the badge already carries the Arabic-script
                        name, so appending it would repeat the same word. */}
                    {order.arabicName && !isRtl && (
                      <>
                        {' '}
                        · <span lang="ar">{order.arabicName}</span>
                      </>
                    )}
                  </Link>
                </p>
                {orderDescription && <p className="entity-order-description">{orderDescription}</p>}
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
                        {shrineLabel(shrineSlug)}
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
                <NetworkGraph
                  center={networkCenter}
                  connected={networkConnected}
                  legend={networkLegend}
                />
              </section>
            )}
          </div>

          {/* Infobox sidebar */}
          <aside className="entity-infobox">
            <div className="entity-infobox-title">{displayName}</div>
            <div className="entity-infobox-body">
              {saint.altNames?.[0] && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('alsoKnownAs')}</span>
                  <span className="entity-infobox-value">
                    <bdi>{localizeAltName(saint.altNames[0], lang)}</bdi>
                  </span>
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
                      {localizeOrderName(order, lang)}
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
