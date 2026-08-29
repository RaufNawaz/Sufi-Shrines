#!/usr/bin/env node
/**
 * measure-kb-gaps.mjs — every hole in the knowledge base, classified by what
 * could actually close it.
 *
 * Written 28 August 2026, when the instruction was "complete and bridge all the
 * gaps in the knowledge base". The first honest answer to that is a measurement,
 * because the phrase hides a distinction that decides who can do the work:
 *
 *   **unread**     the archive already holds the value and the graph does not
 *                  read it. An agent can close this today, and it is exactly the
 *                  class the `principal_figure` finding belongs to.
 *   **taxonomy**   the corpus names something the closed vocabulary lacks — an
 *                  order, a figure type. Closeable by a seed entry quoting the
 *                  source, no new research.
 *   **structural** slugs, labels, links, parentheticals. Closeable, and it is
 *                  published-URL surface so it is not cosmetic.
 *   **evidence**   the archive does not record it. **Not closeable by anyone at
 *                  a keyboard.** Filling these from general knowledge is exactly
 *                  what RULE 2 forbids, and `docs/allo_mahar_resolution.md` is
 *                  what it looks like when someone tries.
 *
 * The headline number this produces is uncomfortable and is the point: the great
 * majority of what is missing from this knowledge base is missing because nobody
 * has recorded it, not because the pipeline drops it. A report that lumps the
 * four classes together turns a field-research problem into a to-do list, which
 * is how an archive ends up with confident prose about the wrong man.
 *
 * Prints, and writes nothing. Exits non-zero for nothing — an instrument, not a
 * gate. `--json` for the machine-readable form.
 *
 * Usage:  node scripts/data/measure-kb-gaps.mjs [--json]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './lib/slugs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const asJson = process.argv.includes('--json');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const readIfPresent = (p) => (existsSync(join(ROOT, p)) ? read(p) : null);

for (const f of ['data/kg.json', 'data/shrines.json', 'data/kg-shrine-figures.json']) {
  if (!existsSync(join(ROOT, f))) {
    console.error(`[kb-gaps] ${f} not found. Run: npm run data:build && npm run data:kg`);
    process.exit(1);
  }
}

const kg = read('data/kg.json');
const { rows } = read('data/shrines.json');
const shrineFigures = read('data/kg-shrine-figures.json');
const seed = existsSync(join(ROOT, 'src/data/urdu-seed.json')) ? read('src/data/urdu-seed.json') : {};
const seedLower = new Map(Object.entries(seed).map(([k, v]) => [k.toLowerCase(), v]));

const saints = kg.saints ?? [];
const relations = kg.relations ?? [];
const rowBySlug = new Map(rows.map((r) => [slugify(String(r.Name ?? '')), r]));

const withOrder = new Set(
  relations.filter((r) => r.type === 'belongs_to_order').map((r) => r.subject.replace('saint:', '')),
);
const withLineage = new Set();
for (const r of relations) {
  if (r.type !== 'disciple_of' && r.type !== 'successor_of') continue;
  withLineage.add(r.subject.replace('saint:', ''));
  withLineage.add(r.object.replace('saint:', ''));
}
/* Figure slug -> the rows that commemorate them, so a figure's gaps can be
   checked against the sheet cells that could fill them. */
const rowsForFigure = new Map();
for (const [shrineSlug, figs] of Object.entries(shrineFigures)) {
  const row = rowBySlug.get(shrineSlug);
  if (!row) continue;
  for (const f of figs) {
    if (!rowsForFigure.has(f)) rowsForFigure.set(f, []);
    rowsForFigure.get(f).push(row);
  }
}
const cell = (row, key) => String(row?.[key] ?? '').trim();
const anyCell = (figureSlug, key) => (rowsForFigure.get(figureSlug) ?? []).some((r) => cell(r, key));

const archive = saints.filter((s) => (s.shrines?.length ?? 0) > 0);
const lineageOnly = saints.filter((s) => (s.shrines?.length ?? 0) === 0);

const gaps = [];
const add = (kind, klass, subject, detail) => gaps.push({ kind, class: klass, subject, detail });

/* ── figures: an order ──────────────────────────────────────────────────────
   `unread` only where the row carries a silsila the graph did not turn into an
   edge. Everything else is evidence: the sheet's silsila column is populated on
   52 of 169 rows, so most figures have no order because none was recorded. */
const orderNames = (kg.orders ?? []).map((o) => String(o.name ?? '').toLowerCase());
for (const s of archive) {
  if (withOrder.has(s.slug)) continue;
  const cells = (rowsForFigure.get(s.slug) ?? []).map((r) => cell(r, 'silsila')).filter(Boolean);
  if (!cells.length) {
    add('figure-no-order', 'evidence', s.slug, 'no silsila recorded on any row');
    continue;
  }
  /* A populated silsila cell is not the same as a readable one, and calling
     every one of them `unread` promises work that cannot be done. Three cells
     remain and none is a plumbing failure: one is prose that declines to name an
     order at all, one hedges ("As recorded: …") around a name the taxonomy does
     not have. Only a cell naming an order the graph already knows is genuinely
     unread. */
  const names = cells.join(' ').toLowerCase();
  const namesKnownOrder = orderNames.some((n) => n && names.includes(n));
  add(
    'figure-no-order',
    namesKnownOrder ? 'unread' : 'taxonomy',
    s.slug,
    namesKnownOrder
      ? `row names an order the graph has and the edge is missing: ${cells.join(' | ')}`
      : `silsila names no order in the taxonomy: ${cells.join(' | ')}`,
  );
}
for (const s of lineageOnly) {
  add('figure-no-order', 'evidence', s.slug, 'lineage-only figure, no row of their own');
}

/* ── figures: dates ─────────────────────────────────────────────────────── */
for (const s of archive) {
  if (s.born || s.died) continue;
  const hasDate = anyCell(s.slug, 'figure_born') || anyCell(s.slug, 'figure_died');
  add(
    'figure-no-dates',
    hasDate ? 'unread' : 'evidence',
    s.slug,
    hasDate ? 'row records figure_born/figure_died the graph did not read' : 'no date recorded',
  );
}
for (const s of lineageOnly) {
  if (s.born || s.died) continue;
  add('figure-no-dates', 'evidence', s.slug, 'lineage-only figure, no date in the corpus');
}

/* ── figures: a type ────────────────────────────────────────────────────────
   The non-primary figure of a composite row is NOT a gap. Rori Sahib records
   `figure_type: "Sikh Guru"` and Bhai Mardana was not a Guru, so build-kg
   deliberately withholds the row's figure columns from everyone but the figure
   the cell leads with. Counting that as "unread" would report a rule working as
   a defect — and would invite someone to "fix" it by asserting what the sheet
   never said. Classified `by-design` and excluded from the closeable total. */
const compositeSecondary = new Set();
for (const figs of Object.values(readIfPresent('data/kg-shrine-figure-labels.json') ?? {})) {
  for (const f of figs.slice(1)) compositeSecondary.add(f.slug);
}
for (const s of archive) {
  if (s.figureType) continue;
  if (compositeSecondary.has(s.slug)) {
    add(
      'figure-no-type',
      'by-design',
      s.slug,
      'named second on a composite row; the row\'s figure columns describe the figure it leads with (RULE 2)',
    );
    continue;
  }
  const hasType = anyCell(s.slug, 'figure_type');
  add(
    'figure-no-type',
    hasType ? 'unread' : 'evidence',
    s.slug,
    hasType ? 'row records figure_type the graph did not read' : 'no figure_type recorded',
  );
}

/* ── figures: a lineage edge ────────────────────────────────────────────── */
for (const s of archive) {
  if (withLineage.has(s.slug)) continue;
  add('figure-no-lineage', 'evidence', s.slug, 'no teacher or successor recorded in the corpus');
}

/* ── figures: an Urdu name ──────────────────────────────────────────────────
   Split three ways, because the third is the closeable one: a name that is not
   in the dictionary but appears *inside* an already-translated string. Bibi
   Jawindi was exactly that — "Tomb of Javindi Bibi" was reviewed as
   "مقبرہ بی بی جاوندی", so her name existed in Urdu before her node did. */
const urduFor = (name) => seedLower.get(String(name).toLowerCase());
const translatedStrings = [...seedLower.entries()];
for (const s of saints) {
  if (urduFor(s.name)) continue;
  const host = translatedStrings.find(([k]) => k.includes(String(s.name).toLowerCase()));
  const where = (s.shrines?.length ?? 0) > 0 ? 'archive' : 'lineage-only';
  add(
    'figure-no-urdu-name',
    host ? 'unread' : 'evidence',
    s.slug,
    host
      ? `${where}; name appears inside the reviewed entry "${host[0]}"`
      : `${where}; nothing in the dictionary contains this name`,
  );
}

/* ── figures: a long slug ───────────────────────────────────────────────────
   A word count is a **proxy**, and by now it is a proxy with no true positives
   left. The real defect it was standing in for — a slug that swallowed a
   *description* rather than a name — was 5 rows, and all 5 are closed by
   `saintDescriptiveCells` (`malik-ahmad-ayaz-described-in-the-survey-as-slave-of-…`
   is now `malik-ahmad-ayaz`).

   What the count still catches is 17 figures whose names are simply long:
   `shaikh-shihab-ud-din-abu-hafs-umar-al-suhrawardi` is nine words and every one
   of them is his name. Shortening those would be inventing a shorter name for a
   real person, which is the RULE 2 failure this whole report exists to keep
   separate from the closeable work.

   So they are reported as `informational`, not as something to fix, and are kept
   in the output rather than dropped: a future import can add a sixth descriptive
   cell, and a reader scanning this list is how it gets noticed. Read the names,
   do not act on the number. */
const LONG_SLUG_WORDS = 6;
for (const s of saints) {
  const words = s.slug.split('-').length;
  if (words < LONG_SLUG_WORDS) continue;
  add(
    'figure-slug-long',
    'informational',
    s.slug,
    `${words}-word URL; a long name, unless the extra words describe rather than name`,
  );
}

/* ── orders the corpus names and the taxonomy lacks ─────────────────────── */
const orderSlugs = new Set((kg.orders ?? []).map((o) => o.slug));
for (const item of kg.reviewNeeded ?? []) {
  const details = String(item.details ?? '');
  const m = details.match(/newOrdersNeeded|new order/i);
  if (m) add('order-missing-from-taxonomy', 'taxonomy', String(item.entityId ?? ''), details);
}

/* ── relations published unreviewed ─────────────────────────────────────── */
const unreviewed = relations.filter((r) => r.reviewed === false);
for (const r of unreviewed) {
  add('relation-unreviewed', 'human-review', `${r.subject} ${r.type} ${r.object}`, 'reviewed: false');
}

// ── report ───────────────────────────────────────────────────────────────────
const byKind = new Map();
for (const g of gaps) {
  if (!byKind.has(g.kind)) byKind.set(g.kind, []);
  byKind.get(g.kind).push(g);
}
const classTotals = gaps.reduce((a, g) => ((a[g.class] = (a[g.class] ?? 0) + 1), a), {});

if (asJson) {
  console.log(JSON.stringify({ generated: kg.generated, classTotals, gaps }, null, 2));
  process.exit(0);
}

console.log(`[kb-gaps] ${saints.length} figures (${archive.length} with a site, ${lineageOnly.length} lineage-only), ${(kg.orders ?? []).length} orders, ${rows.length} rows\n`);
for (const [kind, list] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
  const byClass = list.reduce((a, g) => ((a[g.class] = (a[g.class] ?? 0) + 1), a), {});
  const parts = Object.entries(byClass)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${n} ${c}`)
    .join(', ');
  console.log(`  ${kind.padEnd(28)} ${String(list.length).padStart(4)}   (${parts})`);
  for (const g of list
    .filter((x) => x.class !== 'evidence' && x.class !== 'human-review' && x.class !== 'informational')
    .slice(0, 8)) {
    console.log(`      · ${g.subject} — ${g.detail}`);
  }
}
console.log('\n  by what could close it:');
for (const [c, n] of Object.entries(classTotals).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${c.padEnd(14)} ${String(n).padStart(5)}`);
}
console.log(
  '\n  unread / taxonomy / structural are closeable at a keyboard.\n' +
    '  evidence is not: the archive does not record it, and RULE 2 says an agent\n' +
    '  may not supply it. Those need field work or a source, not a session.',
);
