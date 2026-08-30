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
/** /ur pages carrying the Urdu-strings modulepreload, reported in the summary. */
let urduPreloads = 0;

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
  // The tradition pages are the newest per-entity loop, and the one whose data
  // file is separate from kg.json — so its absence would be a missing file
  // rather than an empty graph, and would not show up in any other check.
  'tradition/nath',
  'ur/tradition/nath',
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

/*
 * The Urdu string table's `modulepreload`, on /ur pages and nowhere else.
 *
 * prerender.mjs injects it and said this file asserted it. This file did not —
 * for a day the only check was a unit test, and a unit test can only look at
 * whatever dist/ happens to be lying around. dist/ is gitignored and survives
 * branch switches, so that test read a build from before the split existed and
 * failed with nothing wrong in the source. Here the artefact is current by
 * construction: this runs inside `npm run build`, moments after it was written.
 *
 * Three ways it breaks, all silent:
 *   · the chunk stops being a dynamic entry — one static `import` of
 *     uiStrings.ur anywhere folds 42 KB back into every route's eager JS;
 *   · the injection loop stops running, and Urdu readers pay a round trip
 *     before first paint that the tag exists to remove;
 *   · the preload's base drifts from the entry script's, which is a 404 that
 *     looks exactly like a preload that worked.
 */
{
  const manifestPath = join(DIST, '.vite', 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
  const entry = manifest?.['src/lib/i18n/uiStrings.ur.ts'];
  const urRoot = join(DIST, 'ur');

  if (!manifest) {
    failures.push('dist/.vite/manifest.json is missing — the build emitted no manifest');
  } else if (!entry?.file) {
    failures.push(
      'src/lib/i18n/uiStrings.ur.ts is not a chunk in the manifest — the Urdu string table ' +
        'has been folded back into whatever imports it, so every reader now downloads 42 KB ' +
        'of Urdu interface copy. Look for a static import of uiStrings.ur.',
    );
  } else if (existsSync(urRoot)) {
    const chunk = entry.file;
    const missing = [];
    const walk = (dir) => {
      for (const d of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, d.name);
        if (d.isDirectory()) walk(full);
        else if (d.name === 'index.html') {
          if (readFileSync(full, 'utf8').includes(chunk)) urduPreloads += 1;
          else missing.push(full.slice(DIST.length + 1));
        }
      }
    };
    walk(urRoot);
    if (missing.length) {
      failures.push(
        `${missing.length} /ur page(s) carry no modulepreload for ${chunk}, e.g. ` +
          `${missing.slice(0, 3).join(', ')} — those readers wait a round trip before first paint`,
      );
    }

    /* The base, read off one page rather than assumed: `/Sufi-Shrines/` in a
       normal build, `/` in the e2e build, and the two must not be mixed. */
    const sample = join(urRoot, 'about', 'index.html');
    if (existsSync(sample)) {
      const html = readFileSync(sample, 'utf8');
      const entrySrc = /<script[^>]+type="module"[^>]+src="([^"]+)"/.exec(html)?.[1];
      const preload = /<link rel="modulepreload"[^>]*href="([^"]*uiStrings\.ur[^"]*)"/.exec(
        html,
      )?.[1];
      const baseOf = (url) => url.slice(0, url.indexOf('assets/'));
      if (entrySrc && preload && baseOf(preload) !== baseOf(entrySrc)) {
        failures.push(
          `the Urdu preload's base (${baseOf(preload)}) differs from the entry script's ` +
            `(${baseOf(entrySrc)}) — the preload points at a 404`,
        );
      }
    }

    /* And the point of the whole split: an English reader must not fetch it.
       Asserted as "no *static* link preloads it", not "the filename is absent".
       Since 28 August the non-/ur documents deliberately carry the chunk's name
       inside a conditional script that appends the link only for a reader who
       resolves to Urdu (scripts/prerender.mjs). A substring test cannot tell a
       preload from a mention, and it failed the conditional preload on the day
       it was added — the right instinct measured the wrong thing. The behaviour
       itself is asserted in a browser by e2e/urdu-preload.spec.ts: English
       fetches the table never, `?lang=ur` fetches it before the entry chunk
       finishes. */
    const en = join(DIST, 'about', 'index.html');
    if (existsSync(en)) {
      const html = readFileSync(en, 'utf8');
      const escaped = chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`<link[^>]+rel="modulepreload"[^>]+href="[^"]*${escaped}"`).test(html)) {
        failures.push(
          'an English page statically preloads the Urdu string table — the split no longer ' +
            'saves anyone anything',
        );
      }
      /* The other direction, added with the conditional tag: if this disappears,
         every `?lang=ur` and stored-preference visit silently goes back to
         waiting a round trip with nothing on screen, and nothing else would say
         so. */
      if (!html.includes('shrines_language') || !html.includes(chunk)) {
        failures.push(
          'a non-/ur page carries no conditional Urdu preload — `?lang=ur` and returning ' +
            'Urdu readers wait a round trip before first paint again',
        );
      }
    }
  }
}

/*
 * The other direction: every /ur file the prerenderer emits must have a route.
 *
 * Everything above asks "does this route have a file". `/ur/settings` and
 * `/ur/review` were the reverse — files with no route. prerender.mjs emits a
 * /ur mirror for *every* APP_ROUTE, and App.tsx's /ur block was maintained by
 * hand, so both URLs served a page with an Urdu <title> that rendered
 * "صفحہ نہیں ملا" the instant React hydrated. Nine days, no error anywhere: the
 * file exists, so no 404; the route does not, so the catch-all matched, which
 * is what a catch-all is for.
 *
 * Compared source to source rather than against dist, deliberately. This repo
 * lives in an iCloud-synced folder that leaves duplicate `about 2/` directories
 * inside dist/, and a check that walked the tree would fail the build on
 * someone else's sync artefact.
 */
{
  const prerender = readFileSync(join(ROOT, 'scripts/prerender.mjs'), 'utf8');
  const block = /const APP_ROUTES = \[([\s\S]*?)\n\];/.exec(prerender)?.[1] ?? '';
  const mirrored = [...block.matchAll(/^\s*path: '([^']+)',/gm)].map((m) => m[1]);
  if (mirrored.length < 5) {
    failures.push(
      `parsed only ${mirrored.length} APP_ROUTES out of prerender.mjs — the list has probably ` +
        'moved, and this check is looking at nothing',
    );
  }
  const declaredSet = new Set(declared);
  const orphans = mirrored.filter((p) => !declaredSet.has(`/ur/${p}`));
  if (orphans.length) {
    failures.push(
      `prerender.mjs writes dist/ur/${orphans.join('/, dist/ur/')}/ but App.tsx declares no ` +
        `/ur/${orphans.join(', /ur/')} route — those URLs paint an Urdu title and then render ` +
        'the not-found page. Add the route, or stop emitting the file.',
    );
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
  /* Only when a route file is actually absent. Printed unconditionally it sent
     someone to STATIC_PAGES over a modulepreload, which has nothing to do with it. */
  if (failures.some((f) => /is missing|have no file/.test(f))) {
    console.error(
      '\n  GitHub Pages serves files: a route with no file 404s on a direct visit, however ' +
        'well it works in preview. Add it to STATIC_PAGES in scripts/prerender.mjs, or to ' +
        'NOT_A_FILE here with a reason.',
    );
  }
  process.exit(1);
}

console.log(
  `check-routes-prerendered: OK — ${checked.length} declared route(s) + ${SPOT_CHECKS.length} ` +
    `spot-check(s) have files${sitemapChecked ? `, ${sitemapChecked} sitemap URL(s) resolve` : ''}` +
    `, ${urduPreloads} /ur page(s) preload the Urdu strings, and 404.html is present.`,
);
