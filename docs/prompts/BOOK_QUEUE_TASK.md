# Book-queue task instructions — Sufi-Shrines cloud OCR

**This file IS the scheduled task's prompt.** The task `Sufi-Shrines book queue — transcription +
notes (hourly)` carries only a short bootstrap that reaches this repo and then reads this file, so
that these instructions are versioned, diffable, and editable by any session without touching the
scheduled task (CLAUDE.md RULE 0 — prompts written for agents live in `docs/prompts/`).

**Editing this file changes what every future firing does.** Keep it accurate and keep it dated.

**READ THIS FIRST (Rauf, 26 October 2026): THE WORKING REPO HAS MOVED to Rauf's Windows PC, `C:\Users\g16\Desktop\Shrines Project` (in device_bash it mounts at "$HOME/mnt/Shrines Project"). Never write into Google Drive's `G:\Other computers\...` backup of the Mac: files written there from the PC were wiped by the Mac's next sync. See the 26 OCTOBER box just above the ORDER box.**

**READ THIS FIRST (Rauf, 24 and 25 October 2026): every firing now runs the PUBLIC DESCRIPTION stage, resuming wherever the last firing stopped, until `public_description_queue.py status` shows every row `done` or `rauf`. See the 25 OCTOBER box just above the ORDER box, and `docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md` (binding).**
Last substantive change: 26 October 2026, ~19:30Z (interactive: the working repo moved to the PC copy `C:\Users\g16\Desktop\Shrines Project`, brought up to date for the public description stage; 26 rows done; new §9 sections on the PC are numbered from 9.400; see the 26 Oct box). Before that, 25 October 2026, ~04:30Z (§9.382, interactive, RAUF'S RULING of 24 October: the rewritten Descriptions read like an encyclopedia; they stay as the TEAM version and every row gets a PUBLIC version, English and Urdu, through three verifiers; this is now the FIRST stream of every firing and pauses the tag-file step; brief `docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md`; see the 25 Oct box above the ORDER box). Before that, 24 October 2026, ~22:10Z (§9.381: Sorley tag file COMPLETE and BUILT, 47/47 — 2 rows (Shaikh Patta and Pir Murad, both Tatta; Pir Murad flagged against `lal-shahbaz-qalandar`), 0 joins, 4 figures, 41 skips; next = tag file of `schimmel_pain_and_grace`; see the 24 Oct box). Before that, 23 October 2026, ~19:00Z (§9.380: Shackle Risalo tag file COMPLETE and BUILT, 117/117 — 0 rows, 1 join (Hinglaj → `shaktipeeth-shri-hinglaj-mata-mandir`; the takeaways' Doubts 1 "no id" is stale, the rest of its Hinglaj material is not in the entry, asked of Rauf), 3 figures, 113 skips; next = tag file of `sorley_shah_abdul_latif_of_bhit`; see the 23 Oct ~19:00Z box). Before that, 23 October 2026, ~03:05Z (§9.379: Tazkirah tag file COMPLETE, 263/263 — full dry run exit 0: 1 row (Mulla Shah, Lahore), 4 joins, 64 figures, 194 skips; NOT built for real, the row's Location would be blank (§9.375 Q1); next = tag file of `shackle_risalo_shah_abdul_latif`; see the 23 Oct ~03:05Z box). Before that, 23 October 2026, ~00:50Z (§9.378: Tazkirah tag file STARTED — pp. 1-210 tagged, 135 of 263 items: 0 rows, 2 joins, 39 figures, 94 skips; `#location` blank on purpose; next = its pp. 211-392, 128 items; see the 23 Oct box). Before that, 21 October 2026, ~19:15Z (§9.377: Tahqiqat tag file — People 2467-2563 tagged, 522/570: 0 rows, 6 joins (3 in-book), 2 figures, 86 skips; dry run 176 rows / 110 joins / 7 figures / 224 skipped; only Places outside Lahore is left and it waits on §9.375 Q1, so next = tag file of `tazkirah_awliya_pak_o_hind`; see the 21 Oct box). Before that, 20 October 2026, ~21:15Z (§9.376: Tahqiqat tag file — Muslim saints 2126-2238 tagged, the whole subsection done, 428/570; dry run 176 rows / 107 joins / 5 figures / 138 skipped; four more OUTSIDE-LAHORE skips; see the 20 Oct ~21:15Z box). Before that, 20 October 2026, ~17:05Z (§9.375: Tahqiqat tag file — Muslim saints 1987-2122 tagged, 331/570; dry run 135 rows / 81 joins / 2 figures / 112 skipped; OUTSIDE-LAHORE skips asked of Rauf; see the 20 Oct ~17:05Z box). Before that, 20 October 2026, ~01:50Z (§9.374: Tahqiqat tag file — Mosques 40 and secular 55 tagged, 195/570; dry run 78 rows / 39 joins / 77 skipped; see the 20 Oct box). Before that, 19 October 2026, ~17:10Z (§9.373: the §9.346 refresh list re-measured on the 18d snapshot — 11 of 20 `data:validate` steps fail after a `data:build`; publication-safety false positives FIXED in the check; 48 KG quote re-anchors proposed in `data/review/KG_QUOTE_REANCHOR_2026-10-19.tsv`; next = Tahqiqat tag file, see the box). Before that, 19 October 2026, ~04:45Z (§9.372: ORDER-box step 3 begun — `sawaneh_shah_jamal` tagged, 0 rows; `tahqiqat_chishti` tag file STARTED, 100/570 items, multi-firing, see the 19 Oct box). Before that, 18 October 2026, ~23:10Z (§9.371: as-printed sweep of the VERSE paragraphs read — `data/review/AS_PRINTED_READINGS_2026-10-18_verse1.tsv`, 41 lines, a proposal, nothing applied; ruling 14 has no unread work left; next = ruling 16 alternation, see the box). Before that, 18 October 2026, ~21:25Z (§9.370, interactive: Urdu out of the prose DONE for all 80 rows; import snapshot `data/import_2026-10-18d.csv`; citation locator حاشیہ N written "note N", mapped in both checkers). Before that, 18 October 2026, ~20:45Z (§9.369, interactive: Rauf withdrew the `> ` blocks — prose English only, Urdu only as poetry; brief `URDU_OUT_OF_PROSE_BRIEF.md`, tool `check_urdu_out.py`; sweep now verse-only). Before that, 18 October 2026, ~20:40Z (§9.368: quote blocks batch 1, 19 rows / 39 paragraphs). Before that, 18 October 2026, ~20:25Z (§9.366, interactive: Rauf ruled "B everywhere" — every non-English quotation moves out of the English sentence into a `> ` block; the new FIRST stream, brief `docs/prompts/QUOTE_BLOCKS_BRIEF.md`; see the 18 Oct box). Before that, 18 October 2026, ~20:15Z (§9.367: as-printed sweep batch 5 — 3 rows / 22 pages, 23 lines applied). Before that, 17 October 2026, ~14:45Z (§9.364: as-printed sweep batch 4 — 2 rows / 17 pages, 10 lines applied; baoli n=50 شادیانہ and n=21 کانسی کار change the English, asked of Rauf). Before that, 17 October 2026, ~12:45Z (§9.363: as-printed sweep batch 3 — 3 rows / 14 pages, 25 lines applied; two new image-verified Urdu exceptions). Before that, 17 October 2026, ~10:40Z (§9.362: as-printed sweep batch 2 — 7 rows / 20 pages, 9 lines applied; only quotations carrying a modernisable form were image-read, asked of Rauf). Before that, 17 October 2026, ~09:00Z (§9.361: the as-printed sweep is multi-firing, 2,065 quotations / 400 pages; tool `as_printed_sweep.py`; batch 1 read and its 15 certain lines applied — see the box above the ORDER box). Before that, 17 October 2026, ~06:50Z (§9.360: Location/Description patch with rulings 10-12 APPLIED; `check_location_meta.py scan` exits 0 — see the box above the ORDER box). Before that, 17 October 2026, ~05:00Z (§9.359: join-check apply DONE — see the box above the ORDER box). Before that, 17 October 2026, ~03:15Z (§9.358: ruling 13 APPLIED, the 24 Urdu fixes; `check_urdu_script.py scan` exits 0 — see the box above the ORDER box). Before that, 16 October 2026, ~14:50Z (§9.357: Rauf answered the held questions). Before that, 16 October 2026, ~05:20Z (§9.355: Urdu image checks finished; NO un-held work is left, so a firing with no answer from Rauf stops — see the 16 October box above the ORDER box). Before that, 15 October 2026, ~19:00Z (§9.353: Urdu-script check DONE as a proposal — `check_urdu_script.py`, `data/review/PATCH_urdu_script_2026-10-15.{tsv,md}`, 21 proposed + 15 image checks; next = those image checks unless Rauf has answered — see the box above the ORDER box). Before that, 15 October 2026, ~16:40Z (§9.351/§9.352: join check decided 318/318 and applied to the repo; Rauf's Location/Description ruling and its check — see the box above the ORDER box; next = Urdu-script check). Before that, 15 October 2026, ~01:20Z (§9.346: import built at Rauf's request — see the 15 October box above the ORDER box). Before that, 14 October 2026, ~21:20Z (§9.344: ORDER box step 2 started — the join check has a brief, a tool and a decisions file; 30 of 318 decided). Before that, 13 October 2026, ~19:10Z (§9.333/§9.334: **the ORDER box below** — Rauf rules descriptions are REWRITTEN from the entries, 94 rows with 2+ books first, more poetry, as long as the material supports; long articles split across columns; then the 318-row join check, then tagging the 29 books, then one import from a Drive export. Every firing is now a notes turn running the description stage). Before that, 12 October 2026, ~19:40Z (§9.327: **ALL 31 IN-SCOPE BOOKS ARE `integrated`** — the remaining fourteen done interactively; `integrate_book.py` gained opt-in `--doubt-heads`, `--group-lines`/`--group-kind`, `--rows-line` and `--omit-lines` (tests: `pipeline/book_queue/test_integrate_book_readers.py`); every Shiva person group must be run with `--skip chandragup-baba-chandragup` (its figure is "Shiva (associated)", the §9.317 hedge); the tag-file new-rows step is owed on 29 books; whether the next notes firing builds the consolidated import or does that tagging first is asked of Rauf (§9.327 Needs Rauf 4) — until he rules, the "final database" rule below stands. Before that, 12 October 2026, ~19:05Z (§9.326: `kasmani_queer_companions` INTEGRATED, 17 integrated / 14 summarized; its Doubts are `- **`id` …**` bullets that `doubt_items()` does not read, so they were attached by line with `--doubt-also ID:LN` — extend the reader for that shape; next notes = Integration on `boivin_hindu_sufis_south_asia`, whose group heads `--groups` refuses (§9.307): read and extend first. Before that, 12 October 2026, ~01:35Z (§9.325: `rizvi_history_of_sufism_india_1` INTEGRATED, 16 integrated / 15 summarized; id sections whose whole content is a negative or a declined mapping were left out with `--skip` (eleven, listed there) — do the same on later books or ask; `--groups` now reads rizvi's label-opened list (`**Place-level attachments under ruling (a)**`, which sits INSIDE an id block — never integrate that id block as is); next notes = Integration on `kasmani_queer_companions`. Before that, 11 October 2026, ~21:00Z (§9.324: **Pass 2 on khulasat_ut_tawarikh DONE, book `summarized`** — all 31 in-scope books are now summarized or integrated (15 integrated, 16 summarized); every notes firing from now on runs the INTEGRATION stage; mappings were frozen at Pass 1 and the index-headword / campaign-mention / "شیخ رکن الدین" / bare-name questions are listed for Rauf, not settled; `pass2_extract.py`'s per-id views dropped bold-label sub-bullets (13 empty heads, refilled by the workers) — add a coverage check before the next Pass 2. Before that, ~18:35Z (§9.323: khulasat Pass 1 wave 8 — 034-039 (Sabuktigin; the Hindu rajas back to the Mahabharata; 4 of 6 chunks map nothing) → **48/48, FULLY NOTED**; next notes = PASS 2 on khulasat_ut_tawarikh (multi-worker, split by output section), which must settle index headwords, campaign-mention place groups, the "شیخ رکن الدین" identifications and the bare-name person mappings; then integration. Before that, §9.322: khulasat Pass 1 wave 7 — 020, 022, 027-030 (Humayun and Sher Shah; the Tughluqs and Khaljis; "شیخ رکن الدین" mapped to Rukn-e-Alam by name in 027-029, for Pass 2 to weigh) → 42/48; next notes = 034-039 (one wave), then Pass 2. Before that, §9.321: khulasat Pass 1 wave 6 — 008, 015-019 (Shah Jahan's end, Kashmir, Akbar's middle reign; 008 and 017 map nothing) → 36/48; next notes = 020, 022, 027-030, 034-039, then Pass 2. Before that, §9.320: khulasat Pass 1 wave 5 — 001-005, 007 (front matter, index, errata, war of succession) → 30/48; next notes = 008, 015-020, 022, 027-030, 034-039; Pass 2 must settle whether bare index headwords head archive bullets (wave 5 was split). Before that, §9.319: khulasat Pass 1 wave 4 — 010, 011, 013, 044, 047, 048 → 24/48; next notes = the other 24 chunks. Before that, §9.318: khulasat Pass 1 wave 3 — 009, 012, 014, 021, 025, 033 → 18/48; the transcription turn had nothing un-held to do and fell through to notes. Before that, §9.316: khulasat Pass 1 wave 2 — 006, 023, 024, 026, 031, 032 noted → 12/48; the brief now carries the wave-1 lessons and a corrected damage rate; next notes = the other 36 chunks. Before that, §9.315: khulasat's owed re-reads done — 411-416, 435-440 and p0446 re-read band by band and corrected, assembled file and chunks 032-035 patched; **no un-held transcription work is left in the queue**: a transcription turn should say so and fall through to notes. Before that, §9.314: khulasat_ut_tawarikh chunked `--words 5000` → 48 chunks, Pass 1 noted 6/48 (040-043, 045, 046: the suba geography and the dervishes) with the new `pipeline/book_queue/KHULASAT_NOTES_WORKER_BRIEF.md`; next notes = the other 42 chunks; next transcription = khulasat's owed re-reads. §9.313 is Rauf's interactive tag-file / new-rows section. Before that, §9.312: **khulasat_ut_tawarikh is fully transcribed, 610/610, status `transcribed`** (601-604 the editor's Urdu introduction, abjad ا-د; 605-610 blank leaves, a 1966 ownership inscription and the Toronto library pocket); the only transcription work left is khulasat's owed re-reads (p0446's year, 435-440, 411-416); khulasat now needs notes; integration continues with `rizvi_history_of_sufism_india_1`. Before that, §9.311: integrated ernst_lawrence (inline bullet groups now read); FINDING: shackle_bulleh_shah, rafat, schimmel_pain_and_grace, sorley and waris_shah never had their place-/person-level groups copied, and `--groups` cannot backfill them (book section no longer last) — needs Rauf; next notes = `rizvi_history_of_sufism_india_1`. Before that, §9.310: khulasat 593-600 transcribed, 600/610 — the rest of the contents, the editor's list of works cited, and the editor's Urdu introduction (abjad folios ه-ح) naming the author Sujan Rai Bhandari of Batala and the editor Zafar Hasan, Delhi, 1918; next transcription = khulasat 601-610; next notes = `ernst_lawrence_sufi_martyrs_of_love`. Before that, §9.309 (sibling): khulasat 585-592. Before that, §9.308: integrated eaton with the new `--deep-blocks` (the block reader used to stop at `####`/`---`; it had cut Sorley's `bhit-bhit-shah` block to 37 of 1,173 lines in §9.296, now repaired inside Sorley's section — see §9.308); next notes = `ernst_lawrence_sufi_martyrs_of_love`. Before that, §9.307: integrated kugle_sufis_and_saints_bodies (a sibling held the khulasat 585-592 lease, so step 1 sent this firing to notes); `bullet_group_blocks()` generalised to every "Place-level …"/"Person-level …"/"Rows attached at …" region; eight of the remaining English books still REFUSE on their own head shapes — look first; next notes = `eaton_essays_islam_indian_history`. Before that, §9.306: integrated madho_lal_hussein_verses_lowly_fakir without Bulleh Shah, the Uch pair, the three Kali rows and chandragup (Kali/chandragup listed for Rauf); `--groups` now also reads the bullet-shape group list; next notes = `kugle_sufis_and_saints_bodies`. Before that, §9.305: khulasat 577-584 transcribed, 584/610 (the author's preface and source list, and the start of the description of Hindustan); next transcription = khulasat 585-610; §9.304 integrated waris_shah_hir_ranjha without its two Uch rows (the Jalal/Jahanian hold); next notes = `madho_lal_hussein_verses_lowly_fakir`. Before that, §9.303: khulasat 569-576 transcribed, 576/610; §9.302 integrated rafat_bulleh_shah without its Bulleh Shah section; next notes = `waris_shah_hir_ranjha`. Before that, §9.301: khulasat 561-568 transcribed, 568/610; §9.300 integrated shackle_bulleh_shah WITHOUT its Bulleh Shah section (held); next notes = `rafat_bulleh_shah_selection`. Before that, §9.299: khulasat 553-560 transcribed, 560/610; §9.298 integrated schimmel_pain_and_grace and `--doubt-also ID:LN` now takes a table row; next notes = `shackle_bulleh_shah_sufi_lyrics`. Before that, §9.297: khulasat 545-552 transcribed, 552/610; §9.294/§9.296 integrated shackle_risalo and sorley — `--doubt-also ID:LN` attaches a Doubts item by its line; next notes = `schimmel_pain_and_grace`. Before that, §9.295: khulasat 537-544 transcribed, 544/610. Before that, §9.293: khulasat 529-536 transcribed, 536/610. Before that, §9.292: `tazkirah_awliya_pak_o_hind` INTEGRATED; `integrate_book.py` now also reads `- **D15a. …**` Doubts and `--doubt-also` finds them; Doubts that name a row only in their body are attached by `--doubt-also` when they are about that row (read each one); **`mazar-of-bulleh-shah` is skipped on any book whose block gives a death year — the held question**; next notes = Integration on the next `summarized` book in `queue.py next` order). Before that, 10 October 2026, ~18:50Z (§9.290: `tareekh_lahore` INTEGRATED — id sections and province bullets, no groups; `integrate_book.py` now also reads Doubts written as numbered `N. **id — …**` items (tareekh's shape; before the fix it attached 0 Doubts to the book); the five rows whose attachment the takeaways dispute with themselves went in with `--claim-note`; next notes = Integration on `tazkirah_awliya_pak_o_hind` — dry-run and check its Doubts attach). Before that, 10 October 2026, ~16:50Z (§9.288: `tahqiqat_chishti` INTEGRATED — id sections and province bullets only; `integrate_book.py --province` now scopes its double-append check to this book's section, so it works on a second book; the 10 Oct new-rows step needs `- [PK]` lines and ONLY hadeeqat has them, so on every other book it is owed until the Figures section is tagged; the `### <Place> (place-level: N rows)` / person-level groups were then RULED by Rauf (§9.289: into the existing entry of every id they list, like province material) and applied to tahqiqat with the new `integrate_book.py --groups`; next notes = Integration on `tareekh_lahore`). Before that, 10 October 2026, ~04:40Z (§9.285: `hadeeqat_ul_aulia` INTEGRATED by `pipeline/book_queue/integrate_book.py`, which copies verbatim and checks containment, so use it for every integration from now on rather than hand-copying; its province bullets are NOT yet applied, pending Rauf on whether rows with no entry get one, so do not re-integrate hadeeqat; next notes = Integration on `tahqiqat_chishti`; next transcription unchanged = khulasat 513-610). Before that, 10 October 2026, early (§9.282/§9.283: khulasat 505-512 restored from the project, 512/610; next transcription = khulasat 513-610; the FIRST integration ran — `sawaneh_shah_jamal` marked `integrated` with zero sections because its only id head is a misfiling, Needs Rauf; next notes = Integration on `hadeeqat_ul_aulia`; `device_commit_files` delivered a stale 3-line copy of a NEW file while reporting `written` — md5 every commit). Before that, 9 October 2026, evening (§9.280: Pass 2 on `tahqiqat_chishti` DONE, 30 books `summarized`; no book now waits for notes, so the next notes turn runs the INTEGRATION stage on the first `summarized`, not-`integrated` book in `queue.py next` order; khulasat joins notes when its transcription finishes; next transcription = khulasat 505-610; a Pass 2 this size took SEVEN workers split by output section, brief `pipeline/book_queue/TAHQIQAT_PASS2_BRIEF.md`). Before that, 9 October 2026, afternoon (§9.276: `tahqiqat_chishti` FULLY NOTED 79/79 — 025-060 were written by an unrecorded sibling and verified by script, 061-079 noted; next notes = Pass 2 on tahqiqat_chishti; next transcription unchanged = khulasat 497-610). Before that, 9 October 2026 (§9.273: khulasat 489-496 transcribed, 496/610; next transcription = 497-610). Before that, 8 October 2026, later still (Rauf's SCOPE ruling, see the box below: the queue is now 31 books; the six Masnavi files are HELD and marked `skipped` in `state.json`; transcription finishes khulasat only; then notes and integration of the 31, then the consolidated import, then stop). Before that, 8 October 2026, late (§9.269: khulasat 481-488 transcribed, 488/610; next transcription = 489-610; p0487's scan crops the right margin of the text block). Before that, 8 October 2026 (Integration stage merged in from `docs/prompts/INTEGRATION_BRIEF.md`: the notes turn of the alternation now runs integration, transcription is unchanged, and the notes stage's book selection is removed). Before that, same day (§9.268: khulasat 473-480 transcribed, 480/610; next transcription = 481-610; the request limit blanked >200 image reads and every blind draft needed 5-15 word corrections on re-read — the §9.264 re-read is mandatory). Before that, same day (§9.267: province-section clean-up FINISHED — boivin quote check clean, boivin A/B halves de-duplicated (3 merges), sorley/hadeeqat/tareekh_lahore had no A/B duplicates; the notes stage has NO queued work, so a notes-turn firing transcribes instead; next transcription unchanged = khulasat 473-610). Before that, same day (§9.266: khulasat 465-472 transcribed, 472/610; next transcription = 473-610; next notes unchanged from §9.265). Before that, same day (§9.265 — sorley province-section quotations re-flagged, 51 edits; next notes = de-duplicate the merged A/B province halves of sorley, boivin, hadeeqat, tareekh_lahore, then transcribe; next transcription unchanged = khulasat 465-610). Before that: 7 October 2026 (§9.264 — khulasat 459-464 transcribed, 464/610; next transcription = 465-610; after any `[media removed]` streak the COORDINATOR's own drafts are blind too — re-read before commit). Before that, same day (§9.263 — province sweep FINISHED 29/29; khulasat 458/610 after §9.262's pages were restored from the project). Before that, same day (§9.259 — PROVINCE SWEEP batch 2 done on sorley, boivin, schaflechner, abbas, kasmani: 15 of 29 swept; next notes = the nine remaining English books, and tell workers NO silent repair inside quotations — sorley had ~60). Before that, same day (§9.258 — khulasat 441-448 transcribed, 448/610; a dead 5 Oct firing left 435-440 unrecorded; the request limit now hits the COORDINATOR too, so verify each page against an image still in view; next transcription = re-read 441/442/446/447, then 449-610). Before that: 5 October 2026 (§9.257 — PROVINCE SWEEP batch 1 done on 5 books; brief `pipeline/book_queue/PROVINCE_SWEEP_BRIEF.md`; next notes = the next 5-6 books of the sweep). Before that, same day (§9.256 — khulasat 429-434 done, 434/610; subagent image workers unreliable even singly). Before that: 4 October 2026 (§9.255 — Pass 2 on nizami_revised_translation DONE, 29 books summarized, every transcribed book consolidated; next notes = the PROVINCE SWEEP over the older takeaways). Before that, same day (§9.254 — khulasat 417-428 transcribed, 428/610, 405-416 folios verified; CONCURRENCY CUT TO ONE image worker at a time — two hit the request limit 2/2 at 19 images a page; next transcription = khulasat 429-610). Before that, same day (§9.253 — nizami_revised_translation FULLY NOTED 13/13; next notes = Pass 2 on it, then the province sweep; an unrecorded transcription firing wrote khulasat 405-416 at 07:17Z — next transcription verifies those, then 417-610). Before that, same day (§9.252 — khalid_in_search_of_shiva SUMMARIZED; next notes = Pass 1 on nizami_revised_translation). Before that, same day (§9.251 — khulasat 363-404 transcribed, book at 404/610; next transcription = khulasat 405-610; CONCURRENCY CUT TO TWO image workers — five hit the request limit 5/5). Before that: 3 October 2026 (§9.250 — khalid_in_search_of_shiva fully noted 9/9; next notes = Pass 2 on it). Before that, same day (§9.249 — tahqiqat_chishti 811-873 transcribed, BOOK DONE 873/873; next transcription = khulasat 363-610; "media removed" measured as a request limit — at most FIVE concurrent image workers). Before that, same day (§9.248 — Pass 2 on khalid_a_white_trail DONE, 27 summarized; next notes = Pass 1 on khalid_in_search_of_shiva). Before that, same day (§9.247 — tahqiqat 751-810 transcribed, book at 810/873; next transcription = tahqiqat 811-873, which finishes it). Before that: 29 September 2026 (§9.246 — khalid_a_white_trail fully noted 13/13; next notes firing = Pass 2 on it). Before that, same day (§9.245 — khulasat 17-48 done; next transcription = tahqiqat 751-780). Before that, same day (§9.243 — walking_with_nanak summarized; province sweep queued). Also §9.242 — three rulings: provinces (c), orthography as printed, khulasat 17-48 via split render first).
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


> **15 OCTOBER 2026 (HANDOVER §9.346) — Rauf ruled to push today, and the import is BUILT:**
> `data/import_2026-10-15.csv` (all 94 approved Descriptions, split into `Description 2..5`, plus all 318
> proposed new rows). Do NOT build another import. Step 1 is done (approved, imported). Step 2 (join check)
> continues, but a `join` now means a merge proposal for a row already in the sheet, not a drop from an
> import. Before any `npm run data:build` refresh is committed, the post-import list in §9.346 (provenance
> for 318 rows, 39 orphaned KG quotes, Urdu under-coverage, publication-safety false positives, regens)
> must be worked — ask Rauf which comes first.

> **15 OCTOBER 2026, later (HANDOVER §9.351, §9.352) — step 2's DECIDING IS DONE (318/318; join 3, maybe 7,
> new 223, related 85; `join_check.py check` exit 0). Nothing is applied: apply waits on Rauf's answers (§9.344,
> §9.348, §9.351 Q1-5). Rauf's NEW RULINGS (15 Oct ~05:30Z, binding on every Location and Description):** a
> Location cell holds only the location; the substance of any survey commentary goes into the Description as plain
> reported fact ("It is reported that …"); no meta-text about what the surveyor uploaded, what sources were or were
> not supplied, or what the survey omits; readable prose; and the Urdu script of the new material must be checked.
> `pipeline/book_queue/check_location_meta.py scan` must exit 0 before any import (it exits 1 until Rauf approves
> and someone applies `data/review/PATCH_location_description_meta_2026-10-15.tsv`, §9.352). **Next notes firing:
> the Urdu-script accuracy check of the 94 rewritten Descriptions and the 318 new rows against the OCR
> transcriptions' printed forms — a report/patch proposal, never an edit.** Then step 3 once Rauf has answered.

> **15 OCTOBER 2026, evening (HANDOVER §9.353) — the Urdu-script check is DONE as a proposal.**
> `python3 pipeline/book_queue/check_urdu_script.py scan` (exit 1 until the proposal is worked) and
> `data/review/PATCH_urdu_script_2026-10-15.{tsv,md}`: 36 lines, 21 proposed, 15 flagged for a page image
> (13 Tareekh ہین/ہیں quotations, Teja Singh's samadh, two silent repairs). Never apply without Rauf.
> **Next notes firing:** if Rauf has answered none of §9.344/§9.348/§9.351/§9.352/§9.353, do the 15 image checks
> (render the cited page, crop the quoted line, read it; write the printed form into that line's `proposed`
> column) — a proposal still, no edit. Otherwise do what he ruled. Step 3 waits on the join-check answers.

> **16 OCTOBER 2026 (HANDOVER §9.354, §9.355) — the Urdu image checks are DONE: all 15 flagged lines read off page
> images** (`data/review/URDU_IMAGE_CHECKS_2026-10-16.md`; three real misreadings found: Teja Singh سمادہ, Mozang
> باداب, Dera Sahib گہوٹنے; line 24 was a false match). **There is now NO un-held work.** Every remaining step waits on
> Rauf (§9.344/§9.348/§9.351-§9.355 questions). A firing that finds no answer from him in the repo or the project
> writes a short §9 section saying so and STOPS: no new batch, no re-checking, no invented work. If he has answered,
> do what he ruled.

> **16 OCTOBER 2026, ~14:50Z (HANDOVER §9.357) — RAUF HAS ANSWERED. This supersedes the "NO un-held work / STOP" box above.**
> Read §9.357 whole; its 16 numbered rulings are binding. In short: `join` keeps the row + cross-reference (no merge, no drop);
> `related` appends to the archive entry; graveyards with archive shrines and no-site rows stay rows; adjoining burials are related;
> spouses/devotees related (new + cross-ref if they founded a shrine or matter independently) and the saints/orders explorer must make
> such relationships prominent (scope that, ask before touching `src/`); same-name patrons related-hedged; two-text chains related (and also
> new where independently significant). **HELD, do not touch:** Kharak Singh/Nau Nihal and the batch 2-3 reopenings (Naushahi three etc.).
> Apply the Location/Description patch (survey attributions → "It is reported that …" except in "Where the Sources Disagree"; the two guard
> notes → `qa_note`; Ayaz "Shah Alam Market, Lahore") and all 24 Urdu fixes; Tareekh/Tahqiqat quotations fully as printed; legacy verse kept.
> **Next firings:** apply those approved items first (one checked apply per firing, verifier exit 0, md5 every write), then ALTERNATE between
> the §9.346 post-import refresh list and ORDER-box step 3.

> **17 OCTOBER 2026 (HANDOVER §9.358) — §9.357 ruling 13 is APPLIED (the 24 Urdu fixes).** `check_urdu_script.py scan` now
> exits 0; keep it at 0 (an image-verified or ruled-legacy run goes into `pipeline/book_queue/urdu_script_exceptions.tsv`,
> exact key; stale exceptions fail). Lesson: a fix to a Description quotation must also go into the row's `shrine_entries/<id>.md`
> AND the takeaways it came from, or `check_description_draft.py` Q1 fails. **Still to apply, one per firing:** the join-check
> apply (rulings 1-7, 9; skip 8), then the Location/Description patch with rulings 10-12, then the as-printed sweep (ruling 14).

> **17 OCTOBER 2026, ~05:00Z (HANDOVER §9.359) — the join-check apply is DONE** (`join_check.py apply`; rulings 1-3, 7 applied to
> 15 `shrine_entries/` files; ruling 8's rows held in `HELD_RULING_8`; a second run refuses). Two `related` rows to `valmik-mandir-naqi-road`
> (no entry file) and ruling 5's per-row "new + cross-reference" judgments are left for Rauf. **Still to apply, one per firing:** the
> Location/Description patch with rulings 10-12 (`check_location_meta.py scan` exit 0), then the as-printed sweep (ruling 14).

> **17 OCTOBER 2026, ~06:50Z (HANDOVER §9.360) — the Location/Description patch with rulings 10-12 is APPLIED**
> (`data/review/PATCH_location_description_meta_2026-10-17.tsv`, 197 lines, 14 rows, via the new `check_location_meta.py apply`).
> `check_location_meta.py scan` now exits 0 and ALSO fails on any 2026 field-survey attribution ("the survey states", "the surveyor", …)
> outside "Where the Sources Disagree"/Bibliography; keep it at 0 (exceptions, exact: `pipeline/book_queue/location_meta_exceptions.tsv`).
> `check_urdu_script.py scan` is too slow for the Mac shell's 180 s limit: run it in the cloud on a tarball of the files it reads (§9.360).
> **Still to apply:** the as-printed sweep of the Tareekh/Tahqiqat quotations (ruling 14); then alternate the §9.346 refresh list with ORDER-box step 3.

> **17 OCTOBER 2026, ~09:00Z (HANDOVER §9.361) — the as-printed sweep (ruling 14) is MULTI-FIRING: 2,065 quotations / 400 pages.**
> The transcriptions were modernised, so every quotation is read off its page image (`pipeline/book_queue/as_printed_sweep.py`:
> `inventory`, then a readings TSV per batch `data/review/AS_PRINTED_READINGS_<date>_batchN.tsv`, then `apply … --conf high --kind ortho`).
> Batch 1 (13 rows, 21 pages) read; 15 lines applied. Lines where the page shows a different WORD (Bulleh Shah/Kasur at shah-inayat,
> Shams Tabriz at sabzwari, پُرانوار, خون) are NOT applied: their English needs Rauf. Until he answers §9.361's Q4 (scale/order),
> each firing does ~20 more pages of the sweep, keeping the three checkers at exit 0.

> **17 OCTOBER 2026, ~10:40Z (HANDOVER §9.362) — as-printed sweep batch 2 done** (`AS_PRINTED_READINGS_2026-10-17_batch2.tsv`;
> 9 lines applied in shaheed-ganj and makhdoom-jahaniyan; three checkers exit 0). Rows with no modernisable form were marked `not read`
> (asked of Rauf). Next batch, until he answers: jalaluddin-surkh-posh, peer-makki, baba-shah-kamal (~29 pages).

> **17 OCTOBER 2026, ~12:45Z (HANDOVER §9.363) — as-printed sweep batch 3 done** (`AS_PRINTED_READINGS_2026-10-17_batch3.tsv`;
> 25 lines applied in peer-makki, baba-shah-kamal, jalaluddin-surkh-posh and makhdoom-jahaniyan; three checkers exit 0; two new exact
> `image-verified` exceptions). Next batch, until Rauf answers: the next rows by fewest cited pages from `inventory`, excluding the 23 done.

> **17 OCTOBER 2026, ~14:45Z (HANDOVER §9.364) — as-printed sweep batch 4 done** (`AS_PRINTED_READINGS_2026-10-17_batch4.tsv`;
> 10 lines applied in gurdwara-baoli-sahib and ranmal-sharif; three checkers exit 0; one new exact `image-verified` exception).
> Next batch, until Rauf answers: miran-hussain-zanjani, gurdwara-guru-ram-das-ji, fariduddin-ganjshakar (fewest pages, excluding the 25 done).

> **18 OCTOBER 2026, ~20:15Z (HANDOVER §9.367) — as-printed sweep batch 5 done** (`AS_PRINTED_READINGS_2026-10-18_batch5.tsv`;
> 23 lines applied in miran-hussain-zanjani, gurdwara-guru-ram-das-ji and fariduddin-ganjshakar; three checkers exit 0; one new exact
> `image-verified` exception). Word-level readings for Rauf include Zanjani's arrival year 557 AH (not "fifth century"), Ram Das's
> Chuna Mandi and "near Tarn Taran". §9.366 is left to a concurrent interactive session (quote blocks / `sync_draft_to_import.py`).
> Next batch, until Rauf answers: sakhi-sarwar, shah-jamal (fewest pages, excluding the 28 done); avoid rows an interactive session is editing.

> **18 OCTOBER 2026, ~20:45Z (HANDOVER §9.365, §9.366, §9.369) — RAUF, LIVE. Supersedes the §9.366 box. Read §9.369 whole (§9.368 is the scheduled firing that put 19 rows into blocks before the ruling).**
> (1) Import snapshots: `data/import_2026-10-18.csv`, `…18b.csv`, `…18c.csv` (the 15 Oct import was never made; the live sheet is
> still `data/live_sheet_2026-10-15.csv`). Keep editing the working file `data/import_2026-10-15.csv` through the tools; a new
> snapshot is `python3 pipeline/finalize_import.py --date <D>`. (2) **Rauf ruled: Description prose is ENGLISH ONLY; the only
> Urdu is poetry** (verse paragraphs). The §9.366 `> ` blocks are WITHDRAWN (renderer support removed; `check_description_draft`
> F1 refuses them). Brief (binding): `docs/prompts/URDU_OUT_OF_PROSE_BRIEF.md`; tool `check_urdu_out.py`
> (`status`/`begin`/`check`/`rekey`/`done`), then `sync_draft_to_import.py`. **DONE 18 Oct ~21:20Z (§9.370): all 80 rows; `status`
> shows 0. Snapshot `data/import_2026-10-18d.csv`; review file `data/review/URDU_OUT_REVIEW_2026-10-18.md`.** Keep `check_urdu_out.py
> check` at exit 0 for every row in `urdu_out_done.txt` after any later edit. **The as-printed sweep now covers verse paragraphs
> only** (prose quotations are leaving); do not run prose sweep batches.

> **18 OCTOBER 2026, ~23:10Z (HANDOVER §9.371) — the VERSE as-printed sweep is READ (ruling 14 has no unread work left).**
> `data/review/AS_PRINTED_READINGS_2026-10-18_verse1.tsv`: 41 verse lines from Tarikh-e Lahore/Tahqiqat read off page images
> (inventory script `out/as_printed_sweep/verse1/verse_inv.py`). NOTHING applied: `check_urdu_out.py` EN2 refuses any change to a
> verse paragraph of the 80 done rows, `as_printed_sweep.py apply` does not handle verse, and most readings are word-level (asked of
> Rauf; the big one: Tahqiqat p. 592 reads چون **شہ** پنجاب, not شمع, in four rows). If Rauf approves, apply first (one checked apply,
> with an EN2 exception mechanism he agrees to). Otherwise **next = ruling 16's alternation: ORDER-box step 3 (tag-file new-rows step on
> the 29 books, §9.313 protocol, joins first)**, then the §9.346 refresh list on the firing after.

> **19 OCTOBER 2026, ~04:45Z (HANDOVER §9.372) — ORDER-box step 3 (the §9.313 tag-file step) has BEGUN, in `queue.py` order.**
> `sawaneh_shah_jamal` is done (0 rows: all Deccan; header-only patch). `tahqiqat_chishti` (570 items) is IN PROGRESS across firings:
> `pipeline/book_queue/figure_tags/tahqiqat_chishti.tsv` tags 100 items so far, and its header lists the line ranges still to tag
> (Mosques, secular, Muslim saints, People, Places outside Lahore) and the IN-BOOK JOIN convention (a site's second Pass-2 line is a
> `join` to the id its first line's row will get; the final build is two `--only-lines` runs). Validate each slice with
> `build_tagged_rows.py tahqiqat_chishti --title "Maulvi Nur Ahmad Chishti, Tahqiqat-e Chishti" … --dry-run --only-lines <tagged lines minus in-book joins>`;
> run it for real only when every item is tagged. Joins to archive rows follow §9.357 rulings 1/3/4 (own row, cross-reference in `note`).
> Ruling 16 still alternates step 3 with the §9.346 refresh list.

> **19 OCTOBER 2026, ~17:10Z (HANDOVER §9.373) — the §9.346 refresh list is RE-MEASURED and its first fix is in.**
> Record: `data/review/POST_IMPORT_REFRESH_2026-10-19.md` (step table, dependency order, two questions for Rauf: Q1 provenance for
> the 318 book rows, Q2 the 94 short Urdu articles). The publication-safety gate's five false positives are fixed IN THE CHECK
> (`scripts/data/lib/publicationSafetyRules.mjs`, tested). 48 KG quotes are re-anchored by PROPOSAL only
> (`data/review/KG_QUOTE_REANCHOR_2026-10-19.tsv`, tool `pipeline/reanchor_kg_quotes.py`, dry run by default): apply it only AFTER the
> refresh's `data:build`, never on today's data. Do not commit a refresh until Q1/Q2 are answered and `data:validate` exits 0.
> **Next firing (ruling 16): continue the Tahqiqat tag file** (Mosques, secular, then Muslim saints, People, Places outside Lahore).

> **20 OCTOBER 2026, ~01:50Z (HANDOVER §9.374) — Tahqiqat tag file: Mosques (40) and secular (55) TAGGED, 195 of 570.**
> Dry run (`--only-lines` all tagged lines but in-book join 2339) exit 0: 78 rows, 39 joins, 77 skipped; nothing written. Secular lines
> are skipped (§9.313); five religious sites named only inside secular/list lines wait on §9.372 Q2 (listed in the tag file header).
> **Next (ruling 16):** the §9.346 refresh list if Rauf has answered §9.373 Q1/Q2, otherwise continue the tag file: Muslim saints
> 1985-2239 (233, join-heavy: check Hadiqat's and Tareekh's proposed rows and the archive; about two firings), then People, then Places outside Lahore.

> **20 OCTOBER 2026, ~17:05Z (HANDOVER §9.375) — Tahqiqat tag file: Muslim saints 1987-2122 (the first Pass-2 half, 136) TAGGED, 331 of 570.**
> Dry run (`--only-lines` all tagged lines but in-book join 2339) exit 0: 135 rows, 81 joins, 2 figures, 112 skipped; nothing written.
> NEW GOTCHA: `build_tagged_rows.py` writes the tag file's `#location` (Lahore) on every row, so a site elsewhere in Pakistan cannot be a row;
> such lines are skipped with `OUTSIDE-LAHORE:` in `note` (1988, 1990, 2063) and asked of Rauf (§9.375 Q1). Do NOT tag Places outside Lahore
> (2565-2618) until he answers or the tool gains a per-line location. **Next (ruling 16):** the §9.346 refresh list if Rauf has answered §9.373
> Q1/Q2, otherwise the Muslim saints' second half 2126-2239 (97; in-book joins to the first half's rows/targets, e.g. Mian Wadda 2126 ↔ 2115), then People 2465-2564.

> **20 OCTOBER 2026, ~21:15Z (HANDOVER §9.376) — Tahqiqat tag file: Muslim saints 2126-2238 (the second Pass-2 half, 97) TAGGED; the Muslim saints subsection is DONE, 428 of 570.**
> Dry run (`--only-lines` all tagged lines but the in-book joins 2339 and 2201) exit 0: 176 rows, 107 joins, 5 figures, 138 skipped; nothing written.
> A second-half line that repeats a first-half JOIN is an ordinary join to the same proposed row (2126 → Mian Wadda's row, as 2115); only a line repeating a first-half ROW
> is an in-book join (2201 → `takia-of-sher-ali-shah-madari-faqir`, line 2000). Four more OUTSIDE-LAHORE skips (2133, 2146, 2211, 2214) wait on §9.375 Q1.
> **Next (ruling 16):** the §9.346 refresh list if Rauf has answered §9.373 Q1/Q2, otherwise People 2465-2564 (94); Places outside Lahore (2565-2618) stay untagged until §9.375 Q1 is answered.

> **21 OCTOBER 2026, ~19:15Z (HANDOVER §9.377) — Tahqiqat tag file: People 2467-2563 (94) TAGGED, 522 of 570: 0 rows, 6 joins (3 in-book: 2476, 2504, 2552), 2 figures, 86 skips.**
> Dry run (`--only-lines` all tagged lines but the in-book joins 2339, 2201, 2476, 2504, 2552) exit 0: 176 rows, 110 joins, 7 figures, 224 skipped; nothing written.
> A person line is a `join` only where the line itself names that person's own burial (or the takeaways' "see tomb" pointer); patrons and founders are skips with the site as RELATED.
> **Tahqiqat now has NO un-held tagging:** Places outside Lahore (2565-2618, 48) waits on §9.375 Q1; its final two-step build waits on those 48.
> **Next (ruling 16):** the §9.346 refresh list if Rauf has answered §9.373 Q1/Q2, otherwise START the tag file of the next integrated book with a Figures section and no
> `PATCH_new_rows_<slug>_*.csv`: `tazkirah_awliya_pak_o_hind` (claim `tags__tazkirah_awliya_pak_o_hind`; it spans many cities, so `#location` is blank or the file is split per city — §9.313 step 1; check §9.375's gotcha).

> **23 OCTOBER 2026, ~00:50Z (HANDOVER §9.378) — the Tazkirah tag file is STARTED: pp. 1-210 TAGGED, 135 of 263.**
> `pipeline/book_queue/figure_tags/tazkirah_awliya_pak_o_hind.tsv`: 0 rows, 2 joins (both to Hadiqat's `shaikh-sadr-al-din-arif`), 39 figures, 94 skips;
> dry run (`--only-lines` the 135, title "Zahur ul-Hasan Sharib, Tazkirah Awliya-e Pak o Hind") exit 0, nothing written. `#location` is BLANK on purpose
> (pan-Pakistan-and-India book; each line's city goes in `note`). GOTCHA: count items with the tool's HEAD_RE, not `grep '^- \*\*'` (263 vs 266: a bold
> head broken over two lines is not an item and must not be tagged). **Next (ruling 16):** the §9.346 refresh list if Rauf has answered §9.373 Q1/Q2,
> otherwise finish this file: pp. 211-303 (4227-4391) and pp. 304-392 (4392-4623), 128 items, then its real build.

> **23 OCTOBER 2026, ~03:05Z (HANDOVER §9.379) — the Tazkirah tag file is COMPLETE, 263 of 263.**
> Full dry run (no `--only-lines`) exit 0: 1 row (4282 Mulla Shah, Lahore), 4 joins (3789/4060 → `shaikh-sadr-al-din-arif`, 4272 → `sayyid-shah-bilawal`,
> 4430 → `shaikh-nur-muhammad-chishti-famous-as-nur-muhammad-maharvi`), 64 figures, 194 skipped; nothing written. The REAL build is one run but is NOT done:
> its one row would carry a blank Location (asked of Rauf with §9.375 Q1). GOTCHA: `build_tagged_rows.py` checks a row's silsila against the item's FIRST
> physical line only; an order named on a wrapped second line must be left blank in the tag (note why), never forced. **Next (ruling 16):** the §9.346
> refresh list if Rauf has answered §9.373 Q1/Q2, otherwise START the tag file of `shackle_risalo_shah_abdul_latif` (prio 100; claim
> `tags__shackle_risalo_shah_abdul_latif`), then sorley, schimmel_pain_and_grace, … in `queue.py` priority order (`eaton_essays_islam_indian_history` has no Figures section).

> **23 OCTOBER 2026, ~19:00Z (HANDOVER §9.380) — the Shackle Risalo tag file is COMPLETE and BUILT, 117 of 117, in one firing.**
> `pipeline/book_queue/figure_tags/shackle_risalo_shah_abdul_latif.tsv`: 0 rows, 1 join (1739 Hinglaj → `shaktipeeth-shri-hinglaj-mata-mandir`), 3 figures
> (Shah Inat Rizvi, Hallaj, Rumi), 113 skips; real build exit 0, header-only `data/review/PATCH_new_rows_shackle_risalo_shah_abdul_latif_2026-10-23.{csv,md}`.
> GOTCHA: a takeaways Doubt written before 21 Sep may call Hinglaj "no id"; the id exists now, so treat that blocker as stale (and Sindh books' Hinglaj
> material may sit under "Other" unintegrated — asked of Rauf). **Next (ruling 16):** the §9.346 refresh list if Rauf has answered §9.373 Q1/Q2, otherwise
> START the tag file of `sorley_shah_abdul_latif_of_bhit` (prio 101; claim `tags__sorley_shah_abdul_latif_of_bhit`; Figures at takeaways line 3793), then
> schimmel_pain_and_grace, … in `queue.py` order.

> **24 OCTOBER 2026, ~22:10Z (HANDOVER §9.381) — the Sorley tag file is COMPLETE and BUILT, 47 of 47, in one firing.**
> `pipeline/book_queue/figure_tags/sorley_shah_abdul_latif_of_bhit.tsv`: 2 rows (3802 `shaikh-patta`, 3803 `sayid-muhammad-husain-pir-murad`, both
> `#location` Tatta, the book's spelling), 0 joins, 4 figures, 41 skips; real build exit 0, `data/review/PATCH_new_rows_sorley_shah_abdul_latif_of_bhit_2026-10-24.{csv,md}`.
> Group items naming many persons in one head were tagged `skip` (names in `note`), not `figure`. `queue.py next` now prints "queue empty": take the next
> book from `state.json` priorities (integrated books, ascending). **Next (ruling 16):** the §9.346 refresh list if Rauf has answered §9.373 Q1/Q2, otherwise
> START the tag file of `schimmel_pain_and_grace` (prio 102; claim `tags__schimmel_pain_and_grace`; Figures at takeaways line 1569), then
> shackle_bulleh_shah_sufi_lyrics, rafat_bulleh_shah_selection, … (check each book's rows for a city other than `#location` — §9.375's gotcha).

> **26 OCTOBER 2026, ~19:30Z (interactive) — RAUF: THE WORKING REPO IS NOW THE PC COPY. Read this box before the 25 October box.**
> - **Where:** `C:\Users\g16\Desktop\Shrines Project` on Rauf's Windows PC (device "desktop-u8f3ej7"). In device_bash it mounts at
>   "$HOME/mnt/Shrines Project"; with the file tools use the Windows path. If it is not connected, call device_request_folder_access on that
>   exact path. Run the tools with python3 there, as on the Mac.
> - **Never write into Google Drive's `G:\Other computers\My Mac\...` folder.** It is a backup of the Mac, and files written into it from the
>   PC were removed by the Mac's next sync (the whole `entries/descriptions_public/` folder vanished on 26 Oct; nothing was lost, the cloud
>   session held every file). Rauf's standing rule: never edit files directly in Google Drive; work on a local copy, then upload to `G:\My Drive`.
> - **What is current on the PC copy (26 Oct):** all of `entries/descriptions_public/` (90 files) with every verifier report in `verify/`;
>   the 94 team versions in `entries/descriptions/*.md` (60 of them replaced with the Mac's current text: Urdu out of the prose, the
>   18 Oct passes); `public_description_queue.py`, `check_public_description.py`, `check_description_draft.py`, `check_urdu_out.py`,
>   the briefs in `docs/prompts/`, `src/data/reading-library.json` (the citation fix), and every `pub__<id>` claim. A full backup of the
>   description work is `Claude outputs/descriptions_public_backup_2026-10-26.zip`.
> - **What is NOT on the PC copy:** the Mac's work from 18 to 25 October outside the descriptions: the tag files and their PATCH files
>   (§9.372 to §9.381), `state.json` updates, the HANDOVER sections §9.356 to §9.383, the import snapshots `data/import_2026-10-18*.csv`.
>   Copies of most HANDOVER sections are in the attached project (`shrines/1xx_*.md`). **So on this copy run ONLY the public description
>   stage.** Do not restart the tag-file step or the refresh list here; they wait until Rauf brings the Mac repo across.
> - **HANDOVER numbering:** the PC copy's `docs/HANDOVER.md` stops before §9.356. Number new sections from **§9.400** upward ("PC series"),
>   so they never clash with the Mac's §9.356 to §9.383, and put a copy of each section in the attached project as usual.
> - **State of the public stage:** 26 of 94 rows `done` (all three verifiers PASS on the current files). Batch 6 is claimed by the
>   interactive session (`shrine-of-mauj-darya-bukhari`, `gurdwara-sri-kiara-sahib`, `gurdwara-khoohi-bhai-lalo-bhai-lalo-di-khooi`,
>   `gurdwara-pehli-patshahi-jind-pir-sukkur`, `gurdwara-patti-sahib`, `gurdwara-rori-sahib`; English drafted, V1 next). The scheduled
>   task works from the SHORTEST rows up; the interactive session from the largest down. Respect live claims; trust the files.
> - **New since the 25 Oct box (all in the brief):** the L1 floor is 0.30 with `L1 exception (V1 round N): <cause>` in the notes and 0.25
>   with `L1 exception below 0.30 (V1 round N): <cause>`; V1 alone decides either, after a sweep for omissions. Late rounds: when a
>   verifier returns a handful of issues with corrected sentences, apply them exactly by script, write `verify/<id>.<ur|V1>.r<N>.changes.txt`
>   (OLD and NEW sentence), and let one confirming agent check only the changed sentences for V2 and V3 together; save its reply as
>   `verify/<id>.V2.r<N>.txt` and `verify/<id>.V3.r<N>.txt` before recording the verdicts.
> - **Writing back:** device_bash writes directly into the PC copy. If only the file tools are available, commit with device_commit_files
>   to the Windows path. Never run git here either; Rauf commits.

> **25 OCTOBER 2026, ~04:30Z (HANDOVER §9.382, interactive) — RAUF'S RULING: PUBLIC DESCRIPTIONS. THIS IS NOW THE FIRST
> STREAM OF EVERY FIRING; it supersedes ruling 16's alternation and every "Next" line in the boxes above until it is done.**
> Rauf read the rewritten Descriptions (step 1 of the ORDER box) and ruled (24 Oct, in chat): they read like an encyclopedia;
> stop citing authors one by one and synthesise one seamless narrative; no side by side disagreements ("there is no consensus,
> but the established position is …"); **keep the detailed versions for the team** and give the public a simplified one; shorter
> and intelligible to an average reader ("scale them down to 0.75 of the current ones", then, on the pilot: "add back family
> members, everything which is obviously important information, but no need to add what authors say"); and **use verifiers so
> the Urdu versions are in line and read fluently**. On 25 Oct he added: the scheduled task must pick up where it stopped
> **even if the usage limit ends a run**, and the descriptions are **high priority, to be fixed ASAP**.
> - **Brief (binding, read it whole): `docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md`.** Tools: `pipeline/book_queue/public_description_queue.py`
>   (`status`, `next N`, `view`, `resume`, `verdict`) and `pipeline/book_queue/check_public_description.py` (must exit 0).
> - **Two versions per row.** TEAM = `entries/descriptions/<id>.md`, unchanged, the record (never edit it in this stage). PUBLIC =
>   `entries/descriptions_public/<id>.md` (English), `<id>.ur.md` (Urdu), `<id>.notes.md` (verdicts first, consensus choices, left out),
>   and `verify/<id>.<V>.r<N>.txt` (every verifier reply).
> - **Verifiers:** V1 English fidelity (team vs public), V2 Urdu fidelity (English vs Urdu), V3 Urdu fluency (the Urdu alone, as a
>   native editor). Prompts at the end of the brief. **Order: V1 until it passes, THEN write the Urdu, THEN V2 and V3.**
> - **Resumable by construction:** every draft, report and verdict is written to the Mac the moment it exists; a verdict line is
>   stamped with the md5 of the file it judged (`verdict` command), so a later edit makes it stale; `next` lists rows already under
>   way first. A firing that is cut off loses at most the step it was in. Claim `pub__<id>` before a step (90 min TTL).
> - **Pilots DONE (house style, read before drafting):** `shah-jamal` and `shrine-of-baba-shah-kamal`, all three verifiers PASS on the
>   final files (`check_public_description.py` exit 0). Measured: a faithful public version is 0.44 to 0.46 of a team version rich in
>   uncertain readings; the checker's L1 band is 0.40 to 0.85.
> - **An interactive cloud session (25 Oct) is also drafting rows.** It claims each row (`pub__<id>`, long TTL) before working; respect
>   live claims, and trust the files, not this note, for what is done.
> - **Paused, not dropped:** the tag-file new-rows step (next was `schimmel_pain_and_grace`) and the §9.346 refresh list. Resume ruling
>   16's alternation only when `status` shows no row left to work. The tag-file rows have empty Descriptions, so nothing there conflicts.
>   **§9.373 Q2 is answered by this ruling:** the 94 short Urdu articles are replaced by the verified public Urdu at import.
> - **Never** write `urdu-i18n/content/`, build an import, or touch the sheet in this stage. At the end, ASK Rauf (brief, last section):
>   public text into `Description`; the team text into a Team-view-only column (needs a small `src/` change); the Urdu into
>   `urdu-i18n/content/<slug>.md`; and how the 48+ KG quotes that anchor to Description text re-anchor (to the team column, most likely).

> **ORDER OF THE REMAINING WORK — Rauf, 13 October 2026 (HANDOVER §9.333, §9.334). This box overrides
> everything below it where they differ, including the "final database" trigger and §9.327 Needs Rauf 4.**
>
> Transcription and integration have no work left, so **every firing is a notes turn**: its §9 first line
> is `Stage: notes`, whatever the alternation below would say. Do the steps in this order; a step starts only
> when the one before it has no work.
>
> 1. **Descriptions first — "enrich the existing rows first, then new rows".** Rauf ruled that the
>    `Description` of every row with row-specific material from 2+ books (94 rows) is REWRITTEN from its
>    shrine entry. Brief: `docs/prompts/DESCRIPTION_REWRITE_BRIEF.md` (binding; read it whole).
>    One firing = one batch of up to five rows:
>    - `python3 pipeline/book_queue/description_queue.py sources` (refresh bibliography source lines), then
>      `python3 pipeline/book_queue/description_queue.py next 5`.
>    - Claim each id BEFORE work: `python3 pipeline/book_queue/notes_claim.py claim desc__<id> --session <session>`;
>      skip any id a sibling holds (exit 3).
>    - Give each row to one worker (text only, no images, so five at once is safe). Each worker reads the brief,
>      `description_queue.py view <id>` (all of it), the row's current Description from
>      `data/snapshot_2026-10-08_post-import.csv`, `out/descriptions/book_sources.md`, and one approved draft
>      (`entries/descriptions/tilla-jogian.md`) for house style; writes ONLY `entries/descriptions/<id>.md` and
>      `<id>.notes.md`; and gets `python3 pipeline/book_queue/check_description_draft.py <id>` to exit 0.
>      Workers may run in the cloud on a staged bundle (see §9.334 for the tarball method; tar cannot overwrite
>      files on this mount, so write existing files back in place and md5 them).
>    - The coordinator re-runs the checker on every draft itself (RULE 4), runs
>      `python3 pipeline/book_queue/build_description_patch.py --stamp <YYYY-MM-DD>`, releases the claims, and
>      writes the run record listing each row's decisions for Rauf.
>    - **Rauf's guidance, binding on every draft:** capture as much information as the entry supports — "the
>      more information we are able to capture the better"; Data Darbar's old ~15k "is a good length but
>      ideally even longer"; never padding. **More poetry**: the books' verse by and about the saint or site, in
>      the books' own translations, as short cited excerpts. Every disagreement side by side, no verdict. No
>      `## ` section over 45,000 characters: long articles are split across columns at import, never cut.
>    - Rows where no book names the site itself (Ram Mandir Saidpur, Gurdwara Dash Mesh Pita) keep the figure-
>      and place-level context, each passage framed as being about the figure or the place (Rauf, §9.336).
>    - Scope: the 94, most books first (`description_queue.py status` shows what is left). When they are all
>      drafted, ASK Rauf before widening to the 31 single-book rows.
> 2. **Then the join check of the 318 proposed new rows** in `data/review/PATCH_new_rows_hadeeqat_ul_aulia_*`
>    and `PATCH_new_rows_tareekh_lahore_*`: for each, look for any clue tying it to one of the 171 archive rows
>    (the name, the master, the address, the companions); where one exists, prefer the connection (the line goes
>    into that row's entry, flagged "may be the same as" where only a name agrees), never merge silently.
>    **Since 14 Oct (§9.344): brief `docs/prompts/JOIN_CHECK_BRIEF.md` (binding), tool
>    `pipeline/book_queue/join_check.py` (`screen`/`status`/`next 30`/`view`/`check`), decisions in
>    `pipeline/book_queue/join_decisions.tsv` (`check` must exit 0). One firing = ~30 rows from `next 30`,
>    claim `join_check` first. Decide only; NOTHING is appended and no row dropped until all 318 are decided
>    and Rauf has answered §9.344's two effect questions.**
> 3. **Then the tag-file new-rows step on the other 29 integrated books** (§9.313 protocol, below), trying a
>    join to an existing row before proposing any new row.
> 4. **Then ONE consolidated import.** The sheet is fetched through the Google Drive connector once Rauf has
>    shared it with raufnawaz@college.harvard.edu (CSV export, never TSV); Bulleh Shah's `figure_died` 1758
>    stays as it is; INV-3 is narrowed to the ids in `data/review/descriptions_approved.txt`; long Descriptions
>    are split by `## ` section into **continuation columns** `Description 2`, `Description 3`, … (each under
>    50,000 characters, joined back by the site before parsing — Rauf approved this design on 13 October,
>    §9.336; it needs the small site change and test described in §9.334). Stop there: do not import, push or
>    touch the sheet.

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

THE REPO (since 26 October 2026) IS ON RAUF'S WINDOWS PC, not in the cloud container and not on the Mac:
  C:\Users\g16\Desktop\Shrines Project
In device_bash it mounts at "$HOME/mnt/Shrines Project". Read the 26 OCTOBER box first. The Mac path below is kept for history only:
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
  **UPDATE 10 Oct 2026 (§9.291): khulasat is at 528/610 (521-528: Multan, Sakhi Sarwar, Uch, Pakpattan, Lahore, Batala, Dipaliwal). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 529-610 (re-render bands). The request limit blanked ~120 image reads at the start; every page was re-read half by half before commit. Still owed: p0446's year, 435-440, 411-416. The §9.287 line below is SPENT. Two firings started at the same minute (§9.290/§9.291): the one whose lease landed first transcribed, the other took notes — that worked; but CHECK FOR AN EXISTING `docs/_APPEND_<n>.md` BEFORE WRITING ONE, a sibling may own that number.**
  **UPDATE 10 Oct 2026 (§9.293): khulasat is at 536/610 (529-536: the end of suba Thatta with Hinglaj, Sehwan and the Manchhar lake; Gujarat's sarkars, Ahmadabad and Shah Alam Bukhari's and Qutb Alam's tombs, Somnath; Ajmer and Khwaja Muin al-Din Chishti's mazar with his dates; Malwa). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 537-610 (re-render bands). (§9.315: the owed re-reads are DONE too (411-416, 435-440, p0446). khulasat has no transcription work left. §9.312: 601-610 done — BOOK COMPLETE, 610/610. §9.310: 593-600 done. §9.309: 585-592 done. PDF 588 is the unnumbered first page of the preface; 589-592 are a separately paginated table of contents whose folios RISE 8→5 — not misreads. §9.303: 569-576 done.) (`[media removed: request limit]` in the transcript is not proof a page was drafted blind — see §9.295 — but keep re-reading any page drafted under it once images display.) The §9.287 and §9.291 pointers are SPENT.**
  **UPDATE 10 Oct 2026 (§9.287): khulasat is at 520/610 (513-520: the six rivers, the Salt Range, Gujrat and Shah Daula, Sialkot and Imam Ali al-Haqq, Batala, Achal, Baba Nanak and the Guru succession). THE NEXT TRANSCRIPTION BATCH IS `khulasat_ut_tawarikh` 521-610 (re-render bands). The request limit blanked ~100 image reads at the start again; every page was re-read half by half before commit. Still owed: p0446's year, 435-440, 411-416. The §9.273 line below and the §9.282 pointer are SPENT.**
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
   **Steps 2, 3 and the step-5 checks are scripted (10 October 2026, §9.285):**
   `python3 pipeline/book_queue/integrate_book.py <slug> --title "<Author, Short title>" --date "<D Month YYYY>"` (no held ids since §9.317: run the formerly held ones separately with `--only <them> --claim-note "<the held-items note>"`),
   with `--dry-run` first (it exits 7 if an id block holds `####` subsections or `---` rules: read the block, then add
   `--deep-blocks`, §9.308). It backs up, appends verbatim, attaches each id's Doubts items (three head shapes, §9.290: if the
   takeaways have Doubts naming an id and the dry run attaches none, the shape is new — extend `doubt_items`,
   never integrate without them), creates
   missing entries with their Description, and refuses on any line not in the takeaways. It does NOT
   do province bullets or cell proposals. Read its skipped/created lists into the run record.
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

### Held items: LIFTED (Rauf, 10 October 2026, §9.317)

(Ruled, no longer held — Rauf, 10 October 2026, §9.284: `sawaneh_shah_jamal` maps to NO row, and
**Deccan / non-Pakistan sites are out of scope**: never create an entry or propose a cell for one.)

The six holds are lifted: `langer-makhdoom`; whether `shah-chiragh` conflates two men; the two Shah
Inayats (`shrine-of-shah-inayat-qadiri`, `dargah-roza-sufi-shah-inayat-shaheed`); `shrine-of-pir-mangho`
and Bava Gor; Waris Shah's Jalal/Jahanian split (the Uch pair); and Bulleh Shah's death year. **Integrate
these ids like any other, with `--claim-note "Attached as this book's claim, not as a settled
identification or date (Rauf, 10 October 2026). This row was held over an open question (a death year,
or which man or which shrine is meant); the book's material and its doubts are shown as they stand and do
not settle it."`** All 14 books integrated by 10 October have been brought up to date (§9.317). What
stays held is the SHEET: propose no `figure_died` for Bulleh Shah and no cell that picks a Shah Inayat,
an Uch saint or a Shah Chiragh. A candidate line held only for these questions is a row or a join, flagged
"may be the same as" (§9.317).

**Hedged attachments stay out** (Rauf, 10 October 2026, §9.317): where the only link between the book
and a row is a hedge in the book ("a possible reference to Kali", a figure "associated" with a row, a
place the book may or may not mean), do not attach; the material stays in the book's notes.

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

### Rulings of 10 October 2026 (Rauf, in chat; HANDOVER §9.286). These amend the 8 October ones below.

- **Province bullets go into EXISTING entries only.** Every entry that already exists for a row
  `shrine_index.tsv` tags with the province takes the book's province bullets, inside the book's
  `## From …` section. Never create an entry just to hold province material.
- **Sites the book documents that the archive lacks become NEW ROWS: one row per grave or shrine.**
  Take them from the takeaways' `## Figures and sites not in the archive`, only lines marked `[PK]`
  (Deccan and every other non-Pakistan site stay out, §9.284). Coordinates are left BLANK; research
  agents will fill them later. The rows go out as a CSV patch in `data/review/` (RULE 3), and each new
  row also gets a `shrine_entries/<id>.md` holding the book's line verbatim.
- **Saints with no site in Pakistan go to the saints-and-orders layer** (the KG behind `/graph` and
  `/saint/:slug`), not to the sheet.
- **How a firing applies these, per book, after `integrate_book.py`** (all scripted on 10 October;
  each refuses rather than guesses, and each takes its per-line judgements from
  `pipeline/book_queue/new_rows_decisions/<slug>.json`, which you write and which is the record):
  1. `integrate_book.py <slug> … --province <key>` once per province the book has,
     then `integrate_book.py <slug> … --groups` if the takeaways have any
     `### <Name> (place-level|person-level: N rows)` block (ruling of 10 Oct, §9.289, below).
     Nothing is held any more (§9.317). Where an entry already has this book's section and it is not
     the last one, `--into-existing` puts the block at the end of that section rather than refusing.
  2. `build_new_rows.py <slug> --title … --date … --stamp <YYYY-MM-DD> --dry-run`, then READ every
     proposed Name against `src/data/shrines-fallback.json`: a line that is an archive row already, a
     held identity, not a grave or shrine, or unnamed goes under `exclude` with its reason; lines that
     may be one person go under `pair` (kept apart, flagged, never merged). Then run it for real.
     Hadiqat's file is the worked example (6 excluded, 4 pairs).
  3. `build_book_figures.py <slug>`, after setting `figures.alsoNamedRegions`, `skipItems`, `joins`
     (only a join you have checked against the graph's own record, `data/kg.json` and
     `data/kg-seeds.json`: Hadiqat's "Chiragh-e Dehli" looked like `syed-nasiruddin-mahmud` and is
     not him) and `hasRow` (figures that already became rows in step 2).
  4. Add the book's title to `BOOK_FIGURE_WORKS` and any new region heading to
     `BOOK_FIGURE_REGIONS_UR` in `src/lib/bookFigures.ts`; `bookFigures.test.ts` fails until you do.
  5. Run the whole `npm run verify`. Report every exclusion, pair and join in the run record.
- **Place- and person-level groups go into existing entries too** (Rauf, 10 October 2026, §9.289, answering
  §9.288: "yes"). A takeaways block `### <Name> (place-level: N rows)` or `(person-level: N rows)` (ruling (a):
  Lahore 35 rows, Guru Nanak 18, …) is copied, verbatim and minus its `**id**, …` join line, into the EXISTING
  entry of every id it lists, inside the book's `## From …` section under `### Place-level material: <Name>`
  / `### Person-level material: <Name>`. Never create an entry to hold it. `integrate_book.py --groups` does
  this and refuses if a heading's N does not match the ids it lists. A second shape (madho_lal_hussein, §9.306) is a section `## Rows attached at place level or person level …` whose
  groups are single bullets, `- **id**, **id** (the book's "Lahore" — all 35 archive rows in the city):` with indented
  sub-bullets; `--groups` reads that too (kind from "principal figure" / "in the city", N from "all N" / "both" / "the one row").
  §9.307 generalised it: any region headed (##-####, before `## Doubts`) "Place-level …" / "Person-level …" / "Place level …" /
  "Person level …" / "Rows attached at …" is read; every top-level bullet in it must be a line of bold ids (the
  `(the book's "X" …):` parenthesis on the same line or opening the next). It REFUSES on ernst_lawrence, boivin,
  schaflechner, werbner_basu, abbas, qureshi, rozehnal and schimmel_mdi as they stand: extend it for each, never hand-copy. Books with groups: tahqiqat (20, done),
  dhillon (11), khalid_a_white_trail (19), khalid_in_search_of_shiva (15), khalid_walking_with_nanak (24),
  nizami (1) — check each one's heading format against the script's regex before running it.
- **Which kinds of site become rows** (Rauf, 10 October 2026, §9.313): graves and shrines, and also
  Hindu temples and samadhs, Sikh, Udasi and Jain sites, rulers' tombs and graveyards, and mosques (a
  mosque row is `Muslim Shrine` / `Mosque`: the sheet has no mosque category). A site the book records
  as already demolished still gets a row, `status` blank. Left out, with the reason in the tag file:
  secular and British-era sites, and Brahmo and Christian foundations (no archive category fits).
- **Every book but hadeeqat: the new-rows step goes through a TAG FILE** (§9.313). `build_new_rows.py`
  reads only `- [PK]` lines, and only hadeeqat has them. Never rewrite the takeaways to fit it. Instead:
  1. Write `pipeline/book_queue/figure_tags/<slug>.tsv` (`tareekh_lahore.tsv` is the worked example
     and documents the columns): one row per `- **` item line of `## Figures and sites not in the
     archive`, by line number, kind `row` / `join` / `figure` / `skip`. For a `row`, give your
     transliteration of the head as `name`, and give `category` (one of the six) and `site_type` from the
     item's own heading and words. Give `silsila` only where the line names the person's OWN order, and
     only for a site in Pakistan; a site outside Pakistan is `figure` or `skip`. Set `#location` only
     where every row is in one city; otherwise split the file per city or leave it blank.
  2. Before tagging a Muslim burial `row`, look for it among the proposed rows of earlier books
     (`data/review/PATCH_new_rows_*.csv`) and the archive (`src/data/shrines-fallback.json`). Use
     `join` only where the lines agree on what identifies the burial: the master, the address, the
     companions. A name alone is not enough; such a line stays a `row`, with the other id in `target`
     ("may be the same as", flagged, never merged). Put the basis of every join in `note`.
  3. `build_tagged_rows.py <slug> --title "<the title integrate_book used>" --date … --stamp … --dry-run`.
     It refuses on an untagged item, a category outside the six, a silsila not on the line, an
     unresolved target or a colliding id. Fix the TAGS, never the check. Then run it for real, and run
     a second instrument (verbatim + byte prefix against `out/integration/<slug>/before_tags/`).
  4. Write `data/review/PATCH_new_rows_<slug>_<stamp>.md` (Tareekh's is the model) and the run record.
  Tagging is a notes-turn job. When no `summarized` book is left to integrate, a notes firing tags the
  next integrated book with a Figures section and no `PATCH_new_rows_<slug>_*.csv`. Claim that book
  first. `figure` tags are not yet read by `build_book_figures.py`: extend it, with a test, the first
  time a book needs them (Tareekh had none).
- **A contested attachment is attached as the book's claim.** Where the takeaways disagree with
  themselves about whether material belongs to a row (`shrine-of-baba-shah-kamal`: a section calling
  the index's "brother of Shah Jamal Lahori" a lead, against Doubt I1's "must stay unmapped"), attach
  it with the doubt beside it and the framing "this book claims …". Present the information as it is.

### Rulings of 8 October 2026 (Rauf, in chat)

- **Province material goes into every entry in that province** (narrowed on 10 October to
  entries that already exist; see above). Step 3 above takes only bullets headed
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

## DO NOT RUN GIT ON THE MAC OR THE PC COPY
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
- **Write every new file back into the repo (the PC copy since 26 Oct)**  with device_commit_files, or directly with
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