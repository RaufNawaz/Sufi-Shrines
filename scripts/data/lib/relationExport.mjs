/**
 * Which relation types leave this archive as linked data, and which deliberately
 * do not.
 *
 * WHY THIS EXISTS. `descendant_in_lineage_of` was added to the graph on
 * 30 August 2026, rendered on two figure pages the same hour, and **silently
 * omitted from both exports** — `graph.jsonld` and `graph.ttl` carried Guru
 * Gurpat's node with his dates and his shrine and no descent at all. Nothing
 * failed. Both exporters read relations by naming each type they care about
 * (`r.type === 'disciple_of'`, and so on), so a type nobody named was simply not
 * there, and the staleness check passed because the export genuinely did match
 * the graph it was generated from — it matched by leaving the same facts out.
 *
 * `kinExport.mjs` already had the answer for the layer below this one: it
 * THROWS on a `kinType` with no mapping, and that guard caught `spouse_of` on
 * its first real opportunity. This is the same idea one level up. A relation
 * type must be listed here — as exported, or as excluded with a reason — and
 * the exporters refuse to run when the graph holds one that is neither.
 *
 * "Excluded with a reason" is a real category, not a loophole: `attested_in`
 * points at a source record rather than an entity, and emitting it would put
 * this project's provenance bookkeeping into a consumer's graph as if it were a
 * claim about the world.
 */

/** type → how it leaves, or why it does not. */
export const RELATION_EXPORT = {
  buried_at: { exported: true, via: 'shrine node (schema:containsPlace / burial)' },
  located_in: { exported: true, via: 'shrine node (schema:containedInPlace)' },
  belongs_to_order: { exported: true, via: 'saint node (sufi:order)' },
  disciple_of: { exported: true, via: 'saint node (sufi:discipleOf)' },
  successor_of: { exported: true, via: 'saint node (sufi:successorOf)' },
  commemorated_by: { exported: true, via: 'event node (schema:about)' },
  kin_of: { exported: true, via: 'kinExport.mjs — one mapping, both exporters' },
  descendant_in_lineage_of: {
    exported: true,
    schemaOrg: false,
    term: 'descendantInLineageOf',
    /* No schema.org term fits and none should be forced. `schema:parent` is
       blood; the whole reason this type exists is that the tie is not. Flattening
       it to `schema:relatedTo` would lose exactly the distinction the archive
       spent two rejected proposals refusing to lose. */
  },
  attested_in: {
    exported: false,
    why:
      'points at a source record rather than an entity — this is the archive’s own ' +
      'provenance bookkeeping, and exporting it would state it as a fact about the world.',
  },
};

/**
 * Refuse to export a graph holding a relation type nobody has decided about.
 *
 * Called by both exporters before they write. The failure this prevents is not
 * a crash — it is a quiet omission that looks like a clean run.
 */
export function assertRelationTypesKnown(relations) {
  const unknown = [...new Set(relations.map((r) => r.type))].filter((t) => !RELATION_EXPORT[t]);
  if (unknown.length > 0) {
    throw new Error(
      `export: relation type(s) ${unknown.map((t) => `"${t}"`).join(', ')} have no export ` +
        `decision. Add each to RELATION_EXPORT in scripts/data/lib/relationExport.mjs — ` +
        `as exported, or as excluded WITH A REASON. Deciding how a relation leaves the ` +
        `archive is part of adding one; a type that is merely unlisted disappears from the ` +
        `data release without any check noticing.`,
    );
  }
}

/** Descent-at-a-remove, emitted on the subject (the later figure), pointing at
 * the earlier one. Stored junior → senior like `kin_of`, so no inversion. The
 * inverse is derivable and is deliberately not emitted, for the reason
 * kinExport.mjs gives about stating each fact once. */
export function descentTriples(relations) {
  const map = RELATION_EXPORT.descendant_in_lineage_of;
  return relations
    .filter((r) => r.type === 'descendant_in_lineage_of')
    .map((r) => ({
      subjectSlug: r.subject.replace(/^saint:/, ''),
      predicate: map.term,
      objectSlug: r.object.replace(/^saint:/, ''),
      schemaOrg: map.schemaOrg,
      /* The source counts the removes, so the export says so. A consumer reading
         "descendant" with no distance would reasonably read it as a child. */
      ...(typeof r.generations === 'number' ? { generations: r.generations } : {}),
    }));
}
