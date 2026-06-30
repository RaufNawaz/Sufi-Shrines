#!/usr/bin/env node
/**
 * prerender.mjs — Post-build static pre-render for shrine pages.
 *
 * Runs after `vite build`. Reads the committed snapshot and emits one
 * dist/shrine/<slug>/index.html per shrine with shrine-specific <head> tags
 * (title, meta description, OG tags, JSON-LD) baked in.  Netlify serves the
 * specific file before falling through to the `/* /index.html 200` rewrite,
 * so link previews and search crawlers get real metadata without any runtime
 * JavaScript requirement.
 *
 * Usage:  node scripts/prerender.mjs
 * Run automatically via:  npm run build
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
const KG_BASE  = 'https://github.com/raufnawaz/sufi-shrines/data/';
const KG_VOCAB = 'https://github.com/raufnawaz/sufi-shrines/vocab#';

// ── minimal slugify (mirrors src/lib/data/slugify.ts) ──────────────────────
const SLUG_REPLACEMENTS = { '&': 'and', '@': 'at', '%': 'percent', '+': 'plus' };
function slugify(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[&@%+]/g, (c) => ` ${SLUG_REPLACEMENTS[c] || c} `)
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

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
    if ((lk.includes('image') || lk.includes('photo') || lk.includes('picture')) && !lk.includes('urdu')) {
      const v = row[k];
      if (v && /^https?:\/\//i.test(String(v).trim())) return String(v).trim();
    }
  }
  return '';
}

function leadText(row) {
  const desc = field(row, 'Description', 'About', 'Summary', 'Paragraph');
  if (!desc) return '';
  // Strip markdown headings and inline markup, then truncate
  const stripped = desc
    .replace(/^#{1,6}\s+.*/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  return stripped.length > 200 ? `${stripped.slice(0, 197)}…` : stripped;
}

// ── slug generation (mirrors buildShrines collision logic) ─────────────────
function buildSlugs(rows) {
  const seen = new Map();
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lat = parseFloat(field(row, 'Latitude', 'latitude') || '');
    const lng = parseFloat(field(row, 'Longitude', 'longitude') || '');
    if (!isFinite(lat) || !isFinite(lng)) continue;

    const explicit = field(row, 'Slug');
    if (explicit) {
      seen.set(explicit, (seen.get(explicit) ?? 0) + 1);
      result.push({ row, slug: explicit, lat, lng });
      continue;
    }

    const name = field(row, 'Name') || `Shrine ${i}`;
    const location = field(row, 'Location');
    const saint = field(row, 'Sufi Saint');
    const base = slugify(name);
    const withLoc = base && location ? `${base}-${slugify(location)}` : base;
    const withSaint = withLoc && saint ? `${withLoc}-${slugify(saint)}` : withLoc;

    let chosen = base || `shrine-${i}`;
    for (const candidate of [base, withLoc, withSaint]) {
      if (candidate && !seen.has(candidate)) { chosen = candidate; break; }
    }
    if (seen.has(chosen)) {
      let n = 2;
      while (seen.has(`${chosen}-${n}`)) n++;
      chosen = `${chosen}-${n}`;
    }
    seen.set(chosen, (seen.get(chosen) ?? 0) + 1);
    result.push({ row, slug: chosen, lat, lng });
  }
  return result;
}

// ── HTML injection helpers ─────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildShrineHead(shrine, baseHtml) {
  const { row, slug, lat, lng } = shrine;
  const name = escHtml(field(row, 'Name'));
  const category = field(row, 'Category');
  const location = field(row, 'Location');
  const saint = field(row, 'Sufi Saint');
  const founded = field(row, 'Founded', 'Founded/Opened');
  const imgUrl = primaryImage(row);
  const desc = leadText(row) || `${name}${location ? ` in ${location}` : ''}${saint ? `, associated with ${saint}` : ''}.`;
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
  ].filter(Boolean).join('\n    ');

  // Build KG-enriched About node for the saint (falls back to plain name if KG absent)
  const kgEntry = kgByShrineSlug.get(slug);
  let aboutNode = null;
  if (kgEntry?.saint) {
    const s = kgEntry.saint;
    aboutNode = {
      '@type': 'Person',
      '@id': `${KG_BASE}saint/${s.slug}`,
      'name': s.name,
      ...(s.altNames?.length ? { 'alternateName': s.altNames[0] } : {}),
      ...(s.wikidataQid ? { 'sameAs': `https://www.wikidata.org/entity/${s.wikidataQid}` } : {}),
      ...(kgEntry.order ? {
        'memberOf': {
          '@type': ['Organization', 'SufiOrder'],
          '@id': `${KG_BASE}order/${kgEntry.order.slug}`,
          'name': kgEntry.order.name,
        },
      } : {}),
    };
  } else if (saint) {
    aboutNode = { '@type': 'Person', 'name': saint };
  }

  const eventNodes = (kgEntry?.events ?? []).map((e) => ({
    '@type': 'Event',
    '@id': `${KG_BASE}event/${e.id.replace(/^event:/, '')}`,
    'name': e.name,
    ...(e.frequency === 'annual' ? { 'eventSchedule': { '@type': 'Schedule', 'repeatFrequency': 'P1Y' } } : {}),
  }));

  const shrineId = canonicalUrl || `${KG_BASE}shrine/${slug}`;

  const jsonLd = JSON.stringify({
    '@context': [
      'https://schema.org',
      { 'sufi': KG_VOCAB, 'SufiOrder': { '@id': `${KG_VOCAB}SufiOrder` } },
    ],
    '@type': 'LandmarksOrHistoricalBuildings',
    '@id': shrineId,
    'name': field(row, 'Name'),
    'description': leadText(row),
    'geo': { '@type': 'GeoCoordinates', 'latitude': lat, 'longitude': lng },
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': location,
      'addressCountry': 'PK',
    },
    ...(category ? { 'additionalType': category } : {}),
    ...(aboutNode ? { 'about': aboutNode } : {}),
    ...(eventNodes.length ? { 'event': eventNodes } : {}),
    ...(founded ? { 'foundingDate': founded } : {}),
    ...(imgUrl ? { 'image': imgUrl } : {}),
    ...(canonicalUrl ? { 'url': canonicalUrl } : {}),
  });

  // Replace title and existing meta og:title/og:description/twitter:card blocks
  let html = baseHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${name} — Sufi Shrines</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escHtml(desc)}" />`)
    .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${name} — Sufi Shrines" />`)
    .replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escHtml(desc)}" />`)
    .replace(/<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="article" />`)
    .replace(/<meta\s+name="twitter:card"[^>]*>/i, `<meta name="twitter:card" content="${imgUrl ? 'summary_large_image' : 'summary'}" />`);

  // Inject OG URL, canonical, image, and JSON-LD before </head>
  const extras = [
    canonicalUrl ? `  <link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
    canonicalUrl ? `  <meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
    imgUrl ? `  <meta property="og:image" content="${escHtml(imgUrl)}" />` : '',
    imgUrl ? `  <meta name="twitter:image" content="${escHtml(imgUrl)}" />` : '',
    `  <script type="application/ld+json">${jsonLd}</script>`,
  ].filter(Boolean).join('\n');

  html = html.replace('</head>', `${extras}\n</head>`);
  return html;
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

const shrines = buildSlugs(snapshot.rows || []);
let written = 0;

for (const shrine of shrines) {
  const outDir = join(distDir, 'shrine', shrine.slug);
  mkdirSync(outDir, { recursive: true });
  const html = buildShrineHead(shrine, baseHtml);
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
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
      'name': saint.name,
      ...(saint.altNames?.length ? { 'alternateName': saint.altNames[0] } : {}),
      ...(saint.born ? { 'birthDate': saint.born } : {}),
      ...(saint.died ? { 'deathDate': saint.died } : {}),
      ...(saint.wikidataQid ? { 'sameAs': `https://www.wikidata.org/entity/${saint.wikidataQid}` } : {}),
    });
    let html = baseHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escHtml(saint.name)} — Sufi Shrines</title>`)
      .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${desc}" />`)
      .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escHtml(saint.name)} — Sufi Shrines" />`)
      .replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${desc}" />`)
      .replace(/<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="profile" />`);
    const extras = [
      canonicalUrl ? `  <link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
      canonicalUrl ? `  <meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
      `  <script type="application/ld+json">${saintJsonLd}</script>`,
    ].filter(Boolean).join('\n');
    html = html.replace('</head>', `${extras}\n</head>`);
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    saintSlugs.push(`/saint/${saint.slug}`);
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
      '@context': ['https://schema.org', { 'sufi': KG_VOCAB, 'SufiOrder': { '@id': `${KG_VOCAB}SufiOrder` } }],
      '@type': ['Organization', 'SufiOrder'],
      '@id': `${KG_BASE}order/${order.slug}`,
      'name': order.name,
      ...(order.arabicName ? { 'alternateName': order.arabicName } : {}),
      ...(order.description ? { 'description': order.description } : {}),
      ...(order.founded ? { 'foundingDate': order.founded } : {}),
    });
    let html = baseHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escHtml(order.name)} — Sufi Shrines</title>`)
      .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${desc}" />`)
      .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escHtml(order.name)} — Sufi Shrines" />`)
      .replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${desc}" />`)
      .replace(/<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="profile" />`);
    const extras = [
      canonicalUrl ? `  <link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
      canonicalUrl ? `  <meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
      `  <script type="application/ld+json">${orderJsonLd}</script>`,
    ].filter(Boolean).join('\n');
    html = html.replace('</head>', `${extras}\n</head>`);
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    orderSlugs.push(`/order/${order.slug}`);
    orderCount++;
  }
  console.log(`[prerender] ✓ ${orderCount} order pages`);
}

// Also emit a sitemap
const sitemapLines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
];
if (SITE_URL) {
  sitemapLines.push(
    `  <url><loc>${SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    ...shrines.map(({ slug }) =>
      `  <url><loc>${SITE_URL}/shrine/${slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`
    ),
    ...saintSlugs.map((p) =>
      `  <url><loc>${SITE_URL}${p}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    ),
    ...orderSlugs.map((p) =>
      `  <url><loc>${SITE_URL}${p}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    ),
  );
}
sitemapLines.push('</urlset>');
writeFileSync(join(distDir, 'sitemap.xml'), sitemapLines.join('\n'), 'utf8');

console.log(`[prerender] ✓ ${written} shrine pages + sitemap.xml`);
if (!SITE_URL) {
  console.log('[prerender]   Set SITE_URL env var to populate canonical URLs and the sitemap.');
}
