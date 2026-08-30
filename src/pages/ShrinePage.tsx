import React, { useEffect, useMemo } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityNotFound } from '../components/ui/EntityNotFound';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link, useParams } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useShareLink } from '../hooks/useShareLink';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { placesForShrine } from '../lib/data/places';

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
import { SourceNotes } from '../components/shrine/SourceNotes';
import { ReadingProgressBar } from '../components/shrine/ReadingProgressBar';
import { ShrineImage } from '../components/ui/ShrineImage';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { getFieldValue } from '../lib/data/fieldAliasing';
import { metaDescription } from '../lib/data/articleParsing';
import { categoryDisplayLabel } from '../lib/data/categoryKey';
import { infoLevelKey } from '../lib/data/infoLevel';
import { siteStatusKey, SITE_STATUS_LABEL_KEYS } from '../lib/data/siteStatus';
import { CONTACT_EMAIL, correctionIssueUrl } from '../lib/data/constants';
import { InfoLevelBadge } from '../components/ui/InfoLevelBadge';
import { SupportLevelBadge } from '../components/ui/SupportLevelBadge';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { resolveFoundedDate } from '../lib/i18n/urduFallback';
import { primaryFigureSlug, figureLabelsForShrine } from '../lib/kgShrineFigures';
import { hasProjectAccess } from '../lib/projectAccess';
import { CiteThisEntry } from '../components/shrine/CiteThisEntry';
import { ShrineObservances } from '../components/shrine/ShrineObservances';
import { NearbyMosques } from '../components/shrine/NearbyMosques';
import { useSavedShrines, toggleSaved } from '../lib/savedShrines';
import type { Shrine } from '../types/shrine';
import { langAttr } from '../lib/i18n/languages';
import { supportLevelKey, SUPPORT_LEVEL_LABEL_KEYS } from '../lib/data/supportLevel';

import { localizeRecordedName } from '../lib/i18n/localizeRecordedName';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { useUrduArticles } from '../hooks/useUrduArticlesReady';
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

/**
 * The article column, while the sheet is still arriving.
 *
 * Distinct from `SkeletonPage`, which stands in for the whole route. This one
 * stands in for the *prose* only: the masthead above it is real — name,
 * category, location and the photograph all come from the slim index — so what
 * is missing is the article, and that is what should look pending.
 */
function ArticleSkeleton() {
  return (
    <div className="shrine-loading" aria-hidden="true">
      <div className="skeleton skeleton-text skeleton-text--90" />
      <div className="skeleton skeleton-text skeleton-text--80" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text skeleton-text--90" />
      <div className="skeleton skeleton-text skeleton-text--80" />
    </div>
  );
}

function ShrineContent({
  shrine,
  allShrines,
  offline,
  sourceTimestamp,
  articleReady,
  proseReady,
}: {
  shrine: Shrine;
  allShrines: Shrine[];
  /**
   * False while the rows on screen came from the slim map index, which carries
   * no `Description`.
   *
   * **It must be this flag and not `shrine.description`.** `buildShrines` gives
   * an index row an *empty* description rather than a missing one, so a check on
   * emptiness renders "no description recorded" — a claim about the archive, and
   * a false one. Same shape as the `alsoKnownAs` bug in §9.138: a value
   * legitimately absent for one reason being read as absent for another.
   */
  articleReady: boolean;
  /** As above, and also waiting on the Urdu article payload when the reader is
   *  reading Urdu. Gates the prose and the contents nav; the infobox uses
   *  `articleReady`, because its fields come from the sheet. */
  proseReady: boolean;
  /* Passed down rather than read from a second `useShrineData()` call: the hook
     shares module state, but two subscriptions on one page is two re-renders
     for one change. */
  offline: boolean;
  sourceTimestamp: number | null;
}) {
  const { lang, t, localizeField, fmtNum } = useLang();
  const shrinePlaces = React.useMemo(() => placesForShrine(shrine), [shrine]);
  const { navItems } = useArticleContent(shrine);
  const { share, copied } = useShareLink();
  const saved = useSavedShrines();
  const isShrineSaved = saved.includes(shrine.slug);
  // Move focus to the heading so screen readers announce the shrine name on navigation
  const headingRef = useFocusHeadingOnMount();

  const name = localizeShrineName(shrine, lang);

  const primaryFigure = primaryFigureSlug(shrine.slug);
  /* Non-empty only where the raw `Sufi Saint` cell is not a usable label: the
     three rows that name two people, and the rows whose cell names a different
     monument's figure. */
  const figureLabels = figureLabelsForShrine(shrine.slug);

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

  /* The prerendered file already carries a clean description; this exists for
     client-side navigation, where no new document is fetched. It used to write
     `Description.slice(0, 160)` raw, and 123 of the archive's 171 descriptions
     open with a markdown heading — so the live DOM said "## Overview\n\nAllo
     Mahar Sharif is a village in the Daska *tehsil* of…", which is what a
     JavaScript-rendering crawler indexes. Nothing renders a meta tag, so the
     two implementations were never compared. */
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const desc = metaDescription(getFieldValue(shrine.raw, 'Description'));
    if (meta && desc) meta.setAttribute('content', desc);
  }, [shrine.raw]);

  /* Article sections arrive as the reader reaches them. Attached here rather
     than per section so one observer covers all eight, and keyed on the shrine
     so navigating between shrines re-runs it. */
  const revealRef = useRevealOnScroll<HTMLElement>('.article-section', [shrine.slug]);

  /* The print footer showed the sheet's raw value ("Field-verified") to an
     Urdu reader. It is a controlled vocabulary with a label in uiStrings, so
     this is a translation, not debt. */
  const supportKey = supportLevelKey(shrine.supportLevel);

  return (
    <article
      className="shrine-page"
      id="main-content"
      tabIndex={-1}
      lang={langAttr(lang)}
      ref={revealRef}
    >
      {/* The date of what the reader is looking at. An entry rendered from cache
          is a provenance claim as much as the map is — see OfflineDataBanner.
          Self-hides unless a live fetch has actually failed. */}
      <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

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
            {/* A recorded date, verbatim. Most are a bare year and `fmtNum`
                localizes the digits; a few are a phrase the sheet wrote —
                "Built 9th–10th century CE", "7th century CE onwards" — which
                RULE 2 says is shown as recorded rather than rewritten, and
                i18n rule 7 says is therefore *declared* rather than left to
                look translated. Only where Latin actually survives, so the
                bare years stay undeclared and the budget keeps counting real
                debt. */}
            {(() => {
              const shown = fmtNum(founded);
              return /[A-Za-z]/.test(shown) ? <bdi data-latin>{shown}</bdi> : shown;
            })()}
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
            {/* Four rows out of 169 cannot use the sheet's cell as the label
                here, and both reasons end the same way — the name on screen
                would not be the name behind the link.

                Three name two people, and there is one link per figure, so the
                cell cannot be the text: "Guru Nanak Dev Ji; associated with
                Bhai Lalo" cannot be cut in two without deciding what
                "associated with" attaches to, a claim the sheet did not make
                (RULE 2). The fourth is Tomb of Javindi Bibi, whose cell names
                Jalaluddin Surkh-Posh Bukhari — a different monument's figure —
                so printing it would put a man's name over a link to a woman's
                page.

                The recorded cell is not lost by that: `Sufi Saint` is an
                INFOBOX_PRIORITY_KEY and the infobox renders it verbatim,
                labelled with the row's own `figure_type`. That is the archive's
                usual division — recorded wording in the fact panel, resolvable
                entities as links — and it is the same one the place pills below
                already follow, where `location` is the recorded string and the
                pills are the vocabulary. `compositeFigureCellIsShown` in
                src/pages/__tests__/shrineCompositeFigures.test.tsx fails if a
                change to the infobox ever takes that verbatim rendering away,
                because at that point this line would be the only thing on the
                page naming the figures and it would be naming them in words
                the sheet never used. */}
            {figureLabels.length > 0 ? (
              figureLabels.map((figure, index) => (
                <React.Fragment key={figure.slug}>
                  {/* Decorative, and hidden from assistive tech: the two links
                      are already separate stops in the tab order, and "middle
                      dot" announced between them is noise. Unstyled on purpose
                      — a bare neutral character needs no rule, and a separator
                      that carried one would have to be mirrored for RTL. */}
                  {index > 0 && <span aria-hidden="true">{' \u00b7 '}</span>}
                  <Link to={`/saint/${figure.slug}`} className="meta-entity-link">
                    <bdi>{localizeRecordedName(figure.name, lang)}</bdi>
                  </Link>
                </React.Fragment>
              ))
            ) : primaryFigure ? (
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

      {/* The places this site is recorded in — often two, a town and its
          district, because it is in both. Until these pages existed, the fact
          that 35 of 169 sites are in or around Lahore was visible nowhere.
          Rendered as pills, not links-in-prose: the order tags on /order/:slug
          had to stop being cobalt words inside a sentence for the same reason
          (WCAG 1.4.1, HANDOVER §9.48). */}
      {shrinePlaces.length > 0 && (
        <div className="shrine-place-links">
          {shrinePlaces.map((place) => (
            <Link key={place.slug} to={`/place/${place.slug}`} className="shrine-place-tag">
              <bdi>{localizeRecordedName(place.name, lang)}</bdi>
            </Link>
          ))}
        </div>
      )}

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
        <button
          className={`action-btn${isShrineSaved ? ' action-btn--active' : ''}`}
          onClick={() => toggleSaved(shrine.slug)}
          aria-pressed={isShrineSaved}
          title={t('saveShrineFull')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={isShrineSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {isShrineSaved ? t('savedLabel') : t('saveShrine')}
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
        {proseReady && navItems.length >= 2 && (
          <div className="contents-nav-rail">
            <ContentsNav items={navItems} />
          </div>
        )}
        <div className="shrine-article-main">
          {/* The masthead above is already real; only the prose is pending.
              `ShrineObservances` waits with it — its days come from the sheet's
              Events column, which the index does not carry. */}
          {proseReady ? (
            <>
              <ShrineArticle shrine={shrine} />
              <ShrineObservances shrine={shrine} />
            </>
          ) : (
            <ArticleSkeleton />
          )}
          {shrine.latLng ? (
            <LocationMap latLng={shrine.latLng} name={name} />
          ) : (
            <p className="location-not-recorded">{t('locationNotRecorded')}</p>
          )}
          {/* Directly under the map, because it is a fact about this ground:
              which other sites — and which other traditions — stand within
              walking distance. Renders nothing when there are none. */}
          <SharedGround shrine={shrine} all={allShrines} />
          <NearbyMosques shrine={shrine} />

          <RelatedShrines shrine={shrine} all={allShrines} />
          <NearbyShrines shrine={shrine} all={allShrines} />
          <CiteThisEntry
            kind="shrine"
            slug={shrine.slug}
            englishName={shrine.name}
            localizedName={name}
            supportLevel={shrine.supportLevel}
          />
          {/* Print-only provenance footer: a printed page is a handout that
              has left the site, so it must carry its own source line. The
              <details> citation block cannot be forced open by print CSS,
              hence this parallel, always-rendered-but-screen-hidden line. */}
          <p className="shrine-print-provenance print-only">
            {t('siteTitle')} · {typeof window !== 'undefined' ? window.location.href : ''}
            {supportKey
              ? ` · ${t('citeSupportLevel')}: ${t(SUPPORT_LEVEL_LABEL_KEYS[supportKey])}`
              : ''}
          </p>
          {/* Provenance/sources detail is project-team-only visibility (not
              security — see src/lib/projectAccess.ts for why). */}
          <SourceNotes slug={shrine.slug} />
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
          {/* Held for the same reason: the infobox is a table of the row's own
              fields, and an index row has ten of the sheet's forty-four. A
              half-populated fact table reads as an archive that knows less than
              it does. */}
          {articleReady && <ShrineInfobox shrine={shrine} />}
        </aside>
      </div>

      {/* One footer. The sweep that put a footer on the ten pages missing one
          (a1f2585) appended a bare `<SiteFooter />` here without noticing this
          page already had the only non-identical one — the one carrying this
          entry's own correction link — so every shrine page has shipped the
          whole footer nav twice, 142px apart, since 24 August 2026.
          `siteFooter.test.ts` asserted *at least* one per page, which is the
          shape of check that cannot see a second. It counts now. */}
      <SiteFooter>
        <a href={correctionIssueUrl(shrine.slug)} target="_blank" rel="noopener noreferrer">
          {t('reportCorrection')}
        </a>
      </SiteFooter>
    </article>
  );
}

export default function ShrinePage() {
  const { slug } = useParams<{ slug: string }>();
  const { shrines, loading, error, offline, sourceTimestamp, source } = useShrineData();
  /*
   * The slim map index has no `Description`, so a shrine found in it is a real
   * row that is silent about the article — and an article page rendered from
   * one is an empty page, which reads as a broken record rather than a loading
   * one. The map wants those rows the moment they exist (they are what makes
   * the first marker land in ~1.5s instead of 5s); this route wants the sheet.
   *
   * So the masthead renders from the index the moment it lands — name,
   * category, location, the photograph and the summary meta are all in its ten
   * columns — and the *article column* keeps the skeleton until the sheet
   * arrives. A reader opening a shared link sees which shrine they are looking
   * at in ~1.5s instead of a blank page for five seconds.
   *
   * Held with the prose, and each for its own reason: `ShrineObservances`
   * (its days are the sheet's Events column), `ContentsNav` (built from article
   * sections), and `ShrineInfobox` (a table of the row's own fields, and an
   * index row has ten of forty-four — a half-populated fact table reads as an
   * archive that knows less than it does).
   */
  const articleReady = source !== 'index';
  const { t, lang } = useLang();

  /*
   * The Urdu articles are a separate arrival, and the prose waits for them too.
   *
   * This page is one of only three surfaces that read a merged Urdu article
   * field, so it is now one of the three that *ask* for the payload rather than
   * having it fetched on every route in the site
   * (docs/planning/URDU_ARTICLE_PAYLOAD.md). Asking means it can be in flight
   * while this renders, and an absent payload is indistinguishable from an
   * absent translation when read off a row — so without this gate the page
   * would render the English article under `articleUrduMissing`, telling an
   * Urdu reader that all 168 translated entries are untranslated. A false
   * claim, and a worse failure than the 4.7-second English flash that
   * `useUrduArticlesReady` was written for.
   *
   * Held separately from `articleReady` rather than folded into it: the infobox
   * is a table of the row's own sheet fields and owes the Urdu articles
   * nothing, so it should not blink while they land.
   */
  const urduArticlesReady = useUrduArticles();
  const proseReady =
    articleReady &&
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: asks whether the Urdu-only article payload applies, a fact about that one file
    (lang !== 'ur' || urduArticlesReady);

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

  if (!loading && articleReady && !shrine && shrines.length > 0) {
    /* Stays on the URL and says so — see EntityNotFound. The guard above is
       unchanged: this fires only once the sheet has landed and the archive
       genuinely has no such slug, never while the data is still arriving. */
    return <EntityNotFound />;
  }

  return (
    <div className="page-enter shrine-page-wrapper">
      <ReadingProgressBar />
      {/* Sticky header */}
      {/* The shrine's name once the masthead has scrolled away. Undefined
          while the sheet is still loading — a header claiming a title for a
          shrine it has not got is worse than a bare bar. */}
      <EntityPageHeader {...(shrine ? { title: localizeShrineName(shrine, lang) } : {})} />

      {(loading || !articleReady) && !shrine && <SkeletonPage />}

      {error && !shrine && <div className="shrine-page-error">{t('errorLoadingData')}</div>}

      {shrine && (
        <ShrineContent
          shrine={shrine}
          allShrines={shrines}
          articleReady={articleReady}
          proseReady={proseReady}
          offline={offline}
          sourceTimestamp={sourceTimestamp}
        />
      )}

      <ScrollToTop />
    </div>
  );
}
