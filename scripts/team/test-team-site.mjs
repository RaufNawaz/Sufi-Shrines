/**
 * End-to-end test of the encrypted team edition, served the way GitHub Pages serves it
 * (31 October 2026).
 *
 *   npm run test:team-site                 builds both editions, encrypts, then tests (minutes)
 *   npm run test:team-site -- --skip-build reuses dist/ and dist-team/, re-encrypts, then tests
 *
 * The passphrase page, the service worker and the 404 redirect only work together in a real
 * browser against a server that behaves like Pages: files under /Sufi-Shrines/, and 404.html with
 * a 404 status for anything else (the server is check-production-base.mjs's). This checks:
 *
 *   - the passphrase page loads, and a wrong passphrase is refused with a message;
 *   - the right one opens the team app (its "Team view" badge, `.team-view-badge`);
 *   - a deep link (/team/about) works once unlocked, after a lock (via ?next=), and on a first
 *     visit in a fresh browser (via the public 404.html redirect);
 *   - /team/lock, and the badge's exit button, end on the passphrase page;
 *   - a rotated passphrase (re-encrypted with another one) locks the old key out and the new
 *     passphrase opens it;
 *   - the public site still loads at /Sufi-Shrines/, and /Sufi-Shrines/?team=1 sends a reader to
 *     the passphrase page;
 *   - no page errors, and no failed same-origin request other than the expected 404 document.
 *
 * It writes dist/team/ with a test passphrase (TEAM_TEST_PASSPHRASE, default below), so never run
 * it between the real encrypt step and the upload.
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'dist');
const BASE = '/Sufi-Shrines';
const TEAM = `${BASE}/team`;
const PORT = Number(process.env.PAGES_PORT ?? 4183);
const ORIGIN = `http://localhost:${PORT}`;
const PASS = process.env.TEAM_TEST_PASSPHRASE ?? 'team-site test passphrase 31-10';
const ROTATED = `${PASS} (rotated)`;
const skipBuild = process.argv.includes('--skip-build');

function run(label, command, args, env = {}) {
  console.log(`\n── ${label}`);
  const r = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32' && command === 'npm',
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) {
    console.error(`test-team-site: ${label} failed (exit ${r.status})`);
    process.exit(1);
  }
}

function encrypt(passphrase, scan = true) {
  run(
    `encrypt (${scan ? 'with' : 'without'} the bundle scan)`,
    process.execPath,
    ['scripts/team/encrypt-team.mjs', ...(scan ? [] : ['--no-scan'])],
    { TEAM_PASSPHRASE: passphrase },
  );
}

if (!skipBuild) {
  run('npm run build', 'npm', ['run', 'build']);
  run('npm run build:team', 'npm', ['run', 'build:team']);
}
encrypt(PASS);

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
  '.bin': 'application/octet-stream',
};

/* GitHub Pages, as check-production-base.mjs models it: files under the base, a directory
   resolves to its index.html, anything else is 404.html with a 404 status. */
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
  try {
    res.writeHead(404, { 'content-type': 'text/html' }).end(await readFile(join(DIST, '404.html')));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

const csvBody = readFileSync(join(ROOT, 'e2e/fixtures/shrines.csv'), 'utf8');
/* Hermetic, as in check-production-base.mjs: the sheet from the e2e fixture, every other
   third-party request aborted. */
async function stubExternal(context) {
  await context.route('**/*', (r) => {
    const url = new URL(r.request().url());
    if (url.origin === ORIGIN) return r.continue();
    if (/(^|\.)docs\.google\.com$/.test(url.hostname)) {
      return r.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: csvBody });
    }
    return r.abort();
  });
}

const failures = [];
const problems = [];
let checks = 0;

function check(ok, label, detail = '') {
  checks += 1;
  console.log(`${ok ? '✓' : '✗'} ${label}${!ok && detail ? `\n      ${detail}` : ''}`);
  if (!ok) failures.push(label);
  return ok;
}

/** Page errors and failed same-origin responses, on every page of a context. `allow404` lists the
 *  document paths whose 404 status is the Pages fallback working as intended. */
function watch(context, name, allow404 = []) {
  context.on('page', (page) => attach(page, name, allow404));
}
function attach(page, name, allow404) {
  page.on('pageerror', (e) => problems.push(`${name}: page error: ${e.message.split('\n')[0]}`));
  page.on('response', (r) => {
    const url = new URL(r.url());
    if (url.origin !== ORIGIN || r.status() < 400) return;
    if (r.status() === 404 && allow404.includes(url.pathname)) return;
    problems.push(`${name}: ${r.status()} ${url.pathname}`);
  });
}

const visible = (page, selector, timeout = 30_000) =>
  page
    .locator(selector)
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);

async function unlock(page, passphrase) {
  await page.locator('#passphrase').fill(passphrase);
  await page.locator('#unlock-button').click();
}

const pathOf = (page) => new URL(page.url()).pathname + new URL(page.url()).search;

await new Promise((resolve) => server.listen(PORT, resolve));
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);

try {
  /* ── one browser, unlocking and locking ─────────────────────────────────── */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await stubExternal(ctx);
  watch(ctx, 'team');
  const page = await ctx.newPage();

  await page.goto(`${ORIGIN}${TEAM}/`);
  check(await visible(page, '#passphrase'), 'the passphrase page loads at /team/');
  check(
    /team edition/i.test(await page.locator('h1').innerText()) &&
      (await page.locator('[lang="ur"][dir="rtl"]').count()) > 0,
    'it says it is the team edition, in English and Urdu',
  );

  await unlock(page, 'definitely not the passphrase');
  const refused = await visible(page, '#unlock-error', 30_000);
  check(
    refused && /not right/.test(await page.locator('#unlock-error').innerText()),
    'a wrong passphrase is refused with a message',
  );
  check(pathOf(page) === `${TEAM}/`, 'a wrong passphrase stays on the passphrase page');

  await unlock(page, PASS);
  check(await visible(page, '.team-view-badge', 60_000), 'the right passphrase opens the team app');
  check(pathOf(page) === `${TEAM}/`, 'it opens at the team root', pathOf(page));

  await page.goto(`${ORIGIN}${TEAM}/about`);
  check(
    (await visible(page, 'h1.entity-title')) && (await visible(page, '.team-view-badge', 5_000)),
    'a deep link (/team/about) works once unlocked',
  );
  await page.reload();
  check(await visible(page, 'h1.entity-title'), 'and survives a reload');

  /* The exit button navigates to /team/lock, which the service worker answers with a redirect;
     Playwright reports no request for a navigation a worker redirects, so what is checked is the
     effect: the key is gone and the browser is on the passphrase page at the team root. */
  await page.locator('.team-view-badge-exit').click();
  check(await visible(page, '#passphrase'), "the badge's exit button ends on the passphrase page");
  check(pathOf(page) === `${TEAM}/`, '… at the team root', pathOf(page));
  check(
    (await page.evaluate(() => window.TeamCrypto.keyStore.get())) === undefined,
    '… and the key has been deleted (locked, not just hidden)',
  );

  await page.goto(`${ORIGIN}${TEAM}/about`);
  check(await visible(page, '#passphrase'), 'once locked, a deep link shows the passphrase page');
  check(pathOf(page) === `${TEAM}/?next=about`, '… keeping ?next=about', pathOf(page));
  await unlock(page, PASS);
  check(
    (await visible(page, 'h1.entity-title', 60_000)) && pathOf(page) === `${TEAM}/about`,
    '… and unlocking goes to /team/about',
    pathOf(page),
  );

  await page.goto(`${ORIGIN}${TEAM}/lock`);
  check(await visible(page, '#passphrase'), '/team/lock returns to the passphrase page');
  await page.goto(`${ORIGIN}${TEAM}/`);
  check(await visible(page, '#passphrase'), '… and stays locked');

  /* ── a first visit in a fresh browser: the public 404.html redirect ─────── */
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await stubExternal(fresh);
  watch(fresh, 'first visit', [`${TEAM}/about`]);
  const first = await fresh.newPage();
  await first.goto(`${ORIGIN}${TEAM}/about`);
  check(
    (await visible(first, '#passphrase')) && pathOf(first) === `${TEAM}/?next=about`,
    'a first-visit deep link reaches the passphrase page via 404.html, with ?next=about',
    pathOf(first),
  );
  await unlock(first, PASS);
  check(
    (await visible(first, 'h1.entity-title', 60_000)) &&
      (await visible(first, '.team-view-badge', 5_000)) &&
      pathOf(first) === `${TEAM}/about`,
    '… and unlocking opens /team/about',
    pathOf(first),
  );

  /* ── a rotated passphrase ───────────────────────────────────────────────── */
  encrypt(ROTATED, false);
  await first.goto(`${ORIGIN}${TEAM}/about`);
  check(
    await visible(first, '#passphrase'),
    'after a redeploy with a new passphrase, the old key shows the passphrase page',
  );
  const keyLeft = await first.evaluate(() => window.TeamCrypto.keyStore.get());
  check(keyLeft === undefined, '… and the old key has been deleted');
  await unlock(first, PASS);
  check(await visible(first, '#unlock-error'), '… the old passphrase is refused');
  await unlock(first, ROTATED);
  check(
    (await visible(first, 'h1.entity-title', 60_000)) && pathOf(first) === `${TEAM}/about`,
    '… the new one opens it',
    pathOf(first),
  );
  await fresh.close();
  await ctx.close();

  /* ── the public site ───────────────────────────────────────────────────── */
  const pub = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await stubExternal(pub);
  watch(pub, 'public');
  const home = await pub.newPage();
  await home.goto(`${ORIGIN}${BASE}/`);
  check(await visible(home, '#sidebar'), 'the public site loads at /Sufi-Shrines/');
  check(
    (await home.locator('.team-view-badge').count()) === 0,
    'the public site has no Team view badge',
  );
  await home.goto(`${ORIGIN}${BASE}/?team=1`);
  check(
    (await visible(home, '#passphrase')) && pathOf(home).startsWith(`${TEAM}/`),
    '/Sufi-Shrines/?team=1 lands on the passphrase page',
    pathOf(home),
  );
  await pub.close();
} finally {
  await browser.close();
  server.close();
}

const unique = [...new Set(problems)];
check(
  unique.length === 0,
  'no page errors and no failed same-origin requests',
  unique.join('\n      '),
);

if (failures.length) {
  console.error(`\ntest-team-site: FAILED ${failures.length} of ${checks} checks.`);
  process.exit(1);
}
console.log(
  `\ntest-team-site: OK, ${checks} checks. dist/team/ is now encrypted with a test passphrase; ` +
    'rebuild it with the real one before any deploy.',
);
