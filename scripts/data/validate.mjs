#!/usr/bin/env node
/**
 * validate.mjs — Schema validation for the canonical shrine dataset.
 *
 * Reads data/shrines.json, validates every row against the Zod schema
 * (required fields, coordinate ranges, controlled vocabularies, URL shapes),
 * and checks cross-row invariants (unique generated slugs).
 * Exits non-zero with a per-row error report on any violation.
 *
 * Usage:  node scripts/data/validate.mjs
 * Or:     npm run data:validate
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRow } from './schema.mjs';
import { buildSlugs } from './lib/slugs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');

// ── load ──────────────────────────────────────────────────────────────────

if (!existsSync(SHRINES_JSON)) {
  console.error(`[validate] data/shrines.json not found. Run: npm run data:build`);
  process.exit(1);
}

let canonical;
try {
  canonical = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
} catch (err) {
  console.error(`[validate] Cannot parse data/shrines.json: ${err.message}`);
  process.exit(1);
}

const rows = canonical.rows ?? [];

// ── validate count consistency ────────────────────────────────────────────

const topErrors = [];
if (typeof canonical.count !== 'number' || canonical.count !== rows.length) {
  topErrors.push(`count field (${canonical.count}) does not match rows.length (${rows.length})`);
}
if (!canonical.schema_version) {
  topErrors.push('missing schema_version field');
}

// ── per-row validation ────────────────────────────────────────────────────

const rowErrors = [];
const rowWarnings = [];

rows.forEach((row, i) => {
  const label = `Row ${i} (${String(row['Name'] ?? '').trim() || '(no name)'})`;
  const result = validateRow(row);
  if (!result.success) {
    result.errors.forEach((msg) => rowErrors.push(`  ${label}: ${msg}`));
  }
});

// ── slug uniqueness (cross-row) ───────────────────────────────────────────

const slugs = buildSlugs(rows);
const slugCount = new Map();
slugs.forEach((s, i) => slugCount.set(s, [...(slugCount.get(s) ?? []), i]));
slugCount.forEach((indices, slug) => {
  if (indices.length > 1) {
    const names = indices.map((i) => String(rows[i]?.['Name'] ?? `row ${i}`)).join(', ');
    rowErrors.push(`  Slug "${slug}" collides across rows: ${names}`);
  }
});

// ── warnings for empty optional high-value fields ─────────────────────────

rows.forEach((row, i) => {
  const label = `Row ${i} (${String(row['Name'] ?? '').trim() || '(no name)'})`;
  if (!String(row['Description'] ?? '').trim() && !String(row['Events'] ?? '').trim()) {
    rowWarnings.push(`  ${label}: no Description or Events text`);
  }
});

// ── provenance validation ─────────────────────────────────────────────────

const PROVENANCE_JSON = join(ROOT, 'data', 'provenance.json');
const VALID_METHODS = new Set(['human', 'ocr', 'mt', 'llm']);
const slugSet = new Set(slugs);

if (existsSync(PROVENANCE_JSON)) {
  let prov;
  try {
    prov = JSON.parse(readFileSync(PROVENANCE_JSON, 'utf8'));
  } catch (err) {
    rowErrors.push(`provenance.json: cannot parse — ${err.message}`);
  }

  if (prov) {
    if (!prov.schema_version) {
      rowErrors.push('provenance.json: missing schema_version');
    }
    const shrines = prov.shrines ?? [];
    shrines.forEach((entry, i) => {
      const label = `provenance.json shrines[${i}]`;
      if (!entry.shrineSlug || typeof entry.shrineSlug !== 'string') {
        rowErrors.push(`${label}: missing or non-string shrineSlug`);
        return;
      }
      if (!slugSet.has(entry.shrineSlug)) {
        rowWarnings.push(
          `${label}: shrineSlug "${entry.shrineSlug}" does not match any shrine in data/shrines.json`,
        );
      }
      const fields = entry.fields ?? {};
      Object.entries(fields).forEach(([field, fp]) => {
        const flabel = `${label}.fields["${field}"]`;
        if (!fp.source || typeof fp.source !== 'string') {
          rowErrors.push(`${flabel}: missing or non-string source`);
        }
        if (!VALID_METHODS.has(fp.method)) {
          rowErrors.push(
            `${flabel}: method "${fp.method}" must be one of: ${[...VALID_METHODS].join(', ')}`,
          );
        }
        if (fp.confidence !== undefined) {
          const c = Number(fp.confidence);
          if (!isFinite(c) || c < 0 || c > 1) {
            rowErrors.push(`${flabel}: confidence must be a number in [0, 1]`);
          }
        }
      });
    });
    if (!rowErrors.some((e) => e.includes('provenance.json'))) {
      console.log(`[validate] ✓ provenance.json — ${shrines.length} shrine entrie(s) valid`);
    }
  }
}

// ── report ────────────────────────────────────────────────────────────────

const allErrors = [...topErrors, ...rowErrors];

if (rowWarnings.length) {
  console.warn(`[validate] Warnings (${rowWarnings.length}):`);
  rowWarnings.slice(0, 10).forEach((w) => console.warn(`  ⚠  ${w}`));
  if (rowWarnings.length > 10) console.warn(`  … and ${rowWarnings.length - 10} more`);
}

if (allErrors.length) {
  console.error(`\n[validate] Errors (${allErrors.length}) — fix in data/shrines.json or re-run npm run data:build:`);
  allErrors.forEach((e) => console.error(`  ✗  ${e}`));
  process.exit(1);
}

console.log(
  `[validate] ✓ ${rows.length} rows valid${rowWarnings.length ? ` (${rowWarnings.length} warning(s))` : ''}`,
);
