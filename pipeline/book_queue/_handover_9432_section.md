### 9.432, 30 October 2026 (scheduled, ~22:15Z to ~23:05Z): Stage = places. Watcher firing: Punjab and Sindh done in full (short Urdu passed); Nankana Sahib done from the sources to a verified Urdu article in one firing; data files built

**Lock and claims.** `entries/places/LOCK_interactive.md` read RELEASED. The PC folder was not connected at the start; access was requested and granted. Karachi, Balochistan and Khyber Pakhtunkhwa still carried live claims of `watcher-2026-10-30T2115Z` (to 23:16Z) although §9.431 says they were released; they are `done` and were not touched. Claimed `place__punjab`, `place__sindh`, `place__nankana-sahib` (session `watcher-2026-10-30T2215Z`), released at the end.

**How it ran.** The 30 October worker prompts, adapted per place: single workers throughout (each file is short enough), one confirming worker doing V2 and V3 together on the changed sentences. Every reply was saved to `entries/places_public/verify/` before its verdict was recorded, the confirming replies under both `.V2.r<N>` and `.V3.r<N>`, and every file went to the PC as soon as it existed. Each confirming worker replayed the listed changes on a backup and got the current file byte for byte. Late round fixes were applied by the coordinator in the verifier's wording; no confirming round was skipped.

**Punjab short Urdu.** Round 1 FAIL (V2 8, V3 50); one fixer, 59 edits (12 adapted, V3 47 rejected because the English says "by many names"). Round 2 confirming FAIL both (5 faults the fixes made: دھارا made feminine, a referent to the governors, a bare کرتے, تعمیرِ نو adding "rebuilding", اس صوبے now reading as Sindh). Coordinator applied them; **round 3 PASS both. Punjab is `done`.**

**Sindh short Urdu.** Round 1 FAIL (V2 4, V3 45); one fixer, 53 edits (جت and لاہری بندر chosen as the one spelling). Round 2 V2 PASS, V3 FAIL (4: word order, Talpur four times in three sentences, a doubled صرف, a feminine predicate with a masculine verb). Coordinator applied them; **round 3 PASS both. Sindh is `done`.**

**Nankana Sahib** (sources 34,531 characters, so one drafter and no composer). Team version 36,890 characters, about 6,250 words, 177 citations to six books, seven disagreements; checker exit 0. Public English 20,085 characters (0.56); V1 round 1 FAIL (five issues: a moved "because", one visitor's impression stated as fact, a tradition stated as fact, a broken referent, an interpretive link), applied with five precision notes; **V1 round 2 PASS**. Urdu 0.98; round 1 FAIL (V2 1, V3 20), 24 edits; round 2 V2 PASS, V3 FAIL (2); **round 3 PASS both**. The long prose is 3,478 words, so no short article. **Nankana Sahib is `done`.**

**Data files.** `node scripts/data/build-place-articles.mjs` run on a cloud copy (8 articles, short versions for lahore, multan, punjab, sindh); `src/data/place-articles/{punjab,sindh,nankana-sahib}.json` written to the PC. The other data files were not touched.

**Queue now:** lahore, punjab, sindh, multan, karachi, balochistan, khyber-pakhtunkhwa, nankana-sahib `done`; the other 30 places `draft-team`, next uch-sharif, peshawar, islamabad.

**For Rauf.**
1. Run `node scripts/data/build-place-articles.mjs` on the PC before committing; it should report 8 articles, the same as the files written.
2. Nankana Sahib team notes ask four questions; the first is whether Dhillon's Kalyan Chand Das Bedi (accountant to Rai Bhoe) and Khalid's Mehta Kalu (accountant to Rai Bular) are the same man. The articles keep them apart. Also: two Dhillon references are copied as the source prints them (`p. 175, folio "l92" [text-layer?] [192]`), and the Urdu says دادا for "grandfather" (Urdu has no neutral word; the Persian probably reads paternal).
3. The long Sindh Urdu (`sindh.ur.md`, passed) still has the spellings the short one now unifies: جٹ 2 against جت 7, لاڑی بندر 1 against لاہری بندر 2, کاشتکار 8 against کاشت کار 5, لگڑبگڑ. Changing them means a confirming round on the long Urdu.
4. `urdu-i18n/urdu-dictionary.json` spells the Qadiri saint of Uch سید محمد غوث اوچی حلبی گیلانی; the passed Punjab Urdu and the English ("Jili") have جیلی. The dictionary entry may be a misreading.
5. `docs/HANDOVER.md` could not be staged from the PC (the bridge refuses it as a hardlinked file), so this section was not appended there: please append it from `pipeline/book_queue/_handover_9432_section.md`. The 9.429 to 9.431 sections may be in the same position.

**Commit:** nothing committed. Copy of this section: `pipeline/book_queue/_handover_9432_section.md`.
