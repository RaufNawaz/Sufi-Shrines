# Join check brief — the proposed new rows against the archive rows (ORDER box step 2)

**Written 14 October 2026 by the scheduled firing of HANDOVER §9.344**, the first firing of step 2,
because §9.343 found no protocol for it. Any session may correct it; date the change.

## The ruling this carries out

Rauf, 13 October 2026, in chat (HANDOVER §9.333, ruling 4): **"Enrich existing rows first, then new
rows. For proposed new rows, first look for any clue connecting a line to an existing archive row
(name, master, address, companions) and prefer that connection; a new row is the fallback."**
The ORDER box in `BOOK_QUEUE_TASK.md` adds: "where one exists, prefer the connection (the line goes
into that row's entry, flagged 'may be the same as' where only a name agrees), never merge silently."

## What is checked

The 318 proposed rows: `data/review/PATCH_new_rows_hadeeqat_ul_aulia_2026-10-10.csv` (153) and
`data/review/PATCH_new_rows_tareekh_lahore_2026-10-10.csv` (165), against the 171 archive rows of
`data/snapshot_2026-10-08_post-import.csv`. Joins BETWEEN the two books' proposed rows were already
made by the tag-file step (§9.313) and are not redone here. Each proposed row has its own entry,
`shrine_entries/<proposed-id>.md`, whose `- ` item line(s) are what a join would carry.

## Tool: `pipeline/book_queue/join_check.py`

    python3 pipeline/book_queue/join_check.py screen    # rewrite out/join_check/candidates.tsv
    python3 pipeline/book_queue/join_check.py status
    python3 pipeline/book_queue/join_check.py next 30   # screen-candidate rows first, then patch order
    python3 pipeline/book_queue/join_check.py view <proposed-id>
    python3 pipeline/book_queue/join_check.py check     # exit 1 on any bad decision line (RULE 4)

The **screen** proposes candidates two ways: a rare name token (one naming at most three archive
rows) shared by the proposed row's name and an archive row's name/figure, and an **alias** from
`pipeline/book_queue/join_aliases.tsv` (Latin as a whole word, Arabic script as a substring) found in
the proposed row's own line. **A screen hit is a thing to read, never a decision.** Most hits are
noise (a shared "Mahmud", "Ranjit Singh" as the man who demolished something, "چراغ" meaning lamps).
The screen also MISSES clues: read every line, not only the ones with hits. When you find a clue
the screen missed, add the alias to `join_aliases.tsv` and say so in the run record.

## Before deciding a row, read the archive row's entry

`shrine_entries/<archive-id>.md`. The integration stage already copied much of this material into
archive entries as place-, person- and province-level blocks (for example, Tahir Bandagi's entry
already quotes Munawwar Ali Shah's burial "inside Shaikh Tahir Lahori's chahar-diwari", and Mian
Mir's quotes Khwaja Bihari "متصل روضہ میاں میر"). Record in `carried` whether the archive entry
already carries the proposed line's tie (yes/no); it decides whether apply appends anything.

## The four decisions (one line per proposed row in `pipeline/book_queue/join_decisions.tsv`)

| decision | when | effect at apply (NOT run yet; see below) |
|---|---|---|
| `join` | the proposed site IS the archive site, or lies inside its own enclosure/precinct ("inside X's chahar-diwari", "adjoining X's rauza"), shown by a clue beyond the name: the address, the master, the companions, the dates | the proposed row leaves the import; its line is appended verbatim to the archive entry under the book's `## From …` section with an italic basis line |
| `maybe` | only a name (or epithet) agrees with an archive row | line appended to the archive entry flagged "may be the same as"; the proposed row stays, `_review` naming the archive row, until Rauf rules |
| `related` | a different site tied to an archive row through a person or a landmark (the saint's master, pir, murid, descendant, the grave "near" the archive shrine, an address landmark) | the proposed row stays; where `carried` = no, the line is appended to the archive entry as a related site |
| `new` | no clue | the proposed row stays as proposed. If the screen had candidates, `basis` must name each one and say why it is not a tie (the checker enforces this) |

Columns: `proposed_id`, `decision`, `target` (archive id(s), comma-separated; blank for `new`),
`evidence` (verbatim substring(s) of the proposed row's OWN entry line, ` || `-separated — the
checker refuses anything not verbatim), `carried` (yes/no; blank for `new`), `basis` (one or two
sentences; for `new`, answer every screen candidate), `decided` (date and session).

**Never** decide from outside knowledge (RULE 2): a tie exists only if the line, or the archive
row's entry, states it. Where the identification itself is hedged in the line ("probably", "not
asserted", "may be"), the decision is at most `maybe` or `related`, and the basis says so.
Graveyard co-location alone (both in Miani Sahib, say) is not a tie; record it in the basis.

## Apply is a separate, later step

Nothing is appended and no row is dropped until **every** proposed row is decided, `check` exits 0,
and Rauf has answered the effect questions asked in §9.344 (does `join` drop the row; does `related`
append to the archive entry). An `apply` command will then be written into `join_check.py`
following `build_tagged_rows.py`'s pattern (backups to `out/integration/join_check/before/`,
refuse on a line already present, verbatim containment check after). The consolidated import reads
`join_decisions.tsv` to drop `join` rows. Do not hand-edit entries or the patch CSVs for this step.

## Batch shape

One firing = one batch of about 30 rows from `next 30`, read and decided by the coordinator (text
only; workers may be used for larger batches, each writing its own decisions fragment for the
coordinator to merge and `check`). Claim `join_check` with `notes_claim.py` before starting and
release it at the end. Run `check` to exit 0 before writing the §9 section.

## Apply — DONE 17 October 2026 (HANDOVER §9.359)

Rauf ruled the effects on 16 October 2026 (§9.357), replacing the table's "effect at apply" column where they differ: a `join`
KEEPS its row and gets a see-also both ways (ruling 1); `related` appends where `carried` = no (ruling 2); graveyard rows that
contain archive shrines are their own rows, cross-referenced (ruling 3). `python3 pipeline/book_queue/join_check.py apply
[--dry-run]` does this, skipping ruling 8's held ids, and refuses a second application. It now refuses to run at all (any item
already present fails the whole run, nothing written), so a decision changed later must be applied by hand.
