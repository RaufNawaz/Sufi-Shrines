#!/usr/bin/env node
/**
 * validate-survey-provenance.mjs — a surveyed shrine must say it was surveyed.
 *
 * ## The hazard this is for
 *
 * Nineteen shrines in this archive have a field-survey response behind them. On
 * 5 September 2026 three of them — Shah Jamal, Peer Makki, Mauj Darya Bukhari —
 * were found publishing that survey's content with **no citation of it** and at
 * `support_level: Source-seeded`, while the sixteen beside them carried a
 * `Shrines Project field survey` line and read `Field-verified`.
 *
 * Nothing was broken. Every page rendered, every gate passed, and the archive
 * quietly presented a named fieldworker's account as though it came from
 * nowhere — in the project whose distinguishing claim is provenance. It had been
 * that way since the 16 August patch-based import bypassed the 9 August TSV, it
 * survived a reconciliation on 26 August that looked straight at those three
 * rows, and the reconciliation misdiagnosed it as missing *content* rather than
 * missing *attribution*, which is why nobody fixed it for three weeks.
 *
 * A citation is exactly the kind of thing that can go missing without a symptom.
 * So it gets a check, per RULE 4.
 *
 * ## What it asserts
 *
 * For every response marked `live` in `pipeline/survey_response_map.tsv`, the
 * shrine it maps to must
 *
 *   1. carry `Shrines Project field survey` somewhere in its `Description`, and
 *   2. read `support_level: Field-verified`.
 *
 * Both, not either. The two have been the same 16 rows every time they have been
 * counted, and a row that has one without the other is the interesting case.
 *
 * ## What it cannot see, said plainly
 *
 * - **A response nobody has mapped.** The map is written by hand because the
 *   mapping is not mechanical (nine of nineteen responses name their shrine
 *   differently from the sheet, and token-overlap matching gets four wrong). A
 *   new response that is never added to the TSV is invisible here. The TSV says
 *   so in its own header.
 * - **Whether the citation is true.** It checks that a line exists, not that a
 *   survey happened.
 * - **Two mapped shrines are not in the dataset at all** —
 *   `darbar-hazrat-shah-gohar-peer` and `darbar-mian-qurban-ali-shah` have no
 *   coordinates, and `buildShrine()` drops any row it cannot place, which is the
 *   169-vs-171 gap. They are reported and skipped rather than failed: a row that
 *   is not shipped cannot fail a check about what it publishes, and the gap has
 *   its own standing entry.
 *
 * ## The allowlist, and why it expires loudly
 *
 * The three rows above are allowed *because a patch fixing them is written and
 * waiting to be imported*. Once it is, they will pass — and this gate then fails
 * on the **allowlist itself**, because an entry that no longer describes a real
 * failure is a lie that will outlive everyone who remembers it. Delete the entry
 * when the import lands; that is the whole maintenance burden.
 *
 * Usage:
 *   node scripts/data/validate-survey-provenance.mjs
 *   node scripts/data/validate-survey-provenance.mjs --list
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const MAP = join(ROOT, 'pipeline', 'survey_response_map.tsv');

/** The bibliography line every surveyed entry carries, in the house wording. */
export const CITATION_MARKER = 'Shrines Project field survey';

/** The provenance level a field survey earns. */
export const SURVEYED_SUPPORT_LEVEL = 'Field-verified';

/**
 * Mapped shrines that `build-dataset` does not ship, with the reason.
 *
 * Not an allowlist for failures — these rows are absent, not wrong.
 */
export const NOT_IN_DATASET = new Map([
  [
    'darbar-hazrat-shah-gohar-peer',
    'no coordinates in the sheet; buildShrine() drops unplaceable rows (the 169-vs-171 gap)',
  ],
  [
    'darbar-mian-qurban-ali-shah',
    'no coordinates in the sheet; buildShrine() drops unplaceable rows (the 169-vs-171 gap)',
  ],
]);

/**
 * Known failures, each with the date it was measured and the fix that is waiting.
 *
 * An entry here must describe a row that **still fails**. When it stops failing,
 * this gate fails instead — see the header.
 */
export const KNOWN = new Map([
  [
    'shah-jamal',
    'Measured 5 September 2026. Survey content is in the entry, unattributed. Fixed by ' +
      'data/patch_field_survey_orphans_2026-09-05.csv, awaiting import (RULE 3: agents do not ' +
      'write to the sheet). Delete this line once the import has landed.',
  ],
  [
    'peer-makki',
    'Measured 5 September 2026. Same patch, and the one of the three whose content gap was ' +
      'real as well. Delete this line once the import has landed.',
  ],
  [
    'shrine-of-mauj-darya-bukhari',
    'Measured 5 September 2026. Same patch. Delete this line once the import has landed.',
  ],
]);

/** Live responses from the hand-written map, deduped to one entry per shrine. */
export function readSurveyedShrines(text) {
  const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const header = lines[0].split('\t');
  const col = (name) => header.indexOf(name);
  const [tsAt, nameAt, statusAt, idAt] = [
    col('timestamp'),
    col('shrine_name_as_written'),
    col('status'),
    col('shrine_id'),
  ];
  if ([tsAt, nameAt, statusAt, idAt].some((i) => i < 0)) {
    throw new Error('survey_response_map.tsv is missing a required column');
  }
  const byId = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    if (cells[statusAt] !== 'live') continue;
    const id = cells[idAt]?.trim();
    if (!id) throw new Error(`live response ${cells[tsAt]} has no shrine_id`);
    byId.set(id, { id, response: cells[tsAt], name: cells[nameAt] });
  }
  return byId;
}

function loadDatasets() {
  const sources = [
    ['data/shrines.json', (j) => j.rows ?? []],
    ['src/data/shrines-fallback.json', (j) => j.rows ?? (Array.isArray(j) ? j : [])],
  ];
  const loaded = [];
  for (const [rel, pick] of sources) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) continue;
    loaded.push([rel, pick(JSON.parse(readFileSync(path, 'utf8')))]);
  }
  if (loaded.length === 0) throw new Error('no dataset found — run npm run data:build');
  return loaded;
}

/** Rows that owe a survey citation and do not carry one, or are under-levelled. */
export function findFailures(rows, surveyed) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const failures = [];
  const absent = [];
  for (const { id, response, name } of surveyed.values()) {
    const row = byId.get(id);
    if (!row) {
      absent.push(id);
      continue;
    }
    const reasons = [];
    if (!String(row.Description ?? '').includes(CITATION_MARKER)) {
      reasons.push('no field-survey citation in Description');
    }
    if (String(row.support_level ?? '').trim() !== SURVEYED_SUPPORT_LEVEL) {
      reasons.push(`support_level is "${row.support_level ?? ''}", not ${SURVEYED_SUPPORT_LEVEL}`);
    }
    if (reasons.length) failures.push({ id, name, response, reasons });
  }
  return { failures, absent };
}

function main() {
  const listOnly = process.argv.includes('--list');
  const surveyed = readSurveyedShrines(readFileSync(MAP, 'utf8'));
  let bad = false;

  for (const [rel, rows] of loadDatasets()) {
    const { failures, absent } = findFailures(rows, surveyed);

    for (const id of absent) {
      if (!NOT_IN_DATASET.has(id)) {
        console.error(
          `[survey-provenance] ${rel}: ${id} is mapped to a live response but is not in the dataset,` +
            ' and is not one of the rows recorded as unshippable.',
        );
        bad = true;
      }
    }

    const unrecorded = failures.filter((f) => !KNOWN.has(f.id));
    const recorded = failures.filter((f) => KNOWN.has(f.id));
    const healed = [...KNOWN.keys()].filter((id) => !failures.some((f) => f.id === id));

    console.log(
      `[survey-provenance] ${rel}: ${surveyed.size} surveyed shrines · ` +
        `${absent.length} not shipped · ${failures.length} failing ` +
        `(${unrecorded.length} unrecorded)`,
    );

    if (listOnly) {
      for (const f of failures) {
        console.log(`    ${f.id} — ${f.reasons.join('; ')}  [response ${f.response}]`);
      }
    }

    for (const f of unrecorded) {
      console.error(
        `[survey-provenance] ${rel}: ${f.id} has a field-survey response (${f.response}, ` +
          `"${f.name}") but ${f.reasons.join(' and ')}.`,
      );
      bad = true;
    }

    for (const id of healed) {
      console.error(
        `[survey-provenance] ${rel}: ${id} is on the known-failures list and now passes. ` +
          'Delete its entry from KNOWN in this file — a recorded exception that no longer ' +
          'describes a real failure outlives everyone who remembers why it was written.',
      );
      bad = true;
    }

    if (!bad && recorded.length) {
      console.log(`[survey-provenance] ${recorded.length} recorded exception(s), awaiting import:`);
      for (const f of recorded) console.log(`    ${f.id} — ${f.reasons.join('; ')}`);
    }
  }

  if (bad) process.exit(1);
}

/* Not `import.meta.url === \`file://${process.argv[1]}\``: this repository's path contains
   spaces and a curly apostrophe, so `import.meta.url` is percent-encoded and that comparison is
   false forever — the script exits 0 having checked nothing, which is the exact failure mode this
   gate exists to catch. The sibling gate in validate-description-structure.mjs matches on the
   filename for the same reason. */
if (process.argv[1] && process.argv[1].endsWith('validate-survey-provenance.mjs')) main();
