# Book-queue task instructions — Sufi-Shrines cloud OCR

**This file IS the scheduled task's prompt.** The task `Sufi-Shrines book queue — transcription +
notes (hourly)` carries only a short bootstrap that reaches this repo and then reads this file, so
that these instructions are versioned, diffable, and editable by any session without touching the
scheduled task (CLAUDE.md RULE 0 — prompts written for agents live in `docs/prompts/`).

**Editing this file changes what every future firing does.** Keep it accurate and keep it dated.
Last substantive change: 24 September 2026 (§9.237 — schimmel_mystical_dimensions_of_islam
FINISHED 29/29 and the notes queue re-pointed at Pass 2 on it; the back-matter map corrected by
29 pages; the location_short instruction retired as spent; the province-key gap recorded).
Before that, same day: §9.235 (schimmel started and its structure recorded, the per-wave write-back
rule hardened, the flapping-bridge append technique added). Before that, same day: §9.234 (masnavi-calibration and Pass-2-first
paragraphs retired as spent, transcription front re-measured, notes queue re-pointed at Pass 1,
cadence corrected to every 2 hours); 23 September 2026 (alternation ruling, masnavi calibration,
duplicate suppression and contested folios).

---

Advance the Sufi-Shrines cloud book queue by ONE batch, then stop. You are picking up an unfinished multi-session job for Rauf. Work autonomously; do not ask questions unless proceeding under any assumption would be unsafe (then state it plainly and stop).

This task covers BOTH stages and **ALTERNATES between them** (Rauf, 23 Sep 2026 — this supersedes the 22 Sep transcription-first rule, which existed only because the transcription front had stalled). See "WHICH STAGE IS THIS FIRING?" below before doing anything.

THE REPO IS ON RAUF'S MAC, not in the cloud container:
  /Users/rauf/Desktop/Desktop - rauf's MacBook Air/Harvard/Shrines Project
The apostrophe in "rauf's" is CURLY (U+2019). A straight-apostrophe twin on the Desktop is an empty decoy. NEVER locate this path with `find` (CLAUDE.md RULE 1). If it is not connected, call device_request_folder_access on that exact path. In device_bash it mounts at "$HOME/mnt/Shrines Project". python3, pdftoppm, pdfimages and pdftotext are installed there.

READ FIRST: `CLAUDE.md` (RULE 0 nothing is retained unless written into the repo; RULE 2 never invent content; RULE 4 encode invariants as checks that fail loudly; RULE 5 a decision is asked in chat, never parked in a doc), then `docs/HANDOVER.md` §9 — the last 3-4 sections, found by SORTING (see gotchas) — then the protocol for whichever stage you are working: `pipeline/book_queue/WORKER_PROTOCOL.md` (transcription) or `TAKEAWAYS_PROTOCOL.md` (notes). `shrines/08_Cloud_OCR_Queue_Runbook.md` in the attached project has the queue's design.

FIND THE WORK:
  cd "$HOME/mnt/Shrines Project" && python3 pipeline/book_queue/queue.py status
  python3 pipeline/book_queue/queue.py next
  python3 pipeline/book_queue/queue.py notes-status <slug>

## WHICH STAGE IS THIS FIRING? ALTERNATE.

**Ruled by Rauf, 23 September 2026, replacing the 22 September transcription-first rule.**
Transcription-first was written because the transcription front had stalled. It is no longer
stalled. Each firing now does **ONE batch of ONE stage, and alternates**:

**Step 1 — is a sibling live? That decides it, not the history.** This task fires hourly and a
batch takes about an hour, so the previous firing is usually STILL RUNNING and has not written its
§9 section yet. Reading the last §9 section alone would make two overlapping firings choose the
same stage. So look at what is actually claimed right now:

    python3 pipeline/book_queue/notes_claim.py status         # a live claim => notes stage is taken
    python3 pipeline/book_queue/queue.py status               # a lease under 3h old => transcription is taken

    a live NOTES claim and no fresh lease   ->  THIS firing TRANSCRIBES.
    a fresh LEASE and no live notes claim   ->  THIS firing does NOTES / PASS 2.
    both taken                              ->  transcribe a DIFFERENT book, or a free range of the
                                                same one; `queue.py lease` skips held ranges itself.
    neither taken                           ->  go to step 2.

**Step 2 — nothing is live, so alternate off the record.** Read the last `### 9.` section of
docs/HANDOVER.md (found by SORTING, see gotchas); its first line says which stage that firing ran.

    previous firing transcribed  ->  THIS firing does notes or Pass 2.
    previous firing did notes    ->  THIS firing transcribes.
    cannot tell                  ->  transcribe.

**Say in your §9 section's FIRST LINE which stage you ran** — literally `Stage: transcription`
or `Stage: notes` — so the next firing can read it without parsing prose. And claim or lease
BEFORE you start work, not after, because your claim is what a sibling firing sees.

**MASNAVI CALIBRATION IS DONE — that instruction is spent** (it ran twice, §9.228 cohort A and
§9.229 cohort B, and `masnavi_02` 1-30 was the first production batch off it). Do not re-run it.
Read `pipeline/book_queue/MASNAVI_WORKER_BRIEF.md` **alongside** `MASNAVI_CALIBRATION_COHORT_B.md`,
which contradicts three statements in the brief, before briefing anyone on a masnavi; and use
`render_masnavi.py`, not `render_bands.py`, on masnavi_02..06 (native scan is 579-781 px across the
whole page — the pixel ladder cannot be climbed on them). `masnavi_01_text` is the exception and
takes `render_bands.py --scale 4400`.

**Transcription now just runs, in priority order, taking the next free range.** See STAGE A.

**PASS 2 IS FINISHED — 23 of 23 books** (§9.233, 24 September 2026). The "consolidate before noting
a new book" instruction is **spent**. The notes stage's work is now **Pass-1 notes on the six
unnoted books**, in the priority order listed under STAGE B.

## STAGE A — TRANSCRIPTION (run this on a transcription firing; see the alternation rule above)

GOAL (Rauf, 17 Sep 2026): every book except the 5 skipped (four wasif_* and masnavi_01) reaches at
least `transcribed`. **Outstanding, re-measured 24 September 2026 from `queue.py status` —
2,895 pages left, all route=vision.** Take the next free range down this list:

    prio  slug                    done/pages   free ranges
      30  tahqiqat_chishti          600/873    661-873  (481-540 is a HOLD, see below)
     190  khulasat_ut_tawarikh      330/610    411-610  (17-38 is a HOLD)
     201  masnavi_01_text             0/416    all
     202  masnavi_02                 30/366    31-366
     203  masnavi_03                  0/462    all (`ingested`)
     204  masnavi_04                  0/374    all (`ingested`)
     205  masnavi_05                  0/432    all (`ingested`)
     206  masnavi_06                  0/542    all (`rendering`)

**`tahqiqat_chishti` 481-540 is held by `HOLD-tarball-recovery-481-540` and the hold has a
deadline**: those 60 pages were transcribed on 23 Sep and lost when the bridge dropped before
write-back (§9.232). **If the tarball named in
`shrines/42_Cloud_OCR_Run_2026-09-23_tahqiqat_481-540_NOT_IN_REPO.md` is not recovered by
2026-09-25, release the hold and re-transcribe the range.** Do not let it sit past that.

MEASURED — do not rediscover:
- All eight are lithographs of scribal Nastaliq hands (khulasat and the masnavis are Persian;
  khulasat's first ~32 pages are clean 1918 English letterpress, 96-99%). Word accuracy depends on
  the PIXEL WIDTH of the text line: 1119 px gave 30-40%, 1679 px gave 30-70% marked illegible,
  2462 px gives ~62-82% with letter dots legible.
- Render with `python3 pipeline/book_queue/render_bands.py <slug> --pages A-B` (4 horizontal bands
  per page at scale 4400 → 2462 px wide, 3% overlap). Its docstring has the full table. Do NOT use
  `queue.py render` for these books; full-page and half-page renders are known to fail.
- **Numerals stay unreliable at every resolution tested.** Chronogram years and folio digits are
  isolated and have no linguistic context. Workers flag every uncertain digit and never smooth a
  date. Standing caveat on everything these books produce.
- The 8 PDFs are in `books/incoming-2026-09-11/`; `books/<slug>.pdf` are symlinks. Recreate a
  missing symlink rather than re-downloading.
- khulasat's real trap is the HUNDREDS DIGIT — wrong on fourteen of sixty-six pages in one batch
  (§9.222). A folio-corner crop lifted folio capture to 85% on tahqiqat_chishti (§9.215).

SHAPE: `queue.py status`/`next` → stage that book's PDF into the container ONCE → render bands **in
the container** (it has pdftoppm and PIL, 600 s per Bash call, ~9 s a page) → `queue.py lease <slug>
--size N --worker wK` per worker → at most 6 subagents in ONE message, ~10-12 pages each → each
worker reads WORKER_PROTOCOL.md, reads its pages' 4 bands q1→q4, transcribes overlaps once, writes
one `pNNNN.txt` per page, nothing else → copy `pNNNN.txt` back into `out/ocr/<slug>/pages/` ON THE
MAC → `queue.py check <slug>` → `queue.py folio-check <slug>` (a minority folio offset is usually a
misread tens digit, not a real one).

TELL EVERY WORKER: never write a word you did not read off the image; `[illegible]` /
`[illegible: N lines]` rather than composing plausible Persian or Urdu; `[OCR?]` on every uncertain
word AND every uncertain digit; count the printed lines per band and account for each; `[folio N]`
in Western digits on the first line, omitted rather than inferred; running headers omitted; never
skip a page. A worker that finds itself composing rather than reading must stop and mark — six
workers hit exactly that on tahqiqat_chishti and catching it is correct behaviour, not failure.

DIGITISATION STAMPS, transcribed ONCE as `[source stamp: ...]` and never silently dropped — they are
provenance, and provenance is this archive's core claim: khulasat carries `Sri Satguru Jagjit Singh
Ji eLibrary / NamdhariElibrary@gmail.com` at the foot of every page; the masnavis carry a
`www.maktabah.org` watermark; tahqiqat_chishti has a library accession stamp on p0008 and an
unidentified circular Latin-capital stamp on p0014.

Transcription concurrency is protected by `queue.py`'s own page leases (`lease` / `release` /
`sweep-leases`, three-hour expiry). Use them so the bookkeeping is honest.

## STAGE B — NOTES AND PASS 2 (run this on a notes firing; Pass 2 first)

**CLAIM THE BOOK BEFORE YOU NOTE IT. FIRST THING AFTER READING.** On 20 September two firings of this
task noted the same six chunks in parallel and one set was overwritten seventeen minutes after being
md5-verified (§9.218). `queue.py` has no notes lease, so use:

    python3 pipeline/book_queue/notes_claim.py status
    python3 pipeline/book_queue/notes_claim.py claim <slug> --session <this session id> --note "<n>/<N> notes"

`claim` exits 3 and names the holder if another live run has it. If refused, do NOT note that book
and do NOT quietly pick another behind the other run's back — run `notes_claim.py next-free <slug>
<slug> ...` down the priority list and claim the first free one, or stop and say every candidate is
claimed. Claims last 90 minutes and are renewable. A claim file is rewritten, never deleted
(`unlink` is blocked on this mount), so absence is not the test — the script's own `is_live` is.
**`release` REQUIRES `--session <id>`**: without it, it identifies the caller by pid, declines, and
still exits 0 (§9.221). Always pass `--session` and always confirm with `status` afterwards.

NOTES QUEUE — **`schimmel_mystical_dimensions_of_islam` IS FINISHED, 29/29 (§9.237, 24 Sep).**
18 books fully noted, 5 left. **The next notes firing does PASS 2 ON SCHIMMEL** — it is the first
book to become consolidatable since Pass 2 closed at 23 of 23, its notes are **1,371,157 bytes over
29 files (the largest in the corpus)**, and §9.233's proved shape is **three workers split by the
OUTPUT document's own sections, not by chunk range** (one worker is proved to 950 KB). Read §9.237
first: the imprint-city, province-join and bare-index-entry questions all land on the consolidator,
and every decline is enumerated in the chunk files ready to reverse. Then
`queue.py mark schimmel_mystical_dimensions_of_islam summarized --file entries/book_takeaways/schimmel_mystical_dimensions_of_islam.md`.

After that, Pass 1 on: 120 `khalid_walking_with_nanak` (324 pp, 14 chunks) → 121 `dhillon_janamsakhis`
(271, 9) → 122 `khalid_a_white_trail` (236, 13) → 123 `khalid_in_search_of_shiva` (21, 9) →
210 `nizami_revised_translation` (208, 13). **Three of the five are Sikh-subject books**, so the
many-row person rule (Guru Nanak heads 18 rows) and the province-join question will govern them
heavily.

**`schimmel_mystical_dimensions_of_islam` — FULLY NOTED. Its complete measured brief is committed at `pipeline/book_queue/SCHIMMEL_MDI_WORKER_BRIEF.md` (structure, folio rule, all 31 sigla, damage table + 11 corrections). Read that file, not this paragraph, before any Pass 2 work. Summary (§9.235, corrected §9.237):** Route
`text_layer`, zero pre-existing flags, so every flag is the notes worker's own. **`folio = PDF − 31`
on 386 of 387 header lines; leading folio EVEN, trailing ODD, zero violations** — but chapter-,
section- and appendix-opening pages print the folio **alone at the foot**, so check the foot before
writing `folio not stated`. The arabic run starts PDF 34 (folio 3); PDF 1-33 is roman. **Structure:
chapters PDF 34-433 (ch. 8 `SUFISM IN INDO-PAKISTAN` = 375-433, ch. 9 Epilogue = 434-439),
part-title 440, Appendix 1 442-456, Appendix 2 457-467, BIBLIOGRAPHY 468-527, Indexes 528-543** —
an earlier brief said "bibliography from 440" and was wrong. **The book cites its sources by 31 one-
and two-letter SIGLA in the running text** (`(L 31)`, `(T 2:113)`, `(H 293)`, and `[AD 100]` in
square brackets, which reads like a year); the key is printed PDF 22-24 and is transcribed in
`entries/book_takeaways/schimmel_mystical_dimensions_of_islam/chunk_001.notes.md`. **No siglum is
ever a page of this book — put the key in the worker brief before anyone opens a chunk.** Digit
damage is heavy and eats dates: `9`→`g`/`Q`, `1`→`i`/`I`/`!`/`J`/`l`, `0`→`o`/`O`/`°`,
`2`→`a`/`s`/`g`, `5`→`s`, `11`→`n`, `S`→`8`, `z`→`2`; ʿayn/hamza render as `c`, `^`, `3`, `D`, `?`,
`V`, `'v`, `*`, `j`, `>`; `ā`→`d` and `ī`→`l` mangle NAMES. No ligature class at all.

**Note a survey book's South Asian chapter FIRST, not chunk 001 onward.** On this book chunks
020-023 (chapter 8) carry **83 of the 88 archive rows the whole batch touched**; the
formative-period chunks carry 1-3 each. Order is free — `notes-status` lists missing chunks by
name.

**One more false friend, measured on this book: `dina` fires inside `Medina`**, not only inside
"Ferdinand". On any book with formative-period chapters that is the dangerous one.

FULLY NOTED — do not re-note: schimmel_mystical_dimensions_of_islam (29),
sorley_shah_abdul_latif_of_bhit (24), schimmel_pain_and_grace (16),
shackle_bulleh_shah_sufi_lyrics (7), rafat_bulleh_shah_selection (4), waris_shah_hir_ranjha (7),
madho_lal_hussein_verses_lowly_fakir (3), kugle_sufis_and_saints_bodies (22),
ernst_lawrence_sufi_martyrs_of_love (17), rizvi_history_of_sufism_india_1 (28),
kasmani_queer_companions (12), boivin_hindu_sufis_south_asia (13), schaflechner_hinglaj_devi (19),
werbner_basu_embodying_charisma (15), abbas_female_voice_sufi_ritual (11),
qureshi_sufi_music_qawwali (15), rozehnal_islamic_sufism_unbound (18),
schimmel_as_through_a_veil (16).
SUMMARIZED (Pass 2 done): sawaneh_shah_jamal, hadeeqat_ul_aulia, tareekh_lahore,
tazkirah_awliya_pak_o_hind, shackle_risalo_shah_abdul_latif, eaton_essays_islam_indian_history.

### ALL MAPPING QUESTIONS ARE NOW RULED. Do not re-litigate any of them.

**(a) A bare TOPONYM takes the id of EVERY archive row in that place** (Rauf, 21 Sep): *"if a book
has information on multan in general then all the shrines in multan have to have that because it is
part of multan's tradition."* Join on `shrine_index.tsv`'s `location_short`. Lahore is 35 rows,
Karachi 11, Peshawar 10, Multan 8, Islamabad 4. **Rauf confirmed 22 Sep that this is meant to be
heavy — "yes lahore will be heavy".** Gather all of one place's material into ONE bullet per chunk
with sub-bullets, and keep every id of the bullet head on ONE physical line (see gotchas). A toponym
with no matching row goes under "Other saints, sites and events".

**A PERSON who is the principal figure of MANY rows also takes ALL of them** (Rauf, 22 Sep — this
closes the last open sub-case). Guru Nanak heads a bullet with all 18 gurdwara rows; Shiva 8;
Goraknath and Krishna 2 each. Enumerating them under Doubts is no longer the answer — map them.
The 18 Sep ruling still governs the ordinary case: a person who is an archive row's principal figure
takes that row's bold id **even where the book names them only as an author or a literary
reference**, because the shrine descriptions are written from these books. Record only what the book
says; thin evidence still gets a Doubts line.

**(b) The inline damage marker is standing convention: do BOTH.** Mark the damaged word inline —
`[OCR?]` on tesseract/vision, `[text-layer?]` on text_layer, printed form first and your reading
after it in brackets — AND inventory the damage class once per chunk under Doubts. **One exemption:**
damage that is a *total and mechanical* mapping, such as a typographic ligature, is inventoried once
and quoted as normal letters. The test is total-and-mechanical, **not merely systematic** — qureshi's
diacritic loss was systematic but not reversible token by token, so it got the full inline treatment.

**Hinglaj HAS an id: `shaktipeeth-shri-hinglaj-mata-mandir`** (filled 21 Sep). Any older instruction
to head it `**(no id — ...)**` is obsolete and would inject a bad id. `check_note_ids.py` reports
169 rows with an id, 0 empty cells. (That row's `category` cell is still empty — RULE 2, left alone.)

**PASS 2 IS FINISHED — 23 of 23** (§9.233). Nothing is left to consolidate until one of the six
books above is fully noted. When one is, consolidate into `entries/book_takeaways/<slug>.md` per
TAKEAWAYS_PROTOCOL.md Pass 2, keep the `Reviewed: no.` line, then
`queue.py mark <slug> summarized --file entries/book_takeaways/<slug>.md`. The shape that worked on
the two 1.8 MB books is **three workers per book split by the OUTPUT document's own sections**, not
by chunk range (§9.233); one worker is proved to 950 KB.
Notes written before 21 Sep name under Doubts the row a reversal of (a) would take, so the
conversion happens at Pass 2 and no notes file needs rewriting.

### NOTES BATCH SHAPE

Claim the book → stage its chunk files, `shrine_index.tsv`, `TAKEAWAYS_PROTOCOL.md`, `toponym_map.txt`
and one already-written notes file into the container UP FRONT (device_stage_files) so **workers never
touch the desktop bridge** — it dropped 5+ times on 17-18 Sep and three times on 22 Sep, and this
mitigation is the only reason those runs survived → spend two minutes measuring the book's own damage
classes in the container and put the measurements in the worker brief (on abbas this turned eleven
rediscoveries into one measurement; on schimmel_as_through_a_veil it produced a folio rule good for
2,651 page references) → ONE subagent per missing chunk, at most 6 concurrently, all in a single
message → **COMMIT EACH WAVE BACK TO THE MAC BEFORE LAUNCHING THE NEXT**, verified with `cmp` and md5. This
is not advice. On 24 Sep wave 1's write-back was deferred because the bridge had just dropped, and
for thirteen minutes **twelve** finished files existed only in a chat tarball instead of six
(§9.235). Retry the commit while the next wave runs if you must; never batch two waves into one
write-back. Send the insurance tarball **per wave**, not per run.

**ON A FLAPPING BRIDGE, APPEND IN PIECES TO A STAGING FILE, THEN CONCATENATE IN ONE TINY CALL**
(measured 24 Sep, §9.235). A 14 KB heredoc failed twice in a row while three short ones succeeded
back to back — a long call is not more fragile per byte, it is just in flight longer, and the window
only has to close once. Build the §9 section as `docs/_APPEND_<n>.md`, verify with `wc -l`, then
`cat docs/_APPEND_<n>.md >> docs/HANDOVER.md`. The same applies to any long edit: several small
`python3 -` calls beat one big one. `unlink` is blocked, so say in your report that the staging file
must be deleted by hand.

Each worker: read the brief, TAKEAWAYS_PROTOCOL.md, shrine_index.tsv, toponym_map.txt, one abridged
calibration notes file (~12 KB: head, one archive bullet, Citable passages, Doubts) from the same or
nearest book, then its own chunk; write its own `chunk_NNN.notes.md`; nothing else, no Bash, no
re-reading. Tell it the calibration file's damage findings are LOCAL to that book.

TELL EVERY WORKER: every fact ends with a page reference like `(p. 237, folio 225)` or
`(p. 237, folio not stated)`; quote the book's own wording exactly for every date, name and place, in
the original script where it is printed AND recoverable; write "(not stated)" rather than fill a gap;
add NOTHING from general knowledge, not even a well-known death year; carry every `[OCR?]` /
`[text-layer?]` / `[illegible]` flag onto the word it was attached to; a zero-mapping chunk is a valid
result, not a failure — record it as an explicit negative.

## THIS TASK FIRES EVERY 2 HOURS AND A BATCH TAKES ABOUT ONE — A SIBLING MAY STILL BE LIVE

Cron is `22 */2 * * *` — **every two hours, ruled by Rauf on 23 September 2026** (§9.231), because
an hourly task whose batch takes about an hour overlapped its own predecessor on every firing. The
overlap is rarer now but not impossible, and a run that dies mid-batch leaves leases behind either
way, so the bookkeeping below still governs:

- **Transcription:** `queue.py lease` skips ranges another run holds and hands you the next free
  one. Never take a range that already has a live lease, and never `sweep-leases` a lease minutes
  old to free it. A lease timestamped within the last three hours belongs to somebody.
- **Notes/Pass 2:** claim with `notes_claim.py` BEFORE reading anything (see Stage B).
- If `state.json`'s `updated` timestamp is within the last few minutes, a sibling is live. Work a
  different book or a different range; do not wait for it and do not duplicate it.

## TOOLS ADDED 23 SEPTEMBER 2026 — use them, do not reinvent them

- `queue.py suppress SLUG PAGE --duplicate-of N --reason "..."` — this scan re-shoots two-page
  openings and leaves both copies in the PDF (PDF 340≡338, 341≡339, 382≡380, 383≡381 on
  tahqiqat, all four now suppressed). The suppressed page's `.txt` stays on disk; the assembled
  transcription carries a pointer instead, so one printed page is never counted twice. **Check every
  batch** with `difflib.SequenceMatcher(..., autojunk=False)` at a 0.45 threshold — autojunk ON
  returns 0.01–0.04 for true duplicates in Arabic script and hides them. Pick the survivor by
  measurement (characters read, `[illegible]` per 1,000 chars), not by assumption: on one pair the
  re-shoot was better and on the very next pair the original was.
- `queue.py folio-contest SLUG A-B --reason "..."` — record a page range whose printed folio is
  disputed. `queue.py folio-guard SLUG <files>` then **exits 1** if any file cites a folio from one.
  Run folio-guard over every notes batch. tahqiqat currently contests 341-360, 371-380 and 421-480
  (90 pages).
- `sweep-leases` now keeps any lease whose worker name starts with `HOLD` (a deliberate human hold,
  e.g. `HOLD-vsplit-index-errata` on khulasat pp. 17-38). **If you hold a range by hand, name the
  worker `HOLD-something`.**

## MEASURED GOTCHAS — do not rediscover any of these

- **CHECK THE LAST §9 SECTION NUMBER BY SORTING, NOT BY READING THE END.**
  `grep -o '^### 9\.[0-9]*' docs/HANDOVER.md | sed 's/^### 9\.//' | sort -n | tail -1`
  The file contains two §9.201s, two §9.216s and two §9.222s; the largest number is not the last line.
- **Run `python3 pipeline/book_queue/check_note_ids.py pipeline/book_queue/shrine_index.tsv <notes files>`
  over every batch. Exit 0 or fix it.** It was patched on 22 Sep: ruling (a) means a bullet head can
  carry 35 ids, which wraps, and the line-by-line version validated 3 ids while blind to 28 and still
  exited 0. **If the copy in the repo has no `logical_lines` function, it is the old blind one** —
  take the patched copy from the 22 Sep project doc. Have workers keep every id of a bullet head on
  ONE physical line regardless.
- **`toponym_map.txt` must be generated by SUBSTRING match on `location_short`, not a comma split.**
  A comma split requiring an exact token misses any row mixing the place with prose (four Lahore rows
  end `Lahore.` or `Lahore —`) and gives Lahore 31 instead of 35, Karachi 9 instead of 11.
- **`location_short` is TRUNCATED at 60 chars on 49 of 169 rows, so the ruling-(a) join is lossy.**
  Rauf ruled 22 Sep: regenerate that column at full length and re-derive the map from it. **THIS IS
  DONE and the instruction is SPENT** (verified §9.237: 45 of 169 rows now exceed 60 chars, up to 398;
  the map was re-derived 23 Sep 04:35). `darbar-malik-ahmad-ayaz` is still off the Lahore line, but
  the reason has changed — its full-length field genuinely never says Lahore. **Still do not
  hand-add it**; reach it by the person rule from `Ayaz, Mahmud of Ghazna's favorite slave`, which is
  how two workers reached it in §9.237.
- **`toponym_map.txt` HAS NO PROVINCE KEYS** — no `sind`, `sindh`, `punjab`, `balochistan`, `kashmir`
  — while ~30 rows carry Sindh in `location_short`. §9.237 measured the cost: two chunks of dense
  Sind and Punjab material reached zero archive ids. **This is Rauf's to rule (see §9.235 q.2), and
  it is the biggest single gap in the join.**
- **A chunk file over about 950 lines truncates in a single `Read`.** Tell workers on long chunks to
  finish with a second offset read rather than noting a half chunk.
- **NO FOLIO ON A SCRIBAL LITHOGRAPH MAY BE CITED FROM A SINGLE READING.** Proved on
  tahqiqat: p0380 and p0382 are the same printed page photographed twice, and the two workers who
  read it recorded its folio as **352 and as 372**. The tens digit is where this fails. Two cohorts
  on pp. 421-480 likewise split between PDF−8 and PDF−7 and the split is still unresolved; a
  glyph-shape matching test over 600 dpi crops was **inconclusive**, because between-impression
  variation in this hand exceeds the between-digit difference. Do not spend another firing trying to
  settle a folio by model reading — record it contested (`folio-contest`) and move on.
- **The cheap folio instrument:** tile eight pages' corner crops into ONE labelled image, both
  corners side by side, **1970 x 2000 px** — under the 2000 px cap on both edges, nothing
  downsampled, eight folios read per image. Sixty pages is eight images. Crop the corners from
  `pNNNN_q1.png` at native resolution (`(0,0,820,620)` and `(W-820,0,W,620)`), never from the
  full-width `_ft` strip, which is 2462 px and gets downsampled to 2000 before you see it.
  **The folio alternates corners by page parity, so always read both.**
- **Verify any derived folio or page rule against a rendered page image before briefing workers.**
  On abbas the measurement said "this book prints no folio" and the image showed one on every page.
  Four runs have now been corrected this way. Two cheap instruments: a folio is often INSIDE the
  running-header line (leading on verso, trailing on recto) rather than on its own line, and that
  gives a free self-check — **a leading folio is even, a trailing folio is odd** (340/340, zero
  violations on schimmel_as_through_a_veil). And an offset that "steps" usually steps by exactly the
  number of unpaginated pages (a plate insert), not arbitrarily.
- **Three-digit numbers split by a space (`1 10`, `12 1`) are a CORPUS-WIDE default, not a per-book
  surprise** — seen on khulasat (§9.222) and schimmel_as_through_a_veil, different scripts, different
  routes. A `\d{1,3}` regex will miss most folios. Also `8`→`B`, `0`→`o`.
- **`[blank page]` in a transcription may mean a full-page IMAGE, not an empty page.** Check with
  `pdfimages -list -f A -l B <pdf>`. Eight "blank" pages in schimmel_as_through_a_veil were the
  book's plate insert. When OCR has destroyed a structural page (an abbreviations key, a contents
  page), re-render that one page and read it as an image rather than declaring the content lost.
- **Index and endnote locators are routinely destroyed** (the reference `n` rendering as `0`/`"`/`}`,
  the `/` inside a locator vanishing). **No index or endnote locator may ever become a `(p. N)`.**
  Cite the PDF page the entry is printed on.
- `state.json`'s `pdf_path` drifted on 34 of 42 books (repaired 18 Sep). Use
  `python3 pipeline/book_queue/resolve_pdf.py --slug <slug>`; it exits non-zero if any path is stale.
- `pdf_sha256_head` is sha256 of the FIRST 1 MB truncated to 16 hex chars (`queue.py:256`) — a
  whole-file hash looks exactly like the runbook's stop-and-ask condition. Read the function before
  reporting a mismatch.
- **PATH TRAP (§9.195):** `out/` is gitignored, so notes live in the COMMITTED location
  `entries/book_takeaways/<slug>/chunk_NNN.notes.md`, while `notes-status` and `compile_findings.py`
  read `out/ocr/<slug>/chunks/`. **Write every new note into BOTH**, and copy committed notes into
  `out/` before trusting notes-status. One directory is deliberately outside this rule:
  `entries/book_takeaways/abbas_female_voice_sufi_ritual/_superseded_collision_2026-09-20/` holds the
  losing side of the 20 Sep collision — never copy it into `out/`, two notes files for one chunk in a
  scanned location would double-count the book.
- **CHUNKS ARE NOT IN GIT.** Most remaining books record a chunk count in state.json with zero chunks
  on disk; `notes-status` prints a warning and `chunks_ok: false`. The remedy is NOT to re-transcribe:
  run `queue.py chunk <slug> --words N` with the N in that book's own state.json log line (English
  books 8000), then copy any committed notes back into `out/`. Wrong N means new notes will not line
  up with existing ones.

## DO NOT RUN GIT ON THE MAC
`unlink` is blocked in the connected folder, so `git add` dies with a bus error and even
`git status --porcelain` fails. Do not work around it, and do not request delete permission (refused
16 Sep). Leave new files uncommitted and say in your report that Rauf must run
`git add -A && git commit` himself. Never push.

## THREE HOLDS ARE RAUF'S — do not restart, do not re-litigate
tahqiqat_chishti's rendering limits; the four wasif_* books, held on a third-party rights notice;
masnavi_01, skipped (masnavi_01_text is the live one).

## BEFORE FINISHING, ALWAYS — RULE 0, the whole point of the queue
- **Write every new file back into the repo ON THE MAC** with device_commit_files, or directly with
  device_bash (plain writes work; only deletes are blocked). A file left only in the cloud container
  is lost when the session ends.
- **If the bridge is down, do not idle on it**: keep launching work, hold output in the session
  outputs, tar it, SendUserFile the tarball so Rauf has it, and write the run record with exact
  recovery paths and md5s to the attached project. Retry the write-back; the Mac is on `caffeinate`.
  If it never comes back, say plainly in the report that the work is NOT in the repo and name the
  exact hazard (a later firing re-doing it).
- `notes_claim.py release <slug> --session <id>` when the book is done or you stop early, confirmed
  with `status`. Transcription: release or let leases be swept.
- Mirror `pipeline/book_queue/state.json` to the Mac if you changed it.
- **Append a dated section to `docs/HANDOVER.md` §9** — after checking the last number by sorting —
  recording what this run did and found, and verify with `wc -l` before and after. A run that
  finishes the work and writes no §9 section has half-failed: werbner_basu was noted 15/15 on 20 Sep
  and left no record, so the next run had to rediscover it was done.
- Write a run record to the attached project as `shrines/NN_Cloud_OCR_Run_<date>_<slug>.md`,
  continuing the existing numbering (the last is 31).
- Report: pages transcribed or chunks noted, books consolidated, what is next, that the work is
  uncommitted and needs Rauf's own commit, and everything a human must check — every numeral, name or
  date the workers flagged.

If a model limit ends the run mid-batch that is expected and fine — the queue is file-checkpointed
and the next firing picks up from `queue.py status` / `notes-status`. Never redo a page that already
has a `pNNNN.txt` or a chunk that already has a notes file.