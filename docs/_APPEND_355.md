
### 9.355 — 16 October 2026 (04:58-05:20Z): Stage = notes. The last two Urdu image checks (patch line 24, the گھوٹنے crop); §9.354 appended from the project

**Stage: notes** (scheduled firing, session sched_2026-10-16T0458Z). The repo folder was not connected; access was requested and granted. No live claims. **The attached project held `shrines/155_PENDING_HANDOVER_9354_urdu_image_checks_NOT_IN_REPO.md`** (the 02:20Z firing lost its bridge before write-back), so §9.354 was appended first, verbatim, and its file written to `data/review/URDU_IMAGE_CHECKS_2026-10-16.md` (md5 checked after commit). No answer from Rauf in the repo since §9.353 (the only commits are the 15 Oct phone UI work), so this firing did §9.354's "next": claimed `urdu_image_checks`, checked patch line 24 and the Dera Sahib گھوٹنے crop.

**Results** (appended to `data/review/URDU_IMAGE_CHECKS_2026-10-16.md` as an addendum; nothing applied, the patch TSV not edited):
- **Line 24 was a false match by §9.353's hand review.** It compared Farid's "روغنی روٹیاں" with a different book (Tazkirah-e Awliya-e Pakistan vol. 1, L6468, "روغنی ردٹی"). The draft cites Sharib p. 63, folio 59, which prints "دو روغنی روٹیوں میں سے ایک" (image read; transcription L1489 agrees). The draft's روٹیاں sits unquoted in English prose. Not a silent repair; proposed no change.
- **Dera Sahib L83: the book prints "بنگ گہوٹنے" (= گھوٹنے), not "بنگ کوٹنے".** A misreading in the draft, now settled at 600 dpi. Proposed: quote as printed.
- Seen in passing, not settled, already `[OCR?]` in the draft: ونڈ[OCR?] looks like ونڈا; کوڑہ[OCR?] before printed پتہر.
- **All 15 image-flagged lines of `PATCH_urdu_script_2026-10-15.tsv` are now checked.**

**Questions for Rauf (RULE 5; asked in the report, unchanged from §9.354 plus one):** (1) apply line 17 (سمادہ), the Mozang باداب fix and the Dera Sahib گہوٹنے fix? (2) quotations from Tareekh/Tahqiqat: fully as printed (مین, یہان, -ون, ہی) or leave as they are? (3) still open: §9.353 Q1-3, §9.352's three, §9.351's five, §9.344/§9.348, the §9.346 refresh order.

**Next notes firing: there is NO un-held work.** Every step of the ORDER box is either done or waits on Rauf: step 2's apply and step 3 wait on the join-check answers, the Urdu and Location patches wait on his approval. A firing that finds no answer from Rauf should say so and stop, without starting anything. `BOOK_QUEUE_TASK.md` has a new box saying this. Nothing is committed; Rauf must run `git add -A && git commit`. Scratch safe to delete by hand: `out/urdu_image_check/`, `out/urdu_image_check2/`, `docs/_APPEND_354.md`, `docs/_APPEND_355.md`.
