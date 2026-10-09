# Integration stage brief (replaces the notes branch of the book queue routine)

Merge this into `docs/prompts/BOOK_QUEUE_TASK.md` in place of the notes stage. Steps 1 and 2
(lease and claim check, then alternation by the last HANDOVER §9 entry) are unchanged: a firing that
would have done notes now does **integration**. Transcription firings carry on exactly as before.

## Scope for now: shrine entries only

The job for now is to build `shrine_entries/` into the full cited record for every shrine the books
touch. **Do not draft or propose any `Description` cell text.** How descriptions get rebuilt from the
entries (extended or rewritten) is still undecided, so that step waits for Rauf's ruling.

## Standing rules (unchanged, restated so a fresh session cannot miss them)

- **RULE 2.** A fact enters a shrine entry only with its book slug and folio (`[slug, p. N]`). Sources
  that disagree are written up as disagreeing, side by side, and are never reconciled. `[OCR?]` and
  `[illegible]` markers are carried through unchanged.
- **RULE 3.** The Google Sheet is never written. Every change to the sheet goes out as a CSV patch in
  `data/review/` for Rauf to import.
- **RULE 4.** Any count you report must come from a script that reads the files, never from worker
  prose.
- **RULE 5.** A scheduled run cannot ask in chat, so any item that needs a decision is **skipped**, not
  guessed at, and listed under "Needs Rauf" in the run record.

## One firing = one book

1. Run `queue.py status` and pick the first book that is `summarized` and not `integrated`, in
   `queue.py next` order. Claim it with `notes_claim.py` before you touch anything. Do not take a
   book that someone else holds.
2. Back up every `shrine_entries/*.md` you might touch, byte for byte, into gitignored
   `out/integration/` before you edit anything.
3. For each shrine id that heads bullets in the book's takeaways file:
   - The id must exist in `shrine_index.tsv`. If it doesn't, skip the bullet and record it.
   - Append a section to that shrine's existing entry, titled `## From <Author, Short title>`. Keep
     the takeaways' groups (Saint; Shrine / Darbar; Practices & Events; Legends & Miracles;
     Significance; Other). Never rewrite what is already in an entry.
   - If the shrine has no entry file yet, create `shrine_entries/<id>.md`. Open it with a section
     `## Current site description (as of <date>)` holding the row's `Description` cell exactly as it
     appears in `src/data/shrines-fallback.json`, untouched and marked as not yet checked against
     sources. Then append the book section under it. That way a rebuilt description later can
     start from what readers see now and lose nothing.
   - Leave out any bullet marked `not attached`, or tied to a cross-cutting rather than a shrine
     heading. Count these and record them.
4. **Sheet-cell proposals.** A structured field (dates, silsila, custodian, `year_built`, …) is
   proposed only under Rauf's ruling of 23 September: two or more books must agree against the
   archive, and no third book may give a different value. Write single-cell rows to
   `data/review/PATCH_integration_<slug>_<date>.csv` as `id,column,current,proposed,sources`.
   Prose goes into the entry, never into a sheet cell.
5. Check your own work by script before you release the book: `check_note_ids.py` exit 0; every
   folio cited in the new sections must appear in the takeaways file (containment check); every
   entry must stay diff-identical outside its appended section. Then run
   `queue.py mark <slug> integrated --file <comma separated ids>` and release with `--session`.
6. Write the run record as the next project doc and the next HANDOVER §9 section, in the usual
   format. Do not commit. That is Rauf's step.

## Held items: skip these and list them every time they come up

- `langer-makhdoom` shrine identity; whether `shah-chiragh` conflates two men.
- The two Shah Inayats (`shrine-of-shah-inayat-qadiri` and `dargah-roza-sufi-shah-inayat-shaheed`).
- `shrine-of-pir-mangho` and Bava Gor; "Shams" in Shackle and Rafat; Waris Shah's Jalal/Jahanian split.
- Bulleh Shah's death year (1757 vs 1758 vs 1754), until Rauf rules on it.
- Any id that is absent from `src/data/shrines-fallback.json` (Hinglaj, until its id cell is
  imported): write the entry section, but propose no cells for it.

## The final database (only once every summarized book is integrated)

The first integration firing that finds no book left to integrate builds the consolidated import
instead of integrating:

1. Extend `pipeline/build_consolidated_import.py` so it also reads every `data/review/PATCH_*.csv`
   not yet applied (Hinglaj id, figure_died, all `PATCH_integration_*`), and so it refuses held items
   and stale patches. INV-11 still applies.
   Descriptions are **not** part of this import until Rauf rules on them (see Scope).
2. Build against a **live fetch** of the sheet to `data/import_<date>.csv` plus `.INSTRUCTIONS.md`.
   The instructions say which rows and cells change, which patches were excluded and why, and give
   the import settings (Replace current sheet, comma, conversion OFF).
3. Verify with a second instrument: `validate_shrines.py` and `npm run data:validate`, with before
   and after counts.
4. Stop there. Do not import, do not push, and do not touch `1.7`.
