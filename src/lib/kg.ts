import rawKG from '../../data/kg.json';
import type {
  KGStore,
  KGSaint,
  KGOrder,
  KGPlace,
  KGEvent,
  KGRelation,
  KGRelationType,
} from '../types/kg';

const kg = rawKG as unknown as KGStore;

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
