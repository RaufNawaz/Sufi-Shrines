# To-do — as of 16 August 2026

Written at the close of the session covered in `docs/HANDOVER.md` §8b; updated through the
end of 16 August, which added a 37-entry web-research enrichment pass and merged everything
pending into one importable CSV. Grouped by who needs to act. Nothing here duplicates
HANDOVER's own outstanding lists (§8's Technical/Editorial items, §9, §10) — check those too.

---

## 1. Needs you — one sheet import (per RULE 3, agents don't write the sheet)

**Recommended: one consolidated import**, not the seven separate patches below.
`pipeline/build_final_import.py` fetches the live sheet fresh and applies every pending patch
in the correct order (with invariant checks at each step — see the script's own docstring for
exactly what it does and why), then re-runs `pipeline/build_sources_registry.py` fresh against
the final merged content to compute `support_level`/`info_level` for all 171 rows. Run it
yourself with `python3 pipeline/build_final_import.py`; it writes
**`data/shrines_final_import_2026-08-16.csv`** (171 rows, 44 columns — gitignored like other
full-sheet CSV snapshots, so it stays local; re-run the script any time to regenerate it fresh).

Import settings per CLAUDE.md RULE 3: Replace current sheet, comma separator, "Convert text to
numbers, dates and formulas" **OFF**.

**What's in it, beyond the six patches already known about:**
- The web-research pass (§4 below, now done) is folded in as `data/patch_web_research.csv` —
  37 of the 40 targeted `Web-compiled` entries gained a citation-backed addition; the other 3
  ("nothing reliable found") are untouched.
- `support_level`/`info_level` are **not** taken from `data/patch_provenance_badges.csv` — that
  patch was computed on 15 August, before the coordinate/content fix, the tazkira enrichment,
  and this pass all added new Bibliography citations to rows it had already scored. Applying it
  now would have **regressed** the 4 field-survey rows from their current, correct
  `info_level=Full` down to a stale `Low`. The script recomputes fresh instead — full tally:
  `Web-compiled`/`Low` 60→3, `Field-verified`/`Full` unchanged at 16 but now includes the 4
  field-survey rows correctly, `Source-documented`+`Source-seeded`/`Moderate` 152.
- One tazkira-patch row was silently dropped, not silently applied: **Darbar Abul Muali
  Qadri**'s row in `patch_tazkira_enrichment.csv` has an empty `qa_note` column with its entire
  9-item qa_note dumped into the *Description* field as a literal ```` ```qa_note ```` fenced
  code block — a formatting defect that would have rendered a giant code block into the public
  page. `patch_field_survey_coordinates.csv` already has a clean, later, more complete version
  of the same row (its own item #10 shows it had already incorporated the tazkira
  cross-reference correctly) — that version is what the final CSV uses instead. Nothing was
  lost; the tazkira patch's superseded row is simply not applied.
- `patch_shah_inayat_merge.csv` blanks its own `Category` cell. Applying that patch's non-key
  columns unconditionally would have silently wiped the existing "Muslim Shrine" value even
  though HANDOVER/TODO describe this patch as "corrects nothing, only adds." The script only
  overwrites a column when the patch's own value for it is non-empty; 21 columns did have real
  values and were applied (Description, qa_note, Images 1-10, dates, silsila, flags, etc.).
- Reused the actual raw published sheet (fetched directly, not `data/shrines.csv`) as the base,
  because the app's own build step drops any row with unparseable coordinates — exactly the 4
  field-survey rows this session's coordinate patch fixes. `data/shrines.csv` only has 163 rows
  for this reason; the real sheet already has 167, and the final CSV adds the 4 brand-new rows
  for 171.

The six individual patch files are **still in `data/`** for reference/review (each still
independently re-validates clean — `coord_missing` on `sheet_missing_column`-shaped partial
patches and on the 2 still-blank coordinate rows is expected, not a blocker), but importing
them one by one is no longer necessary if you use the consolidated CSV.

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
  embedded `qa_note` block in `data/patch_field_survey_coordinates.csv` — the version that
  actually lands in the final CSV (§1's tazkira/coords conflict note applies to this same row).
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
- [x] **The ~44 remaining `Web-compiled` entries** (60 minus the 16 tazkira-enriched) — done
      16 August via a directed web-research pass (not the book corpus, which was exhausted; per
      direction, online sources only to the reliability bar in
      `entries/web-research-2026-08/README.md`). 40 targets researched: 23 STRONG, 14 PARTIAL,
      3 nothing reliable found (`entries/web-research-2026-08/SUMMARY.md`). 37 folded into
      `data/patch_web_research.csv` and the final import CSV (§1); the 3 with nothing found
      (Allo Mahar, Gurdwara Malji Sahib, Sant Baba Asudaram Darbar) are untouched and remain
      genuinely `Web-compiled` — still real candidates for Saifullah's incoming books.
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
- [x] Consider whether `data/patch_tazkira_enrichment.csv`'s citation additions should also
      trigger a `pipeline/build_sources_registry.py` re-run once imported, to move some of
      those 16 shrines off `Web-compiled` in `pipeline/support_levels.tsv`. Done 16 August —
      `pipeline/build_final_import.py` does exactly this (and for the coords/web-research
      patches too) as its last step; `pipeline/{support_levels,sources,shrine_sources}.tsv`
      and `sources_report.txt` are updated to the fresh computation. New tally: only 3 entries
      are `Web-compiled`/`Low` archive-wide (was 60); 16 are `Field-verified`/`Full`.
- [ ] **Confirmed, not just suspected: all 49 of the "49 uncited entries" have a literally
      newline-free Description** — checked directly against the live published sheet (not a
      stale local file). 47 of the 49 gained structure this session (37 web-research + tazkira's
      15, minus the 1 excluded/superseded row = the coords patch's 1); 2 remain exactly as
      they were (Gurdwara Malji Sahib, Sant Baba Asudaram Darbar — the "nothing reliable found"
      pair; the third, Allo Mahar, already had a placeholder Bibliography line so didn't trip
      the `no_bibliography` check either way). Not a formatting artefact to "fix" — per
      CLAUDE.md's own standing finding, these are genuinely single-paragraph, uncited prose;
      the newline count just makes that mechanically verifiable now instead of a description.
- [ ] `pipeline/validate_shrines.py` flags one pre-existing, unrelated issue on the final CSV
      untouched by anything this session did: **Amb Temples (Amb Sharif)** —
      `figure_not_in_description`, "'Shiva (Mahadev)' — no distinctive token appears in the
      description." Confirmed byte-identical to the live sheet's current Description; not
      caused by any patch, just noted in passing.
- [ ] An untracked, extensionless `shrines` file sits at the repo root again (653,929 bytes,
      dated 9 August). Verified byte-identical (`cmp`) to the already-committed
      `pipeline/legacy-exports/shrines_flat_export.tsv` — the 15 August session archived a copy
      rather than moving it, or iCloud restored it. Safe to `rm shrines`; nothing is lost.
      (An agent attempted the delete on 16 August; the permission layer blocked it, so it's
      left for a human.)
