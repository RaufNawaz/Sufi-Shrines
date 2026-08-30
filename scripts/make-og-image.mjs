/**
 * Generate the social sharing card — `public/og-image.png`.
 *
 * Why this exists: `index.html` declared `twitter:card=summary_large_image`
 * and no image at all, so every link to this archive shared on WhatsApp,
 * Twitter or Slack rendered as a bare URL. Most of this project's readers
 * arrive from a WhatsApp forward; the card is the first thing they see of it.
 *
 * Why a committed PNG rather than a runtime render: crawlers do not execute
 * JavaScript and most (Twitter, Facebook, WhatsApp) will not render SVG. So
 * the fonts are fetched *here*, at generation time, and the result is a static
 * asset. The site itself never depends on that network call.
 *
 * Why Playwright rather than sharp's SVG rasteriser: the card carries Nastaliq,
 * and Nastaliq is not a font you can approximate — its joins and vertical
 * stacking are the writing system, not a style. A browser shapes it correctly;
 * a headless SVG rasteriser with whatever fontconfig happens to hold does not.
 *
 * RULE 4: the fonts are *verified loaded* before the screenshot. Rendering the
 * card in DejaVu Serif because a CDN blipped, and committing that, is the
 * exact class of silent failure this project keeps hitting — nothing errors and
 * you find out from a shared link months later.
 *
 *   node scripts/make-og-image.mjs        (npm run og:image)
 *
 * The site count on the card is a measurement, so it is recorded in
 * scripts/og-image.lock.json and `src/lib/data/__tests__/socialCard.test.ts`
 * fails when the archive grows past it — a stale number on a shared card is
 * the same failure mode as a stale standing finding in HANDOVER §9.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'og-image.png');
const LOCK = join(ROOT, 'scripts', 'og-image.lock.json');

const WIDTH = 1200;
const HEIGHT = 630;

/* ── Facts, read from the shipped data rather than typed in ──────────────── */

const snapshot = JSON.parse(readFileSync(join(ROOT, 'src/data/shrines-fallback.json'), 'utf8'));
const rows = snapshot.rows ?? snapshot;
const SITES = rows.length;

/* The six categories are a *schema* fact (CLAUDE.md § Schema), not a count of
   what happens to be in the sheet today, so the card can state it without
   going stale the next time a row is added. */
const TRADITIONS = 6;

/* Titles come from the same table the UI reads, so the card can never say
   something the site does not.
 *
 * **Both files.** This read only `uiStrings.ts` and expected to find two
 * `siteTitle`s in it, which stopped being true when the Urdu table was split
 * into `uiStrings.ur.ts` so an English reader would not download 42 KB of
 * Nastaliq copy. `npm run og:image` has thrown "could not read both siteTitle
 * values" ever since, and nothing noticed: the card is a committed PNG and its
 * lock file kept the test green against a card generated before the split. The
 * command was only run again when the archive was renamed. `socialCard.test.ts`
 * already reads both paths and its comment says why — this is the same fix on
 * the producer side of the same pair. */
const uiStrings = ['src/lib/i18n/uiStrings.ts', 'src/lib/i18n/uiStrings.ur.ts']
  .map((rel) => readFileSync(join(ROOT, rel), 'utf8'))
  .join('\n');
function siteTitle(nth) {
  const all = [...uiStrings.matchAll(/siteTitle:\s*'([^']+)'/g)].map((m) => m[1]);
  if (all.length < 2)
    throw new Error('could not read both siteTitle values from the uiStrings tables');
  return all[nth];
}
const TITLE_EN = siteTitle(0);
const TITLE_UR = siteTitle(1);

/* Palette, read from tokens.css for the same reason — a card in last season's
   colours is a card nobody remembers to update. */
const tokens = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
function token(name) {
  const m = new RegExp(`\\n\\s*${name}:\\s*(#[0-9a-fA-F]{3,8});`).exec(tokens);
  if (!m) throw new Error(`token not found in tokens.css: ${name}`);
  return m[1];
}
const BG = token('--color-bg');
const TEXT = token('--color-text');
const TEXT_SECONDARY = token('--color-text-secondary');
const TEXT_MUTED = token('--color-text-muted');
const COBALT = token('--color-kashi-cobalt');
const CATS = [
  '--color-cat-muslim',
  '--color-cat-hindu',
  '--color-cat-sikh',
  '--color-cat-nanakpanthi',
  '--color-cat-jain',
  '--color-cat-secular',
].map(token);

/* Every site's recorded coordinates, projected for the card's point cloud.
   This is the one element on the card that is *the archive itself* rather than
   a claim about it: 169 dots tracing the Indus corridor, dense over Lahore and
   Multan, thinning towards Balochistan. The skew is the honest part — a card
   that implied even national coverage would be advertising something the
   archive does not have (coverage is ~32% of the Punjab register alone). */
const CATEGORY_COLOR = {
  'Muslim Shrine': 0,
  'Hindu Temple': 1,
  'Sikh Gurdwara': 2,
  'Nanakpanthi / Udasi Darbar': 3,
  'Jain Temple': 4,
  'Secular / Memorial': 5,
};

const CLOUD_W = 330;
const CLOUD_H = 430;

const points = rows
  .map((r) => ({
    lat: parseFloat(r.Latitude),
    lon: parseFloat(r.Longitude),
    cat: (r.category ?? '').trim() || (r.Category ?? '').trim(),
  }))
  .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

if (points.length !== rows.length) {
  // Not fatal for the card, but say so: a silently thinner cloud would
  // understate the archive.
  console.warn(
    `[og-image] ${rows.length - points.length} row(s) have no usable coordinates and are absent from the cloud`,
  );
}

const latMin = Math.min(...points.map((p) => p.lat));
const latMax = Math.max(...points.map((p) => p.lat));
const lonMin = Math.min(...points.map((p) => p.lon));
const lonMax = Math.max(...points.map((p) => p.lon));
/* Longitude degrees are shorter than latitude degrees away from the equator;
   without this the cloud is stretched east-west and the Indus stops looking
   like the Indus. */
const lonScale = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180);
const spanX = (lonMax - lonMin) * lonScale;
const spanY = latMax - latMin;
const fit = Math.min(CLOUD_W / spanX, CLOUD_H / spanY);
const offsetX = (CLOUD_W - spanX * fit) / 2;
const offsetY = (CLOUD_H - spanY * fit) / 2;

const dots = points
  .map((p) => {
    const x = offsetX + (p.lon - lonMin) * lonScale * fit;
    const y = offsetY + (latMax - p.lat) * fit; // north at the top
    const color = CATS[CATEGORY_COLOR[p.cat] ?? CATEGORY_COLOR['Secular / Memorial']];
    return `<i style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;background:${color}"></i>`;
  })
  .join('');

/* ── The card ────────────────────────────────────────────────────────────── */

const nastaliq = readFileSync(join(ROOT, 'public/fonts/NotoNastaliqUrdu-700.woff2')).toString(
  'base64',
);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Source+Sans+3:wght@400;600&display=swap" />
<style>
  @font-face {
    font-family: 'Noto Nastaliq Urdu';
    font-weight: 700;
    font-display: block;
    src: url(data:font/woff2;base64,${nastaliq}) format('woff2');
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    background: ${BG};
    display: flex; overflow: hidden;
  }
  /* The six category colours as a spine down the leading edge: the archive's
     scope stated as a fact of the design rather than as a list to read. */
  .spine { width: 18px; display: flex; flex-direction: column; }
  .spine > div { flex: 1; }
  /* Two blocks, not three. With the rule and the meta line as their own flex
     child, space-between pooled all the slack into two voids above and below
     them and the card read as a mistake. Titles at the top, everything else
     riding together at the foot, one gap between. */
  .body {
    flex: 1; padding: 62px 70px 58px;
    display: flex; align-items: stretch; gap: 48px;
  }
  .col {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  /* The archive's own coordinates, filling the space the titles leave. */
  .cloud { position: relative; width: ${CLOUD_W}px; flex: none; align-self: center; }
  .cloud-inner { position: relative; width: ${CLOUD_W}px; height: ${CLOUD_H}px; }
  .cloud i {
    position: absolute; width: 9px; height: 9px; border-radius: 50%;
    margin: -4.5px 0 0 -4.5px; opacity: 0.8;
  }
  .cloud-caption {
    margin-top: 18px; text-align: center;
    font-family: 'Source Sans 3', sans-serif; font-weight: 400;
    font-size: 17px; letter-spacing: 0.06em;
    color: ${TEXT_MUTED};
  }
  .title-en {
    font-family: Merriweather, serif; font-weight: 700;
    font-size: 62px; line-height: 1.1; letter-spacing: -0.02em;
    color: ${TEXT};
  }
  .title-ur {
    font-family: 'Noto Nastaliq Urdu', serif; font-weight: 700;
    direction: rtl; text-align: start; /* logical: start === right under rtl */
    /* Nastaliq needs vertical room: its strokes descend well below the
       baseline and a tight line-height clips them. */
    font-size: 38px; line-height: 1.95;
    color: ${TEXT_SECONDARY};
    margin-top: 6px;
  }
  .rule { height: 2px; background: ${COBALT}; opacity: 0.45; margin-bottom: 30px; }
  .meta {
    font-family: 'Source Sans 3', sans-serif; font-weight: 400;
    font-size: 24px; color: ${TEXT_MUTED};
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px;
  }
  .meta strong { font-weight: 600; color: ${TEXT}; }
  .meta .sep { color: ${COBALT}; opacity: 0.55; }
  .foot {
    font-family: 'Source Sans 3', sans-serif; font-weight: 600;
    font-size: 19px; letter-spacing: 0.15em; text-transform: uppercase;
    color: ${COBALT}; opacity: 0.85;
    margin-top: 30px;
  }
</style>
</head>
<body>
  <div class="spine">${CATS.map((c) => `<div style="background:${c}"></div>`).join('')}</div>
  <div class="body">
    <div class="col">
    <div>
      <div class="title-en">${TITLE_EN}</div>
      <div class="title-ur">${TITLE_UR}</div>
    </div>
    <div>
      <div class="rule"></div>
      <div class="meta">
        <span><strong>${SITES}</strong> documented sites</span>
        <span class="sep">·</span>
        <span><strong>${TRADITIONS}</strong> traditions</span>
        <span class="sep">·</span>
        <span>English &amp; <span style="font-family:'Noto Nastaliq Urdu',serif">اردو</span></span>
      </div>
      <div class="foot">raufnawaz.github.io/Sufi-Shrines</div>
    </div>
    </div>
    <div class="cloud">
      <div class="cloud-inner">${dots}</div>
      <div class="cloud-caption">every recorded coordinate</div>
    </div>
  </div>
</body>
</html>`;

/* ── Render ──────────────────────────────────────────────────────────────── */

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2, // retina-crisp; crawlers downscale, they never upscale
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  // The invariant: refuse to write a card rendered in fallback faces.
  const missing = await page.evaluate(() =>
    [
      ['Merriweather', '700 76px Merriweather'],
      ['Source Sans 3', '600 20px "Source Sans 3"'],
      ['Noto Nastaliq Urdu', '700 46px "Noto Nastaliq Urdu"'],
    ]
      .filter(([, spec]) => !document.fonts.check(spec))
      .map(([name]) => name),
  );
  if (missing.length) {
    throw new Error(
      `refusing to write ${OUT}: these faces did not load, so the card would ` +
        `render in a system fallback — ${missing.join(', ')}. ` +
        'Merriweather and Source Sans 3 come from Google Fonts; check network access.',
    );
  }

  await page.screenshot({ path: OUT, type: 'png' });
  writeFileSync(
    LOCK,
    JSON.stringify(
      {
        note: 'Facts baked into public/og-image.png. src/lib/data/__tests__/socialCard.test.ts fails when the archive outgrows them — regenerate with `npm run og:image`.',
        sites: SITES,
        traditions: TRADITIONS,
        titleEn: TITLE_EN,
        titleUr: TITLE_UR,
        width: WIDTH,
        height: HEIGHT,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`[og-image] wrote public/og-image.png (${WIDTH}x${HEIGHT}@2x) — ${SITES} sites`);
} finally {
  await browser.close();
}
