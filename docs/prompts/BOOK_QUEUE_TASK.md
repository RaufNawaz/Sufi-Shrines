# Book-queue task instructions — Sufi-Shrines cloud OCR

**This file IS the scheduled task's prompt.** The task `Sufi-Shrines book queue — transcription +
notes (hourly)` carries only a short bootstrap that reaches this repo and then reads this file, so
that these instructions are versioned, diffable, and editable by any session without touching the
scheduled task (CLAUDE.md RULE 0 — prompts written for agents live in `docs/prompts/`).

**Editing this file changes what every future firing does.** Keep it accurate and keep it dated.
Last substantive change: 9 October 2026, afternoon (§9.276: `tahqiqat_chishti` FULLY NOTED 79/79 — 025-060 were written by an unrecorded sibling and verified by script, 061-079 noted; next notes = Pass 2 on tahqiqat_chishti; next transcription unchanged = khulasat 497-610). Before that, 9 October 2026 (§9.273: khulasat 489-496 transcribed, 496/610; next transcription = 497-610). Before that, 8 October 2026, later still (Rauf's SCOPE ruling, see the box below: the queue is now 31 books; the six Masnavi files are HELD and marked `skipped` in `state.json`; transcription finishes khulasat only; then notes and integration of the 31, then the consolidated import, then stop). Before that, 8 October 2026, late (§9.269: khulasat 481-488 transcribed, 488/610; next transcription = 489-610; p0487's scan crops the right margin of the text block). Before that, 8 October 2026 (Integration stage merged in from `docs/prompts/INTEGRATION_BRIEF.md`: the notes turn of the alternation now runs integration, transcription is unchanged, and the notes stage's book selection is removed). Before that, same day (§9.268: khulasat 473-480 transcribed, 480/610; next transcription = 481-610; the request limit blanked >200 image reads and every blind draft needed 5-15 word corrections on re-read — the §9.264 re-read is mandatory). Before that, same day (§9.267: province-section clean-up FINISHED — boivin quote check clean, boivin A/B halves de-duplicated (3 merges), sorley/hadeeqat/tareekh_lahore had no A/B duplicates; the notes stage has NO queued work, so a notes-turn firing transcribes instead; next transcription unchanged = khulasat 473-610). Before that, same day (§9.266: khulasat 465-472 transcribed, 472/610; next transcription = 473-610; next notes unchanged from §9.265). Before that, same day (§9.265 — sorley province-section quotations re-flagged, 51 edits; next notes = de-duplicate the merged A/B province halves of sorley, boivin, hadeeqat, tareekh_lahore, then transcribe; next transcription unchanged = khulasat 465-610). Before that: 7 October 2026 (§9.264 — khulasat 459-464 transcribed, 464/610; next transcription = 465-610; after any `[media removed]` streak the COORDINATOR's own drafts are blind too — re-read before commit). Before that, same day (§9.263 — province sweep FINISHED 29/29; khulasat 458/610 after §9.262's pages were restored from the project). Before that, same day (§9.259 — PROVINCE SWEEP batch 2 done on sorley, boivin, schaflechner, abbas, kasmani: 15 of 29 swept; next notes = the nine remaining English books, and tell workers NO silent repair inside quotations — sorley had ~60). Before that, same day (§9.258 — khulasat 441-448 transcribed, 448/610; a dead 5 Oct firing left 435-440 unrecorded; the request limit now hits the COORDINATOR too, so verify each page against an image still in view; next transcription = re-read 441/442/446/447, then 449-610). Before that: 5 October 2026 (§9.257 — PROVINCE SWEEP batch 1 done on 5 books; brief `pipeline/book_queue/PROVINCE_SWEEP_BRIEF.md`; next notes = the next 5-6 books of the sweep). Before that, same day (§9.256 — khulasat 429-434 done, 434/610; subagent image workers unreliable even singly). Before that: 4 October 2026 (§9.255 — Pass 2 on nizami_revised_translation DONE, 29 books summarized, every transcribed book consolidated; next notes = the PROVINCE SWEEP over the older takeaways). Before that, same day (§9.254 — khulasat 417-428 transcribed, 428/610, 405-416 folios verified; CONCURRENCY CUT TO ONE image worker at a time — two hit the request limit 2/2 at 19 images a page; next transcription = khulasat 429-610). Before that, same day (§9.253 — nizami_revised_translation FULLY NOTED 13/13; next notes = Pass 2 on it, then the province sweep; an unrecorded transcription firing wrote khulasat 405-416 at 07:17Z — next transcription verifies those, then 417-610). Before that, same day (§9.252 — khalid_in_search_of_shiva SUMMARIZED; next notes = Pass 1 on nizami_revised_translation). Before that, same day (§9.251 — khulasat 363-404 transcribed, book at 404/610; next transcription = khulasat 405-610; CONCURRENCY CUT TO TWO image workers — five hit the request limit 5/5). Before that: 3 October 2026 (§9.250 — khalid_in_search_of_shiva fully noted 9/9; next notes = Pass 2 on it). Before that, same day (§9.249 — tahqiqat_chishti 811-873 transcribed, BOOK DONE 873/873; next transcription = khulasat 363-610; "media removed" measured as a request limit — at most FIVE concurrent image workers). Before that, same day (§9.248 — Pass 2 on khalid_a_white_trail DONE, 27 summarized; next notes = Pass 1 on khalid_in_search_of_shiva). Before that, same day (§9.247 — tahqiqat 751-810 transcribed, book at 810/873; next transcription = tahqiqat 811-873, which finishes it). Before that: 29 September 2026 (§9.246 — khalid_a_white_trail fully noted 13/13; next notes firing = Pass 2 on it). Before that, same day (§9.245 — khulasat 17-48 done; next transcription = tahqiqat 751-780). Before that, same day (§9.243 — walking_with_nanak summarized; province sweep queued). Also §9.242 — three rulings: provinces (c), orthography as printed, khulasat 17-48 via split render first).
Before that: 27 September 2026 (§9.241 — walking_with_nanak fully noted, Pass 2 on it is next).
Before that: 26 September 2026 (§9.239 — schimmel_mystical_dimensions_of_islam is
CONSOLIDATED, 24 of 24 books, so the notes stage is back to PASS 1 on the five remaining books; the
481-540 hold is RELEASED and being re-transcribed; 751-780 is confirmed LOST; step 1/2 now also
checks the attached project for a pending HANDOVER section).
Before that: 24 September 2026 (§9.237 — schimmel_mystical_dimensions_of_islam
FINISHED 29/29 and the notes queue re-pointed at Pass 2 on it; the back-matter map corrected by
29 pages; the location_short instruction retired as spent; the province-key gap recorded).
Before that, same day: §9.235 (schimmel started and its structure recorded, the per-wave write-back
rule hardened, the flapping-bridge append technique added). Before that, same day: §9.234 (masnavi-calibration and Pass-2-first
paragraphs retired as spent, transcription front re-measured, notes queue re-pointed at Pass 1,
cadence corrected to every 2 hours); 23 September 2026 (alternation ruling, masnavi calibration,
duplicate suppression and contested folios).

---

> **SCOPE, ruled by Rauf on 8 October 2026. The queue is 31 books, then it stops.**
>
> - **Transcription covers `khulasat_ut_tawarikh` only** (488/610 on 8 October). Finish it.
> - **The Masnavi set is HELD**: `masnavi_01_text` and `masnavi_02` to `masnavi_06`. They are marked
>   `skipped` in `state.json`, and each one's log line says what its status was and how to restore it
>   (`masnavi_02` keeps its pages 1-30). Do not lease, render, calibrate or transcribe any Masnavi
>   page, and do not change those statuses. `masnavi_01` and the four `wasif_*` books stay skipped as
>   before. So 11 of the 42 books are out of scope and 31 are in.
> - **Notes and integration cover the 31**: the 29 already `summarized`, plus `tahqiqat_chishti` and
>   `khulasat_ut_tawarikh` once each is noted. Notes come before integration (Integration stage).
> - **Once khulasat is fully transcribed, the transcription stage has no work.** From then on every
>   firing takes the notes turn (notes if a book is waiting, otherwise integration) and writes
>   `Stage: notes` as its §9 first line. If a live notes claim already exists, stop rather than start a
>   second notes or integration run: two integrations at once can append to the same shrine entry.
> - **The final database waits for all 31.** Build the consolidated import only when every one of the
>   31 books is `integrated`, not merely every book that happens to be `summarized` at the time. The
>   Masnavi set is not part of it.
> - **When the import is built, the queue is DONE.** Say so in the report and stop. Never start the
>   Masnavi set without a new ruling from Rauf.

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

**STEP 2 IS BLIND TO A FIRING THAT LOST ITS BRIDGE — check the attached project too** (added
26 Sep 2026, §9.239). A firing whose bridge drops before it can append writes its section into the
attached project instead, as `shrines/NN_HANDOVER_section_to_append_<date>_<n>.md`. **If one of
those is newer than the last `### 9.` section in the file, THAT firing is the previous one** — it
happened on 25 September and step 2 would have sent the next firing to the same stage twice.
**Append the pending section first** (re-check the max number by sorting; renumber if taken), then
read step 2 off the file as usual.

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
(Since 8 October 2026 the only book left to transcribe is `khulasat_ut_tawarikh`; see SCOPE above.)

**THE NOTES TURN NOW RUNS THE INTEGRATION STAGE** (Rauf, 8 October 2026; brief kept verbatim at
`docs/prompts/INTEGRATION_BRIEF.md`). Steps 1 and 2 above are unchanged: wherever they say this firing
does notes or Pass 2, run **Integration stage** below instead, **except that notes come before
integration** (Rauf, 8 October 2026): if any book is `transcribed` and not yet `summarized`, the notes
turn runs STAGE B on it first. Integration claims its book with `notes_claim.py`, so a live
integration claim is a live notes claim for step 1. Transcription firings carry on exactly as before.

## STAGE A — TRANSCRIPTION (run this on a transcription firing; see the alternation rule above)

**SUPERSEDED 8 October 2026 by the SCOPE box at the top: transcription now covers `khulasat_ut_tawarikh`
only, and the Masnavi rows in the table below are HELD.** The 17 September goal follows for the record.
GOAL (Rauf, 17 Sep 2026): every book except the 5 skipped (four wasif_* and masnavi_01) reaches at
least `transcribed`. **Outstanding, re-measured 24 September 2026 from `queue.py status` —
2,895 pages left, all route=vision.** Take the next free range down this list:

> **THE TABLE BELOW IS STALE AS OF 26 SEPTEMBER 2026 (§9.239) — trust `queue.py status`, not it.**
> `tahqiqat_chishti` reads **690/873**, not 600: the 25 Sep run's pp. **721-750 were on disk all
> along** and were only recorded when `queue.py check` finally ran on 26 Sep. Its **751-780 are
> LOST** (written by no one; the recovery tarball is not in `~/Downloads`) and must be
> re-transcribed. **The 481-540 HOLD was RELEASED on 26 Sep at 21:09Z** when its deadline passed,
> and that range was leased for re-transcription the same minute. Outstanding on this book:
> **481-540 (in progress), 751-780 (lost), 781-873 (untouched).** The next transcription firing
> should re-measure and rewrite this table rather than trusting either version.

    prio  slug                    done/pages   free ranges
      30  tahqiqat_chishti          600/873    661-873  (481-540 is a HOLD, see below)
     190  khulasat_ut_tawarikh      330/610    411-610  (17-38 is a HOLD)
     201  masnavi_01_text             0/416    all
     202  masnavi_02                 30/366    31-366
     203  masnavi_03                  0/462    all (`ingested`)
     204  masnavi_04                  0/374    all (`ingested`)
     205  masnavi_05                  0/432    all (`ingested`)
     206  masnavi_06                  0/542    all (`rendering`)

**RULINGS OF 29 SEPTEMBER 2026 (§9.242), Rauf in chat:**
- **DONE 29 Sep 2026 (§9.245) — khulasat 17-48 transcribed, 32/32, book at 362/610. THIS BULLET IS SPENT.**
  **UPDATE 4 Oct 2026 (§9.254): 405-416 VERIFIED (folios, duplicates; seam check not done) and 417-428 DONE (428/610). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 429-610, ONE image worker at a time, run sequentially. The §9.253 line below is SPENT.**
  (SPENT:) **UPDATE 4 Oct 2026 (§9.253): khulasat 405-416 were written at 07:17Z by a firing that left NO record. Before taking 417, verify 405-416 (folios = 589 − PDF on all 12, duplicate sweep, band-seam check per §9.251); then 417-610.**
  **UPDATE 9 Oct 2026 (§9.273): khulasat is at 496/610 (489-496: the dice game, the exile, Kurukshetra, the first days of the war). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 497-610 (re-render bands). The request limit blanked the first ~70 image reads; the five pages drafted then were re-read band by band before commit. p0490 is right-cropped like p0487. Still owed: p0446's year, 435-440, 411-416. The §9.269 line below is SPENT.**
  **UPDATE 9 Oct 2026 (§9.269): khulasat is at 488/610 (481-488: Vyasa, Yudhishthira's reign, the Ashvamedha, the war's aftermath). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 489-610 (re-render bands). The request limit again blanked the first ~60 image reads; the five pages drafted then were re-read band by band before commit. Still owed: p0446's year, 435-440, 411-416. The §9.268 line below is SPENT.**
  **UPDATE 8 Oct 2026 (§9.268): khulasat is at 480/610 (473-480 are the Parikshit / Takshaka story, the Pandava reign totals on p0478 and the four yugas on p0480). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 481-610 (re-render bands). The request limit blanked more than 200 consecutive image reads this run; all 8 pages were drafted blind, then re-read band by band once images displayed, and the re-read corrected 5-15 words on EVERY page — never commit a page drafted during a `[media removed]` streak without that re-read. Still owed: p0446's year, 435-440, 411-416. The §9.266 line below is SPENT.**
  **UPDATE 8 Oct 2026 (§9.266): khulasat is at 472/610 (465-472 are the Janamejaya / snake-sacrifice narrative). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 473-610 (re-render bands). The request limit again blanked the first ~25 images; pages drafted then were re-read before commit (§9.264 rule held). `folio-check` flags every page of this book as a minority offset because the scan runs back to front, so ignore it and compare against `589 − PDF`. The §9.264 line below is SPENT except its owed re-reads.**
  **UPDATE 7 Oct 2026 (§9.264): khulasat is at 464/610 (459-464 are the raja king-lists). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 465-610 (re-render bands). Still owed: p0446's year, 435-440, 411-416. `device_commit_files` silently failed to overwrite two already-committed pages this run (reported `written`, md5 unchanged) — ALWAYS md5 the Mac copy after a commit, and if it differs edit in place with device_bash.**
  **UPDATE 7 Oct 2026 (§9.258): khulasat is at 448/610. THE NEXT TRANSCRIPTION BATCH: first re-read 441, 442, 446, 447 band by band (not fully re-verified — the request limit hit the coordinator), then `khulasat_ut_tawarikh` 449-610. 435-440 were written by a firing that left no record; re-read their wording when time allows. The §9.256 line below is SPENT except its re-read of 411-416.**
  (SPENT:) **UPDATE 5 Oct 2026 (§9.256): khulasat is at 434/610. THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 435-610.** Subagent image workers hit `[media removed: request limit]` even ONE at a time and then compose pages blind while reporting the images displayed; the coordinator reading the `_r/_l` halves itself got every image first try. So: coordinator reads, or coordinator spot-checks every worker page against one half-image before commit. Also re-read 411-416 (w2 admitted blind first drafts).
  **UPDATE 4 Oct 2026 (§9.251): khulasat 363-404 DONE (404/610). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 405-610**, brief `pipeline/book_queue/KHULASAT_BODY_WORKER_BRIEF.md`, at most TWO image workers. (SPENT, §9.249:)
  **UPDATE 3 Oct 2026 (§9.249): `tahqiqat_chishti` IS TRANSCRIBED, 873/873. THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 363-610.** (SPENT, §9.247:) 751-810 DONE (810/873); next was `tahqiqat_chishti` 811-873, ~~751-780 (LOST — re-transcribe), then 781-873,~~
  then khulasat 363-610. Note from §9.245: the midline `render_panels.py` split was measured WRONG for
  that index (PDF 17-24 are three-column; the rule wanders 0.43-0.58) and `render_overlap_panels.py`
  was used instead — use it for any other index/table pages. Original ruling text follows:
  ~~khulasat_ut_tawarikh pp. 17-48 (index + errata): DO THEM, with the split render.~~ Release
  `HOLD-vsplit-index-errata`, render with `pipeline/book_queue/render_panels.py --panels 2 --bands 4`
  (~8 images a page; pp. 39-48 have no full-page PNG yet — render them first), and transcribe as
  their own batch. **This is the FIRST transcription batch from now**, ahead of tahqiqat 751-780.
  Index folio numbers are the whole point of those pages: every digit `[OCR?]` unless certain.
- **Orthography: transcribe AS PRINTED, normalise later** (the dotted final nūn `مین/نہین`). Now in
  WORKER_PROTOCOL.md; tell every worker.
- **Provinces: ruling (c)** — see the province gotcha below and TAKEAWAYS_PROTOCOL.md.

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

**CONCURRENCY — RE-MEASURED AGAIN §9.254 (4 Oct 2026): ONE image-reading worker at a time.** Two concurrent workers at 19 images a page (bands + halves + `_ft` + seam strips) hit the request limit 2 of 2 and both drafted blind; one worker alone hit it 0 of 1. (Superseded: ~~§9.251 at most TWO~~:) Five concurrent hit `[media removed: request limit]` 5/5, three hit 2/3, two hit 0/2. Every worker that hit the limit drafted pages blind before its images loaded, despite a hard-gate prompt; fresh re-reads showed those self-corrected files at 0.976-0.994 similarity, so they are usable, but the cheaper fix is fewer workers. (Superseded: ~~§9.249 at most FIVE~~.) Six concurrent workers hit
`[media removed: request limit]` on four of six (even at 6 pages each); five hit none. Tell every worker to sleep and
retry on "media removed" and to leave a page unwritten rather than write it blind.

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

## Integration stage (run this on the firing that used to do notes; see the alternation rule above)

**Added 8 October 2026 from Rauf's brief, kept verbatim at `docs/prompts/INTEGRATION_BRIEF.md`.**
Steps 1 and 2 of the alternation (sibling check, then the last HANDOVER §9 entry) are unchanged: a
firing that would have done notes or Pass 2 now does integration. Transcription firings carry on
exactly as before. Every rule, gotcha and hold elsewhere in this file still applies. Where the brief
below meets an older rule, the older rule wins; those places are listed at the end of this section,
followed by Rauf's rulings of 8 October 2026, which also govern this stage.

**NOTES BEFORE INTEGRATION** (Rauf, 8 October 2026). Before step 1 below, run `queue.py status`. If
any book is `transcribed` and not yet `summarized` (skipped books excepted), this firing does STAGE B
on the first such book in `queue.py next` order: Pass 1 on its missing chunks, then Pass 2 once it is
fully noted. Integrate only when no such book is waiting. On 8 October 2026 that book is
`tahqiqat_chishti` (873/873 transcribed, no notes), and `khulasat_ut_tawarikh` joins it when its
transcription finishes.

### Scope for now: shrine entries only

The job for now is to build `shrine_entries/` into the full cited record for every shrine the books
touch. **Do not draft or propose any `Description` cell text.** How descriptions get rebuilt from the
entries (extended or rewritten) is still undecided, so that step waits for Rauf's ruling.

### Standing rules (unchanged, restated so a fresh session cannot miss them)

- **RULE 2.** A fact enters a shrine entry only with its book slug and folio (`[slug, p. N]`). Sources
  that disagree are written up as disagreeing, side by side, and are never reconciled. `[OCR?]` and
  `[illegible]` markers are carried through unchanged.
- **RULE 3.** The Google Sheet is never written. Every change to the sheet goes out as a CSV patch in
  `data/review/` for Rauf to import.
- **RULE 4.** Any count you report must come from a script that reads the files, never from worker
  prose.
- **RULE 5.** A scheduled run cannot ask in chat, so any item that needs a decision is **skipped**, not
  guessed at, and listed under "Needs Rauf" in the run record.

### One firing = one book

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

### Held items: skip these and list them every time they come up

- `langer-makhdoom` shrine identity; whether `shah-chiragh` conflates two men.
- The two Shah Inayats (`shrine-of-shah-inayat-qadiri` and `dargah-roza-sufi-shah-inayat-shaheed`).
- `shrine-of-pir-mangho` and Bava Gor; "Shams" in Shackle and Rafat; Waris Shah's Jalal/Jahanian split.
- Bulleh Shah's death year (1757 vs 1758 vs 1754), until Rauf rules on it.
- Any id that is absent from `src/data/shrines-fallback.json` (Hinglaj, until its id cell is
  imported): write the entry section, but propose no cells for it.

### The final database (only once every summarized book is integrated)

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

### Where the brief meets an older rule, the older rule wins

- **§9 first line.** The alternation's rule allows only `Stage: transcription` or `Stage: notes`, and
  step 2 reads that line. An integration firing is the notes turn, so it writes `Stage: notes` and may
  add `(integration)` after it. It never writes a bare `Stage: integration`.
- **Citations.** RULE 2 above asks for `[slug, p. N]` with a folio. The older rules stand: a fact keeps
  the page reference the takeaways give it, `(p. N, folio M)` or `(p. N, folio not stated)`, and
  `folio not stated` is a valid reference, not a reason to leave the fact out; no index or endnote
  locator ever becomes a `(p. N)`; no folio on a scribal lithograph is cited from a single reading,
  and a folio that `queue.py folio-guard` reports as contested stays contested.

### Rulings of 8 October 2026 (Rauf, in chat)

- **Province material goes into every entry in that province.** Step 3 above takes only bullets headed
  by shrine ids, and province bullets carry none, so take them separately: each bullet under the
  book's `## Province-level material` / `### province: <key>` is appended to the entry of every row
  that `shrine_index.tsv` tags with that `province`, inside the book's `## From <Author, Short title>`
  section, keeping its stated period and page reference unchanged. Ruling (c)'s timeline discipline
  still governs, and its Pass 2 line "Do not copy them under each row" still governs the takeaways
  files themselves; it does not apply to shrine entries.
- **Entries are keyed by id.** Every entry is `shrine_entries/<id>.md`. The 37 older title-named entries
  were renamed to their ids on 8 October 2026 (map in `scripts/data/build-content-provenance.mjs`'s
  Tier 1 / Tier 2 table), so an id's existing entry is always `shrine_entries/<id>.md`. Never create a
  second entry for the same shrine, and never name a new one any other way.
- **Notes before integration**: see the paragraph at the top of this section.
- **The final database waits for all 31 books** (SCOPE box at the top). Where the brief above says
  "only once every summarized book is integrated", read "only once all 31 in-scope books are
  integrated": khulasat and tahqiqat must be noted and integrated first.

## STAGE B — NOTES AND PASS 2 (run this on a notes firing; Pass 2 first)

**The notes turn comes here only when a book is waiting for notes** (8 October 2026): a book that is
`transcribed` and not yet `summarized` gets Pass 1, then Pass 2, before any integration; otherwise the
notes turn runs the Integration stage above. This section's old book selection has been removed. Its
claim rules, mapping rulings, batch shape and the carried-over rules below still govern this work and
integration's claim.

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

### Rules carried over from the retired notes queue (book selection removed 8 October 2026)

Each item is quoted from the queue line it sat in; only that line's choice of the next book is gone.

- (§9.239) §9.233's three-workers-split-by-OUTPUT-section shape held unmodified at the corpus's largest book; `pipeline/book_queue/pass2_hedges.py` is now committed and is the first thing to run after `pass2_extract.py` on any future Pass 2.
- (§9.265, de-duplicating merged A/B province halves) a judgement prune, keep every distinct page ref
- (§9.263) A pending HANDOVER section in the project means: restore its pages first, verify md5s on the Mac, append it, THEN `queue.py check`.
- (SPENT, transcription pointer superseded by STAGE A's §9.268 line, carried verbatim:) **Transcription (§9.262/§9.263): khulasat is at 458/610 — next is 459-610 (re-render bands), then re-read p0446's year, 435-440 and 411-416.**
- (§9.259) **Add to every worker prompt: no silent repair inside a quotation — printed form, then `[text-layer?] [reading]`** (sorley: ~60 quotes had text-layer noise silently cleaned; the letters-only containment check in §9.259 finds them).
- (§9.259) **`device_stage_files` refuses a tarball freshly written by `tar czf` as "hardlinked (nlink > 1)" — `cat a > b` and stage b.**
- (§9.257) `## Province-level material` (spliced before `## Cross-cutting material`). Sweep method: one text-only worker per book, staged as ONE tarball; Urdu vision books last (`سند` is also "chain of transmission"); eaton has NO chunks on disk — `queue.py chunk` first. Find unswept books with `grep -L '^## Province-level material' entries/book_takeaways/*.md`. **Commit big files to the Mac in batches of ≤3 — a 12-file commit timed out at 190 s on a flapping bridge.**
- (§9.255) one Grep-the-chunks worker per book, template = §9.243 worker D. On any text_layer Pass 2, measure silent OCR repairs inside quotations against the chunk source first (§9.255).
- (§9.253, nizami_revised_translation Pass 2) brief: `pipeline/book_queue/NIZAMI_CHAHAR_MAQALA_WORKER_BRIEF.md` + §9.253; one worker, 147 KB; only two archive joins — Ayaz and the Lahore group; quote OCR-damaged words as printed
- (§9.250) **A claim that expired with no §9 section is a dead sibling — look for its brief in `pipeline/book_queue/` before re-measuring** (§9.250). khalid_in_search_of_shiva brief: §9.250 + `pipeline/book_queue/KHALID_SHIVA_WORKER_BRIEF.md`; one worker suffices, 205 KB of notes.
- (§9.246, khalid_a_white_trail) no printed folios, `(p. N, folio not stated)` throughout; informant names may be pseudonyms per p. 15; heavy 35-id Lahore group; person rule applied widely, weigh the bare wall-picture mentions; judgement mappings listed there
- (§9.244, dhillon_janamsakhis) no folio rule — cite only folios read on the page; apply the 7 Nankana rows to Talwandi in chunks 001–005 per p. 175; Saidpur stays unmapped
- (§9.241, khalid_walking_with_nanak) folio −18 / plate insert PDF 165–172 / −26; the sikhbookclub.com stamp; Saidpur = Eminabad; the same-name-different-site traps; Talwandi mapped inconsistently across chunks

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

FULLY NOTED — do not re-note: sorley_shah_abdul_latif_of_bhit (24), schimmel_pain_and_grace (16),
shackle_bulleh_shah_sufi_lyrics (7), rafat_bulleh_shah_selection (4), waris_shah_hir_ranjha (7),
madho_lal_hussein_verses_lowly_fakir (3), kugle_sufis_and_saints_bodies (22),
ernst_lawrence_sufi_martyrs_of_love (17), rizvi_history_of_sufism_india_1 (28),
kasmani_queer_companions (12), boivin_hindu_sufis_south_asia (13), schaflechner_hinglaj_devi (19),
werbner_basu_embodying_charisma (15), abbas_female_voice_sufi_ritual (11),
qureshi_sufi_music_qawwali (15), rozehnal_islamic_sufism_unbound (18),
schimmel_as_through_a_veil (16).
SUMMARIZED (Pass 2 done): schimmel_mystical_dimensions_of_islam, sawaneh_shah_jamal, hadeeqat_ul_aulia, tareekh_lahore,
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

**PASS 2 IS FINISHED — 24 of 24** (§9.233, extended by §9.239). Nothing is left to consolidate
until one of the five books above is fully noted. When one is, consolidate into `entries/book_takeaways/<slug>.md` per
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
  Sind and Punjab material reached zero archive ids. ~~This is Rauf's to rule~~ **RULED 29 Sep 2026 (§9.242) as ruling (c): every row now carries a
  `province` tag and `province_map.txt` exists; province material goes under `## Province-level
  material` with its PERIOD stated — read TAKEAWAYS_PROTOCOL.md (c) before noting anything.**
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
**A fourth since 8 October 2026: the whole Masnavi set** (`masnavi_01_text`, `masnavi_02` to
`masnavi_06`), held by Rauf's SCOPE ruling and marked `skipped` in `state.json`. Do not restart it.

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