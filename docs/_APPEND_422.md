### 9.419, 30 October 2026 (interactive, PC): Stage = notes. The first committed snapshot since 8 October, and everything it broke

Rauf, in chat, opening the session: repo hygiene, then `data:build`, `data:validate`, `verify`, and commit the refreshed data; then the dev server, then the deploy question. Written as a fragment because a parallel session had §9.418 uncommitted in HANDOVER.md.

**Hygiene.** `cc9e6fe9` takes the 61 files of `Claude outputs/` out of the index (kept on disk, ignored) and moves the root research note into `docs/`. `1aed6ef5` commits the 30 October docs.

**What `data:build` exposed.** It changed nothing: the working tree already held the live sheet. But the last *committed* snapshot was 8 October's, 171 rows. The sheet holds **489**: the 318 rows from *Hadiqat al-Awliya* and *Tarikh-e Lahore*, live since the mid October import and never committed, plus the 94 public descriptions. The deploy workflow validates the committed snapshot, so no deploy could pass until all of it did. Seven gates failed and 27 unit tests.

**Rulings asked in chat and given** (RULE 5): (1) KG evidence whose words left the sheet points to the team file `entries/descriptions/<id>.md` that still holds them, else to the committed `data/live_sheet_2026-10-15.csv`; (2) the 318 rows get the full refresh now; (3) displayed excerpts (order prose, tradition definitions and memberships) are reselected from the public text, and dropped where it no longer allows one.

**Done, in commits.**
- `3764ba60` publication safety: no longer flags quoted verse ("Ask Waris the poet") or "asking God" (RULE 4, the check was fixed).
- `6a20ac27` `scripts/data/repoint-kg-evidence.mjs` moved 224 `source` strings (174 to team files, 50 to the frozen sheet); nothing else changed. `scripts/data/lib/frozenSheet.mjs` lets both validators read a frozen sheet row by row (a raw read keeps CSV's doubled quotes). Order prose: 15 passages across 9 orders; **Junaidi has none** (Bibi Pak Daman's public text no longer names the line; Peer Makki's shortest run that names him is 2,406 characters, over the 1,200 limit). Bahauddin's note corrected: the entry now says he "planted" the order, not "founded" it.
- `27b01c47` `urdu-i18n/shrine_names_book_rows.tsv`: 260 names as printed (old spellings kept, `[OCR?]` written `[؟]`), 58 unreviewed drafts. Jarwa جروہ and Satghara ستگھرہ as the repository's sources print them; Mint Stop منٹ اسٹاپ a draft. Five places added; "Uch" alone now means Uch Sharif. 18 rows have an empty Location (the book gives candidates only) and stay unplaced.
- `c9abfdae` provenance for the 318 (book, script, patch, takeaways line; `llm`, unreviewed).
- `65f3fa8e` two test suites called `find`, which from PowerShell is `find.exe`.
- `2ab9210a` the snapshot itself, with everything regenerated from it.

**Findings that would cost an hour.**
- **No pin is flagged approximate any more.** The mid October Location ruling moved the pin caveats into `qa_note`, and `approximatePin.ts` reads Location. Five were flagged (Abul Muali Qadri, Ghazi Ilm Din, Khawaja Feroz ud Din, Tahir Bandagi, Malik Ahmad Ayaz). Raised with Rauf.
- Schimmel's *Mystical Dimensions of Islam* (55 entries) now leads the work rollup, ahead of the *Tazkirah* (48); 1,452 citations, 143 entries citing three or more.
- `kg.json` grew 395 → 451 KB; three page budgets rose by that much.
- `npm run verify`'s `format:check` is red on `pipeline/gis/shrine_sources/merged_leads.json`, the parallel session's uncommitted output, not this branch's.
- The build prerenders 169 shrine pages: the 318 stub rows have no prerendered page.

**After the deploy (30 October, ~04:30Z).** Rauf approved the verse rendering and said deploy; `1.7` was fast forwarded to `606aca00` and Pages deployed it (checked in a browser on the live site: Gurmukhi and English captions on Choa Sahib, the "tr." credit on Bulleh Shah). He ruled the approximate pin flag stays off. **CI's end to end job then failed**: six tests, not run before the deploy, because the deploy workflow does not run Playwright. Two were live faults, fixed in `da59934a`: the map sidebar's filters crushed to 1 to 2px by a list with `flex-basis: auto` at 489 rows (in Urdu at 720px the "more filters" toggle was unreachable), and a long citation overflowing an Urdu shrine page at phone width. The other four were tests describing the old data (the Atlas's leading group; three Latin budgets that grew with the bibliographies). **Lesson:** after a data refresh this large, run `npx playwright test --project=chromium` before deploying, not only `verify` and `build`. On this PC: `MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/ npm run build` in Git Bash first (`docs/WINDOWS_SETUP.md`), and `--output` to a scratch folder if `test-results` is locked.

The settings popover was restyled (`bfaa9ac6`, Rauf's request mid session). A parallel session committed `f2c71b55` (the PostgreSQL database) onto this branch at about the same time.
