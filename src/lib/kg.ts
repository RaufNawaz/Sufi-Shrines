import rawKG from '../../data/kg.json';
import type {
  KGStore,
  KGSaint,
  KGOrder,
  KGPlace,
  KGEvent,
  KGRelation,
  KGRelationType,
  KGKinNote,
} from '../types/kg';

/**
 * A relation's stable id, derived rather than shipped.
 *
 * `data/kg.json` no longer carries `relations[].id`, because every character of
 * one is already in the four fields beside it — `type[:kinType]:subject:object`
 * — and the restatement was **49 KB of eager JS on every route that touches the
 * graph**, the largest single field in the file and more than all its quotes
 * together. It was removed on 30 August 2026 when a kin batch pushed SaintPage
 * and OrderPage over budget for the third time in two days; HANDOVER §9.142 says
 * the third raise is a prompt to look at the cause, and the cause was that the
 * graph ships its own primary key.
 *
 * The format is unchanged and must stay unchanged: `data/kg-sources.json` is
 * keyed on these strings, and `scripts/data/build-kg.mjs` builds that file from
 * the ids it holds internally. `kgRelationIds.test.ts` asserts this function and
 * that script still agree, for every relation, so the two cannot drift apart in
 * silence — which is the one way this change could go wrong.
 */
export function relationId(r: {
  type: string;
  kinType?: string | undefined;
  subject: string;
  object: string;
}): string {
  return r.kinType
    ? `${r.type}:${r.kinType}:${r.subject}:${r.object}`
    : `${r.type}:${r.subject}:${r.object}`;
}

const rawStore = rawKG as unknown as Omit<KGStore, 'relations'> & {
  relations: Omit<KGRelation, 'id'>[];
};

const kg: KGStore = {
  ...rawStore,
  relations: rawStore.relations.map((r) => ({ ...r, id: relationId(r) }) as KGRelation),
};

/** Fallback display label for a KG slug (e.g. "data-darbar" → "Data Darbar")
 * when the entity's real name isn't available. */
export function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// ── Lookups ───────────────────────────────────────────────────────────────────

export function getSaintBySlug(slug: string): KGSaint | undefined {
  return kg.saints.find((s) => s.slug === slug);
}

/**
 * Where a retired figure slug should send a reader, or `undefined` if the slug
 * is not a retirement. See `KGStore.retiredSlugs`: joining two figure nodes
 * retires a URL that was prerendered and listed in the sitemap, and this
 * route's fallback for an unknown figure is a redirect to the map — so without
 * this, a merge silently turns a published figure page into a soft 404.
 *
 * Only ever returns a slug that is a live figure, so a stale entry cannot bounce
 * a reader from one dead end to another.
 */
export function getRetiredSaintTarget(slug: string): string | undefined {
  const target = kg.retiredSlugs?.[slug];
  if (!target || target === slug) return undefined;
  return kg.saints.some((s) => s.slug === target) ? target : undefined;
}

export function getOrderBySlug(slug: string): KGOrder | undefined {
  return kg.orders.find((o) => o.slug === slug);
}

export function getPlaceBySlug(slug: string): KGPlace | undefined {
  return kg.places.find((p) => p.slug === slug);
}

export function getEventsByShrine(shrineSlug: string): KGEvent[] {
  return kg.events.filter((e) => e.shrineSlug === shrineSlug);
}

// ── Relation queries ──────────────────────────────────────────────────────────

export function getRelations(opts: {
  subject?: string;
  object?: string;
  type?: KGRelationType;
}): KGRelation[] {
  return kg.relations.filter((r) => {
    if (opts.subject && r.subject !== opts.subject) return false;
    if (opts.object && r.object !== opts.object) return false;
    if (opts.type && r.type !== opts.type) return false;
    return true;
  });
}

/** Returns all shrine slugs where this saint is commemorated. */
export function getSaintShrines(saintSlug: string): string[] {
  return getSaintBySlug(saintSlug)?.shrines ?? [];
}

/** Returns the Sufi order for a saint, or undefined if unrecorded. */
export function getOrderForSaint(saintSlug: string): KGOrder | undefined {
  const rel = getRelations({ subject: `saint:${saintSlug}`, type: 'belongs_to_order' })[0];
  if (!rel) return undefined;
  const orderSlug = rel.object.replace(/^order:/, '');
  return getOrderBySlug(orderSlug);
}

/** Returns the saint(s) commemorated at a shrine (as KGSaint records). */
export function getSaintsForShrine(shrineSlug: string): KGSaint[] {
  return getRelations({ object: shrineSlug, type: 'buried_at' })
    .map((r) => {
      const slug = r.subject.replace(/^saint:/, '');
      return getSaintBySlug(slug);
    })
    .filter((s): s is KGSaint => s !== undefined);
}

/** Returns the place (district-level) for a shrine, or undefined. */
export function getPlaceForShrine(shrineSlug: string): KGPlace | undefined {
  const rel = getRelations({ subject: shrineSlug, type: 'located_in' })[0];
  if (!rel) return undefined;
  const slug = rel.object.replace(/^place:/, '');
  return getPlaceBySlug(slug);
}

/** Returns all saints in a given order. */
export function getSaintsInOrder(orderSlug: string): KGSaint[] {
  return getRelations({ object: `order:${orderSlug}`, type: 'belongs_to_order' })
    .map((r) => {
      const slug = r.subject.replace(/^saint:/, '');
      return getSaintBySlug(slug);
    })
    .filter((s): s is KGSaint => s !== undefined);
}

/** An observance the graph keeps for one member of an order. */
export interface OrderObservance {
  /** The member figure the observance commemorates. */
  saint: KGSaint;
  event: KGEvent;
  /** False when the `belongs_to_order` edge that puts this figure in the order
   * is machine-read and unread — 44 of the 64 memberships are. The row inherits
   * whatever marking the member list above it carries; provenance parity
   * between two surfaces does not happen by itself (HANDOVER §9.85). */
  membershipReviewed: boolean;
}

/**
 * Every observance recorded for a member of this order.
 *
 * Two joins the graph has supported all along and no page walked:
 * `belongs_to_order` gives an order its members, `commemorated_by` gives each
 * figure the days kept for them. Sixty-three ʿurs across the five orders sat on
 * the far side of that join — a reader on the Chishtiyya page could see fourteen
 * names and not one of the days those names are gathered for.
 *
 * **The event node is the join's product, not its evidence.** Its `name` is
 * composed by the builder ("Urs of Bari Imam at Bari Imam") and its `date` is a
 * bare month lifted from the shrine's own `Events` cell — present on 16 of 149.
 * So a caller that wants to *show* a date reads it off the shrine record
 * through `ursDates.ts`, the way the almanac does, and prints the cell verbatim
 * beside it. Nothing here parses a date, and nothing here projects one.
 *
 * Returned in the graph's own order and deduped per (figure, event). Sorting is
 * the view's business, because a list of people sorts by the reader's language.
 */
export function getOrderObservances(orderSlug: string): OrderObservance[] {
  const byId = new Map(kg.events.map((e) => [e.id, e]));
  const rows: OrderObservance[] = [];
  const seen = new Set<string>();

  for (const membership of getRelations({
    object: `order:${orderSlug}`,
    type: 'belongs_to_order',
  })) {
    const saint = getSaintBySlug(membership.subject.replace(/^saint:/, ''));
    if (!saint) continue;
    for (const rel of getRelations({ subject: membership.subject, type: 'commemorated_by' })) {
      const event = byId.get(rel.object);
      if (!event) continue;
      const key = `${saint.slug}:${event.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ saint, event, membershipReviewed: membership.reviewed !== false });
    }
  }
  return rows;
}

/**
 * The observances recorded for one figure.
 *
 * The other direction of the almanac's own join, and the one a reader arriving
 * at a figure's page wants: not "whose ʿurs is this week" but "when do people
 * gather for this person". `SaintPage` answered it with `buildAlmanac(...)
 * .dated[0]` — the next *dated* observance inside twelve months — which is
 * right for a "coming up" line and silent for every figure whose observance the
 * archive records without a date. That is most of them: `Maha Shivratri` at
 * Dargah Pir Ratan Nath Jee is recorded, and the figure's page showed nothing.
 */
export function getSaintObservances(saintSlug: string): KGEvent[] {
  const byId = new Map(kg.events.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const out: KGEvent[] = [];
  for (const rel of getRelations({ subject: `saint:${saintSlug}`, type: 'commemorated_by' })) {
    const event = byId.get(rel.object);
    if (!event || seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
  }
  return out;
}

export type LineageRelationType = 'disciple_of' | 'successor_of';

export interface LineageLink {
  saint: KGSaint;
  relation: LineageRelationType;
  quote?: string;
  source?: string;
  /** False when no human has read this edge yet (RULE 2). */
  reviewed: boolean;
  confidence: number;
}

const LINEAGE_TYPES: LineageRelationType[] = ['disciple_of', 'successor_of'];

function toLineageLink(r: KGRelation, saint: KGSaint | undefined): LineageLink | null {
  if (!saint) return null;
  return {
    saint,
    relation: r.type as LineageRelationType,
    reviewed: r.reviewed !== false,
    confidence: r.confidence,
    ...(r.quote ? { quote: r.quote } : {}),
    ...(r.source ? { source: r.source } : {}),
  };
}

/** This saint's recorded teacher(s)/predecessor(s) — the object side of its
 * disciple_of/successor_of relations. Hand-extracted from shrine_entries/,
 * see data/kg-seeds.json#lineageRelations. */
export function getTeachersOf(saintSlug: string): LineageLink[] {
  return LINEAGE_TYPES.flatMap((type) =>
    getRelations({ subject: `saint:${saintSlug}`, type }).map((r) =>
      toLineageLink(r, getSaintBySlug(r.object.replace(/^saint:/, ''))),
    ),
  ).filter((link): link is LineageLink => link !== null);
}

/** Saints recorded as this saint's disciple/successor — the reverse of
 * getTeachersOf. */
export function getDisciplesOf(saintSlug: string): LineageLink[] {
  return LINEAGE_TYPES.flatMap((type) =>
    getRelations({ object: `saint:${saintSlug}`, type }).map((r) =>
      toLineageLink(r, getSaintBySlug(r.subject.replace(/^saint:/, ''))),
    ),
  ).filter((link): link is LineageLink => link !== null);
}

/**
 * One recorded family tie, seen from one figure's page.
 *
 * The stored edge always runs junior → senior (subject is the son, grandson,
 * nephew, son-in-law or descendant of the object), so the same edge has to read
 * correctly from both ends. `role` is what to call **the other figure** from
 * where the reader is standing: the object's `elderRole` when this page is the
 * junior, the subject's `juniorRole` when it is the senior. That is why the
 * seed carries two labels and not one predicate — "grandson of" is unreadable
 * on the grandfather's page.
 */
export interface KinLink {
  /** The figure at the other end of the tie. */
  saint: KGSaint;
  /** Closed-vocabulary label key for `saint`'s role — `father`, `son`,
   * `uncleMaternal`, `grandsonUnspecified` … See UI_TEXT `kinRole*`. */
  role: string;
  /** The same for the figure whose page this is — the other half of the pair.
   * A page usually needs only `role` (it names the other person), but a list
   * that introduces THIS figure to a reader needs to say what they are: the
   * `/graph` roster of figures with no site here says "father of X", and
   * without this it could only say "X". */
  selfRole: string;
  kinType: string;
  /** True when the reader's figure is the junior side — i.e. `saint` is the
   * elder. Lets a page group ties by generation without re-deriving it. */
  otherIsElder: boolean;
  /** `saint` is a collective and its role reads plural (the six of Bibi Pak
   * Daman). */
  plural: boolean;
  /** The sources agree on descent and not on how many generations. */
  generationDisputed: boolean;
  /** The entry reports this parentage as one of two competing traditions. */
  contested: boolean;
  /** The source's own phrase, verbatim. English prose — show it only where a
   * quote may go (i18n rule 7). */
  wording?: string;
  quote?: string;
  source?: string;
  confidence: number;
  /** False when the tie was machine-extracted and no editor has read it —
   * the same rule the other three link types use (`r.reviewed !== false`, so an
   * absent flag means human-decided and trusted).
   *
   * Today this is `true` for all 67 kin edges, because every one is a
   * human-adjudicated seed. It is here because it was MISSING, and missing is
   * not the same as true: `toKinLink` never read `r.reviewed`, so the first
   * machine-extracted kin edge to reach the graph would have been rendered with
   * the same authority as a seed Rauf ruled on by hand. Lineage, order
   * membership and event links all carry the flag; kin was the one that did
   * not. */
  reviewed: boolean;
}

function toKinLink(
  r: KGRelation,
  saint: KGSaint | undefined,
  otherIsElder: boolean,
): KinLink | null {
  if (!saint || !r.kinType) return null;
  const role = otherIsElder ? r.elderRole : r.juniorRole;
  const selfRole = otherIsElder ? r.juniorRole : r.elderRole;
  if (!role || !selfRole) return null;
  return {
    saint,
    role,
    selfRole,
    kinType: r.kinType,
    otherIsElder,
    plural: !otherIsElder && r.juniorIsPlural === true,
    generationDisputed: r.generationDisputed === true,
    contested: r.contested === true,
    confidence: r.confidence,
    reviewed: r.reviewed !== false,
    ...(r.kinWording ? { wording: r.kinWording } : {}),
    ...(r.quote ? { quote: r.quote } : {}),
    ...(r.source ? { source: r.source } : {}),
  };
}

/**
 * Every family tie recorded for a figure, both directions, elders first.
 *
 * Kinship was in the archive's prose and outside its graph until 29 August
 * 2026: the relation vocabulary knew only `disciple_of` and `successor_of`, so
 * 28 ties that an extraction pass had already quoted verbatim — Shah Rukn-e-Alam
 * to Bahauddin Zakariya, Bibi Jawindi to Jahaniyan Jahangasht, thirteen
 * father-to-son successions of a *sajjada nashin* — were held in a proposals
 * file and rendered nowhere. In this corpus a seat passes down a family at
 * least as often as down a chain of initiation, and Bibi Jawindi's only tie to
 * anything in the graph is a line of descent.
 */
export function getKinOf(saintSlug: string): KinLink[] {
  const asJunior = getRelations({ subject: `saint:${saintSlug}`, type: 'kin_of' }).map((r) =>
    toKinLink(r, getSaintBySlug(r.object.replace(/^saint:/, '')), true),
  );
  const asSenior = getRelations({ object: `saint:${saintSlug}`, type: 'kin_of' }).map((r) =>
    toKinLink(r, getSaintBySlug(r.subject.replace(/^saint:/, '')), false),
  );
  return [...asJunior, ...asSenior].filter((l): l is KinLink => l !== null);
}

/** Family the archive records for this figure without naming the relative —
 * a succession with nobody on the other end of it. Two in the whole graph, and
 * both would simply vanish if the page only rendered edges. */
export function getKinNotes(saintSlug: string): KGKinNote[] {
  return (kg.kinNotes ?? []).filter((n) => n.saintSlug === saintSlug);
}

/**
 * A figure standing some way down a spiritual line from an earlier one.
 *
 * The relation the archive stated twice and the graph could hold neither time.
 * `successor_of` says the seat passed from one person to the next, which is
 * false at twelve generations; `kin_of`'s `descendant_of` says blood, which is
 * also false — the entry calls the Jagiasi Sants "spiritual descendants of Guru
 * Nanak through Baba Sri Chand's Udasi line", and that line runs through an
 * ascetic son rather than a family. Both cases were filed as non-relations, in
 * two different files, before the type was added on 30 August 2026.
 */
export interface DescentLink {
  /** The figure at the other end. */
  saint: KGSaint;
  /** True when `saint` is the earlier figure — this page's figure descends from
   * them. False on the ancestor's own page, where the row reads downward. */
  otherIsElder: boolean;
  /** How many removes the source states, where it states a number. Absent means
   * "descended from, distance unstated", which is a different claim from zero. */
  generations?: number;
  /** The source's own phrase. The two edges do not use the same word — one says
   * descendant, one says successor — so the phrase is kept and not normalised
   * (RULE 2). English prose; render only where a quote may go (i18n rule 7). */
  removeWording?: string;
  quote?: string;
  source?: string;
  confidence: number;
  reviewed: boolean;
}

function toDescentLink(
  r: KGRelation,
  saint: KGSaint | undefined,
  otherIsElder: boolean,
): DescentLink | null {
  if (!saint) return null;
  return {
    saint,
    otherIsElder,
    confidence: r.confidence,
    reviewed: r.reviewed !== false,
    ...(typeof r.generations === 'number' ? { generations: r.generations } : {}),
    ...(r.removeWording ? { removeWording: r.removeWording } : {}),
    ...(r.quote ? { quote: r.quote } : {}),
    ...(r.source ? { source: r.source } : {}),
  };
}

/** Both directions, like `getKinOf` — the ancestor's page must show the descent
 * too, or half of every one of these is invisible, and the missing half is Guru
 * Nanak's, the figure a reader is far more likely to arrive at. */
export function getDescentsOf(saintSlug: string): DescentLink[] {
  const asDescendant = getRelations({
    subject: `saint:${saintSlug}`,
    type: 'descendant_in_lineage_of',
  }).map((r) => toDescentLink(r, getSaintBySlug(r.object.replace(/^saint:/, '')), true));
  const asAncestor = getRelations({
    object: `saint:${saintSlug}`,
    type: 'descendant_in_lineage_of',
  }).map((r) => toDescentLink(r, getSaintBySlug(r.subject.replace(/^saint:/, '')), false));
  return [...asDescendant, ...asAncestor].filter((l): l is DescentLink => l !== null);
}

/** One remove up a chain of transmission. */
export interface LineageChainStep {
  /** The teacher at this remove. */
  saint: KGSaint;
  /** Every recorded relation to them. Usually one; two where a source calls
   * the same figure both disciple and successor, which 13 pairs in the graph
   * do — both are facts and the step keeps both. */
  links: LineageLink[];
}

export interface LineageChain {
  /** Nearest teacher first. Empty when the record names none. */
  steps: LineageChainStep[];
  /** Why the walk stopped, which is itself worth telling the reader. */
  stop: 'root' | 'forks' | 'cycle';
  /** Teachers recorded at the point the chain forked — 0 unless `stop` is
   * `'forks'`. */
  forks: number;
}

/**
 * The chain of transmission above a figure — the *silsila* in its literal
 * sense, one master to the next.
 *
 * SaintPage showed a figure's immediate teachers and stopped, which for a
 * tradition whose whole claim is an unbroken chain is the least interesting
 * hop of it. The graph has held the rest all along: 57 figures record a
 * teacher, and following those links gives 15 of them a chain two or more
 * removes deep — "Nizamuddin Auliya ← Fariduddin Ganjshakar ← Khwaja Qutbuddin
 * Bakhtiar Kaki", which no page in the archive was drawing.
 *
 * **It walks only while the record is unambiguous.** Five figures name several
 * teachers, and picking one of four to continue through would be inventing a
 * line of descent (RULE 2) — so the walk stops there and says it forked, which
 * is the honest answer and is a fact about the sources rather than a gap in the
 * display. That is not a corner case: the longest apparent chain in the data
 * runs eight names deep *through* Abul Faiz Qalander Ali Suharwardi, who
 * records four teachers, so a walk that just took the first would have drawn
 * five generations of descent the archive never claims.
 *
 * Cycles terminate the walk too. None exist today; a `successor_of` pointing
 * back into its own ancestry is one CSV import away, and an infinite loop in a
 * render is not a good way to find out.
 */
export function getLineageChain(saintSlug: string): LineageChain {
  const steps: LineageChainStep[] = [];
  const seen = new Set<string>([saintSlug]);
  let current = saintSlug;

  for (;;) {
    const links = getTeachersOf(current);
    const teachers = [...new Set(links.map((l) => l.saint.slug))];
    if (teachers.length === 0) return { steps, stop: 'root', forks: 0 };
    if (teachers.length > 1) return { steps, stop: 'forks', forks: teachers.length };

    const next = teachers[0];
    if (seen.has(next)) return { steps, stop: 'cycle', forks: 0 };

    const teacherLinks = links.filter((l) => l.saint.slug === next);
    steps.push({ saint: teacherLinks[0].saint, links: teacherLinks });
    seen.add(next);
    current = next;
  }
}

export interface LineageEdge {
  subject: KGSaint;
  relation: LineageRelationType;
  object: KGSaint;
  /** False when no human has read this edge yet — it was extracted from the
   * archive's own prose and quote-verified, but not reviewed (RULE 2). */
  reviewed: boolean;
  confidence: number;
  source?: string;
  quote?: string;
}

/** Every recorded disciple_of/successor_of edge, resolved to saint records —
 * for a graph-wide lineage overview (e.g. GraphPage). */
export function getAllLineageEdges(): LineageEdge[] {
  return kg.relations
    .filter((r) => LINEAGE_TYPES.includes(r.type as LineageRelationType))
    .map((r) => {
      const subject = getSaintBySlug(r.subject.replace(/^saint:/, ''));
      const object = getSaintBySlug(r.object.replace(/^saint:/, ''));
      if (!subject || !object) return null;
      return {
        subject,
        relation: r.type as LineageRelationType,
        object,
        reviewed: r.reviewed !== false,
        confidence: r.confidence,
        ...(r.source ? { source: r.source } : {}),
        ...(r.quote ? { quote: r.quote } : {}),
      };
    })
    .filter((e): e is LineageEdge => e !== null);
}

/** Figures the archive actually documents — i.e. everyone with a shrine here.
 * Excludes the ~60 `lineageOnly` nodes, which exist so a lineage does not stop
 * at the first teacher who has no shrine in Pakistan. Any count or list that
 * describes the archive's coverage must use this, not `kg.saints`. */
export function getArchiveFigures(): KGSaint[] {
  return kg.saints.filter((s) => !s.lineageOnly);
}

/**
 * The other 60: figures named in someone else's recorded lineage, with no site
 * in this archive.
 *
 * They are deliberately kept out of `getArchiveFigures` so that every count
 * describing the archive's coverage describes the archive — Hujwiri's master
 * al-Khuttali is in the graph because a chain of transmission must not stop at
 * the first teacher who happens to have no shrine in Pakistan, not because this
 * archive documents him.
 *
 * But excluded from the counts is not the same as excluded from the site. Each
 * of these 60 has a reachable page, and **all 60 appear in a recorded lineage
 * relation** — so the only way to find one was to already be walking the chain
 * that names it. That included Prince Dara Shikoh. A separate list, plainly
 * labelled, gives them a way in without touching a single count.
 */
export function getLineageOnlyFigures(): KGSaint[] {
  return kg.saints.filter((s) => s.lineageOnly === true);
}

/** The order membership(s) recorded for a saint, with the branch and the raw
 * sheet cell preserved. `getOrderForSaint` returns only the first; a compound
 * silsila ("Qadri Shattari") legitimately yields more than one. */
export interface OrderMembership {
  order: KGOrder;
  branch?: string;
  asRecorded?: string;
  reviewed: boolean;
  confidence: number;
  source?: string;
  quote?: string;
}

/**
 * The silsila as the figure's own record words it — once per figure, not once
 * per order.
 *
 * `asRecorded` is the row's `silsila` cell, and a figure with two order edges
 * carries the *same* cell on both: `abul-faiz-qalander-ali-suharwardi` is
 * recorded "Suhrawardi" on his Suhrawardiyya edge and "Suhrawardi" on his
 * Qadiriyya edge too, because the prose is what put him in the second one.
 * OrderPage refuses to print it for exactly that reason — under a Qadiriyya
 * heading it would attribute the source's words to the wrong order. On the
 * figure's own page there is no wrong order to attribute it to, so it belongs
 * here, deduped, labelled as the source's wording rather than as an answer.
 *
 * No cleverness about whether it is "worth" showing. The first version of this
 * dropped any string that looked like the order's name restated, which would
 * have suppressed "Qadri" under Qadiriyya — and the rule needed to know that
 * "Qadri", "Qadiri" and "Qadiriyya" are one name while "Rashidi" under
 * Qadiriyya is a different one. That is a transliteration judgement, and a
 * wrong one silently deletes the archive's most honest field: one of these
 * cells reads "Qadri (see year_built_note / Description for a discrepancy in
 * how the survey names his order)". Report what the data says (RULE 2); a
 * redundant short line costs the reader nothing next to a suppressed hedge.
 */
export function recordedSilsilas(memberships: OrderMembership[]): string[] {
  const seen = new Set<string>();
  for (const m of memberships) {
    const value = m.asRecorded?.trim();
    if (value) seen.add(value);
  }
  return [...seen];
}

export function getOrderMemberships(saintSlug: string): OrderMembership[] {
  return getRelations({ subject: `saint:${saintSlug}`, type: 'belongs_to_order' })
    .map((r) => {
      const order = getOrderBySlug(r.object.replace(/^order:/, ''));
      if (!order) return null;
      return {
        order,
        reviewed: r.reviewed !== false,
        confidence: r.confidence,
        ...(r.branch ? { branch: r.branch } : {}),
        ...(r.asRecorded ? { asRecorded: r.asRecorded } : {}),
        ...(r.source ? { source: r.source } : {}),
        ...(r.quote ? { quote: r.quote } : {}),
      };
    })
    .filter((m): m is OrderMembership => m !== null);
}

/** Raw store for advanced queries (read-only). */
export function getKGStore(): Readonly<KGStore> {
  return kg;
}
