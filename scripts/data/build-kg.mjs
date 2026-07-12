#!/usr/bin/env node
/**
 * build-kg.mjs — Build the knowledge graph from the canonical shrine dataset.
 *
 * Reads data/shrines.json + data/kg-seeds.json and promotes free-text entity
 * references (saints, Sufi orders, places, events) into first-class typed
 * entities with stable IDs, stable slugs, and referential-integrity checks.
 *
 * Outputs data/kg.json — the canonical KG file consumed by the app and by
 * the JSON-LD / RDF export scripts (B2).
 *
 * Decisions logged to reviewNeeded in the output for human follow-up.
 *
 * Usage:  node scripts/data/build-kg.mjs
 * Or:     npm run data:kg    (chains data:validate first)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify, buildSlugs } from './lib/slugs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// ── saint name normalisation ──────────────────────────────────────────────────

function applySaintMerge(raw, mergeVariants) {
  return mergeVariants[raw] ?? raw;
}

function canonicalizeSaintName(raw, mergeVariants) {
  const merged = applySaintMerge(raw, mergeVariants);
  return merged.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Pull the parenthetical off a raw "Sufi Saint" value as an altName candidate.
 * Most parentheticals are just one descriptive aside (a role, a date, an
 * epithet) and are kept verbatim, as before. The one case worth special-
 * casing is an explicit "also known/revered as A/B" list — splitting *only*
 * that pattern avoids mangling unrelated slashes elsewhere (e.g. "assoc. w/
 * Guru Nanak") while still turning e.g. "Sheikh Tahir (also revered as Udero
 * Lal/Jhulelal)" into two clean names instead of one run-on fragment.
 */
function extractParenthetical(raw) {
  const match = raw.match(/\(([^)]+)\)/);
  if (!match) return [];
  const knownAs = match[1].match(/^\s*(?:also\s+)?(?:known|revered)\s+as\s+(.+)$/i);
  if (knownAs) {
    return knownAs[1]
      .split(/\s*\/\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [match[1]];
}

// ── location parsing ──────────────────────────────────────────────────────────

function parseLocation(location) {
  if (!location) return null;
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;

  let country = 'Pakistan';
  if (parts[parts.length - 1] === 'Pakistan') {
    parts.pop();
  }

  if (!parts.length) return null;

  const province = parts[parts.length - 1];
  const city = parts[0];
  const district = parts.length >= 2 ? parts[1] : city;

  return { city, district, province, country };
}

// ── event type detection ──────────────────────────────────────────────────────

const ISLAMIC_MONTHS = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', 'Dhu al-Qidah', 'Dhu al-Hijjah',
];

function parseEvent(evText) {
  if (!evText?.trim()) return null;
  const lower = evText.toLowerCase();
  const frequency = lower.includes('annual') ? 'annual' :
                    lower.includes('monthly') ? 'monthly' :
                    lower.includes('biannual') ? 'biannual' : 'annual';
  const monthMatch = evText.match(new RegExp(`\\b(${ISLAMIC_MONTHS.join('|')})\\b`, 'i'));
  const date = monthMatch ? monthMatch[1] : undefined;
  return { frequency, date };
}

// ── load inputs ───────────────────────────────────────────────────────────────

const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');
const SEEDS_JSON = join(ROOT, 'data', 'kg-seeds.json');

if (!existsSync(SHRINES_JSON)) {
  console.error('[kg] data/shrines.json not found. Run: npm run data:build');
  process.exit(1);
}
if (!existsSync(SEEDS_JSON)) {
  console.error('[kg] data/kg-seeds.json not found.');
  process.exit(1);
}

const { rows } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
const seeds = JSON.parse(readFileSync(SEEDS_JSON, 'utf8'));

const mergeVariants = seeds.saintMergeVariants ?? {};
const seedOrders = seeds.orders ?? [];
const saintOrders = seeds.saintOrders ?? {};
delete saintOrders.comment;
const qidMap = seeds.saintWikidataQids ?? {};
const lineageRelations = seeds.lineageRelations ?? [];

// ── generate shrine slugs (same logic as the app) ────────────────────────────

const shrineSlugs = buildSlugs(rows);
const shrinesWithSlugs = rows.map((row, i) => ({ row, slug: shrineSlugs[i] }));

// ── extract: orders (from seeds) ─────────────────────────────────────────────

const orders = seedOrders.map((o) => ({
  id: `order:${o.slug}`,
  type: 'order',
  slug: o.slug,
  name: o.name,
  arabicName: o.arabicName,
  founded: o.founded,
  description: o.description,
  ...(o.wikidataQid ? { wikidataQid: o.wikidataQid } : {}),
}));

const orderBySlug = new Map(orders.map((o) => [o.slug, o]));

// ── extract: saints ───────────────────────────────────────────────────────────

const saintMap = new Map(); // slug → KGSaint (partial, shrines[] grows)
const reviewNeeded = [];

for (const { row, slug: shrineSlug } of shrinesWithSlugs) {
  const rawSaint = String(row['Sufi Saint'] ?? '').trim();
  if (!rawSaint) continue;

  const canonical = canonicalizeSaintName(rawSaint, mergeVariants);
  const saintSlug = slugify(canonical);
  if (!saintSlug) continue;

  const altNames = extractParenthetical(rawSaint).filter((n) => n !== canonical);

  if (!saintMap.has(saintSlug)) {
    const qidEntry = qidMap[saintSlug];
    saintMap.set(saintSlug, {
      id: `saint:${saintSlug}`,
      type: 'saint',
      slug: saintSlug,
      name: canonical,
      altNames: [...altNames],
      shrines: [],
      ...(qidEntry?.confirmed && qidEntry.qid ? { wikidataQid: qidEntry.qid } : {}),
    });
  }

  const entity = saintMap.get(saintSlug);

  if (!entity.shrines.includes(shrineSlug)) {
    entity.shrines.push(shrineSlug);
  }

  for (const altName of altNames) {
    if (!entity.altNames.includes(altName)) {
      entity.altNames.push(altName);
    }
  }

  // Log the merge decision for review
  if (rawSaint !== canonical) {
    const alreadyLogged = reviewNeeded.some(
      (r) => r.entityId === `saint:${saintSlug}` && r.issue === 'name-merge',
    );
    if (!alreadyLogged) {
      reviewNeeded.push({
        issue: 'name-merge',
        entityId: `saint:${saintSlug}`,
        details: `"${rawSaint}" merged into canonical "${canonical}" (slug: ${saintSlug}). Verify the merge is correct.`,
      });
    }
  }
}

const saints = [...saintMap.values()];

// Apply any order associations from seeds
const saintBySlug = new Map(saints.map((s) => [s.slug, s]));

// ── extract: places ───────────────────────────────────────────────────────────

const placeMap = new Map(); // district-slug → KGPlace

for (const { row } of shrinesWithSlugs) {
  const location = String(row['Location'] ?? '').trim();
  const parsed = parseLocation(location);
  if (!parsed) continue;

  const districtSlug = slugify(parsed.district) || slugify(parsed.city);
  if (!districtSlug) continue;

  if (!placeMap.has(districtSlug)) {
    placeMap.set(districtSlug, {
      id: `place:${districtSlug}`,
      type: 'place',
      slug: districtSlug,
      name: parsed.district || parsed.city,
      city: parsed.city !== parsed.district ? parsed.city : undefined,
      district: parsed.district,
      province: parsed.province,
      country: parsed.country,
    });
  }
}

const places = [...placeMap.values()];
const placeByDistrictSlug = new Map(places.map((p) => [p.slug, p]));

// ── extract: events ───────────────────────────────────────────────────────────

const events = [];

for (const { row, slug: shrineSlug } of shrinesWithSlugs) {
  const evText = String(row['Events'] ?? '').trim();
  const parsed = parseEvent(evText);
  if (!parsed) continue;

  const rawSaint = String(row['Sufi Saint'] ?? '').trim();
  const canonical = rawSaint ? canonicalizeSaintName(rawSaint, mergeVariants) : '';
  const saintSlug = canonical ? slugify(canonical) : undefined;

  const shrine = row['Name'] || '';
  const evSlug = `urs-${shrineSlug}`;

  events.push({
    id: `event:${evSlug}`,
    type: 'event',
    slug: evSlug,
    name: `Urs${saintSlug ? ' of ' + (saintBySlug.get(saintSlug)?.name ?? canonical) : ''}${shrine ? ' at ' + shrine : ''}`,
    eventType: 'urs',
    shrineSlug,
    saintSlug,
    date: parsed.date,
    frequency: parsed.frequency,
  });
}

// ── build: relations ──────────────────────────────────────────────────────────

const relations = [];

// saint → buried_at → shrine
for (const saint of saints) {
  for (const shrineSlug of saint.shrines) {
    relations.push({
      id: `buried_at:${saint.id}:${shrineSlug}`,
      type: 'buried_at',
      subject: saint.id,
      object: shrineSlug,
      confidence: 1.0,
      method: 'rule',
    });
  }
}

// shrine → located_in → place
for (const { row, slug: shrineSlug } of shrinesWithSlugs) {
  const location = String(row['Location'] ?? '').trim();
  const parsed = parseLocation(location);
  if (!parsed) continue;
  const districtSlug = slugify(parsed.district) || slugify(parsed.city);
  const place = placeByDistrictSlug.get(districtSlug);
  if (!place) continue;

  const relId = `located_in:${shrineSlug}:${place.id}`;
  if (!relations.some((r) => r.id === relId)) {
    relations.push({
      id: relId,
      type: 'located_in',
      subject: shrineSlug,
      object: place.id,
      confidence: 0.95,
      method: 'rule',
    });
  }
}

// saint → belongs_to_order → order (from seeds)
for (const [saintSlug, orderSlug] of Object.entries(saintOrders)) {
  if (!saintBySlug.has(saintSlug)) {
    reviewNeeded.push({
      issue: 'seed-saint-not-found',
      entityId: `saint:${saintSlug}`,
      details: `saintOrders entry for "${saintSlug}" has no matching saint entity in the dataset.`,
    });
    continue;
  }
  if (!orderBySlug.has(orderSlug)) {
    reviewNeeded.push({
      issue: 'seed-order-not-found',
      entityId: `order:${orderSlug}`,
      details: `saintOrders maps "${saintSlug}" to order "${orderSlug}" but that order slug is not in kg-seeds.json.`,
    });
    continue;
  }
  relations.push({
    id: `belongs_to_order:saint:${saintSlug}:order:${orderSlug}`,
    type: 'belongs_to_order',
    subject: `saint:${saintSlug}`,
    object: `order:${orderSlug}`,
    confidence: 0.9,
    method: 'human',
  });
}

// saint → disciple_of|successor_of → saint (from seeds, hand-extracted from shrine_entries)
for (const rel of lineageRelations) {
  const { subjectSlug, relation, objectSlug, confidence, source, quote, notes } = rel;
  if (!subjectSlug || !relation || !objectSlug) continue; // skip stray comment-only entries

  if (!saintBySlug.has(subjectSlug)) {
    reviewNeeded.push({
      issue: 'seed-saint-not-found',
      entityId: `saint:${subjectSlug}`,
      details: `lineageRelations entry has no matching saint entity for subjectSlug "${subjectSlug}".`,
    });
    continue;
  }
  if (!saintBySlug.has(objectSlug)) {
    reviewNeeded.push({
      issue: 'seed-saint-not-found',
      entityId: `saint:${objectSlug}`,
      details: `lineageRelations entry has no matching saint entity for objectSlug "${objectSlug}".`,
    });
    continue;
  }
  relations.push({
    id: `${relation}:saint:${subjectSlug}:saint:${objectSlug}`,
    type: relation,
    subject: `saint:${subjectSlug}`,
    object: `saint:${objectSlug}`,
    confidence: confidence ?? 0.8,
    method: 'human',
    source,
    quote,
    ...(notes ? { notes } : {}),
  });
}

// saint → commemorated_by → event
for (const event of events) {
  if (!event.saintSlug) continue;
  const saintId = `saint:${event.saintSlug}`;
  if (!saintBySlug.has(event.saintSlug)) continue;
  relations.push({
    id: `commemorated_by:${saintId}:${event.id}`,
    type: 'commemorated_by',
    subject: saintId,
    object: event.id,
    confidence: 0.9,
    method: 'rule',
  });
}

// ── add seed review notes ─────────────────────────────────────────────────────

for (const note of seeds.reviewNeededNotes ?? []) {
  reviewNeeded.push({ issue: 'seed-note', details: note });
}

// ── build: stats ──────────────────────────────────────────────────────────────

const stats = {
  saints: saints.length,
  orders: orders.length,
  places: places.length,
  events: events.length,
  sources: 0,
  relations: relations.length,
  ambiguousMerges: reviewNeeded.filter((r) => r.issue === 'name-merge').length,
};

// ── write output ──────────────────────────────────────────────────────────────

const kg = {
  schema_version: '1.0.0',
  generated: new Date().toISOString(),
  saints,
  orders,
  places,
  events,
  sources: [],
  relations,
  stats,
  reviewNeeded,
};

writeFileSync(join(ROOT, 'data', 'kg.json'), JSON.stringify(kg, null, 2) + '\n', 'utf8');

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`[kg] ✓ saints: ${stats.saints}  orders: ${stats.orders}  places: ${stats.places}  events: ${stats.events}`);
console.log(`[kg] ✓ relations: ${stats.relations}  (${stats.ambiguousMerges} merge(s) logged for review)`);
if (reviewNeeded.length > 0) {
  console.log(`[kg] ⚠  ${reviewNeeded.length} item(s) need review → see data/kg.json reviewNeeded`);
}
console.log('[kg] ✓ data/kg.json written');
