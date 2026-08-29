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
 *   5. Every `saintCompositeFigures` row — the sites the sheet gives two figures
 *      — still reaches every figure it names, names no figure twice, and does
 *      not also appear in `saintMergeVariants` (where build-kg lets the
 *      composite win, leaving a merge variant that reads as live and is not).
 *   6. Every `saintMergeVariants` target resolves to a node that exists, so a
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
import { analyseFigureColumns } from './lib/figureColumns.mjs';

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
/* Raw `Sufi Saint` cell → the shrine slugs whose cell it is. Needed by check 5,
   which must look at those rows and no others. */
const shrineSlugsByCell = new Map();
if (existsSync(SHRINES_JSON)) {
  const { rows = [] } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
  for (const row of rows) {
    const shrineSlug = slugify(row.Name);
    rowsBySlug.set(shrineSlug, row);
    const cell = String(row['Sufi Saint'] ?? '').trim();
    if (!cell) continue;
    if (!shrineSlugsByCell.has(cell)) shrineSlugsByCell.set(cell, []);
    shrineSlugsByCell.get(cell).push(shrineSlug);
  }
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

const mergeVariants = seeds.saintMergeVariants ?? {};
const mergeVariantKeys = new Set(Object.keys(mergeVariants).filter((k) => k !== 'comment'));

// ── 5. a site held by two figures reaches both ───────────────────────────────

/* `saintCompositeFigures` is the mechanism that stopped these rows losing a
   person. It can fail three quiet ways: a name that resolves to no node (the
   figure silently vanishes again), a figure that exists but does not carry the
   shrine (the fan-out half-happened), and a key that is also in
   saintMergeVariants (two mechanisms claiming one cell, where build-kg lets the
   composite win — so the merge variant is dead code that reads as live). */
const composites = seeds.saintCompositeFigures ?? {};
const shrineFiguresPath = join(ROOT, 'data', 'kg-shrine-figures.json');
const shrineFigures = existsSync(shrineFiguresPath)
  ? JSON.parse(readFileSync(shrineFiguresPath, 'utf8'))
  : {};

let compositeFigureCount = 0;
for (const [cell, names] of Object.entries(composites)) {
  if (cell === 'comment') continue;
  const label = `saintCompositeFigures["${cell}"]`;

  if (!Array.isArray(names) || names.length < 2) {
    fail(`${label}: must list at least two figures — one figure is a merge variant, not a composite`);
    continue;
  }
  compositeFigureCount += names.length;

  const slugs = names.map((n) => slugify(String(n).replace(/\s*\([^)]*\)/g, '').trim()));
  for (const [i, slug] of slugs.entries()) {
    if (!slug) {
      fail(`${label}: "${names[i]}" slugifies to nothing`);
    } else if (!bySlug.has(slug)) {
      fail(
        `${label}: "${names[i]}" (slug "${slug}") is not a figure node, so this ` +
          `row has lost that person again — which is the failure this map exists to stop.`,
      );
    }
  }

  if (new Set(slugs).size !== slugs.length) {
    fail(`${label}: names the same figure twice (${slugs.join(', ')})`);
  }

  if (mergeVariantKeys.has(cell)) {
    fail(
      `${label}: this cell is also a saintMergeVariants key. build-kg lets the ` +
        `composite win, so the merge variant never applies — remove it.`,
    );
  }

  /* Each named figure must carry the shrines whose OWN cell this is — not every
     shrine that happens to share one of the figures. (The first version of this
     check scanned all 169 and reported 41 failures, because every one of Guru
     Nanak's 18 gurdwaras shares `guru-nanak` with two of these rows.) */
  const ownShrines = shrineSlugsByCell.get(cell) ?? [];
  if (ownShrines.length === 0) {
    fail(
      `${label}: no shrine row has this as its figure cell. The row was edited or ` +
        `removed in the sheet, so this entry is dead — update or delete it.`,
    );
  }
  for (const shrineSlug of ownShrines) {
    const figureSlugs = shrineFigures[shrineSlug] ?? [];
    const missing = slugs.filter((s) => !figureSlugs.includes(s));
    if (missing.length) {
      fail(
        `${label}: ${shrineSlug} reaches ${figureSlugs.join(', ') || '(nobody)'} but not ` +
          `${missing.join(', ')} — the fan-out only half happened, so that figure ` +
          `has lost the site again.`,
      );
    }
  }
}
notes.push(
  `${Object.keys(composites).filter((k) => k !== 'comment').length} composite row(s) naming ${compositeFigureCount} figures`,
);

// ── 6. merge targets must land somewhere ─────────────────────────────────────

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

// ── 7. the column analysis must describe the graph that was actually built ───
/*
 * `lib/figureColumns.mjs` reads the legacy column the same way `build-kg.mjs`
 * does, and everything that prices the open `principal_figure` migration —
 * the measurement script, the reviewer worksheet, the decision brief's numbers —
 * is downstream of that reading. If the two ever diverge, the migration is being
 * priced against a graph nobody is serving.
 *
 * They did diverge, for four commits on 28 August 2026. The composite-figure fix
 * removed a `saintMergeVariants` key, the analysis did not know about
 * `saintCompositeFigures`, and it began deriving three legacy slugs that are not
 * figure nodes and never were — whole composite cells slugified as if they named
 * one person. Nothing failed; the wrong numbers simply went on being printed and
 * were copied into a planning document.
 *
 * The structural fix was one shared module. This is the check that says so out
 * loud: every figure slug the analysis believes the archive publishes today must
 * be a node in the graph the archive actually publishes. It fails on exactly the
 * class of drift that produced the phantoms.
 */
if (existsSync(SHRINES_JSON)) {
  const { rows: sheetRows } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
  const analysis = analyseFigureColumns(sheetRows, seeds);
  const phantoms = [...analysis.legacyUniverse].filter((slug) => !bySlug.has(slug)).sort();
  if (phantoms.length) {
    fail(
      `figureColumns derives ${phantoms.length} figure slug(s) that are not nodes in ` +
        `data/kg.json: ${phantoms.join(', ')}. The column analysis and build-kg.mjs ` +
        `disagree about what the archive publishes, so every number downstream of it ` +
        `(measure-figure-identity-columns, the reviewer worksheet, the decision brief) ` +
        `is describing a graph that does not exist.`,
    );
  }
  notes.push(
    `${analysis.legacyUniverse.size} figure slug(s) from the legacy column` +
      (phantoms.length ? `, ${phantoms.length} NOT in the graph` : ', all present in the graph'),
  );
}

// ── 8. every shrine-keyed figure override must still be needed ───────────────
/*
 * `saintFigureByShrine` overrides a row's `Sufi Saint` cell where that cell is
 * about somebody else. It exists because the cell-keyed maps cannot express the
 * case: Tomb of Javindi Bibi and Shrine of Jalaluddin Surkh-Posh Bukhari carry
 * byte-identical legacy cells and are different monuments about different people.
 *
 * Every entry is a bridge to a sheet correction, not a destination, and a bridge
 * nobody removes becomes a second source of truth. So: the key must be a real
 * shrine slug, and the override must still *differ* from the sheet. Once the CSV
 * patch lands and the cell says what the override says, this fails and tells
 * whoever imported it to delete the entry.
 */
if (existsSync(SHRINES_JSON)) {
  const { rows: sheetRows } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
  const overrides = seeds.saintFigureByShrine ?? {};
  const bySlugCell = new Map();
  for (const row of sheetRows) {
    bySlugCell.set(slugify(String(row.Name ?? '')), String(row['Sufi Saint'] ?? '').trim());
  }
  let checkedOverrides = 0;
  for (const [shrineSlug, entry] of Object.entries(overrides)) {
    if (shrineSlug.startsWith('_')) continue;
    checkedOverrides += 1;
    const figure = String(entry?.figure ?? '').trim();
    if (!figure) {
      fail(`saintFigureByShrine["${shrineSlug}"] has no figure.`);
      continue;
    }
    if (!String(entry?.why ?? '').trim()) {
      fail(
        `saintFigureByShrine["${shrineSlug}"] has no "why". An override of the sheet without a ` +
          `recorded reason is indistinguishable from a mistake.`,
      );
    }
    if (!bySlugCell.has(shrineSlug)) {
      fail(
        `saintFigureByShrine["${shrineSlug}"] names no row in the sheet. The shrine was renamed ` +
          `or removed, so the override is silently doing nothing.`,
      );
      continue;
    }
    if (bySlugCell.get(shrineSlug) === figure) {
      fail(
        `saintFigureByShrine["${shrineSlug}"] is obsolete: the sheet's own Sufi Saint cell now ` +
          `reads "${figure}". The patch has landed — delete the entry rather than leaving a ` +
          `second source of truth behind it.`,
      );
    }
  }
  if (checkedOverrides) {
    const bad = failures.filter((f) => f.startsWith('saintFigureByShrine')).length;
    notes.push(
      `${checkedOverrides} shrine-keyed figure override(s)` +
        (bad ? `, ${bad} of them broken` : ', all live'),
    );
  }
}

// ── 9. a renamed figure must be renamed in both languages ────────────────────
/*
 * `saintDisplayNames` retitles a figure while its slug stays put — the formal
 * name heads the page, the epithet remains the address. The trap is that it can
 * be applied in English alone.
 *
 * `localizeFigureName` falls back through `altNames`, and the epithet the page
 * used to be titled with is pushed onto `altNames` by the rename itself. So an
 * entry whose new title has no Urdu leaves the English page reading "Hazrat Ali
 * ibn Usman al-Hujwiri" and the Urdu page still reading داتا گنج بخش — two
 * editions titling one figure differently, which CLAUDE.md's i18n contract
 * forbids — and **every existing gate stays green**, because the fallback finds
 * Urdu and the no-leak guard visits three saint routes out of 134.
 *
 * Five of the seven rows in the 29 August ruling are held back for exactly this
 * (`_pending_saintDisplayNames`). This is the check that keeps them held rather
 * than trusting the next person to remember why.
 */
{
  const displayNames = seeds.saintDisplayNames ?? {};
  const seedPath = join(ROOT, 'src', 'data', 'urdu-seed.json');
  const urdu = existsSync(seedPath)
    ? new Set(Object.keys(JSON.parse(readFileSync(seedPath, 'utf8'))).map((k) => k.toLowerCase()))
    : null;
  let checkedTitles = 0;
  for (const [slug, rawTitle] of Object.entries(displayNames)) {
    if (slug.startsWith('_')) continue;
    checkedTitles += 1;
    const title = String(rawTitle)
      .replace(/\s*\([^)]*\)/g, '')
      .trim();
    if (!bySlug.has(slug)) {
      fail(`saintDisplayNames names "${slug}", which is not a figure in the graph.`);
      continue;
    }
    if (urdu && !urdu.has(title.toLowerCase())) {
      fail(
        `saintDisplayNames retitles "${slug}" to "${title}", which has no Urdu name. ` +
          `The English page would move and the Urdu page would fall back through altNames to the ` +
          `old epithet, titling one figure two ways. Add the Urdu (lifted from a reviewed entry, ` +
          `never composed) or move the row to _pending_saintDisplayNames.`,
      );
    }
  }
  if (checkedTitles) notes.push(`${checkedTitles} retitled figure(s), each named in both languages`);
}

// ── report ───────────────────────────────────────────────────────────────────

for (const note of notes) console.log(`[kg-identity] ${note}`);
if (failures.length) {
  console.error(`\n[kg-identity] ✗ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('[kg-identity] ✓ figure identity is consistent');
