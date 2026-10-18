
### 9.354 — 16 October 2026 (02:20-03:00Z): Stage = notes. The page-image checks on the Urdu-script patch (§9.353's next step)

**Stage: notes** (scheduled firing, session sched_2026-10-16T0220Z). The repo folder was not connected at start, so access was requested and granted. There was no pending HANDOVER doc in the project newer than §9.353 (the latest project doc is 154 = §9.353's run record). The repo shows no answer from Rauf to §9.344/§9.348/§9.351/§9.352/§9.353; the only commits since are the 15 Oct phone-council UI work. So, per the BOOK_QUEUE_TASK box, this firing did the image checks. There were no live claims; `urdu_image_checks` was claimed (and released at the end, if the bridge allowed; see below).

**Method.** `pdfseparate` split out single pages (Tareekh PDF 3, 80, 190, 191, 206, 217, 219, 226, 233, 234; Tahqiqat 513, 577) into `out/urdu_image_check/` (gitignored scratch). They were staged to the cloud, rendered at 200/400 dpi, cropped and read. **Bridge gotcha:** a file just written in the connected folder is refused by `device_stage_files` as "hardlinked (nlink > 1)" for about a minute. Waiting and re-staging works; a fresh `cp` does not help.

**Result** (`data/review/URDU_IMAGE_CHECKS_2026-10-16.md`):
- **ہین/ہیں: the book prints ہین in all 13 Tareekh quotations** (pp. 80, 206, 217, 219, 226, 233, 234). The quotations are right. Our Tareekh transcription modernised to ہیں, so patch lines 26-36 become "no change".
- **Teja Singh (line 17):** printed **سمادہ** (with دال) on p. 190, and the name is printed تیجا سنگہ. Proposed `_name_ur` = `سمادہ راجہ تیجا سنگہ`.
- **Ranjit Singh L11 (line 23):** printed "کہ سن چودہ سو ستر" (Tahqiqat p. 577). The draft's سن is right and the transcription's کس is the error, so it was not a silent repair.
- **Mozang L13 (line 25):** printed **جب** (Tahqiqat p. 513). The draft is right and the transcription's بعد is wrong.
- **NEW misquotation, Mozang L23:** the book prints "اسمین دو گرنتھہ **باداب** تمام رکھے ہین" ("two Granths kept with all due reverence"). Draft and transcription both have "دو گرنتھ ہین جو اب تمام رکھے ہین", and the draft's English translates that misreading. Proposed fix: quote as printed and correct the English.
- Not settled: Dera Sahib L83 "بنگ کوٹنے" is probably printed **گھوٹنے** (p. 206; the same page and p. 217 print گھوٹ). The crop is too broken to be sure.
- **Orthography finding:** both books print dotted ن for nun ghunna throughout (مین, یہان, سکھون) and often ہی for ہے. The drafts keep ہین but modernise the rest of each quotation. §9.242 ruled "as printed"; bringing every quotation into line is a bulk edit, so it is asked of Rauf.
- Patch line 24 was not checked (the bridge dropped mid-run).
- Nothing was applied: no md draft, patch CSV, import CSV, transcription or sheet cell changed. The patch TSV itself was NOT edited either; its `proposed` column for lines 17, 23, 25-36 should be read with this file.

**Questions for Rauf (RULE 5, asked in the report):** (1) apply line 17 (سمادہ) and the new Mozang باداب correction? (2) quotations from Tareekh/Tahqiqat: bring them fully to the printed spelling (مین, یہان, -ون), or leave the half-modernised form? (3) still open: §9.353 Q1-3, §9.352's three, §9.351's five, §9.344/§9.348, the §9.346 refresh order.

**Next notes firing:** if Rauf has still answered nothing, check patch line 24 and the گھوٹنے crop, then stop. There is no other un-held work: step 3 waits on the join-check answers. Nothing is committed; Rauf must run `git add -A && git commit`. Scratch that is safe to delete by hand: `out/urdu_image_check/`.

(Appended on 16 October 2026 ~05:10Z by the §9.355 firing from the attached project's `shrines/155_PENDING_HANDOVER_9354_urdu_image_checks_NOT_IN_REPO.md`, verbatim; the bridge had dropped before this firing could write it back.)
