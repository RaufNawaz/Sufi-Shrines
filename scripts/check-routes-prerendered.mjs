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
import { readFileSync, existsSync } from 'node:fs';
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
    'parameterised famil(ies) have files, and 404.html is present.',
);
