import React, { useMemo, useState } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { Sheet } from '../components/ui/Sheet';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { NetworkGraph } from '../components/kg/NetworkGraph';
import type { GraphNode } from '../components/kg/NetworkGraph';
import {
  getKGStore,
  getSaintsInOrder,
  getAllLineageEdges,
  getArchiveFigures,
  getLineageOnlyFigures,
  getDisciplesOf,
  getTeachersOf,
  getKinOf,
} from '../lib/kg';
import type { KinLink } from '../lib/kg';
import {
  FIGURE_GROUP_ORDER,
  figureGroup,
  figureGroupLabel,
  isProseFigureType,
} from '../lib/data/figureType';
import type { FigureGroup } from '../lib/data/figureType';
import type { KGSaint } from '../types/kg';
import { localizeFigureName, localizeOrderName } from '../lib/i18n/localizeKgName';
import { KIN_ROLE_KEYS } from '../lib/data/kinRoles';
import { renderInlineBold } from '../components/shrine/inlineFormat';
import { figureImage } from '../lib/kgFigureImages';
import { useFigureImages } from '../hooks/useFigureImages';
import { localizeRecordedName } from '../lib/i18n/localizeRecordedName';
import { t, tFn } from '../lib/i18n/uiStrings';
import { buildFigureIndex, matchFigures } from '../lib/data/figureSearch';
import { centurySpan, figureCentury } from '../lib/data/figureDates';
import { CENTURY_ORDINAL } from '../lib/data/era';
import type { Lang } from '../types/shrine';

import { isRtlLang } from '../lib/i18n/languages';
import { hasProjectAccess } from '../lib/projectAccess';
/**
 * A standalone knowledge-graph explorer: browse every Sufi order, see its
 * saints as a network (reusing the same NetworkGraph used on SaintPage),
 * and jump to any saint's own lineage view. PROJECT_VISION.md Track 2 asks
 * for this as a dedicated page rather than only the per-saint embed.
 */
/** The ordinal alone; the noun comes from the span string. Same helper as
 * OrderPage, kept local because it is two lines and importing a component's
 * private formatter across pages is worse. */
function centuryLabel(century: number, lang: Lang): string {
  return CENTURY_ORDINAL[lang](century);
}

/**
 * "teacher of X and 3 more", "disciple of Y", or "father of Z".
 *
 * All three directions, because the graph connects these figures three ways and
 * a note that assumes one leaves the rest of the roster a bare name. That has
 * now happened twice: the first draft assumed everyone here was somebody's
 * teacher and left 17 disciples blank, and the kinship pass of 29 August 2026
 * added eight more who are named as somebody's father, uncle or forebear and
 * appear in no chain at all — Sri Chand, whom four Udasi darbars in this
 * archive invoke without one recorded discipleship, among them.
 *
 * A function rather than a ternary in the JSX because the six string keys differ
 * in arity, and picking the wrong pair silently renders "teacher of undefined".
 */
/** Teachers shown before "Show all". */
const LINEAGE_PREVIEW = 8;

function lineageOnlyNote(lang: Lang, direction: 'teacher' | 'disciple', people: KGSaint[]): string {
  const first = localizeFigureName(people[0], lang);
  const others = people.length - 1;
  if (direction === 'teacher') {
    return others > 0
      ? tFn(lang, 'graphLineageOnlyTeacherOfMore', first, others)
      : tFn(lang, 'graphLineageOnlyTeacherOf', first);
  }
  return others > 0
    ? tFn(lang, 'graphLineageOnlyDiscipleOfMore', first, others)
    : tFn(lang, 'graphLineageOnlyDiscipleOf', first);
}

/** The kin form: what THIS figure is to the person they are recorded with —
 * `selfRole`, not `role`, which names the other end. */
function kinOnlyNote(lang: Lang, links: KinLink[]): string | undefined {
  const [first, ...rest] = links;
  const roleKey = KIN_ROLE_KEYS[first.selfRole];
  if (!roleKey) return undefined;
  const role = t(lang, roleKey);
  const name = localizeFigureName(first.saint, lang);
  return rest.length > 0
    ? tFn(lang, 'graphLineageOnlyKinOfMore', role, name, rest.length)
    : tFn(lang, 'graphLineageOnlyKinOf', role, name);
}

export default function GraphPage() {
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  /* Public vs team view (HANDOVER §9.183): the `unreviewed` chips, their count
     in the section note, and the repository path under each quote are the
     desk's apparatus. The quotes themselves stay — they are what a reader
     checks a lineage against. */
  const teamView = hasProjectAccess();
  const headingRef = useFocusHeadingOnMount();
  const kg = useMemo(() => getKGStore(), []);
  const [activeOrderSlug, setActiveOrderSlug] = useState<string | null>(kg.orders[0]?.slug ?? null);
  const [figureQuery, setFigureQuery] = useState('');
  /* Which lineage rows show their source line (9 October 2026): the quotation
     is evidence, and evidence is read on demand rather than printed under
     every row of a list. */
  const [openSources, setOpenSources] = React.useState<Set<string>>(() => new Set());
  const toggleSource = (key: string) =>
    setOpenSources((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  /* `null` is "any century"; the string 'undated' is the explicit bucket for
     figures the record does not date. A sentinel rather than a number because
     "no century" is an answer here, not an absence — 63 of the 136 figures the
     archive documents are in it. */
  const [centuryFilter, setCenturyFilter] = useState<number | 'undated' | null>(null);
  const [lineageScope, setLineageScope] = useState<'order' | 'all'>('order');
  /* The lineage accordion: which teachers are open, whether the first (open on
     arrival) has been closed, the type-to-narrow query, and whether the list
     shows past its first eight teachers. */
  const [openTeachers, setOpenTeachers] = useState<Set<string>>(() => new Set());
  const [closedFirst, setClosedFirst] = useState(false);
  const [lineageQuery, setLineageQuery] = useState('');
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  /* Which figure index is open as a sheet, if either. */
  const [figureSheet, setFigureSheet] = useState<'archive' | 'lineage' | null>(null);
  const closeFigureSheet = React.useCallback(() => setFigureSheet(null), []);

  useDocumentTitle(`${t('graphExplorerTitle')} — ${t('siteTitle')}`);
  /* Pictures for the diagram's nodes; fetched on demand, re-renders on arrival. */
  useFigureImages();

  const activeOrder = kg.orders.find((o) => o.slug === activeOrderSlug) ?? null;
  const orderDescription =
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: orders carry an Urdu-only descriptionUr sibling; a per-language record is a data migration
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
  /* The picture is of the figure's *shrine*, not of the figure — the archive
     holds no portraits — so `imageOf` names the site and the preview says so.
     101 of 191 figures have one; the rest keep the plain circle. */
  const connectedNodes: GraphNode[] = orderSaints.map((s) => {
    const picture = figureImage(s.slug);
    return {
      id: s.id,
      label: localizeFigureName(s, lang),
      type: 'saint' as const,
      href: `/saint/${s.slug}`,
      century: figureCentury(s),
      ...(figureCentury(s) !== null
        ? { centuryLabel: centuryLabel(figureCentury(s) as number, lang) }
        : {}),
      ...(picture
        ? { imageUrl: picture.url, imageOf: localizeRecordedName(picture.shrineName, lang) }
        : {}),
    };
  });

  const lineageEdges = useMemo(() => getAllLineageEdges(), []);

  /*
   * The lineage list, scoped to the order the chips have selected.
   *
   * The chips above filtered the network diagram and this list ignored them
   * entirely — 86 edges regardless, so the page had a filter that half of it did
   * not obey, and the half it did not obey was the long half.
   *
   * Scoped rather than filtered, and the difference matters: **28 of the 86 edges
   * belong to no order this archive records.** Guru Ram Das ← Guru Amar Das is a
   * line of teaching, not a silsila; and several Sufi teachers named inside a
   * chain have no order recorded for them. A hard filter would have silently
   * hidden a third of the archive's lineage, most of it non-Muslim — which on a
   * site whose whole claim is covering six traditions would be the worst possible
   * thing to drop quietly. So "all" stays one click away, and the count of
   * unaffiliated links is stated rather than left to be noticed.
   */
  const orderMemberSlugs = useMemo(() => new Set(orderSaints.map((s) => s.slug)), [orderSaints]);

  const scopedLineageEdges = useMemo(() => {
    if (lineageScope === 'all' || !activeOrder) return lineageEdges;
    return lineageEdges.filter(
      (edge) => orderMemberSlugs.has(edge.subject.slug) || orderMemberSlugs.has(edge.object.slug),
    );
  }, [lineageEdges, lineageScope, activeOrder, orderMemberSlugs]);

  /* The links grouped by teacher (the edge's object), most disciples first,
     then by name — the shape of a silsila rather than a flat list of pairs. */
  const lineageGroups = useMemo(() => {
    type Edge = (typeof scopedLineageEdges)[number];
    const byTeacher = new Map<string, { teacher: Edge['object']; edges: Edge[] }>();
    for (const edge of scopedLineageEdges) {
      const entry = byTeacher.get(edge.object.slug);
      if (entry) entry.edges.push(edge);
      else byTeacher.set(edge.object.slug, { teacher: edge.object, edges: [edge] });
    }
    /* One row per disciple: where the record holds two relations for the same
       pair — disciple of, and successor of — the row carries both labels and
       both quotations, rather than appearing twice. */
    return [...byTeacher.values()]
      .map((group) => {
        const rows = new Map<string, { subject: Edge['subject']; edges: Edge[] }>();
        for (const edge of group.edges) {
          const row = rows.get(edge.subject.slug);
          if (row) row.edges.push(edge);
          else rows.set(edge.subject.slug, { subject: edge.subject, edges: [edge] });
        }
        return { teacher: group.teacher, rows: [...rows.values()] };
      })
      .sort(
        (a, b) =>
          b.rows.length - a.rows.length ||
          localizeFigureName(a.teacher, lang).localeCompare(
            localizeFigureName(b.teacher, lang),
            lang,
          ),
      );
  }, [scopedLineageEdges, lang]);

  /* The first teacher is open on arrival, so its state is a flag rather than
     membership in the set. */
  const toggleTeacher = (key: string, isFirst: boolean) => {
    if (isFirst) {
      setClosedFirst((closed) => !closed);
      return;
    }
    setOpenTeachers((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Type to narrow: a teacher stays if their name or any disciple's matches. */
  const visibleLineageGroups = useMemo(() => {
    const q = lineageQuery.trim().toLocaleLowerCase();
    if (!q) return lineageGroups;
    type Figure = (typeof lineageGroups)[number]['teacher'];
    const hit = (figure: Figure) =>
      localizeFigureName(figure, lang).toLocaleLowerCase().includes(q) ||
      figure.name.toLocaleLowerCase().includes(q);
    return lineageGroups.filter(
      (group) => hit(group.teacher) || group.rows.some((row) => hit(row.subject)),
    );
  }, [lineageGroups, lineageQuery, lang]);

  /* Edges with neither endpoint in any recorded order. Computed over every order
     rather than the active one — this is a fact about the dataset, not about the
     current selection, so it must not change as the reader clicks. */
  const unaffiliatedCount = useMemo(() => {
    const affiliated = new Set<string>();
    for (const order of kg.orders) {
      for (const saint of getSaintsInOrder(order.slug)) affiliated.add(saint.slug);
    }
    return lineageEdges.filter(
      (edge) => !affiliated.has(edge.subject.slug) && !affiliated.has(edge.object.slug),
    ).length;
  }, [kg.orders, lineageEdges]);

  /*
   * The five silsilas side by side.
   *
   * The chips above let a reader look at one order at a time, which answers
   * "who is in the Chishtiyya" and never answers "how do these five compare" —
   * and comparison is most of what an explorer is for. Every figure here is
   * counted from the graph on load, so the table cannot go stale the way the
   * struck-through note in CLAUDE.md did.
   *
   * Each row says what the *archive* holds, not what the order is: the
   * Qadiriyya is not a 23-person tradition, it is a tradition of which this
   * archive documents 23 people. The note above the table says so, because a
   * table of counts invites exactly the other reading.
   *
   * There is deliberately no "places" column. It was written, and it cost 8 KB
   * of eager JS on this route — `placesForShrine` needs the live dataset, which
   * this page otherwise never loads — to derive a number the order's own page
   * already gives in full under "Where this order is", one click away. The
   * bundle budget caught it; dropping the column was the right answer, not
   * raising the number. Everything left here comes from the graph, which this
   * page already has.
   */
  const orderRows = useMemo(
    () =>
      kg.orders.map((order) => {
        const saints = getSaintsInOrder(order.slug);
        return {
          order,
          figures: saints.length,
          span: centurySpan(saints),
          sites: new Set(saints.flatMap((s) => s.shrines)).size,
        };
      }),
    [kg.orders],
  );

  /* The graph types every principal figure as `saint` because that is its only
     entity type for a person — so this list previously ran 130 names under a
     heading reading "All saints", Durga and Guru Nanak among them. Group by the
     dataset's own figure_type instead, which it fills for 168 of 169 rows.
     Sorted within a group by locale so the Urdu view collates as Urdu. */
  /* getArchiveFigures(), not kg.saints: the graph also holds ~60 figures who
     exist only as a link in someone else's lineage — teachers named in the
     prose with no shrine in this archive. Counting them here would overstate
     what the archive documents. */
  const archiveFigures = useMemo(() => getArchiveFigures(), []);
  /* Up to four pictures for the launcher row — the faces of what is inside,
     the way a shared album's row shows its first photographs. Each is a
     figure's shrine (see the note on `figureImage` above). */
  /* Not memoised: the picture index arrives after first render
     (`useFigureImages` re-renders when it does), and a memo keyed on the figure
     list would keep the empty answer from before it came. Four lookups at most. */
  const launchFaces: string[] = [];
  for (const figure of archiveFigures) {
    const url = figureImage(figure.slug)?.url;
    if (url && !launchFaces.includes(url)) launchFaces.push(url);
    if (launchFaces.length === 4) break;
  }

  const figureIndex = useMemo(() => buildFigureIndex(archiveFigures), [archiveFigures]);
  /*
   * The centuries the archive can actually place a figure in, with counts.
   *
   * Read from the recorded death year, or the birth year where no death is
   * given, and *never* converted from the Hijri calendar — `figureCentury`
   * returns null rather than guessing, which is why the undated bucket is as
   * large as it is. Only centuries with at least one figure get a chip: an empty
   * 15th-century chip would imply the archive had looked and found nothing,
   * when in fact it holds three figures it cannot date for every two it can.
   */
  const centuryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    let undated = 0;
    for (const saint of archiveFigures) {
      const century = figureCentury(saint);
      if (century === null) undated++;
      else counts.set(century, (counts.get(century) ?? 0) + 1);
    }
    return { centuries: [...counts.entries()].sort((a, b) => a[0] - b[0]), undated };
  }, [archiveFigures]);

  const centuryFiltered = useMemo(() => {
    if (centuryFilter === null) return archiveFigures;
    return archiveFigures.filter((saint) => {
      const century = figureCentury(saint);
      return centuryFilter === 'undated' ? century === null : century === centuryFilter;
    });
  }, [archiveFigures, centuryFilter]);

  const matchingFigures = useMemo(
    () => matchFigures(centuryFiltered, figureQuery, figureIndex),
    [centuryFiltered, figureIndex, figureQuery],
  );

  /*
   * The other 60 — figures named in someone else's chain with no site here.
   *
   * Kept out of every count on this page for the reason `getArchiveFigures`
   * exists, and given a list of their own for a different reason: all 60 appear
   * in a recorded lineage relation and none appears in any index, so the only
   * way to reach one was to already be walking the chain that names it. Prince
   * Dara Shikoh was among them.
   *
   * Each row says whose teacher the record calls them, which is the fact that
   * makes the name mean something to a reader who has not met it before.
   */
  const lineageOnlyFigures = useMemo(() => {
    const collator = new Intl.Collator(lang);
    /* One person, not one relation: a figure recorded as both disciple and
       successor of the same master appears twice in the relation list. */
    const people = (links: ReturnType<typeof getDisciplesOf>) => [
      ...new Map(links.map((l) => [l.saint.slug, l.saint])).values(),
    ];
    return getLineageOnlyFigures()
      .map((saint) => {
        /* Both directions, because 17 of the 60 are named as somebody's
           *disciple* rather than as a teacher — Dara Shikoh, Jahanara,
           Nizamuddin Auliya, whose dargah is in Delhi and so is rightly not an
           entry in an archive of Pakistan. Assuming they were all teachers is
           how the first draft of this left 17 rows with no note at all. */
        const disciples = people(getDisciplesOf(saint.slug));
        const teachers = disciples.length > 0 ? [] : people(getTeachersOf(saint.slug));
        /* And the third direction, for the eight who are in no chain at all:
           named as somebody's family. Read only when the chain gives nothing,
           so a figure who is both keeps the note a reader is used to. */
        const kin = disciples.length + teachers.length > 0 ? [] : getKinOf(saint.slug);
        return { saint, disciples, teachers, kin };
      })
      .sort((a, b) =>
        collator.compare(localizeFigureName(a.saint, lang), localizeFigureName(b.saint, lang)),
      );
  }, [lang]);

  const groupedFigures = useMemo(() => {
    const buckets = new Map<FigureGroup, KGSaint[]>();
    for (const saint of matchingFigures) {
      const group = figureGroup(saint.figureType);
      const list = buckets.get(group);
      if (list) list.push(saint);
      else buckets.set(group, [saint]);
    }
    const collator = new Intl.Collator(lang);
    return FIGURE_GROUP_ORDER.filter((g) => buckets.has(g)).map((group) => ({
      group,
      figures: [...buckets.get(group)!].sort((a, b) =>
        collator.compare(localizeFigureName(a, lang), localizeFigureName(b, lang)),
      ),
    }));
  }, [lang, matchingFigures]);

  return (
    <div className="page-enter entity-page-wrapper">
      <EntityPageHeader title={t('graphExplorerTitle')} />

      <article
        className="entity-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
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

        {/* The orders as cards that choose (9 October 2026): one control where
            there were a comparison table and a chip row saying the same ten
            names twice. Each card carries what the table did — figures, span,
            sites, counted from the graph on load so they cannot go stale — and
            the chosen one feeds the network below; the order's own page is one
            pill away in the section it opens. */}
        <section className="graph-page-section">
          <h2 className="section-heading">{t('orderCompareHeading')}</h2>
          <p className="graph-figures-note">{t('orderCompareNote')}</p>
          <div className="order-cards" role="group" aria-label={t('graphExplorerOrders')}>
            {orderRows.map((row) => {
              const active = activeOrderSlug === row.order.slug;
              return (
                <button
                  key={row.order.slug}
                  type="button"
                  className={`order-card${active ? ' order-card--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setActiveOrderSlug(row.order.slug)}
                >
                  <span className="order-card-name">{localizeOrderName(row.order, lang)}</span>
                  <span className="order-card-figures">
                    <span className="order-card-num">{fmtNum(row.figures)}</span>
                    <span className="order-card-label">{t('orderCompareFigures')}</span>
                  </span>
                  <span className="order-card-meta">
                    {row.span && (
                      <span>
                        {fmtNum(
                          row.span.from === row.span.to
                            ? tFn(lang, 'orderSpanOne', centuryLabel(row.span.from, lang))
                            : tFn(
                                lang,
                                'orderSpan',
                                centuryLabel(row.span.from, lang),
                                centuryLabel(row.span.to, lang),
                              ),
                        )}
                        {/* The count the span does not cover, beside the span
                            rather than in a footnote. */}
                        {row.span.undated > 0 && (
                          <span className="order-compare-undated" title={t('orderUndatedHelp')}>
                            {fmtNum(tFn(lang, 'orderUndated', row.span.undated))}
                          </span>
                        )}
                      </span>
                    )}
                    <span>
                      {fmtNum(row.sites)} {t('orderCompareSites')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {centerNode && activeOrder && (
          <section className="graph-page-section graph-order-focus">
            <div className="graph-order-head">
              <h2 className="section-heading graph-order-title">
                {localizeOrderName(activeOrder, lang)}
              </h2>
              <Link to={`/order/${activeOrder.slug}`} className="action-btn">
                {t('graphOpenOrder')}
              </Link>
            </div>
            {/* `translateToUrdu` used to be applied to this whole sentence,
                which of course missed and returned the English — the dictionary
                is keyed on names, not prose. The Urdu comes from
                `descriptionUr` in data/kg-seeds.json, and an order without one
                shows no summary rather than an English one. */}
            {orderDescription && (
              <p className="graph-order-lede" lang={isRtl ? 'ur' : undefined}>
                {orderDescription}
              </p>
            )}
            <NetworkGraph center={centerNode} connected={connectedNodes} />
          </section>
        )}

        {lineageEdges.length > 0 && (
          <section className="graph-page-section">
            <h2 className="section-heading">{t('graphLineageHeading')}</h2>
            <p className="graph-figures-note">
              {t('graphLineageNote')} {fmtNum(scopedLineageEdges.length)}
              {teamView && (
                <>
                  {' · '}
                  {fmtNum(scopedLineageEdges.filter((e) => !e.reviewed).length)}{' '}
                  {t('lineageUnreviewed')}
                </>
              )}
            </p>

            {/* Two buttons rather than a dropdown: there are two choices and both
                carry a count, which is the information a reader needs to decide. */}
            {activeOrder && (
              <div
                className="almanac-view-toggle graph-lineage-scope"
                role="group"
                aria-label={t('graphLineageScopeLabel')}
              >
                <button
                  type="button"
                  className={`filter-chip${lineageScope === 'order' ? ' active' : ''}`}
                  onClick={() => setLineageScope('order')}
                  aria-pressed={lineageScope === 'order'}
                >
                  {fmtNum(
                    tFn(
                      lang,
                      'graphLineageScopeOrder',
                      localizeOrderName(activeOrder, lang),
                      lineageEdges.filter(
                        (edge) =>
                          orderMemberSlugs.has(edge.subject.slug) ||
                          orderMemberSlugs.has(edge.object.slug),
                      ).length,
                    ),
                  )}
                </button>
                <button
                  type="button"
                  className={`filter-chip${lineageScope === 'all' ? ' active' : ''}`}
                  onClick={() => setLineageScope('all')}
                  aria-pressed={lineageScope === 'all'}
                >
                  {fmtNum(tFn(lang, 'graphLineageScopeAll', lineageEdges.length))}
                </button>
              </div>
            )}

            {/* Stated, not left to be noticed. A third of the recorded lineage
                belongs to no silsila, most of it the Sikh and Hindu chains — on a
                site covering six traditions that is the last thing that should
                disappear behind a Sufi-order filter. */}
            {unaffiliatedCount > 0 && (
              <p className="graph-figures-note">
                {fmtNum(tFn(lang, 'graphLineageUnaffiliated', unaffiliatedCount))}
              </p>
            )}
            {/* `data-latin`: many of these endpoints are figures the Urdu
                dictionary does not cover, and some are not names at all but
                descriptive phrases lifted from a source quote ("the princess
                Jahanara", "founder of the Rashidi order"). localizeFigureName
                returns the source string unchanged for those, which is correct
                — inventing an Urdu name for a figure would break RULE 2 — so the
                element declares the debt instead of hiding it. Each name is
                <bdi>-wrapped for bidi isolation, which is a separate need. */}
            {/* A tree, not a row per link (9 October 2026, Rauf: "there must be
                some better way of doing this"): one card per teacher, the
                disciples listed under them, most disciples first — which is
                the shape of a silsila. The quotation that is each link's
                evidence opens on a Source button for the public; the team,
                who read every qualification, see it open, with its citation. */}
            {/* An accordion of teachers (9 October 2026, afternoon — Rauf: "make
                the information accessible and at the same time not overload the
                person"). Each teacher is one row — name, disciple count, the
                first names — and opens to its disciples; each quotation, the
                link's evidence, opens on a Source button, for the team as well
                as the public (the team's citation and review chip come with
                it). The first teacher is open so the shape is visible on
                arrival. Type to narrow when the scope is every recorded link. */}
            {lineageGroups.length > 4 && (
              <input
                type="search"
                className="graph-lineage-find"
                value={lineageQuery}
                onChange={(event) => setLineageQuery(event.target.value)}
                placeholder={t('lineageFindPlaceholder')}
                aria-label={t('lineageFindPlaceholder')}
              />
            )}
            {visibleLineageGroups.length === 0 ? (
              <p className="graph-figures-note">{t('lineageNoMatch')}</p>
            ) : (
              <ul className="graph-lineage-list" data-latin>
                {(showAllTeachers || lineageQuery
                  ? visibleLineageGroups
                  : visibleLineageGroups.slice(0, LINEAGE_PREVIEW)
                ).map((group, groupIndex) => {
                  const teacherKey = group.teacher.slug;
                  const isFirst = groupIndex === 0 && lineageQuery === '';
                  const expanded = isFirst
                    ? !closedFirst
                    : openTeachers.has(teacherKey) ||
                      (lineageQuery !== '' && visibleLineageGroups.length <= 3);
                  const panelId = `lineage-panel-${teacherKey}`;
                  const names = group.rows.map((row) => localizeFigureName(row.subject, lang));
                  return (
                    <li
                      key={teacherKey}
                      className={`graph-lineage-group${expanded ? ' is-open' : ''}`}
                    >
                      <button
                        type="button"
                        className="graph-lineage-teacher"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() => toggleTeacher(teacherKey, isFirst)}
                      >
                        {/* A glyph, not an initial: nearly every name here opens
                            with an honorific, so the initials read H, K, H, K. */}
                        <span className="graph-lineage-avatar" aria-hidden="true">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                          </svg>
                        </span>
                        <span className="graph-lineage-teacher-text">
                          <span
                            className="graph-lineage-teacher-name"
                            lang={isRtl ? 'ur' : undefined}
                          >
                            <bdi>{fmtNum(localizeFigureName(group.teacher, lang))}</bdi>
                          </span>
                          <span className="graph-lineage-preview">
                            <bdi>{names.slice(0, 3).join(isRtl ? '، ' : ', ')}</bdi>
                            {names.length > 3 && ` +${fmtNum(names.length - 3)}`}
                          </span>
                        </span>
                        <span className="graph-lineage-teacher-count">
                          {fmtNum(group.rows.length)}
                        </span>
                        <span className="graph-lineage-disclosure" aria-hidden="true" />
                      </button>
                      {expanded && (
                        <div id={panelId} className="graph-lineage-panel">
                          <ul className="graph-lineage-disciples">
                            {group.rows.map((row) => {
                              const key = `${row.subject.slug}-${teacherKey}`;
                              const quoted = row.edges.filter((edge) => edge.quote);
                              const open = openSources.has(key);
                              return (
                                <li key={key} className="graph-lineage-disciple">
                                  <div className="graph-lineage-edge">
                                    <Link
                                      to={`/saint/${row.subject.slug}`}
                                      lang={isRtl ? 'ur' : undefined}
                                    >
                                      <bdi>{fmtNum(localizeFigureName(row.subject, lang))}</bdi>
                                    </Link>
                                    {row.edges.map((edge) => (
                                      <span key={edge.relation} className="graph-lineage-relation">
                                        {t(
                                          edge.relation === 'successor_of'
                                            ? 'successorOfLabel'
                                            : 'discipleOfLabel',
                                        )}
                                      </span>
                                    ))}
                                    {teamView && row.edges.some((edge) => !edge.reviewed) && (
                                      <span
                                        className="lineage-unreviewed"
                                        title={t('lineageUnreviewedHelp')}
                                      >
                                        {t('lineageUnreviewed')}
                                      </span>
                                    )}
                                    {quoted.length > 0 && (
                                      <button
                                        type="button"
                                        className={`graph-lineage-source-btn${open ? ' active' : ''}`}
                                        aria-expanded={open}
                                        aria-controls={`lineage-source-${key}`}
                                        onClick={() => toggleSource(key)}
                                      >
                                        {open ? t('lineageHideSource') : t('lineageShowSource')}
                                      </button>
                                    )}
                                  </div>
                                  {quoted.length > 0 && open && (
                                    <div id={`lineage-source-${key}`}>
                                      {quoted.map((edge) => (
                                        <blockquote
                                          key={edge.relation}
                                          className="graph-lineage-quote reveal-rise"
                                          lang="en"
                                          dir="ltr"
                                          data-latin
                                        >
                                          {renderInlineBold(edge.quote as string)}
                                          {teamView && edge.source && (
                                            <cite className="graph-lineage-cite">
                                              {edge.source}
                                            </cite>
                                          )}
                                        </blockquote>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                          <Link to={`/saint/${teacherKey}`} className="graph-lineage-teacher-link">
                            {t('lineageTeacherPage')}
                          </Link>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!lineageQuery && visibleLineageGroups.length > LINEAGE_PREVIEW && (
              <button
                type="button"
                className="action-btn graph-lineage-more"
                aria-expanded={showAllTeachers}
                onClick={() => setShowAllTeachers((all) => !all)}
              >
                {showAllTeachers
                  ? t('chronologyShowFewer')
                  : fmtNum(tFn(lang, 'almanacShowList', visibleLineageGroups.length))}
              </button>
            )}
          </section>
        )}

        {/* Team view only since 9 October 2026 (Rauf): the full figure index
            and the lineage-only names are working apparatus — the public reads
            the orders, the network and the lineage, the team reads the lists
            (CLAUDE.md, "Public view and team view"). Nothing is removed from
            the data or the figure pages themselves. */}
        {/* Team view only since 9 October 2026 (Rauf): the full figure index
            and the lineage-only names are working apparatus — the public reads
            the orders, the network and the lineage, the team reads the lists
            (CLAUDE.md, "Public view and team view"). Nothing is removed from
            the data or the figure pages themselves.

            Since the afternoon of the same day they are not printed on the
            page at all: a launcher card with one row each, opening a sheet
            (Rauf: "an interactable thing that opens an overlayed page"). 136
            names under seven headings, and 60 more, are a reference you open
            when you need it, not a section every visit scrolls past. */}
        {teamView && (
          <section className="graph-page-section" aria-label={t('graphExplorerAllFigures')}>
            <ul className="inset-list graph-launch-list">
              <li className="inset-row graph-launch-item">
                <button
                  type="button"
                  className="graph-launch-row graph-figures-launch"
                  aria-haspopup="dialog"
                  onClick={() => setFigureSheet('archive')}
                >
                  <span className="graph-launch-icon" aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="9" cy="8" r="3.5" />
                      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                      <circle cx="17" cy="9" r="2.5" />
                      <path d="M16 14.2c3 .3 5.5 2.4 5.5 5.8" />
                    </svg>
                  </span>
                  <span className="inset-row-label inset-row-label--stacked">
                    <span className="inset-row-title">{t('graphExplorerAllFigures')}</span>
                    <span className="inset-row-sub">{t('graphLaunchArchiveSub')}</span>
                  </span>
                  <span className="graph-launch-faces" aria-hidden="true">
                    {launchFaces.map((url) => (
                      <img key={url} src={url} alt="" loading="lazy" width={28} height={28} />
                    ))}
                  </span>
                  <span className="graph-launch-count">{fmtNum(archiveFigures.length)}</span>
                  <span className="inset-row-chevron" />
                </button>
              </li>
              {lineageOnlyFigures.length > 0 && (
                <li className="inset-row graph-launch-item">
                  <button
                    type="button"
                    className="graph-launch-row graph-lineage-only-launch"
                    aria-haspopup="dialog"
                    onClick={() => setFigureSheet('lineage')}
                  >
                    <span className="graph-launch-icon graph-launch-icon--quiet" aria-hidden="true">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <circle cx="12" cy="5" r="2.5" />
                        <circle cx="6" cy="19" r="2.5" />
                        <circle cx="18" cy="19" r="2.5" />
                        <path d="M12 7.5v4M12 11.5l-5 5M12 11.5l5 5" />
                      </svg>
                    </span>
                    <span className="inset-row-label inset-row-label--stacked">
                      <span className="inset-row-title">{t('graphLineageOnlyHeading')}</span>
                      <span className="inset-row-sub">{t('graphLaunchLineageSub')}</span>
                    </span>
                    <span className="graph-launch-count">{fmtNum(lineageOnlyFigures.length)}</span>
                    <span className="inset-row-chevron" />
                  </button>
                </li>
              )}
            </ul>
          </section>
        )}

        {teamView && (
          <Sheet
            open={figureSheet === 'archive'}
            title={t('graphExplorerAllFigures')}
            onClose={closeFigureSheet}
            className="graph-figures-sheet"
          >
            <p className="graph-figures-note">{t('graphExplorerFiguresNote')}</p>

            {/* 136 names under seven headings is a list you scroll past, not one
              you find anything in. Client-side because the whole set is already
              in memory — no worker, no debounce, no spinner. */}
            <div className="graph-figure-filter">
              <label className="graph-figure-filter-label sr-only" htmlFor="figure-filter">
                {t('graphFigureFilterLabel')}
              </label>
              <div className="graph-figure-filter-row">
                <input
                  id="figure-filter"
                  type="search"
                  className="graph-figure-filter-input"
                  value={figureQuery}
                  onChange={(e) => setFigureQuery(e.target.value)}
                  placeholder={t('graphFigureFilterPlaceholder')}
                  autoComplete="off"
                />
                {figureQuery && (
                  <button
                    type="button"
                    className="graph-figure-filter-clear"
                    onClick={() => setFigureQuery('')}
                  >
                    {t('graphFigureFilterClear')}
                  </button>
                )}
              </div>
              {/* The archive's temporal shape, as a filter.
                A reader could search by name and by tradition and not by *when* —
                on an archive spanning the 8th to the 21st century, that is the
                axis its material is actually organised along. The undated chip
                is not a leftover: at 63 of 136 it is the largest group here, and
                the honest thing is to let a reader see it and open it. */}
              <div className="graph-century-filter">
                <span className="graph-century-filter-label" id="century-filter-label">
                  {t('graphCenturyFilterLabel')}
                </span>
                <div
                  className="filter-chips graph-century-chips"
                  role="group"
                  aria-labelledby="century-filter-label"
                >
                  <button
                    type="button"
                    className={`filter-chip${centuryFilter === null ? ' active' : ''}`}
                    aria-pressed={centuryFilter === null}
                    onClick={() => setCenturyFilter(null)}
                  >
                    {t('graphCenturyAll')}
                  </button>
                  {centuryCounts.centuries.map(([century, count]) => (
                    <button
                      key={century}
                      type="button"
                      className={`filter-chip${centuryFilter === century ? ' active' : ''}`}
                      aria-pressed={centuryFilter === century}
                      onClick={() => setCenturyFilter(centuryFilter === century ? null : century)}
                    >
                      {fmtNum(CENTURY_ORDINAL[lang](century))}
                      <span className="filter-chip-count">{fmtNum(count)}</span>
                    </button>
                  ))}
                  {centuryCounts.undated > 0 && (
                    <button
                      type="button"
                      className={`filter-chip${centuryFilter === 'undated' ? ' active' : ''}`}
                      aria-pressed={centuryFilter === 'undated'}
                      title={t('graphCenturyUndatedHelp')}
                      onClick={() =>
                        setCenturyFilter(centuryFilter === 'undated' ? null : 'undated')
                      }
                    >
                      {t('graphCenturyUndated')}
                      <span className="filter-chip-count">{fmtNum(centuryCounts.undated)}</span>
                    </button>
                  )}
                </div>
                <p className="graph-figures-note graph-century-note">{t('graphCenturyNote')}</p>
              </div>

              {/* aria-live so a screen-reader user hears the result count change
                without having to go looking for it. */}
              <p className="graph-figure-filter-count" role="status" aria-live="polite">
                {fmtNum(
                  tFn(
                    lang,
                    'graphFigureFilterCount',
                    matchingFigures.length,
                    archiveFigures.length,
                  ),
                )}
              </p>
            </div>

            {matchingFigures.length === 0 && (
              <p className="graph-figure-filter-empty">{t('graphFigureFilterEmpty')}</p>
            )}

            {groupedFigures.map(({ group, figures }) => (
              <div key={group} className="graph-figure-group">
                <h3 className="graph-figure-group-heading">
                  {figureGroupLabel(group, lang)}
                  <span className="graph-figure-group-count">{fmtNum(figures.length)}</span>
                </h3>
                {/* One grouped list per figure type. 196 bare links in a grid read
                  as undifferentiated blue text on a phone; the row is the unit
                  now, and the row is the tap target. */}
                <ul className="graph-saints-list inset-list">
                  {figures.map((saint, i) => (
                    <li
                      key={saint.slug}
                      className="inset-row inset-row--link reveal-rise"
                      style={{ '--stagger-index': i } as React.CSSProperties}
                    >
                      <Link to={`/saint/${saint.slug}`} lang={isRtl ? 'ur' : undefined}>
                        <span className="inset-row-label">
                          <bdi>{fmtNum(localizeFigureName(saint, lang))}</bdi>
                        </span>
                        {/* A figure_type that is a sentence rather than a category is
                          content, not a defect (RULE 2) — show it as recorded
                          instead of filing it under a label it may contradict. */}
                        {isProseFigureType(saint.figureType) && (
                          <span className="graph-figure-as-recorded inset-row-note" data-latin>
                            <bdi>{saint.figureType}</bdi>
                          </span>
                        )}
                        <span className="inset-row-chevron" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Sheet>
        )}

        {teamView && lineageOnlyFigures.length > 0 && (
          <Sheet
            open={figureSheet === 'lineage'}
            title={t('graphLineageOnlyHeading')}
            onClose={closeFigureSheet}
            className="graph-figures-sheet"
          >
            <p className="graph-figures-note">{t('graphLineageOnlyNote')}</p>
            <ul className="graph-lineage-only-list inset-list">
              {lineageOnlyFigures.map(({ saint, disciples, teachers, kin }) => (
                <li key={saint.slug} className="inset-row inset-row--link">
                  <Link to={`/saint/${saint.slug}`} lang={isRtl ? 'ur' : undefined}>
                    {/* `data-latin` on both: unlike the archive's own figures,
                        most of these 60 names are not in the Urdu dictionary —
                        they are masters named in a source and nothing else — so
                        they come back as recorded (RULE 2 forbids
                        transliterating them). Declared rather than left for the
                        no-leak guard to find, which is what it did: 73
                        undeclared runs. */}
                    <span className="inset-row-label" data-latin>
                      <bdi>{fmtNum(localizeFigureName(saint, lang))}</bdi>
                    </span>
                    {/* How the record connects them, in whichever direction it
                        does — the fact that makes an unfamiliar name mean
                        something to a reader who has not met it before. */}
                    {(disciples[0] || teachers[0]) && (
                      <span className="inset-row-note" data-latin>
                        <bdi>
                          {fmtNum(
                            lineageOnlyNote(
                              lang,
                              disciples.length > 0 ? 'teacher' : 'disciple',
                              disciples.length > 0 ? disciples : teachers,
                            ),
                          )}
                        </bdi>
                      </span>
                    )}
                    {!disciples[0] && !teachers[0] && kin[0] && (
                      <span className="inset-row-note" data-latin>
                        <bdi>{fmtNum(kinOnlyNote(lang, kin) ?? '')}</bdi>
                      </span>
                    )}
                    <span className="inset-row-chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          </Sheet>
        )}
        <SiteFooter />
      </article>
    </div>
  );
}
