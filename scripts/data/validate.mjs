#!/usr/bin/env node
/**
 * validate.mjs — Schema validation for the canonical shrine dataset.
 *
 * Reads data/shrines.json, validates every row against the Zod schema
 * (required fields, coordinate ranges, controlled vocabularies, URL shapes),
 * and checks cross-row invariants (unique generated slugs). Also runs
 * content-quality checks on Description prose (length outliers, near-duplicate
 * text, leaked placeholder/internal-note strings) and cross-checks
 * data/provenance.json (schema, completeness, contentTier coverage, and an
 * ai-researched-with-zero-citations fabrication-risk flag) — see
 * docs/planning/DATA_QUALITY_PLAN.md §4. These content-quality checks are
 * warnings, not hard errors, until their respective backlogs are cleared.
 * Exits non-zero with a per-row error report on any schema/structural violation.
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

// ── "Sind" vs "Sindh" typo guard ──────────────────────────────────────────
// A confirmed recurring typo: the standalone word "Sind" where "Sindh" (or
// "Sindhi") was meant. Word-boundary regex, so "Sindh"/"Sindhi" don't match.
// Warning only — fixing existing occurrences is a manual Google Sheet edit,
// outside this repo; this just stops it quietly creeping back in.
const SIND_TYPO_RE = /\bSind\b/i;

rows.forEach((row, i) => {
  const label = `Row ${i} (${String(row['Name'] ?? '').trim() || '(no name)'})`;
  Object.entries(row).forEach(([field, value]) => {
    if (typeof value !== 'string' || !SIND_TYPO_RE.test(value)) return;
    rowWarnings.push(`  ${label}: field "${field}" contains standalone "Sind" — did you mean "Sindh"?`);
  });
});

// ── category enum guard ───────────────────────────────────────────────────
// `category` is one of exactly six values (CLAUDE.md § Schema). Nothing checked
// that until 21 August 2026, when the coverage page counted one row into a "not
// recorded" bucket and exposed it: Darbar Abul Muali Qadri carries a blank
// `Category` and a lowercase `category: "Islam"`.
//
// A value outside the enum is not cosmetic. It loses the row its marker colour
// on the map, drops it out of the category filter, and excludes it from every
// per-tradition count — so the archive under-reports itself by one and nothing
// says so. Warning rather than error, matching this validator's treatment of
// data-quality gaps that need a sheet edit (agents do not write to the sheet —
// RULE 3); the fix is in data/patch_data_hygiene_2026-08-21.csv.
const CATEGORY_ENUM = new Set([
  'Muslim Shrine',
  'Hindu Temple',
  'Sikh Gurdwara',
  'Nanakpanthi / Udasi Darbar',
  'Jain Temple',
  'Secular / Memorial',
]);

rows.forEach((row, i) => {
  const label = `Row ${i} (${String(row['Name'] ?? '').trim() || '(no name)'})`;
  /*
   * First *non-empty* of the two, not `??`. Both casings exist mid-migration and
   * a blank string is not nullish, so `row['category'] ?? row['Category']` lets
   * an empty `category` shadow a perfectly good `Category` — which is how the
   * first draft of this check accused Shaktipeeth Shri Hinglaj Mata Mandir of
   * having no category when it has "Hindu Temple". Same fallback semantics as
   * getFieldValue in src/lib/data/fieldAliasing.ts.
   */
  const raw = [row['category'], row['Category']]
    .map((v) => String(v ?? '').trim())
    .find((v) => v !== '') ?? '';
  if (!raw) {
    rowWarnings.push(`  ${label}: no category — loses its map colour and every tradition count`);
    return;
  }
  if (!CATEGORY_ENUM.has(raw)) {
    rowWarnings.push(
      `  ${label}: category "${raw}" is not one of the six schema values — ` +
        `loses its map colour and every tradition count`,
    );
  }
});

// ── provenance validation ─────────────────────────────────────────────────

const PROVENANCE_JSON = join(ROOT, 'data', 'provenance.json');
const VALID_METHODS = new Set(['human', 'ocr', 'mt', 'llm']);
const slugSet = new Set(slugs);
// Slugs whose Description is known-good long-form (Tier 1/2 shrine_entries content,
// verified in Phase B) — exempted from the max-length outlier check below, since
// their length is a feature (rich, cited research), not a runaway-generation risk.
const richContentSlugs = new Set();

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
    // Completeness: every shrine should have at least a baseline provenance
    // entry (run `npm run data:build:provenance` to backfill). This is a hard
    // gate so coverage can't silently regress as new shrines are added.
    const coveredSlugs = new Set(
      shrines.filter((entry) => Object.keys(entry.fields ?? {}).length > 0).map((entry) => entry.shrineSlug),
    );
    const uncovered = slugs.filter((slug) => !coveredSlugs.has(slug));
    if (uncovered.length) {
      rowErrors.push(
        `provenance.json: ${uncovered.length} shrine(s) have no provenance entry at all ` +
          `(run \`npm run data:build:provenance\`): ${uncovered.slice(0, 10).join(', ')}` +
          (uncovered.length > 10 ? ', …' : ''),
      );
    }

    // Content-provenance completeness + fabrication-risk lint (Phase D): every
    // shrine's Description should carry a contentTier (Phase A), and any
    // ai-researched Description with zero citations is a flag for Phase C.
    const bySlug = new Map(shrines.map((entry) => [entry.shrineSlug, entry]));
    let untaggedCount = 0;
    let uncitedAiResearchedCount = 0;
    slugs.forEach((slug) => {
      const descProv = bySlug.get(slug)?.fields?.['Description'];
      if (!descProv?.contentTier) {
        untaggedCount++;
        return;
      }
      if (descProv.contentTier === 'tier1-ocr' || descProv.contentTier === 'tier2-compendium') {
        richContentSlugs.add(slug);
      }
      if (descProv.contentTier === 'ai-researched' && !(descProv.citations?.length > 0)) {
        uncitedAiResearchedCount++;
      }
    });
    if (untaggedCount) {
      rowWarnings.push(
        `provenance.json: ${untaggedCount} shrine(s) have a Description with no contentTier ` +
          `(run \`npm run data:build:content-provenance\`)`,
      );
    }
    if (uncitedAiResearchedCount) {
      rowWarnings.push(
        `provenance.json: ${uncitedAiResearchedCount} shrine(s) are contentTier "ai-researched" with ` +
          `zero citations — fact-verification backlog, see docs/planning/DATA_QUALITY_PLAN.md Phase C`,
      );
    }

    if (!rowErrors.some((e) => e.includes('provenance.json'))) {
      console.log(
        `[validate] ✓ provenance.json — ${shrines.length} shrine entrie(s), ` +
          `${coveredSlugs.size}/${slugs.length} shrines covered`,
      );
    }
  }
}

// ── content-quality checks (Phase D, docs/planning/DATA_QUALITY_PLAN.md §4) ──
// Warnings only for now, per the plan's "non-blocking before blocking" principle —
// promote individual checks to hard errors once their backlog is actually clear.

const MIN_DESCRIPTION_LEN = 300;
const MAX_DESCRIPTION_LEN = 8000;
const LEAK_STRINGS = [
  'Placeholder:',
  'awaiting human translation',
  'TODO',
  'FIXME',
  'Lorem ipsum',
  '[NEEDS REVIEW]',
  'NEEDS HUMAN REVIEW',
];

rows.forEach((row, i) => {
  const label = `Row ${i} (${String(row['Name'] ?? '').trim() || '(no name)'})`;
  const desc = String(row['Description'] ?? '').trim();
  if (!desc) return; // already covered by the empty-content warning above

  if (desc.length < MIN_DESCRIPTION_LEN) {
    rowWarnings.push(`${label}: Description is only ${desc.length} chars (< ${MIN_DESCRIPTION_LEN}) — check it's substantive`);
  } else if (desc.length > MAX_DESCRIPTION_LEN && !richContentSlugs.has(slugs[i])) {
    rowWarnings.push(`${label}: Description is ${desc.length} chars (> ${MAX_DESCRIPTION_LEN}) — check for runaway/duplicated text`);
  }

  LEAK_STRINGS.forEach((needle) => {
    if (desc.includes(needle)) {
      rowWarnings.push(`${label}: Description contains internal marker text "${needle}" — likely leaked from a draft/placeholder`);
    }
  });
});

// Near-duplicate detection: 5-word shingle Jaccard similarity across all Descriptions.
// Catches copy-paste-and-forgot-to-edit mistakes, not just exact duplicates.
function shingles(text, n = 5) {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= words.length; i++) {
    set.add(words.slice(i, i + n).join(' '));
  }
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const s of small) if (large.has(s)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

const descShingles = rows.map((row) => {
  const desc = String(row['Description'] ?? '').trim();
  return desc.length >= MIN_DESCRIPTION_LEN ? shingles(desc) : null;
});

const DUPLICATE_THRESHOLD = 0.5;
for (let i = 0; i < rows.length; i++) {
  if (!descShingles[i]) continue;
  for (let j = i + 1; j < rows.length; j++) {
    if (!descShingles[j]) continue;
    const sim = jaccard(descShingles[i], descShingles[j]);
    if (sim >= DUPLICATE_THRESHOLD) {
      const nameA = String(rows[i]['Name'] ?? `row ${i}`);
      const nameB = String(rows[j]['Name'] ?? `row ${j}`);
      rowWarnings.push(
        `Near-duplicate Description text (${Math.round(sim * 100)}% shingle overlap): "${nameA}" and "${nameB}"`,
      );
    }
  }
}

// Fabrication-risk lint + content-provenance completeness — needs provenance.json,
// checked below once it's loaded.

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
