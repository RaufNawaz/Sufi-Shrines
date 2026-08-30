#!/usr/bin/env node
/**
 * scan-kin-statements.mjs — every sentence in the corpus that states a family
 * tie, and whether the kinship layer already carries it.
 *
 * WHY THIS EXISTS AS AN INSTRUMENT RATHER THAN A GREP. The kin layer has been
 * built by three passes now, and each pass was a one-off search whose coverage
 * nobody could restate afterwards. The first (§9.123) read
 * `kg-lineage-proposals.json#familyRelations` and produced 28 edges. The second
 * (§9.160) hand-scanned "shrines that pass had not touched" and found six more.
 * The third found two the second had missed **inside rows it had already
 * read** — Nau Nihal Singh, named as a grandson in the very sentence after one
 * of its own picks, and Kaka Sahib's father Bahadur Baba, who was already a
 * node in the graph.
 *
 * A pass whose misses are inside the rows it read is not a pass, it is a
 * sample. So the question this script answers is not "find me some ties", it is
 * **"here is every sentence in the archive that uses a kinship word, and here
 * is which ones the layer already accounts for"** — a list a human can work to
 * the end of, and re-run after the next data build to see only what is new.
 *
 * WHAT IT DOES NOT DO, AND WILL NOT. It does not emit edges. It does not guess
 * a slug, a direction, or a role. Every kin edge in `kg-seeds.json` has a
 * human-decided subject, object, kinType and role pair, because the direction
 * and the paternal/maternal side are exactly the things a sentence often does
 * not state and a matcher would invent (RULE 2). Urdu makes that concrete:
 * دادا and نانا are different words, and a script confident enough to pick one
 * is confident about something the corpus did not say.
 *
 * It reports sentences. A human reads them and writes the seed.
 *
 * COVERAGE IS REPORTED, NOT ASSERTED. A sentence counts as covered when both
 * ends of some existing edge are named in it. That is a weak test on purpose:
 * it is here to shrink the reading pile, and a sentence wrongly marked covered
 * is a miss, so `--all` prints everything and is what a full audit should use.
 *
 *   node scripts/data/scan-kin-statements.mjs           # uncovered only
 *   node scripts/data/scan-kin-statements.mjs --all     # every kin sentence
 *   node scripts/data/scan-kin-statements.mjs --json
 */
import { loadCorpus, scanCorpus, figureNameSet, report, norm } from './lib/sentenceScan.mjs';

const { rows, kg, seeds } = loadCorpus();

/* The kinship words the corpus actually uses. Deliberately NOT including
   "descendants" plural on its own — "under the care of his descendants" names
   nobody and is not a tie, and the noise it adds is what makes a reading pile
   get abandoned halfway. "descendant" singular stays: it is how six of the
   existing edges are worded. */
const KIN_WORDS = [
  'son', 'sons', 'daughter', 'daughters', 'father', 'mother', 'brother', 'sister',
  'grandson', 'granddaughter', 'grandfather', 'grandmother', 'nephew', 'niece',
  'uncle', 'aunt', 'cousin', 'wife', 'husband', 'widow', 'son-in-law',
  'father-in-law', 'descendant', 'forebear', 'forefathers', 'ancestor',
];

/* Sentences already read and deliberately not made edges — idiom ("a son of
   Peshawar"), metaphor ("the father of the Punjabi kafi", which this corpus
   produces constantly because it writes about poets), and a few true ties the
   archive chooses not to model. Without this the next pass re-reads every
   rejection the last one made. */
const nonTies = (seeds.kinAdjudicated ?? []).map((n) => ({
  quote: n.quote,
  why: `${n.subjectName} ↛ ${n.objectName} (${n.kind})`,
}));

const findings = scanCorpus({
  rows,
  wordRe: new RegExp(`\\b(${KIN_WORDS.join('|')})\\b`, 'i'),
  figureNames: figureNameSet(kg),
  nonTies,
  edges: (seeds.familyRelations ?? []).map((f) => ({
    a: norm(f.subjectName ?? ''),
    b: norm(f.objectName ?? ''),
    label: `${norm(f.subjectName ?? '').toLowerCase()} ${f.kinType} ${norm(f.objectName ?? '').toLowerCase()}`,
  })),
});

report({
  findings,
  all: process.argv.includes('--all'),
  json: process.argv.includes('--json'),
  rowCount: rows.length,
  tag: 'kin',
});
