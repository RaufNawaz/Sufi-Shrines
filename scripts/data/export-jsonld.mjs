#!/usr/bin/env node
/**
 * export-jsonld.mjs — Export the knowledge graph as a JSON-LD document.
 *
 * Reads data/kg.json + data/shrines.json and emits data/export/graph.jsonld,
 * a single JSON-LD @graph using schema.org types plus a custom sufi: vocabulary
 * for silsila (Sufi orders) and urs events.
 *
 * Usage:  node scripts/data/export-jsonld.mjs
 *         node scripts/data/export-jsonld.mjs --check   # verify, write nothing
 * Or:     npm run data:export    (chains data:kg first)
 *
 * `--check` exists because this file is a COMMITTED ARTIFACT that nothing
 * regenerated. On 30 August 2026 the checked-in export held 196 Person nodes
 * and 5 orders while the graph held 200 and 9 — four figures and four orders
 * behind, for an unknown number of days, with every gate green. An export is
 * the one thing in this repo whose whole purpose is to be read by somebody
 * else, so it is the worst possible place for silent drift. Now in
 * `data:validate`.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './lib/slugs.mjs';
import { kinTriples } from './lib/kinExport.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const EXPORT_DIR = join(ROOT, 'data', 'export');

// ── IRI bases ─────────────────────────────────────────────────────────────────

const KG_BASE = 'https://github.com/raufnawaz/sufi-shrines/data/';
const VOCAB = 'https://github.com/raufnawaz/sufi-shrines/vocab#';

const iri = (type, slug) => `${KG_BASE}${type}/${slug}`;
const wdIri = (qid) => `https://www.wikidata.org/entity/${qid}`;

// ── JSON-LD context ───────────────────────────────────────────────────────────

const CONTEXT = [
  'https://schema.org',
  {
    sufi: VOCAB,
    SufiOrder:    { '@id': `${VOCAB}SufiOrder` },
    UrsEvent:     { '@id': `${VOCAB}UrsEvent` },
    silsila:      { '@id': `${VOCAB}silsila` },
    commemorates: { '@id': `${VOCAB}commemorates`, '@type': '@id' },
    buriedAt:     { '@id': `${VOCAB}buriedAt`,     '@type': '@id' },
    /* Kinship. `son_of`/`daughter_of` and `sibling_of` leave as schema.org's
       own `parent` and `sibling` and need no term here. These four have no
       standard equivalent — schema.org models the nuclear family and stops —
       so they are sub-properties of the archive's own vocabulary rather than
       being flattened into `relatedTo`. See scripts/data/lib/kinExport.mjs. */
    grandsonOf:   { '@id': `${VOCAB}grandsonOf`,   '@type': '@id' },
    nephewOf:     { '@id': `${VOCAB}nephewOf`,     '@type': '@id' },
    sonInLawOf:   { '@id': `${VOCAB}sonInLawOf`,   '@type': '@id' },
    descendantOf: { '@id': `${VOCAB}descendantOf`, '@type': '@id' },
  },
];

function getImageUrl(row) {
  for (const k of Object.keys(row)) {
    if (/image/i.test(k)) {
      const v = String(row[k] || '').trim();
      if (v && /^https?:\/\//i.test(v)) return v;
    }
  }
  return null;
}

function parseLocationAddress(location) {
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts[parts.length - 1] === 'Pakistan') parts.pop();
  return {
    city: parts[0] || '',
    province: parts.length > 0 ? parts[parts.length - 1] : '',
  };
}

// ── load inputs ───────────────────────────────────────────────────────────────

const { rows } = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));
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

// Pre-index relations by type + subject/object for O(1) lookups
const relBySubject = new Map();
const relByObject  = new Map();
for (const r of kg.relations) {
  if (!relBySubject.has(r.subject)) relBySubject.set(r.subject, []);
  relBySubject.get(r.subject).push(r);
  if (!relByObject.has(r.object))  relByObject.set(r.object, []);
  relByObject.get(r.object).push(r);
}

// ── build @graph ──────────────────────────────────────────────────────────────

const graph = [];

// Orders
for (const o of kg.orders) {
  graph.push({
    '@type': ['Organization', 'SufiOrder'],
    '@id': iri('order', o.slug),
    'name': o.name,
    ...(o.arabicName   ? { 'alternateName': o.arabicName } : {}),
    ...(o.description  ? { 'description': o.description } : {}),
    ...(o.founded      ? { 'foundingDate': o.founded } : {}),
    ...(o.wikidataQid  ? { 'sameAs': wdIri(o.wikidataQid) } : {}),
  });
}

/* Kinship, expanded once for the whole graph and grouped by the figure it is
   emitted on. Not read off `relBySubject` like the other relations, because a
   symmetric tie produces a triple for a figure that is not the stored subject —
   see scripts/data/lib/kinExport.mjs. */
const kinBySubject = new Map();
for (const t of kinTriples(kg.relations)) {
  if (!kinBySubject.has(t.subjectSlug)) kinBySubject.set(t.subjectSlug, []);
  kinBySubject.get(t.subjectSlug).push(t);
}

// Saints
for (const s of kg.saints) {
  const orderRel = (relBySubject.get(s.id) ?? []).find((r) => r.type === 'belongs_to_order');
  const orderSlug = orderRel ? orderRel.object.replace(/^order:/, '') : null;
  const discipleOfRels = (relBySubject.get(s.id) ?? []).filter((r) => r.type === 'disciple_of');
  const successorOfRels = (relBySubject.get(s.id) ?? []).filter((r) => r.type === 'successor_of');
  const kin = {};
  for (const t of kinBySubject.get(s.slug) ?? []) {
    const key = t.schemaOrg ? t.predicate : `sufi:${t.predicate}`;
    (kin[key] ??= []).push({ '@id': iri('saint', t.objectSlug) });
  }

  graph.push({
    '@type': 'Person',
    '@id': iri('saint', s.slug),
    'name': s.name,
    ...(s.altNames?.length ? { 'alternateName': s.altNames } : {}),
    ...(s.description  ? { 'description': s.description } : {}),
    ...(s.born         ? { 'birthDate': s.born } : {}),
    ...(s.died         ? { 'deathDate': s.died } : {}),
    ...(orderSlug      ? { 'memberOf': { '@id': iri('order', orderSlug) } } : {}),
    ...(discipleOfRels.length
      ? { 'sufi:discipleOf': discipleOfRels.map((r) => ({ '@id': iri('saint', r.object.replace(/^saint:/, '')) })) }
      : {}),
    ...(successorOfRels.length
      ? { 'sufi:successorOf': successorOfRels.map((r) => ({ '@id': iri('saint', r.object.replace(/^saint:/, '')) })) }
      : {}),
    ...kin,
    ...(s.wikidataQid  ? { 'sameAs': wdIri(s.wikidataQid) } : {}),
  });
}

// Places
for (const p of kg.places) {
  graph.push({
    '@type': 'Place',
    '@id': iri('place', p.slug),
    'name': p.name,
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': p.district,
      'addressRegion':   p.province,
      'addressCountry':  'PK',
    },
  });
}

// Events
for (const e of kg.events) {
  const evSlug = e.id.replace(/^event:/, '');
  graph.push({
    /* `UrsEvent` only for an urs. This typed every event as one, including 86
       at Hindu temples and Sikh gurdwaras — the same category error the graph
       itself carried (HANDOVER §9.106), one layer further out where a consumer
       reads it as a claim about the tradition. */
    '@type': e.eventType === 'urs' ? ['Event', 'UrsEvent'] : ['Event'],
    '@id': iri('event', evSlug),
    'name': e.name,
    ...(e.shrineSlug ? { 'location': { '@id': iri('shrine', e.shrineSlug) } } : {}),
    ...(e.saintSlug  ? { 'about':    { '@id': iri('saint',  e.saintSlug) } } : {}),
    ...(e.date       ? { 'description': `Takes place in ${e.date}` } : {}),
    ...(e.frequency === 'annual' ? {
      'eventSchedule': { '@type': 'Schedule', 'repeatFrequency': 'P1Y' },
    } : {}),
  });
}

// Sources
/*
 * The archive's citations, as CreativeWork nodes.
 *
 * `kg.sources` was empty until 24 August 2026, so an export whose whole purpose
 * is machine-readable provenance carried none. `name` is the citation verbatim:
 * it is the exact string a reader needs to find the source, and schema.org has
 * no better field for a bibliography line that has not been parsed into
 * author/title/publisher — which this archive deliberately does not do, because
 * a wrong split loses the reader their search string.
 */
for (const source of sourceLayer.sources) {
  const slug = source.id.replace(/^source:/, '');
  graph.push({
    '@type': 'CreativeWork',
    '@id': iri('source', slug),
    'name': source.name,
    ...(source.sourceType === 'website' ? { 'url': source.name.replace(/^<|>$/g, '') } : {}),
  });
}

// Shrines
for (const { row, slug } of shrinesWithSlugs) {
  const lat = parseFloat(row['Latitude'] || '');
  const lng = parseFloat(row['Longitude'] || '');
  const name = (row['Name'] || '').trim();
  const description = (row['Description'] || '').trim();
  const image = getImageUrl(row);
  const { city, province } = parseLocationAddress(row['Location'] || '');

  const locRel = (relBySubject.get(slug) ?? []).find((r) => r.type === 'located_in');
  const placeSlug = locRel ? locRel.object.replace(/^place:/, '') : null;

  const saintRels = (relByObject.get(slug) ?? []).filter((r) => r.type === 'buried_at');
  const aboutSaints = saintRels.map((r) => ({ '@id': iri('saint', r.subject.replace(/^saint:/, '')) }));

  /* What this entry rests on. schema.org's `citation` is exactly this relation,
     and an archive whose distinguishing claim is provenance was exporting none
     of it. */
  const citations = (attestationsBySubject.get(slug) ?? []).map((r) => ({
    '@id': iri('source', r.object.replace(/^source:/, '')),
  }));

  graph.push({
    '@type': ['LandmarksOrHistoricalBuildings', 'PlaceOfWorship'],
    '@id': iri('shrine', slug),
    'name': name,
    ...(description   ? { 'description': description } : {}),
    ...(image         ? { 'image': image } : {}),
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': lat,
      'longitude': lng,
    },
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': city,
      'addressRegion':   province,
      'addressCountry':  'PK',
    },
    ...(placeSlug     ? { 'containedInPlace': { '@id': iri('place', placeSlug) } } : {}),
    ...(aboutSaints.length === 1 ? { 'about': aboutSaints[0] } :
        aboutSaints.length  > 1 ? { 'about': aboutSaints }   : {}),
    ...(citations.length ? { 'citation': citations } : {}),
  });
}

// ── write ─────────────────────────────────────────────────────────────────────

mkdirSync(EXPORT_DIR, { recursive: true });

const document = { '@context': CONTEXT, '@graph': graph };
const serialized = JSON.stringify(document, null, 2) + '\n';
const OUT_PATH = join(EXPORT_DIR, 'graph.jsonld');

if (process.argv.includes('--check')) {
  const current = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : null;
  if (current !== serialized) {
    console.error(
      '[jsonld] data/export/graph.jsonld is stale — the committed data release does not ' +
        'match the graph it is exported from. Run: npm run data:export',
    );
    process.exit(1);
  }
  console.log(`[jsonld] OK — data/export/graph.jsonld matches the graph (${graph.length} nodes).`);
} else {
  writeFileSync(OUT_PATH, serialized, 'utf8');
  console.log(`[jsonld] ✓ data/export/graph.jsonld — ${graph.length} nodes`);
}
