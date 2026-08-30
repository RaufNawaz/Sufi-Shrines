import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
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
import { categoryDisplayLabel } from '../lib/data/categoryKey';
import { renderInlineBold } from '../components/shrine/inlineFormat';
import { alsoKnownAsFor, getTraditionBySlug, getTraditionMembers } from '../lib/data/traditions';

/**
 * One of the six traditions the archive documents outside the Sufi orders.
 *
 * Built from `data/kg-traditions.json`, which the knowledge-base session
 * produced as a **deliberate** data-layer-plus-brief handoff rather than
 * rendering it itself — see `docs/briefs/TRADITION_LAYER.md`, and HANDOVER
 * §9.138 for this renderer. The short version:
 * `/order/:slug` covers Sufi affiliation and every order in the graph is Sufi,
 * so for the 89 non-Muslim sites that carry no `silsila` the archive knew a
 * tradition only as `category` — a six-value bucket — while their entries
 * described Nath, Udasi, Pranami, Swaminarayan, Daduvansi and Shakti Peetha in
 * authored sections no page could reach.
 *
 * ## The one rule that shapes this file
 *
 * **A definition is the page's account; a membership quote is evidence.** They
 * are treated differently on purpose, and the difference is the whole i18n
 * rule 7:
 *
 * - `definition`/`definitionUr` is what this page *says about* the tradition,
 *   so the Urdu view gets the Urdu passage and never the English one. English
 *   there would be an untranslated sentence, and the no-leak guard fails on it
 *   — as it did when the order passages first shipped in English behind
 *   `data-latin` (§9.128).
 * - a membership `quote` supports a claim the reader already has in their own
 *   language. That is a citation, so it may stay English inside a declared
 *   `<blockquote lang="en" dir="ltr" data-latin>`, exactly as `LineageView` and
 *   `KinView` do.
 *
 * Both run through `renderInlineBold`, because they are Description prose and
 * carry the archive's markdown — a raw `*sampradaya*` would show its asterisks.
 */
export default function TraditionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  const { shrines, offline, sourceTimestamp } = useShrineData();

  const tradition = slug ? getTraditionBySlug(slug) : undefined;
  const members = useMemo(() => (slug ? getTraditionMembers(slug) : []), [slug]);

  /* Real names from the live dataset, so a member reads as its entry's title
     rather than a title-cased slug — and so the Urdu view can localise it.
     Same split OrderPage uses: the page holds the rows, the list does not. */
  const shrineBySlug = useMemo(() => new Map(shrines.map((s) => [s.slug, s])), [shrines]);

  const displayName = tradition ? (isRtl ? tradition.nameUr : tradition.name) : '';

  useDocumentTitle(tradition ? `${displayName} — ${t('siteTitle')}` : null);

  if (!tradition) return <Navigate to="/" replace />;

  const definition = isRtl ? tradition.definitionUr : tradition.definition;
  const categoryLabel = categoryDisplayLabel(tradition.category, lang) ?? tradition.category;
  const definitionEntry = shrineBySlug.get(tradition.definitionShrine);

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <EntityPageHeader title={displayName} />

      <article
        className="entity-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li className="shrine-breadcrumb-current" aria-current="page">
              {displayName}
            </li>
          </ol>
        </nav>

        <p className="entity-type-kicker">{t('traditionKicker')}</p>

        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

        <h1 ref={headingRef} className="entity-title" tabIndex={-1}>
          {displayName}
          {/* In the Urdu view the heading already is the Urdu name, so
              repeating it would print the same word twice — the same rule the
              order pages' Arabic name follows. */}
          {!isRtl && tradition.nameUr && (
            <span className="entity-title-arabic" lang="ur">
              {tradition.nameUr}
            </span>
          )}
        </h1>

        <div className="entity-meta">
          {/* The schema bucket this tradition sits inside. Shown because the
              two are different kinds of thing and a reader should be able to
              see both: `category` is how the archive files a site, the
              tradition is what its entry says the site belongs to. */}
          <span className="entity-meta-item">{categoryLabel}</span>
          {members.length > 0 && (
            <span className="entity-meta-item">
              {fmtNum(tFn(lang, 'traditionSiteCount', members.length))}
            </span>
          )}
        </div>

        {/* Other names the corpus uses. Latin in both views: these are the
            source's own spellings and a reader searching for "Kanphata yogis"
            needs the string, not a translation of it. */}
        {alsoKnownAsFor(tradition).length > 0 && (
          <p className="tradition-aka">
            <span className="tradition-aka-label">{t('alsoKnownAs')}:</span>{' '}
            {alsoKnownAsFor(tradition).map((name, i) => (
              <span key={name}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <bdi data-latin>{name}</bdi>
              </span>
            ))}
          </p>
        )}

        <div className="entity-article-layout">
          <div>
            <section className="kg-section">
              <h2 className="kg-section-heading">{t('traditionDefinitionHeading')}</h2>
              {/* The archive's own words, not a summary written for this site.
                  That is the point of the whole layer, and it is why the entry
                  it came from is named underneath rather than left implicit. */}
              <p className="tradition-definition">{renderInlineBold(definition)}</p>
              <p className="tradition-definition-source">
                {t('traditionFromEntry')}{' '}
                {definitionEntry ? (
                  <Link to={`/shrine/${definitionEntry.slug}`}>
                    {localizeShrineName(definitionEntry, lang)}
                  </Link>
                ) : (
                  <bdi data-latin>{tradition.definitionShrine}</bdi>
                )}
              </p>
            </section>

            {members.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('traditionSitesHeading')}</h2>
                <p className="kg-section-note">{t('traditionSitesNote')}</p>
                <ul className="tradition-members">
                  {members.map((member) => {
                    const shrine = shrineBySlug.get(member.shrineSlug);
                    return (
                      <li key={member.shrineSlug} className="tradition-member">
                        <div className="tradition-member-name">
                          {shrine ? (
                            <Link to={`/shrine/${shrine.slug}`}>
                              {localizeShrineName(shrine, lang)}
                            </Link>
                          ) : (
                            /* The dataset is fetched live and this file is
                               static, so a row can be absent from a given load.
                               The recorded name is still the honest label. */
                            <bdi data-latin>{member.shrineName}</bdi>
                          )}
                        </div>
                        {/* Evidence, in the source's words. Latin in either
                            language on purpose — see the header. */}
                        <blockquote className="graph-lineage-quote" lang="en" dir="ltr" data-latin>
                          {renderInlineBold(member.quote)}
                          <cite className="graph-lineage-cite">{member.source}</cite>
                        </blockquote>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* What this page is not claiming. The layer records seven term
                matches as deliberate non-memberships — `udasi` is also the word
                for Guru Nanak's four journeys, `jogi` catches Ranjha in Waris
                Shah's poem — and a reader who wonders why a site they expect is
                absent deserves the reason rather than silence. */}
            <section className="kg-section">
              <h2 className="kg-section-heading">{t('traditionScopeHeading')}</h2>
              <p className="kg-section-note">{t('traditionScopeNote')}</p>
            </section>
          </div>
        </div>

        <SiteFooter />
      </article>
    </div>
  );
}
