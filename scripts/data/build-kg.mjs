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
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify, buildSlugs } from './lib/slugs.mjs';
import { resolveCategory, NON_MUSLIM_TRADITIONS } from './lib/category.mjs';
import { bibliographyItems, citationKey } from './lib/bibliography.mjs';

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

/**
 * Records that describe a site's *status* rather than an observance.
 *
 * The `Events` column answers "what happens here", and for 16 sites the honest
 * answer is nothing, or nothing documented: "Not documented", "None -
 * abandoned", "None - destroyed 1992", "Heritage site", "Reopened for
 * pilgrims". An event node built from one of those asserted a recurring
 * observance at a site whose own record says there is none — and it reached the
 * reader, because prerender.mjs publishes every event as a schema.org `Event` in
 * the JSON-LD of its shrine page.
 *
 * Matched on the *first* recorded segment only. "Hur gatherings on 27 Rajab and
 * at fixed times; no public urs observed" denies an urs while describing a real
 * observance, and a blanket search for negatives would throw the observance away
 * with the denial.
 */
const NO_OBSERVANCE_RECORDED =
  /^(not documented|none\b|heritage\b|heritage\/|preserved as\b|reopened\b|recently restored)/i;

/** Stated, not assumed. The old code's final fallback was `'annual'` for any
 *  non-empty text, so 83 of 168 events were published with
 *  `repeatFrequency: P1Y` on no evidence at all — including sites whose column
 *  reads "Not documented". An unstated frequency is now absent, and the JSON-LD
 *  already omits `eventSchedule` when it is. */
function statedFrequency(lower) {
  if (lower.includes('biannual')) return 'biannual';
  if (lower.includes('monthly')) return 'monthly';
  if (lower.includes('annual')) return 'annual';
  return undefined;
}

function parseEvent(evText) {
  if (!evText?.trim()) return null;
  const first = evText.split(';')[0].trim();
  if (NO_OBSERVANCE_RECORDED.test(first)) return null;
  const lower = evText.toLowerCase();
  const monthMatch = evText.match(new RegExp(`\\b(${ISLAMIC_MONTHS.join('|')})\\b`, 'i'));
  return {
    frequency: statedFrequency(lower),
    date: monthMatch ? monthMatch[1] : undefined,
    /* The source's own words for what happens here, which is what a non-urs
       observance has to be named from: the archive covers six traditions and
       has no vocabulary of its own for a Gurpurab or a Shivratri. The trailing
       parenthetical is dropped because it qualifies the date rather than naming
       the observance, and the date is carried in its own field. */
    recorded: first.replace(/\s*\([^()]*\)\s*$/, '').trim(),
    /* An urs is a Sufi death-anniversary observance. It is `urs` only where the
       record says so — see the call site, which also requires the site to be a
       Muslim shrine. */
    saysUrs: /\burs\b|\u02bfurs/i.test(evText),
  };
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

/* ── machine-extracted proposals ───────────────────────────────────────────────
   data/kg-lineage-proposals.json and data/kg-order-proposals.json are agent
   extractions from the archive's own English prose, every claim carrying a
   verbatim quote. scripts/data/verify-kg-proposals.mjs re-checks each quote
   against the source it names, so what lands here is provably not fabricated —
   but "not fabricated" is not "reviewed", and RULE 2 is explicit that machine
   output is a draft until a human reads it. So every relation derived from them
   is marked `method: 'machine-extracted'` and `reviewed: false`, keeps its
   quote and source, and the UI is expected to say so.

   This is the difference between the graph being thin and the graph being
   wrong: before this the explorer had 6 lineage edges across 130 figures, so
   the lineage feature had almost nothing to show. Filling it from the project's
   own field surveys and cited texts is the point; pretending the fill is
   reviewed would not be. */
function loadProposals(file) {
  const path = join(ROOT, 'data', file);
  if (!existsSync(path)) return [];
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  return doc.proposals ?? [];
}
const lineageProposals = loadProposals('kg-lineage-proposals.json');
const orderProposals = loadProposals('kg-order-proposals.json');
const dateProposals = loadProposals('kg-saint-dates-proposals.json');

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
  // The same one-liner in Urdu. English prose in the Urdu view is an
  // untranslated sentence, not a citation, so OrderPage/SaintPage drop the
  // English rather than print it (i18n rule 7) — an order with no
  // `descriptionUr` simply shows no summary in Urdu.
  ...(o.descriptionUr ? { descriptionUr: o.descriptionUr } : {}),
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

  // figure_type says WHAT this figure is, and the dataset fills it for 168 of
  // 169 rows: 'Sufi saint' (70), 'Deity' (33), 'Sikh Guru' (28), 'Sant' (17),
  // 'Historical person' (11), 'Individual', 'Collective', plus two rows whose
  // value is a hedged sentence rather than a category. It was never carried
  // into the graph, so every one of these entities was typed `saint` — which
  // is how the explorer came to list Durga, Kali, Krishna, Guru Nanak and
  // "Jain Tirthankaras" under a heading reading "All saints". On an archive
  // that sets out to cover six traditions honestly, that is a terminology
  // failure, not a cosmetic one (CLAUDE.md: respect the traditions in copy and
  // terminology). Carried verbatim — RULE 2 — so the two prose values stay
  // prose and the UI decides how to present them.
  const figureType = String(row['figure_type'] ?? '').trim();

  if (!saintMap.has(saintSlug)) {
    const qidEntry = qidMap[saintSlug];
    saintMap.set(saintSlug, {
      id: `saint:${saintSlug}`,
      type: 'saint',
      slug: saintSlug,
      name: canonical,
      altNames: [...altNames],
      shrines: [],
      ...(figureType ? { figureType } : {}),
      ...(qidEntry?.confirmed && qidEntry.qid ? { wikidataQid: qidEntry.qid } : {}),
    });
  }

  const entity = saintMap.get(saintSlug);

  // One canonical figure can be reached from several shrines, and those rows do
  // not always agree on figure_type (e.g. a Sikh Guru recorded as 'Sikh Guru'
  // at one gurdwara and 'Historical person' at another). Keep the first and
  // log the disagreement rather than letting row order decide silently.
  if (figureType && entity.figureType && entity.figureType !== figureType) {
    const alreadyLogged = reviewNeeded.some(
      (r) => r.entityId === `saint:${saintSlug}` && r.issue === 'figure-type-conflict',
    );
    if (!alreadyLogged) {
      reviewNeeded.push({
        issue: 'figure-type-conflict',
        entityId: `saint:${saintSlug}`,
        details: `figure_type differs across this figure's shrines: kept "${entity.figureType}", also saw "${figureType}". Decide which is right in the sheet.`,
      });
    }
  } else if (figureType && !entity.figureType) {
    entity.figureType = figureType;
  }

  /* The sheet's own dates. Like figure_type these were never carried, so the
     graph held ZERO born/died values while `figure_born` is filled for 66 rows
     and `figure_died` for 71 — saint pages simply showed no dates. Kept
     verbatim, because the archive's editorial standard treats a hedged date as
     correct content: "between about 1072 and 1077 CE (465–469 AH)" must not
     become 1072. These are authoritative; the machine-extracted proposals
     merged further down only fill what is still empty. */
  for (const [field, column] of [
    ['born', 'figure_born'],
    ['died', 'figure_died'],
  ]) {
    const value = String(row[column] ?? '').trim();
    if (!value) continue;
    if (entity[field] && entity[field] !== value) {
      const alreadyLogged = reviewNeeded.some(
        (r) => r.entityId === `saint:${saintSlug}` && r.issue === `${field}-conflict`,
      );
      if (!alreadyLogged) {
        reviewNeeded.push({
          issue: `${field}-conflict`,
          entityId: `saint:${saintSlug}`,
          details: `${column} differs across this figure's shrines: kept "${entity[field]}", also saw "${value}".`,
        });
      }
    } else if (!entity[field]) {
      entity[field] = value;
    }
  }

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

/* Teachers named in the prose who have no shrine in this archive — Hujwiri's
   master al-Khuttali, Mian Mir's Shaikh Siyustani, and 60-odd others. They are
   real graph nodes: without them a lineage stops at the first person who
   happens not to have a shrine here, which is most of them. But they are NOT
   archive entries, and listing them beside the documented figures would inflate
   the archive's own counts and imply coverage that does not exist. So they are
   flagged `lineageOnly` and the UI keeps them out of the "Figures in the
   archive" list while still drawing them in a lineage. */
for (const p of lineageProposals) {
  for (const side of ['subject', 'object']) {
    const slug = p[`${side}Slug`];
    const name = p[`${side}Name`];
    if (!slug || saintMap.has(slug)) continue;
    saintMap.set(slug, {
      id: `saint:${slug}`,
      type: 'saint',
      slug,
      name: name || slug,
      altNames: [],
      shrines: [],
      lineageOnly: true,
      reviewed: false,
    });
  }
}

/* Biographical anchors — dates, titles, alt-names — read out of the same prose.
   Only fills what is EMPTY: a value already in the sheet is the sheet's to
   change (RULE 3), and 17 of these proposals disagree with a column. Those
   disagreements are recorded in the proposals file under `disagreesWithColumn`
   for a human, not resolved here. Values the extractor withheld
   (`blockedFields`) stay withheld — the verifier fails the build if one is ever
   promoted back into a live field. */
for (const p of dateProposals) {
  const saint = saintMap.get(p.saintSlug);
  if (!saint) continue;
  let touched = false;

  for (const field of ['born', 'died']) {
    const value = typeof p[field] === 'string' ? p[field].trim() : '';
    if (!value) continue;
    if (p.blockedFields && field in p.blockedFields) continue;
    if (!saint[field]) {
      saint[field] = value;
      touched = true;
    }
  }
  if (p.precision && !saint.datePrecision) {
    saint.datePrecision = p.precision;
    touched = true;
  }
  for (const title of p.titles ?? []) {
    saint.titles ??= [];
    if (!saint.titles.includes(title)) {
      saint.titles.push(title);
      touched = true;
    }
  }
  for (const alt of p.altNames ?? []) {
    saint.altNames ??= [];
    if (!saint.altNames.includes(alt) && alt !== saint.name) {
      saint.altNames.push(alt);
      touched = true;
    }
  }
  if (touched) {
    saint.biographyReviewed = false;
    if (p.source) saint.biographySource = p.source;
  }
}

/* Dates the sources refuse to agree on. Carried onto the figure so a page can
   show the disagreement instead of picking a winner — the archive's editorial
   standard is that a contradiction reported is better content than a clean
   number (CLAUDE.md RULE 2). Eleven figures have one, the widest being a
   68-year spread on Mian Umar Baba's death. */
const datesDoc = existsSync(join(ROOT, 'data', 'kg-saint-dates-proposals.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'data', 'kg-saint-dates-proposals.json'), 'utf8'))
  : {};
for (const d of datesDoc.disputedDates ?? []) {
  const saint = saintMap.get(d.saintSlug);
  if (!saint) continue;
  saint.disputedDates ??= [];
  saint.disputedDates.push({
    field: d.field,
    values: d.values ?? [],
    ...(d.spreadYears != null ? { spreadYears: d.spreadYears } : {}),
    ...(d.quotes ? { quotes: d.quotes } : {}),
  });
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

  /*
   * An urs is a Sufi observance, and this used to be asserted for every site in
   * the archive: 86 of 168 events were named "Urs of Shiva at Amb Temples" or
   * "Urs of Bhai Waliram at Bhai Waliram Darbar", typed `urs`, and published as
   * schema.org `Event` nodes in those shrine pages' JSON-LD. The archive covers
   * six traditions; flattening a Shivratri and a Gurpurab into Sufi vocabulary
   * is the exact failure its own terminology rule exists to prevent.
   *
   * `urs` now requires both the site to be a Muslim shrine and the record to
   * say urs. Everything else is `observance` — a neutral word, and the *only*
   * other value in the vocabulary, because naming a Gurpurab a "gurpurab" from
   * a category would be this script inferring a taxonomy the record does not
   * give it. What the record does give is the observance's own name, so that is
   * what the node is called.
   */
  /* The record's own word is the evidence, and the tradition is the guard
     against a future sheet edit: exactly 77 rows mention urs today and every one
     of them is a Muslim shrine (or the single row whose `category` is the
     invalid "Islam", whose text plainly says *ʿurs*). Requiring
     `category === 'Muslim Shrine'` instead would have thrown that row's real
     urs away over a schema violation a human still has to fix in the sheet. */
  const isUrs = parsed.saysUrs && !NON_MUSLIM_TRADITIONS.has(resolveCategory(row));
  const evSlug = `${isUrs ? 'urs' : 'observance'}-${shrineSlug}`;
  const saintName = saintSlug ? (saintBySlug.get(saintSlug)?.name ?? canonical) : '';
  const at = shrine ? ` at ${shrine}` : '';

  events.push({
    id: `event:${evSlug}`,
    type: 'event',
    slug: evSlug,
    name: isUrs
      ? `Urs${saintName ? ' of ' + saintName : ''}${at}`
      : `${parsed.recorded || 'Observance'}${at}`,
    eventType: isUrs ? 'urs' : 'observance',
    shrineSlug,
    saintSlug,
    date: parsed.date,
    ...(parsed.frequency ? { frequency: parsed.frequency } : {}),
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

/* Verified machine-extracted lineage edges. Deliberately emitted AFTER the
   hand-curated seed loop so a seed always wins the id collision below: a human
   reading beats an extraction of the same pair. */
for (const p of lineageProposals) {
  const { subjectSlug, relation, objectSlug, confidence, source, quote, notes } = p;
  if (!subjectSlug || !relation || !objectSlug) continue;
  if (!saintBySlug.has(subjectSlug) || !saintBySlug.has(objectSlug)) continue;
  const id = `${relation}:saint:${subjectSlug}:saint:${objectSlug}`;
  if (relations.some((r) => r.id === id)) continue;
  relations.push({
    id,
    type: relation,
    subject: `saint:${subjectSlug}`,
    object: `saint:${objectSlug}`,
    confidence: confidence ?? 0.7,
    method: 'machine-extracted',
    reviewed: false,
    source,
    quote,
    ...(notes ? { notes } : {}),
  });
}

/* Verified machine-extracted order memberships. A proposal may place a figure
   in more than one order — several silsila values are compound ("Qadri
   Shattari", "Chishti Qadri") — so this emits one edge per parent order rather
   than forcing a single choice. `isProseNotValue` proposals carry no parent by
   construction (the verifier fails the build if one ever does), so they add no
   edge here; their text belongs on the page, not in the taxonomy. */
for (const p of orderProposals) {
  const { saintSlug, parentOrder, parentOrders, branch, asRecorded, confidence, source, quote } = p;
  if (!saintSlug || !saintBySlug.has(saintSlug)) continue;
  const targets = [parentOrder, ...(parentOrders ?? [])].filter(Boolean);
  for (const orderSlug of targets) {
    if (!orderBySlug.has(orderSlug)) continue;
    const id = `belongs_to_order:saint:${saintSlug}:order:${orderSlug}`;
    if (relations.some((r) => r.id === id)) continue;
    relations.push({
      id,
      type: 'belongs_to_order',
      subject: `saint:${saintSlug}`,
      object: `order:${orderSlug}`,
      confidence: confidence ?? 0.7,
      method: 'machine-extracted',
      reviewed: false,
      source,
      quote,
      // The branch and the raw cell are the information a parent-order edge
      // loses. Carried so the UI can say "Naqshbandi-Mujaddidi", not just
      // "Naqshbandiyya", and can show the cell as recorded (RULE 3).
      ...(branch ? { branch } : {}),
      ...(asRecorded ? { asRecorded } : {}),
    });
  }
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

// ── extract: sources ──────────────────────────────────────────────────────────

/*
 * The archive's 533 citations, as graph nodes.
 *
 * `kg.sources` was an empty array and `stats.sources` was 0 — on an archive
 * whose distinguishing claim is provenance, a knowledge graph with no source
 * layer at all. The `attested_in` relation type has been in `KGRelationType`
 * since the graph was designed, described as "entity/relation id → source", and
 * nothing ever emitted one.
 *
 * The point of putting them in a graph rather than counting them is the
 * *sharing*: a source cited by nine entries becomes one node with nine edges,
 * which is the question a reader of an archive actually has — not "how many
 * citations are there" but "what does this rest on, and what else rests on the
 * same thing".
 *
 * **Written to their own file, not into `kg.json`.** `src/lib/kg.ts` statically
 * imports the graph, so anything in it is in the browser's bundle: 464 source
 * nodes and 533 attestations took `/order/:slug` from 600 KB to 769 KB of eager
 * JS, for data no page renders. The consumers are all build-time — the two
 * exporters and the prerenderer's JSON-LD — so `data/kg-sources.json` is where
 * they belong, exactly like `kg-shrine-figures.json` next to it. `stats.sources`
 * still counts them, because the count is one number and the graph should be
 * able to say how much it rests on.
 *
 * Two RULE 2 lines that must not move:
 *
 * - **The citation text is verbatim.** It is the source's real title, publisher
 *   and URL, and it is the exact string a reader needs in order to go and check.
 *   Nothing is title-cased, abbreviated or reordered.
 * - **`sourceType` is set only for a bare URL.** Deciding book-vs-article from a
 *   bibliography line is precisely the kind of inference this project does not
 *   make; the field is absent rather than guessed. A citation that is nothing
 *   but a link is the one unambiguous case.
 */

/** Conservative on purpose: two entries citing the same book with different
 *  punctuation stay two nodes. Under-merging leaves a duplicate a human can
 *  see; over-merging asserts that two different citations are the same source,
 *  which is a claim about the literature. */

const BARE_URL = /^<?https?:\/\/\S+>?$/;

const sources = [];
const attestations = [];
const sourceByKey = new Map();

for (const { row, slug: shrineSlug } of shrinesWithSlugs) {
  const items = bibliographyItems(String(row['Sources'] ?? ''), String(row['Description'] ?? ''));
  for (const item of items) {
    const key = citationKey(item);
    if (!key) continue;
    let source = sourceByKey.get(key);
    if (!source) {
      /* A digest, not a counter: the id has to be stable across builds so an
         export consumer's stored reference keeps resolving, and it must not
         depend on the order rows happen to arrive in. */
      const slug = createHash('sha1').update(key).digest('hex').slice(0, 12);
      source = {
        id: `source:${slug}`,
        type: 'source',
        slug,
        name: item,
        ...(BARE_URL.test(item.trim()) ? { sourceType: 'website' } : {}),
      };
      sourceByKey.set(key, source);
      sources.push(source);
    }
    const relId = `attested_in:${shrineSlug}:${source.id}`;
    if (!attestations.some((r) => r.id === relId)) {
      attestations.push({
        id: relId,
        type: 'attested_in',
        subject: shrineSlug,
        object: source.id,
        confidence: 1,
        method: 'rule',
      });
    }
  }
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
  sources: sources.length,
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
  relations,
  stats,
  reviewNeeded,
};

writeFileSync(join(ROOT, 'data', 'kg.json'), JSON.stringify(kg, null, 2) + '\n', 'utf8');

// ── source layer, for the build-time consumers only ──────────────────────────
/* Out of kg.json on purpose — see the sources section above. The exporters and
   prerender.mjs read this; the browser never does. */
writeFileSync(
  join(ROOT, 'data', 'kg-sources.json'),
  JSON.stringify({ generated: kg.generated, sources, attestations }, null, 2) + '\n',
  'utf8',
);

// ── the review queue ─────────────────────────────────────────────────────────
/*
 * The 218 claims a person has not read yet, with the evidence they were read
 * from, in a shape a review page can render.
 *
 * The archive can state its provenance debt precisely — /about publishes 94
 * machine-read biographies, 80 of 86 lineage links, 44 of 64 affiliations — and
 * until now could not reduce it, because reviewing one claim meant opening a
 * 255-row CSV, reading a quote in a spreadsheet cell and hand-editing a
 * proposals file. The evidence and the verdict lived in different tools. See
 * docs/planning/REVIEW_DESK_2026-08-24.md.
 *
 * Names are resolved here rather than in the browser: the alternative is
 * shipping the whole graph to a page that needs 218 rows of it, which is the
 * 426 KB trap this file has now walked into twice.
 *
 * `evidence` is the same digest the worksheet uses — first 8 hex of sha1 of the
 * quote. It is what lets a returned verdict file be matched back to the exact
 * claim it judged, and what makes a stale verdict fail loudly rather than
 * confirm the wrong thing.
 */
const nameOf = (id) => {
  const slug = String(id).replace(/^(saint|order):/, '');
  return (
    saintBySlug.get(slug)?.name ?? orders.find((o) => o.slug === slug)?.name ?? slug
  );
};
const digest = (text) =>
  text ? createHash('sha1').update(text).digest('hex').slice(0, 8) : '';

const reviewQueue = [];

for (const r of relations) {
  if (r.reviewed !== false) continue;
  if (!['disciple_of', 'successor_of', 'belongs_to_order'].includes(r.type)) continue;
  reviewQueue.push({
    id: r.id,
    kind: r.type,
    subject: nameOf(r.subject),
    subjectSlug: String(r.subject).replace(/^saint:/, ''),
    object: nameOf(r.object),
    ...(r.quote ? { quote: r.quote } : {}),
    ...(r.source ? { source: r.source } : {}),
    ...(r.branch ? { branch: r.branch } : {}),
    evidence: digest(r.quote ?? ''),
  });
}

for (const saint of saints.filter((s) => !s.lineageOnly)) {
  if (saint.biographyReviewed !== false) continue;
  reviewQueue.push({
    id: `biography:${saint.slug}`,
    kind: 'biography',
    subject: saint.name,
    subjectSlug: saint.slug,
    object: '',
    /* No quote: a biography proposal is a set of *values* read out of prose, and
       the values are the thing to judge. Shown as fields rather than as a
       sentence, so a reviewer checks each one against the source they open. */
    ...(saint.born ? { born: saint.born } : {}),
    ...(saint.died ? { died: saint.died } : {}),
    ...(saint.titles?.length ? { titles: saint.titles } : {}),
    ...(saint.biographySource ? { source: saint.biographySource } : {}),
    evidence: digest(`${saint.slug}|${saint.born ?? ''}|${saint.died ?? ''}`),
  });
}

writeFileSync(
  join(ROOT, 'data', 'kg-review-queue.json'),
  JSON.stringify({ generated: kg.generated, items: reviewQueue }, null, 2) + '\n',
  'utf8',
);

// ── what the archive knows, as a dozen numbers ───────────────────────────────
/*
 * A tiny file so `/about` can state the graph's own state without importing the
 * graph.
 *
 * `src/lib/kg.ts` imports `kg.json` statically, so a page that wants six counts
 * off it pays 426 KB for them — the trap that took `/order/:slug` to 769 KB when
 * the source layer went in. These are the counts themselves, ~400 bytes, in the
 * same "slim lookup" shape as `kg-shrine-figures.json` beside it.
 *
 * The review counts are here on purpose and are the more useful half. An archive
 * that publishes "136 figures" and not "94 of their biographies were read out of
 * prose by a machine and by no person" is publishing the flattering number only.
 */
const knownLineage = relations.filter(
  (r) => r.type === 'disciple_of' || r.type === 'successor_of',
);
const knownMemberships = relations.filter((r) => r.type === 'belongs_to_order');
const documented = saints.filter((s) => !s.lineageOnly);

const knowledge = {
  generated: kg.generated,
  figures: documented.length,
  lineageOnlyFigures: saints.length - documented.length,
  orders: orders.length,
  places: places.length,
  observances: events.length,
  ursObservances: events.filter((e) => e.eventType === 'urs').length,
  sources: sources.length,
  citations: attestations.length,
  titles: saints.reduce((n, s) => n + (s.titles?.length ?? 0), 0),
  lineageLinks: knownLineage.length,
  lineageLinksUnreviewed: knownLineage.filter((r) => r.reviewed === false).length,
  orderMemberships: knownMemberships.length,
  orderMembershipsUnreviewed: knownMemberships.filter((r) => r.reviewed === false).length,
  biographiesMachineRead: documented.filter((s) => s.biographyReviewed === false).length,
  disputedDateFigures: saints.filter((s) => s.disputedDates?.length).length,
};

writeFileSync(
  join(ROOT, 'data', 'kg-stats.json'),
  JSON.stringify(knowledge, null, 2) + '\n',
  'utf8',
);

// ── slim lookup for the shrine route ─────────────────────────────────────────
// ShrinePage renders exactly one thing out of the graph: a link from the
// shrine's named figure to that figure's entity page. Importing src/lib/kg.ts
// for it pulled the whole 317 KB graph chunk onto a hot route — measured on
// 20 August 2026 as 40% of that route's eager JS, for one href. So the shrine
// → figure edge ships as its own index instead. Keep it to slugs: the moment
// this grows a second field it stops being cheaper than the graph.
const shrineFigures = {};
for (const relation of relations) {
  if (relation.type !== 'buried_at') continue;
  const saintSlug = relation.subject.replace(/^saint:/, '');
  const shrineSlug = relation.object.replace(/^shrine:/, '');
  if (!saints.some((s) => s.slug === saintSlug)) continue;
  (shrineFigures[shrineSlug] ??= []).push(saintSlug);
}
const sortedShrineFigures = Object.fromEntries(
  Object.keys(shrineFigures)
    .sort()
    .map((shrineSlug) => [shrineSlug, shrineFigures[shrineSlug]]),
);
writeFileSync(
  join(ROOT, 'data', 'kg-shrine-figures.json'),
  JSON.stringify(sortedShrineFigures, null, 2) + '\n',
  'utf8',
);

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`[kg] ✓ saints: ${stats.saints}  orders: ${stats.orders}  places: ${stats.places}  events: ${stats.events}`);
console.log(`[kg] ✓ relations: ${stats.relations}  (${stats.ambiguousMerges} merge(s) logged for review)`);
if (reviewNeeded.length > 0) {
  console.log(`[kg] ⚠  ${reviewNeeded.length} item(s) need review → see data/kg.json reviewNeeded`);
}
console.log(
  `[kg] ✓ data/kg-shrine-figures.json written (${Object.keys(sortedShrineFigures).length} shrines)`,
);
console.log('[kg] ✓ data/kg.json written');
