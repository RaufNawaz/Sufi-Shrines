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

/** Raw store for advanced queries (read-only). */
export function getKGStore(): Readonly<KGStore> {
  return kg;
}
