#!/usr/bin/env node
/**
 * validate-kg-identity.mjs — one person, one node; and two people, never one.
 *
 * Figure identity in this graph is decided in two places in data/kg-seeds.json:
 * `saintMergeVariants` says which names denote one person, and
 * `saintDoNotMerge` says which names look like one person and are not. This
 * script is what makes both of them load-bearing rather than advisory.
 *
 * It exists because both directions failed silently, in production, and neither
 * failure showed up in any gate:
 *
 *   - **Un-joined.** The graph built figure nodes from the sheet and from
 *     machine proposals independently, and the proposal side minted a node
 *     whenever its slug was unfamiliar. So Wasif Ali Wasif had two:
 *     `hazrat-wasif-ali-wasif-awan` held his shrine and his ʿurs,
 *     `hazrat-wasif-ali-wasif` held his master and both his orders, the display
 *     name on the two was character-for-character identical, and no page could
 *     show a reader both halves of him. Same for Shah Abul Muali Qadri.
 *     Check 1 fails on any recurrence.
 *
 *   - **Over-joined.** The tempting fix is to compare names with honorifics and
 *     particles stripped. Measured on this corpus on 28 August 2026, that
 *     proposed 21 merges of which 2 were right. The 19 wrong ones were not
 *     noise: `shaikh-abdul-latif` is Khwaja Muhammad Zaman's *father*, not Shah
 *     Abdul Latif Bhittai; `sayyid-shah-inayat` is Shah Chan Charagh's
 *     *maternal uncle*, not Shah Inayat Qadiri of Lahore. In a corpus of
 *     silsilas, sharing a name is evidence of standing one edge away from
 *     someone — father, son, uncle, master, disciple — so a similarity merge
 *     deletes the very relation that made the pair worth recording.
 *     Checks 2 and 3 make each such decision a written, quoted, enforced row.
 *
 * Checked:
 *   1. No two saint nodes share a `saintNameKey` (identical name after case,
 *      punctuation and whitespace folding — and nothing looser).
 *   2. Every `saintDoNotMerge` pair still exists as that many distinct nodes.
 *   3. Every `saintDoNotMerge` quote is a byte-exact substring of its source.
 *   4. Every retired figure slug still resolves: it is not itself a live figure,
 *      and its target is. A figure's page is prerendered and listed in the
 *      sitemap, so joining two nodes retires a published URL — and this route's
 *      fallback for an unknown figure is a redirect to the map, which is a soft
 *      404 for anyone holding the old address.
 *   5. Every `saintMergeVariants` target resolves to a node that exists, so a
 *      typo in a merge target cannot silently stop merging.
 *
 * Not checked, because it is not decidable here: whether a pair that shares no
 * name ought to be merged. That needs a reader (docs/KG_REVIEW_WORKFLOW.md).
 *
 * Usage:  node scripts/data/validate-kg-identity.mjs
 * Or:     npm run data:validate:kg-identity
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './lib/slugs.mjs';
import { saintNameKey, findNameKeyCollisions } from './lib/saintIdentity.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const KG_JSON = join(ROOT, 'data', 'kg.json');
const SEEDS_JSON = join(ROOT, 'data', 'kg-seeds.json');
const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

if (!existsSync(KG_JSON)) {
  console.error('[kg-identity] data/kg.json not found. Run: npm run data:kg');
  process.exit(1);
}

const kg = JSON.parse(readFileSync(KG_JSON, 'utf8'));
const seeds = JSON.parse(readFileSync(SEEDS_JSON, 'utf8'));
const saints = kg.saints ?? [];
const bySlug = new Map(saints.map((s) => [s.slug, s]));

// ── 1. no two nodes may claim the same name ───────────────────────────────────

const collisions = findNameKeyCollisions(saints);
for (const [key, slugs] of collisions) {
  fail(
    `two or more figure nodes share the name "${key}": ${slugs.join(', ')}. ` +
      `Identical names are the one signal this project accepts as proof of the ` +
      `same person, so either join them (build-kg.mjs resolves proposal slugs ` +
      `through saintNameKey) or give them the names that tell them apart.`,
  );
}
notes.push(`${saints.length} figure nodes, ${collisions.size} name collision(s)`);

// ── 2 & 3. the decisions against merging ─────────────────────────────────────

const rowsBySlug = new Map();
if (existsSync(SHRINES_JSON)) {
  const { rows = [] } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
  for (const row of rows) rowsBySlug.set(slugify(row.Name), row);
}

/** Resolve a `source` to the text a quote must appear in — same rule as
 *  verify-kg-proposals.mjs, so the two scripts cannot drift apart on it. */
function sourceText(source) {
  if (source.startsWith('data/shrines.csv#')) {
    const slug = source.slice('data/shrines.csv#'.length).trim();
    const row = rowsBySlug.get(slug);
    if (!row) return { ok: false, why: `no shrine row with slug "${slug}"` };
    return { ok: true, text: Object.values(row).join('\n') };
  }
  const path = join(ROOT, source.split('#')[0]);
  if (!existsSync(path)) return { ok: false, why: `file not found: ${source}` };
  return { ok: true, text: readFileSync(path, 'utf8') };
}

const doNotMerge = seeds.saintDoNotMerge ?? [];
for (const [i, entry] of doNotMerge.entries()) {
  const label = `saintDoNotMerge[${i}] (${(entry.slugs ?? []).join(' / ')})`;

  const slugs = entry.slugs ?? [];
  if (slugs.length < 2) {
    fail(`${label}: needs at least two slugs to forbid a merge between`);
    continue;
  }

  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) {
    fail(
      `${label}: ${missing.join(', ')} no longer exist(s) as a figure node. ` +
        `A slug disappearing is usually a merge happening — check that these ` +
        `two were not joined, then update or remove this row deliberately.`,
    );
  }

  const ids = new Set(slugs.filter((s) => bySlug.has(s)).map((s) => bySlug.get(s).id));
  if (ids.size === 1 && slugs.length > 1) {
    fail(`${label}: FORBIDDEN MERGE HAS HAPPENED — all of these are now one node.`);
  }

  if (!entry.reason || !String(entry.reason).trim()) {
    fail(`${label}: missing reason. A row nobody can read is a row nobody can undo.`);
  }

  if (!entry.quote || !entry.source) {
    fail(`${label}: missing quote or source — every decision here carries its evidence`);
    continue;
  }
  const resolved = sourceText(entry.source);
  if (!resolved.ok) {
    fail(`${label}: ${resolved.why}`);
  } else if (!resolved.text.includes(entry.quote)) {
    fail(
      `${label}: quote is not a byte-exact substring of ${entry.source}. ` +
        `Either the source changed or the quote was retyped; re-extract it.`,
    );
  }
}
notes.push(`${doNotMerge.length} recorded decision(s) against merging`);

// ── 4. retired slugs must still resolve ──────────────────────────────────────

const retired = kg.retiredSlugs ?? {};
for (const [from, to] of Object.entries(retired)) {
  if (bySlug.has(from)) {
    fail(
      `retiredSlugs["${from}"]: that slug is a live figure, so this entry would ` +
        `hide its own page behind a redirect to "${to}".`,
    );
  }
  if (from === to) {
    fail(`retiredSlugs["${from}"]: points at itself, which is a redirect loop`);
  } else if (!bySlug.has(to)) {
    fail(
      `retiredSlugs["${from}"] -> "${to}": the target is not a figure, so the old ` +
        `URL still falls through to the map — the soft 404 this map exists to stop.`,
    );
  }
}
notes.push(`${Object.keys(retired).length} retired slug(s) still resolve`);

// ── 5. merge targets must land somewhere ─────────────────────────────────────

const mergeVariants = seeds.saintMergeVariants ?? {};
let checkedTargets = 0;
for (const [raw, canonical] of Object.entries(mergeVariants)) {
  if (raw === 'comment') continue;
  const target = slugify(String(canonical).replace(/\s*\([^)]*\)/g, '').trim());
  checkedTargets += 1;
  if (!target) {
    fail(`saintMergeVariants["${raw}"]: canonical name "${canonical}" slugifies to nothing`);
  } else if (!bySlug.has(target)) {
    fail(
      `saintMergeVariants["${raw}"] -> "${canonical}" (slug "${target}") has no ` +
        `figure node. The merge target is wrong, so the merge is not happening.`,
    );
  }
}
notes.push(`${checkedTargets} merge target(s) resolve`);

// ── report ───────────────────────────────────────────────────────────────────

for (const note of notes) console.log(`[kg-identity] ${note}`);
if (failures.length) {
  console.error(`\n[kg-identity] ✗ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('[kg-identity] ✓ figure identity is consistent');
