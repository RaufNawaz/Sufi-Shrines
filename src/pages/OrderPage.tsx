import React, { useMemo } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { CiteThisEntry } from '../components/shrine/CiteThisEntry';
import { EntityNotFound } from '../components/ui/EntityNotFound';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useShrineData } from '../hooks/useShrineData';
import { ShrineImage } from '../components/ui/ShrineImage';
import { placesForShrine } from '../lib/data/places';
import { centurySpan } from '../lib/data/figureDates';
import { axisPosition, buildFigureTimeline, labelledCenturies } from '../lib/data/figureTimeline';
import { figurePrecisionMarker } from '../lib/data/figurePrecision';
import { CENTURY_ORDINAL } from '../lib/data/era';
import { readRecordedObservances } from '../lib/data/recordedObservances';
import {
  ObservanceGapNote,
  RecordedObservanceList,
  type RecordedObservanceRow,
} from '../components/kg/RecordedObservanceList';
import type { Lang, Shrine } from '../types/shrine';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { LineageView } from '../components/kg/LineageView';
import {
  getOrderBySlug,
  getOrderMemberships,
  getOrderObservances,
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
import { OrderProse, type OrderProseRow } from '../components/kg/OrderProse';
/* Static, and static ON PURPOSE: `/order/:slug` is the only importer, so Vite
   keeps this 10 KB in this route's chunk instead of in the shared graph payload
   — which is why it is not in kg.json (§9.125). A dynamic import would also
   work and would arrive late, and this section belongs above the fold. */
import orderProseData from '../../data/kg-order-prose.json';
import type { KGSaint } from '../types/kg';

import { isRtlLang } from '../lib/i18n/languages';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
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
function sortMembers(members: Member[], lang: Lang): Member[] {
  const collator = new Intl.Collator(lang, { sensitivity: 'base' });
  return [...members].sort((a, b) =>
    collator.compare(localizeFigureName(a.saint, lang), localizeFigureName(b.saint, lang)),
  );
}

/**
 * A date exactly as the archive recorded it.
 *
 * `translateToUrdu` returns its input unchanged when the dictionary has no
 * entry, which is correct — a hedged phrase like "8 Muharram 1040 AH / 8 August
 * 1630 CE" is one of the most honest strings in the dataset and must not be
 * paraphrased (RULE 2). But unchanged means English, so in the Urdu view it is
 * isolated with <bdi> and declared with `data-latin`: the no-leak guard counts
 * it as debt instead of passing it silently.
 */
function DateAsRecorded({ value }: { value: string }) {
  const { lang, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);

  const rendered = fmtNum(isRtl ? translateToUrdu(value) : value);
  if (isRtl && /[A-Za-z]/.test(rendered)) return <bdi data-latin>{rendered}</bdi>;
  return <>{rendered}</>;
}

/** "17th" / "۱۷ویں" — the same ordinals the era filter uses, so the two surfaces
 * name a century the same way. The noun comes from the span string, which is
 * why this is the ordinal alone. */
function centuryLabel(century: number, lang: Lang): string {
  return CENTURY_ORDINAL[lang](century);
}

export default function OrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, fmtNum } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const { shrines, offline, sourceTimestamp } = useShrineData();

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

  /* The shrine record itself, for the member cards below: a figure's portrait
     does not exist and inventing one is out of the question, but the *shrine
     that holds them* is photographed for 118 of the 169 entries, and that photo
     is the closest thing to a face this archive can honestly show. Same map as
     above, keyed the same way. */
  const shrineBySlug = useMemo(() => {
    const m = new Map<string, (typeof shrines)[number]>();
    for (const shrine of shrines) m.set(shrine.slug, shrine);
    return m;
  }, [shrines]);

  const order = useMemo(() => (slug ? getOrderBySlug(slug) : undefined), [slug]);

  /* The archive's own passages about this order. The label falls back to the
     slug the same way every other shrine reference on this page does — the
     sheet rows arrive a beat after the graph, and a passage that renders with
     no entry name under it is worse than one with a title-cased slug. */
  const proseRows = useMemo<OrderProseRow[]>(() => {
    if (!order) return [];
    const rtl = isRtlLang(lang);
    return orderProseData.passages
      .filter((p) => p.orderSlug === order.slug)
      .map((p) => ({
        shrineSlug: p.shrineSlug,
        shrineLabel: shrineNames.get(p.shrineSlug) ?? localizeShrineSlug(p.shrineSlug, lang),
        /* The Urdu article's own words in the Urdu view. The `?? p.quote`
           cannot fire on shipped data — verify-kg-proposals.mjs refuses a
           passage without `quoteUr` — and is here so a hand-edited file
           degrades to a visible English quote rather than to nothing. */
        quote: rtl ? (p.quoteUr ?? p.quote) : p.quote,
        isLatin: !rtl || !p.quoteUr,
      }));
  }, [order, shrineNames, lang]);

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

  /* The order's own calendar.
   *
   * The join is `getOrderObservances` (membership → commemorated_by); what is
   * added here is the *date*, which the event node does not honestly hold — its
   * `date` field is a bare month, present on 16 of 149. The recorded date lives
   * in the shrine's own `Events` cell, so each row reads that cell through
   * `parseObservances`, the almanac's reader, and keeps the cell verbatim for
   * display beside whatever was read out of it. Two things follow from doing it
   * this way rather than with a second parser: a row can show several recorded
   * dates ("Two annual urs observances (15 March and 6 September)"), and a row
   * whose cell says "Annual urs" and nothing more shows no date at all rather
   * than a guessed one — which is roughly two thirds of them. */
  const observances = useMemo(() => {
    if (!slug) return [];
    const rows: RecordedObservanceRow[] = getOrderObservances(slug).map((row) => {
      // A shrine the graph knows and the sheet has since dropped reads as
      // "date not recorded" — correct, and the same fallback the member list's
      // shrine tags already take.
      const shrine = row.event.shrineSlug ? shrineBySlug.get(row.event.shrineSlug) : undefined;
      const shrineSlug = row.event.shrineSlug;
      return {
        key: `${row.saint.slug}:${row.event.id}`,
        figure: { slug: row.saint.slug, name: localizeFigureName(row.saint, lang) },
        unreviewed: !row.membershipReviewed,
        shrineSlug,
        shrineLabel: shrineSlug
          ? (shrineNames.get(shrineSlug) ?? localizeShrineSlug(shrineSlug, lang))
          : undefined,
        frequency: row.event.frequency,
        ...readRecordedObservances(shrine),
      };
    });
    const collator = new Intl.Collator(lang, { sensitivity: 'base' });
    return rows.sort((a, b) => collator.compare(a.figure?.name ?? '', b.figure?.name ?? ''));
  }, [slug, shrineBySlug, shrineNames, lang]);

  /* The sites this order is present at, and the places those sites stand in.
   *
   * Both derived, neither invented (RULE 2): a shrine belongs to this order's
   * section because one of its members is buried there and the graph says so,
   * and a place is named because the shrine's own Location names it. The page
   * had 20-odd figure names and no sense of *where* the order is — which for a
   * silsila is half of what it is. */
  const orderShrines = useMemo(() => {
    const slugs = new Set<string>();
    for (const { saint } of members) for (const slug of saint.shrines) slugs.add(slug);
    return [...slugs].map((slug) => shrineBySlug.get(slug)).filter((s): s is Shrine => Boolean(s));
  }, [members, shrineBySlug]);

  const orderPlaces = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const shrine of orderShrines) {
      for (const place of placesForShrine(shrine)) {
        const seen = counts.get(place.slug);
        if (seen) seen.count += 1;
        else counts.set(place.slug, { name: place.name, count: 1 });
      }
    }
    return [...counts.entries()]
      .map(([slug, v]) => ({ slug, ...v }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [orderShrines]);

  /* When this order's figures lived, from the graph's own date strings.
     OrderPage already prints each member's dates verbatim — the note above the
     member list says a reader should be able to see that an order spans the
     11th to the 20th century — but nothing summed them, so that was true of a
     reader willing to scan 23 rows. `centurySpan` refuses to place a figure the
     record dates only in the Hijri calendar, and reports how many, because a
     span over the placeable subset presented as the whole is a fabricated
     date (RULE 2). */
  const span = useMemo(() => centurySpan(members.map(({ saint }) => saint)), [members]);

  /* The same members on a century axis.
   *
   * `span` above reduces them to two numbers — "12th–20th c." — which is the
   * fact a reader most wants and the shape they cannot see. This is the shape:
   * one row per placeable member, ordered by when they died, so the reader can
   * watch a silsila thicken and thin across nine hundred years instead of
   * reconstructing it from twenty-three date lines.
   *
   * Everything that could go wrong here is a date being drawn that the record
   * does not support, so none of the judgement is in this file:
   * `buildFigureTimeline` decides who can be placed and how, and
   * `figureTimeline.test.ts` holds it to the three refusals. What the view adds
   * is a percentage and a colour. */
  const timeline = useMemo(() => buildFigureTimeline(members.map(({ saint }) => saint)), [members]);
  const timelineTicks = useMemo(
    () => (timeline ? labelledCenturies(timeline.centuries) : []),
    [timeline],
  );

  const branchCount = new Set(
    members.map((m) => m.membership?.branch).filter((b): b is string => Boolean(b)),
  ).size;
  const unreviewedCount = members.filter((m) => m.membership && !m.membership.reviewed).length;
  const multiOrderCount = members.filter((m) => m.alsoIn.length > 0).length;

  useDocumentTitle(order ? `${localizeOrderName(order, lang)} — ${t('siteTitle')}` : null);

  /* Stays on the URL and says so — see EntityNotFound. */
  if (!order) return <EntityNotFound />;

  const isRtl = isRtlLang(lang);
  const orderName = localizeOrderName(order, lang);
  const founded = isRtl && order.founded ? translateToUrdu(order.founded) : order.founded;
  // The one-line order summary in the reader's language. English text in the
  // Urdu view is an untranslated sentence, not a citation, so it is dropped
  // rather than shown (i18n rule 7) — `descriptionUr` in data/kg-seeds.json is
  // where the Urdu comes from.
  const description = isRtl ? order.descriptionUr : order.description;

  return (
    <div className="page-enter entity-page-wrapper">
      <EntityPageHeader title={orderName} />

      <article
        className="entity-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        {/* Breadcrumb */}
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
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

        {/* The date of what the reader is looking at. Self-hides unless a live

            fetch has actually failed — see OfflineDataBanner. */}

        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

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
          {span && (
            <span className="entity-meta-item">
              {fmtNum(
                span.from === span.to
                  ? tFn(lang, 'orderSpanOne', centuryLabel(span.from, lang))
                  : tFn(
                      lang,
                      'orderSpan',
                      centuryLabel(span.from, lang),
                      centuryLabel(span.to, lang),
                    ),
              )}
            </span>
          )}
          {span && span.undated > 0 && (
            <span className="entity-meta-item" title={t('orderUndatedHelp')}>
              {fmtNum(tFn(lang, 'orderUndated', span.undated))}
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
            {/* Description. Marked for what it is: five of the nine orders
                carry a summary written for this site with no source in the
                archive behind it, and the other four carry none at all. An
                unsourced sentence standing alone on a page of an archive whose
                distinguishing claim is provenance reads as a finding, so the
                page says which kind of sentence it is — and the sourced
                passages below now stand beside it. */}
            {description && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('description')}</h2>
                <p>{description}</p>
                {order.descriptionIsEditorial && (
                  <p className="kg-section-note order-description-editorial">
                    {t('orderDescriptionEditorial')}
                  </p>
                )}
              </section>
            )}

            {/* What the archive itself says about this order — the sections its
                own entries carry, which no page could reach until now. Directly
                under the summary, because on four of these pages it is the only
                account of the order there is. */}
            <OrderProse rows={proseRows} />

            {/* ── The order in time ───────────────────────────────────────
                Above the member list rather than below it: it is a summary of
                exactly those rows, and a summary that arrives after what it
                summarises is a footnote. The bars are aria-hidden — every date
                behind them is printed verbatim a section down, and a screen
                reader is better served by that than by a percentage read
                aloud. What it does get from this section is the one thing the
                alphabetical member list destroys: chronological order. */}
            {timeline && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('orderTimelineHeading')}</h2>
                <p className="kg-section-note">{t('orderTimelineNote')}</p>

                <div
                  className="order-timeline"
                  style={
                    {
                      '--timeline-century-width': `${100 / timeline.centuries.length}%`,
                    } as React.CSSProperties
                  }
                >
                  <div className="order-timeline-scale" aria-hidden="true">
                    <span className="order-timeline-scale-label" />
                    <span className="order-timeline-scale-track">
                      {timelineTicks.map((century, i) => (
                        <span
                          key={century}
                          /* The final label is anchored to the end of the axis
                             rather than to its own gridline. "۲۰ویں" is 40px of
                             Nastaliq and the last century's band is 38px, so
                             anchoring it like the others put it 2px outside the
                             track — the exact "a string that is longer in Urdu"
                             overflow `e2e/no-overflow.spec.ts` exists to catch,
                             and invisible in English, where "20th" is 26px. The
                             axis ends where that century ends, so flush is also
                             what the span chip above already says. */
                          className={
                            i === timelineTicks.length - 1
                              ? 'order-timeline-tick order-timeline-tick--end'
                              : 'order-timeline-tick'
                          }
                          style={
                            {
                              '--timeline-at': `${axisPosition(timeline, (century - 1) * 100 + 1)}%`,
                            } as React.CSSProperties
                          }
                        >
                          {fmtNum(centuryLabel(century, lang))}
                        </span>
                      ))}
                    </span>
                  </div>

                  <ol className="order-timeline-rows">
                    {timeline.rows.map((row) => {
                      const saint = row.figure;
                      const precision = figurePrecisionMarker(saint);
                      /* The recorded strings, verbatim, as the row's tooltip.
                         Not as text: one member's `born` is a 200-character
                         sentence weighing a 2026 field survey against the
                         existing sourcing, and the derived year that positions
                         the bar (1643) drops the "c." the source wrote. A
                         tooltip can carry the whole sentence; a table cell
                         cannot, and a bare 1643 beside a name is precisely the
                         over-claim `figurePrecision.ts` exists to stop. */
                      const recorded = [
                        saint.born ? `${t('born')}: ${saint.born}` : null,
                        saint.died ? `${t('died')}: ${saint.died}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <li key={saint.slug} className="order-timeline-row">
                          <span className="order-timeline-name">
                            <Link to={`/saint/${saint.slug}`}>
                              {fmtNum(localizeFigureName(saint, lang))}
                            </Link>
                            {precision && (
                              <span
                                className="entity-date-precision"
                                title={t('figurePrecisionHelp')}
                              >
                                {t(precision.labelKey)}
                              </span>
                            )}
                          </span>
                          <span className="order-timeline-track" aria-hidden="true">
                            <span
                              className={
                                row.point
                                  ? 'order-timeline-mark order-timeline-mark--point'
                                  : 'order-timeline-mark'
                              }
                              title={
                                row.point ? t('orderTimelinePointHelp') : recorded || undefined
                              }
                              /* The tooltip is the recorded date, verbatim, and a
                                 recorded date is often Latin in the Urdu view —
                                 "8 Muharram 1040 AH / 8 August 1630 CE" is a hedged
                                 phrase the dictionary cannot carry without
                                 paraphrasing it (RULE 2). Declared here rather than
                                 on the row's link, deliberately: this span holds no
                                 text, so declaring it buys no exemption for the
                                 figure's *name*, which must stay translated.
                                 `e2e/urdu-accessible-names.spec.ts` reads `title`
                                 and would otherwise call it an English accessible
                                 name. */
                              {...(!row.point && /[A-Za-z]/.test(recorded)
                                ? { 'data-latin': '' }
                                : {})}
                              style={
                                {
                                  '--timeline-at': `${axisPosition(timeline, row.from)}%`,
                                  '--timeline-to': `${axisPosition(timeline, row.to)}%`,
                                } as React.CSSProperties
                              }
                            />
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Named, not summed. The page's meta row already carries the
                    count; what a reader cannot get from a number is *which*
                    figures the axis leaves out, and those are exactly the ones
                    whose dating someone could go and fix. */}
                {timeline.unplaced.length > 0 && (
                  <p className="order-timeline-unplaced">
                    <span className="order-timeline-unplaced-label">
                      {t('orderTimelineUnplacedLabel')}
                    </span>
                    {timeline.unplaced.map(({ figure, reason }, i) => (
                      <React.Fragment key={figure.slug}>
                        {i > 0 && <span aria-hidden="true">·</span>}
                        <Link
                          to={`/saint/${figure.slug}`}
                          className="order-timeline-unplaced-name"
                          title={
                            reason === 'contradictory'
                              ? t('orderTimelineContradictoryHelp')
                              : t('orderUndatedHelp')
                          }
                        >
                          {fmtNum(localizeFigureName(figure, lang))}
                        </Link>
                      </React.Fragment>
                    ))}
                  </p>
                )}
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
                      {/* The shrine that holds this figure, as a photograph.
                          The page listed twenty-odd names with no image of any
                          kind, on a site whose subject is architecture. Falls
                          back to the tradition's own glyph, which is what the
                          sidebar list and the related-shrine cards already do
                          for an entry with no photo. */}
                      {(() => {
                        const restingShrine = saint.shrines
                          .map((slug) => shrineBySlug.get(slug))
                          .find((shrine) => shrine);
                        if (!restingShrine) return null;
                        return (
                          <Link
                            to={`/shrine/${restingShrine.slug}`}
                            className="entity-saint-thumb"
                            aria-label={
                              shrineNames.get(restingShrine.slug) ??
                              localizeShrineSlug(restingShrine.slug, lang)
                            }
                            tabIndex={-1}
                          >
                            <ShrineImage
                              src={restingShrine.imageUrl}
                              alt=""
                              category={restingShrine.category}
                              className="entity-saint-thumb-img"
                              placeholderClassName="entity-saint-thumb-placeholder"
                              loading="lazy"
                              width={IMAGE_WIDTH.preview}
                            />
                          </Link>
                        );
                      })()}
                      <div className="entity-saint-item-name">
                        {/* fmtNum because a few recorded names carry a
                            lifespan in parentheses — Eastern numerals reach
                            every number site, names included (i18n rule 5). */}
                        <Link to={`/saint/${saint.slug}`}>
                          {fmtNum(localizeFigureName(saint, lang))}
                        </Link>
                        {saint.altNames?.[0] && (
                          <span className="entity-saint-altname" data-latin>
                            <bdi>{localizeAltName(saint.altNames[0], lang)}</bdi>
                          </span>
                        )}
                        {membership?.branch && (
                          <span
                            className="order-branch-chip"
                            title={t('orderBranchHelp')}
                            data-latin
                          >
                            <bdi>{membership.branch}</bdi>
                          </span>
                        )}
                        {membership && !membership.reviewed && (
                          <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
                            {t('lineageUnreviewed')}
                          </span>
                        )}
                      </div>
                      {/* Dates, when the graph holds them. They were on the
                          figure's own page and nowhere in this list, so a
                          reader scanning an order could not see that its
                          members span the 11th to the 20th century — the one
                          thing a list of an order's members is for. Rendered
                          verbatim, hedges included: "c. 1165" stays "c. 1165".
                       */}
                      {(saint.born || saint.died) && (
                        <div className="entity-saint-dates">
                          {/* translateToUrdu returns the original when it has no
                              entry, and a date like "8 Muharram 1040 AH / 8 August
                              1630 CE" is a whole hedged phrase the dictionary does
                              not carry. Where that happens the reader is shown the
                              source's own words, so it is declared rather than
                              wrapped and forgotten (e2e/urdu-no-leak.spec.ts). */}
                          {saint.born && (
                            <span>
                              {t('born')}: <DateAsRecorded value={saint.born} />
                            </span>
                          )}
                          {saint.died && (
                            <span>
                              {t('died')}: <DateAsRecorded value={saint.died} />
                            </span>
                          )}
                          {/* The same marker the figure's own page shows. A
                              member list that prints "1680" for Bulleh Shah
                              beside a member whose year is exact invites the
                              reader to compare two numbers of different kinds. */}
                          {(() => {
                            const precision = figurePrecisionMarker(saint);
                            return precision ? (
                              <span
                                className="entity-date-precision"
                                title={t('figurePrecisionHelp')}
                              >
                                {t(precision.labelKey)}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      )}

                      {/* A figure can hold more than one silsila, and the
                          archive's sources say so for twenty of them. Each of
                          these is its own quoted edge, not an inference. */}
                      {alsoIn.length > 0 && (
                        /* Tags rather than inline links, matching the shrine
                           tags directly beneath. These were cobalt links in a
                           run of muted-brown prose, separated by a middot:
                           1.26:1 against the surrounding text and no
                           underline, so the only thing marking them as links
                           was hue — invisible to a reader with deuteranopia
                           and to anyone on a washed-out screen (WCAG 1.4.1,
                           caught by axe's link-in-text-block once the sweep
                           stopped racing the fade-in). Underlining was the
                           obvious fix and the wrong one: an underline runs
                           straight through the descenders of Nastaliq, and
                           this line is Urdu half the time. A pill carries its
                           own border and ground, so it reads as a control in
                           either script and in monochrome. */
                        <div className="entity-saint-also-in">
                          <span className="entity-saint-also-in-label">{t('orderAlsoIn')}:</span>
                          {alsoIn.map((other) => (
                            <Link
                              key={other.order.slug}
                              to={`/order/${other.order.slug}`}
                              className="entity-saint-order-tag"
                            >
                              {localizeOrderName(other.order, lang)}
                            </Link>
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
                              {(() => {
                                const label =
                                  shrineNames.get(shrineSlug) ??
                                  localizeShrineSlug(shrineSlug, lang);
                                // The fallback title-cases the slug, so in Urdu it is
                                // an English string: declare it rather than leave it
                                // to look translated.
                                return isRtl && /[A-Za-z]/.test(label) ? (
                                  <bdi data-latin>{label}</bdi>
                                ) : (
                                  label
                                );
                              })()}
                            </Link>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* The days this order's figures are gathered for. Hidden entirely
                when the graph records none, which no order is today — but an
                empty heading over an empty list is the one thing this section
                must never be. */}
            {observances.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('orderUrsHeading')}</h2>
                <p className="kg-section-note">{t('orderUrsNote')}</p>
                {/* Named, not hidden. The almanac gives its undated list a
                    heading of its own because the gap is as much the point as
                    the calendar is; the order page is too small for a second
                    list, so the count carries it. */}
                <ObservanceGapNote rows={observances} />
                <RecordedObservanceList rows={observances} />
              </section>
            )}

            {orderPlaces.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('orderWhereHeading')}</h2>
                <p className="kg-section-note">{t('orderWhereNote')}</p>
                <div className="order-place-list">
                  {orderPlaces.map((place) => (
                    <Link
                      key={place.slug}
                      to={`/place/${place.slug}`}
                      className="order-place-tag hover-lift"
                    >
                      <bdi>{isRtl ? translateToUrdu(place.name) : place.name}</bdi>
                      <span className="order-place-count">{fmtNum(place.count)}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {orderShrines.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('orderSitesHeading')}</h2>
                <div className="order-site-grid">
                  {orderShrines.map((shrine, i) => (
                    <Link
                      key={shrine.slug}
                      to={`/shrine/${shrine.slug}`}
                      className="order-site-card hover-lift reveal-rise"
                      style={{ '--stagger-index': i } as React.CSSProperties}
                    >
                      <ShrineImage
                        src={shrine.imageUrl}
                        alt=""
                        category={shrine.category}
                        className="order-site-img"
                        placeholderClassName="order-site-placeholder"
                        loading="lazy"
                        width={IMAGE_WIDTH.preview}
                      />
                      <span className="order-site-body">
                        <span className="order-site-name">
                          <bdi>{shrineNames.get(shrine.slug) ?? shrine.name}</bdi>
                        </span>
                        {shrine.location && (
                          <span className="order-site-location" data-latin>
                            <bdi>{shrine.location}</bdi>
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
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

        <CiteThisEntry
          kind="order"
          slug={order.slug}
          englishName={localizeOrderName(order, 'en')}
          localizedName={orderName}
        />

        <SiteFooter />
      </article>

      <ScrollToTop />
    </div>
  );
}
