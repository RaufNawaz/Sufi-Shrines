#!/usr/bin/env node
/**
 * export-rdf.mjs — Export the knowledge graph as RDF/Turtle.
 *
 * Reads data/kg.json + data/shrines.json and emits data/export/graph.ttl
 * using schema.org + a custom sufi: namespace for Sufi-specific concepts.
 * No external RDF library is required; the Turtle is hand-serialised.
 *
 * Usage:  node scripts/data/export-rdf.mjs
 * Or:     npm run data:export    (chains data:kg, export-jsonld, then this)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './lib/slugs.mjs';

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
  emit(`  a schema:Event, sufi:UrsEvent ;`);
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
  emit('  .');
  emit();
}

// ── write ─────────────────────────────────────────────────────────────────────

mkdirSync(EXPORT_DIR, { recursive: true });
writeFileSync(join(EXPORT_DIR, 'graph.ttl'), lines.join('\n'), 'utf8');

const shrineCount = shrinesWithSlugs.length;
const totalTriples = lines.filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('@')).length;
console.log(`[rdf] ✓ data/export/graph.ttl — ${shrineCount} shrines, ~${totalTriples} statements`);
