/**
 * Boot the production build at its real subpath and check every route works.
 *
 *   npm run build && npm run verify:pages
 *
 * ── Why nothing else can do this ─────────────────────────────────────────────
 *
 * The site deploys to GitHub Pages at `/Sufi-Shrines/`. Everything else that
 * exercises the app runs at `/`:
 *
 *   · `npm run build:e2e` sets VITE_BASE_PATH=/ because Playwright needs
 *     root-relative URLs, and CI builds its e2e artifact the same way;
 *   · `vite preview` computes `base` only for `command === 'build'`, so it
 *     serves a subpath build at the root and every asset request falls through
 *     to its HTML fallback — which is why a first attempt at this check
 *     reported every asset as a 404 that did not exist;
 *   · `npm run preview` has SPA fallback built in, so an unprerendered route
 *     resolves locally even when GitHub Pages would 404 it.
 *
 * A real bug lived in that gap: the screen-reader shrine directory emitted
 * `<a href="/shrine/${slug}">`, bypassing the router basename, so all 169 links
 * 404'd in production and nowhere else (HANDOVER §9.58). `/graph`, `/almanac`,
 * `/coverage` and `/about` had no prerendered file at all, for the same reason
 * (§9.60). Both were invisible to 126 passing Playwright tests.
 *
 * ── What this asserts ───────────────────────────────────────────────────────
 *
 * A static server that behaves like GitHub Pages: files served from `dist` under
 * the base prefix, directory paths resolved to `index.html`, and **404.html
 * returned with a 404 status** for anything else — the mechanism the SPA
 * fallback depends on. Then, per route: it renders, no page errors, no failed
 * subrequests, and every in-app `href` carries the base prefix. Plus one
 * client-side navigation, because a link that renders correctly can still route
 * to the wrong place.
 *
 * The harness checks itself first (§9.53's lesson): if the build was not made
 * with the production base, or if no route renders at all, it exits non-zero
 * rather than reporting a clean sweep over nothing.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BASE = process.env.PAGES_BASE ?? '/Sufi-Shrines';
const PORT = Number(process.env.PAGES_PORT ?? 4179);
const ORIGIN = `http://localhost:${PORT}`;

/* ── harness self-check: is this even the production build? ────────────────── */
let indexHtml;
try {
  indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
} catch {
  console.error(`check-production-base: no dist/index.html. Run \`npm run build\` first.`);
  process.exit(1);
}
if (!indexHtml.includes(`${BASE}/assets/`)) {
  console.error(
    `check-production-base: dist/index.html does not reference ${BASE}/assets/, so this is ` +
      'not a production-base build. `npm run build:e2e` sets the base to `/` — run plain ' +
      '`npm run build`, which is what deploy-pages.yml does.',
  );
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.ics': 'text/calendar',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', ORIGIN).pathname);
  if (!path.startsWith(BASE)) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('outside base');
    return;
  }
  const rel = path.slice(BASE.length) || '/';
  const candidates = [join(DIST, rel)];
  if (!extname(rel)) candidates.push(join(DIST, rel, 'index.html'));
  for (const file of candidates) {
    try {
      if ((await stat(file)).isFile()) {
        res
          .writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
          .end(await readFile(file));
        return;
      }
    } catch {
      /* try the next candidate */
    }
  }
  // GitHub Pages: 404.html, with a 404 status. The status is the point — the
  // router boots from the body while the response stays honest.
  try {
    res.writeHead(404, { 'content-type': 'text/html' }).end(await readFile(join(DIST, '404.html')));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

/** Routes and the selector that proves each one rendered. */
const ROUTES = [
  { path: '/', ready: '#sidebar' },
  { path: '/?lang=ur', ready: '#sidebar' },
  { path: '/about', ready: 'h1.entity-title' },
  { path: '/coverage', ready: 'h1.entity-title' },
  { path: '/place/lahore', ready: 'h1.entity-title' },
  { path: '/graph', ready: 'h1.entity-title' },
  { path: '/almanac', ready: 'h1.entity-title' },
  { path: '/shrine/data-darbar', ready: 'h1.shrine-title' },
  { path: '/saint/data-ganj-bakhsh', ready: 'h1.entity-title' },
  { path: '/order/qadiriyya', ready: 'h1.entity-title' },
  { path: '/ur', ready: '#sidebar' },
  { path: '/ur/about', ready: 'h1.entity-title' },
  // An unknown path must still boot the app, via 404.html. The 404 *status* is
  // correct and expected here, so it is not counted as a failure.
  { path: '/no-such-page-exists', ready: 'h1.not-found-title', expect404: true },
];

const csvBody = readFileSync(join(ROOT, 'e2e/fixtures/shrines.csv'), 'utf8');

await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);

const failures = [];
let rendered = 0;

try {
  for (const route of ROUTES) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    // The published sheet is unreachable from CI and from a sandbox; serve the
    // same deterministic fixture the e2e suite uses.
    await context.route(/docs\.google\.com/, (r) =>
      r.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: csvBody }),
    );
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(`page error: ${e.message.split('\n')[0]}`));
    page.on('response', (r) => {
      const url = new URL(r.url());
      if (url.origin !== ORIGIN || r.status() < 400) return;
      // The document's own 404 is expected on the fallback route.
      if (route.expect404 && url.pathname === `${BASE}${route.path}`) return;
      problems.push(`${r.status()} ${url.pathname}`);
    });

    await page.goto(ORIGIN + BASE + route.path, { waitUntil: 'load' });
    const appeared = await page
      .locator(route.ready)
      .first()
      .waitFor({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (appeared) rendered += 1;
    else problems.push(`did not render (${route.ready} never appeared)`);
    await page.waitForTimeout(1500);

    const unbased = await page.evaluate((base) => {
      const out = new Set();
      for (const a of document.querySelectorAll('a[href^="/"]')) {
        const href = a.getAttribute('href');
        if (href && !href.startsWith(base)) out.add(href);
      }
      return [...out].slice(0, 5);
    }, BASE);
    for (const href of unbased) {
      problems.push(`href="${href}" has no ${BASE} prefix — it bypasses the router basename`);
    }

    if (problems.length) failures.push({ route: route.path, problems: [...new Set(problems)] });
    console.log(`${problems.length ? '✗' : '✓'} ${route.path}`);
    for (const p of [...new Set(problems)].slice(0, 5)) console.log(`      ${p}`);
    await context.close();
  }

  /* One client-side navigation: a correct-looking link can still route wrong. */
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route(/docs\.google\.com/, (r) =>
    r.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: csvBody }),
  );
  const page = await context.newPage();
  await page.goto(`${ORIGIN}${BASE}/shrine/data-darbar`, { waitUntil: 'load' });
  await page.locator('h1.shrine-title').waitFor({ timeout: 20_000 });
  await page.locator('a.back-link').click();
  await page.waitForTimeout(1500);
  const landed = new URL(page.url()).pathname;
  if (landed !== `${BASE}/` && landed !== BASE) {
    failures.push({
      route: 'client-side navigation',
      problems: [`back link landed on ${landed}, not ${BASE}/`],
    });
  }
  console.log(`${landed === `${BASE}/` || landed === BASE ? '✓' : '✗'} back link → ${landed}`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}

/* ── harness self-check: did anything actually render? ─────────────────────── */
if (rendered === 0) {
  console.error(
    '\ncheck-production-base: no route rendered at all. The harness is broken, so a clean ' +
      'result here would mean nothing. Check that the server is serving dist under the base.',
  );
  process.exit(1);
}

if (failures.length) {
  console.error(`\ncheck-production-base: FAILED on ${failures.length} route(s).`);
  console.error(
    '  These are production-only: the e2e suite builds with the base at `/`, which is the one ' +
      'configuration in which base-path bugs do not exist.',
  );
  process.exit(1);
}

console.log(
  `\ncheck-production-base: OK — ${rendered}/${ROUTES.length} routes render at ${BASE}, ` +
    'every in-app link carries the base, 404.html boots the router.',
);
