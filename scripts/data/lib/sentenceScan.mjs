/**
 * The machinery behind the corpus sentence scanners.
 *
 * Two scripts read every sentence in `data/shrines.json` looking for a claim of
 * a particular kind — `scan-kin-statements.mjs` for family, and
 * `scan-lineage-statements.mjs` for teaching and succession. Everything except
 * *which words to look for* and *which edges already account for a sentence* is
 * identical between them, and the sentence splitter in particular is the sort of
 * thing that gets fixed in one copy and not the other.
 *
 * WHY THESE SCANNERS EXIST AT ALL, since a reader of one of them will want the
 * short version: both relation layers were built by extraction passes that read
 * *some* of the corpus and could not afterwards say which parts. The kin pass
 * missed ties inside rows it had already read (HANDOVER §9.161). A pass whose
 * misses are inside its own rows is a sample, not a pass — so the scanners
 * enumerate the whole corpus instead, and a human works to the end of the list.
 *
 * WHAT THEY DO NOT DO. They never emit an edge. Direction, role and slug are
 * human decisions, and for this corpus that is not fastidiousness: the direction
 * of a teaching tie is often left implicit, and Urdu forces distinctions
 * (دادا vs نانا) that the English sentence declines to make. A matcher that is
 * right most of the time produces errors nobody can find — the argument
 * `scripts/data/lib/saintIdentity.mjs` already makes at length about people.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export function loadCorpus() {
  return {
    rows: JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8')).rows,
    kg: JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8')),
    seeds: JSON.parse(readFileSync(join(ROOT, 'data', 'kg-seeds.json'), 'utf8')),
    readJson: (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8')),
  };
}

/* A capitalised run of two or more words, which is what a person is called in
   this corpus. One word is far too noisy — every sentence has a place name and
   half of them have a month. */
const NAME_RE =
  /\b([A-Z][\p{L}'’-]+(?:[ -](?:ud|ul|al|e|i|bin|of|the)[ -]?)?(?:\s+[A-Z][\p{L}'’-]+)+)/gu;

/* Names this corpus is full of that are never the counterpart of a claim:
   places, months, institutions, and sentence-initial pronouns swept up by the
   capitalisation rule. Filtered from the *extracted names* line only — the
   sentence is always printed whole, so nothing is hidden by this list. */
const NOT_A_PERSON =
  /^(The |A |An |In |His |Her |Their |It |This |That )|^(Punjab|Lahore|Multan|Sindh|Karachi|Islamabad|Pakistan|India|Delhi|Uch|Nowshera|Peshawar|Khyber|Ramazan|Muharram|January|February|March|April|May|June|July|August|September|October|November|December)\b/;

export function extractNames(sentence) {
  return [...new Set([...sentence.matchAll(NAME_RE)].map((m) => norm(m[1])))].filter(
    (n) => !NOT_A_PERSON.test(n),
  );
}

/** The long text fields of a row, which is where the archive's prose lives. */
export function rowText(row) {
  return Object.entries(row)
    .filter(([, v]) => typeof v === 'string' && v.length > 60)
    .map(([, v]) => v)
    .join('\n');
}

export function sentencesOf(text) {
  return text.split(/(?<=[.!?])\s+/).map(norm).filter(Boolean);
}

/**
 * Is `name` in this sentence?
 *
 * Falls back to the last two words, because a figure is written a dozen ways
 * across the corpus and the tail usually carries the identity —
 * "Makhdoom Jahaniyan Jahangasht" and "Sayyid Jalaluddin known as Makhdoom
 * Jahaniyan Jahangasht" are the same man. Never a prefix match: "Khwaja
 * Muhammad Qasim" and "Khwaja Muhammad Qasim Sadiq" are a master and his pupil.
 */
export function mentions(sentence, name) {
  if (!name) return false;
  const low = sentence.toLowerCase();
  const n = String(name).toLowerCase();
  if (low.includes(n)) return true;
  const words = n.split(' ').filter(Boolean);
  return words.length >= 2 && low.includes(words.slice(-2).join(' '));
}

/**
 * Walk the corpus and return one finding per sentence matching `wordRe`.
 *
 * `edges` is `[{ a, b, label }]` of what the graph already asserts. A sentence
 * counts as covered when both ends of some edge are accounted for — either
 * NAMED in the sentence, or supplied by `rowSubjects`.
 *
 * WHY `rowSubjects` EXISTS, AND WHAT IT COST TO LEARN. The first version of
 * this test required both ends to be named outright. On kinship that was merely
 * conservative. On lineage it was **actively misleading**: the corpus writes
 * about the figure whose entry it is in the third person, so the archetypal
 * sentence is "he became a disciple (*mureed*) of Hazrat Shah Sikandar" — one
 * name, not two. The scan reported 163 of 177 lineage sentences as uncovered,
 * which reads as a layer that had barely been built; on checking the first
 * thirty by hand, almost every one was **already an edge**. The number was an
 * artefact of the instrument, and it was one adjudication pass away from being
 * acted on.
 *
 * So a sentence inside a shrine's row may use that shrine's own figures as the
 * unnamed end. That is a heuristic and it is allowed to be, because this test's
 * only job is to shrink a reading pile — but it is the difference between a
 * report that says "look at these 163" and one that says what is actually left.
 *
 * The bias is deliberately one-directional and stays that way: a sentence
 * wrongly marked covered is a MISS, so `--all` prints everything and is what an
 * audit should use.
 */
export function scanCorpus({ rows, wordRe, edges, figureNames, rowSubjects }) {
  const findings = [];
  for (const row of rows) {
    const name = row.Name ?? '(unnamed row)';
    const text = rowText(row);
    if (!text) continue;
    /* The figures whose entry this is — the antecedent of "he", "his master",
       "on his death the seat passed". */
    const subjects = rowSubjects?.(row) ?? [];
    const accounted = (sentence, end) =>
      mentions(sentence, end) || subjects.some((s) => mentions(s, end) || mentions(end, s));
    for (const sentence of sentencesOf(text)) {
      const m = sentence.match(wordRe);
      if (!m) continue;
      const names = extractNames(sentence);
      findings.push({
        row: name,
        word: m[1].toLowerCase(),
        sentence,
        names,
        knownFigures: names.filter((n) => figureNames.has(n.toLowerCase())),
        coveredBy: edges
          .filter(
            (e) =>
              /* At least one end must be named outright; the row's own figure
                 may supply the other. Letting BOTH come from the row would mark
                 every sentence in an entry covered by any edge that entry's
                 figure appears in, which is not evidence of anything. */
              (mentions(sentence, e.a) && accounted(sentence, e.b)) ||
              (mentions(sentence, e.b) && accounted(sentence, e.a)),
          )
          .map((e) => e.label),
      });
    }
  }
  return findings;
}

/** Every name the graph knows, lowercased, for the "already a figure" mark. */
export function figureNameSet(kg) {
  const set = new Map();
  for (const s of kg.saints ?? []) {
    for (const n of [s.name, ...(s.altNames ?? [])]) {
      if (n) set.set(norm(n).toLowerCase(), s.slug);
    }
  }
  return set;
}

export function report({ findings, all, json, rowCount, tag }) {
  const uncovered = findings.filter((f) => f.coveredBy.length === 0);
  const shown = all ? findings : uncovered;
  if (json) {
    console.log(
      JSON.stringify({ total: findings.length, uncovered: uncovered.length, findings: shown }, null, 2),
    );
    return;
  }
  let lastRow = null;
  for (const f of shown) {
    if (f.row !== lastRow) {
      console.log(`\n########## ${f.row}`);
      lastRow = f.row;
    }
    console.log(`  [${f.word}] ${f.sentence}`);
    if (f.names.length) console.log(`      names: ${f.names.join(' · ')}`);
    if (f.knownFigures.length) console.log(`      already figures: ${f.knownFigures.join(' · ')}`);
    if (f.coveredBy.length) console.log(`      covered by: ${f.coveredBy.join(' ; ')}`);
  }
  console.log(
    `\n${findings.length} ${tag} sentence(s) across ${rowCount} rows; ` +
      `${findings.length - uncovered.length} covered by an existing edge, ${uncovered.length} not.`,
  );
}
