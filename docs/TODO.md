# To-do — as of 16 August 2026

Written at the close of the session covered in `docs/HANDOVER.md` §8b; updated 16 August
(patch count corrected to six, all six re-validated, peer sessions confirmed harmless).
Grouped by who needs to act. Nothing here duplicates HANDOVER's own outstanding lists
(§8's Technical/Editorial items, §9, §10) — check those too.

---

## 1. Needs you — sheet imports (per RULE 3, agents don't write the sheet)

**Six** CSV patches are sitting in `data/`, none imported yet — the four from the 15 August
session plus two from the same day's gold-standard session (HANDOVER §8a) that the first
version of this list missed. They don't overlap with each other, so any order is fine, but
review each as its own pass:

- [ ] `data/patch_new_field_survey_shrines.csv` — 4 new shrine rows. **Note:** the Darbar
      Ghazi Ilm Din Shaheed row originally had blank coordinates (the survey locates it only as
      "Lahore"); on 16 August, per direction, it was given the shared Miani Sahib Graveyard
      landmark pin, sourced to a named press account (Parvez Mahmood, *The Friday Times*,
      20 May 2022 — verified directly, and added to the entry's Bibliography). The pin is
      explicitly approximate; a precise one is still on Saifullah's list (§2).
- [ ] `data/patch_shah_inayat_merge.csv` — 1-row merge/upgrade to the existing "Shrine of Shah
      Inayat Qadiri" entry (adds a field-survey citation, corrects nothing, only adds).
- [ ] `data/patch_field_survey_coordinates.csv` — coordinates + content fix for the 4
      already-published shrines that have been invisible on the live site since 10 August
      (see below).
- [ ] `data/patch_tazkira_enrichment.csv` — 16 rows, adds a citation to already-published
      entries.
- [ ] `data/patch_provenance_badges.csv` — 167 rows, adds `support_level` + `info_level`
      (HANDOVER §8a).
- [ ] `data/patch_bibi_pak_daman_dates.csv` — one row, fills the `year_built*` fields
      (HANDOVER §8a).

All six re-validated with `pipeline/validate_shrines.py` on 16 August. Remaining issues are
expected artefacts, not blockers: `coord_missing` fires on the partial-column patches (they
simply don't carry Latitude/Longitude columns) and on the three deliberately-blank rows named
in §2; `sheet_missing_column`/`badge_not_populated`/`no_image` fire because patches aren't
full sheet exports. Nothing new was found beyond the Ghazi Ilm Din note above.

Import settings per CLAUDE.md RULE 3: Replace current sheet, comma separator, "Convert text to
numbers, dates and formulas" **OFF**.

## 2. Needs you — Saifullah

- [ ] **Precise coordinates for two shrines** — the field survey gave no usable landmark for
      either, so they're left blank rather than guessed:
  - Darbar Hazrat Shah Gohar Peer — no landmark at all in the survey.
  - Darbar Mian Qurban Ali Shah — survey says "Mint Stop, Lahore," which didn't resolve to one
    confident location (a "Pakistan Mint" railway/metro stop and a separate "Akhri Mint" bus
    stop are both real, different places). Ask which he meant, or for a pin.
  - (Darbar Ghazi Ilm Din Shaheed was a third such row until 16 August; it now carries the
    approximate Miani Sahib landmark pin, sourced to a verified press account per direction —
    see §1. It joins the approximate-pin list below.)
- [ ] **Precise coordinates, lower priority** — 8 other geocoded rows use an approximate
      landmark pin (Miani Sahib Graveyard, Mochi Gate, Mozang Chungi, or Data Darbar's own
      coordinate), explicitly labelled as approximate in each row's Location field. A real pin
      from Saifullah would improve all 8 (the 8th being Ghazi Ilm Din Shaheed, added 16 Aug).
- [ ] Still outstanding from before this session (see `docs/HANDOVER.md` §5, §8): Mauj Darya
      Bukhari needs re-shooting (all 12 original media files verified 404); Data Darbar and
      Bibi Pak Daman photos are WhatsApp-compressed and need re-shooting, sent as files not
      chat images; delete the stray database backup from the shared photo folder.

## 3. Needs a human editorial call (flagged, not resolved, by design)

Several new/enriched entries carry a `qa_note` or embedded `qa_note` block listing specific
contradictions in the source material — per RULE 2 these were reported, not silently resolved.
Worth a read before/while importing:

- **Darbar Abul Muali Qadri** — 9 numbered items, including sensitive content (a conversion
  claim, a "war against the Sikhs" claim, a property-origin claim about Dyal Singh College)
  that the survey states as fact but which has no independent citation. See the entry's own
  embedded `qa_note` block in `data/patch_field_survey_coordinates.csv`.
- **Darbar Malik Ahmad Ayaz** — 14 numbered items in the same file, including cross-tradition
  vocabulary ("diyas and prasad" at a Muslim shrine — genuine syncretism or loose surveyor
  wording?) and an unresolved Hijri-vs-Gregorian date question for "8 August 1041."
- **Darbar Mian Qurban Ali Shah** — 13 numbered items, same file.
- Smaller, single-point conflicts in the tazkira enrichment batch: a location dispute for
  Akhund Panju Baba (Akbarpura, Nowshera vs. Misri Pura, Peshawar Sadar); a ~70-year death-date
  discrepancy for Mian Umar Baba/Chamkani (1119 AH per the tazkira vs. 1776 CE already on
  file); a generational-count conflict for Shah Abdul Karim Bulri's relation to Shah Abdul
  Latif Bhittai (great-grandfather vs. great-great-grandfather).

None of these need to be "fixed" — they need a decision on whether the archive's voice should
say more than "both accounts are reported here."

## 4. Needs you — scope/direction

- [ ] **Urdu-specific aesthetic pass** (item 3 from your feedback list) — not done. Checked the
      existing Urdu styling against everything built this session (Tours, map markers, infobox)
      and it holds up: correct RTL, Nastaliq, Eastern numerals, no English leaks. Nothing
      concrete to fix without a specific pain point — if something in the Urdu view actually
      looks wrong to you, a screenshot the way you gave one for Tours would let me fix the
      right thing instead of guessing.
- [ ] **The ~44 remaining `Web-compiled` entries** (60 minus the 16 just enriched) — the one
      book corpus available (`out/ocr/`) is exhausted for this purpose; it's all monographs
      about shrines this archive already documents well. Real progress on these needs either
      new field visits or a different source library, not more searching in the current one.
- [x] **Two peer Claude Code sessions** — resolved 16 August by asking them directly. Both are
      unrelated to this repo: `abshaar-*` works in `~/Desktop/.../Harvard/Abshaar` (the
      Bulleh Shah corpus project) and `copilot-repo-starter-*` in
      `~/Desktop/copilot-repo-starter` (Ethos Copilot app). Both confirmed they have made and
      will make no commits here, and `git log --all` + reflog show no foreign commits. Nothing
      to reconcile.

## 5. Smaller/deferred

- [ ] `pipeline/build_sources_registry.py`'s classify() has known cosmetic termbase gaps not
      worth blocking on this session (e.g. `Qadri`→`Qadiri` romanization inconsistently applied
      across new/enriched entries) — low priority, see individual commit messages.
- [ ] Consider whether `data/patch_tazkira_enrichment.csv`'s citation additions should also
      trigger a `pipeline/build_sources_registry.py` re-run once imported, to move some of
      those 16 shrines off `Web-compiled` in `pipeline/support_levels.tsv`.
- [ ] An untracked, extensionless `shrines` file sits at the repo root again (653,929 bytes,
      dated 9 August). Verified byte-identical (`cmp`) to the already-committed
      `pipeline/legacy-exports/shrines_flat_export.tsv` — the 15 August session archived a copy
      rather than moving it, or iCloud restored it. Safe to `rm shrines`; nothing is lost.
      (An agent attempted the delete on 16 August; the permission layer blocked it, so it's
      left for a human.)
