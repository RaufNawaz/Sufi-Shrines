# The Gold Standard — what "done properly" means for one entry

Written 15 August 2026, after reviewing the Bibi Pak Daman entry in full against the live
sheet. Adil's original question about content quality was never "how many shrines do we
cover" — it was "is any one entry as good as it could be." Bibi Pak Daman is the answer:
it is the one entry in the archive that already works the way all 167 should. This document
names what it does, so the standard can be applied and checked rather than just admired.

Current state, measured from `pipeline/sources_report.txt` (167 rows): **7 Field-verified /
Full**, 100 Moderate, 60 Low. Bibi Pak Daman is one of the 7. This is a standard almost nothing
meets yet, not a description of the archive as it is.

---

## What Bibi Pak Daman actually does

1. **Multiple named, specific sources, not filler.** Six distinct works are cited by author
   and title — Pir Ghulam Dastgir Nami's *Bibian-e-Pak Daman*, Hafeez Ullah Manzar's *Hazrat
   Bibi Pak Damanan Lahore ki Tareekh*, and four others — plus the field survey itself
   (surveyor named: Saifullah Imtiaz, 2026). None of the six is a generic line like "general
   established histories of..." — the pattern `build_sources_registry.py` treats as a
   placeholder, not a citation.

2. **Competing traditions presented side by side, never silently resolved.** The entry gives
   two full, independently-sourced accounts of who the six Bibis were — the popular
   Karbala-descent tradition and the custodial family's account that they were a local saint's
   daughters — attributes each to named authors, and then runs a dedicated section
   ("The Long Debate") laying out the specific scholarly case against the popular
   tradition (Umm al-Banin's recorded children, the dates Islam reached Lahore, the Persian
   vs. Arabic register of two of the six names). It ends without picking a winner: "divided
   over history, united in reverence." This is RULE 2 in practice — report what the sources
   say, including when they disagree, rather than manufacturing a clean answer.

3. **The field survey is cited as a source, not just used as flavour.** "Field surveys of the
   shrine record on the order of eight to twelve thousand visitors on an ordinary day..." is
   attributed to fieldwork, not asserted as a bare fact — and the survey itself is the final
   bibliography entry, on equal footing with the book sources.

4. **Uncertainty is stated in prose, at the point where it matters**, not smoothed over:
   "about 63 AH," "around 602 AH," and the shrine's own custodial account "closes by asking
   forgiveness for any errors, since no book survives from the holy women themselves." A
   reader is never given more confidence than the sources support.

5. **Structure that argues, rather than a flat wall of prose.** Overview → who the Bibis were
   → the Karbala story → the counter-tradition → the scholarly debate → the physical complex
   → custodianship and the Sunni/Shia question → devotional life → synthesis → bibliography.
   Each heading does work; none is filler.

6. **Distinguishes sources actually consulted from sources cited within them.** The
   bibliography's last book line is followed by "Earlier works cited within the above:
   Mufti Ghulam Sarwar Lahori, *Hadiqat al-Auliya*..." — flagging that these are known only
   at second hand, through the works directly consulted, not independently verified. This is
   a real provenance distinction most entries don't bother to make.

---

## The gap this review actually found

The entry itself is not the problem. **The provenance layer that is supposed to make this
visible to a reader is dark.** `build_sources_registry.py` correctly computes Bibi Pak Daman
as `Field-verified` / `Full` — that has been sitting correctly computed in
`pipeline/support_levels.tsv` since 9 August. But the live Google Sheet has no `support_level`
column at all, and `info_level` is blank for **162 of 167 rows**, Bibi Pak Daman included. The
badge code shipped in the six-category-schema commit; the data behind it never reached the
sheet. A reader looking at the best-sourced entry in the archive currently sees no badge
telling them so.

`pipeline/validate_shrines.py` now catches this going forward: `sheet_missing_column` (the
column is absent) and `badge_not_populated` (a row has real sourcing but a blank `info_level`
cell — 110 of 167 rows right now) are both new WARN checks. Fix: import
`data/patch_provenance_badges.csv` (167 rows, `id`/`Name`/`support_level`/`info_level`,
regenerated from the current live sheet) per RULE 3.

A second, smaller gap: the split date fields (`year_built`, `year_built_precision`,
`year_built_note`) don't carry the founding-date dispute the prose spends an entire section
on. `data/patch_bibi_pak_daman_dates.csv` fixes this for the one row, using
`year_built_precision = "uncertain / referent disputed"` (precedent: Darbar Mian Qurban Ali
Shah) and a note restating — not inventing — what the entry's own "Long Debate" section
already says: the two traditions disagree by roughly five centuries.

---

## Checklist — apply this before calling any entry "gold standard"

- [ ] At least two specific, named, checkable sources (author + title), or one specific source
      plus a cited field survey. Generic lines ("general established histories of...") don't
      count and are auto-detected by `build_sources_registry.py`.
- [ ] If sources disagree on any material fact (date, identity, lineage), **say so in prose**,
      name who holds each position, and do not resolve it for the reader unless the sources
      themselves resolve it.
- [ ] If a field survey exists for the site, cite it in the bibliography by surveyor and year,
      not just as background texture.
- [ ] Every specific claim of quantity, date, or attribution can be traced to a named source or
      the field survey — not to "it is said" alone, unless that is itself the honest state of
      the sources.
- [ ] Structure the description as an argument (headings that build toward something), not a
      single undifferentiated block.
- [ ] Note, explicitly, when a citation is known only second-hand (cited within another
      consulted work) rather than independently checked.
- [ ] `year_built`/`year_built_precision`/`year_built_note` (and `figure_born`/`figure_died`/
      `event_year`/`event_note` where relevant) are filled in a way that matches what the prose
      actually says — including "uncertain / referent disputed" as a legitimate, correct value,
      not a gap to be embarrassed about.
- [ ] After import, confirm `support_level` and `info_level` are actually populated in the
      sheet for the row — a correct computation that never reaches the sheet is invisible to
      every reader. Run `validate_shrines.py`; a `badge_not_populated` WARN on the row you just
      finished means the work isn't done yet.

## Applying this at scale

Do not rewrite 166 entries against this checklist by hand. The realistic next steps, in order
of leverage:

1. **Import `data/patch_provenance_badges.csv`.** This alone makes every already-correct
   computation visible — no new writing required, and it's the single highest-leverage
   pending action in the whole project right now.
2. **Triage the 60 `Low`-computing entries** (see `pipeline/support_levels.tsv`) against the
   49-entries-no-bibliography finding already on record. Some of these are the Gurdwara/Mandir
   entries no enumerator has visited — for those, the honest fix is not more prose, it's either
   a real citation or leaving the `Low` badge to stand.

   **Update, 15 August 2026**: did exactly this for the Muslim-shrine subset. All 30 books in
   `out/ocr/` turned out to be monographs about shrines this archive already documents well —
   a targeted search across the one general compendium (Alam Faqri's *Tazkirah
   Awliya-e-Pakistan*, already cited 26 times elsewhere) found real, verbatim-quotable material
   for 16 of the 60. See `data/patch_tazkira_enrichment.csv` (pending sheet import) and
   `docs/HANDOVER.md` §8b. The remaining ~44 (mostly Gurdwaras/Mandirs, which a Muslim
   hagiographical tazkira would never cover) are a genuine dead end for *this* book corpus —
   the honest next move for those is new field visits or a different source library entirely,
   not more searching here.
3. **Use this checklist, not vibes,** when the field survey program produces new entries
   (Mauj Darya Bukhari re-shoot, any future oral histories) — build them to this standard from
   the first draft rather than upgrading them later.
