/**
 * How a `kin_of` edge leaves this archive as linked data.
 *
 * One table, imported by both `export-jsonld.mjs` and `export-rdf.mjs`, because
 * two exporters of the same graph that each hold their own copy of a mapping
 * are two exporters that will eventually disagree — and nothing would report it,
 * since neither format validates against the other.
 *
 * WHY A MAPPING AT ALL, RATHER THAN ONE `sufi:kinOf` PROPERTY. A single
 * property would have to carry the kind of tie in a qualifier, and a consumer
 * would then need this project's own vocabulary to learn that a person had a
 * father. Two of the seven types have exact schema.org equivalents, so those go
 * out as schema.org and are legible to anything that reads schema.org at all.
 * The other five have no standard term — schema.org models the nuclear family
 * and stops — so they take a `sufi:` sub-property rather than being flattened
 * into `schema:relatedTo`, which would lose the distinction the archive spent
 * the effort to record.
 *
 * DIRECTION. Every edge is stored junior → senior, so the property is emitted on
 * the SUBJECT's node and points at the object: the object is the subject's
 * parent, grandfather, uncle, father-in-law or ancestor. The inverse
 * (`schema:children`) is deliberately not emitted — it is derivable, and an
 * export that states each fact once is easier to trust than one that states it
 * twice and invites the question of whether the two agree.
 *
 * THE ONE EXCEPTION, AND WHY IT IS NOT THE SAME QUESTION AS STORAGE.
 * `sibling_of` is symmetric and is stored ONCE (HANDOVER §9.160: one recorded
 * sentence is one claim). It is EXPORTED from both ends, and that is not a
 * reversal of that decision. `schema:sibling` is defined as symmetric, but RDF
 * consumers do not infer symmetry unless an ontology declares it, and this
 * export ships no OWL. So a consumer asking the obvious question — "who are
 * Guru Nanak's siblings?" — would get nothing back for the figure the tie is
 * stored *against*. Emitting both triples restates one claim in a format that
 * cannot express it once; it does not assert a second fact. The archive still
 * holds one row, `/saint/…` still renders one relationship, and `kinSeen` still
 * refuses a duplicate.
 */

/** Emitted on the subject's node, pointing at the object. */
export const KIN_EXPORT_PREDICATE = {
  // Exact schema.org equivalents.
  son_of: { schemaOrg: true, term: 'parent' },
  daughter_of: { schemaOrg: true, term: 'parent' },
  sibling_of: { schemaOrg: true, term: 'sibling', symmetric: true },
  /* Added 30 August 2026, by this module's own guard: `kinTriples` threw and
     `kinExportCoverage.test.ts` named the type the moment `spouse_of` entered
     the seed. That is the check working on its first real opportunity — the
     failure it was written for is a kin type reaching the graph and the site
     while quietly missing from the data release, which is exactly how `kin_of`
     itself behaved for a day. schema.org has the exact term and defines it
     symmetric, so it is emitted from both ends for the same reason
     `schema:sibling` is. */
  spouse_of: { schemaOrg: true, term: 'spouse', symmetric: true },
  // No standard term exists; see the note above.
  grandson_of: { schemaOrg: false, term: 'grandsonOf' },
  nephew_of: { schemaOrg: false, term: 'nephewOf' },
  son_in_law_of: { schemaOrg: false, term: 'sonInLawOf' },
  descendant_of: { schemaOrg: false, term: 'descendantOf' },
};

/**
 * Every triple a kin edge produces, as `{ subjectSlug, predicate, objectSlug,
 * schemaOrg }` — already expanded, so both exporters iterate the same list and
 * neither has to remember the symmetric case.
 *
 * Throws on an unmapped `kinType` rather than skipping it. A new type added to
 * the seed without a decision about how it leaves the archive should stop the
 * export, not quietly drop a relation out of the data release — which is the
 * failure this module was written to fix, `kin_of` having been in the graph and
 * absent from both exports since the day it shipped.
 */
export function kinTriples(relations) {
  const out = [];
  for (const r of relations) {
    if (r.type !== 'kin_of') continue;
    const map = KIN_EXPORT_PREDICATE[r.kinType];
    if (!map) {
      throw new Error(
        `export: kinType "${r.kinType}" (${r.id}) has no export mapping. ` +
          `Add it to KIN_EXPORT_PREDICATE in scripts/data/lib/kinExport.mjs — ` +
          `deciding how it leaves the archive is part of adding a kin type.`,
      );
    }
    const subject = r.subject.replace(/^saint:/, '');
    const object = r.object.replace(/^saint:/, '');
    out.push({ subjectSlug: subject, predicate: map.term, objectSlug: object, schemaOrg: map.schemaOrg });
    if (map.symmetric) {
      out.push({ subjectSlug: object, predicate: map.term, objectSlug: subject, schemaOrg: map.schemaOrg });
    }
  }
  return out;
}
