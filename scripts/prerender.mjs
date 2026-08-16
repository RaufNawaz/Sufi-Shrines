#!/usr/bin/env node
/**
 * prerender.mjs — Post-build static pre-render for shrine pages.
 *
 * Runs after `vite build`. Reads the committed snapshot
 * (src/data/shrines-fallback.json) and emits one dist/shrine/<slug>/index.html
 * per shrine with shrine-specific <head> tags (title, meta description, OG
 * tags, JSON-LD) baked in. Static hosts serve the specific file before
 * falling back to the SPA rewrite, so link previews and search crawlers get
 * real metadata without any runtime JavaScript requirement.
 *
 * Usage:  node scripts/prerender.mjs
 * Run automatically via:  npm run build
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './data/lib/slugs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
const KG_BASE = 'https://github.com/raufnawaz/sufi-shrines/data/';
const KG_VOCAB = 'https://github.com/raufnawaz/sufi-shrines/vocab#';

// ── field helpers ──────────────────────────────────────────────────────────
function field(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

function primaryImage(row) {
  for (const k of Object.keys(row)) {
    const lk = k.toLowerCase();
    if (
      (lk.includes('image') || lk.includes('photo') || lk.includes('picture')) &&
      !lk.includes('urdu')
    ) {
      const v = row[k];
      if (v && /^https?:\/\//i.test(String(v).trim())) return String(v).trim();
    }
  }
  return '';
}

// Strip markdown headings/inline markup from a description, then truncate —
// shared by the English and Urdu lead-text builders below.
function stripMarkdownLead(desc) {
  if (!desc) return '';
  const stripped = desc
    .replace(/^#{1,6}\s+.*/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  return stripped.length > 200 ? `${stripped.slice(0, 197)}…` : stripped;
}

function leadText(row) {
  return stripMarkdownLead(field(row, 'Description', 'About', 'Summary', 'Paragraph'));
}

// ── Urdu variant helpers (see LanguageContext.tsx / urduFallback.ts for the
// runtime equivalents this mirrors — same seed dictionary, same "leave
// untranslated content in its original script rather than guess" rule) ────
const SITE_TITLE_UR = 'پاکستان کے صوفی مزارات';
let urduSeed = {};
let urduContentBySlug = {};
try {
  urduSeed = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'urdu-seed.json'), 'utf8'));
} catch {
  // No seed dictionary — Urdu variants fall back to English names/text below.
}
try {
  urduContentBySlug = JSON.parse(
    readFileSync(join(ROOT, 'src', 'data', 'urdu-content.json'), 'utf8'),
  );
} catch {
  // No per-shrine Urdu content override — falls back to English lead text.
}

// Exact-string dictionary lookup only (no word-by-word reconstruction, unlike
// urduFallback.ts's buildUrduFallback) — good enough for meta/title text,
// and never fabricates a translation the dictionary doesn't already have.
function translateWordsUr(text) {
  const raw = String(text ?? '').trim();
  if (!raw || /^https?:\/\//i.test(raw) || !/[A-Za-z]/.test(raw)) return raw;
  const hit = urduSeed[raw];
  return hit && !/[A-Za-z]/.test(hit) ? hit : raw;
}

function urduNameFor(row) {
  const direct = field(row, 'Name Urdu', 'Urdu Name', 'Name (Urdu)');
  return direct || translateWordsUr(field(row, 'Name'));
}

// Prefers the real per-shrine Urdu article content over a word-translated
// English lead — only degrades to the latter for the rare shrine with no
// descriptionUr yet.
function leadTextUr(slug, row) {
  const descriptionUr = urduContentBySlug[slug]?.descriptionUr;
  if (descriptionUr) return stripMarkdownLead(descriptionUr);
  return translateWordsUr(leadText(row));
}

// ── shrine records: shared slug logic + coord extraction ───────────────────
// Slugs come from scripts/data/lib/slugs.mjs (the same logic the app and all
// data scripts use); rows without a mappable lat/lng are dropped, matching
// what the app renders. The snapshot is already coord-filtered upstream by
// build-dataset.mjs, so the filter here is defensive.
function buildShrineRecords(rows) {
  const slugs = buildSlugs(rows);
  return rows
    .map((row, i) => ({
      row,
      slug: slugs[i],
      lat: parseFloat(field(row, 'Latitude', 'latitude') || ''),
      lng: parseFloat(field(row, 'Longitude', 'longitude') || ''),
    }))
    .filter(({ lat, lng }) => isFinite(lat) && isFinite(lng));
}

// ── HTML injection helpers ─────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replaces the homepage's relative hreflang stubs (copied in from
 * index.html, since every generated page starts from that template) with
 * this page's own absolute en/ur/x-default alternates. `urUrl` is a real,
 * separately-prerendered /ur/... file (see buildShrineHeadUr() etc.) — not
 * a ?lang=ur query string, which can't select a different static file on a
 * static host, so a crawler following it would previously have landed on
 * English content mislabeled as the Urdu variant.
 */
function replaceHreflang(html, enUrl, urUrl) {
  if (!enUrl) {
    return html
      .replace(/<link\s+rel="alternate"\s+hreflang="en"[^>]*>\s*/i, '')
      .replace(/<link\s+rel="alternate"\s+hreflang="ur"[^>]*>\s*/i, '')
      .replace(/<link\s+rel="alternate"\s+hreflang="x-default"[^>]*>\s*/i, '');
  }
  return html
    .replace(
      /<link\s+rel="alternate"\s+hreflang="en"[^>]*>/i,
      `<link rel="alternate" hreflang="en" href="${escHtml(enUrl)}" />`,
    )
    .replace(
      /<link\s+rel="alternate"\s+hreflang="ur"[^>]*>/i,
      `<link rel="alternate" hreflang="ur" href="${escHtml(urUrl || enUrl)}" />`,
    )
    .replace(
      /<link\s+rel="alternate"\s+hreflang="x-default"[^>]*>/i,
      `<link rel="alternate" hreflang="x-default" href="${escHtml(enUrl)}" />`,
    );
}

function buildShrineHead(shrine, baseHtml) {
  const { row, slug, lat, lng } = shrine;
  const name = escHtml(field(row, 'Name'));
  const category = field(row, 'Category');
  const location = field(row, 'Location');
  const saint = field(row, 'Sufi Saint');
  const founded = field(row, 'Founded', 'Founded/Opened');
  const imgUrl = primaryImage(row);
  const desc =
    leadText(row) ||
    `${name}${location ? ` in ${location}` : ''}${saint ? `, associated with ${saint}` : ''}.`;
  const canonicalUrl = SITE_URL ? `${SITE_URL}/shrine/${slug}` : '';

  const metaBlock = [
    `<title>${name} — Sufi Shrines</title>`,
    `<meta name="description" content="${escHtml(desc)}" />`,
    `<meta property="og:title" content="${name} — Sufi Shrines" />`,
    `<meta property="og:description" content="${escHtml(desc)}" />`,
    `<meta property="og:type" content="article" />`,
    canonicalUrl ? `<meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
    canonicalUrl ? `<link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
    imgUrl ? `<meta property="og:image" content="${escHtml(imgUrl)}" />` : '',
    imgUrl ? `<meta name="twitter:image" content="${escHtml(imgUrl)}" />` : '',
    `<meta name="twitter:card" content="${imgUrl ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${name} — Sufi Shrines" />`,
    `<meta name="twitter:description" content="${escHtml(desc)}" />`,
  ]
    .filter(Boolean)
    .join('\n    ');

  // Build KG-enriched About node for the saint (falls back to plain name if KG absent)
  const kgEntry = kgByShrineSlug.get(slug);
  let aboutNode = null;
  if (kgEntry?.saint) {
    const s = kgEntry.saint;
    aboutNode = {
      '@type': 'Person',
      '@id': `${KG_BASE}saint/${s.slug}`,
      name: s.name,
      ...(s.altNames?.length ? { alternateName: s.altNames[0] } : {}),
      ...(s.wikidataQid ? { sameAs: `https://www.wikidata.org/entity/${s.wikidataQid}` } : {}),
      ...(kgEntry.order
        ? {
            memberOf: {
              '@type': ['Organization', 'SufiOrder'],
              '@id': `${KG_BASE}order/${kgEntry.order.slug}`,
              name: kgEntry.order.name,
            },
          }
        : {}),
    };
  } else if (saint) {
    aboutNode = { '@type': 'Person', name: saint };
  }

  const eventNodes = (kgEntry?.events ?? []).map((e) => ({
    '@type': 'Event',
    '@id': `${KG_BASE}event/${e.id.replace(/^event:/, '')}`,
    name: e.name,
    ...(e.frequency === 'annual'
      ? { eventSchedule: { '@type': 'Schedule', repeatFrequency: 'P1Y' } }
      : {}),
  }));

  const shrineId = canonicalUrl || `${KG_BASE}shrine/${slug}`;

  const jsonLd = JSON.stringify({
    '@context': [
      'https://schema.org',
      { sufi: KG_VOCAB, SufiOrder: { '@id': `${KG_VOCAB}SufiOrder` } },
    ],
    '@type': 'LandmarksOrHistoricalBuildings',
    '@id': shrineId,
    name: field(row, 'Name'),
    description: leadText(row),
    geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
    address: {
      '@type': 'PostalAddress',
      addressLocality: location,
      addressCountry: 'PK',
    },
    ...(category ? { additionalType: category } : {}),
    ...(aboutNode ? { about: aboutNode } : {}),
    ...(eventNodes.length ? { event: eventNodes } : {}),
    ...(founded ? { foundingDate: founded } : {}),
    ...(imgUrl ? { image: imgUrl } : {}),
    ...(canonicalUrl ? { url: canonicalUrl } : {}),
  });

  // Replace title and existing meta og:title/og:description/twitter:card blocks
  let html = baseHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${name} — Sufi Shrines</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escHtml(desc)}" />`,
    )
    .replace(
      /<meta\s+property="og:title"[^>]*>/i,
      `<meta property="og:title" content="${name} — Sufi Shrines" />`,
    )
    .replace(
      /<meta\s+property="og:description"[^>]*>/i,
      `<meta property="og:description" content="${escHtml(desc)}" />`,
    )
    .replace(/<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="article" />`)
    .replace(
      /<meta\s+name="twitter:card"[^>]*>/i,
      `<meta name="twitter:card" content="${imgUrl ? 'summary_large_image' : 'summary'}" />`,
    );

  const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur/shrine/${slug}` : '';
  html = replaceHreflang(html, canonicalUrl, urCanonicalUrl);

  // Inject OG URL, canonical, image, and JSON-LD before </head>
  const extras = [
    canonicalUrl ? `  <link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
    canonicalUrl ? `  <meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
    imgUrl ? `  <meta property="og:image" content="${escHtml(imgUrl)}" />` : '',
    imgUrl ? `  <meta name="twitter:image" content="${escHtml(imgUrl)}" />` : '',
    `  <script type="application/ld+json">${jsonLd}</script>`,
  ]
    .filter(Boolean)
    .join('\n');

  html = html.replace('</head>', `${extras}\n</head>`);
  return html;
}

/**
 * Urdu mirror of buildShrineHead() — a genuinely distinct static file at
 * /ur/shrine/<slug>/ (not a ?lang=ur query string, which can't be a
 * separate file on a static host). Only <head> is translated, matching how
 * the English prerender already only prerenders <head> and leaves <body>
 * (the SPA's #root) for client-side hydration — no new gap introduced.
 */
function buildShrineHeadUr(shrine, baseHtml) {
  const { row, slug, lat, lng } = shrine;
  const name = escHtml(urduNameFor(row));
  const category = field(row, 'Category');
  const location = field(row, 'Location');
  const saint = field(row, 'Sufi Saint');
  const founded = field(row, 'Founded', 'Founded/Opened');
  const imgUrl = primaryImage(row);
  const desc =
    leadTextUr(slug, row) || `${name}${location ? ` — ${translateWordsUr(location)}` : ''}`;
  const canonicalUrl = SITE_URL ? `${SITE_URL}/shrine/${slug}` : '';
  const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur/shrine/${slug}` : '';

  const jsonLd = JSON.stringify({
    '@context': [
      'https://schema.org',
      { sufi: KG_VOCAB, SufiOrder: { '@id': `${KG_VOCAB}SufiOrder` } },
    ],
    '@type': 'LandmarksOrHistoricalBuildings',
    '@id': urCanonicalUrl || `${KG_BASE}shrine/${slug}`,
    name: urduNameFor(row),
    description: leadTextUr(slug, row),
    inLanguage: 'ur',
    geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
    address: { '@type': 'PostalAddress', addressLocality: location, addressCountry: 'PK' },
    ...(category ? { additionalType: category } : {}),
    ...(saint ? { about: { '@type': 'Person', name: saint } } : {}),
    ...(founded ? { foundingDate: founded } : {}),
    ...(imgUrl ? { image: imgUrl } : {}),
    ...(urCanonicalUrl ? { url: urCanonicalUrl } : {}),
  });

  let html = baseHtml
    .replace(/<html[^>]*>/, `<html lang="ur" dir="rtl">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${name} — ${SITE_TITLE_UR}</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escHtml(desc)}" />`,
    )
    .replace(
      /<meta\s+property="og:title"[^>]*>/i,
      `<meta property="og:title" content="${name} — ${SITE_TITLE_UR}" />`,
    )
    .replace(
      /<meta\s+property="og:description"[^>]*>/i,
      `<meta property="og:description" content="${escHtml(desc)}" />`,
    )
    .replace(/<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="article" />`)
    .replace(
      /<meta\s+name="twitter:card"[^>]*>/i,
      `<meta name="twitter:card" content="${imgUrl ? 'summary_large_image' : 'summary'}" />`,
    );

  html = replaceHreflang(html, canonicalUrl, urCanonicalUrl);

  const extras = [
    urCanonicalUrl ? `  <link rel="canonical" href="${escHtml(urCanonicalUrl)}" />` : '',
    urCanonicalUrl ? `  <meta property="og:url" content="${escHtml(urCanonicalUrl)}" />` : '',
    imgUrl ? `  <meta property="og:image" content="${escHtml(imgUrl)}" />` : '',
    imgUrl ? `  <meta name="twitter:image" content="${escHtml(imgUrl)}" />` : '',
    `  <script type="application/ld+json">${jsonLd}</script>`,
  ]
    .filter(Boolean)
    .join('\n');

  return html.replace('</head>', `${extras}\n</head>`);
}

// ── main ──────────────────────────────────────────────────────────────────
const snapshotPath = join(ROOT, 'src', 'data', 'shrines-fallback.json');
const distIndexPath = join(ROOT, 'dist', 'index.html');
const distDir = join(ROOT, 'dist');

let snapshot, baseHtml;
try {
  snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  baseHtml = readFileSync(distIndexPath, 'utf8');
} catch (err) {
  console.error(`[prerender] Could not read required files: ${err.message}`);
  process.exit(1);
}

// ── KG lookup: shrine slug → { saint, order, events } ─────────────────────
let kgData = null;
const kgByShrineSlug = new Map();
const kgPath = join(ROOT, 'data', 'kg.json');
if (existsSync(kgPath)) {
  try {
    kgData = JSON.parse(readFileSync(kgPath, 'utf8'));
    const saintMap = new Map(kgData.saints.map((s) => [s.id, s]));
    const orderMap = new Map(kgData.orders.map((o) => [o.id, o]));
    const relByShrineSlug = new Map();
    for (const r of kgData.relations) {
      if (r.type === 'buried_at') {
        if (!relByShrineSlug.has(r.object)) relByShrineSlug.set(r.object, []);
        relByShrineSlug.get(r.object).push({ type: 'buried_at', saintId: r.subject });
      }
    }
    for (const [shrineSlug, rels] of relByShrineSlug) {
      const saintId = rels[0]?.saintId;
      const saint = saintId ? saintMap.get(saintId) : null;
      const orderRel = saint
        ? kgData.relations.find((r) => r.type === 'belongs_to_order' && r.subject === saint.id)
        : null;
      const order = orderRel ? orderMap.get(orderRel.object) : null;
      const events = kgData.events.filter((e) => e.shrineSlug === shrineSlug);
      kgByShrineSlug.set(shrineSlug, { saint, order, events });
    }
  } catch {
    kgData = null;
  }
}

const shrines = buildShrineRecords(snapshot.rows || []);
let written = 0;

for (const shrine of shrines) {
  const outDir = join(distDir, 'shrine', shrine.slug);
  mkdirSync(outDir, { recursive: true });
  const html = buildShrineHead(shrine, baseHtml);
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');

  const urOutDir = join(distDir, 'ur', 'shrine', shrine.slug);
  mkdirSync(urOutDir, { recursive: true });
  writeFileSync(join(urOutDir, 'index.html'), buildShrineHeadUr(shrine, baseHtml), 'utf8');

  written++;
}

// ── saint pages ───────────────────────────────────────────────────────────
const saintSlugs = [];
if (kgData) {
  let saintCount = 0;
  for (const saint of kgData.saints) {
    const outDir = join(distDir, 'saint', saint.slug);
    mkdirSync(outDir, { recursive: true });
    const canonicalUrl = SITE_URL ? `${SITE_URL}/saint/${saint.slug}` : '';
    const desc = escHtml(
      `${saint.name}${saint.died ? ` (d. ${saint.died})` : ''} — Sufi saint commemorated at ${saint.shrines.length} shrine${saint.shrines.length === 1 ? '' : 's'} in Pakistan.`,
    );
    const saintJsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${KG_BASE}saint/${saint.slug}`,
      name: saint.name,
      ...(saint.altNames?.length ? { alternateName: saint.altNames[0] } : {}),
      ...(saint.born ? { birthDate: saint.born } : {}),
      ...(saint.died ? { deathDate: saint.died } : {}),
      ...(saint.wikidataQid
        ? { sameAs: `https://www.wikidata.org/entity/${saint.wikidataQid}` }
        : {}),
    });
    let html = baseHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escHtml(saint.name)} — Sufi Shrines</title>`)
      .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${desc}" />`)
      .replace(
        /<meta\s+property="og:title"[^>]*>/i,
        `<meta property="og:title" content="${escHtml(saint.name)} — Sufi Shrines" />`,
      )
      .replace(
        /<meta\s+property="og:description"[^>]*>/i,
        `<meta property="og:description" content="${desc}" />`,
      )
      .replace(
        /<meta\s+property="og:type"[^>]*>/i,
        `<meta property="og:type" content="profile" />`,
      );
    const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur/saint/${saint.slug}` : '';
    html = replaceHreflang(html, canonicalUrl, urCanonicalUrl);
    const extras = [
      canonicalUrl ? `  <link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
      canonicalUrl ? `  <meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
      `  <script type="application/ld+json">${saintJsonLd}</script>`,
    ]
      .filter(Boolean)
      .join('\n');
    html = html.replace('</head>', `${extras}\n</head>`);
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    saintSlugs.push(`/saint/${saint.slug}`);

    // ── Urdu mirror (/ur/saint/<slug>) ──
    const nameUr = escHtml(translateWordsUr(saint.name));
    const descUr = escHtml(
      `${translateWordsUr(saint.name)}${saint.died ? ` (وفات ${saint.died})` : ''} — پاکستان میں ${saint.shrines.length} مزار سے منسلک صوفی بزرگ۔`,
    );
    let htmlUr = baseHtml
      .replace(/<html[^>]*>/, `<html lang="ur" dir="rtl">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${nameUr} — ${SITE_TITLE_UR}</title>`)
      .replace(
        /<meta\s+name="description"[^>]*>/i,
        `<meta name="description" content="${descUr}" />`,
      )
      .replace(
        /<meta\s+property="og:title"[^>]*>/i,
        `<meta property="og:title" content="${nameUr} — ${SITE_TITLE_UR}" />`,
      )
      .replace(
        /<meta\s+property="og:description"[^>]*>/i,
        `<meta property="og:description" content="${descUr}" />`,
      )
      .replace(
        /<meta\s+property="og:type"[^>]*>/i,
        `<meta property="og:type" content="profile" />`,
      );
    htmlUr = replaceHreflang(htmlUr, canonicalUrl, urCanonicalUrl);
    const extrasUr = [
      urCanonicalUrl ? `  <link rel="canonical" href="${escHtml(urCanonicalUrl)}" />` : '',
      urCanonicalUrl ? `  <meta property="og:url" content="${escHtml(urCanonicalUrl)}" />` : '',
      `  <script type="application/ld+json">${JSON.stringify({ ...JSON.parse(saintJsonLd), '@id': urCanonicalUrl || `${KG_BASE}saint/${saint.slug}`, name: translateWordsUr(saint.name), inLanguage: 'ur' })}</script>`,
    ]
      .filter(Boolean)
      .join('\n');
    htmlUr = htmlUr.replace('</head>', `${extrasUr}\n</head>`);
    const urOutDir = join(distDir, 'ur', 'saint', saint.slug);
    mkdirSync(urOutDir, { recursive: true });
    writeFileSync(join(urOutDir, 'index.html'), htmlUr, 'utf8');

    saintCount++;
  }
  console.log(`[prerender] ✓ ${saintCount} saint pages`);
}

// ── order pages ───────────────────────────────────────────────────────────
const orderSlugs = [];
if (kgData) {
  const saintsByOrder = new Map();
  for (const r of kgData.relations) {
    if (r.type === 'belongs_to_order') {
      const orderSlug = r.object.replace(/^order:/, '');
      if (!saintsByOrder.has(orderSlug)) saintsByOrder.set(orderSlug, 0);
      saintsByOrder.set(orderSlug, saintsByOrder.get(orderSlug) + 1);
    }
  }
  let orderCount = 0;
  for (const order of kgData.orders) {
    const outDir = join(distDir, 'order', order.slug);
    mkdirSync(outDir, { recursive: true });
    const canonicalUrl = SITE_URL ? `${SITE_URL}/order/${order.slug}` : '';
    const memberCount = saintsByOrder.get(order.slug) ?? 0;
    const desc = escHtml(
      `${order.name}${order.arabicName ? ` (${order.arabicName})` : ''} — Sufi spiritual order with ${memberCount} saint${memberCount === 1 ? '' : 's'} commemorated in Pakistan.`,
    );
    const orderJsonLd = JSON.stringify({
      '@context': [
        'https://schema.org',
        { sufi: KG_VOCAB, SufiOrder: { '@id': `${KG_VOCAB}SufiOrder` } },
      ],
      '@type': ['Organization', 'SufiOrder'],
      '@id': `${KG_BASE}order/${order.slug}`,
      name: order.name,
      ...(order.arabicName ? { alternateName: order.arabicName } : {}),
      ...(order.description ? { description: order.description } : {}),
      ...(order.founded ? { foundingDate: order.founded } : {}),
    });
    let html = baseHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escHtml(order.name)} — Sufi Shrines</title>`)
      .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${desc}" />`)
      .replace(
        /<meta\s+property="og:title"[^>]*>/i,
        `<meta property="og:title" content="${escHtml(order.name)} — Sufi Shrines" />`,
      )
      .replace(
        /<meta\s+property="og:description"[^>]*>/i,
        `<meta property="og:description" content="${desc}" />`,
      )
      .replace(
        /<meta\s+property="og:type"[^>]*>/i,
        `<meta property="og:type" content="profile" />`,
      );
    const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur/order/${order.slug}` : '';
    html = replaceHreflang(html, canonicalUrl, urCanonicalUrl);
    const extras = [
      canonicalUrl ? `  <link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
      canonicalUrl ? `  <meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
      `  <script type="application/ld+json">${orderJsonLd}</script>`,
    ]
      .filter(Boolean)
      .join('\n');
    html = html.replace('</head>', `${extras}\n</head>`);
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    orderSlugs.push(`/order/${order.slug}`);

    // ── Urdu mirror (/ur/order/<slug>) ──
    const nameUr = escHtml(translateWordsUr(order.name));
    const descUr = escHtml(
      `${translateWordsUr(order.name)}${order.arabicName ? ` (${order.arabicName})` : ''} — پاکستان میں ${memberCount} بزرگوں پر مشتمل صوفی سلسلہ۔`,
    );
    let htmlUr = baseHtml
      .replace(/<html[^>]*>/, `<html lang="ur" dir="rtl">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${nameUr} — ${SITE_TITLE_UR}</title>`)
      .replace(
        /<meta\s+name="description"[^>]*>/i,
        `<meta name="description" content="${descUr}" />`,
      )
      .replace(
        /<meta\s+property="og:title"[^>]*>/i,
        `<meta property="og:title" content="${nameUr} — ${SITE_TITLE_UR}" />`,
      )
      .replace(
        /<meta\s+property="og:description"[^>]*>/i,
        `<meta property="og:description" content="${descUr}" />`,
      )
      .replace(
        /<meta\s+property="og:type"[^>]*>/i,
        `<meta property="og:type" content="profile" />`,
      );
    htmlUr = replaceHreflang(htmlUr, canonicalUrl, urCanonicalUrl);
    const extrasUr = [
      urCanonicalUrl ? `  <link rel="canonical" href="${escHtml(urCanonicalUrl)}" />` : '',
      urCanonicalUrl ? `  <meta property="og:url" content="${escHtml(urCanonicalUrl)}" />` : '',
      `  <script type="application/ld+json">${JSON.stringify({ ...JSON.parse(orderJsonLd), '@id': urCanonicalUrl || `${KG_BASE}order/${order.slug}`, name: translateWordsUr(order.name), inLanguage: 'ur' })}</script>`,
    ]
      .filter(Boolean)
      .join('\n');
    htmlUr = htmlUr.replace('</head>', `${extrasUr}\n</head>`);
    const urOutDir = join(distDir, 'ur', 'order', order.slug);
    mkdirSync(urOutDir, { recursive: true });
    writeFileSync(join(urOutDir, 'index.html'), htmlUr, 'utf8');

    orderCount++;
  }
  console.log(`[prerender] ✓ ${orderCount} order pages`);
}

// Emits both the English and Urdu <url> entries for a page, each annotated
// with hreflang alternates pointing at both — the standard bidirectional
// sitemap+hreflang pattern (see https://developers.google.com/search/docs
// /specialty/international/localized-versions#sitemap).
function sitemapUrlPair(enLoc, urLoc, changefreq, priority) {
  const altLinks = [
    `    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />`,
    `    <xhtml:link rel="alternate" hreflang="ur" href="${urLoc}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />`,
  ].join('\n');
  return [enLoc, urLoc]
    .map(
      (loc) =>
        `  <url>\n    <loc>${loc}</loc>\n${altLinks}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    )
    .join('\n');
}

// Also emit a sitemap
const sitemapLines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
];
if (SITE_URL) {
  sitemapLines.push(
    sitemapUrlPair(`${SITE_URL}/`, `${SITE_URL}/ur`, 'weekly', '1.0'),
    ...shrines.map(({ slug }) =>
      sitemapUrlPair(
        `${SITE_URL}/shrine/${slug}`,
        `${SITE_URL}/ur/shrine/${slug}`,
        'monthly',
        '0.8',
      ),
    ),
    ...saintSlugs.map((p) =>
      sitemapUrlPair(`${SITE_URL}${p}`, `${SITE_URL}/ur${p}`, 'monthly', '0.7'),
    ),
    ...orderSlugs.map((p) =>
      sitemapUrlPair(`${SITE_URL}${p}`, `${SITE_URL}/ur${p}`, 'monthly', '0.7'),
    ),
  );
}
sitemapLines.push('</urlset>');
writeFileSync(join(distDir, 'sitemap.xml'), sitemapLines.join('\n'), 'utf8');

// ── homepage: upgrade the relative hreflang stubs to absolute URLs ─────────
if (SITE_URL) {
  const homeHtml = replaceHreflang(baseHtml, `${SITE_URL}/`, `${SITE_URL}/ur`)
    .replace(/<meta\s+property="og:url"[^>]*>\s*/i, '')
    .replace(
      '</head>',
      `  <link rel="canonical" href="${escHtml(SITE_URL)}/" />\n  <meta property="og:url" content="${escHtml(SITE_URL)}/" />\n</head>`,
    );
  writeFileSync(distIndexPath, homeHtml, 'utf8');
}

// ── /ur homepage mirror ─────────────────────────────────────────────────────
{
  const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur` : '';
  let homeHtmlUr = baseHtml
    .replace(/<html[^>]*>/, `<html lang="ur" dir="rtl">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${SITE_TITLE_UR}</title>`)
    .replace(
      /<meta\s+property="og:title"[^>]*>/i,
      `<meta property="og:title" content="${escHtml(SITE_TITLE_UR)}" />`,
    );
  homeHtmlUr = replaceHreflang(homeHtmlUr, SITE_URL ? `${SITE_URL}/` : '', urCanonicalUrl);
  if (urCanonicalUrl) {
    homeHtmlUr = homeHtmlUr
      .replace(/<meta\s+property="og:url"[^>]*>\s*/i, '')
      .replace(
        '</head>',
        `  <link rel="canonical" href="${escHtml(urCanonicalUrl)}" />\n  <meta property="og:url" content="${escHtml(urCanonicalUrl)}" />\n</head>`,
      );
  }
  const urHomeOutDir = join(distDir, 'ur');
  mkdirSync(urHomeOutDir, { recursive: true });
  writeFileSync(join(urHomeOutDir, 'index.html'), homeHtmlUr, 'utf8');
}

console.log(`[prerender] ✓ ${written} shrine pages + sitemap.xml`);
if (!SITE_URL) {
  console.log('[prerender]   Set SITE_URL env var to populate canonical URLs and the sitemap.');
}
