
### 9.383 — 25 October 2026 (interactive, ~04:30Z to ~23:50Z): Stage = notes. Public descriptions: batches 1 and 2, eight rows done

**Stage: notes** (interactive Cowork session in the cloud, linked to Rauf's Windows PC; files written to the Mac repo through its Google Drive copy when the PC was online, otherwise kept in the cloud mirror and in the project under `shrines/pending/public_descriptions/`).

**Rows done** (all three verifiers PASS on the current files; `check_public_description.py <id>` exit 0). md5 first 8 of `.md`, `.ur.md`, `.notes.md`:
- `mazar-e-iqbal` 0.58, Urdu 0.90: b821837b, 6fe20e54, 6c662e3b
- `mazar-of-bulleh-shah` 0.42, Urdu 0.92: aa25a564, 4a015a9a, 7120602d
- `shrine-of-mian-mir` 0.43, Urdu 0.90: 4eee944c, 6bd6df50, c76ad6c0
- `bibi-pak-daman` 0.34 (L1 exception, V1 r1 and r2), Urdu 0.91: b1fde12a, 20147de9, a9bab10b
- `shrine-of-fariduddin-ganjshakar` 0.46, Urdu 0.90: b27d73eb, c1139d12, 511e2273
- `madho-lal-hussain` 0.38 (L1 exception, V1 r1 and r2), Urdu 0.87: b1e7838a, dbb65978, e1bbac83
- `lal-shahbaz-qalandar` 0.45, Urdu 0.93: 9578e46a, 03d68ec7, 929f486e
- `data-darbar` 0.41, Urdu 0.87: 2fbfdaa6, be3021d2, 5a3f4417
With the two pilots that makes 10 of 94 done. 122 verifier reports and change lists are in `entries/descriptions_public/verify/`.

**Changed tools and brief:**
- `pipeline/book_queue/check_public_description.py` (`ff949959`): L1 accepts 0.30 to 0.85 when the notes carry `L1 exception (V1 round N): <cause>`, written only after a V1 sweep finds no important omission (bibi-pak-daman: two fifths of the team version is a rival identity for the six women; madho-lal-hussain: citations, a disagreement section and up to six tellings of each episode).
- `docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md` (`15e8f5d5`): the L1 exception; Urdu verse already in Urdu takes no meaning paragraph; "Stopping, so polish does not loop" (optional notes applied once after the first PASS, then one confirming round); "What V2 and V3 kept finding in batch 1" (hedges that must govern the whole claim, calqued ایک, نامی ایک شخص for a known person, X کا اپنا, misleading words such as منظرنامہ, agreement, referents across paragraphs); "Late rounds" (when a round returns a handful of issues with corrected sentences, the coordinator applies them by script and one worker confirms V2 and V3 on the changed sentences; two of 36 such edits were faulty and were caught).

**Measured:** V1 failed every first draft (side by side variants kept for length, a rejected identity in its own section, merged chains, a casualty figure built from two counts, relationships the source does not state, scholars' verdicts stated as content). A rival figure named beside the established one ("1266, though most give 1265") is side by side: give the one position and "accounts differ". V1 took two or three rounds a row; the Urdu took three or four (first V3 pass: 46 to 118 issues on a long article). Writers handled team versions up to 190,000 characters whole; the brief's "split above 60,000" was not needed. Usage limits ended the session twice; nothing was lost because every step was on disk.

**Rulings made here (record for Rauf):** the dancing girl telling is the commonly told reconciliation of Bulleh Shah and his master; Bibi Pak Daman's Chilla Bibiyan section cut to one paragraph on the nearby tomb; Madho Lal Hussain's trial told as the Akbar accounts share it (no honey, Zamzam or "let him be"); "Red Fort in Lahore" in Urdu as لاہور کا شاہی قلعہ; Lal Shahbaz's two Tughluq names kept apart because the English keeps them apart (historically very probably one sultan: a question for the English, not the Urdu).

**Not yet in the Mac repo** if the PC stayed offline: batch 2's files and verify reports, bibi-pak-daman's final files, the brief and checker above. Copies are in the project under `shrines/pending/public_descriptions/` (`<id>.md`, `<id>.ur.md`, `<id>.notes.md` for the eight rows); copy them into `entries/descriptions_public/` and check the md5s above. A scheduled firing must not redraft any of these eight rows: if the Mac copy of a row is older (for example `bibi-pak-daman` with a V1 FAIL round 1 stamp), replace it with the project copy first.

**Next:** batch 3 from the large end (`shrine-of-bahauddin-zakariya`, `shrine-of-makhdoom-jahaniyan-jahangasht`, `gurudwara-janam-asthan-nankana-sahib`, `shaktipeeth-shri-hinglaj-mata-mandir`, `bhit-bhit-shah`), claimed `pub__<id>` by the interactive session; the scheduled task continues shortest first. At the end of the stage, ask Rauf about the import design (public text into `Description`, team text into a Team-view-only column, Urdu into `urdu-i18n/content/`) and the KG quotes that anchor to Description text.
