#!/usr/bin/env node
/**
 * export-jsonld.mjs — Export the knowledge graph as a JSON-LD document.
 *
 * Reads data/kg.json + data/shrines.json and emits data/export/graph.jsonld,
 * a single JSON-LD @graph using schema.org types plus a custom sufi: vocabulary
 * for silsila (Sufi orders) and urs events.
 *
 * Usage:  node scripts/data/export-jsonld.mjs
 * Or:     npm run data:export    (chains data:kg first)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './lib/slugs.mjs';

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

// Saints
for (const s of kg.saints) {
  const orderRel = (relBySubject.get(s.id) ?? []).find((r) => r.type === 'belongs_to_order');
  const orderSlug = orderRel ? orderRel.object.replace(/^order:/, '') : null;

  graph.push({
    '@type': 'Person',
    '@id': iri('saint', s.slug),
    'name': s.name,
    ...(s.altNames?.length ? { 'alternateName': s.altNames } : {}),
    ...(s.description  ? { 'description': s.description } : {}),
    ...(s.born         ? { 'birthDate': s.born } : {}),
    ...(s.died         ? { 'deathDate': s.died } : {}),
    ...(orderSlug      ? { 'memberOf': { '@id': iri('order', orderSlug) } } : {}),
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
    '@type': ['Event', 'UrsEvent'],
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
  });
}

// ── write ─────────────────────────────────────────────────────────────────────

mkdirSync(EXPORT_DIR, { recursive: true });

const document = { '@context': CONTEXT, '@graph': graph };
writeFileSync(
  join(EXPORT_DIR, 'graph.jsonld'),
  JSON.stringify(document, null, 2) + '\n',
  'utf8',
);

console.log(`[jsonld] ✓ data/export/graph.jsonld — ${graph.length} nodes`);
