#!/usr/bin/env node
/**
 * check-bundle-budget.mjs — fails the build when a route's *eager* JavaScript
 * grows past its budget.
 *
 * Why this exists: `src/data/urdu-content.json` — 1.0 MB of Urdu article prose
 * for 168 shrines — was a static import in `urduContentOverride.ts`, which put
 * it in the same eager chunk as the data hook. Every visitor downloaded and
 * parsed the entire Urdu edition of the archive before the first map tile
 * appeared, English-only readers included. Measured on 20 August 2026: `/`
 * shipped 3506 KB of JS, of which 1000 KB was that one file. Nothing errored,
 * no test failed, and `vite build`'s own "chunks larger than 500 kB" warning
 * had been printing for other reasons for long enough to be background noise.
 *
 * So the invariant is measured, not guessed: walk the real static import graph
 * from Vite's manifest and add up bytes on disk. A dynamic import is excluded
 * because it is off the critical path by construction — which is exactly the
 * property the fix relies on, and exactly what a regression would quietly
 * undo.
 *
 * Budgets are current measurement plus headroom, not aspirations. Raising one
 * should be a deliberate line in a diff with a reason next to it.
 */
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const MANIFEST = join(DIST, '.vite', 'manifest.json');

/**
 * Eager KB budgets per route: the entry's static closure plus the route
 * chunk's static closure. Headroom is ~8% over the 20 August 2026 measurement,
 * enough to absorb a normal feature but not another megabyte.
 */
/*
 * **Paid off on 21 August 2026, and every budget below dropped ~74 KB.**
 *
 * The two notes this block used to carry both said the same thing: the Urdu
 * dictionary (`src/data/urdu-seed.json`) was a static import in
 * `urduFallback.ts`, so every route shipped it eagerly, and it had grown twice
 * in two days (49 → 67 → 80 KB) with the budgets raised each time. Twice
 * recording a debt is the point at which recording it stops being the answer.
 *
 * It is now loaded on demand, gated on the reader's language exactly as
 * `urdu-content.json` already was — an English reader downloads none of it. The
 * header of `src/lib/i18n/urduFallback.ts` explains how the synchronous-render
 * problem is handled, which was the real reason this waited.
 *
 * Numbers below are the measurement *after* that change. `index.html` went from
 * 322 KB to 248 KB of eager JavaScript; the map route from 611 to 537.
 */
const BUDGETS_KB = {
  'index.html': 270, // measured 248 (was 322 with the dictionary eager)
  'src/pages/MapPage.tsx': 580, // measured 537 — maplibre-gl (1035 KB) is lazy; see MUST_STAY_LAZY
  /* 495 → 505, raised 24 August 2026. Two things worth knowing before touching
     this line again.

     The old annotation read "measured 457" and the route measured 495 — it had
     eaten all 38 KB of its headroom since that comment was written, so it sat
     exactly on its budget and the next commit to touch *any shared module* was
     going to fail here regardless of what it did. What actually tripped it was
     eight new interface strings in src/lib/i18n/uiStrings.ts, which every route
     imports: +1 KB on ShrinePage, AboutPage and SaintPage alike, for copy that
     renders only on the figure page. A per-route budget cannot express "a shared
     module grew", so the route with the least headroom takes the blame.

     The comment is now the measurement *and* its date, because the number
     without the date is what went stale. Which is also the standing lesson in
     CLAUDE.md: a measurement quoted long enough becomes a claim.

     The real finding underneath is in HANDOVER §9: UI_TEXT.ur is 39 KB of
     source shipped eagerly to every reader, English-only ones included — the
     same shape as the urdu-content.json waste this whole script was written to
     catch. Fixing that gives every route back far more than this 10 KB. */
  'src/pages/ShrinePage.tsx': 505, // measured 496 on 24 Aug 2026
  'src/pages/SaintPage.tsx': 665, // measured 615
  'src/pages/OrderPage.tsx': 650, // measured 600
  'src/pages/GraphPage.tsx': 620, // measured 571
  'src/pages/AlmanacPage.tsx': 335, // measured 307
  'src/pages/NotFoundPage.tsx': 275, // measured 251
  'src/pages/CoveragePage.tsx': 320, // measured 294 — shrine data + the places index
  'src/pages/AboutPage.tsx': 280, // measured 257 — static text, no dataset needed
  'src/pages/PlacePage.tsx': 315, // measured 289 — the dataset and the place vocabulary
  // Added 23 Aug 2026 when the two branches merged: these routes were built on
  // the other line, so this table had never seen them. Same headroom as their
  // peers (~5%); both read the shipped dataset and render prose and tables.
  'src/pages/ReportPage.tsx': 320, // measured 304 — coverage figures from the data
  'src/pages/TypologyPage.tsx': 315, // measured 299 — the built-form atlas
};

/**
 * Chunks that must stay off every route's eager path. Named rather than
 * size-checked so the failure message says *what* regressed: a budget
 * overshoot from one of these is a lazy import that turned static, which is a
 * different bug from a chunk that simply grew.
 */
const MUST_STAY_LAZY = [
  { match: /^urdu-content-/, why: 'the 1 MB Urdu article payload (Urdu readers only)' },
  {
    match: /^urdu-seed-/,
    why: 'the 80 KB Urdu dictionary (Urdu readers only) — see urduFallback.ts',
  },
  {
    match: /^shrines-fallback-/,
    why: 'the offline snapshot (loaded only when the sheet fetch fails)',
  },
  {
    match: /^vendor-maplibre-/,
    why:
      'maplibre-gl, 1035 KB — the basemap tiles only. The sidebar, search, filters, ' +
      'era slider and markers are Leaflet and need none of it, so it must never sit on ' +
      'the map route’s critical path (src/components/map/ShrineMap.tsx lazy-loads it)',
  },
];

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch {
  console.error(
    `check-bundle-budget: no manifest at ${MANIFEST}.\n` +
      'Run `npm run build` (build.manifest must stay true in vite.config.ts).',
  );
  process.exit(1);
}

const sizeCache = new Map();
function sizeOf(file) {
  if (!sizeCache.has(file)) {
    try {
      sizeCache.set(file, statSync(join(DIST, file)).size);
    } catch {
      sizeCache.set(file, 0);
    }
  }
  return sizeCache.get(file);
}

/** Transitive *static* import closure of a manifest key, as file names. */
function staticClosure(key, seen = new Set()) {
  const entry = manifest[key];
  if (!entry || seen.has(key)) return seen;
  seen.add(key);
  for (const dep of entry.imports ?? []) staticClosure(dep, seen);
  return seen;
}

function filesOf(keys) {
  return [...keys].map((k) => manifest[k]?.file).filter((f) => f && f.endsWith('.js'));
}

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) {
  console.error('check-bundle-budget: no isEntry chunk in the manifest.');
  process.exit(1);
}

const shellFiles = new Set(filesOf(staticClosure(entryKey)));
const failures = [];
const rows = [];

/**
 * Every route the entry can reach, plus the shell itself. The entry's other
 * dynamic imports are data chunks (`src/data/urdu-content.json`) — deliberately
 * lazy, and not a route anyone navigates to.
 */
const routes = [
  entryKey,
  ...(manifest[entryKey].dynamicImports ?? []).filter(
    (key) => manifest[key] && key.startsWith('src/pages/'),
  ),
];

for (const key of routes) {
  const files = new Set([...shellFiles, ...filesOf(staticClosure(key))]);
  const bytes = [...files].reduce((sum, f) => sum + sizeOf(f), 0);
  const kb = Math.round(bytes / 1024);
  const budget = BUDGETS_KB[key];

  const leaked = [...files]
    .map((f) => {
      const base = f.replace(/^assets\//, '');
      const rule = MUST_STAY_LAZY.find((r) => r.match.test(base));
      return rule ? `${base} — ${rule.why}` : null;
    })
    .filter(Boolean);
  for (const leak of leaked) {
    failures.push(`${key}: eagerly imports ${leak}`);
  }

  if (budget === undefined) {
    failures.push(
      `${key}: no budget set (${kb} KB). Add it to BUDGETS_KB in scripts/check-bundle-budget.mjs.`,
    );
  } else if (kb > budget) {
    failures.push(`${key}: ${kb} KB eager JS exceeds its ${budget} KB budget`);
  }
  rows.push({ key, kb, budget, files: files.size });
}

const width = Math.max(...rows.map((r) => r.key.length));
for (const r of rows.sort((a, b) => b.kb - a.kb)) {
  const flag = r.budget !== undefined && r.kb > r.budget ? 'FAIL' : 'ok  ';
  console.log(
    `  ${flag} ${r.key.padEnd(width)}  ${String(r.kb).padStart(5)} KB / ${String(r.budget ?? '—').padStart(5)} KB  (${r.files} chunks)`,
  );
}

if (failures.length > 0) {
  console.error('\ncheck-bundle-budget: FAILED');
  for (const f of failures) console.error(`  · ${f}`);
  console.error(
    '\nIf the growth is intentional, raise the budget in scripts/check-bundle-budget.mjs\n' +
      'with a comment saying why. If it is not, the usual cause is a `import x from\n' +
      "'…json'` that should be `await import('…json')` behind a condition.",
  );
  process.exit(1);
}
console.log('\ncheck-bundle-budget: OK — every route within its eager JS budget.');
