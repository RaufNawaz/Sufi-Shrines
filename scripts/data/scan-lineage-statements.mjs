#!/usr/bin/env node
/**
 * scan-lineage-statements.mjs — every sentence in the corpus that states a
 * teaching or succession tie, and whether the graph already carries it.
 *
 * The sibling of `scan-kin-statements.mjs`, written for the same reason and
 * after the same discovery. The kin layer turned out to be reading a small
 * fraction of the sentences that state a family tie, and nothing in the repo
 * could have said so, because the pass that built it could not describe its own
 * coverage (HANDOVER §9.161). The obvious next question was whether the
 * *lineage* layer — 86 edges, the archive's core subject — had the same shape.
 * This script is how that question gets asked, and re-asked after every build.
 *
 * WHY THIS LAYER DESERVES MORE CARE THAN KIN, NOT LESS. A *silsila* is the
 * thing this archive is about, and the vocabulary around it is treacherous in a
 * way kinship words are not:
 *
 *  - **"pir-brother" is not a brother and not a teacher.** It is a fellow
 *    disciple of one master. The Miran Hussain Zanjani entry has one, beside a
 *    real blood brother, and they are different men.
 *  - **`successor_of` and `disciple_of` are different claims**, and one sentence
 *    often carries both ("his son and successor"), one, or neither. The corpus
 *    also uses *sajjada-nashin* for an office that is sometimes hereditary and
 *    sometimes not — an administrative succession is not initiatic descent.
 *  - **"Uwaisi"** describes a saint who names NO living guide. A sentence about
 *    an Uwaisi master is a statement that a teaching tie does not exist, and
 *    Kaka Sahib's entry says exactly that.
 *  - **"trained under" and "studied under"** may be scholarly education rather
 *    than initiation, which is a different relation the graph does not model.
 *
 * So this script is, even more than its sibling, a **reading list**. It emits
 * no edges, guesses no direction, and resolves no name.
 *
 * WHERE THE VERDICTS GO. Accepted ties go to `data/kg-seeds.json#lineageRelations`
 * (human-decided) or `data/kg-lineage-proposals.json#proposals` (extraction, with
 * a confidence tier). **Rejections are recorded too**, in that file's `rejected`
 * and `explicitNonRelations` arrays — a sentence that looks like a tie and is
 * not is worth writing down once, or the next pass re-reads it forever.
 *
 *   node scripts/data/scan-lineage-statements.mjs         # uncovered only
 *   node scripts/data/scan-lineage-statements.mjs --all   # every one
 *   node scripts/data/scan-lineage-statements.mjs --json
 */
import { loadCorpus, scanCorpus, figureNameSet, report, norm } from './lib/sentenceScan.mjs';
import { buildSlugs } from './lib/slugs.mjs';

const { rows, kg, seeds, readJson } = loadCorpus();
const proposals = readJson('data/kg-lineage-proposals.json');
const shrineFigures = readJson('data/kg-shrine-figures.json');

/* Words the corpus actually uses for transmission and succession. `khalifa` and
   `murid` are here because the entries use them untranslated, in italics, and a
   scan that only knew English would miss the passages closest to the sources. */
const LINEAGE_WORDS = [
  'disciple', 'disciples', 'murid', 'khalifa', 'khalifas', 'initiated', 'initiation',
  'succeeded', 'successor', 'sajjada-nashin', 'sajjada nashin', 'gaddi', 'teacher',
  'murshid', 'spiritual guide', 'spiritual heir', 'trained under', 'studied under',
  'instructed by', 'bayat', "bai'at", 'pir of', 'uwaisi',
];

/* Everything the graph already asserts about transmission — the built edges,
   the human seeds, and the extraction proposals, since a sentence accounted for
   by a pending proposal is not an unread sentence. */
const byId = new Map((kg.saints ?? []).map((s) => [s.id, s]));
const edges = [
  ...(kg.relations ?? [])
    .filter((r) => r.type === 'disciple_of' || r.type === 'successor_of')
    .map((r) => ({
      a: norm(byId.get(r.subject)?.name ?? ''),
      b: norm(byId.get(r.object)?.name ?? ''),
      label: `${byId.get(r.subject)?.slug ?? '?'} ${r.type} ${byId.get(r.object)?.slug ?? '?'}`,
      quote: r.quote,
    })),
  ...(proposals.proposals ?? []).map((p) => ({
    a: norm(p.subjectName ?? ''),
    b: norm(p.objectName ?? ''),
    label: `proposal: ${p.subjectSlug} ${p.relation} ${p.objectSlug}`,
    quote: p.quote,
  })),
  ...(seeds.lineageRelations ?? []).map((l) => ({
    a: norm(byId.get(`saint:${l.subjectSlug}`)?.name ?? l.subjectSlug),
    b: norm(byId.get(`saint:${l.objectSlug}`)?.name ?? l.objectSlug),
    label: `seed: ${l.subjectSlug} ${l.relation} ${l.objectSlug}`,
    quote: l.quote,
  })),
];

/* The figures a row is about, so a sentence that says "he became a disciple of
   X" can be matched against an edge whose subject the sentence never names.
   Without this the report is dominated by ties it already carries — see the
   note on `scanCorpus`. */
const bySlug = new Map((kg.saints ?? []).map((s) => [s.slug, s]));
/* `buildSlugs` takes the WHOLE row list and returns one slug per row in order —
   it disambiguates collisions, so a slug cannot be derived from one row alone. */
const slugByRow = new Map(buildSlugs(rows).map((slug, i) => [rows[i], slug]));
const rowSubjects = (row) =>
  (shrineFigures[slugByRow.get(row)] ?? []).map((slug) => bySlug.get(slug)?.name).filter(Boolean);

/* Sentences a human has already read and ruled out. `explicitNonRelations` is
   where the archive records "this looks like a tie and is not" — an Uwaisi
   saint who names no living guide, a court relationship, a contemporary who was
   not a teacher — and it has carried the verbatim sentence since it was
   written, which is exactly what this scan needs to stop re-proposing it. */
const nonTies = (proposals.explicitNonRelations ?? []).map((n) => ({
  quote: n.quote,
  why: `${n.subjectName} ↛ ${n.objectName}`,
}));

const findings = scanCorpus({
  rows,
  wordRe: new RegExp(`\\b(${LINEAGE_WORDS.join('|')})\\b`, 'i'),
  figureNames: figureNameSet(kg),
  edges,
  rowSubjects,
  nonTies,
});

report({
  findings,
  all: process.argv.includes('--all'),
  json: process.argv.includes('--json'),
  rowCount: rows.length,
  tag: 'lineage',
});
