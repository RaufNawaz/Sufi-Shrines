
### 9.443, 31 October 2026 (scheduled, ~05:13Z to ~05:50Z): Stage = places. Watcher firing: Sehwan, Sialkot and Sukkur taken from V1 round 1 to a verified article in both languages; data files built

**Lock and claims.** `entries/places/LOCK_interactive.md` read RELEASED. The PC folder was not connected at the start; access was requested and granted. The claims on `place__sehwan`, `place__sialkot` and `place__sukkur` (session `watcher-2026-10-31T0013Z`) had expired at 01:45Z; this firing claimed them (session `watcher-2026-10-31T0513Z`), renewed once, and released them at the end.

**Numbering.** `docs/HANDOVER.md` on the PC ended at §9.442 (interactive sessions had appended 9.437 to 9.442 after the 01:13Z watcher's 9.436), so this section is 9.443. A copy is in `pipeline/book_queue/_handover_9443_section.md`.

**State found.** `status`: 14 places `done`; sehwan, sialkot, sukkur at `verify-en` (V1 round 1 pending since the 00:13Z firing stopped after the public English); 21 at `draft-team`. Team versions and public English already passed their checkers, so this firing started at V1.

**How it ran.** The 30 October worker prompts, adapted per place, the three places side by side at every step: V1, the coordinator's fixes, a confirming V1; one Urdu writer each; V2 and V3 in parallel; one fixer each; confirming workers doing V2 and V3 together. Every reply saved to `entries/places_public/verify/` before its verdict was recorded (each confirming reply also under `.V2.rN` and `.V3.rN`), and every file sent to the PC as soon as it existed. Every confirming worker diffed against a backup and found only the listed changes. No confirming round was skipped.

**Sehwan.** V1 round 1 PASS with notes; applied three (an ambiguous "them" that could mean the temples, now "its Hindus"; "an ancient place" dropped as the writer's own; "Fishermen lived on its waters" moved off a reading the team notes mark uncertain); **V1 round 2 PASS** (confirming). Urdu 0.93; round 1 V2 PASS, V3 FAIL (23); 27 changes, four V3 fixes reworded to keep the English (1947 "from", not "after"; Dara got past Siwistan; "had a place"; Nandirani Merani left without gender, as the English leaves it); round 2 V2 PASS, V3 FAIL (1, a relative clause between commas that the fixes introduced), applied by the coordinator; **round 3 PASS both. Done.**

**Sialkot.** V1 round 1 PASS with notes; applied five ("long famous" and a present "is a bustling city" corrected; the 2016 travel book's observations put in the past; the chronicle's superlatives framed as praise); V1 round 2 FAIL (1: the airport sentence left in the present beside the newly past mounds sentence), applied; **V1 round 3 PASS** (confirming). Urdu 0.97; round 1 V2 FAIL (4: "from far and wide" added; چچا settled the side of the Pandavas' uncle, now چچا یا ماموں; یہ پرگنہ pointed to Gujrat; "very old"), V3 FAIL (24); 34 changes, 3 rejected (V3's unifying of شاہ دولا and شاہ دولہ, kept apart because the English keeps the team's "Shah Daula" and "Shah Daulah"; مولا for "Karar"; naming Husain Khan as "the Khan who ruled Kashmir"); **round 2 PASS both. Done.**

**Sukkur.** V1 round 1 FAIL (1: "much of the story of the place belongs to Rohri" came from the team notes on how the sources file was built, not from the team version; now "Rohri has shrines of its own and was the home of two mystic poets"), applied with two precision notes; **V1 round 2 PASS**. Urdu 0.94; round 1 V2 PASS, V3 FAIL (17); 18 changes, parts of three reworded to keep the English ("composed songs" stays گیت; Rohri "stands at one end of a singer's road" stays a fact about the place); round 2 V2 PASS, V3 FAIL (1: a bare دوسرے opening a paragraph read as "the other Rohri"), applied; **round 3 PASS both. Done.**

None of the three reaches 5,000 words of long prose, so none needs a short article.

**md5 (first 8), checked against the PC copies:** team `sehwan` e5737bdd, `sialkot` f5a4f39e, `sukkur` a7f49b5a; public en/ur `sehwan` d722b4a8/07724de1, `sialkot` 271d952f/8705dfce, `sukkur` 9bbc2661/12814921.

**Data files.** `node scripts/data/build-place-articles.mjs` run on a cloud copy (17 articles, short versions for lahore, multan, punjab, sindh); `src/data/place-articles/{sehwan,sialkot,sukkur}.json` written to the PC. The other data files were not touched.

**Queue now:** 17 places `done`; 21 at `draft-team`, next eminabad, hingol, shikarpur (all under 8,000 characters of sources: one drafter each, no composer).

**For Rauf.**
1. Run `node scripts/data/build-place-articles.mjs` on the PC before committing; it should report 17 articles.
2. Sialkot: the team version spells one saint "Shah Daulah" and "Shah Daula" in neighbouring sentences (team question 4). The English and the Urdu (شاہ دولہ, شاہ دولا) keep them apart until you say whether they are one man; three verifiers flagged it. Also, a confirming verifier notes that in the janamsakhi tradition the man is usually "Mula" and Karar his trade or caste, so the English "Karar" on its own may want a look.
3. Urdu spellings to settle across articles: Alan Faqir is علن فقیر here and in the Lal Shahbaz article, آلن فقیر in Sindh, الن فقیر in Sadh Belo; Bhakkar is بکھر in Sukkur and Sadh Belo, بھکر in Multan and Sindh. New spellings with no precedent are listed in each place's public notes (for example ایسر لال, کنڈری, مرزا ایرج, مولا کرار).
4. Verifier notes recorded and not applied (taste) are in each public notes file; changing any means another confirming round.
5. §9.432 and §9.435 still live only in `pipeline/book_queue/_handover_9432_section.md` and `_handover_9435_section.md`, if they have not been appended yet.

**Commit:** nothing committed.
