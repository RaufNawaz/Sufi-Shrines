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
import {
  getOrderBySlug,
  getOrderMemberships,
  getSaintsInOrder,
  type OrderMembership,
} from '../lib/kg';
import { translateToUrdu } from '../lib/i18n/urduFallback';
import { tFn } from '../lib/i18n/uiStrings';
import {
  localizeAltName,
  localizeFigureName,
  localizeOrderName,
  localizeShrineSlug,
} from '../lib/i18n/localizeKgName';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import type { KGSaint } from '../types/kg';

interface Member {
  saint: KGSaint;
  /** This figure's membership record for the order being displayed. */
  membership: OrderMembership | undefined;
  /** The *other* orders the same figure belongs to. */
  alsoIn: OrderMembership[];
}

/**
 * Why members are listed flat rather than grouped by branch.
 *
 * The obvious move, once order relations carried a `branch`, was to group a
 * silsila's members under their branch headings. The data says no: 13 of 64
 * memberships name a branch at all, and on the Qadiriyya page that is four
 * branches of exactly one member each beside nineteen with none — headings
 * that fragment the page without telling the reader anything. Grouping is the
 * mistake of HANDOVER §9.26 in reverse: a layout tuned to data the archive
 * does not have. The branch rides on the member's own row instead, where it
 * degrades to nothing when absent.
 *
 * `asRecorded` is deliberately *not* shown here. It is the row's `silsila`
 * cell, not a per-edge string, so a figure whose column reads "Suhrawardi" but
 * whose prose also places them in the Qadiriyya carries `asRecorded:
 * "Suhrawardi"` on *both* edges. Printing that under the Qadiriyya heading
 * would attribute the source's words to the wrong order. It belongs on the
 * figure's own page, which is where it is.
 *
 * What is worth surfacing is the opposite fact: figures who belong to several
 * silsilas at once. Twenty of the sixty-four memberships are second or third
 * affiliations, each with its own quoted source, and they are the most
 * interesting thing the order graph now knows.
 */
function sortMembers(members: Member[], lang: 'en' | 'ur'): Member[] {
  const collator = new Intl.Collator(lang === 'ur' ? 'ur' : 'en', { sensitivity: 'base' });
  return [...members].sort((a, b) =>
    collator.compare(localizeFigureName(a.saint, lang), localizeFigureName(b.saint, lang)),
  );
}

export default function OrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, fmtNum } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const { shrines } = useShrineData();

  /*
   * Real shrine names, from the live dataset.
   *
   * The tags under each member used to be `slugToLabel(slug)`, which
   * title-cases a slug and so printed "Shrine Of Shah Rukn E Alam" — and, in
   * Urdu, printed it in Latin, because the dictionary is keyed on the actual
   * name ("Shrine of Shah Rukn-e-Alam") and a de-hyphenated slug never
   * matches. The dataset has the name in both languages; the slug label stays
   * only as the fallback for a shrine the graph knows and the sheet has since
   * dropped.
   */
  const shrineNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const shrine of shrines) m.set(shrine.slug, localizeShrineName(shrine, lang));
    return m;
  }, [shrines, lang]);

  const order = useMemo(() => (slug ? getOrderBySlug(slug) : undefined), [slug]);
  const saints = useMemo(() => (slug ? getSaintsInOrder(slug) : []), [slug]);
  // Each member's membership record *for this order* — that is where the
  // branch, the verbatim silsila string and the reviewed flag live.
  const members = useMemo<Member[]>(() => {
    const rows = saints.map((saint) => {
      const all = getOrderMemberships(saint.slug);
      return {
        saint,
        membership: all.find((m) => m.order.slug === slug),
        alsoIn: all.filter((m) => m.order.slug !== slug),
      };
    });
    return sortMembers(rows, lang);
  }, [saints, slug, lang]);

  const branchCount = new Set(
    members.map((m) => m.membership?.branch).filter((b): b is string => Boolean(b)),
  ).size;
  const unreviewedCount = members.filter((m) => m.membership && !m.membership.reviewed).length;
  const multiOrderCount = members.filter((m) => m.alsoIn.length > 0).length;

  useDocumentTitle(order ? `${localizeOrderName(order, lang)} — ${t('siteTitle')}` : null);

  if (!order) return <Navigate to="/" replace />;

  const isRtl = lang === 'ur';
  const orderName = localizeOrderName(order, lang);
  const founded = isRtl && order.founded ? translateToUrdu(order.founded) : order.founded;
  // The one-line order summary in the reader's language. English text in the
  // Urdu view is an untranslated sentence, not a citation, so it is dropped
  // rather than shown (i18n rule 7) — `descriptionUr` in data/kg-seeds.json is
  // where the Urdu comes from.
  const description = isRtl ? order.descriptionUr : order.description;

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
              {orderName}
            </li>
          </ol>
        </nav>

        <p className="entity-type-kicker">{t('sufiOrder')}</p>

        <h1 ref={headingRef} className="entity-title">
          {orderName}
          {/* In the Urdu view the heading already *is* the Arabic-script name,
              so repeating it would print the same word twice. */}
          {order.arabicName && !isRtl && (
            <span className="entity-title-arabic" lang="ar">
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
              {fmtNum(tFn(lang, 'orderMemberCount', members.length))}
            </span>
          )}
          {branchCount > 0 && (
            <span className="entity-meta-item" title={t('orderBranchHelp')}>
              {fmtNum(tFn(lang, 'orderBranchCount', branchCount))}
            </span>
          )}
          {multiOrderCount > 0 && (
            <span className="entity-meta-item" title={t('orderMultiHelp')}>
              {fmtNum(tFn(lang, 'orderMultiCount', multiOrderCount))}
            </span>
          )}
          {unreviewedCount > 0 && (
            <span className="entity-meta-item" title={t('lineageUnreviewedHelp')}>
              {fmtNum(unreviewedCount)} {t('lineageUnreviewed')}
            </span>
          )}
        </div>

        <div className="entity-article-layout">
          {/* Main content */}
          <div>
            {/* Description */}
            {description && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('description')}</h2>
                <p>{description}</p>
              </section>
            )}

            {/* Members */}
            {members.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('orderMembers')}</h2>
                <ul className="entity-saint-list">
                  {members.map(({ saint, membership, alsoIn }, i) => (
                    <li
                      key={saint.slug}
                      className="entity-saint-item reveal-rise"
                      style={{ '--stagger-index': i } as React.CSSProperties}
                    >
                      <div className="entity-saint-item-name">
                        {/* fmtNum because a few recorded names carry a
                            lifespan in parentheses — Eastern numerals reach
                            every number site, names included (i18n rule 5). */}
                        <Link to={`/saint/${saint.slug}`}>
                          {fmtNum(localizeFigureName(saint, lang))}
                        </Link>
                        {saint.altNames?.[0] && (
                          <span className="entity-saint-altname">
                            <bdi>{localizeAltName(saint.altNames[0], lang)}</bdi>
                          </span>
                        )}
                        {membership?.branch && (
                          <span className="order-branch-chip" title={t('orderBranchHelp')}>
                            <bdi>{membership.branch}</bdi>
                          </span>
                        )}
                        {membership && !membership.reviewed && (
                          <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
                            {t('lineageUnreviewed')}
                          </span>
                        )}
                      </div>
                      {/* A figure can hold more than one silsila, and the
                          archive's sources say so for twenty of them. Each of
                          these is its own quoted edge, not an inference. */}
                      {alsoIn.length > 0 && (
                        <div className="entity-saint-also-in">
                          {t('orderAlsoIn')}:{' '}
                          {alsoIn.map((other, i) => (
                            <React.Fragment key={other.order.slug}>
                              {i > 0 && <span aria-hidden="true">{' · '}</span>}
                              <Link to={`/order/${other.order.slug}`}>
                                {localizeOrderName(other.order, lang)}
                              </Link>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      {saint.shrines.length > 0 && (
                        <div className="entity-saint-item-shrines">
                          {saint.shrines.map((shrineSlug) => (
                            <Link
                              key={shrineSlug}
                              to={`/shrine/${shrineSlug}`}
                              className="entity-saint-shrine-tag"
                            >
                              {shrineNames.get(shrineSlug) ?? localizeShrineSlug(shrineSlug, lang)}
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
              <LineageView order={order} members={saints} />
            </section>
          </div>

          {/* Infobox sidebar */}
          <aside className="entity-infobox">
            <div className="entity-infobox-title">{orderName}</div>
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
                  <span className="entity-infobox-label">{t('orderMembersLabel')}</span>
                  <span className="entity-infobox-value">{fmtNum(members.length)}</span>
                </div>
              )}
              {branchCount > 0 && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('orderBranchesLabel')}</span>
                  <span className="entity-infobox-value">{fmtNum(branchCount)}</span>
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
