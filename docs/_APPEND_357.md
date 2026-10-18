
### 9.357 — 16 October 2026 (~14:30-14:50Z): Stage = notes (interactive). Rauf answers the held questions, via the question tool

**Stage: notes** (the 14:22Z scheduled firing, continued live: Rauf asked "ask the questions now"). No batch run; this section only records his rulings, verbatim where he typed free text. Nothing applied yet.

**Join check (§9.344, §9.348, §9.351):**
1. **`join` (same site / inside the archive shrine's enclosure): KEEP THE ROW, CROSS-REFERENCE.** The proposed row stays in the sheet; a "see also" is added both ways; nothing is merged or dropped.
2. **`related`: APPEND** the line to the archive entry where it is not already carried; the related row stays its own row.
3. **Graveyard rows that contain archive shrines (Miani Sahib): OWN ROW**, cross-referenced to the archive shrines inside it.
4. **Adjoining-but-outside-the-enclosure burials (Maulvi Jami, Jali Shah Majzub): RELATED**, not join.
5. **Wives, spouses, devotees (§9.351 Q1)** — Rauf verbatim: "related if they did not found a shrine by themselves and new but cross referenced if they are important separately, but the arhive saints and orders explorer should then note such reltionships and add this to the documentation as well that empahsize and make prominent the relationships as much as you can". Read as: `related` by default; `new` + cross-reference where the person founded their own shrine or matters independently; AND the saints/orders explorer on the site must surface these relationships prominently, and the documentation must say so (a site/docs task, to be scoped).
6. **Same-name patrons/endowers (§9.351 Q2): RELATED, HEDGED** ("may be the same as").
7. **Two-text chains (§9.351 Q3)** — Rauf verbatim: "they should be all related but tat the same time if they had a significant impact outisde of just the relationship they should be new as well at the same time". Read as: all `related` (so batch 1's `shah-shams-al-din-qadri-lahori` is re-decided related); where the figure had significant impact beyond the tie, ALSO keep/propose their own row (related + new).
8. **§9.351 Q4 (Kharak Singh / Nau Nihal join) and the batch 2-3 reopenings (three Naushahi rows → related to `ranmal-sharif`; Haji Muhammad Saeed etc.): HELD** — Rauf: "I will nee time to look at this so keep this pending for now". Do not change these decisions.
9. **Rows naming no grave or site (§9.351 Q5; Bibi Rasti, Nau Bahar Shah, Khweshgi, Akhund Rafi, …): KEEP AS ROWS.**

**Location / Description (§9.352):**
10. ~150 "the survey states / the account given to the surveyor" attributions in 29 rows: **REWRITE as "It is reported that …", EXCEPT inside "Where the Sources Disagree"**, where the survey is weighed against a book and keeps its attribution.
11. Ghazi Ilm Din's "presented exactly as the field survey states it … not checked" and Wasif Ali Wasif's "A note on the source wording": **MOVE TO `qa_note`** (out of the Description).
12. Malik Ayaz Location: **"Shah Alam Market, Lahore"**.
→ `PATCH_location_description_meta_2026-10-15.tsv` is approved in substance; apply it with 10-12, then `check_location_meta.py scan` must exit 0.

**Urdu script (§9.353, §9.355):**
13. **APPLY ALL 24**: the 21 proposed lines of `PATCH_urdu_script_2026-10-15.tsv` plus the three image-read fixes (Teja Singh سمادہ, Mozang باداب, Dera Sahib گہوٹنے).
14. Tareekh/Tahqiqat quotations: **FULLY AS PRINTED** (مین, یہان, سکھون, ہی …), consistent with §9.242.
15. The 29 legacy verse runs with no corpus book behind them: **KEEP AS IS**.

**Order of work (§9.346):**
16. **BOTH IN PARALLEL**: alternate firings between the post-import refresh list (provenance for 318 rows, 39 orphaned KG quotes, Urdu i18n refresh/coverage, publication-safety false positives, order-prose/JSON-LD/RDF/figure-identity regeneration) and ORDER-box step 3 (tag-file step on the 29 books, joins before new rows, using rulings 1-9).

**Next firings:** first apply what is approved — join-check apply under rulings 1-7 and 9 (skipping the held item 8 rows), the Location/Description patch with 10-12, the Urdu patch (13) and the as-printed sweep (14) — each as a checked edit with its verifier exiting 0; then alternate per 16. Ruling 5's explorer/docs work: scope it and ask Rauf before touching `src/`. Nothing committed: Rauf must run `git add -A && git commit`. Scratch safe to delete by hand: `docs/_APPEND_356.md`, `docs/_APPEND_357.md`.
