
### 9.327 — 12 October 2026 (19:05-19:40Z): Stage = notes (integration, interactive). The remaining fourteen books integrated — all 31 in-scope books are now `integrated`

**Stage: notes** (integration; interactive, does not count in the alternation). Same session as §9.326 (session_019MfndMWm8AitHWNVbHXcmK). Rauf in chat after §9.326: "work through integrating the rest of the 14 as well". Each book was claimed with `notes_claim.py` before it was touched and released with `--session` straight after it was marked, the next claimed in the same call, so a live claim covered the whole run; `status` shows no live claim at the end. The desktop bridge dropped from ~19:13Z to ~19:28Z between books (nothing in flight; the pending record went to the project as `shrines/132_PENDING_…`, superseded by this section). Run arguments for every book: `out/integration/<slug>/run_args.sh`. Formerly held ids went in a second id run with `--only` and the §9.317 claim note; khulasat's "Shams" row also got it, because its takeaways call it a formerly held identity.

**Script changes — `pipeline/book_queue/integrate_book.py`** (pre-batch copy `out/integration/_batch_2026-10-12/integrate_book.py.before_batch`, md5 `7243a5bd`; now `654ec2a4`). All opt-in. A separate script compared the old and new default readers (`blocks` both modes, `doubt_items`, `group_blocks`, `bullet_group_blocks`) on all 31 takeaways files: 0 differences. New invariants: `pipeline/book_queue/test_integrate_book_readers.py` (synthetic fixtures; every refusal proved to fire), ALL OK.
- `--doubt-heads`: reads Doubts items shaped `- **head** …` (indented continuation) and `**head** …` paragraphs that start after a blank line or heading; each attaches to the ids in its bold head only. No book before this batch had Doubts the old readers could attach (0 on 12 of 14). Items naming a row only in the body were read one by one and attached with `--doubt-also ID:LN` where they are about that row (lists in each `run_args.sh`). Generic lists naming every thin attachment were not attached.
- `--groups --group-lines A-B[,…]` (+ `--group-kind LINE:place|person`): generic inline groups from line ranges the coordinator read; the whole bullet is copied verbatim, ids included; ids from the bullet's first line; "not attached" bullets dropped. Used for boivin, schaflechner, abbas, qureshi, rozehnal, schimmel_mdi.
- `--groups --rows-line`: `### <Name> — N rows` + `**Rows:**` groups (schimmel_as_through_a_veil).
- `--omit-lines A-B`: drops named takeaways lines from an id block (khulasat line 396, the group-section intro the block reader swept into `shrine-of-syed-musa-pak`).

**Chandragup and Shiva.** Every Shiva person group was run with `--skip chandragup-baba-chandragup`: that row's figure is "Shiva (associated)", the §9.317 hedge. Schaflechner and schimmel_mdi needed the Shiva bullet run on its own for this; the others' Shiva groups carry no other chandragup group.

| book | id sections (created) | held run | groups → copies | provinces | 2nd instrument (entries / content lines) |
|---|---|---|---|---|---|
| boivin_hindu_sufis_south_asia | 21 (6) | 3 | 31 → 90 | punjab 7, sindh 59, balochistan 2 | 102 / 5,361 |
| schaflechner_hinglaj_devi | 8 (2) | 1 | 29 → 94 (+Shiva alone 0) | 3 / 21 / 5 | 109 / 4,426 |
| werbner_basu_embodying_charisma | 9 (2) | — | 9 → 41 | punjab 3, sindh 2, kp 2 | 105 / 1,173 |
| abbas_female_voice_sufi_ritual | 14 (0) | 4 | 17 → 76 | 7 / 24 / 5 | 104 / 4,427 |
| qureshi_sufi_music_qawwali | 2 (0) | — | 3 → 34 | punjab 1 | 76 / 937 |
| rozehnal_islamic_sufism_unbound | 10 (0) | 1 | 11 → 74 | 2 each, four provinces | 111 / 3,040 |
| schimmel_as_through_a_veil | 19 (1) | 2 | 8 → 55 | punjab 4, sindh 8 | 106 / 4,814 |
| schimmel_mystical_dimensions_of_islam | 23 (1) | 5 | 11 → 58, Shiva alone → 1 | 11 / 19 / 1 | 108 / 4,250 |
| khalid_walking_with_nanak | 43 (7) | 2 | 24 → 111 | 20 / 5 / kp 3 / 1 | 120 / 3,439 |
| dhillon_janamsakhis | 13 (0) | — | 11 → 82 | punjab 8 | 90 / 1,548 |
| khalid_a_white_trail | 35 (3) | 2 | 19 → 103 | 20 / 5 / kp 8 / 2 | 124 / 4,644 |
| khalid_in_search_of_shiva | 21 (0) | 2 | 15 → 81 | 16 / 5 / 1 | 116 / 3,868 |
| khulasat_ut_tawarikh | 27 (3) | 4 | 18 → 102 | 26 / 13 / 1 | 122 / 10,405 |
| nizami_revised_translation | 1 (0) | — | 1 → 30 | none | 31 / 558 |

The second instrument (a separate script) checked every entry carrying the book's section: every non-blank line is verbatim in the takeaways or is scaffolding; the section appears once and is the last; there are 0 prefix failures against the entry's earliest backup; created entries with no later backup open with `## Current site description` and hold one `## From` section; there are no iCloud " 2" files. Across all 447 entries no `## From` heading repeats. 25 entries were created in this batch. `queue.py status`: **31 integrated**, 11 skipped (the Masnavi set and the wasif books), 0 summarized. No PATCH file: no structured value was proposed.

**Not done, owed:**
- **The tag-file new-rows step** for every book except hadeeqat and tareekh (only those two have `PATCH_new_rows_*`).
- **Lists the takeaways left unmerged, not integrated:** schaflechner's "Further mappings identified in the cross-cutting material" (lines 2775-3009) and boivin's Doubts-side "Placement" lists. This repeats rizvi's case.
- **The khalid/dhillon "inferred site mappings".** They are attached as the takeaways make them, each with its Doubt beside it.

**Needs Rauf:**
1. **New entries created on bare or thin evidence:** `shrine-of-pir-baba-syed-ali-tirmizi` (werbner: "Pir Baba" in a bibliography title; the notes say a human may drop it), `umarkot-amarkot-shiv-mandir` (schimmel ATAV: one place-name in a merism), `sharada-peeth` (white trail: a wall picture of Saraswati), `churrio-jabal-durga-mata-temple` (walking: Durga only), `panj-tirath` (khulasat: "راجه پاندو" in a simile), `jagannath-temple-sialkot` (khulasat: the deity at an Orissa temple), `amb-temples-amb-sharif` (khulasat: Khushab as a faujdari). Keep them, or remove them and leave such rows to their groups.
2. **Group copies into the held rows carry no claim note** (group mode has none). Examples: rozehnal's "Sayyid Jalal ad-Din Bukhari" person group into both Uch rows, and every Lahore line into `shrine-of-baba-shah-chiragh` and `shrine-of-shah-inayat-qadiri`.
3. **White Trail maps `shrine-of-baba-shah-chiragh` on "Mall Road / Lahore High Court"** (chunk 006), which its own chunk 007 and Walking with Nanak both decline. It went in with the claim note.
4. **Should the next firing build the consolidated import now, or first do the tag-file new-rows step?** The "final database" rule says the first firing that finds no book left to integrate builds the import. The tagging rule says that, with no `summarized` book left, a notes firing tags the next integrated book. An import built now would carry none of the new rows the 29 untagged books propose. Asked in chat.

**Next notes firing:** see Needs Rauf 4. Unless he rules otherwise, the standing rule applies: build the consolidated import (BOOK_QUEUE_TASK.md, "The final database"). **Next transcription firing:** nothing to do. Nothing committed: Rauf must run `git add -A && git commit`. Delete by hand: `docs/_APPEND_318.md`-`_327.md` and `pipeline/book_queue/_rz_args.sh`.
