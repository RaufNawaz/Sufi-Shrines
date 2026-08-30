#!/usr/bin/env node
/**
 * validate-description-structure.mjs — the newline and emphasis invariants,
 * in the build path.
 *
 * ## The hazard this is for
 *
 * `CLAUDE.md` RULE 3: **export CSV, never TSV.** Sheets' TSV export silently
 * strips newlines inside cells, which destroys the markdown structure of every
 * Description at once — `## History` headings, `- ` bibliography items,
 * paragraph breaks, all of it flattened into one block. *Nothing errors.* The
 * data still loads, every page still renders, and 169 articles quietly become
 * 169 walls of text. RULE 4 names the guard for it: "refuse-to-write if any long
 * Description has lost its newlines."
 *
 * **That guard exists and is not in the build path.**
 * `pipeline/append_new_shrines.py:155` asserts it — and that script runs only
 * when a person is appending new shrines by hand. `npm run data:build`,
 * `npm run data:validate` and `npm run verify` never checked it, so between the
 * guard being written and 31 August 2026 the archive had no standing protection
 * against the single most destructive thing that can happen to its prose.
 *
 * Measured on 31 August 2026, which is why this exists: **one entry has already
 * lost them.** Whether it was a TSV round-trip or was authored that way cannot
 * be told from the data, and that is exactly the problem — the failure leaves no
 * mark. One entry is invisible; the guard is here for the day it is 169.
 *
 * ## Why a recorded exception rather than a red build
 *
 * A gate that is red on arrival gets disabled, and RULE 4's other half forbids
 * the shortcut that would clear it: **do not edit content to satisfy a failing
 * check.** Restoring paragraph breaks means deciding where a surveyor's
 * sentences divide, which is editorial work on someone else's prose and an
 * agent's to report rather than to do (RULE 2). It also cannot be fixed here at
 * all — the sheet is production, and agents do not write to it (RULE 3).
 *
 * So the known entry is named, dated, and allowed; anything else fails. The
 * distinction matters because the catastrophic case is not "one more entry", it
 * is *all of them at once*, and this exits non-zero the moment the count moves.
 *
 * Usage:
 *   node scripts/data/validate-description-structure.mjs
 *   node scripts/data/validate-description-structure.mjs --list   # show the prose
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Long enough that an unbroken block is certainly wrong.
 *
 * A one-line entry is a short entry, not a damaged one — 600 characters is
 * roughly 90 words, past any plausible single paragraph and well under the
 * shortest real article in the archive.
 */
export const LONG_ENOUGH = 600;

/**
 * Entries known to carry no newline, with the date they were measured.
 *
 * An allowlist, not a threshold: a count would let a second entry in silently
 * as long as a first one left. Each line is a claim someone can go and check.
 */
export const KNOWN = new Map([
  [
    'Sant Baba Asudaram Darbar (Panno Aqil)',
    '1,339 characters in one block, measured 31 August 2026. The archive’s only ' +
      'entry with no bibliography, and its only unbroken one. Needs a person to ' +
      'paragraph it in the sheet — where the divisions fall is an editorial call ' +
      'on a surveyor’s prose, and the sheet is production (RULE 3).',
  ],
]);

function load() {
  /* The canonical dataset, which is what `validate.mjs` reads and what the
     build writes. The shipped snapshot is checked too when it is present: the
     two have drifted before (171 vs 169, closed 30 August), and a guard that
     watches only the file the build just wrote cannot see a stale artefact
     going out to readers. */
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
  return loaded;
}

/**
 * Descriptions whose `*` characters do not pair up.
 *
 * The second of RULE 4's four named guards, and it was orphaned the same way the
 * first was — audited on 31 August 2026 after the newline one turned out to live
 * in a script nothing calls. This one is in `scripts/data/snapshot-sheet.mjs`,
 * reachable only through `npm run data:restore-point`, which a person runs by
 * hand before an import. `data:build`, `data:validate` and `verify` never called
 * it, and where it does run it only WARNS: "Written anyway."
 *
 * `*ʿurs*` italics are meaningful markdown that this archive uses throughout, and
 * bold is `**`, so every well-formed Description has an even count. An odd one
 * means a string was cut mid-emphasis — the signature of a truncated cell — and
 * the damage renders as a stray asterisk or as the rest of the article silently
 * italicised, neither of which errors.
 *
 * Zero rows offend as of 31 August 2026, so unlike the newline allowlist this one
 * starts empty and is expected to stay that way.
 */
export function unbalancedEmphasis(rows) {
  return rows.filter((row) => {
    const text = String(row.Description ?? row.description ?? '');
    return (text.match(/\*/g) ?? []).length % 2 !== 0;
  });
}

/** Same contract as KNOWN: a claim someone can go and check, not a threshold. */
export const KNOWN_UNBALANCED = new Map();

export function unbroken(rows) {
  return rows.filter((row) => {
    const text = String(row.Description ?? row.description ?? '').trim();
    return text.length > LONG_ENOUGH && !text.includes('\n');
  });
}

function main() {
  const list = process.argv.includes('--list');
  const sources = load();
  if (sources.length === 0) {
    console.error('[description-structure] no dataset found. Run: npm run data:build');
    process.exit(1);
  }

  let failed = false;
  for (const [label, rows] of sources) {
    const offenders = unbroken(rows);
    const unknown = offenders.filter((row) => !KNOWN.has(row.Name));
    const share = rows.length ? Math.round((offenders.length / rows.length) * 100) : 0;

    console.log(
      `[description-structure] ${label}: ${rows.length} rows · ` +
        `${offenders.length} with no newline (${share}%) · ${unknown.length} unrecorded`,
    );
    if (list) for (const row of offenders) console.log(`    ${row.Name}`);

    /* Emphasis, on the same rows and reported on its own line — a run that says
       nothing about a check it performed is a run nobody can trust later. */
    const odd = unbalancedEmphasis(rows).filter((row) => !KNOWN_UNBALANCED.has(row.Name));
    console.log(
      `[description-structure] ${label}: ${odd.length} Description(s) with unbalanced '*'`,
    );
    if (odd.length > 0) {
      failed = true;
      console.error(`\nFAILED — ${odd.length} Description(s) have an odd number of '*':\n`);
      for (const row of odd) {
        const text = String(row.Description ?? '').trim();
        const at = text.lastIndexOf('*');
        console.error(`  ${row.Name} — ${(text.match(/\*/g) ?? []).length} asterisks`);
        console.error(`    …${text.slice(Math.max(0, at - 70), at + 30)}…`);
      }
      console.error(
        '\n`*ʿurs*` italics are meaningful markdown and bold is `**`, so a well-formed\n' +
          'Description always has an even count. An odd one means a cell was cut\n' +
          'mid-emphasis: it renders as a stray asterisk, or silently italicises the\n' +
          'rest of the article. Find the truncation — do NOT add an asterisk to\n' +
          'balance it, which hides the cut instead of repairing it (RULE 4: do not\n' +
          'edit content to satisfy a failing check).\n',
      );
    }

    if (unknown.length === 0) continue;
    failed = true;

    /* The two failures are different emergencies and must not read alike. */
    if (unknown.length > 5) {
      console.error(
        `\nFAILED — ${offenders.length} of ${rows.length} Descriptions have no newline at all.\n` +
          '\nThis is what a TSV export looks like. Sheets strips newlines inside cells\n' +
          'silently: every ## heading, every bibliography item and every paragraph\n' +
          'break in the archive is gone, and nothing else will tell you. Do not\n' +
          're-import. Re-export the sheet as CSV (RULE 3) and check a long entry by\n' +
          'eye before writing anything.\n',
      );
    } else {
      console.error(`\nFAILED — ${unknown.length} Description(s) are one unbroken block:\n`);
      for (const row of unknown) {
        const text = String(row.Description ?? '').trim();
        console.error(`  ${row.Name} — ${text.length} characters, no line break`);
        console.error(`    ${text.slice(0, 96)}…`);
      }
      console.error(
        '\nEither the markdown was lost on import, or the entry was written without\n' +
          'structure. Both are for a person: restoring paragraphs means deciding where\n' +
          'a surveyor’s sentences divide (RULE 2), and the sheet is production, so an\n' +
          'agent produces a patch rather than an edit (RULE 3).\n' +
          '\nIf it is genuinely correct as written, add it to KNOWN in this file with the\n' +
          'date and the reason. Do not raise LONG_ENOUGH to make it pass.\n',
      );
    }
  }

  if (failed) process.exit(1);

  const known = [...KNOWN.keys()];
  if (known.length) {
    console.log(
      `[description-structure] OK — ${known.length} recorded exception(s), awaiting a person:`,
    );
    for (const name of known) console.log(`    ${name}`);
  } else {
    console.log('[description-structure] OK — every long Description keeps its structure.');
  }
}

/* Only when run, not when imported: `validate-description-structure.test.ts`
   imports the predicate and must not exit the test runner. */
if (process.argv[1] && process.argv[1].endsWith('validate-description-structure.mjs')) main();
