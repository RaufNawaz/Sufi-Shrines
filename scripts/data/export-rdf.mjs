#!/usr/bin/env node
/**
 * export-rdf.mjs — Export the knowledge graph as RDF/Turtle.
 *
 * Reads data/kg.json + data/shrines.json and emits data/export/graph.ttl
 * using schema.org + a custom sufi: namespace for Sufi-specific concepts.
 * No external RDF library is required; the Turtle is hand-serialised.
 *
 * Usage:  node scripts/data/export-rdf.mjs
 *         node scripts/data/export-rdf.mjs --check   # verify, write nothing
 * Or:     npm run data:export    (chains data:kg, export-jsonld, then this)
 *
 * `--check` exists for the reason given at the top of export-jsonld.mjs: both
 * exports are committed artifacts that had drifted behind the graph with every
 * gate green.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './lib/slugs.mjs';
import { kinTriples } from './lib/kinExport.mjs';
import { assertRelationTypesKnown, descentTriples } from './lib/relationExport.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const EXPORT_DIR = join(ROOT, 'data', 'export');

// ── IRI helpers ───────────────────────────────────────────────────────────────

const KG_BASE = 'https://github.com/raufnawaz/sufi-shrines/data/';
const VOCAB   = 'https://github.com/raufnawaz/sufi-shrines/vocab#';

function iri(type, slug) { return `<${KG_BASE}${type}/${slug}>`; }
function wdIri(qid)      { return `<https://www.wikidata.org/entity/${qid}>`; }

// ── Turtle string helpers ─────────────────────────────────────────────────────

function ttlEscape(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** Short literal: "text"@lang */
function lit(value, lang = 'en') {
  return `"${ttlEscape(value)}"${lang ? `@${lang}` : ''}`;
}

/** Long literal (triple-quotes) for multi-sentence text */
function litLong(value, lang = 'en') {
  const escaped = String(value).replace(/"""/g, '\\"\\"\\"');
  return `"""${escaped}"""${lang ? `@${lang}` : ''}`;
}

/** Decimal literal */
function dec(n) {
  return `"${n}"^^xsd:decimal`;
}

function getImageUrl(row) {
  for (const k of Object.keys(row)) {
    if (/image/i.test(k)) {
      const v = String(row[k] || '').trim();
      if (v && /^https?:\/\//i.test(v)) return v;
    }
  }
  return null;
}

// ── load inputs ───────────────────────────────────────────────────────────────

const { rows } = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
const kg       = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));
/* The source layer lives beside kg.json rather than inside it: the browser
   statically imports the graph, and 464 source nodes there cost 169 KB of eager
   JS for data no page renders (see build-kg.mjs). */
const SOURCES_JSON = join(ROOT, 'data', 'kg-sources.json');
const sourceLayer = existsSync(SOURCES_JSON)
  ? JSON.parse(readFileSync(SOURCES_JSON, 'utf8'))
  : { sources: [], attestations: [] };
const attestationsBySubject = new Map();
for (const a of sourceLayer.attestations) {
  if (!attestationsBySubject.has(a.subject)) attestationsBySubject.set(a.subject, []);
  attestationsBySubject.get(a.subject).push(a);
}

const slugs = buildSlugs(rows);
const shrinesWithSlugs = rows.map((row, i) => ({ row, slug: slugs[i] }));

const relBySubject = new Map();
const relByObject  = new Map();
for (const r of kg.relations) {
  if (!relBySubject.has(r.subject)) relBySubject.set(r.subject, []);
  relBySubject.get(r.subject).push(r);
  if (!relByObject.has(r.object))  relByObject.set(r.object, []);
  relByObject.get(r.object).push(r);
}

// ── Turtle document builder ───────────────────────────────────────────────────

const lines = [];

function emit(line = '') { lines.push(line); }

// Prefixes
emit('@prefix schema:  <https://schema.org/> .');
emit(`@prefix sufi:    <${VOCAB}> .`);
emit('@prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#> .');
emit('@prefix wd:      <https://www.wikidata.org/entity/> .');
emit('@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .');
emit('@prefix shrine:  <' + KG_BASE + 'shrine/> .');
emit('@prefix saint:   <' + KG_BASE + 'saint/> .');
emit('@prefix order_:  <' + KG_BASE + 'order/> .');
emit('@prefix place:   <' + KG_BASE + 'place/> .');
emit('@prefix event_:  <' + KG_BASE + 'event/> .');
emit('@prefix source_: <' + KG_BASE + 'source/> .');
emit();

// Vocabulary declarations
emit('# ── Vocabulary ────────────────────────────────────────────────────────────');
emit('sufi:SufiOrder rdfs:subClassOf schema:Organization .');
emit('sufi:UrsEvent  rdfs:subClassOf schema:Event .');
emit(`sufi:buriedAt      rdfs:subPropertyOf schema:location ;`);
emit(`                   rdfs:label "buried at"@en .`);
emit(`sufi:commemorates  rdfs:subPropertyOf schema:about ;`);
emit(`                   rdfs:label "commemorates"@en .`);
emit(`sufi:silsila       rdfs:label "spiritual lineage (silsila)"@en .`);
/* Kinship. `son_of`/`daughter_of` and `sibling_of` go out as schema.org's own
   `parent` and `sibling`; these four have no standard equivalent and are
   declared here so a consumer can at least read what they mean. Turtle carries
   no OWL in this export, so `schema:sibling` is emitted from both ends rather
   than left to be inferred — see scripts/data/lib/kinExport.mjs. */
emit(`sufi:grandsonOf    rdfs:label "grandson of"@en .`);
emit(`sufi:nephewOf      rdfs:label "nephew of"@en .`);
emit(`sufi:sonInLawOf    rdfs:label "son-in-law of"@en .`);
emit(`sufi:descendantOf  rdfs:label "descendant of"@en .`);
emit();

// Orders
emit('# ── Sufi Orders ───────────────────────────────────────────────────────────');
for (const o of kg.orders) {
  emit(`order_:${o.slug}`);
  emit(`  a schema:Organization, sufi:SufiOrder ;`);
  emit(`  schema:name ${lit(o.name)} ;`);
  if (o.arabicName)  emit(`  schema:alternateName ${lit(o.arabicName, 'ar')} ;`);
  if (o.description) emit(`  schema:description ${litLong(o.description)} ;`);
  if (o.founded)     emit(`  schema:foundingDate ${lit(o.founded, '')} ;`);
  if (o.wikidataQid) emit(`  schema:sameAs ${wdIri(o.wikidataQid)} ;`);
  emit('  .');
  emit();
}

/* Kinship, expanded once and grouped by the figure the triple is emitted on —
   a symmetric tie produces one for the figure that is not the stored subject. */
const kinBySubject = new Map();
for (const t of kinTriples(kg.relations)) {
  if (!kinBySubject.has(t.subjectSlug)) kinBySubject.set(t.subjectSlug, []);
  kinBySubject.get(t.subjectSlug).push(t);
}

/* Same guard the JSON-LD export runs, for the same reason: this file names each
   relation type it handles, so one it does not name leaves no trace and no
   error. See scripts/data/lib/relationExport.mjs. */
assertRelationTypesKnown(kg.relations);

const descentBySubject = new Map();
for (const t of descentTriples(kg.relations)) {
  if (!descentBySubject.has(t.subjectSlug)) descentBySubject.set(t.subjectSlug, []);
  descentBySubject.get(t.subjectSlug).push(t);
}

// Saints
emit('# ── Saints ────────────────────────────────────────────────────────────────');
for (const s of kg.saints) {
  const orderRel  = (relBySubject.get(s.id) ?? []).find((r) => r.type === 'belongs_to_order');
  const orderSlug = orderRel ? orderRel.object.replace(/^order:/, '') : null;
  const discipleOfRels = (relBySubject.get(s.id) ?? []).filter((r) => r.type === 'disciple_of');
  const successorOfRels = (relBySubject.get(s.id) ?? []).filter((r) => r.type === 'successor_of');

  emit(`saint:${s.slug}`);
  emit(`  a schema:Person ;`);
  emit(`  schema:name ${lit(s.name)} ;`);
  if (s.altNames?.length) {
    for (const alt of s.altNames) emit(`  schema:alternateName ${lit(alt)} ;`);
  }
  if (s.born)       emit(`  schema:birthDate ${lit(s.born, '')} ;`);
  if (s.died)       emit(`  schema:deathDate ${lit(s.died, '')} ;`);
  if (orderSlug)    emit(`  schema:memberOf order_:${orderSlug} ;`);
  for (const r of discipleOfRels) {
    emit(`  sufi:discipleOf saint:${r.object.replace(/^saint:/, '')} ;`);
  }
  for (const r of successorOfRels) {
    emit(`  sufi:successorOf saint:${r.object.replace(/^saint:/, '')} ;`);
  }
  for (const t of kinBySubject.get(s.slug) ?? []) {
    emit(`  ${t.schemaOrg ? 'schema' : 'sufi'}:${t.predicate} saint:${t.objectSlug} ;`);
  }
  /* The number of removes is not emitted here either — see the note in the
     JSON-LD exporter. Both formats state the relation and neither states the
     distance, which is the one thing worse than losing it: the two exports
     disagreeing about the same graph. */
  for (const t of descentBySubject.get(s.slug) ?? []) {
    emit(`  sufi:descendantInLineageOf saint:${t.objectSlug} ;`);
  }
  if (s.wikidataQid) emit(`  schema:sameAs ${wdIri(s.wikidataQid)} ;`);
  emit('  .');
  emit();
}

// Places
emit('# ── Places ────────────────────────────────────────────────────────────────');
for (const p of kg.places) {
  emit(`place:${p.slug}`);
  emit(`  a schema:Place ;`);
  emit(`  schema:name ${lit(p.name)} ;`);
  emit(`  schema:address [`);
  emit(`    a schema:PostalAddress ;`);
  emit(`    schema:addressLocality ${lit(p.district)} ;`);
  emit(`    schema:addressRegion   ${lit(p.province)} ;`);
  emit(`    schema:addressCountry  "PK"^^xsd:string`);
  emit(`  ] ;`);
  emit('  .');
  emit();
}

// Events
emit('# ── Urs Events ────────────────────────────────────────────────────────────');
for (const e of kg.events) {
  const evSlug = e.id.replace(/^event:/, '');
  emit(`event_:${evSlug}`);
  /* `sufi:UrsEvent` only where the record says urs. This asserted it for all
     168 events, 86 of them at Hindu temples and Sikh gurdwaras — the graph's own
     category error (HANDOVER §9.106) restated in RDF, where a consumer reads it
     as a claim about the tradition. */
  emit(`  a schema:Event${e.eventType === 'urs' ? ', sufi:UrsEvent' : ''} ;`);
  emit(`  schema:name ${lit(e.name)} ;`);
  if (e.shrineSlug) emit(`  schema:location shrine:${e.shrineSlug} ;`);
  if (e.saintSlug)  emit(`  schema:about saint:${e.saintSlug} ;`);
  if (e.date)       emit(`  schema:description ${lit(`Takes place in ${e.date}`)} ;`);
  if (e.frequency === 'annual') {
    emit(`  schema:eventSchedule [`);
    emit(`    a schema:Schedule ;`);
    emit(`    schema:repeatFrequency "P1Y"^^xsd:string`);
    emit(`  ] ;`);
  }
  emit('  .');
  emit();
}

// Shrines
// Sources
emit('# ── Sources ───────────────────────────────────────────────────────────────');
/* The archive's 533 citations, deduped to 464 nodes. `kg.sources` was empty
   until 24 August 2026, so an export whose whole purpose is machine-readable
   provenance carried none of it. The citation is emitted verbatim: it is the
   exact string a reader needs to find the source, and it is deliberately not
   split into author/title/publisher, because a wrong split loses them that. */
for (const source of sourceLayer.sources) {
  const sSlug = source.id.replace(/^source:/, '');
  emit(`source_:${sSlug}`);
  emit(`  a schema:CreativeWork ;`);
  emit(`  schema:name ${lit(source.name)} ;`);
  emit('  .');
  emit();
}

emit('# ── Shrines ───────────────────────────────────────────────────────────────');
for (const { row, slug } of shrinesWithSlugs) {
  const lat  = parseFloat(row['Latitude'] || '');
  const lng  = parseFloat(row['Longitude'] || '');
  const name = (row['Name'] || '').trim();
  const description = (row['Description'] || '').trim();
  const image = getImageUrl(row);

  const parts = (row['Location'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (parts[parts.length - 1] === 'Pakistan') parts.pop();
  const city     = parts[0] || '';
  const province = parts.length > 0 ? parts[parts.length - 1] : '';

  const locRel   = (relBySubject.get(slug) ?? []).find((r) => r.type === 'located_in');
  const placeSlug = locRel ? locRel.object.replace(/^place:/, '') : null;

  const saintRels = (relByObject.get(slug) ?? []).filter((r) => r.type === 'buried_at');

  emit(`shrine:${slug}`);
  emit(`  a schema:LandmarksOrHistoricalBuildings, schema:PlaceOfWorship ;`);
  emit(`  schema:name ${lit(name)} ;`);
  if (description) emit(`  schema:description ${litLong(description)} ;`);
  if (image)       emit(`  schema:image <${image}> ;`);
  emit(`  schema:geo [`);
  emit(`    a schema:GeoCoordinates ;`);
  emit(`    schema:latitude  ${dec(lat)} ;`);
  emit(`    schema:longitude ${dec(lng)}`);
  emit(`  ] ;`);
  if (city || province) {
    emit(`  schema:address [`);
    emit(`    a schema:PostalAddress ;`);
    if (city)     emit(`    schema:addressLocality ${lit(city)} ;`);
    if (province) emit(`    schema:addressRegion   ${lit(province)} ;`);
    emit(`    schema:addressCountry "PK"^^xsd:string`);
    emit(`  ] ;`);
  }
  if (placeSlug) emit(`  schema:containedInPlace place:${placeSlug} ;`);
  for (const r of saintRels) {
    const sSlug = r.subject.replace(/^saint:/, '');
    emit(`  schema:about saint:${sSlug} ;`);
  }
  // What this entry rests on. schema:citation is exactly this relation.
  for (const r of attestationsBySubject.get(slug) ?? []) {
    emit(`  schema:citation source_:${r.object.replace(/^source:/, '')} ;`);
  }
  emit('  .');
  emit();
}

// ── write ─────────────────────────────────────────────────────────────────────

mkdirSync(EXPORT_DIR, { recursive: true });
const serialized = lines.join('\n');
const OUT_PATH = join(EXPORT_DIR, 'graph.ttl');

const shrineCount = shrinesWithSlugs.length;
const totalTriples = lines.filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('@')).length;

if (process.argv.includes('--check')) {
  const current = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : null;
  if (current !== serialized) {
    console.error(
      '[rdf] data/export/graph.ttl is stale — the committed data release does not match ' +
        'the graph it is exported from. Run: npm run data:export',
    );
    process.exit(1);
  }
  console.log(`[rdf] OK — data/export/graph.ttl matches the graph (~${totalTriples} statements).`);
} else {
  writeFileSync(OUT_PATH, serialized, 'utf8');
  console.log(`[rdf] ✓ data/export/graph.ttl — ${shrineCount} shrines, ~${totalTriples} statements`);
}
