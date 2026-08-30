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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rows = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8')).rows;
const seeds = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-seeds.json'), 'utf8'));
const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));

const ALL = process.argv.includes('--all');
const JSON_OUT = process.argv.includes('--json');

/* The kinship words the corpus actually uses. Deliberately NOT including
   "descendants" plural on its own — "under the care of his descendants" names
   nobody and is not a tie, and the noise it adds is what makes a reading pile
   get abandoned halfway. "descendant" singular stays: it is how six of the
   existing edges are worded. */
const KIN_WORDS = [
  'son',
  'sons',
  'daughter',
  'daughters',
  'father',
  'mother',
  'brother',
  'sister',
  'grandson',
  'granddaughter',
  'grandfather',
  'grandmother',
  'nephew',
  'niece',
  'uncle',
  'aunt',
  'cousin',
  'wife',
  'husband',
  'widow',
  'son-in-law',
  'father-in-law',
  'descendant',
  'forebear',
  'forefathers',
  'ancestor',
];
const KIN_RE = new RegExp(`\\b(${KIN_WORDS.join('|')})\\b`, 'i');

/* A capitalised run of two or more words, which is what a person is called in
   this corpus. One word is far too noisy — every sentence has a place name and
   half have a month. */
const NAME_RE = /\b([A-Z][\p{L}'’-]+(?:[ -](?:ud|ul|al|e|i|bin|of|the)[ -]?)?(?:\s+[A-Z][\p{L}'’-]+)+)/gu;

/* Names the corpus is full of that are never a kin counterpart in these
   sentences: places, institutions, sources, and the honorific-only forms. They
   are filtered from the *extracted names* line only — never from the sentence,
   which is always printed whole. */
const NOT_A_PERSON =
  /^(The |A |An |In |His |Her |Their |It |This |That )|^(Punjab|Lahore|Multan|Sindh|Karachi|Islamabad|Pakistan|India|Delhi|Uch|Nowshera|Peshawar|Khyber|Ramazan|Muharram|January|February|March|April|May|June|July|August|September|October|November|December)\b/;

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Every name the graph knows, lowercased, for the "already a figure" mark. */
const figureNames = new Map();
for (const s of kg.saints) {
  for (const n of [s.name, ...(s.altNames ?? [])]) {
    if (n) figureNames.set(norm(n).toLowerCase(), s.slug);
  }
}

/** The name pairs the layer already asserts, for the coverage test. */
const edges = (seeds.familyRelations ?? []).map((f) => ({
  a: norm(f.subjectName ?? '').toLowerCase(),
  b: norm(f.objectName ?? '').toLowerCase(),
  type: f.kinType,
}));

/* A name is "in" a sentence if the sentence contains it, or contains the
   distinctive tail of it — "Makhdoom Jahaniyan Jahangasht" is written a dozen
   ways and the last two words carry the identity. */
function mentions(sentence, name) {
  if (!name) return false;
  const low = sentence.toLowerCase();
  if (low.includes(name)) return true;
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) return low.includes(words.slice(-2).join(' '));
  return false;
}

const findings = [];
for (const row of rows) {
  const name = row.Name ?? '(unnamed row)';
  const text = Object.entries(row)
    .filter(([, v]) => typeof v === 'string' && v.length > 60)
    .map(([, v]) => v)
    .join('\n');
  if (!text) continue;

  for (const raw of text.split(/(?<=[.!?])\s+/)) {
    const sentence = norm(raw);
    if (!sentence || !KIN_RE.test(sentence)) continue;

    const names = [...new Set([...sentence.matchAll(NAME_RE)].map((m) => norm(m[1])))].filter(
      (n) => !NOT_A_PERSON.test(n),
    );

    const covered = edges.filter((e) => mentions(sentence, e.a) && mentions(sentence, e.b));
    const word = sentence.match(KIN_RE)[1].toLowerCase();

    findings.push({
      row: name,
      kinWord: word,
      sentence,
      names,
      knownFigures: names.filter((n) => figureNames.has(n.toLowerCase())),
      coveredBy: covered.map((e) => `${e.a} ${e.type} ${e.b}`),
    });
  }
}

const uncovered = findings.filter((f) => f.coveredBy.length === 0);
const shown = ALL ? findings : uncovered;

if (JSON_OUT) {
  console.log(JSON.stringify({ total: findings.length, uncovered: uncovered.length, findings: shown }, null, 2));
} else {
  let lastRow = null;
  for (const f of shown) {
    if (f.row !== lastRow) {
      console.log(`\n########## ${f.row}`);
      lastRow = f.row;
    }
    console.log(`  [${f.kinWord}] ${f.sentence}`);
    if (f.names.length) console.log(`      names: ${f.names.join(' · ')}`);
    if (f.knownFigures.length) console.log(`      already figures: ${f.knownFigures.join(' · ')}`);
    if (f.coveredBy.length) console.log(`      covered by: ${f.coveredBy.join(' ; ')}`);
  }
  console.log(
    `\n${findings.length} kin sentence(s) across ${rows.length} rows; ` +
      `${findings.length - uncovered.length} covered by an existing edge, ${uncovered.length} not.`,
  );
}
