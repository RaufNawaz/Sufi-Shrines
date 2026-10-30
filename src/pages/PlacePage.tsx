import React, { useMemo } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { CiteThisEntry } from '../components/shrine/CiteThisEntry';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link, useParams } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';

import { buildAllPlaces, type PlaceRecord } from '../lib/data/places';
import { figuresAtShrines } from '../lib/data/placeFigures';
import { readRecordedObservances } from '../lib/data/recordedObservances';
import {
  ObservanceGapNote,
  RecordedObservanceList,
  type RecordedObservanceRow,
} from '../components/kg/RecordedObservanceList';
import { ShrineImage } from '../components/ui/ShrineImage';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { CATEGORY_LABELS, categoryKey, type CategoryKey } from '../lib/data/categoryKey';
import type { Lang, Shrine } from '../types/shrine';

import { isRtlLang } from '../lib/i18n/languages';
import { localizeRecordedName } from '../lib/i18n/localizeRecordedName';
import { useTeamAccess } from '../lib/projectAccess';
import { publicLocation } from '../lib/data/publicLocation';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { NotFoundSearch } from '../components/ui/NotFoundSearch';
/**
 * One place, and what the archive records in it.
 *
 * Track B of `docs/planning/SHARED_GROUND_VISION.md`: "Uch Sharif" and "Nankana
 * Sahib" should be readable subjects rather than filter values. 35 of 169 sites
 * are in or around Lahore and the shrine pages never said so.
 *
 * The page states what `places.ts` can derive from the `Location` column —
 * which sites, which traditions, and the span of the dates it can actually read
 * — and, since 30 October 2026, the books' own account of the place, where one
 * has been written and verified (`PlaceArticle`, from
 * `docs/prompts/PLACE_DESCRIPTION_BRIEF.md`). It never describes a place from
 * anywhere else: that would be inventing content (RULE 2).
 */

/**
 * The Sufi orders of the figures this place's sites commemorate, most figures
 * first. Order pages listed their places ("Where this order stands") and the
 * place page named no order back (explorer council, 17 October 2026). The
 * graph is loaded dynamically: this route keeps it off its eager bundle.
 */
type PlaceOrder = { slug: string; name: Record<Lang, string>; count: number };

/* The books' account of the place, loaded only when the page renders: the prose
   renderer it shares with the shrine pages is 11 KB this route's eager budget
   (`scripts/check-bundle-budget.mjs`) need not carry for the places that have no
   article. */
const PlaceArticle = React.lazy(() =>
  import('../components/place/PlaceArticle').then((m) => ({ default: m.PlaceArticle })),
);

function useOrdersForFigures(figureSlugs: string[]): PlaceOrder[] {
  const [orders, setOrders] = React.useState<PlaceOrder[]>([]);
  const key = figureSlugs.join('|');
  React.useEffect(() => {
    let cancelled = false;
    const slugs = key.split('|').filter(Boolean);
    if (slugs.length === 0) {
      setOrders([]);
      return;
    }
    /* The name helper too: `localizeKgName` imports the graph as well. */
    void Promise.all([import('../lib/kg'), import('../lib/i18n/localizeKgName')]).then(
      ([{ getOrderMemberships }, { localizeOrderName }]) => {
        if (cancelled) return;
        const counts = new Map<string, PlaceOrder>();
        for (const slug of slugs) {
          for (const { order } of getOrderMemberships(slug)) {
            const entry = counts.get(order.slug);
            if (entry) entry.count++;
            else
              counts.set(order.slug, {
                slug: order.slug,
                name: { en: localizeOrderName(order, 'en'), ur: localizeOrderName(order, 'ur') },
                count: 1,
              });
          }
        }
        setOrders([...counts.values()].sort((a, b) => b.count - a.count));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);
  return orders;
}

/** Rows shown before "Show all" in the figure and observance lists. */
const LIST_CAP = 8;

function PlaceContent({ place, lang }: { place: PlaceRecord; lang: Lang }) {
  const { t, fmtNum, localizeField } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const displayName = localizeRecordedName(place.name, lang);
  /* Public vs team view (HANDOVER §9.183). The sub-line under each site was
     the raw Location cell — 37 survey paragraphs on /place/lahore, one of 397
     characters. The team keeps the cell; the public reads a short recorded
     value as recorded, and otherwise the *other* places the entry resolves to
     (this page's own name would only repeat the heading). */
  const teamView = useTeamAccess();
  const rowLocation = (shrine: Shrine): string =>
    teamView
      ? shrine.location
      : publicLocation(localizeField(shrine.raw, 'Location') || shrine.location, shrine, lang, [
          place.slug,
        ]);

  /* Up to five photographs from the place's own sites.
   *
   * Only sites that actually have one, and only when there are at least two:
   * 51 of 169 entries carry no photograph (see /coverage), and a strip of
   * category glyphs standing in for missing photos would advertise an absence
   * as if it were content. */
  const photos = React.useMemo(
    () => place.shrines.filter((s) => s.imageUrl).slice(0, 5),
    [place.shrines],
  );

  /* The figures this place holds, and the days kept for them.
   *
   * Both are joins the graph has been able to make since the place vocabulary
   * landed, and neither reached a page: `/place/:slug` could say a place had 35
   * sites and four traditions without naming one person or one day. The sites
   * list beneath already links every shrine; what these add is the other two
   * kinds of entity the archive knows about the same rows.
   *
   * `buried_at` is 169 rule-derived edges over 169 sites, so no row here
   * carries an unreviewed marking — there is no `reviewed` flag on those edges
   * to inherit, and marking them would invent a doubt the record does not have.
   * A lineage-only figure cannot appear here at all: by definition they have no
   * site for a place to hold.
   *
   * The join is `placeFigures.ts`, not `getSaintsForShrine`, and the difference
   * is 305 KB — see that file. In short: the *link target* comes from the 11 KB
   * shrine → figure index, and the *name* comes from the sheet row this page
   * already has, which is the pattern the almanac's cards have used since the
   * graph landed. */
  const figures = React.useMemo(() => figuresAtShrines(place.shrines), [place.shrines]);
  const orders = useOrdersForFigures(React.useMemo(() => figures.map((f) => f.slug), [figures]));

  const shrineBySlug = React.useMemo(
    () => new Map(place.shrines.map((s) => [s.slug, s])),
    [place.shrines],
  );

  /* One row per site, not per event.
   *
   * The recorded cell is a property of the *site* — "Annual urs (18-20 Safar);
   * Thursday qawwali" is one string covering everything that site keeps — so a
   * row per event would print the same sentence twice for the seven sites whose
   * graph holds two event nodes. The figure named on the row is the one the
   * site commemorates, which is what turns a list of dates into a list of
   * gatherings. Sites the archive records no observance for are absent rather
   * than listed as blank: the almanac's undated list is where that gap is
   * counted, by name, and duplicating it here would double the archive's
   * account of its own silence. */
  const observances = React.useMemo<RecordedObservanceRow[]>(() => {
    const rows: RecordedObservanceRow[] = [];
    for (const shrine of place.shrines) {
      const recorded = readRecordedObservances(shrine);
      if (!recorded.recorded) continue;
      const figure = figures.find((f) => f.shrineSlugs.includes(shrine.slug));
      rows.push({
        key: shrine.slug,
        ...(figure
          ? {
              figure: {
                slug: figure.slug,
                name: localizeRecordedName(figure.recordedName, lang),
              },
            }
          : {}),
        shrineSlug: shrine.slug,
        shrineLabel: localizeShrineName(shrine, lang),
        ...recorded,
      });
    }
    return rows;
  }, [place.shrines, figures, lang]);

  /* The place's sites by tradition, in the order the counts already use, and
     then any whose category is not one of the six — so no site drops off the
     page for want of a group. */
  const siteGroups = React.useMemo(() => {
    const groups: { key: CategoryKey; shrines: Shrine[] }[] = place.traditions.map(({ key }) => ({
      key,
      shrines: place.shrines.filter((s) => categoryKey(s.category) === key),
    }));
    const other = place.shrines.filter((s) => categoryKey(s.category) === 'default');
    if (other.length > 0) groups.push({ key: 'default', shrines: other });
    return groups;
  }, [place.traditions, place.shrines]);
  const groupLabel = (key: CategoryKey): string =>
    key === 'default' ? t('placeSitesOther') : CATEGORY_LABELS[key][lang];
  const [showAllFigures, setShowAllFigures] = React.useState(false);
  const [showAllObservances, setShowAllObservances] = React.useState(false);

  useDocumentTitle(`${displayName} — ${t('siteTitle')}`);

  return (
    <>
      {/* `entity-type-kicker` and `coverage-intro` rather than new class names:
          the first draft used `entity-kicker` and `entity-lede`, neither of
          which exists in any stylesheet, so the page would have rendered
          unstyled while looking correct in the JSX. */}
      <p className="entity-type-kicker">
        {t(place.kind === 'province' ? 'provinceKicker' : 'placeKicker')}
      </p>
      <h1 ref={headingRef} className="entity-title">
        {displayName}
      </h1>
      <p className="coverage-intro">{t('placeIntro')}</p>

      {/* The place's summary — how many sites, over what span — under the
          intro, as every entity page has it, not under the photographs. */}
      <div className="entity-meta">
        <span className="entity-meta-item">
          {fmtNum(tFn(lang, 'placeSiteCount', place.shrines.length))}
        </span>
        <span className="entity-meta-item">
          {place.yearSpan
            ? fmtNum(tFn(lang, 'placeSpan', place.yearSpan.earliest, place.yearSpan.latest))
            : t('placeSpanNone')}
        </span>
      </div>

      {photos.length >= 2 && (
        <div className="place-photo-strip">
          {photos.map((shrine) => {
            const name = localizeShrineName(shrine, lang);
            return (
              <Link
                key={shrine.slug}
                to={`/shrine/${shrine.slug}`}
                className="place-photo hover-lift"
                /* Named on the link, not left to the image: ShrineImage falls
                   back to an aria-hidden glyph when a photo 404s, and a link
                   whose only child is hidden has no accessible name at all. */
                aria-label={name}
              >
                <ShrineImage
                  src={shrine.imageUrl}
                  alt=""
                  category={shrine.category}
                  className="place-photo-img"
                  placeholderClassName="place-photo-placeholder"
                  loading="lazy"
                  width={IMAGE_WIDTH.preview}
                />
                <span className="place-photo-caption">
                  <bdi>{name}</bdi>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* The books' account of the place, under the photographs and before the lists: the lists answer
          "what is here", the article "what is this place". Renders nothing
          until an article has passed its three verifiers. */}
      <React.Suspense fallback={null}>
        <PlaceArticle slug={place.slug} />
      </React.Suspense>

      {/* The sites first (explorer council, 17 October 2026). They were last,
          under every figure and every observance — about eleven phone screens
          down on /place/lahore — though "what is here?" is the question a place
          page exists to answer. Grouped under the tradition counts that used to
          sit above them as plain text; the counts now jump to their group. */}
      <section className="kg-section" id="place-sites">
        <h2 className="kg-section-heading">{t('placeSitesHeading')}</h2>
        {siteGroups.length > 1 && (
          <ul className="place-tradition-list" aria-label={t('placeTraditionsHeading')}>
            {siteGroups.map(({ key, shrines }) => (
              <li key={key} className={`place-tradition place-tradition--${key}`}>
                <a href={`#place-sites-${key}`} className="place-tradition-link">
                  <span className="place-tradition-name">{groupLabel(key)}</span>
                  <span className="place-tradition-count">{fmtNum(shrines.length)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {siteGroups.map(({ key, shrines }) => (
          <div key={key} id={`place-sites-${key}`} className="place-site-group">
            {siteGroups.length > 1 && (
              <h3 className="place-site-group-heading">{groupLabel(key)}</h3>
            )}
            <ul className="place-site-list inset-list">
              {shrines.map((shrine, i) => (
                <li
                  key={shrine.slug}
                  className="inset-row inset-row--link reveal-rise"
                  style={{ '--stagger-index': i } as React.CSSProperties}
                >
                  <Link to={`/shrine/${shrine.slug}`}>
                    <span className="inset-row-label inset-row-label--stacked">
                      <span className="inset-row-title">
                        <bdi>{localizeShrineName(shrine, lang)}</bdi>
                      </span>
                      {/* The Location column — as recorded for the team, a place
                          name for the public (`publicLocation`). Often still an
                          English value either way, hence data-latin. */}
                      {rowLocation(shrine) && (
                        <span className="inset-row-sub" data-latin>
                          <bdi>{rowLocation(shrine)}</bdi>
                        </span>
                      )}
                    </span>
                    <span className="inset-row-chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {orders.length > 0 && (
        <section className="kg-section">
          <h2 className="kg-section-heading">{t('placeOrdersHeading')}</h2>
          <p className="kg-section-note">{t('placeOrdersNote')}</p>
          <div className="order-place-list">
            {orders.map(({ slug: orderSlug, name, count }) => (
              <Link
                key={orderSlug}
                to={`/order/${orderSlug}`}
                className="order-place-tag hover-lift"
              >
                <bdi>{name[lang]}</bdi> <span className="order-place-count">{fmtNum(count)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {figures.length > 0 && (
        <section className="kg-section">
          <h2 className="kg-section-heading">{t('placeFiguresHeading')}</h2>
          <p className="kg-section-note">{t('placeFiguresNote')}</p>
          <ul className="place-figure-list">
            {(showAllFigures ? figures : figures.slice(0, LIST_CAP)).map(
              ({ slug: figureSlug, recordedName, shrineSlugs }) => (
                <li key={figureSlug} className="place-figure">
                  <Link to={`/saint/${figureSlug}`} className="place-figure-name">
                    {fmtNum(localizeRecordedName(recordedName, lang))}
                  </Link>
                  {/* No connector word between the name and its sites. "at" on
                    its own is a fragment, and `noSentenceFragments.test.ts` is
                    right to refuse it: where a preposition goes is a fact about
                    the language, not about the layout, and Urdu's postposition
                    would need the operands in the other order. The section note
                    says the sites are listed beside the name, and the order
                    page's member list already shows shrine tags with no label
                    at all. */}
                  <span className="place-figure-sites">
                    {shrineSlugs.map((shrineSlug) => {
                      const shrine = shrineBySlug.get(shrineSlug);
                      if (!shrine) return null;
                      return (
                        <Link
                          key={shrineSlug}
                          to={`/shrine/${shrineSlug}`}
                          className="entity-saint-shrine-tag"
                        >
                          <bdi>{localizeShrineName(shrine, lang)}</bdi>
                        </Link>
                      );
                    })}
                  </span>
                </li>
              ),
            )}
          </ul>
          {figures.length > LIST_CAP && !showAllFigures && (
            <button type="button" className="action-btn" onClick={() => setShowAllFigures(true)}>
              {fmtNum(tFn(lang, 'almanacShowList', figures.length))}
            </button>
          )}
        </section>
      )}

      {observances.length > 0 && (
        <section className="kg-section">
          <h2 className="kg-section-heading">{t('placeObservancesHeading')}</h2>
          <p className="kg-section-note">{t('placeObservancesNote')}</p>
          <ObservanceGapNote rows={observances} />
          <RecordedObservanceList
            rows={showAllObservances ? observances : observances.slice(0, LIST_CAP)}
            showReviewState={teamView}
          />
          {observances.length > LIST_CAP && !showAllObservances && (
            <button
              type="button"
              className="action-btn"
              onClick={() => setShowAllObservances(true)}
            >
              {fmtNum(tFn(lang, 'almanacShowList', observances.length))}
            </button>
          )}
        </section>
      )}

      <CiteThisEntry
        kind="place"
        slug={place.slug}
        englishName={place.name}
        localizedName={displayName}
      />
    </>
  );
}

export default function PlacePage() {
  const { slug } = useParams<{ slug: string }>();
  const { shrines, loading, offline, sourceTimestamp } = useShrineData();
  const { lang, t } = useLang();
  const isRtl = isRtlLang(lang);

  const place = useMemo(() => {
    const { places } = buildAllPlaces(shrines);
    return places.find((p) => p.slug === slug) ?? null;
  }, [shrines, slug]);

  return (
    <div className="page-enter entity-page-wrapper">
      {/* The place's own name once it has scrolled away, resolved here as well as
          in the article below — the header is in the outer component and the
          article is in the inner one. */}
      <EntityPageHeader {...(place ? { title: localizeRecordedName(place.name, lang) } : {})} />

      <main
        className="entity-page place-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        {/* The shared trail: an <ol>, so the size, colour and separator rules
            (direction-aware in Urdu) reach it. This was the one page that drew
            its own — a full-size cobalt site title and a literal "›" that
            pointed the wrong way in Urdu. */}
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li>{t('placesTitle')}</li>
            {place && (
              <li aria-current="page" className="shrine-breadcrumb-current">
                <bdi>{localizeRecordedName(place.name, lang)}</bdi>
              </li>
            )}
          </ol>
        </nav>

        {/* In the outer component, which is the one holding the data: the article
            below is a child that receives an already-resolved place. Self-hides
            unless a live fetch has actually failed — see OfflineDataBanner. */}
        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

        {loading && shrines.length === 0 ? (
          <p className="coverage-loading page-loading-reserve">{t('loading')}</p>
        ) : place ? (
          <PlaceContent place={place} lang={lang} />
        ) : (
          <>
            <h1 className="entity-title">{t('placesTitle')}</h1>
            <p className="coverage-intro">{t('placeNotFound')}</p>
            <NotFoundSearch />
          </>
        )}
        <SiteFooter />
      </main>

      <ScrollToTop />
    </div>
  );
}
