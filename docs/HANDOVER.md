# Mapping the Shrines of Pakistan — Handover / Offloading Document

**Written 10 August 2026.** Author: Rauf Nawaz (RA), with Claude.
Purpose: put everything currently held in one person's head onto paper, so that this project
can be picked up by someone else, or by a future version of me after a gap, without
archaeology.

Read §1, §2 and §9 before touching anything. The rest is reference.

---

## 1. What this is

A public archive mapping Sufi shrines and other religious sites in Pakistan — Muslim shrines,
Hindu temples, Sikh gurdwaras, Nanakpanthi/Udasi darbars, Jain temples, and secular memorials.
Live at **`raufnawaz.github.io/Sufi-Shrines/`**.

Each site has a location, a prose description, provenance metadata, and where available
photographs taken by our own enumerators. The archive's distinguishing claim is not coverage —
Punjab Auqaf alone administers **534** shrines against our **167** — but *honesty about
provenance*: a visitor should be able to tell a field-verified entry from one compiled off the
web.

### People

| Person | Role |
|---|---|
| **Adil Ahsan** | Principal investigator. Sets editorial direction. All external asks route through him. |
| **Rauf Nawaz** | RA. Harvard '28. Currently the only person touching code or data. |
| **Saifullah Imtiaz** | Pakistan-based field coordinator. Conducts surveys, takes photographs, would conduct oral histories. |
| **Muhammad Rizwan** | Second enumerator. |

**CID funding ended 29 May 2026.** Everything since has been unfunded. This is the single most
important fact for planning: assume no budget, one part-time engineer, and a hard horizon at
graduation in 2028. Design for something that survives the author leaving.

---

## 2. Where everything lives — read this or lose an hour

### The apostrophe trap

There are **two** directories on the Desktop whose paths render identically in a terminal.
They differ only in the apostrophe of "rauf's MacBook Air":

| Path | Contents | Git |
|---|---|---|
| `Desktop - rauf's MacBook Air/Harvard/Shrines Project` — straight `'` (U+0027) | one stale `archive/` folder, 11 Jul 2026 | **no** |
| `Desktop - rauf’s MacBook Air/Harvard/Shrines Project` — curly `’` (U+2019) | 60 entries | **yes — this is the repo** |

`find ~/Desktop -maxdepth 3 -type d -name "Shrines Project" -print -quit` returns **the
decoy**. Deriving the path that way silently points every subsequent command at an empty
folder. This cost roughly five rounds of debugging on 10 Aug where `cp` and `find` returned
nothing while the files sat in the other directory.

**Mitigation:** a symlink. Use `~/shrines-repo` and nothing else.

```bash
ln -sfn "/Users/rauf/Desktop/Desktop - rauf’s MacBook Air/Harvard/Shrines Project" ~/shrines-repo
```

### The three locations

| Path | What it is | Under git |
|---|---|---|
| `~/shrines-repo` | The site. React + TypeScript + Vite → GitHub Pages. | yes |
| `~/shrines` | The data pipeline. Python scripts, `termbase.tsv`, `photo_manifest.tsv`, `media/photos/<slug>/`. **Not the repo.** | no |
| Google Sheet | **Canonical datastore.** The site fetches it as published CSV at runtime. | n/a |

`~/shrines` is not backed up and not versioned. That is a real risk — see §9.

Also on the Desktop: an `Awqaf/` tree. **Separate project. Leave it alone.**

---

## 3. Data architecture

The Google Sheet is canonical. The site reads it live, so a sheet edit is a production deploy
with no review step. Treat it accordingly.

### Three-axis classification

The original schema conflated tradition, built form, and condition into one `Category` field.
Now split:

- **`category`** — the tradition. Exactly one of six values:
  `Muslim Shrine` (74), `Hindu Temple` (35), `Sikh Gurdwara` (33),
  `Nanakpanthi / Udasi Darbar` (14), `Jain Temple` (3), `Secular / Memorial` (3)
- **`site_type`** — the built form (tomb-shrine, shrine complex, temple, gurdwara…)
- **`status`** — `Active` | `Occasional` | `Heritage` | `Ruin` | `Destroyed`

### Provenance layers

Computed from the bibliography, not asserted by hand:

- **`support_level`** — `Field-verified` (an enumerator went) → `Source-documented` (≥2
  specific checkable works) → `Source-seeded` (1 specific work) → `Web-compiled` (only
  encyclopaedias, press, or generic filler lines)
- **`info_level`** — what the visitor sees: `Full` | `Moderate` | `Low`

A bibliography line reading *"General established histories of the Qadiri order in the Punjab"*
is a placeholder, not a citation. `build_sources_registry.py` separates the two; without that
separation you cannot compute an honest badge.

### Dates, split apart

The old `Founded/Opened` column mixed construction dates with saints' death dates and Hijri
years with Gregorian ones. Now: `year_built`, `year_built_precision`, `year_built_note`,
`figure_born`, `figure_died`, `event_year`, `event_note`.

**The notes are the most honest content in the archive.** A field reading *"1416 AH is the
survey's answer to 'in which year was this place built', but may refer to the saint's death
rather than construction"* is correct and must never be tidied into a clean number. Legacy
columns `Category`, `Sufi Saint`, `Founded/Opened` are still read as fallbacks.

### Measurable padding check

**Expansion ratio** = words of prose per specific source. A 900-word entry citing one
encyclopaedia is padded, and the number says so without anyone having to argue about tone.

---

## 4. The content pipeline

Current method: **OCR the Urdu book → translate → summarise → integrate into the entry.**

The intended replacement is **extract → compose → verify**, where the composition pass never
sees the raw source, only a list of extracted claims. The reason is specific: when the model
holds the source text and the target entry in the same context, it fills gaps in the entry
with fluent material the source does not support. Separating the passes makes padding
structurally harder rather than relying on instructions not to do it.

`termbase.tsv` (349 terms, 1,389 variants) serves double duty — injected into prompts for
consistency, and used as the lint authority afterwards. Diacritics are light: macrons plus
`ʿayn`/`ʾ` only. Some terms are explicitly flagged **not auto-rewritable** (`roza`,
`samādh`/`samādhi`) because the "correct" form depends on tradition.

---

## 5. Media

### The mapping problem, and why Drive IDs are the only key

The uploaded filenames are unusable — `dfdfdfd - Saifullah Imtiaz.png`, `sdsfdg`, `dds`. One
filename, `dfdfdfdfd - Saifullah Imtiaz.jpg`, is three different photographs spanning **two
different shrines**. 73 files carry no extension at all. A folder download loses the shrine
attribution permanently.

**The Google Drive file ID is the only key that survives.** `photo_manifest.tsv` (206 rows) is
the authoritative shrine ↔ file mapping, built from the survey rows. Extensions come from the
MIME type, never the filename.

Fetch by ID with `rclone backend copyid` — *not* `rclone copyto gdrive:{ID}`, which is
root-folder-ID syntax. gdown works only for link-shared files and rate-limits badly.

### Current state

- 104 photos downloaded; **41 optimised into the repo** (121.5 MB → 12.6 MB)
- **18 video files. Zero audio recordings** — despite oral history being the project's stated
  purpose. Worth sitting with: the thing the project says it is doing has not started.
- **8 slugs must never be renamed** — live photo URLs depend on them: `data-darbar`,
  `abul-faiz-qalander-ali-suharwardi`, `bibi-pak-daman`, `ganj-e-inayat-sarkar`,
  `madho-lal-hussain`, `mazar-e-iqbal`, `peer-makki`, `shah-jamal`

### Near-miss worth remembering

The photo set published on 31 July was **the same photographs, differently numbered**. A naive
copy would have silently reassigned every live image URL — no error, no visible breakage, every
picture attached to the wrong shrine. Proven by RMS pixel-content comparison, not filenames.
Any future media sync must compare pixels, not names.

---

## 6. Known data-quality findings

These are measured, with numbers. They are findings to report, not bugs to fix quietly.

1. **49 of 167 entries (29%) have no bibliography at all.** Single-paragraph prose, 1,150–1,984
   characters, giving specific dates, lineages and diaspora connections with nothing cited.
   Verified not to be a formatting artefact (no stripped headings, no list runs, no
   missing-space-after-period signature). Skews heavily toward Gurdwaras and Mandirs — exactly
   the sites no enumerator has visited and the Urdu anthologies barely mention.
2. **Coverage is ~31% of Punjab Auqaf's register alone** (167 vs 534), before Sindh, KP or
   Balochistan.
3. **Mauj Darya Bukhari lost all 12 media files** — verified 404s. Needs re-shooting.
4. **Data Darbar and Bibi Pak Daman photos are WhatsApp-compressed** — unusable at display
   size. Need re-shooting, sent as files rather than chat images.
5. **A 26 MB third-party database backup** was uploaded into the photo folder. Should be
   deleted, and is a small reminder that the intake folder is not access-controlled.
6. **14 field visits**, not the 9 previously reported. The undercount came from counting
   shrines with self-hosted photos rather than surveys returned.
7. **The provenance badge system shipped with no live data behind it.** The six-category-
   schema commit (10 Aug) added `SupportLevelBadge`/info-level rendering, but the sheet has
   no `support_level` column at all and `info_level` is blank for 162 of 167 rows — including
   Bibi Pak Daman, which `build_sources_registry.py` correctly computes as `Field-verified` /
   `Full` and has since 9 August. The computation was never imported. See
   `docs/GOLD_STANDARD.md` and `data/patch_provenance_badges.csv`.

---

## 7. Scripts (`~/shrines`)

| Script | Does what | Watch out for |
|---|---|---|
| `build_patch.py` | Emits the 162-row correction patch. Holds the literal table and `SLUG_OVERRIDE` preserving the 8 live photo slugs. | Slug overrides are load-bearing. |
| `validate_shrines.py` | 17 checks: figure-not-in-description, coord-off-cluster, expansion ratio, termbase conformance. | `ARTEFACT` regex still carries `re.I`, so it matches "a poet of note:" as an artefact. Fix pending. |
| `build_sources_registry.py` | Bibliography → `sources.tsv`, `shrine_sources.tsv`, `support_levels.tsv`. | Type detection must run before the generic test. |
| `download_media.py` | Fetches Drive files by ID into `media/<kind>/<slug>/`. | Skips non-media MIME types and unmatched rows by design. |
| `finalise_sheet.py` | Strips markdown artefacts, merges image URLs, one importable CSV. | Exempts `Description` (italics are meaningful). Hard-fails on unbalanced asterisks. |
| `append_new_shrines.py` | Parsed the four field-survey entries into rows. | **This is what leaked `**` into 78 cells.** Fixed downstream, not at source. |
| `reflow_descriptions.py` | Restores newlines a TSV export stripped. | Recovers headings and list items only. Paragraph breaks inside a section are unrecoverable. |

### The single most important technical constraint

**Google Sheets' TSV export strips newlines inside cells. CSV preserves them.**

Every Description is markdown. Exporting as TSV silently flattens the entire archive into
unreadable walls of text, and because nothing errors, you find out later. **Always export CSV.
Import with: Replace current sheet, comma separator, "Convert text to numbers, dates and
formulas" OFF** — left on, `1041` becomes a number and the Hijri date strings mangle.

---

## 8. State as of 10 August 2026

### Done

- Full audit of all 163 original rows; 162-row correction patch applied
- Four new entries drafted from field surveys with no invented content
- Three-axis schema designed; six categories established
- Provenance layer computable from bibliographies
- Termbase built (349 terms)
- Shrine ↔ photo mapping solved; 104 photos fetched, 41 optimised into the repo
- Validator ERROR count: **165 → 8 → 1**
- `shrines_v3.csv` produced and imported — markdown artefacts cleaned from 78 cells, 66 image
  URLs merged across 7 shrines

### In flight

Claude Code is working `PROMPT_post_import.md` (in the repo root): schema hygiene on the four
new rows, the `re.I` validator fix, the missing Hinglaj row, front-end schema rendering,
MapTiler's localhost origin, then three separate commits.

### Outstanding

**Technical**

- Import `schema_patch.csv` once Claude Code produces it
- Add `Shaktipeeth Shri Hinglaj Mata Mandir` (values in `patch_addendum_hinglaj.md`) — the
  163-vs-162 gap
- Restore the Luari Sharif prose if the semicolon edit is still in the sheet
- Get `~/shrines` under version control or into the repo

**Editorial — the one that matters**

- **The Bibi Pak Daman gold-standard entry.** Reviewed 15 August 2026 — it holds up; see
  `docs/GOLD_STANDARD.md`. Everything else is infrastructure for holding the other 166 to the
  same standard.

**External asks — not pursuing (per user, 15 August 2026)**

- ~~Auqaf records request~~
- ~~An access letter for Saifullah~~

**To Saifullah, one message**

- Mauj Darya Bukhari needs re-shooting (all 12 files lost)
- Data Darbar and Bibi Pak Daman are WhatsApp-compressed — re-shoot
- Send photos **as files**, never as chat images
- Delete the database backup from the photo folder

**Oral histories**

Setup is documented in `internet_archive_setup.md`. **Consent is the blocking step, not the
tooling.** Internet Archive items can be darkened but never truly deleted, so consent must be
recorded on the tape itself, in the speaker's own language, stating explicitly that the
recording will be *published freely on the internet* — not merely "used for research". Nothing
without clear recorded consent gets uploaded. A refused interview costs an hour; a betrayed one
costs the project its standing at every shrine in the district.

---

## 8a. Update — 15 August 2026: Bibi Pak Daman reviewed, gold standard written down

Reviewed the Bibi Pak Daman entry in full against the live sheet (fetched fresh, not from a
stale local snapshot). It holds up: six specific named sources plus the field survey cited as
a source in its own right, both traditions on the Bibis' identity presented with named
proponents and never artificially resolved, uncertainty stated in prose at the point it
matters. Full analysis and a checklist for applying the same standard elsewhere is now in
`docs/GOLD_STANDARD.md` — read that before touching another entry's sourcing.

The review surfaced finding #7 above (provenance badges dark for 162/167 rows) — bigger than
anything wrong with Bibi Pak Daman itself. Concrete outputs from this session, all pending
human import into the sheet per RULE 3:

- `data/patch_provenance_badges.csv` — 167 rows, adds `support_level` + `info_level` from a
  freshly-regenerated `pipeline/support_levels.tsv`/`sources.tsv`/`shrine_sources.tsv`.
- `data/patch_bibi_pak_daman_dates.csv` — one row, fills `year_built`/`year_built_precision`/
  `year_built_note` from content already in the entry's own Description (the founding-date
  dispute between the two traditions), using the `"uncertain / referent disputed"` precision
  value already established by Darbar Mian Qurban Ali Shah.
- `pipeline/validate_shrines.py` — two new WARN checks, `sheet_missing_column` and
  `badge_not_populated`, so this class of gap fails loudly instead of sitting invisible again.

---

## 8b. Update — 15 August 2026 (same day, continued): field-survey reconciliation,
## enrichment, five frontend fixes

A second Google Form was linked this session: not the shrines database, but the raw Urdu
survey-response form the surveyors fill in per visit. Cross-referencing its 28 rows against
the live 167-row sheet found duplicates, the four already-published field-survey shrines from
10 August, and **4 genuinely new entries**, each with real narrative content (already in
English — the surveyor answers directly in English; only the form's own questions are Urdu)
and real Drive photo/video links: Wasif Ali Wasif, Khawaja Feroz-ud-Din Gharib Nawaz Chishti
Nizami, Shah Tahir Bandagi Qadri, Ghazi Ilm Din Shaheed. A fifth candidate — "Shah Anayat
Qadri Shartari" — turned out to be a second survey of an **already-published** shrine (Shah
Inayat Qadiri, Bulleh Shah's murshid) under a spelling variant; that became a merge/upgrade
patch instead of a sixth new row.

**Bug found in passing, bigger than it sounds**: the four field-survey shrines added on 10
August have no Latitude/Longitude in the sheet. `buildShrine()` silently drops any row without
parseable coordinates — so all four have been **completely absent from the live site and the
built data** since publication, despite being believed live. `src/data/shrines-fallback.json`
had 163 rows, not 167, exactly this gap. Fixed for all 9 affected rows (4 old + 4 new + the
Shah Inayat merge) by geocoding the landmark each survey names (Miani Sahib Graveyard, Mochi
Gate, Mozang Chungi, or Data Darbar's own coordinate when a survey explicitly places a shrine
next to it) — labelled explicitly as an approximate landmark pin, not the shrine's exact
position, with a note asking Saifullah for a precise one where possible. Two rows (Shah Gohar
Peer; Mian Qurban Ali Shah's "Mint Stop," which didn't resolve to one confident location) are
left honestly blank and flagged rather than guessed. (*Correction, 16 August:* a third row —
Darbar Ghazi Ilm Din Shaheed in `data/patch_new_field_survey_shrines.csv` — was also blank,
because its survey locates it only as "Lahore." Per direction that day it now carries the
shared Miani Sahib landmark pin, sourced not from the survey but from a verified press
account (Parvez Mahmood, "Miani Sahib: Resting Place of Heroes," *The Friday Times*, 20 May
2022, naming Ilam Din Shaheed's resting place there alongside Wasif Ali Wasif and Tahir
Bandagi — which also independently corroborates those two rows' placement). The citation is
in the entry's Bibliography, the approximation disclosed in its Location field and `qa_note`,
and a precise pin still on Saifullah's ask list.)

**Enrichment.** All 30 books in `out/ocr/` are monographs about the archive's existing flagship
shrines — a targeted search across the one general compendium, Alam Faqri's *Tazkirah
Awliya-e-Pakistan* (already cited 26 times elsewhere), found real, specific, verbatim-quotable
mentions for 16 of the 60 `Web-compiled` entries (out of 32 checked — Sikh/Hindu names were
correctly not checked against a Muslim hagiographical compendium). Each hit was folded into its
existing entry as a citation-backed addition, not a rewrite, several with real cross-references
between entries (Akhund Darweza Baba ↔ Pir Baba as teacher/khalifa; Baba Shah Chiragh ↔ Mauj
Darya Bukhari sharing a mausoleum complex) and at least two flagged, unresolved conflicts
between the tazkira and existing sourcing (a location dispute for Akhund Panju Baba; a ~70-year
death-date discrepancy for Mian Umar Baba/Chamkani) reported rather than silently picked.

This enrichment work doubled as the requested "OCR → Claude directly, skip LibreTranslate"
pipeline experiment — see `docs/CLAUDE_DIRECT_EXTRACTION_EXPERIMENT.md`. Recommendation: skip
the translate stage for future targeted-extraction work; whole-book translation is untested
and the natural next comparison before retiring `tools/translate.py`.

**Frontend, five items, all verified in-browser (Playwright) and against the full test suite:**

- Embedded Arabic-script couplets quoted inside English-mode prose (`data-darbar`,
  `mazar-e-iqbal`, `lal-shahbaz-qalandar`, others) now isolate in the Nastaliq font via a new
  `.inline-script` `<bdi lang="ur">` wrapper in `inlineFormat.tsx`, instead of silently falling
  back to a mismatched system font.
- The shrine-facts sidebar showed "Category" twice (badge + a plain fact row underneath,
  same value) — the redundant row is gone.
- Guided Tours: the filter-chip row's scroll-with-edge-fade read as a cut-off label
  ("Hindu & Jai...") rather than "scroll for more" — chips now wrap onto multiple lines
  instead. Tour cards restructured from one long "·"-joined string into a title + wrapping
  meta row with real pill badges.
- Map markers: shrines with a real photo now render as a 30px thumbnail pin (category-colored
  ring) instead of a plain dot; shrines without one keep the dot.
- The provenance/sources section is now gated behind a soft `?team=1` flag
  (`src/lib/projectAccess.ts`), persisted via localStorage — explicitly documented as a
  visibility convenience, not security, since the underlying sheet CSV is unavoidably public.

**New pending CSV patches, all per RULE 3 (human import required):**
`data/patch_new_field_survey_shrines.csv` (4 new rows), `data/patch_shah_inayat_merge.csv`
(1-row merge/upgrade), `data/patch_field_survey_coordinates.csv` (coordinate + content fix for
the 4 already-published-but-invisible rows), `data/patch_tazkira_enrichment.csv` (16 rows,
the tazkira enrichment pass). **Import order matters where two patches touch the same row**:
`patch_shah_inayat_merge.csv` and `patch_tazkira_enrichment.csv` don't overlap with each other
or with the other two, so all four can be imported in any order, but each should be reviewed
as its own pass rather than merged into one giant sheet edit.

**Loose end**: two other interactive Claude Code sessions (`abshaar-c6`,
`copilot-repo-starter-e5`) were active on this same repo concurrently with this session,
confirmed via a peer-session check mid-session. Some of the work above (the coordinate+content
patch for the 4 pre-existing shrines, the `?team=1` access gate, part of the map-marker CSS,
the OCR-extraction-experiment doc) may have originated there rather than from this session's
own subagents — it was all reviewed (typechecked, tested, spot-checked against real source
data) before being built on or committed, but if two sessions' commits collide, check
`git log` carefully before assuming either side's history is authoritative. (*Resolved, 16
August:* both peer sessions were asked directly — they belong to unrelated projects (the
Abshaar/Bulleh Shah corpus; the Ethos Copilot app), confirmed no commits here, and
`git log --all` plus reflog show no foreign commits. Nothing to reconcile.)

---

## 8c. Update — 16 August 2026: 40-entry web-research pass, one consolidated import CSV

Direction this session: fix the Urdu font mismatch a screenshot flagged (see the commit —
`--font-serif`/`--font-sans` weren't remapped to `--font-urdu` under `[dir='rtl']`, only
`--font-scale-urdu` bumped size; also localized `year_built_precision` and isolated the
infobox's generic value in `<bdi>`); then, per direction, get Darbar Ghazi Ilm Din Shaheed a
sourced coordinate without softening its survey-voiced content (Miani Sahib landmark pin,
cited to Parvez Mahmood, *The Friday Times*, 20 May 2022 — verified directly); then research
the 40 remaining `Web-compiled` entries online "only to the extent reliable and accurate,"
then build the resulting patch, then produce one final importable CSV.

**Research.** `entries/web-research-2026-08/` — a README fixing the reliability bar (published
books/press/official bodies only, Wikipedia as a pointer never a citation, every fact needs a
verbatim quote from a page actually fetched) and a rules-of-evidence contract, then 8 parallel
agents × 5 sites each. Result: 23 STRONG (≥2 independent verified sources), 14 PARTIAL, 3
nothing reliable found (Allo Mahar, Gurdwara Malji Sahib, Sant Baba Asudaram Darbar — genuinely
searched, genuinely absent from citable sources at the time; a same-day follow-up below
upgraded Malji Sahib, leaving 2). Standout catches: a shared 1962 government
memoir (*Sikh Shrines in West Pakistan*, Dept. of Archaeology) independently covering 4+
gurdwara targets, on top of Iqbal Qaiser's 1998 book — both now the top acquisition-list
candidates; two wrong-assumption traps avoided (Gurdwara Sri Tilganji Sahib is Quetta, not
Lahore; Tomb of Ustad Nuriya is Uch Sharif, not Lahore — agents checked the sheet's actual
coordinates before researching); three same-name-different-site conflations caught and
explicitly NOT merged (a different Gurdwara Malji Sahib in Kanganpur/Kasur; a 2026 gurdwara
reopening story that's actually about Amar Sidhu, not this session's Hadiara entry; a Karachi
Ayub Shah Bukhari namesake tied to a 2014 killing, unrelated to the Gandava shrine in the
dataset). Full detail per site in each `<slug>.md`; roll-up in `SUMMARY.md`.

**Synthesis.** 37 STRONG/PARTIAL findings folded into `data/patch_web_research.csv` via 8
parallel agents, each given the research file and the entry's *current* live Description
(snapshotted to `entries/web-research-2026-08/current-content/`) with an explicit rule:
preserve the original text completely, append 1-4 new sentences plus a Bibliography, put every
conflict/single-source caveat in `qa_note`, never touch the "Unverified leads"/"Acquisition
leads" sections as if they were facts. Two things worth knowing about this batch specifically:
a few agents caught that my own hand-typed verdict labels in their task briefing didn't match
what the research file itself said, and correctly followed the file (source of truth) instead
— a good sign, not a problem. A handful of agents shared a scratch-script filename collision
mid-run; each one detected it, verified the other's output was legitimate rather than
corrupted, and redid its own work under a unique name — no data was lost, confirmed by
validating all 37 files afterward (parseable JSON, balanced asterisks, valid ids, no
duplicates, and — critically — that the *original* Description text survives intact in every
file even where the automated `startswith()` check false-positived because a paragraph was
correctly spliced in before an existing Bibliography section rather than appended after it).

**The final merge — `pipeline/build_final_import.py`.** Building "one CSV ready to import" out
of seven pending patches (six from before this session plus the new web-research one) surfaced
three real, non-obvious problems, each caught by an invariant check before it could do
damage rather than by inspection:

1. **A self-inflicted flattening bug, caught on the first run.** The script's own raw-sheet
   fetch called `raw.splitlines()` before handing the text to `csv.DictReader` — which breaks
   a CSV file into lines *before* the csv module's quote-aware parser can see that a quoted
   multi-paragraph field contains embedded newlines, silently flattening every Description in
   the file. The very asterisk/newline invariant check this project already believes in caught
   it on the first row it looked at. Fixed with `io.StringIO`.
2. **`data/patch_provenance_badges.csv` is stale, not just imprecise.** It was computed on
   15 August, before the coordinate/content fix, the tazkira enrichment, and this session's
   web-research patch all added new Bibliography citations to rows it had already scored.
   Applying it as-is would have *regressed* the 4 field-survey rows from their current, correct
   `info_level=Full` down to a stale `Low` — exactly the "report it rather than adjusting the
   badge" trap this file's own standing findings warn about, except here the badge doing the
   flagging was itself the stale one. The fix: don't apply that patch at all; re-run
   `pipeline/build_sources_registry.py` fresh against the fully-merged final content instead.
   `classify()`'s own field-survey regex was never the problem — confirmed by reading it.
3. **One tazkira-patch row silently conflicts with the coords patch, and the tazkira version
   is the broken one.** `darbar-abul-muali-qadri` appears in both `patch_tazkira_enrichment.csv`
   and `patch_field_survey_coordinates.csv` (contrary to §8b's claim that these "don't overlap
   with each other or with the other two" — that claim was wrong for this one row). The
   tazkira version has an *empty* `qa_note` column with its entire 9-item qa_note dumped into
   the Description field as a literal ```` ```qa_note ```` fenced code block — which would have
   rendered a giant code block into the public page. The coords-patch version is clean, later,
   and already contains the same tazkira cross-reference properly placed. The merge script
   explicitly excludes the tazkira version for this one id and documents why, rather than
   silently letting whichever ran last win.

Output: `data/shrines_final_import_2026-08-16.csv` — 171 rows (167 current + 4 new), 44 columns
(the original 43 plus `support_level`). Gitignored like every other full-sheet CSV snapshot
(`data/*.csv` except `patch_*.csv`/`schema_patch.csv`), so it is not committed — re-run
`python3 pipeline/build_final_import.py` any time to regenerate it fresh against whatever the
live sheet says at that moment. `pipeline/validate_shrines.py` on the output: 3 errors, all
expected (2 are the still-blank Shah Gohar Peer/Mian Qurban Ali Shah coordinates; the third,
Amb Temples' `figure_not_in_description`, is confirmed byte-identical to the live sheet and
predates everything in this session). `pipeline/{support_levels,sources,shrine_sources}.tsv`
and `sources_report.txt` were regenerated from this final content and committed — tally at
that point was `Web-compiled`/`Low` down from 60 to 3, `Field-verified`/`Full` at 16 (correctly
including the 4 field-survey rows this time).

**Confirmed mechanically, not just asserted**: all 49 of the "49 uncited entries" standing
finding have a literally newline-free Description in the actual live published sheet (fetched
directly, not a stale local file) — not a formatting artefact, genuinely single-paragraph
uncited prose.

**Same-day follow-up: the acquisition list, and one upgrade.** The research README promised a
consolidated book list for Saifullah but the original pass never assembled one — every file's
own "Acquisition leads" section stayed scattered. Built
`entries/web-research-2026-08/ACQUISITION_LIST.md`: every source named across all 40 files,
deduplicated, split into 13 already-free-online (several covering multiple entries — Qaiser's
1998 book and the 1962 register between them cover most of the 10 gurdwara targets) versus 13
needing Saifullah specifically (led by Zulfiqar Ali Kalhoro's 2022 Sindh book — confirmed, by
actually checking EFT Sindh's own site, Open Library, archive.org, and South Asia Commons, to
be genuinely unavailable online anywhere, not just unsearched). Two of the highest-value shared
leads were chased rather than just listed:
- The 1962 register (already known to cover several gurdwaras) was checked specifically for
  Nankana Sahib's Gurdwara Malji Sahib — the one entry the original pass had to conclude
  "nothing reliable found" for, since the only strong source located (Qaiser's book) turned out
  to describe a different, same-named gurdwara at Kanganpur, Kasur District. The register has
  a genuine, distinct entry (no. 22, Plate 20) — full text quoted, in the book's own Nankana
  Sahib section, and it explicitly distinguishes itself from the Kanganpur tree of the same
  name. Verdict upgraded to PARTIAL, folded into `patch_web_research.csv` as a 38th row, and
  the final import CSV rebuilt (still 171 rows — Malji Sahib already existed, this only changed
  its content). `Web-compiled`/`Low` is now 2, not 3.
- A 1919 Sukkur District gazetteer, flagged as unchecked by five different Sindh research
  files, was fetched and searched for all five — a clean negative for all of them, but with a
  useful structural finding for two: Bhai Waliram Darbar and Sain Vali Vilayat Rai Darbar's
  talukas (Miro Khan, Kambar) were administratively severed from Sukkur/Shikarpur territory in
  1901 to form the new Larkana district, 18 years before this 1919 volume was compiled — it was
  never going to cover them regardless of content. Correctly redirects future effort to the
  Larkana "B" volume gazetteer (already on the acquisition list) instead of re-checking a book
  that structurally cannot help. Recorded in each affected file rather than left as a dead end.

Net effect on the standing finding: 48 of the 49 newline-free entries now have real structure;
only Sant Baba Asudaram Darbar remains untouched — genuinely searched twice this session
(general web research, then the Sukkur gazetteer specifically), nothing citable found either
time.

---

## 9. Trust calibration — read before relying on earlier notes

Prior sessions produced confident diagnoses that were wrong. A successor should know which, so
as not to inherit them:

- **"The bibliography parser is broken and the support numbers are garbage."** False. The
  parser was correct; it had been fed a flattened TSV. The input was bad, not the code.
- **"9 field visits."** Actually 14.
- **"Audio recordings exist."** Then "none exist." Then "video only." Final answer: 18 video
  files, zero audio.
- **"The front end is vanilla self-contained JS."** It is React + TypeScript + Vite.
- **"MapTiler is out of credits / missing `.env`."** Neither. And the replacement diagnosis
  ("it is an origin restriction, on localhost only") was *also* wrong — see the 18 August entry
  below. Two wrong answers in a row on the same symptom, both asserted without an HTTP probe.
- **A coordinate given for Bibi Jawindi** was Baha'al-Halim's exact point, creating a duplicate.
- **The `re.I` on `ARTEFACT`** caused legitimate prose to be edited to satisfy a broken linter.
  The linter was wrong. Do not edit content to satisfy a check.

### Added 18 August 2026 — same pattern, six more

All six are cases where a prior note stated a scope or a risk confidently, and one cheap
measurement changed the answer. Recorded here so the *notes themselves* are read with the same
calibration this section applies to everything else.

- **"A8 is the Urdu delta for the 16 August enrichment."** The right baseline is not the
  import — it is `urdu-i18n/_english_descriptions.json`, the **12 July** snapshot the existing
  `content/*.md` were actually translated from. English moved on twice since. Diffing the
  import alone misses 23 entries whose Urdu was already stale before the 16 August work began.
- **"~110 entries' Urdu is stale."** 87 of them differ from the July baseline *only* by removal
  of the `=====` separator artefact. Their Urdu is fine. Normalising for one artefact cut the
  apparent size of A8 by roughly two-thirds. (The Urdu files never carried the artefact — 0/163.)
- **"Four entries have no Urdu content."** Eight do: the 4 new 16 August shrines *and* the 4
  field-survey shrines added on 10 August, which never got `content/*.md` files. 163 files
  against 171 rows.
- **"The media in `~/shrines` is unbacked-up."** It isn't. All 104 files in
  `~/shrines/media/photos` are already byte-identical in `media-source/photos` (152 files, a
  strict superset). The directory *was* a real risk — but for 11 documents, not for the photos.
  Risk #1 was correct about the location and wrong about the contents.
- **"The published CSV reflects an import immediately."** It does not. For a while after an
  import Google's publish-to-web endpoint serves **both** versions — nine consecutive fetches
  on 18 August returned the new 171-row file eight times and the old 167-row file once, with
  cache-busting query params making no difference. It settles by itself. **Do not re-import on
  the strength of one stale fetch**, and do not conclude an import failed from a single read.
- **"Four entries need an editorial call" (TODO §3).** 52 entries carry a `qa_note`. Only 2 of
  them explicitly ask for a decision, and those same 2 carry the sensitive material. One of the
  four originally listed — Mian Qurban Ali Shah — resolves all 13 of its own items and asks for
  nothing. See `docs/EDITORIAL_DECISIONS_PENDING.md`.

A seventh, which is a design finding rather than a correction: **`mergeUrduContent()` replaces
an entry's whole `Description Urdu`.** There is no per-paragraph merge, so an Urdu "delta" means
rewriting the whole `content/<slug>.md`, not appending a fragment. Anyone planning A8 as
"translate the new paragraphs and append them" is planning the wrong operation.

### Added 18 August 2026 (second session) — five more, found while drafting Urdu

Found in the course of task A8 (Urdu translations), not by looking for them. Each is a case
where the thing that reports status was itself wrong.

1. **`urdu-i18n/update_log.py` reported "163/163 done (100%)" while 8 live rows had no Urdu
   at all.** It derived its universe from `_english_descriptions.json` — a 12 July snapshot of
   163 rows — so it was structurally incapable of counting any shrine added after that date.
   The documented "resumable source of truth" was the least trustworthy file in the folder.
   Fixed: the universe is now the live row set (171), and an **orphan check exits non-zero**
   if a `content/<slug>.md` has no matching live row (that is the dangerous case — slug drift
   silently stops Urdu reaching the site; a *missing* translation is normal and tracked).
   Real coverage is now reported as 168/171.

2. **`pipeline/a8_urdu_delta.py` counted a finished translation as unfinished work.** Because
   the 12 July baseline has no entry for the newly-added shrines, translating one moved it from
   `full_translation` to `delta` with `added_chars` equal to the whole article — so completing
   five translations made the reported remaining work *grow* (74 → 79 deltas, 61,635 → 89,751
   chars). Fixed by recording the English those five were translated from into
   `_english_descriptions.json` (163 → 168 entries), which both zeroes their delta and makes
   future English drift on them detectable. Scope now reads 3 / 74 / 94 = 171.

3. **Three rows carry a `category` outside the six-value schema** — `'Islam'` ×2 and
   `'Sufi shrine (Islam)'` ×1. This is not cosmetic: `categoryKey()` maps them to `'default'`,
   and `MapSidebar` filters with `activeCategories.includes(categoryKey(s.category))` where
   `activeCategories` only ever holds the six canonical keys — so such a row is excluded from
   **every** category-chip selection and draws with the default marker colour. Of the three,
   only `darbar-abul-muali-qadri` currently reaches the site; the other two have no coordinates
   yet and the dataset build drops them, so for them the bug is latent until a pin arrives.
   A fourth row (Hinglaj) has an *empty* `category` but resolves correctly through the legacy
   `Category` fallback in `shrineModel.ts` — **not** broken, and worth stating because the
   first read of this was that all four were. Patch: `data/patch_schema_and_truncation.csv`.
   Invariant: `category_not_in_schema` (ERROR) in `pipeline/validate_shrines.py`.

4. **Six cells on `Darbar Hazrat Shah Gohar Peer` are truncated mid-sentence in production.**
   `principal_figure` ends `…(Syed Ali Gohar), known as`; `silsila` ends `…reads "Ahl e Sunnat`.
   Cause, confirmed exactly: `entries/entry_shah_gohar_peer.md` records its field values as a
   **hard-wrapped** markdown bullet list, and whatever converted those bullets to sheet columns
   kept only each bullet's **first physical line**. It is the only row in the sheet whose
   *Description* is hard-wrapped — same authoring style, same origin. Restored by re-parsing the
   entry file (`pipeline/fix_wrapped_field_truncation.py`) rather than retyping, with a guard
   that refuses to "restore" anything that is not a strict extension of the current cell. That
   guard immediately earned itself: it caught `Location`, where the sheet value is *longer*
   because a later patch enriched it — restoring would have reverted real work. Invariant:
   `description_hard_wrapped` (WARN) flags the marker for the next such row.

5. **`data/provenance.json` is stale at 163 rows and contains none of the 8 new shrines**, so
   `SourcesProvenance` renders no citations for them. This mattered directly: the enforced Urdu
   convention is to omit Bibliography sections from Urdu content (`validate-urdu-leak.mjs`
   allows zero Latin anywhere, which is stricter than `build_urdu_content.py`'s "Latin allowed
   after `## کتابیات`"). Omitting them here would have left Urdu readers with *no* provenance
   while English readers got a Bibliography — so the five new Urdu articles carry a fully
   Urdu-script bibliography instead, matching the one existing precedent
   (`shrine-of-shah-rukn-e-alam.md`). Regenerating `provenance.json` for the 8 new rows is
   still outstanding.

Also worth knowing, though not a wrong diagnosis: the `## کتابیات` convention has **no way to
carry a Latin-script citation**. Ghazi Ilm Din's entry cites an English press article, and the
gate forbids Latin, so the title is rendered in Urdu with a note that the original is in
English. That loses the exact search string, and it will recur for any Urdu entry citing an
English source. A `<bdi>`-style exemption in `validate-urdu-leak.mjs` is the obvious fix if
this becomes common.

The pattern in most of these: a plausible cause asserted before the cheap verification was run.
The mitigation that has actually worked is encoding invariants that fail loudly — the
unbalanced-asterisk check, the no-newlines-in-Description guard, the marker-count-vs-row-count
check. Prefer those over careful intentions.

---

### Added 18 August 2026 (third session) — the deploy branch, and the real cost of the map

Found while implementing `docs/planning/DESIGN_VISION.md`. The first two are the expensive
kind: both were *silent*, and both had been true for weeks.

1. **`main` was never deployed. The live site builds from branch `1.6`.**
   `.github/workflows/deploy-pages.yml` triggers on `push: branches: [1.6]`. Ten commits had
   accumulated on `main` — including the MapTiler 403 fix (`e961a28`) that this document
   already described as shipped. It was not shipped; it was merged to a branch nothing
   deployed from. The visible symptom was the one a reader would report as "you didn't fix
   it": "Invalid key" tiles still wallpapering the live map. `1.6` was a strict ancestor of
   `main`, so the repair was `git push origin main:1.6`.
   **Check before believing anything is live:** `gh run list --workflow=deploy-pages.yml -L 1`
   and look at the *branch* column, not just the status.

2. **`npm run verify` was a strict subset of the deploy gate.** CLAUDE.md tells you to run
   `verify` before every commit; the deploy ran `typecheck && lint && test && data:validate`.
   So a green local run said nothing about the data gates, and the first deploy of this
   session failed on one (`provenance.json: 2 shrine(s) have no provenance entry`) after a
   local verify had passed. `verify` now includes `data:validate`.

3. **The map's slowness was images, not JavaScript.** A cold load transferred **41 MB across
   141 requests**. The largest single resource was a **12.6 MB** Wikimedia photograph, fetched
   at full resolution to be painted as a **30-pixel marker**; seven more multi-megabyte
   originals followed. The JS bundle — which the build warns about, and which is where anyone
   would look first — was under 250 KB over the wire. Images were ~99% of the payload.
   Requesting display-sized renditions took it to **1,199 KB**. See `src/lib/images/thumbnail.ts`.

4. **Hand-built Wikimedia thumbnail URLs do not work, and fail closed.** Constructing
   `/thumb/f/f2/Name.jpg/320px-Name.jpg` looks right and returns **HTTP 400** unless that exact
   rendition has already been generated. Of widths 96/120/320/400/640/800 tried against one
   real file, only 120 worked — and only because an earlier request had created it.
   `Special:FilePath/Name.jpg?width=N` is the supported entry point: it triggers generation and
   redirects to the bucket the file actually has. Do not "optimise away" the redirect hop.

5. **`data/provenance.json` stamped a hardcoded `updated: 2026-07-12`** on every run, so it
   asserted that date while the dataset grew past it — the file that records provenance was
   itself unprovenanced. It now stamps only when content changes, preserving idempotence.

6. **Two live rows never reach the site at all.** `Darbar Hazrat Shah Gohar Peer` and
   `Darbar Mian Qurban Ali Shah` have **empty Latitude/Longitude**, so `build-dataset` drops
   them: the sheet has 171 rows and the app ships 169. Shah Gohar Peer is not a small loss —
   it carries a day-precise urs (19–21 Ramzan), one of only ~23 in the whole archive, and it
   is one of the five entries whose Urdu article was drafted last session. Both also carry
   out-of-schema `category` values (`Islam`, `Sufi shrine (Islam)`). **Needs coordinates from
   a human — do not invent them (RULE 2).**

7. **`--color-accent` (#c8890a) fails WCAG AA as text** at 2.79:1 on its own pale background,
   and was in use as a text colour at six sites (provenance method chips, tour status chips,
   the map notice bar). Pre-existing, not introduced by the palette work. Fixed by adding
   `--color-accent-text` (#8a5e00, 5.3:1) and leaving `--color-accent` as the fill/stroke
   gilding. Dark mode already passed.

8. **`/graph` had no inbound link from anywhere in the UI** — reachable only by typing the
   URL. The welcome card now links to it and to `/almanac`.

### Added 19 August 2026 — the shrine list was invisible on a laptop

Found while running the e2e suite after the dataset refresh, not by looking for it.

9. **`.shrine-list-panel` collapsed to zero height on any viewport under ~800px.** The three
   `.filter-section` blocks above it are `flex-shrink: 0`, and their combined height grows with
   the data — new `site_type`/`status` values add chips. At 169 rows they totalled 534px, which
   with the header and search bar left the list exactly **0px** at 1280×720. The list was still
   in the DOM and still announced "169 shrines" to screen readers, so nothing looked broken;
   there was simply no list. Fixed by giving the panel a `min-height` and letting the filter
   sections shrink and scroll. **This is the shape of bug to watch for here:** the sidebar's
   fixed-height regions grow silently with the dataset.

10. **The e2e fixture is generated and drifts.** `e2e/fixtures/shrines.csv` is built from
    `src/data/shrines-fallback.json` by `node e2e/fixtures/generate-shrines-csv.mjs`, while
    `SHRINE_COUNT` reads the snapshot directly. Refreshing the dataset 163 → 169 updated one and
    not the other, and nothing noticed until e2e ran — after the commit and after a deploy.
    `e2eFixtureSync.test.ts` now fails in `npm run verify` within seconds. Regenerate, never
    hand-edit.

### Added 20 August 2026 — the Urdu was serving a retraction the English had made

11. **A retracted hallucination stayed live in Urdu for as long as the retraction existed.**
    `allo-mahar`'s English was cut from ~700 words to a short "awaiting a field visit" note
    because the prose turned out to be a confident biography of **the wrong man** — see
    `docs/allo_mahar_resolution.md`, which explicitly declined to replace it with a second
    generated biography. The Urdu was never cut. `mergeUrduContent()`
    (`src/lib/data/urduContentOverride.ts`) overrides the **whole** `Description Urdu` per
    slug, so the Urdu reader kept getting the withdrawn text — a birth year, a decade-long
    presidency of a named body, a death date, an urs date — while the English reader got the
    honest stub. **This is the shape of failure to watch for here:** the two languages are
    separate stores with no link between them, so any editorial *retraction* in English is
    invisible to Urdu by default. Additions at least show up as a stale-looking article;
    retractions look like a *richer* article.

12. **The Urdu/English length ratio is a genuinely sharp diagnostic, and cost nothing to
    measure.** Across 169 live rows: entries whose English had not moved since the Urdu was
    written run **0.74–0.95** (median 0.81, n=93); known-stale ones run **0.36–0.62** (median
    0.62, n=74). The two populations **do not overlap**. `allo-mahar` sat at **2.46** — the
    only entry above 1.0, and the bug. `pipeline/urdu_content_qa.py` now gates on this:
    over-coverage (>1.15×) is an ERROR, under-coverage (<0.70×) a WARN against a ratchet
    that may only go down. It is wired into `data:validate`, so `npm run verify` covers it.
    Note the ratchet counts something narrower than `a8-scope.json`'s delta list: an entry
    whose English grew by one paragraph is a delta but can still clear 0.70.

13. **A check that fired on 144 files was wrong 144 times.** The first version of that gate
    compared `##` heading counts between English and Urdu. Almost every English article
    carries `## Bibliography` and almost every Urdu file omits the section — because
    `scripts/data/validate-urdu-leak.mjs` allows **zero Latin letters**, so a Latin-titled
    source cannot be cited verbatim. Excluding bibliography headings, and only comparing
    when the English has ≥2 prose sections, took it from 144 warnings to 4 real ones. RULE 4
    cuts both ways: the check was the thing that was wrong.

14. **RESOLVED 20 August 2026 — Latin citations are allowed; English prose is not.** The
    project head's call, after this was raised below. `scripts/data/validate-urdu-leak.mjs`
    now scans the article body only and exempts everything from the first bibliography
    heading onward (matching `urdu-i18n/build_urdu_content.py`, which always did);
    `pipeline/urdu_content_qa.py` matches, and additionally computes its length ratio on
    prose only, since an Urdu bibliography's length says nothing about article coverage and
    the old full-text ratio could have blocked a build for adding a source. Re-measured on
    that basis the ratio is much tighter — 0.84-1.06 across 167 entries, median 0.91 — so
    the bounds moved to 0.75/1.20; the allo-mahar retraction still fails at 2.64x, and the
    figure check independently flags its fabricated 22 February / 23 March / 1930s dates.
    **The original problem, kept because it explains the existing files:**
    The rule says no English in the Urdu view "outside URLs/coordinates/`<bdi>`". The leak
    gate forbids every Latin letter in `urdu-content.json`, and a URL is nothing but Latin
    letters. So a citation that legitimately *is* a URL cannot be carried in Urdu article
    content at all. Hit while translating `tomb-of-qutbuddin-aibak`, whose English cites the
    Punjab Archaeology Department's web page. Worked around by naming the source and pointing
    to the English entry for the address. **This needs a deliberate decision, not another
    workaround:** either the leak gate gets a URL exemption (matching the stated rule and the
    `WESTERN_LOCKED` carve-out already in `src/lib/i18n/numerals.ts`), or the convention is
    written down as "Urdu bibliographies never carry URLs".

15. **Two build scripts could not run in a fresh clone, and one of them failed halfway.**
    `pipeline/a8_urdu_delta.py --offline` and `urdu-i18n/update_log.py` both read
    `data/shrines_final_import_2026-08-16.csv`, which `data/*.csv` gitignores. `npm run
    urdu:build` therefore crashed at step **4 of 4**, after steps 1–3 had already written
    their output — the worst kind of failure, because the artifacts look built. Both now fall
    back to the tracked `data/shrines.csv`, whose `Description` is byte-identical to the
    import for every row it carries. **When you add a local-file fallback in this repo, check
    whether the file is gitignored first.**

16. **A partial row source made an orphan check accuse a healthy row.** `data/shrines.csv` is
    the *built* snapshot: `build-dataset` drops the two rows with empty coordinates (see §9.6),
    so it has 169 rows against the sheet's 171. `update_log.py`'s orphan invariant — a
    `content/<slug>.md` with no live row means the slug drifted — then flagged
    `darbar-hazrat-shah-gohar-peer`, which is a real live row with a real translation. **A
    partial universe cannot prove a negative.** Orphan detection now only exits non-zero when
    the source carries all 171 rows, and `a8-scope.json` records `partial: true` so `--check`
    refuses to bless a scope built from a snapshot.

18. **Three Urdu articles asserted the reverse of their English, and one asserted a fact
    the English never claimed.** Beyond the `allo-mahar` retraction in §9.11, found while
    working through all 74 deltas: `ziarat-kaka-sahib` named Akhund Panju Baba among the
    saint's *teachers*, where the English says in as many words that he was a contemporary
    and not a teacher; `shrine-of-pir-baba-syed-ali-tirmizi` said the December 2008 attack
    on the shrine "was foiled", where the English says militants attacked it and destroyed
    its religious inscriptions; and `kalat-kali-temple` opened by placing the town "far
    from Quetta", a distance found nowhere in the English. **The structural point:
    `urdu-i18n/content/*.md` was drafted *from* the English and is not independently
    sourced. Anything in the Urdu that is not in the English therefore has no source
    behind it at all.** The figure check added to `pipeline/urdu_content_qa.py` catches the
    numeric slice of this (and is measured clean across the corpus); phrase-level drift
    like "far from Quetta" is only findable by reading the two side by side. Four instances
    in 74 files is a rate worth assuming still holds in the parts nobody has re-read.

19. **A8's own framing could not see the worst failures.** The task was scoped as "the
    Urdu has fallen behind the English", and `a8_urdu_delta.py` measures exactly that. But
    a retraction makes the Urdu *longer* than the English, and a mistranslation changes its
    length not at all. Both were invisible to the scope tool, and both were more damaging
    than any of the 74 gaps it did find. When a backlog tool tells you the size of a job,
    ask what shape of problem it is structurally unable to count.

17. **One Urdu file rendered "Data Ganj Bakhsh" as "Diwan".** `shrine-of-peer-makki.md` had
    دیوان گنج بخش and دیوان دربار; the other 14 files that name him have داتا. Nothing checks
    that a proper noun is rendered consistently across `urdu-i18n/content/`, and the
    dictionary in `urdu-i18n/urdu-dictionary.json` covers structured fields, not article
    prose. Worth a check if another instance turns up — the class is "a name silently
    re-transliterated in one file".

### Added 20 August 2026 (later) — the knowledge graph was thin, and the thinness was hiding things

20. **The lineage and order features had almost no data, and the reason was that nothing read
    the dataset's own columns.** 130 figures, **6** lineage edges, **20** order memberships —
    all 26 hand-listed in `data/kg-seeds.json`. Meanwhile `silsila` is filled for 52 of 169
    rows and the prose states teacher-disciple links constantly. Three extraction agents over
    the archive's own English (`data/shrines.json`, `shrine_entries/`, `entries/`) produced 130
    quote-carrying proposals; after verification the graph holds **86 lineage edges** (6 human,
    80 machine-extracted) and **64 order memberships** (20 human, 44 extracted), 13 of which
    carry a named sub-order branch. `docs/allo_mahar_resolution.md` is the reason this was done
    as *extraction with verbatim quotes* rather than research: an agent recalling saints from
    training is precisely what produced the biography of the wrong man.

21. **`scripts/data/verify-kg-proposals.mjs` re-checks every quote against the source it
    names.** The extractors reported verifying their own quotes; that is not the same as them
    being verified. All 130 passed — nothing fabricated. **What it proves is "not fabricated",
    never "correct":** whether a quote *means* what the proposal says, whether two similar
    names are one person, and which side of a contradiction is right all remain a human's job.
    Every derived edge carries `method: 'machine-extracted'`, `reviewed: false`, its confidence
    tier and its quote, and the UI labels them `unreviewed` with the quote shown inline so a
    reader can judge for themselves.

22. **Two checks I wrote were circular or stale, and both taught the same lesson.** The
    `isNew` flag on a proposal is *derived* — it says whether a slug is already in the graph —
    so (a) it went stale the moment a dataset refresh added six saints between extraction and
    the next build, and (b) once `build-kg.mjs` started adding a node for every teacher the
    proposals name, comparing against `kg.saints` found every `isNew: true` proposal "already
    present" on the second run. Fixed by comparing against **archive figures only** (`!
    lineageOnly`), which is what the flag actually asserts, plus a `--reconcile` mode that
    rewrites only that derived flag. **Do not store a fact you can compute, and if you must,
    do not check it against a set your own build mutates.**

23. **60 of the graph's figures now have no shrine here, and must never be counted as if they
    did.** A lineage stops dead at the first teacher without a shrine in Pakistan — Hujwiri's
    al-Khuttali, Mian Mir's Shaikh Siyustani — so those are real nodes, flagged `lineageOnly`.
    Use `getArchiveFigures()` for anything describing the archive's coverage; `kg.saints` is
    196 and only 136 of those are archive entries.

24. **Four of the twenty hand-curated order memberships are contradicted by the dataset, and
    four more cannot be verified at all.** Contradicted: `daud-bandagi-kirmani` (seed says
    Chishti; column and prose say Qadiri, five times), `waris-shah` (seed Qadiri; both say
    Chishti), `shams-ali-qalandar` (seed Qalandari; sources say Owaisi Qadiriyya Noshahi and
    frame qalandar as a style of asceticism, not the silsila), `qalandar-baba-auliya` (seed
    Qalandari; sources make him the Azeemia's founder and "Qalandar Baba Auliya" a title).
    Unverifiable — no order named anywhere in their rows or entries: `rahman-baba`,
    `sachal-sarmast`, `sufi-shah-inayat-shaheed`, `makhdoom-burhan-ud-din`. **These are
    untouched.** They are in `data/kg-order-proposals.json#disagreesWithExistingSeed` for a
    human, because overwriting reviewed data with an extraction is the wrong direction of
    trust.

25. **"Sarwari" names two different branches under two different parents.** Sultan Bahu's
    *Sarwari Qadiri* (Qadiriyya) and Makhdoom Nooh's Sindh *Sarwari* line (Suhrawardiyya).
    Keying on the branch string alone would have merged them into one false edge. Any future
    branch-level modelling must key on branch **plus** parent.

26. **The explorer's network graph broke as soon as it had data.** Labels were anchored
    `middle` directly beneath each node, which is fine for the four saints Chishtiyya used to
    have and unreadable at fourteen — every label overlapped its neighbours and the hub. The
    ring now grows with the node count and labels read radially outward, anchored by side.
    Worth remembering as a class: **a layout that works on sparse data is untested, not
    correct.**

27. **1.0 MB of Urdu prose was on the English critical path, and had been for the whole life
    of the feature.** `src/lib/data/urduContentOverride.ts` imported
    `src/data/urdu-content.json` statically. That file holds complete Urdu Descriptions for
    168 shrines, and the static import put every byte of it into the same eager chunk as
    `useShrineData` — so every visitor, English-only included, downloaded and parsed the
    entire Urdu edition of the archive before the first map tile appeared. Measured with
    Playwright against `vite preview` on 20 August 2026:

    | route | eager JS before | after |
    |---|---|---|
    | `/` | 3506 KB | 2517 KB |
    | `/shrine/data-darbar` | 2667 KB | 1678 KB |
    | `/saint/data-ganj-bakhsh` | 2520 KB | 1532 KB |
    | `/almanac` | 2214 KB | 1226 KB |

    The fix is a language-gated dynamic import: `loadUrduContent()` fetches once, on demand;
    `LanguageProvider` requests it whenever `lang === 'ur'`; `applyUrduContentOverrides()` is
    a no-op until it lands; and `useShrineData` subscribes to `onUrduContentLoaded()` so a
    reader who switches language mid-session gets the rows re-merged from the remembered raw
    rows rather than a second sheet fetch. The merge does not change the fingerprint (name,
    founded, English description length), so background-refresh no-op detection still works.

    Two things about *how* this went unnoticed matter more than the number. First, nothing
    was broken: no test failed, no console error, every Urdu assertion passed — the payload
    was simply always present, which is the one state in which a lazy-loading bug is
    invisible. Second, `vite build` had been printing "Some chunks are larger than 500 kB"
    on every single build for other reasons long enough to be read as decoration.

    So the invariant is `scripts/check-bundle-budget.mjs`, wired into `npm run build`: it
    walks the real static import graph out of Vite's manifest (`build.manifest: true` now,
    for exactly this) and fails the build when a route's eager JS exceeds a budget set at
    the measured figure plus ~8%. It also names two chunks that must never re-enter a static
    graph — `urdu-content-*` and `shrines-fallback-*` — because a budget overshoot from
    those is a different bug (a lazy import turned static) than a chunk that merely grew.
    Verified by reverting the static import and watching it fail on all eight routes.
    Behaviour is guarded separately in `e2e/payload.spec.ts`, which a size budget cannot
    see: English never requests the chunk, `?lang=ur` requests it and renders real Urdu
    prose, and a mid-session switch does both.

    **Budgets are measurements, not aspirations.** Raising one should be a line in a diff
    with a reason beside it.

28. **`src/hooks/useShrineData.ts` was invisible to `grep -r`.** It contained two literal
    NUL bytes, used as field separators inside a template literal in
    `fingerprintShrines()`. `file` reported it as `data`, and `grep -rn` printed "binary file
    matches" instead of the line — so any search for a symbol used there silently missed the
    hot data path. They are `\0` escapes now; identical behaviour, and the file is text.

29. **The Saints & Orders explorer was an English page with Urdu furniture around it.** On
    `/order/qadiriyya?lang=ur`, as of the morning of 20 August 2026: the `<h1>` read
    "Qadiriyya", the description was an untranslated English sentence, every one of the
    twenty-three figures was listed in Latin script, every shrine tag was a title-cased slug
    ("Shrine Of Shah Rukn E Alam"), and the founding year read `c. ۱۱۶۵`. `/saint/*` and
    `/graph` were the same.

    The reason it survived is structural, and worth remembering as a class: **the
    no-English-leak guard only ever covered the routes it was written for.** `e2e/urdu.spec.ts`
    checks `/` and `/shrine/<slug>`; the knowledge-graph routes were added later and grew up
    outside it. A guard scoped to a route list silently exempts every route added after it.

    Almost nothing was missing. `urdu-seed.json` is keyed on the *English* string, so
    `translateToUrdu` can resolve a KG name it was never told about — it simply was not being
    asked. `src/lib/i18n/localizeKgName.ts` now asks, from OrderPage, SaintPage, GraphPage and
    LineageView: 67 of 136 archive figures, 92 of 169 shrine labels and all 5 orders come back
    in Urdu, and the rest fall through to English (i18n rule 3 — never transliterate).
    `/order/*` is at **zero** leaks and guarded by `e2e/payload.spec.ts`. Three other fixes
    fell out of it:

    - `translateToUrdu('c. 1165')` always missed, because tokenising left the `c.` in Latin,
      which failed the function's own no-Latin check and returned the input untouched. A
      circa pattern rule in `buildUrduFallback` fixes it everywhere, not just on order pages.
    - GraphPage was calling `translateToUrdu` on a whole English *sentence* — the dictionary
      is keyed on names, so it always missed and printed the English. Orders now carry
      `descriptionUr` in `data/kg-seeds.json`, and an order without one shows no summary in
      Urdu rather than an English one.
    - OrderPage's shrine tags were `slugToLabel(slug)`, which title-cases a slug and so can
      never match a dictionary keyed on the real name ("Shrine of Shah Rukn-e-Alam"). It uses
      the live dataset's names now, which also fixed the English view.

    Because coverage cannot be 100% (the dictionary is generated from the sheet's columns and
    the graph's canonical names often differ), the floor is a **ratchet** rather than an
    assertion: `src/lib/i18n/__tests__/kgNameCoverage.test.ts` fails if coverage drops.
    Raising a floor is a one-line diff; letting it fall silently is how the pages got this way.

    **Then most of the remaining gap turned out not to be a gap.** 51 of the 69 figures with
    no Urdu name were the *same* name written differently on the two sides: the sheet says
    "Hazrat Data Ganj Bakhsh (Ali Hujwiri)" where the graph says "Data Ganj Bakhsh"; a slug
    label says "Shrine Of Shah Rukn E Alam" where the dictionary says
    "Shrine of Shah Rukn-e-Alam". `translateNameToUrdu` (urduFallback.ts) matches on a
    normalized key — lower-cased, parentheticals and quotes dropped, dashes flattened, leading
    honorifics stripped — after exact and case-insensitive matching have failed, and takes a
    record's `altNames` as further candidates (which is how the graph's "Valmiki" reaches the
    entry written "Bhagwan Valmik (Valmiki)"). Coverage: figures **67 → 118 of 136**, shrine
    labels **92 → 102 of 169**.

    Three deliberate constraints, each of which is the difference between this being a fix and
    being a data-corruption bug:

    - **Exact-after-normalization, never by prefix.** "Khwaja Muhammad Qasim" and "Khwaja
      Muhammad Qasim Sadiq" are a master and his pupil, two separate figures in this archive
      (§9.24). Prefix matching would merge them. There is a test for exactly that pair.
    - **Separate from `translateToUrdu`, which is unchanged.** Normalized matching is right for
      proper nouns and wrong for everything else: applied to a status or a date phrase it would
      equate "Active" with "Active c. 6th–12th c.". Only names go through the new path.
    - **A collision test.** Two distinct figures resolving to one Urdu name fails the build.
      Exactly one pair is allowlisted — `valmiki` / `bhagwan-valmik` — and it is not a matching
      failure but a genuine duplicate in the graph, one figure entered twice. The collision
      test found it; it is named in the allowlist rather than quietly tolerated.

    The remaining 18 were genuinely absent from the dictionary, so they were written into
    `SAINTS` in `urdu-i18n/build_dictionary.py` — most are Pakistani names whose native script
    *is* Perso-Arabic, so that restores the original spelling rather than translating it.
    **Figures are now 136/136 and the gate is a hard assertion rather than a floor:** adding a
    shrine whose principal figure has no Urdu name fails `kgNameCoverage.test.ts` and is told
    where to put it. The Sindhi Hindu names among the 18 ("Asudaram", "Satramdas") have more
    than one current spelling and are flagged as unreviewed beside the entries.

    **And a documented trap that is now a fixed one.** `urdu-i18n/README.md` said
    `urdu-dictionary.json` was "Source of truth — Edit here". It is not:
    `build_dictionary.py` holds the real dictionaries and rewrites that JSON from them on every
    run. I added 18 entries to the JSON exactly as instructed, ran the build, and watched them
    disappear without an error. The README now says which file is the input and which is
    generated. Second half of the same trap: `npm run data:build:urdu` writes
    `urdu-i18n/shrine-translations.seed.json` but does **not** copy it to
    `src/data/urdu-seed.json` — only `npm run urdu:build` does — so a dictionary change made
    with the shorter command builds cleanly, reports 100% coverage, and never reaches the app.

30. **Grouping the order pages by branch was the wrong idea, and the data said so.** The
    obvious use for the newly-extracted `branch` field was branch headings under each silsila.
    Only 13 of 64 memberships name a branch, and on Qadiriyya that is four groups of exactly
    one member beside nineteen with none — HANDOVER §9.26 in reverse: a layout tuned to data
    the archive does not have. The branch rides on the member's row instead. What *is*
    well-supported is the opposite fact — 20 of 64 memberships are second or third
    affiliations — so each member now links to the other silsilas they hold.

    Also: **`asRecorded` must not be shown on an order page.** It is the row's `silsila` cell,
    not a per-edge string, so a figure whose column reads "Suhrawardi" but whose prose also
    places them in the Qadiriyya carries `asRecorded: "Suhrawardi"` on *both* edges. Printing
    it under the Qadiriyya heading attributes the source's words to the wrong order. (I first
    read the multi-order edges as a matching bug in `build-kg`. They are not — each is a
    separate quoted proposal, and the corpus draws the distinction itself.)

31. **ShrinePage imported the entire 426 KB knowledge graph to render one `href`.** The only
    fact it took from `lib/kg.ts` was the slug of the shrine's named figure, for a link to
    that figure's page — and that pulled the 317 KB graph chunk onto the archive's hottest
    route, 40% of its eager JavaScript. `data/kg-shrine-figures.json` (11 KB) is that one edge
    type, generated by `build-kg.mjs` and held to the graph by
    `src/lib/__tests__/kgShrineFigures.test.ts`, which compares the two for every shrine
    rather than a sample. `/shrine/<slug>` went 774 KB → 475 KB eager, and 2667 KB → 1379 KB
    of total JS once combined with §9.27. Slugs only, deliberately: add a name field and it
    stops being cheaper than the graph.

32. **`text-anchor` is logical, not physical — and that broke every Urdu label on the network
    graph.** Under `direction: rtl`, `text-anchor: start` means the *right* edge.
    `labelPlacement` in `NetworkGraph.tsx` reasons physically — "this label sits left of its
    node, so it must extend leftwards" — so in the Urdu view every Arabic-script label extended
    back across its own node and printed on top of it: the order's name rendered inside the
    order's square. Labels now carry an explicit `direction` and the anchor is flipped for
    Arabic script. Latin names get `direction="ltr"` for the same reason in reverse: a truncated
    Latin label inside the RTL page rendered its ellipsis on the *left*, reading as though the
    beginning of the name had been cut off.

    Worth generalising: **SVG has no `<bdi>`.** Every bidi trick this codebase relies on in HTML
    is unavailable inside `<svg>`, so mixed-script SVG text needs `direction` set explicitly and
    any logical property re-derived by hand.

33. **The lineage graph left out the lineage, and filling it exposed three faults sparsity had
    hidden.** `/saint/<slug>`'s diagram plotted the order and the shrines while the page below
    it listed teachers and disciples the graph had all along. With them on the ring:
    a figure recorded as both `disciple_of` and `successor_of` the same master drew as **two
    people** (`getTeachersOf` returns one link per relation — correct for a relation list,
    wrong for an ego network, so the diagram dedupes by slug); the legend claimed to
    distinguish teachers from the order while both rendered as filled `--color-primary` (the
    order is a rounded square now — an institution, not a person, and shape survives
    greyscale, colour-blindness and print); and `LABEL_GUTTER` at 132px clipped the first
    letter off a full-length 9-o'clock label. Same lesson as §9.26, restated: **a layout that
    works on sparse data is untested, not correct.**

34. **The reduced-motion contract is now measured, and writing the check taught more than the
    check does.** `src/styles/motion.css` consolidates what were five one-off `@keyframes`
    across four stylesheets. Two guards enforce it: `src/styles/__tests__/motion.test.ts`
    (static — every `@keyframes` must have an escape) and `e2e/motion.spec.ts` (dynamic —
    `document.getAnimations()` must be **empty** under `prefers-reduced-motion: reduce`;
    measured 5 animations by default, 0 reduced).

    The first draft of the static check flagged three existing animations, and **all three were
    the check's fault, not the code's** — precisely the situation CLAUDE.md RULE 4 warns about
    ("do not edit content to satisfy a failing check"). The three legitimate escapes are now
    named in the test: timed by a `--duration-*` token (tokens.css zeroes them under reduce),
    declared inside `@media (prefers-reduced-motion: no-preference)` (the strongest form — it
    cannot be un-done by a later override), or explicitly exempt because the motion carries the
    information. There is exactly one exemption — a loading spinner, which frozen mid-turn reads
    as a hung page — and the test asserts that list stays at most one entry long, because a
    growing pile of "this one is special" is how an accessibility contract rots.

35. **`scroll-behavior: smooth` was on globally and never guarded.** Set on `<html>` in
    `global.css`, with no `auto` override under `prefers-reduced-motion: reduce`. Every anchor
    jump on the site animated for a reader who had asked for no animation: the article contents
    nav, every skip link, the almanac's new month row. Scroll animation is the *most* likely
    kind to provoke vestibular symptoms — a whole viewport of content sliding past, not one
    small element fading in.

    Worth generalising, because it is the reason this survived: **the `@keyframes` audit could
    not have found it.** There is no keyframe involved, so a check built around animations was
    structurally blind to it. `src/styles/__tests__/motion.test.ts` has a separate case for
    scroll behaviour now. Any future "motion" that is neither an animation nor a transition —
    `scroll-snap`, `view-transition`, autoplaying media — needs its own case for the same
    reason.

36. **A twelve-month window's first and last group share a month name.** The almanac's new month
    navigation rendered thirteen pills for a year horizon, two of them reading "August" — 2026
    and 2027. The section headings carried the year and the pills did not. Fixed by showing the
    year only on names that actually repeat, so it disambiguates where needed and clutters
    nothing else. Generalises to any wrapping period label: **thirteen groups over twelve months
    is correct, and two identical labels is the tell.**

37. **The almanac and the lineage views now point at each other.** Each almanac observance links
    to the figure it commemorates, and each figure's page states when their next ʿurs falls.
    Both directions run through the same `buildAlmanac`, so there is no second implementation of
    Hijri projection to drift — a figure's page passes only that figure's own shrines, which is
    a handful of rows.

    One detail that matters editorially: the "approximate" flag appears on a Hijri-derived
    projection and *not* on a recorded Gregorian date. Verified per figure — Shams Ali Qalandar
    (6 September) carries no flag while Abul Faiz Qalander Ali Suharwardi (24–25 August) does.
    That is `AlmanacEntry.approximate` doing the job it exists for: the difference between a
    date and a forecast, which for an archive built on provenance is not a cosmetic distinction.

38. **The map's region filter was offering sentence fragments as options, including an internal
    note naming a colleague.** Live on the site until 20 August 2026. Chips read
    "and no coordinates.", "not the grave's exact position.", "which it describes as one of the
    largest graveyards in Asia.", and — worst — "not the shrine's exact position) — ask
    Saifullah for a precise pin when possible."

    `extractRegion` was "the last comma-separated segment of Location". Six rows carry a
    *paragraph* in that column instead of an address, because a field survey that can only place
    a shrine as "Lahore" says so at length — which is exactly the honesty RULE 2 asks for, and
    must not be edited. Their commas are sentence commas, so the "last segment" was the tail of
    a sentence.

    The same rule was quietly breaking the filter for the other 124 rows too: their Location
    *does* end in an address, and its last segment is "Pakistan". A filter meant to narrow by
    region had one option matching **73% of the archive**.

    Now: scan segments from the end for a known Pakistani administrative unit, preferring a
    province over the country, matched at the *head* of a segment so a province followed by
    prose is still found. Measured across the snapshot,
    `{Pakistan: 124, Punjab: 30, Sindh: 6, …}` plus six fragments becomes
    `{Punjab: 87, Sindh: 43, Khyber Pakhtunkhwa: 15, Balochistan: 10, Islamabad Capital
    Territory: 4, Pakistan: 5}`, five rows honestly unknown, and the chip count drops from 20
    to 14. Both spellings of Balochistan normalise to one value, because two chips for one
    province is a filter bug and not a spelling debate.

    Two lessons worth carrying:

    - **A derived field inherits every irregularity of its source.** The prose Locations were
      already documented as correct content; nobody asked what a comma-splitting rule would do
      to them. Any future derivation off Location, Description or Events needs the same
      question asked.
    - **The invariant that catches this has to run over the real dataset.** Hand-written cases
      encode the rule; only `buildShrines(shrines-fallback.json)` with a closed allow-list of
      place names would have caught the original. Proved by reinstating the old rule and
      watching 8 tests fail.

39. **A filter chip 1163px wide inside a 380px sidebar.** `.filter-chip` had `white-space:
    nowrap` and `flex-shrink: 0`, and its stylesheet comment described the contents as "short,
    fixed option sets (a handful of pills per group)". That is true of categories and regions.
    The **saint facet is 147 chips** read from the `Sufi Saint` column, and eleven of those
    values are qualified names — "Malik Ahmad Ayaz (also given as \"Malik Ayaz Ahmad\" and
    \"Malik Ayaz\"), described in the survey as slave of Mahmud Ghaznavi, minister, and governor
    of Lahore" at 150 characters. Measured: the saint row's `scrollWidth` was 1179 against a
    `clientWidth` of 379.

    Clamped with `max-width: 100%` + ellipsis rather than shortened at the source: the value is
    the join key that matches rows (RULE 3), and the qualification in it is real content. The
    whole string stays reachable in the chip's `title`, the same pattern the almanac's clamped
    Location already uses.

    **The more useful lesson is about the test.** My first guard clicked a list of plausible
    disclosure selectors and swallowed the failures. None matched — the control is
    `.more-filters-toggle` — so the saint facet never entered the DOM, the spec measured only
    the seven category chips, and it **passed with the clamp deleted**. I only noticed because I
    make a habit of watching a new guard fail before trusting it.

    So: `e2e/filter-layout.spec.ts` now asserts the facet is present (>100 chips) before
    measuring anything. **A test that can silently skip the thing it checks is worse than no
    test — it reports a safety it never established.** Any spec that reveals UI behind a
    disclosure needs an assertion that the disclosure actually opened, not a best-effort click.

40. **The Urdu dictionary was validated against a stale 143-row snapshot while the app shipped
    169.** `urdu-i18n/_shrine_rows.json` had not been refreshed since the sheet grew, so
    `build_dictionary.py` printed **"OK — 100% coverage, zero Latin-script leaks"** and
    `npm run data:validate` passed while, in truth:

    | | missing |
    |---|---|
    | shrine names | 27 |
    | saint strings | 17 |
    | founding-date phrases | 30 |
    | rows with untranslatable place tokens | 23 |

    The README even documented the refresh step ("after adding shrines, refresh the snapshot") —
    as a note, which is precisely the kind of intention RULE 4 exists to replace. **Snapshot
    drift is now an error**: `load_rows()` compares the snapshot against
    `src/data/shrines-fallback.json` by name and refuses to build, naming the rows that differ.
    Proved by deleting three rows and watching it name all three.

    This is the fourth instance of one pattern in a single session — a check that passes because
    it is measuring the wrong universe. The others: the no-English-leak e2e guard covering only
    two routes (§9.29), `extractRegion` reading prose Locations (§9.38), and my own chip-overflow
    spec that never opened the facet it measured (§9.39). **When a check reports success, ask
    what set it ran over before believing it.**

    All four gaps are now filled and the coverage claim is true. The additions are unreviewed
    drafts, flagged in the file: Pakistani place and shrine names whose native script is
    Perso-Arabic, plus the founding-date *hedges* — "1024 AH (as given in the form; not a
    construction date)" — translated with the hedge intact rather than tidied into a number.

41. **`NAME_LIST` was positional.** 143 Urdu names in a bare list, matched to the row snapshot
    by index, guarded only by a length assertion. A reordered sheet would have silently renamed
    every shrine in the archive and the build would still have reported full coverage. It is a
    dict keyed on the English name now, so a mis-assignment is impossible rather than merely
    unlikely. Worth checking for elsewhere: **any parallel-array pairing across a file boundary
    is one sheet re-sort away from silent corruption.**

42. **Shared ground.** 62 of 169 sites stand within 800 m of another, and in eight places the
    neighbour belongs to a different tradition — Data Darbar 222 m from Gurdwara Chowmala Sahib,
    Dargah Pir Ratan Nath 100 m from Gurdwara Bhai Beba Singh and 411 m from the Gorakhnath
    Temple. `src/lib/data/sharedGround.ts` + the section on each shrine page make that visible
    for the first time. Rationale and the rest of the roadmap in
    `docs/planning/SHARED_GROUND_VISION.md`.

    **The near-miss is the part worth remembering.** The obvious model was a cluster: single-link
    everything within 800 m, call each component a complex. Measured, that produced one cluster
    of 15 sites with an **extent of 3358 m** — transitive closure had strung together the whole
    of central Lahore and called it a courtyard. The shipped unit is therefore "within 800 m of
    *this* site", with no chaining. Any future grouping must publish its extent; a group without
    one is an unchecked claim about proximity.

    Also fixed here: `NearbyShrines` rendered every neighbour under a kilometre as "< 1 km",
    which covered both a shared pin and 900 m. It shows metres now, and for the four
    identical-pin groups it shows "same recorded location" — a distance the archive did not
    measure must never be displayed as one it did.

## 10. Risks if this is left unattended

1. **`~/shrines` is unversioned and unbacked-up.** The termbase, the photo manifest and every
   pipeline script live there. One disk failure erases months of mapping work that cannot be
   reconstructed from the sheet.
   *(Update, 18 August 2026: substantially reduced, and measured rather than assumed. A
   SHA-256 sweep of every file there against the whole repo found 11 with no byte-identical
   copy anywhere; all 11 are now committed under `pipeline/`. Every `.py` already had a copy
   or a newer version in `pipeline/`; the `.csv`/`.tsv` snapshots are superseded by `data/`;
   and all 104 media files were already in `media-source/photos`. What remains in `~/shrines`
   is duplicated elsewhere — see `pipeline/legacy-exports/README.md` for the file-by-file
   accounting. The directory can now be deleted without loss, though nobody has.)*
2. **The sheet is production.** No review, no history discipline, no backup schedule. Any bad
   edit or bad import is live immediately.
3. **Bus factor of one.** Nobody else can currently run the pipeline. §2 and §7 exist to fix
   that, but they are untested by anyone else — which means they are probably still wrong
   somewhere.
4. **The oral histories may never happen.** Zero recordings exist, funding ended, and consent
   protocol is unbuilt. If that is the project's actual purpose, it needs a decision rather
   than a backlog entry.
5. **49 uncited entries are publicly live** and read authoritatively. That is the reputational
   exposure, and it is the argument for prioritising the gold-standard entry over more
   coverage. (*Update, 16 August:* 48 of the 49 now have a citation-backed addition, drafted
   and validated but **not yet imported** — see `data/shrines_final_import_2026-08-16.csv`
   and TODO §1. Until that import happens, the live site is unchanged and this risk stands
   exactly as written. The last one, Sant Baba Asudaram Darbar, was genuinely searched twice
   and nothing citable was found either time.)

---

## 11. How to resume — first 30 minutes

```bash
# 1. confirm you are in the right directory
ls -l ~/shrines-repo/.git && echo "correct repo"

# 2. what did Claude Code leave behind
cd ~/shrines-repo && git status --short && git log --oneline -8

# 3. does the site still build
npm run build

# 4. what does the data currently say
#    export the sheet as CSV (File > Download > CSV) into ~/shrines, then:
cd ~/shrines && python3 validate_shrines.py <export>.csv --termbase termbase.tsv --fail-on NONE
```

Then read §8 "Outstanding" and start with the Bibi Pak Daman entry. It is the smallest piece of
work with the largest effect on whether this archive is taken seriously.
