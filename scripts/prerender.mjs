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
import { countPlaces, locationOfRow } from './data/lib/places.mjs';

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

/**
 * Western digits → Eastern (۰–۹), for numbers this script writes into an Urdu
 * sentence.
 *
 * Mirrors `toEasternDigits` in src/lib/i18n/numerals.ts. Eastern is the Urdu
 * default in the app (CLAUDE.md, i18n rule 5) and a static <meta> cannot
 * consult the reader's numeral toggle, so the default is the honest choice —
 * these strings are what a search result shows before anyone has a preference.
 *
 * Applied only to counts and years *this script composes*, never to Urdu prose
 * lifted from urdu-content.json: that text is the authors' own and reformatting
 * inside it is a content edit, not a rendering choice.
 */
function easternDigits(text) {
  return String(text).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
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
      `<meta name="twitter:card" content="summary_large_image" />`,
    );

  const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur/shrine/${slug}` : '';
  html = replaceHreflang(html, canonicalUrl, urCanonicalUrl);

  // Inject OG URL, canonical, image, and JSON-LD before </head>
  const extras = [
    canonicalUrl ? `  <link rel="canonical" href="${escHtml(canonicalUrl)}" />` : '',
    canonicalUrl ? `  <meta property="og:url" content="${escHtml(canonicalUrl)}" />` : '',
    `  <script type="application/ld+json">${jsonLd}</script>`,
  ]
    .filter(Boolean)
    .join('\n');

  html = withSocialImage(html, imgUrl, `${field(row, 'Name')}${location ? ` — ${location}` : ''}`);
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
      `<meta name="twitter:card" content="summary_large_image" />`,
    );

  html = replaceHreflang(html, canonicalUrl, urCanonicalUrl);

  const extras = [
    urCanonicalUrl ? `  <link rel="canonical" href="${escHtml(urCanonicalUrl)}" />` : '',
    urCanonicalUrl ? `  <meta property="og:url" content="${escHtml(urCanonicalUrl)}" />` : '',
    `  <script type="application/ld+json">${jsonLd}</script>`,
  ]
    .filter(Boolean)
    .join('\n');

  html = withSocialImage(html, imgUrl, imgUrl ? urduNameFor(row) : SITE_TITLE_UR);
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

/*
 * The default social card, absolute.
 *
 * index.html carries `/og-image.png` as a relative stub. No crawler resolves a
 * relative og:image — Facebook, Twitter and WhatsApp all require an absolute
 * URL — and this site is served from a subpath (`/Sufi-Shrines`), so the stub
 * would be wrong even if they did. Rewriting it here, once, on the template
 * every generated page is built from, means the shrine, saint and order pages
 * inherit a correct default without each having to remember.
 */
const DEFAULT_OG_IMAGE = SITE_URL ? `${SITE_URL}/og-image.png` : '';
if (DEFAULT_OG_IMAGE) {
  const before = baseHtml;
  baseHtml = baseHtml.replaceAll('content="/og-image.png"', `content="${DEFAULT_OG_IMAGE}"`);
  if (baseHtml === before) {
    // The stub is the only thing pointing crawlers at a card. If a refactor
    // renames or drops it, say so loudly rather than shipping a site whose
    // every shared link is a bare URL again.
    console.error(
      '[prerender] index.html no longer contains the `content="/og-image.png"` stub, so no ' +
        'absolute og:image could be written. Restore it or update this rewrite.',
    );
    process.exit(1);
  }
}

/**
 * Point a page's social card at a specific photograph.
 *
 * The template now carries the default card, so a page with its own photo must
 * *replace* those tags rather than append more. Appending was the trap: two
 * `og:image` tags in one head, and every crawler I know of takes the first —
 * so every photographed shrine would have shared as the generic archive card
 * while the head looked, to a reader of the source, entirely correct.
 *
 * `og:image:width`/`height`/`type` are dropped along the way: they describe
 * the 1200x630 card, and this function's argument is an arbitrary photograph
 * off Wikimedia or Drive whose dimensions the build does not know. A declared
 * size that is wrong is worse than none — Facebook lays out the card from it
 * before the image arrives.
 */
function withSocialImage(html, url, alt) {
  let out = html;
  /* The alt is worth setting even when the page keeps the default card: on the
     Urdu pages the template's alt is an English sentence, and an Urdu page
     should not describe itself in English to a screen reader or a crawler. */
  if (alt) {
    out = out.replace(
      /<meta\s+property="og:image:alt"[\s\S]*?\/>/i,
      `<meta property="og:image:alt" content="${escHtml(alt)}" />`,
    );
  }
  if (!url) return out; // keep the default card, dimensions and all
  const esc = escHtml(url);
  return out
    .replace(/\s*<meta\s+property="og:image:type"[^>]*>/i, '')
    .replace(/\s*<meta\s+property="og:image:width"[^>]*>/i, '')
    .replace(/\s*<meta\s+property="og:image:height"[^>]*>/i, '')
    .replace(/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${esc}" />`)
    .replace(
      /<meta\s+name="twitter:image"[^>]*>/i,
      `<meta name="twitter:image" content="${esc}" />`,
    );
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
    /* Eastern digits, like everywhere else in the Urdu edition. These read
       "(وفات 1072)" until now, which is the same numeral inconsistency the app
       fixed at every render site with `fmtNum` and which the prerenderer had
       never been held to. */
    const descUr = escHtml(
      easternDigits(
        `${translateWordsUr(saint.name)}${saint.died ? ` (وفات ${saint.died})` : ''} — پاکستان میں ${saint.shrines.length} مزار سے منسلک صوفی بزرگ۔`,
      ),
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
      easternDigits(
        `${translateWordsUr(order.name)}${order.arabicName ? ` (${order.arabicName})` : ''} — پاکستان میں ${memberCount} بزرگوں پر مشتمل صوفی سلسلہ۔`,
      ),
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

// ── place pages ───────────────────────────────────────────────────────────
/*
 * One file per place with two or more sites, in both languages.
 *
 * The vocabulary and the counting live in scripts/data/lib/places.mjs, mirrored
 * from src/lib/data/places.ts and held to it by
 * src/lib/data/__tests__/placesVocabSync.test.ts — so the set of files written
 * here is exactly the set of places /coverage links to. A prerendered page for
 * a place the app would not build, or a place page missing from dist, is a
 * failing test rather than a 404 someone finds later.
 *
 * The description states the count and nothing else. There is no prose about
 * Lahore in this archive, and writing some for a meta description would be
 * inventing content (RULE 2) in the one place a reader has no way to check it.
 */
const placeSlugs = [];
{
  const places = countPlaces(shrines, ({ row }) => locationOfRow(row));
  for (const place of places) {
    const canonicalUrl = SITE_URL ? `${SITE_URL}/place/${place.slug}` : '';
    const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur/place/${place.slug}` : '';
    const desc = escHtml(
      `${place.count} sacred sites recorded in ${place.name} — the shrines, temples, gurdwaras and memorials this archive holds for one place, with what is known about each.`,
    );
    const nameUr = translateWordsUr(place.name);
    /* The Urdu description is built from the dictionary's own place name and a
       fixed sentence; if the dictionary has no Urdu for the place, the English
       name rides inside the Urdu sentence rather than the sentence being
       dropped. All 62 names resolve today (places.test.ts asserts it), so this
       is a safety net, not the normal path. */
    const descUr = escHtml(easternDigits(`${nameUr} میں اِس آرکائیو کے ${place.count} مقامات۔`));

    const page = (title, description, lang, canonical, alternate) => {
      let out = baseHtml
        .replace(
          /<title>[^<]*<\/title>/,
          `<title>${escHtml(title)} — ${lang === 'ur' ? SITE_TITLE_UR : 'Sufi Shrines'}</title>`,
        )
        .replace(
          /<meta\s+name="description"[^>]*>/i,
          `<meta name="description" content="${description}" />`,
        )
        .replace(
          /<meta\s+property="og:title"[^>]*>/i,
          `<meta property="og:title" content="${escHtml(title)}" />`,
        )
        .replace(
          /<meta\s+property="og:description"[^>]*>/i,
          `<meta property="og:description" content="${description}" />`,
        );
      if (lang === 'ur') out = out.replace(/<html[^>]*>/, '<html lang="ur" dir="rtl">');
      out = replaceHreflang(out, canonicalUrl, urCanonicalUrl);
      const extras = [
        canonical ? `  <link rel="canonical" href="${escHtml(canonical)}" />` : '',
        canonical ? `  <meta property="og:url" content="${escHtml(canonical)}" />` : '',
        /* Place, not Person or Article: a reader searching for "shrines in
           Multan" is looking for the place, and schema.org's Place is what a
           crawler can do something with. `containsPlace` is left out
           deliberately — listing 35 shrines in the head of a page that already
           links to all 35 adds bytes, not information. */
        `  <script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Place',
          '@id': canonical || `${KG_BASE}place/${place.slug}`,
          name: lang === 'ur' ? nameUr : place.name,
          ...(lang === 'ur' ? { inLanguage: 'ur' } : {}),
          ...(alternate ? { url: alternate } : {}),
        })}</script>`,
      ]
        .filter(Boolean)
        .join('\n');
      return out.replace('</head>', `${extras}\n</head>`);
    };

    const outDir = join(distDir, 'place', place.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, 'index.html'),
      page(place.name, desc, 'en', canonicalUrl, canonicalUrl),
      'utf8',
    );

    const urOutDir = join(distDir, 'ur', 'place', place.slug);
    mkdirSync(urOutDir, { recursive: true });
    writeFileSync(
      join(urOutDir, 'index.html'),
      page(nameUr, descUr, 'ur', urCanonicalUrl, urCanonicalUrl),
      'utf8',
    );

    placeSlugs.push(`/place/${place.slug}`);
  }
  console.log(`[prerender] ✓ ${placeSlugs.length} place pages (+ /ur mirrors)`);
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

// ── static app pages ──────────────────────────────────────────────────────
/*
 * /graph, /almanac, /coverage and /about had no prerendered file at all, and
 * GitHub Pages serves files — so a direct visit or a shared link to any of the
 * four returned GitHub's own 404 page. Two of them are the archive's licence and
 * its self-assessment: the pages a reader is most likely to be sent a link to.
 *
 * The SPA fallback that was supposed to cover this is `public/_redirects` with
 * `/* /index.html 200`, which is **Netlify** syntax. GitHub Pages ignores that
 * file completely, so it had never worked. Nothing said so, because in-app
 * navigation reaches all four perfectly and `npm run preview` (a dev server
 * with SPA fallback) serves them too.
 *
 * Fixed at both levels: these four get real prerendered files with their own
 * title, description and canonical URL, and `dist/404.html` below is a copy of
 * the app shell so any *other* unknown path still boots the router instead of
 * showing GitHub's 404.
 */
const STATIC_PAGES = [
  {
    path: '/graph',
    titleEn: 'Saints & Orders Explorer',
    titleUr: 'اولیا و سلاسل کا نقشہ',
    descEn:
      'The lineages and Sufi orders recorded in this archive: who taught whom, which silsila each figure held, and which claims are still unreviewed.',
  },
  {
    path: '/almanac',
    titleEn: 'The Urs Almanac',
    titleUr: 'عرس تقویم',
    descEn:
      'When the ʿurs gatherings fall across the year, computed from the dates each entry records, with the Hijri readings shown alongside.',
  },
  {
    path: '/coverage',
    titleEn: 'What This Archive Knows',
    titleUr: 'یہ آرکائیو کیا جانتا ہے',
    descEn:
      'Every figure counted from the published data rather than estimated: how each entry was established, how deep it goes, what is cited, and where the archive is silent.',
  },
  {
    path: '/about',
    titleEn: 'About This Archive',
    titleUr: 'اِس آرکائیو کے بارے میں',
    descEn:
      'A public, bilingual record of sacred sites across Pakistan — its licence (code MIT, data ODbL-1.0), how to cite it, and how to report a correction.',
  },
];

let staticCount = 0;
for (const page of STATIC_PAGES) {
  const canonicalUrl = SITE_URL ? `${SITE_URL}${page.path}` : '';
  const urCanonicalUrl = SITE_URL ? `${SITE_URL}/ur${page.path}` : '';

  const head = (title, desc, lang, canonical) => {
    let out = baseHtml
      .replace(
        /<title>[^<]*<\/title>/,
        `<title>${escHtml(title)} — ${lang === 'ur' ? SITE_TITLE_UR : 'Sufi Shrines'}</title>`,
      )
      .replace(
        /<meta\s+name="description"[^>]*>/i,
        `<meta name="description" content="${escHtml(desc)}" />`,
      )
      .replace(
        /<meta\s+property="og:title"[^>]*>/i,
        `<meta property="og:title" content="${escHtml(title)}" />`,
      )
      .replace(
        /<meta\s+property="og:description"[^>]*>/i,
        `<meta property="og:description" content="${escHtml(desc)}" />`,
      );
    if (lang === 'ur') out = out.replace(/<html[^>]*>/, '<html lang="ur" dir="rtl">');
    out = replaceHreflang(out, canonicalUrl, urCanonicalUrl);
    if (canonical) {
      out = out
        .replace(/<meta\s+property="og:url"[^>]*>\s*/i, '')
        .replace(
          '</head>',
          `  <link rel="canonical" href="${escHtml(canonical)}" />\n  <meta property="og:url" content="${escHtml(canonical)}" />\n</head>`,
        );
    }
    return out;
  };

  const outDir = join(distDir, page.path.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'index.html'),
    head(page.titleEn, page.descEn, 'en', canonicalUrl),
    'utf8',
  );

  /* The Urdu description is deliberately the English one: an untranslated
     meta description is a known gap, and writing an Urdu sentence here that no
     fluent reader has seen would be inventing content the archive does not
     have. The title is translated because it exists in uiStrings already. */
  const urOutDir = join(distDir, 'ur', page.path.replace(/^\//, ''));
  mkdirSync(urOutDir, { recursive: true });
  writeFileSync(
    join(urOutDir, 'index.html'),
    head(page.titleUr, page.descEn, 'ur', urCanonicalUrl),
    'utf8',
  );

  staticCount++;
}
console.log(`[prerender] ✓ ${staticCount} static pages (+ /ur mirrors)`);

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
    ...placeSlugs.map((p) =>
      sitemapUrlPair(`${SITE_URL}${p}`, `${SITE_URL}/ur${p}`, 'monthly', '0.6'),
    ),
    // The four static pages. They were absent from the sitemap for the same
    // reason they were absent from dist: nothing enumerated them.
    ...STATIC_PAGES.map(({ path }) =>
      sitemapUrlPair(`${SITE_URL}${path}`, `${SITE_URL}/ur${path}`, 'monthly', '0.5'),
    ),
  );
}
sitemapLines.push('</urlset>');
writeFileSync(join(distDir, 'sitemap.xml'), sitemapLines.join('\n'), 'utf8');

/*
 * GitHub Pages serves 404.html for any path it has no file for, and the SPA
 * router then handles the URL — the standard fallback for a project page. This
 * is the second half of the fix for the four static routes above: they now have
 * real files, and anything else (an old link, a typo, a route added later
 * without a prerender entry) still boots the app instead of showing GitHub's
 * own 404 page.
 */
writeFileSync(join(distDir, '404.html'), baseHtml, 'utf8');

/*
 * robots.txt gets the sitemap line here rather than in public/robots.txt,
 * because the absolute URL is only known once SITE_URL is set at build time.
 */
if (SITE_URL) {
  const robotsPath = join(distDir, 'robots.txt');
  let robots = '';
  try {
    robots = readFileSync(robotsPath, 'utf8');
  } catch {
    robots = 'User-agent: *\nAllow: /\n';
  }
  if (!/^Sitemap:/im.test(robots)) {
    robots = `${robots.replace(/\s*$/, '')}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
    writeFileSync(robotsPath, robots, 'utf8');
  }
}

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
