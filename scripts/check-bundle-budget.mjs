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
/*
 * **Every number below was re-measured and lowered on 24 August 2026**, when the
 * Urdu interface strings were split into their own chunk. Each route's eager JS
 * fell 20–30 KB — index.html 261 → 234, MapPage 575 → 548, ShrinePage 496 → 469
 * — because 42 KB of Nastaliq copy had been reaching every reader on every route,
 * English-only ones included. See docs/planning/LANGUAGE_LAYER_2026-08-24.md.
 *
 * The budgets came down with it, deliberately. A budget that does not fall when
 * the payload does is how this table ended up with a line reading "measured 457"
 * against a route sitting at 495: the headroom had been silently spent, and the
 * next commit to touch *any* shared module was going to fail here regardless of
 * what it did. Two block comments used to live in this table explaining raises
 * for ShrinePage and AboutPage; both described numbers these lines no longer
 * carry, so they are gone rather than left to read as current. The lesson they
 * recorded is kept because it is the general one:
 *
 *   **a per-route budget cannot express "a shared module grew", so the route
 *   with the least headroom takes the blame for a change unrelated to it.**
 *
 * Each line is now `measured N on <date>`. The date is the part that matters —
 * a measurement quoted long enough becomes a claim (CLAUDE.md's standing
 * findings). Headroom is ~7%: enough for a normal feature, not for another
 * language's worth of strings.
 */
/*
 * **Re-measured on 26 August 2026, and every line moved.** Twelve routes, all
 * of them 5–26 KB heavier than the 24 August numbers two days above:
 *
 *   index 234 → 246 · Map 548 → 560 · Shrine 469 → 484 · Saint 606 → 632 ·
 *   Order 600 → 620 · Graph 563 → 574 · Almanac 295 → 316 · About 308 → 313 ·
 *   Place 278 → 292 · Typology 274 → 288 · Review 251 → 257 · 404 237 → 250
 *
 * Two things in that column, and separating them is the point of re-measuring
 * rather than raising one line:
 *
 * **A shared module grew, and it reached every route.** `src/lib/i18n/
 * uiStrings.ts` went 44.5 KB → 49.7 KB of source in two days — the ʿurs
 * calendar's strings, A9's figure-page sections, the century strip's — and the
 * English strings are eager on every route by construction, because English is
 * the default language and the first paint renders them synchronously. That is
 * most of the ~12 KB floor under every number above. The Urdu strings were
 * split into their own chunk on 24 August for exactly this reason; the English
 * ones cannot be split the same way, but the *route-specific* ones could be,
 * and that is the follow-up this measurement earns rather than a raise.
 *
 * **And the almanac had already spent its headroom.** It was at 315/315 —
 * exactly its ceiling — when the calendar view shipped on 26 August, and the
 * budget was not re-measured with it. So the next commit to touch any shared
 * module failed here, on a route it had nothing to do with. That is the failure
 * this table's own header foresees ("the route with the least headroom takes the
 * blame for a change unrelated to it") happening for the second time, and the
 * fix is the same one the header prescribes: re-measure the whole table when
 * features ship, not when it goes red.
 *
 * Headroom stays ~7%. Nothing here is a lazy import gone static — MUST_STAY_LAZY
 * passes on every route, which is the check that would catch the megabyte-class
 * regression this file exists for.
 */
const BUDGETS_KB = {
  'index.html': 265, // measured 246 on 26 Aug 2026
  'src/pages/MapPage.tsx': 600, // measured 560 on 26 Aug 2026
  'src/pages/ShrinePage.tsx': 520, // measured 484 on 26 Aug 2026
  'src/pages/SaintPage.tsx': 675, // measured 632 on 26 Aug 2026
  'src/pages/OrderPage.tsx': 665, // measured 620 on 26 Aug 2026
  'src/pages/GraphPage.tsx': 615, // measured 574 on 26 Aug 2026
  'src/pages/AlmanacPage.tsx': 340, // measured 316 on 26 Aug 2026
  'src/pages/NotFoundPage.tsx': 270, // measured 250 on 26 Aug 2026
  /* Absorbed /coverage and /report on 24 Aug 2026, so it carries what those two
     routes used to: the source index, the places index and the archive report.
     278 KB before the merge, 308 after — and the 281 KB and 279 KB those two
     routes each cost are gone from this table rather than moved down it. A
     reader who wanted the archive's account of itself used to download all
     three. provenance.json stays a dynamic import inside the page; if this
     number jumps by ~170 KB, that is what went static. */
  'src/pages/AboutPage.tsx': 335, // measured 313 on 26 Aug 2026
  'src/pages/PlacePage.tsx': 315, // measured 292 on 26 Aug 2026
  // Added 23 Aug 2026 when the two branches merged: this route was built on the
  // other line, so this table had never seen it.
  'src/pages/TypologyPage.tsx': 310, // measured 288 on 26 Aug 2026
  /* The review desk. 257 KB measured 26 Aug 2026 — essentially the app shell and
     nothing else, which is the point: its 78 KB queue is a dynamic `import()`
     inside the route, so a public reader never downloads a page they cannot
     open. If this number jumps by ~78 KB, that import went static. */
  'src/pages/ReviewPage.tsx': 275, // measured 257 on 26 Aug 2026
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
