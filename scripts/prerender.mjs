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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');

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

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LandmarksOrHistoricalBuildings',
    'name': field(row, 'Name'),
    'description': leadText(row),
    'geo': { '@type': 'GeoCoordinates', 'latitude': lat, 'longitude': lng },
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': location,
      'addressCountry': 'PK',
    },
    ...(category ? { 'additionalType': category } : {}),
    ...(saint ? { 'subjectOf': { '@type': 'Person', 'name': saint } } : {}),
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

const shrines = buildSlugs(snapshot.rows || []);
let written = 0;

for (const shrine of shrines) {
  const outDir = join(distDir, 'shrine', shrine.slug);
  mkdirSync(outDir, { recursive: true });
  const html = buildShrineHead(shrine, baseHtml);
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  written++;
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
  );
}
sitemapLines.push('</urlset>');
writeFileSync(join(distDir, 'sitemap.xml'), sitemapLines.join('\n'), 'utf8');

console.log(`[prerender] ✓ ${written} shrine pages + sitemap.xml`);
if (!SITE_URL) {
  console.log('[prerender]   Set SITE_URL env var to populate canonical URLs and the sitemap.');
}
