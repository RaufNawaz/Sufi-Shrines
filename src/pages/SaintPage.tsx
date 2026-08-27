import React, { useMemo } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useShrineData } from '../hooks/useShrineData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { LineageView } from '../components/kg/LineageView';
import { LineageChainView } from '../components/kg/LineageChainView';
import { NetworkGraph } from '../components/kg/NetworkGraph';
import type { GraphNode } from '../components/kg/NetworkGraph';
import {
  getSaintBySlug,
  getOrderMemberships,
  getSaintObservances,
  getSaintsInOrder,
  getTeachersOf,
  getDisciplesOf,
  getLineageChain,
  recordedSilsilas,
} from '../lib/kg';
import { placesForShrine } from '../lib/data/places';
import { ShrineImage } from '../components/ui/ShrineImage';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { readRecordedObservances } from '../lib/data/recordedObservances';
import { biographyForFigure } from '../lib/data/figureBiography';
import { ProseParagraphs } from '../components/shrine/ProseParagraphs';
import { localizeProseDigits } from '../lib/i18n/numerals';
import {
  ObservanceGapNote,
  RecordedObservanceList,
  type RecordedObservanceRow,
} from '../components/kg/RecordedObservanceList';
import { translateToUrdu as translatePlaceName } from '../lib/i18n/urduFallback';
import { translateToUrdu } from '../lib/i18n/urduFallback';
import {
  localizeAltName,
  localizeFigureName,
  localizeOrderName,
  localizeShrineSlug,
} from '../lib/i18n/localizeKgName';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { tFn } from '../lib/i18n/uiStrings';
import { buildAlmanac } from '../lib/data/almanac';
import { formatDateWindow } from '../lib/i18n/formatDateWindow';
import { figureGroup, figureGroupLabelSingular, isProseFigureType } from '../lib/data/figureType';
import { figurePrecisionMarker } from '../lib/data/figurePrecision';
import { figureProvenance } from '../lib/data/figureProvenance';
import { disputedFieldLabelKey } from '../lib/data/figureDates';
import { localizeRecordedDate } from '../lib/i18n/localizeRecordedDate';

import { isRtlLang } from '../lib/i18n/languages';
export default function SaintPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, fmtNum, localizeField, numerals } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const { shrines } = useShrineData();

  const saint = useMemo(() => (slug ? getSaintBySlug(slug) : undefined), [slug]);
  const figureBucket = useMemo(() => figureGroup(saint?.figureType), [saint?.figureType]);
  /*
   * Every silsila this figure is recorded in, not the first one found.
   *
   * `getOrderForSaint` returns a single order, and for 11 figures in the graph
   * that silently discarded a second or third affiliation — each of which is
   * its own edge with its own quoted source, never an inference from the
   * others. The absurd part was that `/order/:slug` already showed those
   * figures an "Also in" row, so a compound allegiance was visible from the
   * order's page and invisible on the person's own. It also carried the branch,
   * the source's verbatim silsila wording and the reviewed flag, none of which
   * had anywhere to be rendered.
   *
   * The first membership stays the one that seeds the lineage tree and the
   * network diagram, both of which take a single order.
   */
  const memberships = useMemo(() => (slug ? getOrderMemberships(slug) : []), [slug]);
  const order = memberships[0]?.order;
  const recorded = useMemo(() => recordedSilsilas(memberships), [memberships]);
  const orderMembers = useMemo(() => (order ? getSaintsInOrder(order.slug) : []), [order]);
  const teachers = useMemo(() => (slug ? getTeachersOf(slug) : []), [slug]);
  const disciples = useMemo(() => (slug ? getDisciplesOf(slug) : []), [slug]);
  /* The chain above this figure, walked as far as the record goes without
     picking between several recorded masters. 15 figures in the graph have one
     two or more removes deep; the page used to stop at the first hop. */
  const chain = useMemo(() => (slug ? getLineageChain(slug) : null), [slug]);

  // Shrine names in the reader's language, from the live dataset. The slug
  // fallback is for a shrine the graph knows but the sheet has dropped.
  const shrineMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of shrines) m.set(s.slug, localizeShrineName(s, lang));
    return m;
  }, [shrines, lang]);

  const shrineLabel = (slug: string) => shrineMap.get(slug) ?? localizeShrineSlug(slug, lang);

  // Pinned to the day so the memo below does not rebuild on every render.
  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  /*
   * The next ʿurs kept for this figure.
   *
   * The almanac already links each observance to the figure it commemorates;
   * this is the other direction, which is the one a reader arriving from a
   * lineage view wants — "when do people gather for this saint?". Built from
   * only this figure's own shrines, so it is a handful of rows through the same
   * `buildAlmanac` the almanac page uses rather than a second implementation of
   * Hijri projection.
   */
  const nextUrs = useMemo(() => {
    if (!saint) return null;
    const own = shrines.filter((shrine) => saint.shrines.includes(shrine.slug));
    if (own.length === 0) return null;
    return buildAlmanac(own, today).dated[0] ?? null;
  }, [saint, shrines, today]);

  /* The shrine records themselves, not just their names: the place a figure
     rests in, and the observance cell kept there, both live on the row. */
  const shrineRecords = useMemo(() => {
    const m = new Map<string, (typeof shrines)[number]>();
    for (const shrine of shrines) m.set(shrine.slug, shrine);
    return m;
  }, [shrines]);

  /* Every day kept for this figure, dated or not.
   *
   * `nextUrs` above answers "when is the next one", which is silent for every
   * figure whose observance the archive records without a date — and that is
   * most of them. Dargah Pir Ratan Nath Jee records "Maha Shivratri" and the
   * figure's page showed nothing at all. Same reader, same records, same
   * component as the order pages (RecordedObservanceList), so the two surfaces
   * cannot drift on how they say "date not recorded". */
  const observances = useMemo<RecordedObservanceRow[]>(() => {
    if (!slug) return [];
    return getSaintObservances(slug).map((event) => {
      const shrineSlug = event.shrineSlug;
      const shrine = shrineSlug ? shrineRecords.get(shrineSlug) : undefined;
      return {
        key: event.id,
        // No `figure`: this page is that figure, and a row repeating the name
        // in the heading above it tells the reader nothing.
        shrineSlug,
        // The map, not the `shrineLabel` closure: a memo whose dependency is a
        // function redefined every render is a memo that never memoises.
        shrineLabel: shrineSlug
          ? (shrineMap.get(shrineSlug) ?? localizeShrineSlug(shrineSlug, lang))
          : undefined,
        frequency: event.frequency,
        ...readRecordedObservances(shrine),
      };
    });
  }, [slug, shrineRecords, shrineMap, lang]);

  /* The entry's own account of this figure's life.
   *
   * 48 of the 169 entries carry an explicitly biographical section and it
   * rendered only on the shrine page — the largest body of real biographical
   * prose the archive holds, on the pages least likely to be read for it. The
   * guard is in `figureBiography.ts`, where a test can hold it: an entry may
   * speak for the figure it is about and for no one else, and a heading is a
   * life only if the classification says so in the reader's own language.
   *
   * `localizeField` is what makes the Urdu view safe rather than a wall of
   * untranslated English: it returns the Urdu Description where one exists, and
   * where one does not it returns the English, whose Latin headings the Urdu
   * classifier rejects — so the reader is shown nothing instead of a page they
   * cannot read (i18n rule 7). */
  const biographies = useMemo(() => {
    if (!slug) return [];
    return biographyForFigure(
      slug,
      shrines,
      (shrine) => localizeField(shrine.raw, 'Description'),
      lang,
    );
  }, [slug, shrines, localizeField, lang]);

  /* Where the figure rests. The graph has tied every one of the 169 entries to
     a place through `located_in` since the place vocabulary landed, and the
     figure pages were the surface that never asked: this page could name three
     titles and not the city. The recorded Location rides with it, verbatim —
     for several rows that cell is a paragraph saying what the survey did not
     record, which is the most honest thing on the page. */
  const restingPlaces = useMemo(() => {
    if (!saint) return [];
    return saint.shrines
      .map((shrineSlug) => shrineRecords.get(shrineSlug))
      .filter((shrine): shrine is NonNullable<typeof shrine> => Boolean(shrine))
      .map((shrine) => ({
        shrine,
        places: placesForShrine(shrine),
      }))
      .filter((row) => row.places.length > 0 || Boolean(row.shrine.location));
  }, [saint, shrineRecords]);

  /* The absences, named.
   *
   * `/about` computes what the archive does not know and puts it on the page,
   * on the argument that a page cannot go stale the way a sentence can. This is
   * the same move at the scale of one figure, and it is what turns a page
   * carrying a name and three titles into a page that tells a reader something:
   * the gap is information, and it is the kind a source or a field visit can
   * close.
   *
   * Every line is an absence in *this archive's record*, never a claim that no
   * such fact exists — "No teacher." means nobody has written one down here, and
   * the note above the list says exactly that. Getting that distinction wrong
   * would turn a gap into an assertion about a person's life (RULE 2).
   */
  const gaps = useMemo(() => {
    if (!saint) return [];
    const keys: string[] = [];
    if (!saint.born && !saint.died) keys.push('saintGapDates');
    if (memberships.length === 0) keys.push('saintGapOrder');
    if (teachers.length === 0) keys.push('saintGapTeachers');
    if (disciples.length === 0) keys.push('saintGapDisciples');
    if (observances.length === 0) keys.push('saintGapObservance');
    // Only claimable where the archive actually holds the site: a figure whose
    // shrine the sheet has dropped has no photograph *and* no entry, and saying
    // "no photograph" about a site that is not here would be the wrong gap.
    const own = saint.shrines.map((slug) => shrineRecords.get(slug)).filter(Boolean);
    if (own.length > 0 && own.every((shrine) => !shrine?.imageUrl)) keys.push('saintGapPhoto');
    return keys;
  }, [saint, memberships, teachers, disciples, observances, shrineRecords]);

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
  const isRtl = isRtlLang(lang);
  /*
   * A recorded date, read in Urdu.
   *
   * The dictionary first, for a value it carries whole; then the Hijri month
   * and calendar marker, which no whole-string lookup will ever match — the
   * archive holds "11 Rabīʿ al-Sānī 729 AH", "16 Rabi ul Awal 1024 Hijri" and
   * 43 other spellings of dates no two sources write the same way. Without the
   * second step the Urdu view showed "۱۱ Rabīʿ al-Sānī ۷۲۹ AH": Eastern digits
   * around a Latin month, which is worse than either language on its own.
   */
  const localizeDate = (value: string | undefined) =>
    value && isRtl ? localizeRecordedDate(translateToUrdu(value), lang) : value;
  const born = localizeDate(saint.born);
  const died = localizeDate(saint.died);
  const era = localizeDate(saint.era);
  const orderDescription = order && (isRtl ? order.descriptionUr : order.description);

  /* How precise these dates are, where the record says imprecise and the date
     string does not say so itself. 23 figures were shown bare years the data
     calls circa, range, century or disputed — a number nobody can tell is an
     approximation, which is the one thing this archive is not supposed to do. */
  const precision = figurePrecisionMarker(saint);

  /* Where the values on this page came from, and whether the archive holds an
     entry for this figure at all. Both are fields the graph has carried all
     along: 97 figures show machine-read dates and titles that no person has
     checked, and 60 are here only because someone else's lineage names them. */
  const provenance = figureProvenance(saint);

  return (
    <div className="page-enter entity-page-wrapper">
      <EntityPageHeader title={displayName} />

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
              {/* A figure the Urdu dictionary does not carry comes back as the
                  name the source recorded (RULE 2 — never transliterate
                  character by character). That is data, not interface copy, so
                  it is declared and bidi-isolated like every other recorded
                  name on the page. Widening e2e/urdu-no-leak.spec.ts to a
                  figure outside the dictionary is what surfaced this: the two
                  saint pages it already scanned both happened to have
                  translated names, so the title of every other figure's page
                  was an undeclared Latin run. */}
              <bdi data-latin>{displayName}</bdi>
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
          <bdi data-latin>{displayName}</bdi>
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
              <li key={title} className="entity-title-chip" data-latin>
                {/* Honorifics go through the dictionary like every other name,
                    and <bdi> when they come back unchanged — "teacher of
                    teachers" is a gloss from a source, not interface copy, and
                    a Latin run needs isolating inside RTL text either way. */}
                <bdi>{localizeAltName(title, lang)}</bdi>
              </li>
            ))}
          </ul>
        )}

        {/* Meta row */}
        <div className="entity-meta">
          {born && (
            <span className="entity-meta-item">
              <span aria-label={t('born')}>{t('born')}:</span>{' '}
              {/* A recorded date can be a phrase the dictionary only partly
                  covers — "11 Rabīʿ al-Sānī 729 AH" comes back with Eastern
                  digits and a Latin month, because the month name is the
                  source's word and this archive does not invent one. Declared
                  and isolated, like a citation. */}
              <bdi data-latin>{fmtNum(born)}</bdi>
            </span>
          )}
          {died && (
            <span className="entity-meta-item">
              <span aria-label={t('died')}>{t('died')}:</span>{' '}
              {/* A recorded date can be a phrase the dictionary only partly
                  covers — "11 Rabīʿ al-Sānī 729 AH" comes back with Eastern
                  digits and a Latin month, because the month name is the
                  source's word and this archive does not invent one. Declared
                  and isolated, like a citation. */}
              <bdi data-latin>{fmtNum(died)}</bdi>
            </span>
          )}
          {era && (
            <span className="entity-meta-item">
              <span aria-label={t('era')}>{t('era')}:</span>{' '}
              {/* A recorded date can be a phrase the dictionary only partly
                  covers — "11 Rabīʿ al-Sānī 729 AH" comes back with Eastern
                  digits and a Latin month, because the month name is the
                  source's word and this archive does not invent one. Declared
                  and isolated, like a citation. */}
              <bdi data-latin>{fmtNum(era)}</bdi>
            </span>
          )}
          {precision && (
            /* Beside the dates, not in a footnote. `title` carries the longer
               explanation the way the other qualifying chips on this page do. */
            <span
              className="entity-meta-item entity-date-precision"
              title={t('figurePrecisionHelp')}
            >
              {t(precision.labelKey)}
            </span>
          )}
          {saint.lineageOnly && (
            /* Above the fold, because it governs how everything else on the
               page should be read. For these figures the meta row is otherwise
               empty — no dates, no order, no ʿurs — and an empty row was the
               only sign the archive had nothing of its own on them. */
            <span
              className="entity-meta-item entity-lineage-only"
              title={t('figureLineageOnlyHelp')}
            >
              {t('figureLineageOnly')}
            </span>
          )}
          {memberships.map(({ order: o }) => (
            <span key={o.slug} className="entity-meta-item">
              <Link to={`/order/${o.slug}`} className="order-badge">
                {localizeOrderName(o, lang)}
              </Link>
            </span>
          ))}
          {nextUrs && (
            <span className="entity-meta-item">
              {t('saintNextUrs')}:{' '}
              {formatDateWindow(nextUrs.window, lang, fmtNum, {
                monthOnly: nextUrs.observance.precision === 'month',
              })}
              {/* A Hijri-derived date moves with the moon sighting. Saying so
                  is the difference between a date and a forecast. */}
              {nextUrs.approximate && (
                <span
                  className="almanac-flag almanac-flag--approximate entity-urs-flag"
                  title={t('almanacApproximateFull')}
                >
                  {t('almanacApproximate')}
                </span>
              )}
              <Link to="/almanac" className="entity-urs-link">
                {t('saintNextUrsLink')}
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
                {/* The recorded key was printed verbatim — "born", "died",
                    "floruit" — which in English is an unlabelled lowercase token
                    mid-article and in Urdu is undeclared English. Labelled where
                    the key is one this page already names; shown as recorded
                    source text where the key is the data's own compound
                    ("era / died"), because inventing a translation for that
                    would be inventing content. */}
                <span className="entity-disputed-field">
                  {(() => {
                    const labelKey = disputedFieldLabelKey(d.field);
                    return labelKey ? t(labelKey) : <bdi data-latin>{d.field}</bdi>;
                  })()}
                </span>
                <span className="entity-disputed-values">
                  {d.values.map((v, i) => (
                    <React.Fragment key={v}>
                      {i > 0 && <span className="entity-disputed-vs">{t('disputedVersus')}</span>}
                      {/* Each competing value is a recorded date too, and
                          several carry a Hijri month or an era marker. Declared,
                          because most of them also carry the source's own
                          qualification in English — "survivors of Karbala, 61
                          AH (shrine's traditional founding date about 63 AH)" —
                          and that clause is the honest part of the row. */}
                      <span className="entity-disputed-value" data-latin>
                        <bdi>{fmtNum(localizeRecordedDate(v, lang))}</bdi>
                      </span>
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
                {/* Per-item, through the dictionary, each isolated. Joined
                    into one string it was a single Latin run inside RTL prose:
                    the bidi algorithm reordered the middot-separated names, and
                    a name the dictionary *does* carry stayed English because
                    nothing localised the parts. `data-latin` declares the
                    remainder as untranslated source text rather than leaving
                    the guard to guess. */}
                <p data-latin>
                  {saint.altNames.map((alt, i) => (
                    <React.Fragment key={alt}>
                      {i > 0 && <span aria-hidden="true"> · </span>}
                      <bdi>{localizeAltName(alt, lang)}</bdi>
                    </React.Fragment>
                  ))}
                </p>
              </section>
            )}

            {/* Description */}
            {saint.description && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('description')}</h2>
                <p>{saint.description}</p>
              </section>
            )}

            {/* Sufi order(s) — the figure's whole recorded affiliation, with
                the evidence for each. One row per membership, so a compound
                silsila reads as two sourced claims rather than one tidy
                answer. */}
            {memberships.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">
                  {memberships.length > 1 ? t('sufiOrders') : t('sufiOrder')}
                </h2>
                {memberships.length > 1 && <p className="kg-section-note">{t('orderMultiHelp')}</p>}
                <ul className="entity-order-list">
                  {memberships.map((membership) => {
                    const o = membership.order;
                    return (
                      <li key={o.slug} className="entity-order-item">
                        <div className="entity-order-row">
                          <Link to={`/order/${o.slug}`} className="order-badge">
                            {localizeOrderName(o, lang)}
                            {/* In Urdu the badge already carries the
                                Arabic-script name, so appending it would repeat
                                the same word. */}
                            {o.arabicName && !isRtl && (
                              <>
                                {' '}
                                · <span lang="ar">{o.arabicName}</span>
                              </>
                            )}
                          </Link>
                          {membership.branch && (
                            <span
                              className="order-branch-chip"
                              title={t('orderBranchHelp')}
                              data-latin
                            >
                              <bdi>{membership.branch}</bdi>
                            </span>
                          )}
                          {!membership.reviewed && (
                            <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
                              {t('lineageUnreviewed')}
                            </span>
                          )}
                        </div>
                        {membership.quote && (
                          /* Latin in either language, on purpose: the evidence
                             for an unreviewed claim has to stay quotable
                             (i18n rule 7). */
                          <blockquote
                            className="graph-lineage-quote"
                            lang="en"
                            dir="ltr"
                            data-latin
                          >
                            {membership.quote}
                            {membership.source && (
                              <cite className="graph-lineage-cite">{membership.source}</cite>
                            )}
                          </blockquote>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {/* The source's own words for this figure's silsila, once. This
                    is where the archive's editorial standard actually lands:
                    one of these cells reads "Qadri (see year_built_note /
                    Description for a discrepancy in how the survey names his
                    order)", and that parenthesis is better content than the
                    clean badge above it. */}
                {recorded.length > 0 && (
                  <p className="entity-order-as-recorded">
                    <span
                      className="entity-order-as-recorded-label"
                      title={t('orderAsRecordedHelp')}
                    >
                      {t('orderAsRecorded')}:
                    </span>{' '}
                    {recorded.map((value, i) => (
                      <React.Fragment key={value}>
                        {i > 0 && <span aria-hidden="true"> · </span>}
                        <bdi data-latin>{value}</bdi>
                      </React.Fragment>
                    ))}
                  </p>
                )}
                {orderDescription && <p className="entity-order-description">{orderDescription}</p>}
              </section>
            )}

            {/* Where this figure rests — place, then the Location as recorded. */}
            {restingPlaces.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('saintPlaceHeading')}</h2>
                <p className="kg-section-note">{t('saintPlaceNote')}</p>
                <ul className="saint-place-list">
                  {restingPlaces.map(({ shrine, places }) => (
                    <li key={shrine.slug} className="saint-place-row">
                      {places.length > 0 && (
                        <div className="order-place-list">
                          {places.map((place) => (
                            <Link
                              key={place.slug}
                              to={`/place/${place.slug}`}
                              className="order-place-tag hover-lift"
                            >
                              <bdi>{isRtl ? translatePlaceName(place.name) : place.name}</bdi>
                            </Link>
                          ))}
                        </div>
                      )}
                      {shrine.location && (
                        /* The survey's own words. Often still English, and often
                           a paragraph of qualification rather than an address —
                           declared rather than tidied (RULE 2). */
                        <p className="saint-place-recorded" data-latin>
                          <span className="order-urs-recorded-label">
                            {t('almanacSourceLabel')}:{' '}
                          </span>
                          <bdi>{shrine.location}</bdi>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── The life, in the entry's own words ──────────────────────
                Attributed to the entry it came from, visibly and by link, and
                keeping that entry's own heading: "The Life of the Poet-Saint"
                is the archive's wording, and flattening it to "Biography" would
                throw away the one thing that says who wrote it and about
                whom. */}
            {biographies.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('saintBiographyHeading')}</h2>
                <p className="kg-section-note">{t('saintBiographyNote')}</p>
                {biographies.map((entry) => (
                  <article key={`${entry.shrine.slug}-${entry.heading}`} className="figure-life">
                    <h3 className="figure-life-heading">{entry.heading}</h3>
                    {/* The whole attribution is the link's text, not "From" plus
                        a name: where the phrase's operands sit is a fact about
                        the language, and `noSentenceFragments.test.ts` is right
                        to refuse the assembled version. */}
                    <Link to={`/shrine/${entry.shrine.slug}`} className="figure-life-source">
                      {tFn(lang, 'saintBiographyFrom', localizeShrineName(entry.shrine, lang))}
                    </Link>
                    <div className="figure-life-prose">
                      {/* The same digit localization the shrine article gives
                          this exact prose. Without it the Urdu view reads
                          "1722" mid-Nastaliq — the one place Eastern numerals
                          never reached, and the reason `localizeProseDigits`
                          exists. URLs, DOIs and ISBNs keep Western digits. */}
                      <ProseParagraphs
                        text={entry.content}
                        localize={(text) => localizeProseDigits(text, lang, numerals === 'eastern')}
                      />
                    </div>
                  </article>
                ))}
              </section>
            )}

            {/* Days kept for this figure — all of them, dated or not. */}
            {observances.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('saintObservancesHeading')}</h2>
                <p className="kg-section-note">{t('saintObservancesNote')}</p>
                <ObservanceGapNote rows={observances} />
                <RecordedObservanceList rows={observances} />
              </section>
            )}

            {/* Associated shrines — the site, photographed.
                The list was a pin glyph and a name. A figure has no portrait in
                this archive and inventing one is out of the question, but the
                shrine that holds them is photographed for 118 of the 169
                entries, and that photograph is the closest thing to a face the
                record can honestly show. The order pages' member list already
                made this argument; the figure's own page was the surface still
                showing nothing. Same `order-site-*` idiom, so the two read as
                one design rather than two. */}
            {saint.shrines.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('shrinesAssociated')}</h2>
                <div className="order-site-grid">
                  {saint.shrines.map((shrineSlug, i) => {
                    const shrine = shrineRecords.get(shrineSlug);
                    return (
                      <Link
                        key={shrineSlug}
                        to={`/shrine/${shrineSlug}`}
                        className="order-site-card hover-lift reveal-rise"
                        style={{ '--stagger-index': i } as React.CSSProperties}
                      >
                        {/* Falls back to the tradition's own glyph, which is what
                            the sidebar list and the related-shrine cards already
                            do for an entry with no photograph. */}
                        <ShrineImage
                          src={shrine?.imageUrl ?? null}
                          alt=""
                          category={shrine?.category ?? ''}
                          className="order-site-img"
                          placeholderClassName="order-site-placeholder"
                          loading="lazy"
                          width={IMAGE_WIDTH.preview}
                        />
                        <span className="order-site-body">
                          <span className="order-site-name">
                            <bdi>{shrineLabel(shrineSlug)}</bdi>
                          </span>
                          {shrine?.location && (
                            /* The survey's own wording, often still English. */
                            <span className="order-site-location" data-latin>
                              <bdi>{shrine.location}</bdi>
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
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
                {/* The chain, after the neighbourhood. A silsila read from the
                    inside is "who linked whom to whom", and only the first link
                    of that was on the page. */}
                {chain && chain.steps.length > 0 && (
                  <>
                    <h3 className="lineage-chain-heading">{t('lineageChainHeading')}</h3>
                    <LineageChainView chain={chain} />
                  </>
                )}
              </section>
            )}

            {/* What the archive does not record. Deliberately *after* everything
                it does — a reader should meet the record before its gaps. */}
            {gaps.length > 0 && (
              <section className="kg-section">
                <h2 className="kg-section-heading">{t('saintGapsHeading')}</h2>
                <p className="kg-section-note">{t('saintGapsNote')}</p>
                <ul className="figure-gap-list">
                  {gaps.map((key) => (
                    <li key={key} className="figure-gap-item">
                      {t(key as Parameters<typeof t>[0])}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Sources & provenance — the same heading a shrine page uses, for
                the same reason: a reader should be able to ask "how does the
                archive know this?" on any page and find the answer in the same
                place. Nothing renders for the 42 figures whose values were
                typed in from the survey; absence here means hand-entered,
                which is the strongest provenance the archive has. */}
            {provenance.length > 0 && (
              <section className="kg-section figure-provenance">
                <h2 className="kg-section-heading">{t('sourcesHeading')}</h2>
                {provenance.map((note) =>
                  note.kind === 'lineage-only' ? (
                    <p key="lineage-only" className="figure-provenance-row">
                      {t('figureLineageOnlyNote')}
                    </p>
                  ) : (
                    <div key="biography" className="figure-provenance-row">
                      <p>
                        {t('figureBiographyNote')}{' '}
                        {!note.reviewed && (
                          /* The same chip the lineage links and the order
                             memberships on this page already carry. A figure's
                             own dates were the one machine-read claim shown
                             without it. */
                          <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
                            {t('lineageUnreviewed')}
                          </span>
                        )}
                      </p>
                      {note.source && (
                        <p className="figure-provenance-source">
                          <span className="figure-provenance-label">
                            {t('figureProvenanceReadFrom')}:
                          </span>{' '}
                          {/* A dataset fragment is an entry slug, so it links —
                              and for three figures it links to an entry that is
                              *not* one of their own shrines, which is exactly
                              the thing worth being able to check. The link is
                              offered only when that entry is still in the live
                              data; otherwise the reference is printed as
                              recorded rather than pointing at a 404. */}
                          {note.source.shrineSlug && shrineMap.has(note.source.shrineSlug) ? (
                            <Link
                              to={`/shrine/${note.source.shrineSlug}`}
                              className="meta-entity-link"
                            >
                              {shrineLabel(note.source.shrineSlug)}
                            </Link>
                          ) : (
                            /* A repository path, in either language: it is a
                               citable location, and an archive that claims
                               provenance leaves the reader an exact string to
                               look for (i18n rule 7). */
                            <bdi data-latin>{note.source.raw}</bdi>
                          )}
                        </p>
                      )}
                    </div>
                  ),
                )}
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
            <div className="entity-infobox-title">
              <bdi data-latin>{displayName}</bdi>
            </div>
            <div className="entity-infobox-body">
              {saint.altNames?.[0] && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('alsoKnownAs')}</span>
                  <span className="entity-infobox-value" data-latin>
                    <bdi>{localizeAltName(saint.altNames[0], lang)}</bdi>
                  </span>
                </div>
              )}
              {born && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('born')}</span>
                  <span className="entity-infobox-value" data-latin>
                    <bdi>{fmtNum(born)}</bdi>
                  </span>
                </div>
              )}
              {died && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('died')}</span>
                  <span className="entity-infobox-value" data-latin>
                    <bdi>{fmtNum(died)}</bdi>
                  </span>
                </div>
              )}
              {era && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('era')}</span>
                  <span className="entity-infobox-value" data-latin>
                    <bdi>{fmtNum(era)}</bdi>
                  </span>
                </div>
              )}
              {memberships.length > 0 && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">
                    {memberships.length > 1 ? t('sufiOrders') : t('sufiOrder')}
                  </span>
                  <span className="entity-infobox-value">
                    {memberships.map(({ order: o }, i) => (
                      <React.Fragment key={o.slug}>
                        {i > 0 && <span aria-hidden="true"> · </span>}
                        <Link to={`/order/${o.slug}`} className="meta-entity-link">
                          {localizeOrderName(o, lang)}
                        </Link>
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              )}
              {saint.shrines.length > 0 && (
                <div className="entity-infobox-row">
                  <span className="entity-infobox-label">{t('shrinesAssociated')}</span>
                  {/* fmtNum, like every other number site — this one rendered a
                      Western digit inside the Urdu infobox (i18n rule 5). */}
                  <span className="entity-infobox-value">{fmtNum(saint.shrines.length)}</span>
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

        <SiteFooter />
      </article>

      <ScrollToTop />
    </div>
  );
}
