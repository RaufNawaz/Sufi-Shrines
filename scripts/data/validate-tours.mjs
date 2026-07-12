#!/usr/bin/env node
/**
 * validate-tours.mjs — Schema validation for the curated guided-tours dataset.
 *
 * Reads src/data/tours.json, validates every tour against the Zod schema
 * (required bilingual fields, controlled tradition vocabulary, minimum stop
 * count), and checks cross-tour invariants (unique ids). Warns (does not
 * fail) when a stop's shrineSlug doesn't match any shrine in data/shrines.json
 * — tours and shrine data are authored/updated independently.
 *
 * Usage:  node scripts/data/validate-tours.mjs
 * Or:     npm run data:validate
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTour } from './toursSchema.mjs';
import { buildSlugs } from './lib/slugs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const TOURS_JSON = join(ROOT, 'src', 'data', 'tours.json');
const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');

// ── load ──────────────────────────────────────────────────────────────────

if (!existsSync(TOURS_JSON)) {
  console.error(`[validate-tours] src/data/tours.json not found.`);
  process.exit(1);
}

let tours;
try {
  tours = JSON.parse(readFileSync(TOURS_JSON, 'utf8'));
} catch (err) {
  console.error(`[validate-tours] Cannot parse src/data/tours.json: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(tours)) {
  console.error('[validate-tours] src/data/tours.json must be a JSON array of tours.');
  process.exit(1);
}

// ── per-tour validation ──────────────────────────────────────────────────

const errors = [];
const warnings = [];

tours.forEach((tour, i) => {
  const label = `Tour ${i} (${tour?.id ?? '(no id)'})`;
  const result = validateTour(tour);
  if (!result.success) {
    result.errors.forEach((msg) => errors.push(`  ${label}: ${msg}`));
  }
});

// ── unique ids ────────────────────────────────────────────────────────────

const idCount = new Map();
tours.forEach((t, i) => {
  if (typeof t?.id !== 'string') return;
  idCount.set(t.id, [...(idCount.get(t.id) ?? []), i]);
});
idCount.forEach((indices, id) => {
  if (indices.length > 1) {
    errors.push(`  Tour id "${id}" is used by ${indices.length} tours (indices ${indices.join(', ')})`);
  }
});

// ── shrineSlug cross-reference against data/shrines.json (soft) ───────────

if (existsSync(SHRINES_JSON)) {
  let canonical;
  try {
    canonical = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
    const slugSet = new Set(buildSlugs(canonical.rows ?? []));
    tours.forEach((tour) => {
      (tour?.stops ?? []).forEach((stop) => {
        if (stop?.shrineSlug && !slugSet.has(stop.shrineSlug)) {
          warnings.push(
            `  Tour "${tour.id}": stop shrineSlug "${stop.shrineSlug}" does not match any shrine in data/shrines.json`,
          );
        }
      });
    });
  } catch (err) {
    warnings.push(`  Could not cross-check shrineSlugs against data/shrines.json: ${err.message}`);
  }
} else {
  warnings.push('  data/shrines.json not found — skipping shrineSlug cross-check');
}

// ── report ────────────────────────────────────────────────────────────────

if (warnings.length) {
  console.warn(`[validate-tours] Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.warn(`  ⚠${w}`));
}

if (errors.length) {
  console.error(`\n[validate-tours] Errors (${errors.length}) — fix in src/data/tours.json:`);
  errors.forEach((e) => console.error(`  ✗${e}`));
  process.exit(1);
}

console.log(
  `[validate-tours] ✓ ${tours.length} tour(s) valid${warnings.length ? ` (${warnings.length} warning(s))` : ''}`,
);
