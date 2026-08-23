/**
 * Every route the app declares must exist as a file in dist.
 *
 * GitHub Pages serves files. `/graph`, `/almanac`, `/coverage` and `/about`
 * were declared in App.tsx, reachable by in-app navigation, and had no
 * prerendered file at all — so a direct visit or a shared link returned
 * GitHub's own 404 page. Two of them are the archive's licence and its
 * self-assessment: the pages most likely to be sent as a link.
 *
 * Nothing caught it, and three separate things made it invisible:
 *
 * - `public/_redirects` carries `/* /index.html 200`, the **Netlify** SPA
 *   fallback. GitHub Pages ignores that file, so it had never worked.
 * - `npm run preview` is a dev server with SPA fallback built in, so every
 *   route resolves locally.
 * - the e2e suite runs against that same preview server.
 *
 * So the check has to look at the emitted directory, not at the running app.
 * It parses the route table out of App.tsx rather than taking a hardcoded list,
 * because a hardcoded list is exactly what would go stale the next time a route
 * is added — which is how this happened.
 *
 * Run as part of `npm run build`, after prerender.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const app = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8').replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '');

/** Every `path="…"` in the route table. */
const declared = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
if (declared.length < 8) {
  console.error(
    `check-routes-prerendered: parsed only ${declared.length} routes out of App.tsx — the ` +
      'route table has probably moved, and this check is looking at nothing.',
  );
  process.exit(1);
}

/**
 * Routes that are correctly absent from dist, each for a stated reason.
 *
 * The parameterised ones are prerendered per entity elsewhere (169 shrines, 196
 * saints, 5 orders, 30-odd places) and are spot-checked below rather than
 * enumerated here.
 */
const NOT_A_FILE = new Map([
  ['*', 'the catch-all — served by 404.html'],
  ['/shrine.html', 'a legacy query-string redirect, handled client-side'],
]);

const failures = [];
const checked = [];

for (const route of declared) {
  if (NOT_A_FILE.has(route)) continue;
  // Parameterised routes: check one real instance instead of the pattern.
  if (route.includes(':')) continue;
  const rel = route.replace(/^\//, '');
  const target = rel === '' ? join(DIST, 'index.html') : join(DIST, rel, 'index.html');
  checked.push(route);
  if (!existsSync(target)) {
    failures.push(`${route} → dist/${rel ? `${rel}/` : ''}index.html is missing`);
  }
}

/* One instance of each parameterised family, so a prerender loop that silently
   emitted nothing is caught too. */
const SPOT_CHECKS = [
  'shrine/data-darbar',
  'saint/data-ganj-bakhsh',
  'order/qadiriyya',
  // The archive's densest place, 35 sites. Its absence would mean the place
  // loop emitted nothing at all, since it is the first place by count.
  'place/lahore',
  // …and the Urdu mirror of one, because the /ur tree is written by a separate
  // pass and could fail on its own.
  'ur/place/lahore',
];
for (const rel of SPOT_CHECKS) {
  if (!existsSync(join(DIST, rel, 'index.html'))) {
    failures.push(`dist/${rel}/index.html is missing — did a prerender loop emit nothing?`);
  }
}

/*
 * Every URL the sitemap advertises must be a file that exists.
 *
 * The spot-checks above prove a prerender loop ran; this proves it ran over the
 * same set the sitemap claims. They are built from different code paths in
 * prerender.mjs — the files from one loop, the `<loc>` entries from a list
 * assembled at the end — so a place, saint or order can appear in one and not
 * the other. A sitemap is the one document a crawler trusts completely, and a
 * `<loc>` that 404s is worse than an absent one.
 *
 * Only runs when SITE_URL was set at build time. Without it prerender.mjs emits
 * an empty `<urlset>` by design — a local `npm run build` therefore has nothing
 * to compare, and treating "no URLs" as "all URLs missing" made this check fail
 * every local build the first time it was written.
 */
const sitemapPath = join(DIST, 'sitemap.xml');
let sitemapChecked = 0;
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) {
    console.log(
      'check-routes-prerendered: sitemap.xml is empty (SITE_URL unset at build time) — ' +
        'skipping the sitemap half of this check.',
    );
  }
  // The origin is whatever SITE_URL was; strip it to get a repo-relative path.
  const origin = locs[0]?.match(/^https?:\/\/[^/]+(\/[^/]*)?/)?.[0] ?? '';
  const missing = [];
  for (const loc of locs) {
    const path = loc.slice(origin.length).replace(/^\//, '');
    const target = path === '' ? join(DIST, 'index.html') : join(DIST, path, 'index.html');
    if (!existsSync(target)) missing.push(loc);
    sitemapChecked++;
  }
  if (missing.length) {
    failures.push(
      `${missing.length} sitemap URL(s) have no file, e.g. ${missing.slice(0, 3).join(', ')}`,
    );
  }
  /* And the reverse direction, for the parameterised families: a place page in
     dist that the sitemap never mentions is invisible to a crawler. Counted per
     language, because every page is listed twice — once for itself and once for
     its /ur mirror — and a single count that conflated them was exactly 2×
     everything and reported four families broken. */
  for (const family of locs.length ? ['shrine', 'saint', 'order', 'place'] : []) {
    const dirs = (dir) =>
      existsSync(dir)
        ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).length
        : 0;
    const en = new RegExp(`(?<!/ur)/${family}/[^/]+$`);
    const ur = new RegExp(`/ur/${family}/[^/]+$`);
    for (const [label, dir, re] of [
      ['', join(DIST, family), en],
      ['ur/', join(DIST, 'ur', family), ur],
    ]) {
      const inDist = dirs(dir);
      const inSitemap = locs.filter((l) => re.test(l)).length;
      if (inDist !== inSitemap) {
        failures.push(
          `dist/${label}${family} holds ${inDist} page(s) but the sitemap lists ${inSitemap} — ` +
            'one of the two loops in prerender.mjs missed some.',
        );
      }
    }
  }
}

/* The fallback itself. Without it an unknown path shows GitHub's 404 rather
   than the app's own NotFoundPage. */
if (!existsSync(join(DIST, '404.html'))) {
  failures.push('dist/404.html is missing — GitHub Pages has no SPA fallback without it');
}

if (failures.length) {
  console.error('check-routes-prerendered: FAILED');
  for (const f of failures) console.error(`  · ${f}`);
  console.error(
    '\n  GitHub Pages serves files: a route with no file 404s on a direct visit, however ' +
      'well it works in preview. Add it to STATIC_PAGES in scripts/prerender.mjs, or to ' +
      'NOT_A_FILE here with a reason.',
  );
  process.exit(1);
}

console.log(
  `check-routes-prerendered: OK — ${checked.length} declared route(s) + ${SPOT_CHECKS.length} ` +
    `spot-check(s) have files${sitemapChecked ? `, ${sitemapChecked} sitemap URL(s) resolve` : ''}` +
    ', and 404.html is present.',
);
