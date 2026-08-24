#!/usr/bin/env node
/**
 * build-review-worksheet.mjs — turns the 235 machine-extracted KG proposals into
 * one CSV a human can actually review.
 *
 * The proposals are not stuck in a queue: `build-kg.mjs` already merges them
 * into `data/kg.json` marked `reviewed: false`, and the site renders them with an
 * "unreviewed" badge and the source quote beside them. That is the honest way to
 * publish a machine reading. What is stuck is the *upgrade* — 80 of 86
 * teacher-disciple edges, 44 of 64 order memberships and 105 date proposals are
 * one human judgement away from being reviewed claims, and nothing in this
 * repository made that judgement possible to record. A reviewer's only option was
 * to read three JSON files of 100+ objects each and hand-edit `data/kg-seeds.json`.
 *
 * So: one queue, ordered by where a verdict changes the most, with the claim and
 * the sentence it came from on the same row. This is the same shape RULE 3
 * prescribes for the sheet — produce a CSV for a human, never write the
 * production store yourself — applied one step earlier in the pipeline.
 *
 * What this deliberately does not do is decide anything. `verify-kg-proposals.mjs`
 * already proves nothing is fabricated: every quote is a byte-exact substring of
 * the source it names, and every year in a date proposal occurs literally in that
 * quote. What it cannot prove — and what this worksheet exists to collect — is
 * whether the quote *means* what the proposal says, whether two similarly-named
 * men are one man, and which side of a contradiction is right. Those are the three
 * things `docs/allo_mahar_resolution.md` is about: a confident 700-word biography
 * of the wrong person, produced from real sentences about a real saint.
 *
 * Ordering, because a reviewer's attention is the scarce resource here:
 *
 *   1  the extractor's own flagged conflicts — a date that disagrees with the
 *      sheet's column, a silsila that contradicts an existing seed, two figures
 *      whose names collide. Review changes the answer here.
 *   2  anything the extractor hedged (confidence below 0.9). Review confirms or
 *      drops it.
 *   3  the rest. Review is a rubber stamp, and is still the difference between
 *      "unreviewed" and "reviewed" on the page.
 *
 * Usage:  node scripts/data/build-review-worksheet.mjs
 *         node scripts/data/build-review-worksheet.mjs --check
 *
 * `--check` writes nothing and fails if the worksheet on disk is missing a
 * proposal, which is the failure mode that matters: a review queue that quietly
 * drops 12 rows reads as a finished review.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'review', 'kg-review.csv');
const check = process.argv.includes('--check');

/**
 * A short digest of the evidence, appended to every row id.
 *
 * The slug alone is not unique. Guru Nanak has two date proposals — one read out
 * of a birth sentence, one out of a death sentence — and five saints have two
 * order proposals apiece for the same parent order from different sources. Keyed
 * on the slug, those collided: duplicate rows in the queue, and a verdict typed
 * against one of them carried onto the other on the next regeneration. The
 * worksheet test caught it, which is the only reason this comment exists.
 *
 * The digest is over the quote, so it is stable across regenerations and changes
 * exactly when the sentence behind the claim changes — which is precisely when a
 * recorded verdict should stop being carried forward, because it was a verdict
 * about different evidence. */
const evidenceKey = (quote) =>
  createHash('sha1')
    .update(quote ?? '')
    .digest('hex')
    .slice(0, 8);

const read = (name) => JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));

const lineage = read('kg-lineage-proposals.json');
const orders = read('kg-order-proposals.json');
const dates = read('kg-saint-dates-proposals.json');

/**
 * The buckets each extractor put its own doubts in. A proposal named in one of
 * these is a proposal where a human's answer differs from the machine's, which is
 * the whole point of the queue — so they set priority 1 and the bucket name
 * travels with the row as `flags`.
 */
const CONFLICT_BUCKETS = {
  lineage: ['nameVariantsSeen', 'explicitNonRelations'],
  orders: ['contradictions', 'disagreesWithExistingSeed', 'newOrdersNeeded', 'proseValuedSilsila'],
  dates: ['disputedDates', 'disagreesWithColumn', 'subjectMismatch', 'nameCollisions'],
};

/**
 * Slugs named by any conflict bucket, per kind.
 *
 * The buckets were written independently and name their subject six different
 * ways — `saintSlug`, `shrineSlug`, `canonicalSlug`, `proposedSlug`,
 * `subjectSlug`/`objectSlug`, and a plain `slugs` array where the finding is
 * that two nodes are one person. The first version of this knew four of them
 * and silently found nothing in `nameVariantsSeen`, `newOrdersNeeded`,
 * `proseValuedSilsila`, `subjectMismatch` or `nameCollisions` — 33 findings that
 * would have been filed as priority 3 "rubber stamp" while being precisely the
 * rows where a human's answer differs from the machine's. Under-flagging a
 * review queue is worse than not building one, so `SLUG_KEYS` is exhaustive and
 * `reviewWorksheet.test.ts` fails if a bucket contributes no flags at all.
 */
const SLUG_KEYS = [
  'saintSlug',
  'subjectSlug',
  'objectSlug',
  'slug',
  'shrineSlug',
  'canonicalSlug',
  'proposedSlug',
];

function flaggedSlugs(doc, buckets) {
  const flags = new Map();
  for (const bucket of buckets) {
    const value = doc[bucket];
    if (!value) continue;
    const candidates = Array.isArray(value) ? value : Object.entries(value).flat();
    for (const item of candidates) {
      if (typeof item === 'string') {
        addFlag(flags, item, bucket);
        continue;
      }
      if (item && typeof item === 'object') {
        for (const key of SLUG_KEYS) {
          if (typeof item[key] === 'string') addFlag(flags, item[key], bucket);
        }
        // `nameCollisions` states its finding as a list of slugs that are
        // probably one person; every one of them needs the flag.
        if (Array.isArray(item.slugs)) {
          for (const slug of item.slugs) {
            if (typeof slug === 'string') addFlag(flags, slug, bucket);
          }
        }
      }
    }
  }
  return flags;
}

function addFlag(map, slug, bucket) {
  const existing = map.get(slug);
  if (existing) existing.add(bucket);
  else map.set(slug, new Set([bucket]));
}

/** Newlines are kept, not collapsed.
 *
 * The tempting move is to flatten a quote to one line so the CSV opens tidily in
 * Sheets — and flattening a quote is exactly the failure RULE 3 warns about for
 * Descriptions, one directory over. A quote whose whitespace has been "tidied" no
 * longer matches the source `verify-kg-proposals.mjs` checks it against, so the
 * worksheet would disagree with the gate that validates it. Papa quotes them
 * correctly; `reviewWorksheet.test.ts` proves the round-trip is byte-exact. */
const verbatim = (value) => (value == null ? '' : String(value));

const rows = [];

for (const p of lineage.proposals) {
  const flags = flaggedSlugs(lineage, CONFLICT_BUCKETS.lineage);
  const own = [...(flags.get(p.subjectSlug) ?? []), ...(flags.get(p.objectSlug) ?? [])];
  rows.push({
    id: `lineage:${p.subjectSlug}:${p.relation}:${p.objectSlug}:${evidenceKey(p.quote)}`,
    kind: 'lineage',
    priority: own.length ? 1 : p.confidence < 0.9 ? 2 : 3,
    claim: `${p.subjectName} — ${p.relation.replace('_', ' ')} — ${p.objectName}`,
    as_recorded: '',
    confidence: p.confidence,
    flags: [...new Set(own)].join(' '),
    is_new: [p.subjectIsNew && 'subject', p.objectIsNew && 'object'].filter(Boolean).join(' '),
    quote: verbatim(p.quote),
    source: verbatim(p.source),
    notes: verbatim(p.notes),
    verdict: '',
    reviewer_note: '',
  });
}

for (const p of orders.proposals) {
  const flags = flaggedSlugs(orders, CONFLICT_BUCKETS.orders);
  const own = [...(flags.get(p.saintSlug) ?? [])];
  const parents = p.parentOrders?.length ? p.parentOrders.join(' + ') : p.parentOrder;
  rows.push({
    id: `order:${p.saintSlug}:${parents}:${evidenceKey(p.quote)}`,
    kind: 'order',
    priority: own.length ? 1 : p.confidence < 0.9 ? 2 : 3,
    claim: `${p.saintName} — belongs to — ${parents}${p.branch ? ` (branch: ${p.branch})` : ''}`,
    as_recorded: verbatim(p.asRecorded),
    confidence: p.confidence,
    flags: [...new Set(own)].join(' '),
    is_new: p.saintIsNew ? 'saint' : '',
    quote: verbatim(p.quote),
    source: verbatim(p.source),
    notes: verbatim(p.notes),
    verdict: '',
    reviewer_note: '',
  });
}

for (const p of dates.proposals) {
  const flags = flaggedSlugs(dates, CONFLICT_BUCKETS.dates);
  const own = [...(flags.get(p.saintSlug) ?? [])];
  const span = [p.born && `b. ${p.born}`, p.died && `d. ${p.died}`, p.floruit && `fl. ${p.floruit}`]
    .filter(Boolean)
    .join(', ');
  rows.push({
    id: `dates:${p.saintSlug}:${evidenceKey(p.quote)}`,
    kind: 'dates',
    priority: own.length ? 1 : p.confidence < 0.9 ? 2 : 3,
    // Dates stay exactly as the source expresses them, calendar included — a
    // normalised date is a different claim (RULE 2).
    claim: `${p.saintName} — ${span || 'no date'}${p.calendar ? ` [${p.calendar}]` : ''}`,
    as_recorded: verbatim(p.precision),
    confidence: p.confidence,
    flags: [...new Set(own)].join(' '),
    is_new: p.saintIsNew ? 'saint' : '',
    quote: verbatim(p.quote),
    source: verbatim(p.source),
    notes: verbatim(p.notes),
    verdict: '',
    reviewer_note: '',
  });
}

/*
 * Findings that are not proposals, and cannot be.
 *
 * Four buckets record the *absence* of a claim rather than a claim:
 * `explicitNonRelations` ("the sources say these two were NOT master and
 * disciple"), `subjectMismatch` ("this row's only dated figure is not its
 * recorded figure, so no dates are proposed"), `newOrdersNeeded` ("the corpus
 * names a Rashidi order with no parent — a human must decide the slug"), and
 * `proseValuedSilsila` ("the silsila cell is a sentence that declines to name an
 * order"). None of them flag a proposal row, because there is no proposal.
 *
 * They are still the archive's sharpest open questions — `subjectMismatch` is the
 * allo-mahar misidentification, the very case docs/allo_mahar_resolution.md was
 * written about. Leaving them out would let the worksheet claim to be the review
 * queue while fourteen of them sat outside it, which is the "no silent caps" rule
 * applied to a review: what is dropped has to be said out loud, and the honest
 * way to say it is to put them in the queue.
 *
 * `verdict` on these is not accept/reject — there is nothing to accept. It is a
 * place to record the resolution, which for several of them will be "needs a
 * field visit".
 */
const FINDING_BUCKETS = [
  ['lineage', lineage, ['explicitNonRelations']],
  ['order', orders, ['newOrdersNeeded', 'proseValuedSilsila']],
  ['dates', dates, ['subjectMismatch']],
];

let findingCount = 0;
for (const [kind, doc, buckets] of FINDING_BUCKETS) {
  for (const bucket of buckets) {
    const items = doc[bucket];
    if (!Array.isArray(items)) continue;
    for (const [i, item] of items.entries()) {
      const subject =
        item.canonicalSlug ??
        item.proposedSlug ??
        item.saintSlug ??
        item.shrineSlug ??
        item.subjectSlug ??
        (Array.isArray(item.slugs) ? item.slugs.join(' + ') : `${bucket}-${i}`);
      /* The bucket's own explanation, under whichever key it chose. Verbatim —
         these sentences are the finding. */
      const why =
        item.why ??
        item.whyNotABranchOfTheFive ??
        item.whyNotATaxonomyNode ??
        item.reason ??
        item.note ??
        '';
      rows.push({
        id: `finding:${kind}:${bucket}:${subject}`,
        kind: `finding/${kind}`,
        priority: 1,
        claim: `${subject} — ${bucket}`,
        as_recorded: verbatim(item.asRecorded ?? item.principalFigure ?? ''),
        confidence: '',
        flags: bucket,
        is_new: '',
        quote: verbatim(
          Array.isArray(item.quotes) ? item.quotes.join('\n\n') : (item.quote ?? ''),
        ),
        source: verbatim(item.source ?? item.shrineSlug ?? ''),
        notes: verbatim(why),
        verdict: '',
        reviewer_note: '',
      });
      findingCount += 1;
    }
  }
}

rows.sort(
  (a, b) =>
    a.priority - b.priority ||
    a.kind.localeCompare(b.kind) ||
    Number(b.confidence) - Number(a.confidence) ||
    a.id.localeCompare(b.id),
);

const COLUMNS = [
  'id',
  'kind',
  'priority',
  'claim',
  'as_recorded',
  'confidence',
  'flags',
  'is_new',
  'quote',
  'source',
  'notes',
  'verdict',
  'reviewer_note',
];

const expected = rows.length;
const proposalTotal =
  lineage.proposals.length + orders.proposals.length + dates.proposals.length;

if (expected !== proposalTotal + findingCount) {
  console.error(
    `[review-worksheet] FAILED — built ${expected} rows from ${proposalTotal} proposal(s) ` +
      `and ${findingCount} finding(s). A review queue that silently drops rows reads as a ` +
      'finished review.',
  );
  process.exit(1);
}

if (check) {
  if (!existsSync(OUT)) {
    console.error(
      '[review-worksheet] FAILED — data/review/kg-review.csv is missing. ' +
        'Run: npm run data:review',
    );
    process.exit(1);
  }
  const onDisk = Papa.parse(readFileSync(OUT, 'utf8'), { header: true, skipEmptyLines: true });
  const ids = new Set(onDisk.data.map((r) => r.id));
  const missing = rows.filter((r) => !ids.has(r.id)).map((r) => r.id);
  if (missing.length) {
    console.error(
      `[review-worksheet] FAILED — ${missing.length} proposal(s) are not in the worksheet:\n  ` +
        missing.slice(0, 10).join('\n  ') +
        (missing.length > 10 ? `\n  … and ${missing.length - 10} more` : '') +
        '\nRun: npm run data:review (verdicts already recorded are preserved by id).',
    );
    process.exit(1);
  }
  const withVerdict = onDisk.data.filter((r) => (r.verdict ?? '').trim()).length;
  console.log(
    `[review-worksheet] OK — ${ids.size} row(s) on disk cover all ${proposalTotal} proposal(s) ` +
      `and ${findingCount} finding(s); ${withVerdict} carry a verdict.`,
  );
  process.exit(0);
}

/* Verdicts already recorded are carried across by id, so regenerating after a
   dataset refresh does not throw away a reviewer's afternoon. */
let carried = 0;
if (existsSync(OUT)) {
  const previous = Papa.parse(readFileSync(OUT, 'utf8'), { header: true, skipEmptyLines: true });
  const byId = new Map(previous.data.map((r) => [r.id, r]));
  for (const row of rows) {
    const old = byId.get(row.id);
    if (old && ((old.verdict ?? '').trim() || (old.reviewer_note ?? '').trim())) {
      row.verdict = old.verdict ?? '';
      row.reviewer_note = old.reviewer_note ?? '';
      carried += 1;
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Papa.unparse(rows, { header: true, columns: COLUMNS, newline: '\n' }), 'utf8');

const byPriority = rows.reduce((acc, r) => ((acc[r.priority] = (acc[r.priority] ?? 0) + 1), acc), {});
console.log(
  `[review-worksheet] wrote ${rows.length} row(s) to data/review/kg-review.csv ` +
    `(${proposalTotal} proposal(s) + ${findingCount} finding(s) that are not proposals)`,
);
console.log(
  `[review-worksheet]   priority 1 (flagged conflicts): ${byPriority[1] ?? 0} · ` +
    `2 (hedged, <0.9): ${byPriority[2] ?? 0} · 3 (confirm): ${byPriority[3] ?? 0}`,
);
if (carried) console.log(`[review-worksheet]   carried ${carried} existing verdict(s) across by id`);
console.log('[review-worksheet]   see docs/KG_REVIEW_WORKFLOW.md');
