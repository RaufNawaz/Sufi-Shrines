#!/usr/bin/env node
/**
 * measure-source-works.mjs — how heavily the archive leans on any one WORK,
 * as opposed to any one citation string.
 *
 * WHY THE DISTINCTION IS THE WHOLE POINT. `buildSourceIndex` dedupes on
 * `citationKey`, which is the citation lowercased and trimmed — exactly right
 * for what that index is for, because the citation string is the reader's
 * search string and two entries that cite different pages of a book have cited
 * different things. But it means **one book appears as many sources**, and on
 * this archive the effect is not marginal:
 *
 *   Alam Faqri, *Tazkirah Awliya-e-Pakistan* — 11 records, ~48 entries.
 *
 * `/about` reports "464 distinct sources" and lists the Tazkirah as three
 * separate top rows of 25, 11 and 5, with eight more single-citation variants
 * scattered through the 436-long tail. A reader cannot add up what they cannot
 * see, and the archive's dependence on its single most important source is
 * roughly twice what the biggest number on the page suggests.
 *
 * This script measures that, and NOTHING here changes the citation index. The
 * citations stay exactly as recorded (RULE 2).
 *
 * WHAT IT WILL NOT DO. It does not group by similarity. Grouping is by a
 * human-curated list in `data/kg-seeds.json#sourceWorks`, for the reason
 * `scripts/data/lib/saintIdentity.mjs` gives at length about people: a matcher
 * that is right most of the time produces errors nobody can find. The
 * `--candidates` mode proposes groupings for a human to accept; the default
 * mode reports only what the seed already says.
 *
 * THE TRAP `--candidates` KNOWS ABOUT. The obvious key is the italicised title,
 * and for a book that is right. For a **periodical** it is catastrophic: the
 * italic run in `"Nanakpanthi Saints of Sindh," *The Friday Times*, 13 April
 * 2018` is the newspaper, not the work, and grouping on it would fuse sixteen
 * unrelated Express Tribune articles into one "source". Distinct articles in one
 * paper are distinct works. Candidates from a known periodical are therefore
 * reported separately and never proposed as a grouping.
 *
 *   node scripts/data/measure-source-works.mjs              # report
 *   node scripts/data/measure-source-works.mjs --candidates # propose groupings
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CANDIDATES = process.argv.includes('--candidates');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

if (!existsSync(join(ROOT, 'data/kg-sources.json'))) {
  console.error('[source-works] data/kg-sources.json not found. Run: npm run data:kg');
  process.exit(1);
}
const { sources, attestations } = read('data/kg-sources.json');
const seeds = read('data/kg-seeds.json');
const works = seeds.sourceWorks ?? [];

/** Same normalisation the app's `citationKey` uses, so the two agree. */
const citationKey = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '')
    .trim();

/* Periodicals whose italic run is the publication, not the work. Named rather
   than detected: "is this a newspaper" is not a thing a regex knows. */
const PERIODICALS = [
  'the express tribune',
  'the friday times',
  'dawn',
  'youlin magazine',
  'scroll.in',
  'the news',
  'associated press of pakistan',
  'daily times',
  'the tribune',
  'arab news',
];

const entriesPerSource = new Map();
for (const a of attestations) {
  if (!entriesPerSource.has(a.object)) entriesPerSource.set(a.object, new Set());
  entriesPerSource.get(a.object).add(a.subject);
}
const entryCount = (src) => entriesPerSource.get(src.id)?.size ?? 0;

// ── the seeded works ─────────────────────────────────────────────────────────
/* source id -> work slugs. A LIST, not a slug: a citation may legitimately name
   two works — "Khushwant Singh, *A History of the Sikhs*, and Max Arthur
   Macauliffe, *The Sikh Religion*, on Guru Arjan…" is one citation record
   attesting two books, and forcing it to one would undercount whichever lost. */
const assigned = new Map();
for (const w of works) {
  const needle = citationKey(w.match);
  const excluded = new Set((w.excludeCitations ?? []).map(citationKey));
  for (const src of sources) {
    const key = citationKey(src.name);
    if (!key.includes(needle) || excluded.has(key)) continue;
    if (!assigned.has(src.id)) assigned.set(src.id, []);
    assigned.get(src.id).push(w.slug);
  }
}
const multi = [...assigned.entries()].filter(([, v]) => v.length > 1);

const perWork = new Map();
for (const src of sources) {
  for (const slug of assigned.get(src.id) ?? []) {
    if (!perWork.has(slug)) perWork.set(slug, { records: 0, entries: new Set() });
    const bucket = perWork.get(slug);
    bucket.records += 1;
    for (const e of entriesPerSource.get(src.id) ?? []) bucket.entries.add(e);
  }
}

const totalEntries = new Set(attestations.map((a) => a.subject)).size;
console.log(
  `[source-works] ${sources.length} citation records, ${attestations.length} citations, ` +
    `${totalEntries} entries with a bibliography`,
);
if (works.length === 0) {
  console.log('[source-works] no works declared yet — run with --candidates');
} else {
  console.log(`\n  works declared: ${works.length}\n`);
  const ranked = [...perWork.entries()].sort((a, b) => b[1].entries.size - a[1].entries.size);
  for (const [slug, b] of ranked) {
    const w = works.find((x) => x.slug === slug);
    const pct = ((b.entries.size / totalEntries) * 100).toFixed(0);
    console.log(
      `  ${String(b.entries.size).padStart(3)} entries (${String(pct).padStart(2)}%) across ` +
        `${String(b.records).padStart(2)} citation records — ${w.author ? w.author + ', ' : ''}${w.title}`,
    );
  }
  if (multi.length) {
    console.log(
      `\n  ${multi.length} citation record(s) name more than one declared work, and are ` +
        'counted under each:',
    );
    for (const [id, slugs] of multi) {
      const src = sources.find((x) => x.id === id);
      console.log(`     ${slugs.join(' + ')} — ${src.name.slice(0, 84)}`);
    }
  }

  const biggest = ranked[0];
  if (biggest) {
    const w = works.find((x) => x.slug === biggest[0]);
    console.log(
      `\n  The archive's single heaviest dependency is ${w.title}: ` +
        `${biggest[1].entries.size} of ${totalEntries} entries lean on it, and the ` +
        `citation index shows it as ${biggest[1].records} separate sources.`,
    );
  }
}

// ── candidate groupings, for a human ─────────────────────────────────────────
if (CANDIDATES) {
  const byTitle = new Map();
  for (const src of sources) {
    const m = /\*([^*]{6,})\*/.exec(src.name);
    if (!m) continue;
    const title = citationKey(m[1]);
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title).push(src);
  }
  const proposals = [];
  const periodicals = [];
  for (const [title, group] of byTitle) {
    if (group.length < 2) continue;
    const entries = new Set(group.flatMap((s) => [...(entriesPerSource.get(s.id) ?? [])]));
    const row = { title, records: group.length, entries: entries.size, names: group.map((s) => s.name) };
    (PERIODICALS.some((p) => title.includes(p)) ? periodicals : proposals).push(row);
  }
  proposals.sort((a, b) => b.entries - a.entries);
  console.log(`\n  ── candidate works (${proposals.length}), most-cited first ──`);
  for (const p of proposals) {
    const declared = works.some((w) => citationKey(p.title).includes(citationKey(w.match)));
    console.log(
      `\n  ${declared ? '[declared]' : '[  NEW   ]'} ${p.entries} entries / ${p.records} records — ${p.title}`,
    );
    if (!declared) p.names.forEach((n) => console.log(`        · ${n.slice(0, 108)}`));
  }
  console.log(
    `\n  ── NOT proposed: ${periodicals.length} periodical title(s) ──\n` +
      '     The italic run here is the publication, not the work. Sixteen Express\n' +
      '     Tribune articles are sixteen sources, and fusing them would be a worse\n' +
      '     error than the one this script exists to measure.',
  );
  periodicals
    .sort((a, b) => b.records - a.records)
    .forEach((p) => console.log(`     ${String(p.records).padStart(2)} records — ${p.title}`));
}
