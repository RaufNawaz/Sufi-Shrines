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
const BUDGETS_KB = {
  'index.html': 300, // shell alone — measured 274
  'src/pages/MapPage.tsx': 1720, // measured 1595 — maplibre (1035) + leaflet (151) dominate
  'src/pages/ShrinePage.tsx': 520, // measured 475 — the graph is no longer on this route
  'src/pages/SaintPage.tsx': 680, // measured 628
  'src/pages/OrderPage.tsx': 640, // measured 592
  'src/pages/GraphPage.tsx': 640, // measured 593
  'src/pages/AlmanacPage.tsx': 350, // measured 322
  'src/pages/NotFoundPage.tsx': 300, // measured 277
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
    match: /^shrines-fallback-/,
    why: 'the offline snapshot (loaded only when the sheet fetch fails)',
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
