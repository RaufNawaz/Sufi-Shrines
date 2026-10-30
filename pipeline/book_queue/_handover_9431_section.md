### 9.431, 30 October 2026 (scheduled, ~21:15Z to ~21:35Z): Stage = places. Watcher firing: Karachi, Balochistan and Khyber Pakhtunkhwa done (long articles in both languages; none needs a short article); their data files built

**Lock and claims.** `entries/places/LOCK_interactive.md` read RELEASED. The PC folder was not connected at the start; access was requested and granted. Punjab, Sindh and Multan were held by `watcher-2026-10-30T2015Z` (live until 22:45Z) and were not touched. The 16:15Z firing's claims on Karachi, Balochistan and Khyber Pakhtunkhwa had expired at 18:45Z; claimed all three (session `watcher-2026-10-30T2115Z`) and released them at the end.

**Where they stood.** The 16:15Z firing left no HANDOVER section (§9.430, For Rauf 5); its files showed: Karachi V1 PASS (round 3), V2 round 1 PASS with notes, V3 round 1 FAIL (59 issues), the Urdu writer's 62 replacements applied (`verify/karachi.ur.r1.changes.txt`); Balochistan and Khyber Pakhtunkhwa V1 PASS (round 2), round 2 confirming V2 PASS and V3 FAIL (3 and 2 issues), the coordinator's fixes applied (`verify/<slug>.ur.r2.changes.txt`). So each needed a confirming round. The pre fix backups were rebuilt by undoing each listed change, and replaying the changes on the backup gave the current file exactly, so no unlisted edit was in play.

**How it ran.** `11_V2_V3_confirming.md`, adapted per place: one confirming worker doing V2 and V3 together on the changed sentences, diffing against the backup. Each reply was saved as both `<slug>.V2.r<N>.txt` and `<slug>.V3.r<N>.txt` before its verdicts were recorded, and every file went to the PC as soon as it existed.

**Balochistan.** Round 3 confirming: **V2 PASS, V3 PASS**, no issues. Done.

**Khyber Pakhtunkhwa.** Round 3 confirming: **V2 PASS, V3 PASS**, no issues. Done.

**Karachi.** Round 2 confirming: V2 PASS, V3 FAIL (5 faults the round 1 fixes introduced: «دیوتا» read as plural without «ایک»; «کراچی میں» twice in one sentence; «ان» pointing first to the students and then to the shaykh; the spoon and lemon race named with a bare conjunctive participle; «روانہ ہوتے ہیں» ending two sentences running). The coordinator applied the five in the verifier's wording (`verify/karachi.ur.r2.changes.txt`); checker ok. Round 3 confirming: **V2 PASS, V3 PASS**, no issues. Done.

**Data files.** `node scripts/data/build-place-articles.mjs` run on a cloud copy; `src/data/place-articles/{karachi,balochistan,khyber-pakhtunkhwa}.json` (long article only; each long prose is under 5,000 words, so no short article) written to the PC. The other data files on the PC were not touched.

**Queue now:** lahore, multan, karachi, balochistan, khyber-pakhtunkhwa `done`; punjab and sindh `verify-short-ur` (§9.430); the other 31 places `draft-team`, next nankana-sahib, uch-sharif, peshawar.

**For Rauf.**
1. Run `node scripts/data/build-place-articles.mjs` on the PC before committing (it will also write punjab.json and sindh.json, as §9.430 says).
2. Notes the confirming verifiers recorded and did not apply (taste or precision, not faults): Karachi's introduction says «تعمیر کیا» and its history «تعمیر کروایا» for the same "built"; «شہر کی وسعت» for "its growth" would be closer as «توسیع»; Balochistan's «وہاں کے ویزوں» could read as the restricted part only, where the English says the province («صوبے کے ویزوں» would be exact). Changing any of them means another confirming round.
3. Still open from the 16:15Z firing's notes: Balochistan, "the MMA" left unexpanded and the Kalhoro heading printed "Kalh6ro" (team notes questions 1 and 3), and the *guāṭi* consensus choice; Khyber Pakhtunkhwa, whether and when the province was renamed (team notes question 3), and Gurdwara Patti Sahib kept despite the [OCR?] on the province's name.

**Commit:** nothing committed. Copy of this section: `pipeline/book_queue/_handover_9431_section.md`.
