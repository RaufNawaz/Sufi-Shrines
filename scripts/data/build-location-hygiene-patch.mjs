#!/usr/bin/env node
/**
 * build-location-hygiene-patch.mjs — move workshop notes out of a public field.
 *
 * ## What it is for
 *
 * `Location` is reader-facing: it is the dateline under a shrine's title, a row
 * in the infobox, and a line read aloud in the map's screen-reader directory.
 * Eight of the live sheet's 171 `Location` values run 191–398 characters, and
 * **four of those eight carry an instruction addressed to a colleague** —
 * "ask Saifullah for a precise pin when possible", one of them opening with the
 * literal token `FLAG:`.
 *
 * The caveats around them are exactly right and must stay: "the pin is an
 * approximate landmark, not the shrine's exact position" is the archive doing
 * what RULE 2 asks of it. What does not belong on a gallery wall is the note
 * pinned to the back of the frame. `INTERNAL_ONLY_KEYS` cannot help — it blocks
 * whole columns (`qa_note`, `flags`, `needs_review`), and this text is inline
 * inside a public one.
 *
 * Ruled on 30 August 2026: **move the instruction, keep the caveat, lose no
 * words.** The instruction goes to `qa_note`, which never renders on a page.
 *
 * *Correction, same day: "never renders" was the whole of the reasoning and it
 * is not enough. `qa_note` is not rendered and it **is** published — it is in
 * `src/data/shrines-fallback.json`, which ships as a 925 KB precached chunk to
 * every visitor, is committed in a public repository, and goes into the Zenodo
 * bundle via `data/shrines.json`. So this patch moved the notes out of a field a
 * reader sees into a field a reader can download. That is still an improvement,
 * and it is not the removal it was described as. Whether raw QA notes belong in
 * the published data is recorded for Rauf in `docs/SESSION_RESUME.md`; see the
 * corrected note at the top of `validate-publication-safety.mjs`.*
 *
 * ## The cut, and why it is mechanical
 *
 * The split point is the first `FLAG:` or `[Aa]sk <Name>` in the value. Every
 * character before it stays in `Location`; every character from it onward is
 * appended to `qa_note` verbatim, under a dated line saying where it came from.
 * A mechanical rule rather than a judgement per row, because the alternative is
 * an agent deciding which half of a surveyor's sentence a reader deserves —
 * and because a rule can be re-run when the sheet changes, which a hand-edited
 * CSV cannot.
 *
 * Where the cut leaves a reader worse off, move a clause back **by hand**: the
 * text is in `qa_note`, not deleted, and a human moving one sentence back is a
 * much smaller act than an agent choosing the line in the first place.
 *
 * ## RULE 3
 *
 * This writes a CSV for a person to import. It does not touch the sheet.
 * Columns are `Name`, `Location`, `qa_note` — the two changed cells plus the
 * join key. `qa_note` is emitted **in full**, not as an append instruction,
 * because a patch that needs interpreting is a patch that gets applied wrong.
 *
 *   Import: match on Name, replace those two cells only,
 *           "Convert text to numbers, dates and formulas" OFF.
 *
 * Usage:
 *   node scripts/data/build-location-hygiene-patch.mjs            # writes the patch
 *   node scripts/data/build-location-hygiene-patch.mjs --check    # exit 1 if the sheet still has any
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import Papa from 'papaparse';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'data', 'patch_location_hygiene_2026-08-30.csv');

/**
 * An instruction addressed to a person, rather than a fact about the place.
 *
 * `FLAG:` is the surveyor-workflow marker. `Ask <Name>` catches the imperative
 * with a capitalised addressee, which is what every instance in this corpus
 * looks like — deliberately narrower than a bare /ask/, so that a sentence like
 * "visitors ask the caretaker for access" is never cut.
 */
const INSTRUCTION = /\bFLAG:|\b[Aa]sk\s+[A-Z][a-z]+/;

function csvUrl() {
  const source = join(ROOT, 'data', 'csv-source.json');
  if (!existsSync(source)) throw new Error(`No ${source} — cannot find the sheet.`);
  const parsed = JSON.parse(readFileSync(source, 'utf8'));
  const url =
    parsed.url ??
    parsed.csvUrl ??
    Object.values(parsed).find((v) => typeof v === 'string' && v.startsWith('http'));
  if (!url) throw new Error(`No URL in ${source}.`);
  return url;
}

/** Where the instruction starts, or -1. Trailing separators (an em dash, a
 *  semicolon, a full stop) are pulled back with it so the kept half does not
 *  end mid-punctuation. */
function cutPoint(value) {
  const match = INSTRUCTION.exec(value);
  if (!match) return -1;
  let i = match.index;
  while (i > 0 && /[\s—–\-;,.]/.test(value[i - 1])) i -= 1;
  return i;
}

function main() {
  const check = process.argv.includes('--check');
  const rows = Papa.parse(execFileSync('curl', ['-sL', csvUrl()], { maxBuffer: 64 << 20 }).toString(), {
    header: true,
    skipEmptyLines: true,
  }).data;

  const patched = [];
  for (const row of rows) {
    const location = (row.Location ?? '').trim();
    const at = cutPoint(location);
    if (at < 0) continue;

    /* A full stop is in both strips: the cut pulls back over the punctuation
       that joined the two halves, so without it the kept half can end mid-
       clause and the moved half can begin ". Ask Saifullah…". */
    const kept = location
      .slice(0, at)
      .replace(/[\s—–\-;,.]+$/, '')
      .trim();
    const moved = location
      .slice(at)
      .replace(/^[\s—–\-;,.]+/, '')
      .trim();
    if (!kept || !moved) continue;

    const note = (row.qa_note ?? '').trim();
    patched.push({
      Name: row.Name,
      /* Terminal punctuation is `.!?` only — a value ending in `)` reads
         unfinished, and this is the archive's own sentence now. */
      Location: /[.!?]$/.test(kept) ? kept : `${kept}.`,
      qa_note: [note, `Moved from the public Location field, 30 August 2026: ${moved}`]
        .filter(Boolean)
        .join('\n\n'),
    });
  }

  console.log(`\n${rows.length} live rows · ${patched.length} carry an instruction in Location\n`);
  for (const row of patched) {
    console.log(`  ${row.Name}`);
    console.log(`    keeps : ${row.Location.slice(0, 96)}${row.Location.length > 96 ? '…' : ''}`);
    const moved = row.qa_note.slice(row.qa_note.lastIndexOf('Moved from the public'));
    console.log(`    moves : ${moved.slice(0, 96)}…\n`);
  }

  if (check) {
    if (patched.length === 0) {
      console.log('OK — no Location value carries an instruction. The patch has been imported.\n');
      process.exit(0);
    }
    console.error(
      `FAILED — ${patched.length} Location value(s) still name a colleague or carry FLAG: on the ` +
        'live site. Import data/patch_location_hygiene_2026-08-30.csv (RULE 3: a human imports).\n',
    );
    process.exit(1);
  }

  if (patched.length === 0) {
    console.log('Nothing to patch — not writing a file.\n');
    return;
  }

  writeFileSync(OUT, Papa.unparse(patched, { quotes: true, newline: '\n' }) + '\n', 'utf8');
  console.log(`Wrote ${OUT.slice(ROOT.length + 1)}`);
  console.log('Import: match on Name, replace Location and qa_note only, ');
  console.log('        "Convert text to numbers, dates and formulas" OFF.\n');
}

main();
