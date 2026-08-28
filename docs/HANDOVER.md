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
Punjab Auqaf alone administers **534** shrines against our **169** (*count as of 21 August
2026*) — but *honesty about provenance*: a visitor should be able to tell a field-verified entry
from one compiled off the web. `/coverage` computes that comparison, and everything behind it,
from the shipped data on every page load, so the reader is never relying on a number in a
document.

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

### Added 21 August 2026 — finishing the 74 Urdu deltas

All four of these cost time in one sitting; the first two are the expensive kind, because
nothing errored.

11. **A `## heading` appended without a blank line before it silently disappears from the
    article.** Markdown folds it into the preceding paragraph, so the section is gone from both
    the rendered article and the contents nav, and every gate stayed green — `build_urdu_content`,
    `validate-urdu-leak` and the whole of `npm run verify` passed with five such files in the
    tree. The cause is mundane: `cat >>` onto a file whose last line has no trailing newline.
    `urdu-i18n/build_urdu_content.py` now refuses to write when it sees one, and on an odd
    number of `*` (one unclosed italic run italicises the rest of the article). Both were
    negative-tested — they exit 1.

12. **Translating a delta does not reduce the delta count. Advancing the baseline does.**
    `pipeline/a8_urdu_delta.py` measures against `urdu-i18n/_english_descriptions.json` (a 12
    July snapshot), so a finished translation keeps reporting as outstanding until that file's
    `desc` for the slug is replaced with the English it was translated from. This is the same
    trap as item 5 of the 18 August entries above, wearing different clothes — there, finishing
    five translations made the remaining work appear to *grow*. Advance the baseline in the same
    commit as the translation, or the next session re-derives work that is already done.

13. **A delta pass must look at what the English removed, not only what it added.** Three
    entries had Urdu asserting claims the English had withdrawn or reassigned: `allo-mahar`
    (the English retracted its whole Faiz-ul-Hassan Shah biography as an unresolved
    identification, with its bibliography withdrawn as unreliable — the Urdu still carried all
    five sections), `gurdwara-tambo-sahib` and `gurdwara-rori-sahib` (each told as its own a
    sakhi the English now attributes to a neighbouring shrine). `added_chars` cannot see this
    class of drift at all; only reading the diff both ways does.

14. **Paragraph-level diffs hide the small deltas, and the sandbox cannot reach the sheet.**
    For the 38 entries under ~800 added chars, the real change was usually a clause inside an
    existing sentence, while a paragraph-level diff marked whole paragraphs as rewritten because
    removing the `=====` artefact re-flowed them; a sentence-level set difference with a
    near-match filter is what made those legible. Separately: the Claude Code web sandbox's
    agent proxy answers **403 to `docs.google.com`**, so nothing that fetches the published sheet
    runs there. `a8_urdu_delta.py --snapshot` reads the committed `data/shrines.json` instead —
    169 of 171 rows, with the two coordinate-less rows it drops now named in the scope file's
    `rows_not_in_source` rather than silently absent. `update_log.py` has no such fallback on
    purpose (its denominator must be 171) and now says so rather than raising.

### Added 22 August 2026 — the fixture that lied and the column nobody showed

15. **The e2e fixture silently dropped the entire 2026 schema until 22 August.**
    `e2e/fixtures/generate-shrines-csv.mjs` exported a hardcoded 11-legacy-column list, so
    every Playwright run to that date exercised a dataset in which no row had `site_type`,
    `status`, `status_note`, `info_level` or `support_level` — badges, status notes and
    anything built on the structured columns were untested end-to-end while their unit tests
    passed. Nothing errored; specs that would have covered them simply couldn't exist. The
    generator now mirrors the live sheet's structured columns. The general shape: **a
    generated fixture constrains what e2e can ever see, and it does not follow the schema on
    its own.** When a column is added to the sheet, check the generator.

16. **`site_type` was displayed nowhere for the entire life of the 2026 schema.** The column
    is filled for 168 of 169 rows, `constants.ts` excluded it from generic infobox rows with
    a comment promising dedicated UI "later", and later never came — readers could not see
    the built form of a single site. Fixed 22 Aug (infobox row + /typology). When adding a
    structured column, grep `STRUCTURED_FACET_KEYS` for others still waiting: as of today
    `principal_figure`, `figure_type`, `silsila` and `flags` are in the same
    parsed-but-never-shown state.

17. **The egress proxy also 403s Wikidata** (`www.wikidata.org` and `query.wikidata.org`,
    measured 22 Aug), joining `docs.google.com` and `auqaf.punjab.gov.pk`. N2 (the
    Wikidata/Commons round-trip) therefore cannot run in this sandbox at all — it needs a
    wider-egress environment or a human-run script. Test reachability per-domain before
    planning any enrichment that fetches.

<!-- Below: the same period as logged on the parallel branch merged 23 Aug 2026.
     Both records are kept: they cover overlapping days from different work, and
     an entry deleted here is a measurement nobody can recover. -->

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

43. **An internal note to a colleague was rendering as a public UI control**, and the note is
    still in a public column. `Location` on two rows ends with *"ask Saifullah for a precise pin
    when possible"*, which reaches the shrine page, the almanac and the sidebar.
    `scripts/data/validate-publication-safety.mjs` now refuses to ship that class of text, and
    draws the line that matters: **"(surveyor: Saifullah)" in a bibliography is provenance and
    must stay** — seventeen entries credit their fieldworker — while a directive addressed to a
    person is not a fact about a shrine. The rule is "no directives, no task markers", never "no
    names"; a broader rule would delete the archive's provenance. Fix is
    `data/patch_data_hygiene_2026-08-21.csv` (RULE 3: agents do not write to the sheet), and the
    gate carries a **shrinking** exception list that fails if an entry goes stale, so it cannot
    quietly become permanent.

44. **Nothing checked that `category` is one of the six schema values.** `Darbar Abul Muali
    Qadri` carries a blank `Category` and a lowercase `category: "Islam"`. That is not cosmetic:
    the row loses its marker colour, drops out of the category filter, and is excluded from every
    per-tradition count — the archive under-reports itself by one and nothing says so.
    `validate.mjs` warns by name now.

    Two things worth carrying: the violation was **found by the coverage page**, not by a
    validator — a page that displays "not recorded" as its own row makes schema drift visible,
    which is an argument for showing such rows rather than hiding them. And my first draft of the
    check accused a second row falsely, because `row['category'] ?? row['Category']` lets an
    empty string shadow a valid value — `??` only falls through null. **First-non-empty, not
    `??`, whenever two columns alias one field.**

45. **`/coverage` — the archive's own limits, computed rather than asserted.** Track D of
    `SHARED_GROUND_VISION.md`. It exists because the standing findings in this file are the most
    candid thing in the repository, no reader could see any of them, and they go stale: §9.40's
    entry and CLAUDE.md's "49 of 167 entries have no bibliography" were both quoted as current
    long after they stopped being true (168 of 169 now carry one; 533 citations — 544 until the
    counting rule was corrected on 24 August; 107 citing three
    or more). A page computed from the shipped data cannot drift from it.

    **A standing finding is a measurement with a date on it.** Anything in §9 without one should
    be re-measured before it is repeated.

### Added 21 August 2026 — the accessibility sweep was measuring a page mid-fade

46. **The axe sweep reported eight failing routes; six were the check's own fault, and the
    fifth instance of the wrong-universe pattern.** Extending `e2e/a11y.spec.ts` from two routes
    to nine × two languages produced eight `color-contrast` failures at colours that appear
    nowhere in the palette — almanac text at `#978d7f`, order links at `#6b82b6`. The palette
    tokens are `#6b5e4b` and `#2a4d9b`, and every text-on-background pair computes **above** AA
    (lowest 4.80:1). The reported colours are those tokens *composited part-way onto the page
    ground*: axe folds ancestor `opacity` into the foreground it measures, and it was scanning
    while `reveal-rise` was still animating. Every failing selector carries `.reveal-rise` or
    `.page-enter` — the evidence was in the selector the whole time.

    My first reading was wrong in an instructive way. I had rebuilt `dist` twice *during* the
    4.5-minute run, so I concluded the run had read CSS that changed underfoot and the failures
    were probably artefacts of that. Rebuilding mid-run **is** a real mistake — don't — but it
    was not the cause: the failures reproduced identically on a stable build. **A plausible
    explanation for a wrong result is not the same as the cause of it**, and settling for the
    first one would have left the two genuine findings buried in six false ones.

    The fix is `settle()` in `e2e/a11y.spec.ts`: wait until no animation is `running`, skipping
    infinite ones (the loading spinner, the same animation `motion.test.ts` exempts). This is not
    averting one's eyes — an animation that never finishes now fails the wait, so text left
    permanently semi-transparent is still caught, and caught as a stuck animation rather than
    misattributed to the palette. 8 failures → 1.

47. **`--color-border` was painting 36px text.** `.not-found-code` — the "404" — used the
    hairline token as its colour: **1.43:1**, where WCAG asks 3:1 of large text. A border colour
    wants to be barely there and text never does, so this is a token-intent error that no palette
    tuning could fix. `src/styles/__tests__/textColorTokens.test.ts` now refuses any `color:`
    resolving to a `--color-border*` token, with a by-selector exemption list for decorative
    glyphs that fails when an entry goes stale. Mutation-tested: reinstating the bug makes it
    name `.not-found-code` by file and selector, in milliseconds rather than five minutes.

48. **Order links inside a sentence were distinguished by hue alone.** The "Also in: Chishtiyya ·
    Suhrawardiyya" line on `/order/:slug` put cobalt links in muted-brown prose with
    `text-decoration: none` — **1.26:1** between link and surrounding text against a 3:1
    minimum, so nothing marked them as links for a reader with deuteranopia or on a washed-out
    screen (WCAG 1.4.1, axe `link-in-text-block`). It surfaced only after §9.46, which is the
    argument for fixing a noisy check rather than raising its threshold.

    **The obvious fix was the wrong one.** An underline runs straight through the descenders of
    Nastaliq, and this line is Urdu half the time. They are pills now — border and ground, like
    the shrine tags directly beneath them — which survives greyscale, colour blindness and both
    scripts. Worth carrying: **an accessibility fix that reads as an English-first fix is not
    finished.** The rule reported the violation on the Urdu route only; the markup was identical
    in both, so it was latent in English too.

49. **Every shared link rendered as a bare URL.** `index.html` declared
    `twitter:card=summary_large_image` and carried **no `og:image` at all** — a card with no
    picture in it. Most of this archive's readers arrive from a WhatsApp forward, so that blank
    was the project's front door. `npm run og:image` (`scripts/make-og-image.mjs`) now renders
    `public/og-image.png` from the repository's own material: both `siteTitle` values, the
    palette out of `tokens.css`, and **all 169 recorded coordinates as a point cloud** — which
    traces the Indus corridor and shows the coverage skew rather than implying national reach.

    Three traps, all encoded rather than remembered:

    - **A card rendered in the wrong font is silent.** The generator fetches Merriweather and
      Source Sans 3 at *generation* time and refuses to write the PNG unless
      `document.fonts.check()` confirms each face loaded — otherwise a CDN blip commits a card
      set in DejaVu Serif and you find out from a shared link months later. Nastaliq is embedded
      as a data URI from `public/fonts`, and it is rendered by a browser rather than an SVG
      rasteriser because Nastaliq's joins *are* the writing system, not a style.
    - **The template's card and a page's photograph both wanted the same tag.** Appending the
      photo left **two `og:image` tags** in one head, and every crawler takes the first — so
      every photographed shrine would have shared as the generic card while the source looked
      correct. `withSocialImage()` replaces instead, and drops `og:image:width/height/type`
      when it does, because those describe the 1200×630 card and not an arbitrary Wikimedia
      photograph whose size the build does not know.
    - **A PNG cannot recompute itself.** The card says "169 documented sites", so the number is
      a measurement with a date on it — §9.45's lesson in a form that cannot be re-read.
      `scripts/og-image.lock.json` records what was baked in and
      `src/lib/data/__tests__/socialCard.test.ts` fails when the archive outgrows it.
      Mutation-tested in all three directions (missing tag, stale count, dimension drift).

    Also found and removed here: `buildShrineHead()` in `prerender.mjs` computed a 14-line
    `metaBlock` of title/description/OG tags that **nothing ever used** — the real tags came
    from a `.replace()` chain further down. It had no effect either way, but it is exactly the
    thing a later reader edits in good faith and then cannot understand why the output does not
    change.

    The 51 entries with no photograph now share the archive's card instead of degrading to a
    bare `summary`, and the Urdu pages carry an Urdu `og:image:alt` — an Urdu page should not
    describe itself in English to a crawler or a screen reader.

50. **The map route shipped a megabyte of basemap before anything appeared.**
    `/` carried **1628 KB** of eager JS, and **1035 KB of it was maplibre-gl** — a vector
    rendering engine for the tiles *under* the archive. Nothing in the primary interaction
    touches it: the sidebar, the search worker, the facet filters, the era slider and every
    marker are Leaflet and React. `ShrineMap.tsx` lazy-loads `MapLibreBasemap` now, taking the
    map route from **1628 KB → 593 KB**. It is no longer the heaviest route in the app; the
    entity pages are.

    Two things made this safe rather than clever. The basemap was **already** attached
    asynchronously — `MapLibreBasemap` fetches and localises the style before calling
    `layer.addTo(map)` — so Leaflet's pane ordering was never relying on it mounting first, and
    lazy loading only lengthens a wait that existed. And there is deliberately **no Suspense
    fallback**: a placeholder raster layer would mean watching the basemap change under the
    markers, which is the flicker `DefaultBasemap`'s latching `vectorFailed` exists to prevent.

    Guarded twice, at both the level that can go wrong: `vendor-maplibre-` is on
    `MUST_STAY_LAZY`, so a stray top-level import fails the build (proved by reinstating the
    static import — the gate named the chunk, the route and the reason); and
    `e2e/payload.spec.ts` holds the chunk unfulfilled *forever* and asserts markers, list and
    search still work, because a lazily-loaded module can still be awaited before first paint
    and a bundle budget cannot see that.

    **What this sandbox could not verify:** the vector basemap does not render here at all.
    Every tile host returns `ERR_TUNNEL_CONNECTION_FAILED` through the proxy and there is no
    `VITE_MAPTILER_KEY`, so the map falls back to CARTO raster and then to nothing. That was
    equally true before this change — it is not a regression — but it means the *rendered*
    basemap after lazy loading has been reasoned about, not seen. Worth one look on a real
    network.

51. **The Urdu site's accessible layer was entirely English.** Twenty-six hardcoded literals:
    every `aria-label="Breadcrumb"`, `"Shrine browser"`, `"Open sidebar"`, `"Clear search"`,
    `"Filter by category"`, `"Previous image"`, `"Reading progress"`, `"Dismiss"`, Leaflet's
    `"Zoom in"` / `"Zoom out"` / `"Layers"`, and the reset-view control. An Urdu
    screen-reader user got an English interface wrapped around Urdu content, which is exactly
    the "translation layer" the project's i18n contract says the Urdu edition must not be.

    **The no-English-leak guard could not see any of it.** It walks text nodes under
    `[dir='rtl']`; an accessible name is an attribute. Sixth instance in a week of a check
    passing over the wrong universe (§9.29, §9.38, §9.39, §9.40, §9.46). The new guard is
    `e2e/urdu-accessible-names.spec.ts` — eight routes, every attribute a browser turns into
    an accessible name or tooltip, with three *declared* exemptions (`[data-latin]`, URLs and
    decimal coordinates, and Leaflet's own attribution sentence). Mutation-tested: putting one
    literal back names the element and attribute.

    Two sharper cases inside it:

    - **The accessible name contradicted the visible text.** The sidebar's category heading
      rendered the localised label and set `aria-label={`Category: ${cat}`}` from the *raw
      English* key — so a screen reader announced "Category: Sikh Gurdwara" over a heading
      that said سکھ گوردوارہ. One value now feeds both.
    - **`UpdateToast` had visible English** ("New version available", "Reload") that no guard
      could ever reach: the toast only renders after a `controllerchange` event, and
      `playwright.config.ts` blocks service workers to keep the CSV intercept hermetic. **A
      component that only appears under a condition the test harness disables is invisible to
      every e2e guard you have.** Worth auditing for others.

52. **A translated sentence assembled in English word order stated a false number.** The
    almanac's coverage line was built in JSX as `{dated} {t('almanacCoverageOf')} {total}
    {t('almanacCoverageSites')}` with the fragment `of` / `میں سے`. Urdu's postposition takes
    its operands the other way round — "X میں سے Y" is "Y out of X" — so the Urdu page read
    **"169 places out of 32"** where the English read "32 of 169 sites". Both fragments
    translate perfectly; only the composition is wrong, and no per-string check can see that.

    `tFn` already existed for exactly this: each language writes the whole sentence and
    interpolates the values itself. Nothing stopped a fragment being added instead, so
    `src/lib/i18n/__tests__/noSentenceFragments.test.ts` now rejects any UI value that is
    nothing but a function word ("of", "in", "and", "out of", …) — a function word's whole job
    is to relate the things around it, and where they go is a fact about the language, not
    about the layout. It also asserts the two tables have identical keys and that a key is a
    function in both or a string in both (`t()` returns `''` for a function value, so a
    half-migrated key vanishes silently in one language).

    `tFn` now takes `string | number` arguments, which is what let the interpolated
    accessible names in §9.51 be fixed properly rather than concatenated.

    **Urdu review still owed.** The ~20 new accessible-name strings and the map-control
    strings are drafts by the same standard as the dictionary additions: written carefully,
    not checked by a fluent speaker.

53. **Five e2e failures that were the sandbox, not the code.** `persistence.spec.ts` ×4 and
    the tours geolocation fallback began failing mid-session with `page.reload: Test timeout of
    30000ms exceeded`. I checked out `40d9fe1` — the commit this session started from, which
    had run green — rebuilt, and they failed identically, so no change of mine caused them.
    Measured directly: **a reload of `/` takes 12.6 s here**, because every external
    subresource (Google Fonts, CARTO tiles, the published-sheet CSV) has to time out through
    the agent proxy, which returns `ERR_TUNNEL_CONNECTION_FAILED` for the tile hosts and
    `ERR_CONNECTION_RESET` for fonts. Nothing to fix in the tests: loosening a timeout to suit
    a sandbox is how a real regression gets through later. **Bisect before believing an e2e
    failure that appears without a matching change** — and note that the first instinct here
    (CPU contention from my own concurrent typechecks) was also wrong, and only re-running the
    specs alone ruled it out.

54. **A blank page for twelve and a half seconds, for a font.** `index.html` linked
    fonts.googleapis.com as a plain `<link rel="stylesheet">`, which is render-blocking: until
    that host answered, nothing painted — not the map, not the shrine list, not a heading.
    Measured in this sandbox, where the CDN is blocked outright:

    | | first-paint | first-contentful-paint |
    |---|---|---|
    | before | 12468 ms | 12672 ms |
    | after | **44 ms** | **108 ms** |

    The blocked case is extreme, but it is the honest one to design for: this archive's readers
    are mostly on a mobile connection in Pakistan, where Google's font CDN is periodically slow
    or unreachable, and the site does not control that host. The fix is `rel=preload` plus
    `media="print" onload="this.media='all'"` and a `<noscript>` copy — fetched without
    blocking, applied on arrival, `display=swap` doing the swap. It works *only* because every
    family has a real fallback in tokens.css, so the first paint is typeset rather than empty,
    which `src/lib/data/__tests__/renderBlocking.test.ts` now asserts alongside the rule
    itself.

    **This was already the project's own reasoning, applied to only half the fonts.** Noto
    Nastaliq Urdu is self-hosted precisely so the primary Urdu reading face does not depend on
    a CDN. The Latin faces had never been given the same treatment.

    And the first draft of the guard **passed while inspecting nothing.** The HTML comment
    documenting the pattern contains the words `<noscript>` and `<link rel="stylesheet">` as
    prose; stripping `<noscript>…</noscript>` before stripping comments matched from the
    mention inside the comment to the real closing tag and swallowed the very links under test,
    leaving two fragments scraped out of the prose. The CSS tests in `src/styles/__tests__`
    strip comments first for exactly this reason, and I had read them. **Strip comments before
    you parse anything, and check what your check is actually looking at** — that is now seven
    instances of the same lesson in this file (§9.29, §9.38, §9.39, §9.40, §9.46, §9.51).

55. **The skip links were English, pointed at nothing, and did not move focus.** Three separate
    defects in the two controls a keyboard reader reaches first, all in the same place:

    - `Skip to content` / `Skip to shrine list` were hardcoded English literals rendered on
      every route, Urdu included.
    - `#shrine-directory` exists on the map route and **nowhere else**, so on eight of nine
      routes the second link pointed at a missing id. Focus simply stayed put — the failure a
      keyboard reader cannot report.
    - `#main-content` had no `tabindex="-1"`, so following the *working* link scrolled the page
      and left focus on the link. The next Tab resumed from the header — the block the reader
      had just asked to bypass. Measured: `document.activeElement` unmoved after Enter.

    Plus four pages rendering their own duplicate `#main-content` link on top of the global
    one, so the first two stops in the tab order were the same destination twice.

    None of it is visible to axe (a link with a plausible fragment href is not a violation) or
    to a screenshot (a skip link is invisible until focused) or to the leak guard (see §9.56).
    `e2e/skip-links.spec.ts` is behavioural instead: every route, every skip link, does its
    target exist, is it unique, does following it move focus.

    Two smaller things fell out. `tabindex="-1"` made the global `:focus-visible` rule draw a
    2px cobalt outline around the *entire article*, which reads as a selected form control —
    the codebase had already solved this for the route-announcement headings
    (`.shrine-title:focus`, `.entity-title:focus`) and the rule just needed extending to the
    targets. And the test's first draft asserted "one Tab focuses the skip link", which failed:
    the page focuses its `<h1>` on mount so a screen reader announces the route, so a forward
    Tab starts from the heading. The property that actually matters is *first tabbable in DOM
    order*, which it is.

56. **The no-English-leak guard exempted every `<a>`.** The one check whose job is to keep
    English out of the Urdu view allowed `.coords, a, bdi, [data-latin]` — and a large share of
    this interface is anchors. Removing `a` and measuring: **328 leaks on the map route alone**,
    almost all of them `#shrine-directory`, the `sr-only` list of all 169 shrines, announcing
    **English names and English locations** on the Urdu site. Built for screen-reader users;
    invisible to every screenshot; waved through by the guard meant to catch exactly this.

    **`bdi` is no longer an exemption either, and that is the substantive change.** `<bdi>` is a
    bidi tool — it stops a Latin run reordering the Urdu around it, which mixed-script text
    needs whether or not the run is translated. Letting it double as "deliberately untranslated"
    meant the fix for any leak was to wrap it, which satisfies the check and changes nothing for
    the reader. The declaration is now `data-latin`, and it is **counted**:
    `e2e/urdu-no-leak.spec.ts` holds a per-route budget of declared Latin runs that may shrink
    and may not grow.

    That count is the useful output. Undeclared English is 0 on all eight routes; the declared
    debt is graph 253, almanac 87, order 41, saint 14, about 7, map 7, shrine 4, coverage 1.
    **The almanac's 87 are the ones to translate next** — they are the observance strings the
    sheet records ("Annual urs", "Maha Shivratri", "Sikh pilgrimage; Guru Nanak Gurpurab"), and
    they are the largest block of untranslated *reader-facing* prose left in the archive. The
    graph's 253 are mostly names, and some are not names at all but phrases from a source quote
    ("the princess Jahanara"), where inventing Urdu would break RULE 2.

    Found on the way: the same alt-name field was localised on the order page and rendered raw
    on the saint page and in the lineage view; `saint.altNames.join(' · ')` put a whole
    middot-separated list in one Latin run so bidi reordered the names; and **two components
    render the same "related card" shape** (`RelatedShrines`, `NearbyShrines`) — fixing one and
    not the other is how that leak survived a whole pass. Grep for the class name, not the
    component.

57. **The observance vocabulary, translated where it can be and counted where it cannot.**
    §9.56's largest debt was the almanac's 87 declared Latin runs — the `Events` column, which
    is what a reader consults to find out *when to go*. Measured: 318 occurrences across 168
    rows, semicolon-joined, reducing to **190 distinct segments**, of which the 33 most common
    account for 157. So the unit of translation is the segment, not the cell: a whole-cell
    lookup would have matched almost nothing.

    `OBSERVANCES` in `urdu-i18n/build_dictionary.py` carries those 33, and
    `src/lib/i18n/localizeObservance.ts` splits on `;`, looks each part up, and **leaves an
    unmatched segment exactly as it is**. Composing Urdu from tokens ("annual" + "urs" +
    "spring") was the obvious shortcut and is refused on purpose: that is precisely how §9.52's
    false number happened — a component deciding word order for a language whose word order it
    does not know. A visibly untranslated observance is better than a confidently wrong one.

    One detail worth keeping: the separator is localised *only when something translated*.
    Urdu's semicolon is `؛` (U+061B), and rejoining Urdu segments with an ASCII `;` leaves Latin
    punctuation steering the bidi run. But wrapping Arabic punctuation around English fragments
    reads as a bug rather than a translation, so a fully-untranslated cell keeps `;`.

    Also routed through it: the shrine infobox's `Events` row, which had the same whole-string
    lookup problem. `resolveFieldValue()` now holds both field-specific cases (Founded and
    Events) in one place instead of two copies of a ternary.

    The 33 entries are **drafts** — same standing as the shrine names and founding phrases.
    What is not translated stays English and stays counted, which is the honest way round.

    Result, measured: the almanac's declared debt fell **87 → 39** and the shrine page's 4 → 2.

    **A partly-translated list needs isolation per run, not per element.** With half the
    segments Urdu and half still English, a single `<bdi>` around the joined value does nothing:
    the bidi algorithm reorders the English fragments against the Urdu ones, and on the Urdu
    almanac the segments appeared in an order matching neither the source nor the translation.
    `localizeObservance` wraps each segment in U+2068 FSI / U+2069 PDI — the plain-text
    equivalent of `<bdi>`, and necessary here because the function returns a *string* used in a
    `<dd>`, in a list item, and potentially in a `title` attribute where no element can reach.
    Only when the list actually mixes scripts, so a uniform list carries no invisible characters
    into anything a reader copies.

58. **169 links in the accessibility landmark 404'd in production, and no test could see it.**
    The screen-reader shrine directory emitted `<a href="/shrine/${slug}">`. React Router is
    mounted with `basename={import.meta.env.BASE_URL}` and the site is served from
    `/Sufi-Shrines/`, so every one of those links pointed at
    `raufnawaz.github.io/shrine/<slug>`. The one part of the interface that exists solely for a
    screen reader, entirely broken, live.

    **This is the sharpest version of the pattern yet — not a check looking at the wrong
    universe but a check that *cannot* look at the right one.** `npm run build:e2e` sets
    `VITE_BASE_PATH=/` because the suite needs root-relative URLs, which is precisely the one
    configuration in which the bug does not exist. Playwright followed those links happily.

    `<Link to>` now, and `src/lib/data/__tests__/internalLinks.test.ts` rejects an absolute
    `href` into any route this app owns. Its own first draft flagged the *comment* explaining
    the fix, because the comment quotes `href="/shrine/…"` — the third time in one session that
    a check scraped its own prose. **Strip comments before you parse.**

59. **The mobile-sheet spec was measuring a transition, not a sheet.** `dragging the handle open
    reveals the shrine list` waited for the `collapsed` class to drop and then took a bounding
    box: 134px against an assertion of >200, on a sheet that animates `height` from 108px to
    ~641px. Five per cent into the transition.

    Worth recording how it was diagnosed, because two plausible explanations were both wrong.
    It appeared in a full run alongside the five environmental failures of §9.53, so the first
    guess was "more of the same" — but re-running it alone reproduced it, three times. The
    second guess was "one of this session's four commits", and bisecting gave `e845f95` pass,
    `d9bcf8e` fail, `f2e9e1b` pass, `cbfaa02` fail: **non-monotonic, which is a bisect telling
    you the test is timing-dependent rather than telling you which commit broke it.** Probing
    the sheet directly with an 800ms settle gave 641px every time.

    So `settle()` moved from `e2e/a11y.spec.ts` into `e2e/fixtures.ts` and both specs use it.
    Two different checks had now measured a transient animated state and blamed the code: axe
    reading a `reveal-rise` fade as a contrast failure (§9.46), and this reading a height
    transition as a broken drag handle. One definition, one place.

60. **Four routes 404'd on the live site, including the licence page.** `/graph`, `/almanac`,
    `/coverage` and `/about` were declared in `App.tsx`, reachable by in-app navigation, and had
    **no prerendered file at all**. GitHub Pages serves files, so a direct visit or a shared
    link to any of the four returned GitHub's own 404 page. Two of them are the archive's
    licence and its self-assessment — the pages most likely to be sent as a link, and the two I
    had just built.

    Three things made it invisible, and they compound:

    - **`public/_redirects` carries `/* /index.html 200` — Netlify syntax.** GitHub Pages
      ignores that file entirely, so the SPA fallback someone wrote had never worked. A
      plausible assumption, never cheaply checked, in a file nobody had cause to reopen.
    - `npm run preview` is a dev server with SPA fallback built in, so every route resolves
      locally.
    - the e2e suite runs against that same preview server, so 126 tests navigated those routes
      happily.

    Fixed at both levels: the four get real prerendered files with their own title, description,
    canonical URL and `/ur` mirror, and `dist/404.html` is now a copy of the app shell so any
    *other* unknown path boots the router instead of GitHub's 404. `robots.txt` gained the
    `Sitemap:` line it never had (written at build time, since the absolute URL depends on
    `SITE_URL`), and the four are in `sitemap.xml`.

    `scripts/check-routes-prerendered.mjs` runs in `npm run build` and **parses the route table
    out of `App.tsx`** rather than holding a list — a hardcoded list is exactly what would go
    stale the next time a route is added, which is how this happened. It fails if the parse
    yields fewer than eight routes, spot-checks one instance of each parameterised family in
    case a prerender loop silently emits nothing, and requires `404.html`. Mutation-tested:
    disabling one static page names both `/about` and `/ur/about`.

    **And I made the §9.46 mistake myself while fixing this**, rebuilding `dist` twice under a
    running Playwright suite. Killed the run rather than read it. The rule is worth stating
    plainly: **no builds while an e2e suite is running** — the suite reads `dist` from disk on
    every request.

61. **Lighthouse CI was measuring two routes of twelve.** `.lighthouserc.cjs` listed `/` and
    `/shrine/data-darbar` while the app grew `/saint`, `/order`, `/graph`, `/almanac`,
    `/coverage` and `/about` — so the performance, SEO and accessibility budgets reported on a
    sixth of the site. Extended to all nine distinct page types plus `?lang=ur`, which earns its
    own entry because RTL flips every layout, Nastaliq changes every line box and the numeral
    toggle rewrites text content.

    **Unverified locally, and stated as such in the config.** lhci cannot run in this
    environment: Chrome reaches no tile, font or CSV host through the agent proxy, and
    `upload: temporary-public-storage` needs network. The additions rest on the axe sweep, which
    *does* run here and reports zero critical or serious violations on all of these routes in
    both languages, and Lighthouse's accessibility audit is a subset of those rules. If a new
    URL trips an `error`-level assertion, that is a real finding on a page nothing was measuring
    before.

    Related, checked while there: CI builds the e2e artifact with `VITE_BASE_PATH=/` and
    deploy-pages builds its own with the real base, both documented in `ci.yml` — so
    `check-routes-prerendered.mjs` runs in both, and the seed-sync gates
    (`git diff --exit-code -- urdu-i18n`, `cmp` against `src/data/urdu-seed.json`) both pass
    after this session's dictionary regeneration.

    `public/_redirects` now carries a header saying, in the first line, that the file does
    nothing on this host — and `scripts/backfill-slugs.mjs`, which generates blocks for it, says
    so too. It is kept rather than deleted because it is the record of a fallback that looked
    correct for months.

62. **The documentation index listed 23 of 52 docs, and `HANDOVER.md` was not one of them.**
    CLAUDE.md calls `docs/README.md` "index of all reference and planning docs". It omitted this
    file — the one CLAUDE.md tells every reader to open first — along with `TODO.md`,
    `RUNBOOK.md`, `GOLD_STANDARD.md`, `FRONTEND_NOTES.md` and the entire `prompts/` directory
    that RULE 0 exists to populate.

    **The worse half was a link that pointed somewhere wrong rather than nowhere.** The index's
    "live working checklist" was `docs/planning/TODO.md`, a snapshot from **12 July** whose
    stated highest-priority item — syncing the enriched workbook to the live sheet — was
    completed on 18 August, and whose row count was two imports stale. A contributor following
    the index would have started on finished work. That file now opens with a SUPERSEDED banner
    naming the live one.

    `src/lib/data/__tests__/docsIndex.test.ts` enforces it in both directions: every doc under
    `docs/` must be linked, and every link must resolve. Mutation-tested both ways — and the
    first mutation attempt *passed*, because `HANDOVER.md` happened to be linked twice and I had
    only broken one of them. **A mutation test that passes has not proved the check is sound; it
    has proved the mutation was too weak.**

63. **The site count was stale in four files at once, including the repository's front page.**
    `README.md` said 163 sacred sites and named three traditions of six; `CITATION.cff` said
    163; §1 of this file said 167; CLAUDE.md's standing findings said "49 of 167". None was
    wrong when written, and that is the whole problem — a count in prose is a measurement with a
    date on it, and prose does not recompute.

    `src/lib/data/__tests__/siteCountConsistency.test.ts` now checks each of those numbers
    against `src/data/shrines-fallback.json`, anchored on the surrounding words rather than on
    digits, so a reworded sentence fails loudly rather than silently stopping being checked.
    Deliberately narrow: only the total, only where a stranger reads it first. Mutation-tested.

    The README also had no link to the live site at all — the front door said "GitHub Pages
    (deployed via .github/workflows/deploy-pages.yml)" — and its feature list predated
    `/almanac`, `/coverage`, `/about` and shared ground. And it described `npm run verify` as
    "typecheck + lint + unit tests", omitting the format and data gates that CLAUDE.md is
    emphatic about, which is how `format:check` came to be failing on every CI run once before.

64. **A doc told the reader to do the one thing RULE 3 forbids — and I had just promoted it.**
    `docs/RUNBOOK.md` STEP 1: `File → Download → Tab-separated values`. Google Sheets' TSV
    export silently strips the newlines inside cells, which flattens the markdown of every
    Description in the archive. That is exactly RULE 3, and this repository documents the
    discovery in three other places — the runbook simply predates it, being dated 9 August
    ("this afternoon's meeting", `backup 2026-08-09`).

    **The point is what §9.62 did to it.** Rewriting the documentation index, I put this file
    under "read these first" on the strength of its title. A stale *fact* is merely believed; a
    stale *instruction* is followed. Promoting a document without reading it is how a correct
    index becomes a more dangerous one than the incomplete index it replaced.

    Fixed in place with a note (the historical wording is quoted so the correction is visible,
    not silent), the whole file banners its date, and it is demoted to the point-in-time
    section. `src/lib/data/__tests__/docsNoTsvExport.test.ts` fails any doc that *instructs* a
    TSV export while allowing the passages that explain why it is forbidden.

    Its first two runs flagged **my own prose** — the banner, then these very handover and TODO
    entries, each quoting the menu path on one line and calling it harmful on the next. That is
    the fourth and fifth time in this session a check caught text describing the thing it bans,
    and the second lesson is sharper than the first: the exemption was scoped to the *matching
    line*, and **prose wraps — a line is not a thought.** A line-scoped exemption over wrapped
    prose is a false-positive machine. It looks at a window now (two lines before, three after),
    which costs nothing real: a genuine imperative step in a runbook does not have the word
    "forbidden" three lines away. Mutation-tested — reinstating the TSV step still names
    `docs/RUNBOOK.md:41`, because the file's banner is thirty lines above it.

65. **Searching in Urdu on the Urdu site returned zero results.** `داتا` — the first word of
    the archive's best-known shrine, displayed in Urdu on screen, typed into a box whose
    placeholder is `مزار تلاش کریں...` — matched nothing. So did `لاہور`, `مندر`, `گوردوارہ`. A
    reader in an entirely Urdu interface had to type English to find anything.

    **Two sources for one fact, one of them empty.** The page *displays* Urdu names from the
    dictionary (`urdu-seed.json`, 169/169 covered). The search index took `urduName` from
    `getUrduFieldValue(row, 'Name')` — a sheet column. **The sheet has no Urdu column at all**,
    so that field was `''` for all 169 documents and the boosted field indexed nothing.

    Everything around it was already right, and that is what made it invisible. The worker folds
    Arabic letter variants to Urdu ones, strips harakat, boosts `urduName` to 4, and
    `search.worker.test.ts` asserts that `داتا دربار` matches. **Those tests build their own
    index from hand-written documents**, so they passed in full while production indexed empty
    strings. A unit test that supplies its own fixture proves the algorithm and says nothing
    about whether the data reaches it. Worth auditing wherever else a worker or index is tested
    that way.

    `useSearch.ts` now indexes name, location, saint and category in **both** scripts, from the
    same dictionary the UI displays — always, not per active language, because a reader in the
    Urdu interface may well type a Latin name they saw in a citation. The Urdu *article* prose is
    deliberately not indexed: it is the 1 MB lazy chunk from §9.29, and pulling it in here would
    put it back on every route's critical path. `e2e/search-bilingual.spec.ts` runs the real
    index over the real dataset through the real UI in both languages; mutation-tested by
    blanking the four Urdu fields, which reproduces "returned 0" on every Urdu query.

    Two of its own assertions were wrong first, both instructive: it asserted the *displayed*
    name, which is script-dependent, so "Data Darbar" typed in the Urdu interface finds the
    shrine and renders it as داتا دربار; and the fallback of matching a slug in an `href` does not
    work because the list items are click handlers, not links.

66. **A dated CSV restore point, and a check that fired correctly on its first run — at me.**
    `npm run data:restore-point` writes `data/snapshot_<date>[_<label>].csv`: every row, every column,
    newlines inside every Description intact. The sheet is production and keeps no history
    (RULE 3), so the state before an import has to be recoverable from a commit rather than from
    whoever ran the export (RULE 0). `.gitignore` ignores `data/*.csv`, so
    `!data/snapshot_*.csv` had to be added — without it the file would have been written,
    reported as written, and quietly untracked, which is the exact failure RULE 0 exists for.
    Verified: 7,436 field comparisons against the source, zero differing, all 168
    newline-bearing Descriptions preserved.

    The filename's date is the snapshot's own `generated` stamp, not the day the script ran — a
    snapshot named for when someone happened to type a command is not a fact about the data.

    **Its own first invariant was wrong.** "Refuse if a long Description has no newline" fired
    immediately on Sant Baba Asudaram Darbar: a well-formed 1339-character paragraph with
    balanced `*sant*` emphasis, which has no newline because it is the one entry in the archive
    with no bibliography section and so no heading to break the line. A TSV round-trip flattens
    *every* cell at once, so the signature is a collapse in the population share, not one row.
    The check asserts ≥90% (99.4% of 169 today) and *reports* the individual ones. This is
    RULE 4's own worked example — the linter that flagged "a poet of note:" — arriving in my own
    code within an hour of my quoting it.

67. **Four bugs in the gallery lightbox, all behind one click no test performed.** The
    accessible-name sweep, the axe sweep and the no-leak guard all scan the page *as loaded*, so
    a modal that exists only after a click is invisible to every one of them — the same blind
    spot as `UpdateToast` (§9.51), and now the second time it has hidden real defects. **Audit
    for others: anything gated on a click, a hover, a service-worker event, or a geolocation
    grant is unexamined by every sweep in this suite.**

    - **Arrowing past the end destroyed the lightbox in Urdu.** The handler flipped the *step*
      for RTL without flipping the *clamp*: `Math.max(0, i - (isRTL ? -1 : 1))` can exceed the
      last index and `Math.min(len - 1, i + (isRTL ? -1 : 1))` can go below zero. `items[idx]`
      became `undefined`, reading `item.index` in the render threw, and the dialog vanished.
      Measured: five ArrowLefts on a two-photo gallery removed it in Urdu and did nothing in
      English. There were two copies of that arithmetic; there is one clamped `step()` now,
      because the bug was precisely the two copies disagreeing.
    - **Nothing trapped focus, under a comment saying "Focus trap".** Eight Tabs escaped to a
      `.related-card` link behind an `aria-modal="true"` container: the screen reader is told the
      page is inert while the keyboard roams it. The comment was the tell — it described focus
      *management* (focus on open, restore on close) and called it a trap.
    - **The restore did nothing either**, and this one is worth remembering as a shape:
      `closeRef.current?.focus()` ran *before* `const prev = document.activeElement`, so `prev`
      was the dialog's own close button, and on unmount focus was restored to an element that
      had just been removed. It fell to `<body>`. A reader who opened a photo and pressed Escape
      landed at the top of the document. **Two correct statements in the wrong order look like
      working code and are not.**
    - **The image `alt` was `Gallery image ${idx + 1}`** — English on the Urdu site. It is
      `photoOf` now ("Photo 1 of 2" / "تصویر ۱ از ۲"): where the archive records no caption, the
      honest description of the image is its position, said in a sentence.

    `e2e/lightbox.spec.ts` opens it in both languages, walks off both ends, tabs past the last
    control, presses Escape and checks focus came back to the tile that opened it. The
    focus-restore test is the one that found the third bug — the first three were found by
    reading, the fourth by the test I wrote for them.

68. **The interaction-gated audit came back clean, which bounds §9.67.** Having found four bugs
    behind one click, I ran the same undeclared-English and page-error scan *after* performing
    each interaction that reveals new UI — the guided-tours toggle, the basemap picker, the
    facet panel (which reveals +1251 elements and +12,611 characters), scrolling to the page
    foot, and Share. All five clean, in Urdu.

    The probe needed two goes, both for reasons worth keeping. The first run reported every
    route broken because **the preview server had died and I had not checked** — a sweep whose
    harness is down reports silence as success, so it now asserts that at least one route
    rendered. The second reported Share as doing nothing, which was **the probe lacking
    clipboard permission**: with `clipboard-write` granted, the toast appears with
    `role="status"`, the text is localised ("Copied" / "کاپی ہو گیا"), and the copied URL
    preserves `?lang=ur`. I had also mis-read the component and said `copied` was destructured
    but unused; it drives a `.share-toast` twenty lines further down.

69. **The production base path now has a check, and it is the only thing that can have one.**
    `npm run verify:pages` boots the *real* artifact at `/Sufi-Shrines/` behind a server that
    behaves like GitHub Pages — files under the prefix, directory paths to `index.html`, and
    **404.html returned with a 404 status** — then asserts, per route: it renders, no page
    errors, no failed subrequests, every in-app `href` carries the base, and one client-side
    navigation lands inside it. Wired into `deploy-pages.yml` as the last gate before publish.
    Mutation-tested by turning one `<Link>` back into an `<a href>`, which it catches by name.

    Result on the current build: **12/12 routes render, all links based, the fallback boots the
    router.** So §9.58 and §9.60 are closed rather than merely fixed.

    Getting there took three wrong harnesses in a row, and the third is the instructive one:
    **`vite preview` cannot serve a subpath build.** `vite.config.ts` computes `base` only for
    `command === 'build'`, so preview serves at `/` — and a request for
    `/Sufi-Shrines/assets/index-*.js` falls through to its HTML fallback. `curl` got a 200
    (fallback HTML with the wrong content type) while the browser got a 404 (the fallback only
    answers `Accept: text/html`), so the two disagreed and neither was measuring the app. Hence
    the hand-written static server: for a check about how files are *served*, the serving has to
    be the thing under test, not a dev convenience.

70. **Places as entities shipped (Track B), and the data decided its shape.** 29 place pages in
    both languages, from a closed 66-entry vocabulary; Lahore holds 35 sites and five of the six
    traditions. Every entry is derived from a `Location` string that appears in the data, none
    from general knowledge of Pakistani geography.

    The design was forced by a measurement, not chosen: **there is no District, City, Province or
    Region column anywhere in the sheet.** Across the 169-row snapshot the last comma-separated
    segment of `Location` is "Pakistan" for 124 rows and a province for 35, and six rows carry a
    paragraph of survey qualification where an address should be. Positional parsing cannot
    survive that, so the vocabulary is matched anywhere in the string — the same technique
    `extractRegion` already used for provinces. It buys the level variations for free ("Lahore",
    "Lahore District", "Walled City, Lahore" are one place) at the price of asserting no
    hierarchy, which is the honest trade when the hierarchy is not in the data.

    Two things stay deliberately untidy. A site can be in **two** places ("Uch Sharif,
    Bahawalpur District" is in both, and twelve rows are like this), and **one site is unplaced** —
    reported on `/coverage` rather than rounded away. That last number started at seven, and the
    reduction is the useful part: six of the seven were the *vocabulary's* fault, not the data's.
    Quetta, Hyderabad, Kasur and Sharda were missing outright; Girhor Sharif was unplaced because
    the sheet spells its district "Umarkot" while the pattern only accepted "Umerkot". Reading the
    unplaced list is how you find that, and a loose test threshold (`≤ 10`, which passed at seven)
    is how you never do — it is `≤ 2` now.

    The one that remains cannot be placed by anything: Darbar Malik Ahmad Ayaz's Location is a
    paragraph stating that no city, district, tehsil or province appears anywhere in its survey. The date span reads bare
    Gregorian years only and skips every Hijri or hedged date instead of flattening it (RULE 2).

71. **A class name is a string, and every string typechecks.** `PlacePage` was written against
    `entity-kicker` and `entity-lede` — plausible names, in a namespace that does exist, defined
    in no stylesheet. `npm run typecheck` was clean. An hour later I did it again: the shrine
    masthead's place pills went in referencing `.shrine-place-links` / `.shrine-place-tag` before
    either rule was written.

    Nothing in the pipeline could have caught it. TypeScript cannot (`className` takes any
    string), lint cannot (the class is valid), and the unit tests cannot (jsdom applies no
    stylesheet, so an unstyled element renders exactly like a styled one). So
    `src/styles/__tests__/classNamesStyled.test.ts` walks every `className` in `src/` and
    requires each name to appear in `src/styles/*.css`, with a seven-entry
    `UNSTYLED_BY_DESIGN` list for scope hooks and one semantic marker (`.coords`, which the Urdu
    leak guard reads).

    Two details are worth keeping. Dynamic names are checked as **prefixes**
    (`place-tradition--${key}` requires some `.place-tradition--…` rule) — the first draft
    skipped interpolated names entirely and would have missed eight variant families. And the
    first run reported `en` and `ur` as unstyled classes, which were `lang === 'en'` comparands
    harvested out of a ternary; comparison right-hand sides and call arguments are stripped
    before literals are collected.

    It found a real bug on its first honest run: `.entity-disputed-value` on `/saint/:slug` had
    no rule, so in a row whose whole point is two contested dates, the field label was bold and
    the **numbers** were plain body text.

72. **The Urdu seed grew again and every eager budget moved with it.** Merging Track B's 282
    place tokens took `src/data/urdu-seed.json` from 697 to 960 entries, 69 KB to 80 KB, which
    lands as ~25 KB on *every* route because `urduFallback` imports the seed statically.
    `check-bundle-budget.mjs` failed `index.html` and the budgets were raised with the
    measurement recorded — the second raise for the same cause in two days.

    That is the argument for finally language-gating the seed: **an English reader downloads
    80 KB of Urdu dictionary and consults none of it.** Blocked on the same thing as before —
    `translateToUrdu` runs synchronously during render, so a late dictionary flashes English —
    and it needs the `ensureUrduContentForLang` treatment `urdu-content.json` already has.

73. **The prerenderer was writing Urdu with Western digits.** Found while adding place pages:
    `/ur/saint/data-ganj-bakhsh` shipped `(وفات 1072)`. The app has `fmtNum` at every render
    site and the static `<meta>` tags were simply never held to it. Fixed for places, saints and
    orders — `(وفات ۱۰۷۲)` — applied only to numbers the script *composes* and never to Urdu
    prose lifted from `urdu-content.json`, because reformatting inside an author's text is a
    content edit rather than a rendering choice.

74. **The place vocabulary exists twice on purpose, and is held to itself.**
    `scripts/data/lib/places.mjs` mirrors `src/lib/data/places.ts` because the prerenderer runs
    under plain node with no TypeScript loader — the same arrangement as `slugs.mjs`. The guard
    (`placesVocabSync.test.ts`) compares the tables field by field, checks each regex's flags
    (`i`, and *not* `g`: a global regex used with `.test()` carries a `lastIndex`, so the same
    string matches on one call and misses on the next), and then runs both matchers over every
    `Location` in the shipped snapshot.

    It also checks one step earlier than the vocabulary. The prerenderer works from raw sheet
    rows, and my first draft read `field(row, 'Location', 'Address', 'Place')` while the app
    reads `row['Location']` and nothing else — a row with an Address and no Location would have
    been placed in `dist` and unplaced in the app, which is a page the sitemap advertises and
    the router calls "not recorded". Both sides now share `locationOfRow`.

75. **The Urdu dictionary is no longer on the English critical path — 74 KB off every route.**
    `src/data/urdu-seed.json` (80 KB, 960 entries) was a static import in `urduFallback.ts`, so
    an English reader downloaded the entire Urdu dictionary and consulted none of it.
    `index.html` fell from 322 KB of eager JavaScript to **248**, the map route from 611 to
    **537**, and every budget in `check-bundle-budget.mjs` came down with it — the first time
    that file's numbers have gone *down*.

    The note in that file had argued for this twice and deferred it twice, for a real reason:
    `translateToUrdu` runs synchronously during render, so a late dictionary shows English on an
    Urdu page. The fix is four things at once — a module-scope request in `main.tsx` from
    `detectInitialLang()` (before React's first pass, so it races the sheet fetch and wins), a
    `dictVersion` in the language context so arrival re-renders everything that translates,
    `useShrineData` awaiting it where it already awaited the article payload, and `useSearch`
    rebuilding the index on arrival.

    **The regression it caused, and the reason to run the whole suite rather than the new
    tests:** two `search-bilingual` cases went red — *in the English interface*, an Urdu query
    found nothing. The worker indexes both scripts deliberately ("a reader in the English one may
    paste Urdu"), and that promise was free only while the dictionary was eager. `useSearch` now
    fetches it when a query contains Urdu letters, so an English reader who never types Urdu
    still ships none of it and one who does waits a single chunk request. Nothing in the new
    tests would have caught this; the suite that already existed did.

    One trap found by mutation-testing my own test. `translateToUrdu` remembers permanent misses
    in a `_misses` set, so `loadUrduSeed()` clears it — and my first test of that cleared nothing,
    because the exact-key lookup happens *before* the miss check and so survives a stale miss. It
    is the **case-insensitive** index, consulted *after* it, that gets poisoned. Deleting
    `_misses.clear()` left the first version of the test green; with a lowercased fixture
    ("uch sharif", which is how the sheet spells some values) it goes red. A mutation that passes
    has not proved the check sound, only the mutation too weak — third time that lesson has
    appeared in this file.

    Also worth keeping: **894 of the seed's 960 entries are translatable only from the seed.** The
    other 66 include the common city words, which `buildUrduFallback`'s built-in maps already
    cover — so a test of the un-loaded window that used "Lahore" would pass while measuring the
    built-in map rather than the gate. Mine did, at first.

    **And a layer below all of it, the service worker was undoing the whole thing.** The PWA
    precache globbed `**` + every emitted `.js`, so both language payloads — the 1 MB article
    chunk and the 77 KB dictionary — were downloaded in the background by *every* visitor on
    first load. After first paint, so no eager-payload budget and no Lighthouse run could see it,
    and the careful language-gating in `urduContentOverride.ts` and `urduFallback.ts` was being
    quietly cancelled one layer down for every returning reader. Both are now excluded via
    `globIgnores` and cached by a `CacheFirst` runtime rule when actually fetched, so an Urdu
    reader who has read one page still has them offline. Measured: the precache went from
    **4980 KiB to 3865 KiB (52 entries)**.

    The general lesson is the one this file keeps relearning in new costumes: a check measures the
    layer it was pointed at. `check-bundle-budget.mjs` measures the static import graph, and was
    right; the bytes left anyway, through a mechanism nothing was looking at.

76. **Reported from a phone: "I still cannot see the sidebar." Two faults, one of them a real
    layout break.** `.sidebar` set `left: 0; right: 0` and then
    `inset-inline-start: auto !important` — and `inset-inline-start` *is* `left` in LTR, so the
    pin was cancelled. A fixed box with one inset and `width: auto` resolves to shrink-to-fit:
    measured at 390×844 with the shrine list open, the sheet was **2201px wide starting at
    x = −1811**, sized by the widest row and hanging off the left of the screen. The peek looked
    fine because its own content is narrower than the viewport, so nothing showed until a reader
    tapped through to the list — and then most of the sheet was off-screen with blank rows where
    the names should be. In RTL the same rule cancelled the right edge instead.

    The other half was discoverability: the peek was 108px, which cleared the drag handle and the
    brand row and stopped **one pixel above** the "Table of Shrines" button (its box runs
    122–166px inside the sheet). So a phone reader saw a map, a title, and a 36×4px pill drawn in
    the *hairline border colour*, with the only route into 169 sites below the fold. 184px now,
    the pill is 44×5 in an ink colour, and the list button expands the sheet in the same tap.

    Also: the handle's accessible name was a hardcoded English "Expand sheet". **The Urdu sweeps
    have never seen any mobile-only UI** — they run at a desktop viewport, where this control
    does not exist. That is a standing gap, not a one-off.

77. **"The tour filters look ugly" had a mechanical cause, and it generalised.** `tours.css`
    painted the chips with `var(--color-surface)` and rounded them with `var(--radius-pill)`.
    This palette defines neither (`--color-bg-surface`, `--radius-full`), so both declarations
    were dropped and the chips rendered unstyled — which looks like a design failure and is a
    typo.

    A `var(--nope)` is not an error anywhere in the pipeline: the declaration is dropped, the
    element keeps what it inherited, and the page looks *nearly* right. So
    `src/styles/__tests__/cssTokensDefined.test.ts` now sweeps every stylesheet: **six live
    references to four properties that never existed** (`--color-surface`, `--radius-pill`,
    `--radius-xs`, `--color-bg-subtle`), plus `--ease-out` in a rule I had written an hour
    earlier. It also bans a fallback on a *declared* token, because that is a second source of
    truth that keeps working while the palette moves on around it.

78. **The command palette, and what it cost to build honestly.** Search moved out of the sidebar
    (a 184px sheet on a phone, with five rows of chips competing with the list they act on) into
    a Spotlight-style overlay on ⌘K, `/`, or the trigger: input, filters folded behind a control
    at the trailing end of the field, live results, ↑↓/Enter/Esc, focus trap, focus restored to
    the trigger.

    Two things worth keeping. **The filters were moved, not copied** — into `ShrineFilters`, with
    the class names unchanged, so the sidebar's existing tests kept working after adding the two
    clicks a reader now walks; two copies of a filter UI is how a filter starts working in one
    place and not the other. And **the panel's flex defaults ate the filters drawer**: it opened
    at 55px — one chip row and half of the next, sliced mid-word — because the results list asked
    for `flex: 1` and a flex item's default `min-height: auto` refuses to shrink. It looked like
    a rendering bug and was a flex default.

79. **The Urdu overflow sweep, and the one thing it found.** `e2e/no-overflow.spec.ts` checks
    9 routes × 2 languages × 3 widths for a document that scrolls sideways *and* for any element
    past the viewport edges or wider than its own non-scrolling box. Nastaliq sets wider and
    taller than Latin, an Urdu word cannot be hyphenated, and several strings are long in Urdu
    and short in English — so a layout that fits in English can break in Urdu, and neither a unit
    test (jsdom has no layout) nor a screenshot review (one page, one width) reliably catches it.

    It found `h1.sidebar-title` overflowing its row by 12px at 390px **in Urdu only**: a `nowrap`
    heading with no `min-width: 0` refuses to shrink and pushes the row instead. Fixed, with the
    extra line-height Nastaliq needs to clear its descenders inside `overflow: hidden`.

    Its first run reported six failures that were all the check's fault, and both exemptions are
    instructive: `.leaflet-container` reports its tile panes' width as its own `scrollWidth`, and
    `.sr-only` — the visually-hidden shrine directory holding 169 links with their full Locations
    — measures thousands of pixels wide while occupying no visual space. Exempting the panes but
    not the container was not enough.

80. **Translucency, done as one material rather than six guesses.** `--glass-bg` /
    `--glass-blur` / `--glass-border` in tokens.css (light and dark), applied to the command
    palette, the map's control bars and the mobile sheet header. Two decisions are load-bearing:
    the alpha is **0.82, not the 0.6 a screenshot makes tempting**, because every one of those
    surfaces carries body text over an *arbitrary* backdrop (satellite tiles, a photograph, a
    dense marker cluster) and contrast has to hold against all of them; and each rule sets an
    opaque background first and the translucent one only inside
    `@supports (backdrop-filter: …)`, so a browser without the blur gets a solid panel rather
    than text over a live map.

81. **Two critical a11y violations sat on the primary browse surface, and the route sweep could
    not see them.** Adding an axe scan of the *open* command palette meant clicking "Table of
    Shrines" as part of the setup — and that revealed the shrine list had never been scanned at
    all, because the route sweep scans the map page with the list collapsed. On it: `aria-pressed`
    on every one of 169 rows, which is **not allowed on `role="listitem"`**, and a `role="list"`
    owning `div` category headings, which a list may not own. Both critical, both invisible for as
    long as the list has existed.

    The fix is the honest structure rather than a patch: these rows are a single-select list of
    options (clicking one selects that shrine on the map), so the panel is a `listbox`, each
    category is a `group` carrying the category as its accessible name, each row is an `option`
    with `aria-selected`, and the visible heading is `aria-hidden` because the group already
    announces it.

    The lesson is the one this file keeps recording in new costumes: **a sweep's route list is
    not its universe — its *state* is.** Nine routes at rest is not the same as nine routes with
    the panel a reader actually uses opened. The palette scan now opens the list *and* the filters
    drawer, and a phone-viewport pass is still missing (see the checkpoint doc §4).

82. **`offsetParent` is not the containing block, and a shut `<details>` is not out of the
    layout.** The sidebar settings popover shipped from a handoff patch anchored to its own
    32px icon. Measured, it began at **x = −53** on desktop and, in RTL on a 390px phone,
    **ended 109px past the trailing edge** — the icon sits at the inline *start* of the actions
    row, so aligning the panel's inline *end* to it pushes the panel out of the sidebar in
    whichever direction the language runs.

    Two things are worth the next session's time here:

    - **A closed `<details>` still lays its contents out.** Chrome hides them with
      `content-visibility: hidden` on `::details-content`, not `display: none`, and skipped
      content still answers layout queries. So the panel overflowed the page for every reader
      *before anyone clicked it* — which is the only reason `e2e/no-overflow.spec.ts` saw it at
      all. It was caught by an accident of the element, not by a check.
    - **That same `content-visibility: hidden` implies paint containment, which makes the
      `<details>` box the containing block for absolutely positioned descendants.** So the
      obvious fix — put `position: relative` on `.sidebar-actions` so the panel aligns to the
      row — changed nothing, and `offsetParent` *reported `.sidebar-actions`* while the panel
      went on aligning to the details box. `offsetParent` does not account for a containing
      block established by a pseudo-element. Nothing absolutely positioned can escape a
      `<details>`; if a popover must align to something outside it, it cannot live in one.

    The fix is the pattern the sidebar already used everywhere else: a `<button aria-expanded>`
    plus a conditionally rendered panel, anchored to `.sidebar-actions`. And because the closed
    panel is now absent from the DOM rather than hidden in it, **the accident that caught the
    bug is gone** — so `no-overflow.spec.ts` gained six cases that open the panel and measure
    it, at three widths in both languages.

    Process note, same class as §9.53: the handoff reported "production and E2E builds: passed",
    which was true and was not the same claim as the suite passing. The full run was **16 failed
    / 229 passed** — 4 of them this bug, and 12 specs that asserted the old table default and
    needed to opt into it (`setTraditionalDirectory`). Read a handoff's gate list for which
    gates it names.

83. **Two more defects in the same popover, both found only by driving the deployed site.** The
    geometry above was fixed and verified green locally, and the feature was still not usable:

    - **Choosing an option left the panel open, on top of the button it configures.** The panel
      occupies y 62–203; the "Table of Shrines" button sits under it. So a reader who switched
      to the table could not see the button change, and on production the button was not even
      clickable — a Playwright click on it failed with the panel's own `<legend>` intercepting.
      Choosing now closes the panel.
    - **Its only dismissal was the gear itself** — no Escape, no click-outside, unlike every
      other overlay here. Adding Escape then exposed a third thing: `MapPage.tsx:278` also
      listens for Escape, to collapse the sidebar and deselect the shrine, so one Escape shut
      the popover *and* the sidebar behind it. The listener is registered when the panel opens,
      which is after MapPage's, so stopping propagation on the way up was too late; it runs in
      the **capture** phase and stops there. One Escape now shuts the thing on top.

    Both are invisible to jsdom, which has no layout and no hit-testing, and the first was
    invisible to the local suite too — it only bit at the specific sidebar width production
    renders. `e2e/directory-mode.spec.ts` now drives the whole journey in a real browser in
    both languages: the panel opens inside the sidebar (not merely inside the viewport), the
    radio is the topmost element at its own centre, choosing closes the panel and changes what
    the button opens, the choice survives a reload, and Escape closes the panel without
    collapsing the sidebar.

    The lesson, which is really §9.68's: **local green plus a successful deploy is not
    verification of the deployed thing.** Three defects survived a full local suite and a
    passing Pages deploy, and each surfaced within a minute of actually clicking the live site.
    Also worth keeping: two of the "failures" the live run reported were the *harness* being
    wrong, not the site — a panel measured mid-slide (the sidebar animates open; §9.46 again)
    and Playwright's scroll-into-view mis-computing a hit point inside a sticky header. Ask the
    browser directly — `elementFromPoint` — before believing an interception report.

84. **A popover cannot float out of the bottom sheet, in either direction — the sheet has to be
    open.** Fourth defect in the same control, found the same way: on the deployed site at
    390×844 the sheet at peek height runs y 660–844 with its header at 705–774, so the panel
    opening downward reached y 928. `elementFromPoint` at the radios returned **null** — the
    points were off-screen entirely — which meant the second option was untappable in English
    and *both* were in Urdu. The archive's escape hatch back to the shrine table did not exist
    on a phone.

    Flipping it to open upward looked right and was worse in an instructive way: the panel then
    sat at y 552–709, **outside the sheet's box**, and the sheet clips it. `elementFromPoint`
    over the first radio returned `div.leaflet-container` — the map. So the panel was drawn
    where nothing could receive a touch, and a `z-index: 30` inside a `.sidebar-header` whose
    own stacking context is `z-index: 1` cannot fix that, because clipping is not painting
    order.

    There is only room inside an *expanded* sheet, so opening the settings expands it — the same
    line the list button has always had (`if (next && isMobile && !isOpen) onToggle?.()`). When
    a control needs more space than the sheet's peek height, the sheet is the thing that has to
    move.

    Two invariants came out of it, and the first is the reusable one: **`elementFromPoint` at a
    control's own centre is the honest test of whether a reader can use it.** It catches being
    covered, being clipped, and being off-screen, which no bounding-box assertion does — a
    `getBoundingClientRect()` on that untappable radio looked perfectly reasonable. And the
    overflow checks now measure **all four edges** for this panel: `no-overflow.spec.ts` measures
    only the horizontal ones for the route sweep, correctly, since page content below the fold
    is normal — but a popover below the fold is not. `e2e/directory-mode.spec.ts` runs the whole
    journey at both device classes in both languages.



85. **A page can be less honest than the graph-wide dump of the same data, and nothing will
    say so.** `LineageLink` has carried `quote`, `source` and `reviewed` since the lineage
    relations were seeded, and only `/graph` ever printed them. So `/saint/:slug` — the page a
    reader actually reads a lineage on — showed a bare name for an edge that is unreviewed 80
    times out of 86 and quotable all 86, while the bulk listing nobody browses showed the
    evidence. Same for `belongs_to_order`: `/order/:slug` grew an "Also in" row for figures
    holding several silsilas, and the figure's own page asked `getOrderForSaint`, which returns
    the first edge and discards the rest. 11 figures. Provenance parity between surfaces is not
    something a type checker or a test suite notices; the only way to catch it is to ask, of
    every field on a record, *which* pages render it.

86. **`getOrderForSaint` is a correct accessor and the wrong question.** It returns one order,
    which is right for seeding a diagram that takes one, and wrong for "show this figure's
    affiliation". The test in `src/lib/__tests__/orderMemberships.test.ts` now fails the build if
    an affiliation page *calls* it — a mention in a comment is fine, since the comment explaining
    why it stopped being used is worth keeping.

87. **Deciding whether a source's own wording is "redundant" is a transliteration judgement, and
    it is not worth making.** The first version of the recorded-silsila display hid any
    `asRecorded` string that restated the order's name. To be right, that rule had to know that
    *Qadri*, *Qadiri* and *Qadiriyya* are one name while *Rashidi* under Qadiriyya is a different
    one — and its wrong answers delete the archive's most honest field. One of these cells reads
    "Qadri (see year_built_note / Description for a discrepancy in how the survey names his
    order)". The rule is gone; the field is shown as recorded. Note also that `asRecorded` is a
    **row-level** cell: both of a figure's order edges carry the same string, which is why
    OrderPage refuses to print it at all and why the figure's page prints it once, deduped.

88. **A lineage walk that takes the first teacher fabricates descent, plausibly.** The longest
    apparent chain in the graph is eight names and it runs straight through Abul Faiz Qalander
    Ali Suharwardi, who records **four** masters. A walk that took the first would have drawn
    five generations of transmission the archive never claims, and it would have looked
    completely ordinary on the page. `getLineageChain` therefore stops at a fork and reports the
    fork — the honest answer is a statement about the sources, not a gap in the display. 57
    figures record a teacher; following only unambiguous links gives 15 of them a chain two or
    more removes deep, so refusing to guess costs almost nothing. Cycles terminate the walk too;
    none exist today, and one `successor_of` import is all it would take, with an infinite render
    loop as the symptom.

89. **`uiStrings.ts` ships 39 KB of Urdu interface copy to every reader on every route,
    English-only ones included.** *Measured 24 August 2026* (66.7 KB file, 27.7 KB before the
    `ur:` key, 39.0 KB from it). This is the same shape as the `urdu-content.json` waste that
    `scripts/check-bundle-budget.mjs` was written to catch, and it is unfixed. The symptom that
    surfaced it: eight new interface strings added ~1 KB to *every* route's eager JS, which
    tripped ShrinePage's budget — a route the change never touched, because it happened to be
    sitting at 495/495 with zero headroom while its annotation still read "measured 457". Two
    lessons, one for each half: **a per-route budget cannot express "a shared module grew", so
    the route with the least headroom takes the blame**, and a budget comment without a date on
    it becomes a claim. Gating `UI_TEXT.ur` behind the language the way the content payload
    already is would give every route back far more than the 10 KB this cost. Candidate for the
    next planning pass; not attempted here, because `t()` is synchronous everywhere and an
    English flash in the Urdu view is not an acceptable intermediate state.


90. **A `.gitignore` rule can be broader than it reads, and an ignored file is invisible to the
    command you would check with.** `archive/`, added for the stale top-level folder RULE 1 warns
    about, matches a directory of that name at *any* depth — so `src/components/archive/` was
    silently excluded and a commit shipped two pages importing a file the repository does not
    have. It builds here and cannot build from a clean clone. Nothing in the pipeline could see
    it: the working tree has the file, so tsc, vite build, eslint and 714 tests were green, and
    `git status` showed nothing to commit because the file was *ignored* rather than untracked.
    Anchored to `/archive/`. `src/lib/__tests__/importsAreTracked.test.ts` now asks **git**, not
    the filesystem, whether every relative import under `src/` is tracked — it reproduces this
    exactly when the file is removed from the index, and catches the plainer forgotten-`git add`
    too.

91. **Nastaliq must never be letter-spaced, and per-rule overrides are the wrong mechanism.**
    Urdu is a connected script: tracking does not loosen it, it prises apart glyphs that are
    meant to join. The stylesheets knew this for `body.lang-rtl` and for `[dir='rtl'] h1..h4`
    with a comment saying why — and neither reaches a `.entity-type-kicker`, a
    `.filter-section-label` or a table `<th>`, which are not headings and inherit nothing. So
    thirteen class rules carried an individual `letter-spacing: normal` and the rest did not.
    Tracking is now six `--tracking-*` tokens that `[dir='rtl']` redefines to `normal`; custom
    properties inherit, so that reaches every consumer with no specificity fight.
    `e2e/typography.spec.ts` measures the rendered result on nine routes, because all three ways
    this breaks — a token that stops collapsing, a raw em value, a new component's forgotten
    override — produce the same computed value and none are visible in a grep.

    Worth knowing for the next guard of this kind: the first probe of that test *passed* on an
    injected violation, because `[dir='rtl'] h1` at (0,1,1) already outranked the class selector
    it was injected on. A guard that has not been shown to fail on the thing it guards is not yet
    a guard. Re-probed on `.coverage-stat-label`, which nothing covered, and got the failure.

92. **Suppressing the browser's tap highlight is half a decision.**
    `-webkit-tap-highlight-color: transparent` on `a`, `button` and `[role='button']` is right —
    the grey flash looks nothing like the rest of the site — and it removes the only touch
    feedback those elements had. Four selectors replaced it (`.filter-chip`, `.action-btn`,
    `.icon-btn`, `.hover-lift`); every other link, tag, chip, badge, table row and card answered
    a tap with *nothing* until the page changed. There is no console warning for "this control
    does not acknowledge being pressed", and hover states hide it completely on a desktop, which
    is where it was being looked at.

    Two treatments, split by a CSS fact rather than by taste: `transform` is a no-op on a
    non-replaced inline element, so the scale rule can safely name `a` — it reaches pills and
    cards and passes straight over inline prose links, which take a ground tint instead. The tint
    is a colour and not opacity (§9.46), and sits outside the reduced-motion query, because a
    reader who asked for less movement has not asked to stop being told their tap landed.
    `pressFeedback.test.ts` holds the two selector lists together across every stylesheet — its
    first version read only global.css while map.css suppresses it too, for the sheet handle.

93. **Two implementations of one statistic, and nothing comparing them.** `/coverage` and
    `/report` compute the same support-level, info-level and tradition distributions through
    `buildCoverage` and `buildArchiveReport` respectively. They agree; nothing was checking.
    An archive whose distinguishing claim is candour cannot say "14 field-verified" on one page
    and "13" on another — that is worse than saying neither, because a reader who notices cannot
    tell which page lied. `archiveStatsAgree.test.ts` now pins it, deliberately *not* key-for-key
    on traditions: the sheet's stray "Islam" row is its own line on /report and inside
    `unrecorded` on /coverage, which is a real difference in what the two pages are for. A test
    asserts that stray row still exists, so when the hygiene patch lands the difference stops
    being invisible.

    **And the harness trap.** Both builders read their fields through `getFieldValue`. Handed raw
    snapshot rows instead of `buildShrines(...)` output they report every support level as zero
    and all 169 entries as unrecorded — which reads exactly like a live bug on the two pages
    whose whole purpose is honest self-assessment, and is an artefact of the measurement. The
    data is fully populated (100 source-documented, 53 source-seeded, 14 field-verified, 2
    web-compiled). This was very nearly reported as a defect.

94. **GitHub Pages does not deploy from `main`.** It deploys from the newest *version* branch —
    `1.7`, with `1.6` listed as a fallback — so `1.7` sits at 0 commits ahead of `main` and looks
    exactly like a finished feature branch while being the one branch that must never be deleted.
    The project has already paid for this once: ten commits of fixes believed live had never
    deployed. Full per-branch disposition, the reason `1.6` stays listed, and how to cut a new
    version branch are in `docs/BRANCHING.md`; `scripts/branch-audit.sh` recomputes the table and
    reads the deploy list out of the workflow rather than from memory.

    Also measured, and separately relevant: `feat/tours-phase5-discovery` looks like 131 commits
    of unmerged work and contains nothing `main` lacks — 0 unique file paths, 0 unique exported
    symbols (202 against main's 422), and every file older (kg.json 104 KB against 428 KB). An
    agent session cannot finish the cleanup: pushing a tag returns HTTP 403 with the token, and
    `git push --delete` is blocked in the sandbox.

95. **A review queue that under-flags reads as a finished review.** The graph's 235
    machine-extracted proposals are live and badged `reviewed: false`; what was missing was any
    way to record a human verdict. Building `data/review/kg-review.csv` turned up two bugs in the
    generator, both found by its test rather than by reading it. The conflict buckets name their
    subject six different ways (`saintSlug`, `shrineSlug`, `canonicalSlug`, `proposedSlug`,
    `subjectSlug`/`objectSlug`, and a bare `slugs` array) and the first version knew four — so 33
    findings were filed as priority-3 rubber stamps, `subjectMismatch` (the allo-mahar
    misidentification) among them. Four of those buckets record the *absence* of a claim and have
    no proposal row to flag at all; they are rows of their own now. And row ids collided: Guru
    Nanak has a birth-sentence date proposal and a death-sentence one, and five saints have two
    order proposals apiece for the same parent, so a verdict typed against one would have carried
    onto the other. Ids now end in a digest of the quote — stable across regenerations, changing
    exactly when the evidence does.


96. **`src/lib/i18n/localizeKgName.ts` cannot host a general-purpose helper: it imports the
    whole knowledge graph.** It pulls `slugToLabel` from `../kg`, which statically imports
    `data/kg.json` — 426 KB. Moving four open-coded `lang === 'ur' ? translateToUrdu(x) : x`
    call sites onto a helper *in that file* therefore pulled the entire graph onto the map,
    shrine, place and coverage routes: `check-bundle-budget.mjs` reported MapPage at **891 KB
    against a 580 KB budget** and three others ~300 KB over. The helper needs the dictionary and
    nothing else, so it now lives in `localizeRecordedName.ts` with only that dependency, and
    `localizeKgName` re-exports it so there is still one implementation.

    Two lessons, and the second is the reusable one. A "put the shared thing in the shared file"
    refactor can be a 300 KB regression, and the file's name tells you nothing about its
    dependency weight. And the reason this was a five-minute fix rather than a shipped
    regression is that the budget check runs in `npm run build`, not in `npm run verify` — the
    unit suite was green through all of it.

97. **The obvious generalisation of a translation call is wrong in a way that looks right.**
    `lang === 'ur' ? translateToUrdu(x) : x` reads as "translate when the language is
    translated", and rewriting it that way returns **Urdu** for a future Shahmukhi reader. The
    guard is not "does this language have a dictionary", it is "which dictionary" — so the
    helper is a `Partial<Record<Lang, translator>>` keyed on the language, where a language with
    no entry gets its string back unchanged (i18n rule 3). Adding a language is one entry, and
    the shape makes the wrong version unwriteable.


98. **`scripts/prerender.mjs` does not server-render anything.** It bakes `<head>` metadata —
    title, description, OG tags, JSON-LD — into one shell per route, so link previews and
    crawlers get real metadata without JavaScript. The body of every one of those files is
    `<div id="root"></div>`: 29 bytes, zero Arabic characters on a `/ur` page. *Measured 24
    August 2026.*

    Recorded because a plan written the same day asserted the opposite — "the first paint is
    server-rendered HTML in the right language regardless" — and built a design on it. The words
    "prerender" and "`/ur` mirrors exist" are both true and neither implies rendered content.
    Anything that wants to hide a fetch behind the first paint has nothing to hide behind; the
    choice is a blank paint or a flash, and the way out is `<link rel="modulepreload">` in the
    `<head>` the prerenderer *does* control.


99. **23 figures were shown bare years the archive's own data calls imprecise.** `datePrecision`
    is set on 97 of the graph's figures — `exact-date | year | circa | century | range | disputed
    | unrecorded` — and was rendered by nothing. So Bulleh Shah read "1680 / 1757" where the
    record says `circa`; Data Ganj Bakhsh "1009 / 1072" (`range`); Abdullah Shah Ghazi "773"
    (`century`); and Abul Faiz Qalander Ali Suharwardi "1885 / 1958" where the record says
    `disputed` **and his own `disputedDates` lists two competing birth dates** — the page
    asserting a settled year over data that says the sources do not agree. *Measured 24 August
    2026.*

    Nothing could have caught it. A number is a valid string, every page rendered, and the dates
    shown were the ones the sheet holds. It was wrong only in what it implied, and the field
    saying so sat one property away. This is the same shape as §9.85 — data the archive holds and
    no surface reads — and it is worth doing that audit deliberately rather than stumbling into
    it: `datePrecision` (97) and `biographySource` (97) were both rendered nowhere; `lineageOnly`
    (60) is used for counting but never shown.

    Fixed as a *marker*, never a rewrite: the date string stays exactly as recorded (RULE 2) and
    the precision is shown beside it, reusing the four `precision*` labels the shrine infobox
    already had. And it stays quiet where the string already hedges — "c. 1165 · circa" makes the
    archive look like it cannot read its own data, which is worse than the silence it replaced.
    `figurePrecision.test.ts` asserts both directions, so a future import cannot slip either a
    bare approximate year or a doubled hedge onto a page.

100. **The audit §9.99 called for, one field on: `biographySource` and `lineageOnly` were
    rendered by nothing either.** *Measured 24 August 2026 from `data/kg.json` (196 figures).*
    97 figures carry `biographySource` — the file their dates, titles and alt-names were read
    out of — and `biographyReviewed` is **`false` on all 97**. Those pages printed machine-read
    values in the same type as a value entered by hand from the survey, while the lineage links
    and the order memberships *on the same page* already carried an unreviewed chip and a quoted
    source. A figure's own dates were the one machine-read claim on the page shown without
    either. 60 figures carry `lineageOnly` — the masters named in someone else's chain who have
    no site here — and their pages said nothing to distinguish "documented, and the archive knows
    almost nothing" from "here only because another figure's lineage names them".

    **Three figures are both**, and they are the interesting ones: Shah Abul Muali Qadri, Shah
    Gohar Peer and Mian Qurban Ali Shah have no site in the archive *and* a full sourced
    biography read out of its own entries. `getAllSaints` excludes them from "Figures in the
    archive" so the headline counts stay honest, which is the right call for a count and leaves
    three documented figures reachable only through a lineage. **A question for a human, not for
    an agent to decide:** should a lineage-only figure with a sourced biography be listed?
    Nothing has been changed about list membership.

    `figureProvenance()` therefore returns a *list* of statements rather than one classification
    — collapsing them has to discard a true sentence. Rendered under the same
    "Sources & Provenance" heading a shrine page uses. All 95 dataset references resolve to real
    entry slugs, and one of them is worth the whole feature: Guru Gobind Singh's dates were read
    from the entry for `gurdwara-bhai-beba-singh` while his own shrine is
    `gurdwara-dash-mesh-pita`, so the link is not a duplicate of "Associated shrines" — it is
    the only way to check the actual sentence. The guard fails the build if a reference stops
    resolving, because printing the raw path is the deliberate fallback and a pipeline rename
    would otherwise be silent.

101. **A budget file is only as wide as its route list — and the no-leak guard's list was two
    saint pages, both of figures the Urdu dictionary happens to carry.** Adding a third route
    (`/saint/shah-gohar-peer?lang=ur`, the lineage-only shape) immediately found **9 undeclared
    Latin runs**: a figure whose name the dictionary lacks had that name printed raw in the
    breadcrumb, the `<h1>` and the infobox title, and his recorded Hijri dates printed raw twice
    each ("۱۱ Rabīʿ al-Sānī ۷۲۹ AH" — Eastern digits, Latin month). So **the title of most
    figures' pages has been an undeclared leak for as long as this guard has existed**, and the
    guard was green throughout. Now declared and bidi-isolated like every other recorded name;
    the route declares 28 runs, accounted item by item in the spec header.

    The open follow-up, not done: a recorded Hijri date's month name could go through a segment
    dictionary the way `localizeObservance` already handles observance strings —
    `HIJRI_MONTH_NAMES` in `src/lib/data/ursDates.ts` already holds both languages. That would
    turn several declared runs into actual Urdu. It is a translation of *data*, so it needs the
    same care as the termbase: a wrong month is a wrong date.

102. **Touch scrolling in the command palette never worked on a phone, and no desktop test could
    see it.** Reported by the user, 24 August 2026. `.palette-backdrop` is
    `position: fixed; inset: 0`, and on mobile Safari that resolves against the **large**
    viewport — the one measured with the URL bar hidden. The flex container was therefore taller
    than the screen, the phone override said `max-height: none` on the panel, the panel stretched
    to match the container, and `.palette-results` **never overflowed**. Nothing overflowing means
    nothing to scroll: the rows past the screen edge were clipped and unreachable, and a drag did
    nothing at all. It presents as a broken scroll container and is in fact a correct one given
    too much room.

    Fixed with `height: 100dvh` on the backdrop, `max-height: 100%` on the phone panel, and the
    momentum / `overscroll-behavior: contain` / `touch-action: pan-y` triad on both scroll
    regions — which `.shrine-list-panel` in map.css has carried since the sidebar was built. The
    palette, added later, had one of the three. `touchScroll.test.ts` asserts all of it, plus one
    prohibition worth knowing: **`touch-action` is intersected down the ancestor chain**, so
    `touch-action: none` on the backdrop — a plausible way to stop the map behind from panning —
    would silently kill scrolling in every list inside it.

103. **The same viewport bug was in the lightbox, and the sweep for it found a dead token.**
    Having fixed §9.102, I swept every stylesheet for `position: fixed; inset: 0`. Two hits: the
    palette, and `.lightbox-overlay` — whose image is `max-height: 100%` of that box, so **on a
    phone the bottom of every photograph sat behind the URL bar, clipped, with nothing to
    scroll**, on the one surface whose entire job is showing a photograph whole. It also carried
    `-webkit-overflow-scrolling: touch` with no `overflow` property at all, so that declaration
    was inert. Now `height: 100dvh`, and `touchScroll.test.ts` asserts the *pattern* — any fixed
    inset-0 overlay must be dvh-sized — so the third one is caught on the way in.

    The sweep also turned up **`min-height: 100vh` on three page wrappers**, which on iOS is the
    large viewport: a page is at minimum URL-bar-taller than the screen, so short pages carried a
    phantom scroll. `100svh` is the right unit for a *minimum* height — the smallest the viewport
    gets, so no phantom scroll and no reflow when the URL bar hides. `dvh` is for a fixed overlay
    that must match what is visible right now. Three units, three different questions; using one
    everywhere is how this class of bug spreads.

    **And the dead token.** `.shrine-page-wrapper` read `var(--page-min-height, 100vh)`, and
    `cssTokensDefined.test.ts` exempted that property from its no-fallback rule with the note
    "set by useViewportHeight". **No such hook exists anywhere in `src/`.** Every page had always
    taken the fallback. The test's stale-entry check passed throughout, because it only asked
    whether the *property* was still read from CSS — and it was. An exemption has two halves, the
    property and the thing that sets it, and a check on one half is not a check. The missing half
    is now asserted: every `SET_AT_RUNTIME` entry must be written by real code under `src/`.
    Probed by re-adding the entry; it fails.

104. **Recorded Hijri dates read half-translated in Urdu, and the fix is the one substitution
    `localizeObservance` is right to refuse.** The Urdu view showed "۱۱ Rabīʿ al-Sānī ۷۲۹ AH" —
    Eastern digits around a Latin month and a Latin era marker, which is worse than either
    language on its own. 45 recorded strings across `data/kg.json` and the shipped snapshot carry
    a Hijri month or an era marker. *Measured 24 August 2026.*

    `localizeObservance`'s standing rule is **never compose Urdu out of tokens**, because that
    means deciding word order, and the wrong decision produced a coverage line reading "169
    places out of 32". A date is the one case where no such decision exists: **Urdu writes day,
    month, year in the same order English does**, so `ربیع الثانی` goes exactly where
    `Rabīʿ al-Sānī` was and nothing is reordered. That, and only that, is why
    `localizeRecordedDate` is allowed to substitute.

    Two guards on it, both load-bearing:
    - **No loose matching.** `Rabi` alone is deliberately not in the variant table: it would map
      `Rabi al-Awwal` and `Rabi al-Thani` to the same month, a five-week error in a death date.
      Longest variant always wins.
    - **A date context is required** — a day before, a year after, `(Month)` alone in
      parentheses, "month of X", or "X in 1575". The month words appear in English *prose* too
      ("Muharram observances", "during Ramadan"), and this function must never reach into a
      sentence. Measured against every name, title and description in the shipped data: no
      collisions, because the prose hits are all sentences and all fail the context test.

    Everything else passes through untouched (RULE 2), so "10 Zil Hajj 960 AH, Kirman, Iran (as
    related in the survey)" keeps its qualification in English — declared and isolated. The
    lineage-only route's declared Latin fell 28 → 24: four runs *gone*, not merely declared.

    Same pass: `disputedDates[].field` was printed verbatim — `born`, `died`, `floruit`,
    `era / died`. In English an unlabelled lowercase token mid-article; in Urdu undeclared
    English. The three keys this page already labels use those labels, `floruit` gained a label
    pair, and `era / died` — a compound the pipeline itself invented — is shown as recorded
    source text rather than given a translation this codebase would be making up.

    **Still open:** the same substitution would help the almanac and the shrine infobox, whose
    observance strings ("Annual urs (18-20 Safar)") reach the reader through
    `localizeObservance`'s whole-segment lookup and stay Latin when the segment is not in the
    dictionary. Wiring it in there changes that function's `translatedAny` logic — a partly
    substituted segment still contains Latin — so it wants its own measured pass rather than a
    quick edit.

105. **I built an observance fallback that no page can reach, and measured it only after
    building it.** Recorded because the mistake is more useful than the code was.

    Following §9.104's open item, I added a rule to `localizeObservance`: for a segment shaped
    `<phrase> (<date>)` — `Annual urs (18-20 Safar)` — look the phrase up, localise the
    parenthetical as a date, and recombine only if the result carries no Latin at all. The gate is
    sound and the rule is defensible. It rescued 8 of the 190 distinct `Events` segments in a
    direct measurement, and **it fires on exactly zero pages.**

    Why, and this is the part worth keeping: the infobox calls
    `localizeObservance(localizeField(row, 'Events'), lang)` — **`localizeField` runs first**, and
    for all eight shrines carrying those segments it already returns a human translation, better
    than the mechanical one ("سالانہ عرس (۱۸ سے ۲۰ صفر)", with سے for the range and Eastern
    digits, against my "سالانہ عرس (18-20 صفر)"). The almanac's other call site renders
    `sourceText` only for **undated** observances, and all eight of these parse to a date, so they
    are never in that list. Checked by dumping the rendered Urdu infobox row on all eight shrine
    pages: eight of eight already fully Urdu.

    Reverted. **The lesson is the ordering.** My earlier estimate of "23 rescuable segments" came
    from looking keys up in `src/data/urdu-seed.json` directly, which is not how the runtime
    resolves them — `translateToUrdu` normalises, and `localizeField` gets there first. Measuring
    through the real call path takes one temporary spec file and would have come before the
    implementation rather than after it. The repository is full of the same shape in the other
    direction (§9.85, §9.99, §9.100: data held and not rendered); this is code written for a
    render path that was already covered.

    What survived, because it *is* reachable: Gregorian months in `localizeRecordedDate` — the
    archive records both calendars and sometimes both in one field ("8 Muharram 1040 AH /
    8 August 1630 CE"), which would otherwise be half Urdu down the middle of a slash — and a
    missing `fmtNum` on the almanac's undated observance row, a genuine i18n rule 5 gap where the
    infobox's equivalent row had always had one. A month-first date ("November 27, 1981") is left
    month-first: reordering it to the usual Urdu day-first would be this function deciding word
    order, the one thing the whole substitution argument rests on not doing.

106. **The graph called a Shivratri an urs — 86 times, in published structured data.**
    *Measured 24 August 2026 from `data/kg.json`.* `build-kg.mjs` typed **every one** of its 168
    event nodes `urs` and named them from a single template, so the graph asserted "Urs of Shiva
    at Amb Temples", "Urs of Goddess Durga at Churrio Jabal Durga Mata Temple", "Urs of Bhai
    Waliram at Bhai Waliram Darbar". 86 of the 168 were at Hindu temples (49) and Sikh gurdwaras
    (37).

    **Not internal.** `scripts/prerender.mjs` emits every event as a schema.org `Event` in its
    shrine page's JSON-LD, so this was machine-readable on 86 published pages and exported again
    through `data:export` into `graph.jsonld` and `graph.ttl`. An urs is a Sufi death-anniversary
    observance; flattening six traditions into one tradition's vocabulary is exactly what
    CLAUDE.md's terminology rule exists to prevent, and it went unnoticed because no *page*
    renders event names — `getEventsForShrine` has no callers. **A field with no UI is not a
    field with no readers.**

    Two more inventions in the same twelve lines:
    - **`frequency: 'annual'` for 83 of 168 events**, because the parser's final fallback was
      `'annual'` for any non-empty text. Those published `repeatFrequency: P1Y` — including sites
      whose `Events` column reads "Not documented" or "None - destroyed 1992".
    - **An event node at all** for 16 rows whose answer to "what happens here" is a site *status*
      ("Heritage site", "Reopened for pilgrims", "None - abandoned").

    Fixed so the record's word decides: `urs` requires the text to say urs *and* the site not to
    be one of the four non-Muslim traditions; everything else is `observance`, named from the
    observance's own recorded words ("Maha Shivratri at Churrio Jabal Durga Mata Temple") because
    the archive has no vocabulary of its own for a Gurpurab and inventing one is not a build
    script's job. Frequency is present only when stated. 168 → 149 events, 76 urs and 73
    observances. `KGEvent.eventType` narrowed from four values to the two the data uses — three
    of the old four were never emitted while all 168 rows took the fourth.

    **The direction that nearly broke:** requiring `category === 'Muslim Shrine'` would have
    retyped Darbar Abul Muali Qadri's real *ʿurs* as a generic observance, because that row's
    `category` is the invalid `"Islam"` (a known sheet defect the validator has warned about since
    21 August). The record's own word has to be able to outvote a schema violation. Asserted in
    both directions.

    Also extracted `scripts/data/lib/category.mjs`, because **build-kg.mjs had reintroduced the
    exact `??` bug validate.mjs's own comment warns about**: a blank string is not nullish, so
    `row['category'] ?? row['Category']` lets an empty `category` shadow a good `Category`. Six
    rows have a blank `Category` and one a blank `category`, so either `??` direction gets a
    different row wrong. One resolver, used by both, with the trap written down once.

107. **`/coverage` was displaying 544 citations where the archive holds 533.** The counting rule
    was one regex, `/^\s*[-*]\s+\S|https?:\/\//gm`, whose two alternatives both match inside a
    single item — so a citation ending in a URL was counted twice, and nine do. *Corrected
    24 August 2026.* Every bibliography region in the shipped data is only list items (533, no
    prose, no wrapped lines), so one item is one list line.

    2%, and worth the commit for the reason `/coverage` exists at all: the page's claim is that a
    number computed from the data cannot drift from the data. A rule that miscounts is a
    different failure from a stale note, and a subtler one — nothing goes stale, it was never
    right. 544 was also quoted in CLAUDE.md's standing findings, now corrected there too.

    The rule now lives in `src/lib/data/bibliography.ts` and returns the items' *text*, not just a
    count, because the knowledge graph needs the same items to build source nodes and two
    implementations of one definition is how they diverge.

108. **The archive had no top-level navigation on a phone.** *Found 24 August 2026, and it had
    been true since the app was built.* A phone reader's only navigation anywhere in the app was
    "Back to map". `/graph` (the figures explorer), `/almanac`, `/typology` and `/coverage` were
    reachable **only** through links inside article bodies — so four of the archive's six
    surfaces existed for a reader who already knew they existed. The map was a front door onto
    one room.

    Fixed with a five-tab bar, phone only: **Map · Figures · Almanac · Atlas · Archive**. Five
    because a tab bar stops being legible past five on a phone, and every one is an index over
    the whole archive rather than one entry; `/coverage` and `/report` are one tap deeper because
    About links to both and they answer "how complete is this" rather than "what is in it".

    Things that were not obvious:
    - **A detail route has to light up the index that leads to it** — a shrine and a place belong
      to the map, a figure and an order to the explorer — or a reader arriving from a search
      engine sees five unselected tabs and no sense of place. `tabs.test.ts` asserts this against
      the *real* route table parsed out of `App.tsx`, so a route added without a home fails a
      test instead of shipping a dead bar on a new page.
    - **A route no tab owns resolves to null, not to a default.** Marking the map current on a
      404 is a claim, and `aria-current="page"` has a screen reader say it out loud.
    - **`display: none` above the breakpoint, nothing softer.** `visibility: hidden` and an
      off-screen transform both leave five links in a desktop keyboard reader's tab order,
      leading to a bar that is not on the screen. Asserted by checking the element has no box at
      all.
    - **The map's bottom sheet had to move.** It was pinned to `bottom: 0`; it now sits on
      `var(--tabbar-height)`, and Leaflet's attribution row — which the licence requires be
      visible — needed `max(--tabbar-height, --safe-bottom)` rather than a sum, because the
      home-indicator inset is already inside the tab bar's height on a phone and would otherwise
      be counted twice.
    - **The material had to be the strong one.** At `--glass-bg` (0.82) the article text
      scrolling underneath showed through the 10px labels. Same failure, same fix, as the command
      palette three commits earlier: small type needs a ground.
    - **Nastaliq pays for the height.** 10px Latin labels are fine; Urdu at 10px smears, and at
      12px in a 49px bar the tail of تقویم clipped against the bottom edge. The Urdu label gets
      12px with `line-height: 1.45`, and the icon gives up two points to pay for it.

    `e2e/tabbar.spec.ts` covers the geometry no unit test can see: one current tab per route,
    44px targets, the last element of each page clearing the bar, RTL mirroring, and absence on a
    laptop.

109. **The archive had three list idioms for one thing, and the longest list used the worst
    one.** *Found 24 August 2026.* 196 figures on `/graph` were a bare multi-column grid of blue
    links — on a phone, an undifferentiated column of underlined text with no rows, no targets
    and nothing to say a row led anywhere. A figure's own shrines were a stack of individually
    bordered cards separated by gaps. A place's sites were a flex column with hairlines and no
    container. Same content shape, three appearances, none of them a list.

    Replaced with one primitive, `src/styles/list.css`: the platform's inset grouped list — a
    single rounded container, hairline separators, the whole row as the tap target, and a chevron
    where the row leads somewhere. Applied to all three (figures, a figure's shrines, a place's
    sites) and the old per-list rules retired rather than left to fight it.

    **The separators are the gaps.** `gap: var(--hairline)` over a container painted in the
    separator colour, with each row painted in the surface colour. One declaration, correct at
    any column count — and the reason that matters is the alternative: per-row borders plus
    `:nth-child` arithmetic to strip the trailing edge off the last row *and* the last column of
    a responsive grid, which is where this pattern usually breaks when the column count changes
    at a breakpoint nobody tested.

    Two smaller things fell out of it. The group heading kept a `border-bottom` from when it sat
    over bare links, which directly above a bordered card is two lines doing one job. And
    `.graph-figure-as-recorded` — a recorded `figure_type` that is a sentence — was `display:
    block` with bottom padding as a standalone line under a link; inside a row it had to become
    an ellipsised trailing note, or a 44px row grew to 70.

    **What is still on the old idiom:** the almanac's seasonal and undated lists
    (`.almanac-list--plain`). They carry a season tag *and* a two-line label, so converting them
    is a JSX refactor rather than a class swap, and it wants its own pass.

110. **The article header was copied into ten pages, and three copies had drifted.** About,
    Coverage and Place carried a back link with **no chevron** while the other seven had one — the
    same control looking like two different controls depending on which page you reached it from.
    Nothing was going to catch that: the copies are seven files apart and each one is correct on
    its own. *Found 24 August 2026 while adding the collapsing title.*

    Now one `EntityPageHeader`, and it does the thing the duplication was in the way of: **the
    page's title arrives in the sticky bar once the `<h1>` has scrolled behind it.** A sticky bar
    holding only a back button is the least useful sticky bar there is — on an article eight
    sections long, nothing on screen said which shrine or which figure the reader was in.

    Three decisions worth keeping:
    - **Watched, not measured on scroll.** An `IntersectionObserver` on the page's own `<h1>`
      fires twice per visit; a scroll listener fires on every frame and has to be throttled into
      approximating the same answer. `rootMargin` is the header's height, so the swap lands as
      the title passes *behind* the bar rather than when it leaves the viewport.
    - **Conditionally rendered, never faded.** A cross-fade is the obvious treatment and is the
      one thing that must not be used: axe folds an ancestor's opacity into the colour it
      measures, so text mid-fade — or parked at `opacity: 0` — reports a contrast failure that
      does not exist (§9.46, which cost an hour). The entry animation is a transform only.
    - **`aria-hidden` on the title.** It is the `<h1>` said twice. A screen reader has already
      announced the heading, and a second copy appearing on scroll is noise a sighted reader
      never hears.

    Under 480px the back link's *label* goes and its chevron stays: a 390px bar minus a back
    label and two toggles leaves a title about eight characters wide. The target is unchanged and
    `aria-label` still carries the name, so nothing is lost but the word.

    The `<h1>` is found with `document.querySelector('h1')` rather than a ref threaded through
    ten pages. That is safe here for a specific reason — the header renders *inside* each page,
    so the heading is in the same commit and present by the time an effect runs — and it would
    not be safe if the header ever moved into a layout above the routes.

111. **The knowledge graph had no source layer at all.** `kg.sources` was `[]` and
    `stats.sources` was `0`, on an archive whose distinguishing claim is provenance. The
    `attested_in` relation type had been sitting in `KGRelationType` since the graph was
    designed — described in the type as "entity/relation id → source" — and nothing had ever
    emitted one. 533 citations across 168 entries were counted on `/coverage` and modelled
    nowhere. *Built 24 August 2026.*

    **464 sources, 533 attestations, 28 of them shared.** The point of a graph rather than a
    count is that sharing: the archive's most load-bearing source, Alam Faqri's *Tazkirah
    Awliya-e-Pakistan*, turns out to underpin **25 entries**, and its two volumes another 16
    between them. "What does this rest on, and what else rests on the same thing" is the question
    a reader of an archive actually has, and until now the data could not answer it.

    Now exported everywhere it belongs: `schema:citation` on every shrine in `graph.jsonld` and
    `graph.ttl`, and — the reader-facing one — in the **prerendered JSON-LD of all 168 cited
    shrine pages**, 533 `CreativeWork` nodes in total.

    Decisions that are load-bearing:
    - **Verbatim, always.** A citation is the source's real title, publisher and URL and is the
      exact string a reader needs to go and check. Nothing is title-cased, trimmed or reordered,
      and `author`/`year`/`publisher` stay unsplit inside `name`: a reliable split needs a parser
      for a dozen house styles, and a wrong one loses the reader that string. Asserted by
      requiring every node's name to appear character-for-character in some entry's bibliography.
    - **`sourceType` only for a bare URL.** Book-vs-article from a bibliography line is the
      inference this project does not make; the field is absent rather than guessed. It made the
      field optional in `KGSource`, which is the honest shape.
    - **Dedupe is conservative.** Two entries citing the same book with different punctuation stay
      two nodes. Under-merging leaves a duplicate a human can see; over-merging asserts two
      citations are the same source, which is a claim about the literature. The three volumes of
      the Tazkirah stay three nodes, correctly.

    **And the trap, which I walked into:** putting the layer in `kg.json` took `/order/:slug` from
    600 KB to **769 KB of eager JS**, because `src/lib/kg.ts` imports the graph statically — the
    same regression class as the 300 KB one earlier today, and caught by the same budget check.
    Every consumer is build-time (two exporters, the prerenderer), so it lives in
    `data/kg-sources.json` beside `kg-shrine-figures.json`. `stats.sources` still carries the
    count, because the count is one number and the graph should be able to say how much it rests
    on. `kgSources.test.ts` asserts the layer is *absent* from `kg.json` with the reason attached:
    the budget check catches the symptom on a build, this catches the cause.

    One thing found while wiring prerender: `kgByShrineSlug` is built from `buried_at`, so it only
    held shrines the graph gives a figure. Attaching sources in that loop would have silently
    dropped the provenance of any entry with citations and no recorded figure — and the entries
    that most need to show their sources are exactly the ones the graph knows least about. Sources
    are attached in their own pass.

112. **`/coverage` can now say what the archive rests on, and the answer is one book.** The
    source layer built in §9.111 is a build-time file, so no page could read it. This rebuilds
    the same index from the shrine data the app has already loaded — **no new payload at all**,
    and nothing to go stale, because it reads whatever the sheet currently says. Same extractor,
    same dedupe key, and `sourceIndex.test.ts` asserts the two arrive at the same numbers (464
    sources, 533 citations) rather than trusting that they do. That agreement only holds if both
    sides normalise identically, which is the half that would otherwise drift silently.

    What the page now says: 464 distinct sources, 28 cited by more than one entry, 27 entries
    resting on a single source — and a list of the shared ones, headed by Alam Faqri's *Tazkirah
    Awliya-e-Pakistan* at 25 entries. The page states the caveat too, because it is true: a
    recurring standard reference is not a weakness. It is worth seeing because it says where a
    single error would travel furthest.

    Three things the first draft got wrong, all caught by looking at the rendered page:
    - `Fact` hardcodes "entries" as its noun, so the facts read **"464 entries distinct
      sources"**. It now takes an optional noun, and `''` lets a label carry its own.
    - The citations printed their markdown literally — `*Tazkirah Awliya-e-Pakistan*` with the
      asterisks showing. Rendered as emphasis now, and emphasis *only*: a full markdown renderer
      would parse a citation's brackets, quotes and URLs as syntax, and the one thing a citation
      must survive is being read literally.
    - In the Urdu view the Latin citations were set flush-right, so the eye had to find a new
      ragged start on every line. `<bdi>` gets the order right; `direction: ltr` on the citation
      gets the alignment right too.

113. **A real overflow shipped, and the run I cited as green had tested a stale bundle.** The
    grouped-list commit put a 17px overflow on `/graph` at 1280px — the recorded `figure_type`
    note claimed 178px of a 275px row (a `max-width: 24ch` I had written myself, sensible as a
    reading measure and useless as a share of a grid cell), squeezing "Ghazi Ilm Din Shaheed"
    into 50px, where it overflowed by 11.

    **The process failure is the part to keep.** After editing the list CSS I ran the playwright
    batch, it timed out at 120s, and I re-ran it in the background *without* rebuilding — so
    `dist` was the previous build and the suite reported 65 green on code that was not the code I
    had written. This repository already has that lesson written down twice (§9.68, §9.53:
    "local green plus a successful deploy is not verification"), and I repeated it in the same
    session I was citing it in. **`npm run build:e2e` before every playwright run, no
    exceptions** — a stale `dist` produces a green suite, which is worse than a red one.

    Fixed by moving the cap to `.inset-row-note` (45% of the row, relative to whatever width the
    column has) and giving `.inset-row-label` `overflow-wrap: break-word` as a floor —
    `min-width: 0` lets a flex item shrink below its content, and a word longer than the shrunken
    box then overflows it. Breaking a name mid-word is ugly; a name hanging out of its row is a
    bug.

    **And the sequel, caused by over-correcting the above.** Trying to avoid a stale `dist`, I
    started a background playwright batch, then rebuilt and ran two more playwright invocations
    while it was still going. The batch reported **35 failed / 73 passed**; every one of those
    suites passes when run alone (16, 32, 71). The suite reuses a single preview server
    (`reuseExistingServer`) and a single `test-results` directory, so a concurrent
    `npm run build:e2e` swaps `dist` out from under a run in flight. **Never run playwright
    concurrently with itself or with a build** — one sequential run on a stable `dist` is the
    only kind whose result means anything. A red suite from contention is as useless as a green
    one from a stale bundle, and costs more to diagnose.

114. **The almanac's two plain lists were the last holdout on the old idiom, and they are
    converted.** The seasonal list (season tag + name) and the undated list (name + the recorded
    observance under it) now use `.inset-list` like the other four, so the archive has one list
    appearance rather than three.

    **The dated calendar entries are deliberately not converted.** `.almanac-entry` is a
    two-column grid — a date column aligned across every row, then the content — and that
    alignment is what makes a calendar readable down the page. A browse row and a calendar row are
    different things, and running the primitive over both because both are `<li>`s would cost the
    alignment to gain a consistency nobody asked for. The boundary is: the primitive is for lists
    a reader scans to pick something; a calendar is for reading down a column.

115. **The explorer could be browsed by name and by tradition but not by *when*.** On an archive
    whose figures run from the 8th century to the 21st, that is the axis its material is actually
    organised along, and it was the one axis with no control. `/graph` now carries a century chip
    row: **8th 1 · 11th 3 · 12th 1 · 13th 8 · 14th 2 · 16th 7 · 17th 13 · 18th 12 · 19th 10 ·
    20th 15 · 21st 1 · Undated 63.** *Measured 24 August 2026.*

    **The undated chip is the point, not the leftover.** `figureCentury` reads the recorded death
    year, or the birth year where no death is given, and refuses to convert a Hijri year — that
    would be the archive inventing a date (RULE 2). So **63 of the 136 documented figures cannot
    be placed in a century at all**, which makes undated the largest group in the row. A filter
    that silently dropped them would hide nearly half the archive behind a control that looks
    complete. It carries its count, it is clickable, and the note above the row says where
    centuries come from and that nothing is converted.

    Only centuries with at least one figure get a chip. An empty 15th-century chip would imply
    the archive had looked and found nothing, when what is true is that it holds three figures it
    cannot date for every two it can.

    Two invariants worth having: `figureCenturyFilter.test.ts` asserts a Hijri-only figure always
    comes back null and that the buckets partition the figures exactly once each; and
    `e2e/century-filter.spec.ts` asserts **the chip counts sum to the list length** — a filter
    whose parts do not add up to the whole is one a reader cannot trust — plus that the century
    and the text filter compose rather than resetting each other.

    One near-miss: the count inside an active chip was first dimmed with `opacity: 0.75`, which is
    the §9.46 trap exactly — axe folds an ancestor's opacity into the colour it measures, so it
    would have reported a contrast failure no reader could see. It takes `currentColor` at full
    strength instead.

116. **60 figures had a page and no way in.** `getArchiveFigures` excludes the `lineageOnly`
    nodes so that every count describing the archive describes the archive — Hujwiri's master
    al-Khuttali is in the graph because a chain must not stop at the first teacher without a
    shrine in Pakistan, not because this archive documents him. That exclusion is right and
    stays. But excluded from the counts had quietly become excluded from the site: each of the 60
    has a reachable page, every one is named in a recorded lineage relation, and **none appeared
    in any index**. The only way to reach one was to already be walking the chain that names it.
    **Prince Dara Shikoh was unreachable from anywhere on the site.** *Found 24 August 2026.*

    `/graph` now ends with "Named in a lineage, not documented here (60)" — a separate section,
    plainly labelled, below the archive's own figures, so it adds a way in without touching a
    single count. Each row says how the record connects the figure, which is what makes an
    unfamiliar name mean anything.

    **The assumption that was wrong, and how it was caught.** I measured "all 60 appear in a
    lineage relation" by collecting *both* sides of every relation, then wrote the row note as
    "teacher of X" — and 17 of the 60 are recorded as somebody's *disciple*, not as a teacher
    (Dara Shikoh, Princess Jahanara, and Nizamuddin Auliya, whose dargah is in Delhi and so is
    rightly not an entry in an archive of Pakistan). Those 17 rows rendered with no note at all.
    The test now asserts both directions exist and that the two groups sum to 60, so the
    assumption cannot be made again silently.

    Also: the no-leak guard caught **73 undeclared Latin runs** here, because unlike the
    archive's own figures most of these names are not in the Urdu dictionary — they are masters
    named in a source and nothing else, so RULE 2 shows them as recorded rather than
    transliterating. Declared, and the route's budget raised 49 → 122 with the reason written
    down. `<bdi>` alone does not declare a run; `data-latin` does.

    And a phone-layout consequence worth keeping: at 390px a row is ~340px, so the note's 45%
    cap left ~150px — enough to render "teacher of Data Ga…", truncating away the only half that
    matters. Below 560px the note now wraps to its own full-width line, with `order` keeping the
    chevron on the first line where a thumb expects it.

117. **`/about` now states what the graph knows *and how well it knows it*.** The page counted
    the archive's sites; it said nothing about the people, silsilas and links behind them, and
    nothing at all about how much of that a person had checked. *Added 24 August 2026.*

    Two sections. **What this archive knows:** 136 figures with a site here, 5 orders, 86 recorded
    teacher–disciple links, 149 observances, 464 distinct sources, 177 honorifics, 94 places, and
    the 60 figures named in a lineage with no site here. **How well it knows it:** 94 figures whose
    dates and titles were read out of prose by a machine and by no editor, **80 of 86** lineage
    links unreviewed, **44 of 64** silsila affiliations unreviewed, 11 figures whose sources give
    conflicting dates.

    That second section is the point. An archive that publishes "136 figures" and not "most of
    this graph's lineage is machine-read" is publishing the flattering half. Every one of those
    claims already carried its source quote and an `unreviewed` badge wherever it appeared; what
    was missing was the total, in one place, where a reader decides how much to trust the rest.

    **`data/kg-stats.json`, ~400 bytes, generated.** `src/lib/kg.ts` imports `kg.json`
    statically, so six counts off the graph would have cost 426 KB of eager JS — the same trap
    that took `/order/:slug` to 769 KB when the source layer went in. Third use of the "slim
    lookup beside the graph" pattern (`kg-shrine-figures.json`, `kg-sources.json`).

    A derived stats file is a snapshot, and snapshots go stale — the failure this repository's
    struck-through standing findings are a monument to. `kgStats.test.ts` recomputes **every**
    number from `kg.json` and requires a match, so a future pass that changes how figures are
    counted and forgets this artefact fails a test instead of leaving `/about` publishing
    yesterday's figure with today's confidence. It also asserts the unreviewed counts are
    non-zero: not a tautology but a floor on candour — a silent drop to zero would mean the review
    flag stopped being written, not that 224 claims got reviewed.

    Two drafting notes. `aboutKnowsHeading` already existed, meaning "How it knows what it says"
    (the methodology block), so these keys are `aboutGraph*` — TypeScript caught the collision,
    which is the only reason the two sections did not end up fighting over one heading. And the
    unreviewed counts first read "80 … (86)", with the denominator bolted on outside the
    sentence; it is inside it now via `tFn`, because Urdu puts it in a different place and that
    is exactly what `tFn` exists for.

119. **The archive could state its provenance debt and not reduce it. Now it can.** *Built
    24 August 2026 — plan in `docs/planning/REVIEW_DESK_2026-08-24.md`.*

    `/about` publishes 94 machine-read biographies, 80 of 86 lineage links and 44 of 64
    affiliations — **218 claims** carrying a source quote and an `unreviewed` badge, none hidden,
    none presented as settled. That is the honest minimum and it is not the goal. The reason the
    number had never moved is not that nobody would review these: it is that reviewing one meant
    opening a 255-row CSV, reading a quote in a spreadsheet cell, and hand-editing a proposals
    JSON. **The evidence and the verdict lived in different tools.**

    `/review` puts them in one place — the claim in words a person can judge, the verbatim quote
    it was read from, the file it came from, and three verdicts with a note field. Behind the
    existing soft `?team=1` gate, unlisted, absent from the tab bar.

    Three lines it does not cross, each with a test:
    - **Not an editor.** No field writes a value into the archive; the only writable thing on the
      page is the reviewer's own note, asserted by walking every input on the page. Letting a
      reviewer retype a date would put an unsourced value into a provenance archive *through its
      provenance tooling*.
    - **Not authenticated.** `hasProjectAccess()` is visibility and says so in its own file. The
      data is a published CSV; this keeps casual readers out of editorial detail and claims nothing
      more.
    - **Not a queue with an owner.** No assignment, no locking. Two reviewers agreeing
      independently is better evidence than one holding a lock.

    **The staleness rule is the load-bearing one.** A verdict is stored with the digest of the
    quote it judged. If a later extraction changes that quote, the verdict no longer applies and
    the page says so instead of carrying it forward — otherwise this tooling would move an
    *unreviewed* claim into the reviewed pile, which is the exact failure it exists to reduce.

    Output is a CSV in `build-review-worksheet.mjs`'s own columns, so it drops into the flow that
    exists rather than starting a second one. **Agents do not write the sheet or the proposals
    (RULE 3)** — a human takes the file. `verdictsToCsv` quotes every field and doubles embedded
    quotes, tested against a note containing a newline, because a citation contains commas and an
    unquoted field turns one row into two and imports silently wrong.

    Payload: `data/kg-review-queue.json`, 218 items with quotes and resolved names, 78 KB, loaded
    by **dynamic `import()` inside the route** — the eager cost is 251 KB, essentially the app
    shell. If that number ever jumps by ~78 KB the import went static; the budget entry says so.
    Fourth use of the slim-file-beside-the-graph pattern.

    `verdicts.test.ts` also asserts the queue is **exactly** the claims `/about` publishes, by
    kind. If the desk and the About page ever disagree, one of the two is lying about the state of
    the archive.

    **Phase 3 is the missing half**: `apply-review-verdicts.mjs`, which reads a returned verdict
    file and flips `reviewed: true` on confirmed proposals. Written up in the plan, including the
    invariant it needs — a verdict may only ever *narrow* what the graph asserts, and the script
    must refuse to run when a CSV's evidence digest does not match the proposal it names. Until
    that exists, a reviewer's session ends in a downloaded file and nothing changes in the graph.
    Phase 4 needs no work at all: `/about` recomputes those three numbers on every load, so they
    fall on their own as verdicts land.

120. **The review loop closes: a verdict can now land.** *Built 24 August 2026 — phase 3 of
    `docs/planning/REVIEW_DESK_2026-08-24.md`.* `/review` produced a CSV and nothing consumed it,
    so a review session ended with a downloaded file and a graph that still said `unreviewed`.
    `npm run data:review:apply -- verdicts.csv [--write]` is the other half.

    **The reason a verdict could not previously land is worth knowing:** `build-kg.mjs` had
    `reviewed: false` **hardcoded in three places** — lineage relations, order memberships, and
    `biographyReviewed`. Even a hand-edited proposal could not have been marked reviewed. All three
    now read the flag off the proposal, so it lives with the claim it is about.

    Three invariants, asserted against the **real** proposal documents and the real queue rather
    than fixtures, because a fixture agrees with whatever shape I imagined instead of the shape the
    pipeline emits:
    - **A verdict may only ever narrow what the graph asserts.** No path writes a value into a
      proposal's fields. The confirm test compares *every other key* before and after and requires
      them identical — a reviewer's judgement about a claim must not be able to edit the claim.
    - **All or nothing.** One bad row refuses the whole file. The applier is pure and returns the
      *original* documents on error, so even a caller that ignored the error list would write
      nothing. A stale file half-applied is worse than one refused: somebody then has to work out
      which half landed.
    - **The digest is checked, not trusted.** A mismatch means the quote changed after the verdict
      was recorded, so it is a judgement about text that no longer exists. Verified end to end: the
      CLI refuses with `--write` passed and exits 1.

    Rejections splice `proposals` in **descending index order** — three at once is what catches the
    off-by-one that one at a time never would — and land in the file's existing `rejected` array
    with the reviewer's note. Recorded rather than deleted: "an editor looked at this and said no"
    is itself provenance, and the extractor should not propose it again next run. `unsure` changes
    nothing about the claim, which is the truth, and keeps the note.

    Dry run by default; `--write` is opt-in. The files are hand-curated data in a provenance
    archive, and the default for a script like that is to show its work first. There is also a
    hand-rolled RFC 4180 parser in the lib — 30 lines, no dependency — because the two things this
    archive's data guarantees will appear in a verdict file are commas inside quoted fields (every
    citation) and newlines inside them (a reviewer's note).

    **Phase 4 needed no work at all.** `/about` recomputes "94 machine-read biographies, 80 of 86
    links, 44 of 64 affiliations" from the graph on every load, so those numbers fall on their own
    as verdicts land. The progress bar for this project is a page that already existed — which is
    the argument for computing figures from data rather than writing them down.

121. **Ten of thirteen pages had no route to the licence or to what this archive is.** The
    sentence *"Licence and citation must be reachable from any page — a public archive that states
    neither is not publishable"* was already a comment in this codebase — on the shrine, saint and
    order pages, and nowhere else. *Found 24 August 2026.*

    The pages missing it were the ones it mattered most on: `/coverage`, `/about`'s siblings,
    `/graph`, `/almanac`, `/typology`, `/report`, `/place/:slug` — the surfaces *about* this
    archive's provenance did not say who made it or under what terms — and the **404**, which is
    the page a reader is most likely to arrive at from outside.

    One `SiteFooter` now, on every page but the map. Two details worth keeping:
    - **The shrine page's footer was not identical**, which is why extracting it needed care: it
      carries a fourth item, a "report a correction" link with that entry's own issue URL. The
      component takes `children` so that survives — it is the one place a reader can push back on a
      specific claim, which on this archive is the point.
    - **On `/about` the About link becomes plain text.** A link from the licence page to itself is
      a dead control that looks like a live one; the credit still shows, which is the part that has
      to be everywhere.

    `MapPage` is exempt by name, with the reason: it is a fixed full-height layout whose bottom
    edge already carries the sheet and the tab bar, and a footer there is not a footer, it is a
    thing on top of the map.

    The guard reads the `src/pages` directory rather than a route list, because **the failure mode
    is a new page**: someone adds a route, copies a page's structure, and forgets a footer nobody
    looks at. A test that lists the directory notices a fourteenth file; an e2e over a hardcoded
    list does not. It also fails on any page still hand-rolling its own footer — three identical
    copies is precisely the state in which a fourth gets forgotten rather than copied, which is
    what happened here.

### Added 24 August 2026 — a red test that meant `dist/` was old, not that anything broke

`npm run test` came back **2 failed, 909 passed**, both in
`src/lib/i18n/__tests__/uiStringSplit.test.ts`: *"the Urdu table is no longer a dynamic entry —
the split is gone."* Nothing was wrong with the source. `dist/` was built on **23 August**; the
Urdu-string split landed on the **24th** (`813b1c5`). The test was reading a build that predated
the thing it asserts about, and saying so in the voice of a regression.

The mechanism is worth knowing because it will recur for any test that reads `dist/`:

- `dist/` is **gitignored**, so it is never cleaned by a checkout and never refreshed by
  `npm run test`. It persists at whatever commit last built it, indefinitely, across branches.
- The guard was `describe.skipIf(!existsSync(distUr))`. Existence is not freshness. A build from
  any date satisfies it, and every assertion inside then runs against an artefact that may have
  been produced by different source.
- The skip was written for exactly this class of problem — its comment says a test that fails
  because `dist/` is absent "trains people to ignore it" — and then failed for the stale case
  the same way.

Both halves are now fixed, and the fix is a relocation, not a patch:

1. **`scripts/check-routes-prerendered.mjs` asserts the preload** — the chunk is a dynamic entry
   in the manifest, every `/ur` page carries the `modulepreload`, its base matches the entry
   script's, and no English page carries it. This runs **inside `npm run build`**, moments after
   the artefact is written, so it cannot be handed a stale one. Confirmed to exit non-zero on all
   four breaks, not merely to pass when things are fine. `prerender.mjs` had claimed this check
   existed since the split landed; it did not until now, so for a day the invariant lived only in
   a comment.
2. **The unit test's guard compares mtimes** — `dist/.vite/manifest.json` against
   `uiStrings.ur.ts`, `uiStrings.ts`, `prerender.mjs` and `vite.config.ts`. Stale dist → 3 skipped,
   no failure. Fresh dist → 8 passed. Skipping loses nothing now that the build gate holds the
   line.

The general lesson, and the reason this is in §9 rather than a commit message: **an assertion
about a build artefact belongs in the build**, not in a test run that does not produce one. Where
a test must read `dist/` anyway, its precondition is "newer than the sources that decide its
contents", never "exists".

### Added 24 August 2026 (later) — three pages were answering one question

`/about`, `/coverage` ("What this archive knows") and `/report` ("State of the Archive") were
three routes about the same subject: what is in this archive and how far it can be trusted.
The map's welcome card listed all three by name, one under the other, which is how it was
noticed. They are **one page** now — `/about` — and the two old routes redirect into it.

What made this a merge rather than a concatenation:

- **The same statistics were computed twice and rendered three times.** `buildCoverage`
  (`src/lib/data/coverage.ts`) and `buildArchiveReport` (`src/lib/data/archiveReport.ts`) are
  independent implementations of the support-level, info-level and tradition breakdowns.
  `/coverage` drew them from the first, `/report` from the second, and `/about` drew a summary
  of the first. `archiveStatsAgree.test.ts` existed precisely because an archive whose claim is
  candour cannot say "14 field-verified" on one page and "13" on another. The merged page
  renders each breakdown **once**, from `buildCoverage`; `buildArchiveReport` keeps the four
  things only it had — the register comparison, site status, the Urdu mirror's progress, and
  `urduDrafted`. Both builders stay, and so does the test that holds them to each other: two
  implementations feeding one page is a stronger reason for it, not a weaker one.
- **`/coverage` and `/report` stay as routes.** They are published URLs, they are in the
  sitemap, and neither can be recalled from wherever someone has already sent them. Each is a
  `<Navigate>` to the section it was sent for — `/about#traditions` and `/about#site-status` —
  and `check-routes-prerendered.mjs` still writes a file for each, so a direct visit resolves
  on GitHub Pages before any JavaScript runs. Their prerendered files now carry
  `canonical → /about` (a new `canonicalPath` field in both prerender loops), because a
  redirect stub that declares itself canonical is a crawler telling itself there are three
  documents here. `/about` scrolls to the hash once the dataset is in — the same effect
  `TypologyPage` and `AlmanacPage` already carry, and the difference between an anchor and a
  decoration: client-side navigation keeps a hash and does nothing with it, and the section it
  names does not exist at the moment the browser would have acted on it anyway. The e2e guard
  asserts the page actually scrolled and that the named section is the one at the top, because
  a redirect that "works" by URL can still leave the reader four screens above what they
  clicked.
- **The `/ur` mirrors redirect to `/ur/about`, not through `UrPrefixNormalizer`.** Normalising
  and then redirecting is two effects racing to rewrite the same URL; `/ur/about` already does
  it properly, so the mirrors hop there in one step.

Two things found on the way, both worth keeping in mind:

1. **`src/components/archive/` is a trap this repo has already been bitten by.** The new
   components were untracked, and `importsAreTracked.test.ts` caught it — the guard written in
   August after `.gitignore`'s unanchored `archive/` silently excluded `CoverageStats.tsx`. The
   ignore rule is anchored now (`/archive/`), so this was an ordinary forgotten `git add`; the
   test catches that too, and it is the only thing that does. **A green working tree proves
   nothing about a clean clone.**
2. **`StatRow` printed U+066A ARABIC PERCENT SIGN in both languages.** Every English figure on
   `/report` read "· 8٪". Fixed while moving the component, since the merge put it on a page
   far more people read.
3. **`.about-note` had no RTL rule and `.report-note` did.** The two were identical apart from
   the Urdu treatment — `--text-base` and `--leading-urdu-ui` versus a flat `--text-sm` — which
   nobody could see while they were on different pages. Moving /report's paragraphs onto
   /about's class would have quietly thinned the Nastaliq on every one of them. `.about-note`
   now carries the rule, so there is one answer rather than two.
4. **`html { scroll-behavior: smooth }` turns every scroll measurement into a race, and a
   long page is what makes it visible.** `global.css:47` sets it deliberately — anchor jumps
   the reader *chose* should move — and `prefers-reduced-motion` turns it off. Nothing else
   did. So `window.scrollTo(0, scrollHeight)` in `tabbar.spec.ts` was animating; on a short
   page its 200 ms settle was plenty, and on a `/about` some twenty thousand pixels tall it
   started measuring a scroll still in flight and reported the footer five thousand pixels
   below the fold on a page whose footer is perfectly reachable. Two separate failures had
   this one cause. The test scrolls with `behavior: 'instant'` now — it is about layout, not
   motion — and the redirect landing does too, for a different reason worth keeping distinct:
   a reader who opened `/coverage` did not click an anchor, and animating them four screens
   down a page they have never seen is a slide through unrelated content, not an orientation
   cue. **Any new test that measures position after scrolling needs `behavior: 'instant'`.**
5. **`e2e/places.spec.ts` had been failing since `9556adf`, ten commits back.** That commit put
   the place page on the shared inset-list idiom and renamed `.place-site` to `.inset-row`; the
   spec kept the old selector, matched nothing, and asserted `count() >= 20` against an empty
   list. Nothing surfaced it, because **`npm run e2e` is not part of `npm run verify`** — the
   same gap that let `data:validate` break a deploy on 18 August and `format:check` run red for
   the repo's whole visible history. Two of the three failures in this session's first full e2e
   run had nothing to do with the merge; they were waiting. Worth deciding whether e2e joins
   verify, or whether something else makes a red suite visible between commits.

Cost, measured rather than assumed: `/about` went from 278 KB to **308 KB** of eager JS, and
the 281 KB and 279 KB that `/coverage` and `/report` each cost are gone from the budget table
entirely. `provenance.json` (170 KB) is still a dynamic `import()` inside the page — if
AboutPage's budget ever jumps by that much, that is what went static.

The contents nav is not decoration. Two dozen sections is a page you scroll past rather than
use, and its entries are a hand-written list of ids: rename a section and the link goes
quietly inert, which reads as a broken page rather than a missing anchor.
`e2e/about-merge.spec.ts` asserts every entry resolves to a section that exists, along with
both redirects.

122. **Search reaches all thirteen routes now, and the two ways it misbehaved in testing were
    both something else.** *Built 26 August 2026.* `ArchiveSearchProvider` (app shell) binds
    ⌘K and `/` everywhere except the map route, where `MapSidebar` keeps its own palette;
    `EntityPageHeader` carries the trigger button. Figures and orders come from
    `data/kg-search-index.json` (built by `build-kg.mjs`, fetched on first open), matched by
    `src/lib/search/entitySearch.ts`. Two findings for whoever tests it next:

    - **In dev, the very first palette open reloads the page.** Vite discovers `minisearch` as
      a new dependency, logs "optimized dependencies changed. reloading", and the palette
      appears to dismiss itself. One-time, dev-server-only — production bundles it. Do not
      diagnose the overlay.
    - **A page heading that mounts late was stealing the caret out of the open palette.**
      `useFocusHeadingOnMount` fires when data lands and the skeleton swaps for the article, so
      opening search in that gap lost focus mid-word — reproduced with Playwright, invisible in
      any test that waits for load. The hook now stands down while `document.activeElement` is
      inside an `aria-modal` dialog; `src/hooks/__tests__/useFocusHeadingOnMount.test.tsx`
      pins it.

### Added 26 August 2026 — the weekly sync's baseline is a dead lineage, and three enrichments are orphaned in it

The scheduled responses-sync task still describes the master sheet as 25 columns and says its
`shrines_updated*.tsv` baseline "is kept in sync". Both stopped being true on 16 August, when
production moved to the 44-column schema and the import lineage switched to `data/patch_*.csv`
files. Measured 26 August: baseline `data/shrines_updated_2026-08-09.tsv` = 167 rows × 25
columns; production sheet = 171 rows × 44 columns. The task's own stop rule ("if the two
disagree on row count, say so and stop") fired, so no `shrines_updated_2026-08-26.tsv` was
written — a full-file 25-column TSV would drop 19 columns and 4 rows if anyone imported it.
Retire the `shrines_updated` lineage or regenerate the sync task against the 44-column
snapshot. Three things fell in the gap and are documented, with the recommended patch route, in
`docs/responses_sync_2026-08-26.md`:

- **Shah Jamal, Peer Makki and Mauj Darya Bukhari were enriched from their field-survey
  responses only in the never-imported 9 August TSV.** Production carries no
  "Shrines Project field survey" citation on any of the three; every other surveyed shrine got
  its survey content via the 16 August patches. The enriched rows sit intact in
  `data/shrines_updated_2026-08-09.tsv`.
- **Mauj Darya Bukhari's replacement photos exist and are mapped, but were never fetched.**
  The 29 July response carries the photo uploads the re-shoot request asked for;
  `data/new-photos-manifest.json` has held the full slug → Drive-id mapping since 10 August;
  `public/photos/` has no `mauj-darya-bukhari/` directory. Needs a network-capable run of
  `tools/fetch_shrine_photos.py` then `tools/swap_photo_urls.py`.
- **The 14 July Shah Jamaal response claims "Book uploaded" but uploaded no book.** Its
  column 21 is empty and the Drive book folder's newest upload is 29 June. One for the next
  message to Saifullah.

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

## 11. How to resume — current as of 23 August 2026

**Everything through this date is merged and deployed.** `main` and the Pages branch `1.6`
both carry it; deploy run #20 published it. The working branch
`claude/continue-previous-work-n31xsk` was restarted from `main`, so it holds nothing
unreleased. Nothing is in flight and nothing is half-finished in the tree.

```bash
# 1. right repo (never derive this path by find — RULE 1)
ls -l ~/shrines-repo/.git && cd ~/shrines-repo

# 2. nothing unreleased? (expect empty)
git fetch origin main 1.6 && git log --oneline origin/main..HEAD

# 3. the gate that decides whether the site deploys
npm run verify          # 498 unit tests + every data gate
npm run build:e2e && npm run e2e   # 89 specs, hermetic (no network)
```

### What is waiting on a human (nothing else blocks these)

1. **Import `data/patch_schema_and_truncation.csv`** — follow
   `data/patch_schema_and_truncation.INSTRUCTIONS.md`, which is the authority: a sparse
   patch CSV cannot express "leave this cell alone". It adds the `silsila_note` column
   (the front end already renders it) and fixes the out-of-schema `category` values.
   Regenerate first if the sheet has moved: `python3 pipeline/regenerate_import_patch.py`
   — it verifies every cell it moves and exits non-zero on drift.
2. **Send `docs/message_to_saifullah_2026-08-16.md`** (refreshed 22 Aug) — re-shoots plus
   the prasad/diya vocabulary question.
3. **Two coordinate-less rows** now appear as unmapped pages; a dropped pin from the field
   would put them on the map. Never invent one (RULE 2).
4. **Parked by decision, 22 Aug:** the Zenodo DOI, the Auqaf register acquisition, and all
   oral/video media publishing (F3/F8/F9). See `docs/EDITORIAL_DECISIONS_PENDING.md` §6 for
   every ruling, verbatim.

### Added 26 August 2026 (evening, last) — the Urdu articles are missing their bibliographies

Both of these came out of scoping task A10 (put the entry's biographical section on the figure's
page). Neither is about A10 and both outlive it.

- **96 of 167 Urdu articles carry no bibliography section at all, where 166 of 167 English
  articles do.** Measured from `src/data/urdu-content.json` against the shipped snapshot, by
  `## ` heading (`کتابیات` / `حوالہ جات` / `حوالے` on the Urdu side; Bibliography / References /
  Sources / Citations / Works Cited on the English). 70 have one on both sides. This is a
  **provenance-parity gap, not a translation gap**: the 20 August ruling (i18n rule 7) says
  citations may stay Latin precisely so an Urdu reader chasing a source gets the exact search
  string — and for 96 entries the Urdu reader gets no citations at all. It sits beside "0 of 168
  Urdu articles human-read" as an Urdu-side risk, and unlike that one it is countable and
  closable per entry. **Nothing was changed**; this is a measurement.
- **The Urdu article is the English article minus its bibliography, section for section.**
  For all 32 entries with a biographical heading, dropping bibliography-aliased headings from
  both sides makes the section counts match exactly, 32 of 32 — where a naive positional match
  succeeded on only 7. That is what makes it safe for a surface to show "the Urdu version of
  *this* section" without anyone hand-authoring an English→Urdu heading map (which would be a
  translation judgement, and `localizeHeading` does not cover these headings). The pairings the
  corpus itself yields: "The Life of the Saint" → بزرگ کی زندگی (19) or ولی کی زندگی (7); "The
  Life of the Poet-Saint" → شاعر بزرگ کی زندگی (3) or شاعر ولی کی زندگی (1); "The Saint and the
  Tradition" → بزرگ اور روایت (2). Two Urdu renderings of the same English heading is exactly
  why deriving beats declaring here.
  **Any surface using this must fail closed** — if the counts do not match after dropping
  bibliographies, show nothing rather than the wrong section.

### Added 26 August 2026 (evening, later) — coordinate precision, measured

- **Twelve rows are pinned at two decimal places or coarser; two at one.** A degree of latitude
  is ~111 km, so two decimals is a ~1.1 km grid and one decimal is ~11 km. The rows:
  Gurdwara Chakki Sahib, Gurdwara Chhevin Patshahi (Jhalian), Kalat Kali Temple, Mohra Sharif,
  Rahman Baba Mausoleum, Sant Satram Dham (Raharki), Sharada Peeth, Shrine of Makhdoom Abdul
  Rahim Girhori, Shrine of Mauj Darya Bukhari, Shrine of Mian Umar Baba (Chamkani), Shrine of
  Pir Chhatal Shah Noorani, Shrine of Pir Lakha. The map draws all of them at full confidence,
  because a marker has no way to say "this pin is a kilometre wide".
- **One of them is not merely coarse, it looks wrong.** Sant Satram Dham, Raharki carries
  `28.3, 69.39`, which is **34.5 km** from Daharki town — and its own `Location` cell reads
  "Raharki (Raherki Sahib), **Daharki Taluka**, Ghotki District". Surfaced by the image-hunt
  agent noticing that a 5 km geosearch around the pin returned nothing plausible; the distance
  was then computed here rather than taken on trust. **Not corrected**: this archive does not
  invent a coordinate (RULE 2), and the honest fix is a surveyed pin or a sourced one. Recorded
  so the next person does not spend the same hour rediscovering it.
- **What this is not:** a claim that the other eleven are misplaced. Coarse and wrong are
  different things, and only Raharki was measured against its own stated locality. A per-row
  displacement audit — every pin against the city or taluka its `Location` names, using
  centroids derived from the archive's own high-precision rows rather than from general
  knowledge — is a real task and has not been done.

### Added 26 August 2026 (evening) — four measurements, two of them checks that were wrong

- **The live sheet is not ahead of the repo, and never was this session.** Fetched the
  published CSV and diffed it cell-for-cell against `data/shrines.csv`: **171 rows x 44
  columns live, 169 shared rows, every shared cell identical.** The sheet's two extra rows are
  the coordinate-less pair `build-dataset` drops by design. So "is the sheet newer?" has a
  cheap, repeatable answer — `pipeline/build_import_csv.py` plus a 30-second `curl` — and the
  answer today is no. What the sheet *is* behind on is the 21 August hygiene patch, still not
  imported after five days.
- **An internal instruction sits in the public `Location` column of four rows, not two.**
  `data/patch_data_hygiene_2026-08-21.csv` covers Darbar Abul Muali Qadri and Darbar Malik
  Ahmad Ayaz. It misses **Darbar Hazrat Shah Gohar Peer** and **Darbar Mian Qurban Ali Shah** —
  which are exactly the two rows the app drops for having no coordinates. The reason every gate
  missed them is structural and worth remembering: **`publication-safety` reads
  `src/data/shrines-fallback.json`, which is the 169-row app snapshot, so it is blind to the
  sheet rows the app discards.** Any future data gate that reads the snapshot inherits that
  blind spot. `data/patch_location_notes_2026-08-26.csv` fixes the two.
- **"A long Description with no newline means the markdown was stripped" is false.** Exactly
  one row trips it: Sant Baba Asudaram Darbar, 1,339 characters of genuine single-paragraph
  prose with no headings, no list items and no bibliography — the same entry the standing
  findings name as the one citing nothing. The signature of the real TSV corruption is a
  **line-start marker (`##`, `- `) inside a cell with no lines**, not length. This is the
  `re.I`/ARTEFACT lesson again, caught before it edited anything: the check was fixed, the
  prose was not.
- **"The surveyor's name in a public column is a leak" is false too.** That check flagged 17
  rows; 16 were correct provenance — `(surveyor: Saifullah)` inside a bibliography is a
  citation, and an archive whose distinguishing claim is provenance must name its surveyor.
  Only the imperative (`ask Saifullah ...`) and the `FLAG:` workflow marker are internal. Both
  wrong checks were written and fixed inside one session, which is the argument for writing the
  check as a script that prints what it flags rather than as a rule someone trusts.

### Added 26 August 2026 (night) — the header is not 56px, and every bundle budget was stale

Three measurements from the night's work on `docs/planning/NEXT_STEPS_2026-08-26.md`. Each was
found by a gate or a ruler, not by reading code, and each cost something before it was found.

- **`--header-height` is 56px and `.shrine-page-header` is 71px on a desktop viewport and 93px
  on a phone.** Measured with Playwright at 1280×900 and 390×844. The token has described no
  header in this app for as long as the header has existed, and nothing noticed because the
  three things that offset against it (`.contents-nav`, `.shrine-infobox`, `.entity-infobox`)
  all add `--space-4`, and **56 + 16 = 72 clears a 71px header by one pixel**. The number was
  wrong and the sum was right, on desktop, by coincidence — and all three are desktop-only
  layouts, so the coincidence held until the first sticky element on a narrow screen went in.
  `EntityPageHeader` now measures itself with a ResizeObserver and publishes
  `--page-header-height`; the token remains as the pre-paint fallback, and the three desktop
  offsets were deliberately **not** changed, because they are correct today and moving them
  would be a 15px shift on a shipped page to fix nothing. The same literal 56 was in that
  component's own IntersectionObserver `rootMargin`, so the collapsing page title swapped 15px
  late on desktop and 37px late on a phone. **If a sticky offset is ever wrong again, this is
  the first thing to check.**

- **Every one of the twelve bundle budgets was stale by 5–26 KB**, two days after the table was
  last measured, and the almanac was sitting at exactly 315/315 when the calendar view shipped.
  So `check-bundle-budget` went red for a commit that touched the order page — the failure the
  table's own header predicts, for the second time: *a per-route budget cannot express "a shared
  module grew", so the route with the least headroom takes the blame.* Re-measured and dated
  26 August. The underlying cause is worth carrying forward: **`src/lib/i18n/uiStrings.ts` grew
  44.5 → 49.7 KB of source in two days and the English strings are eager on every route by
  construction**, because English is the default language and the first paint renders them
  synchronously. That is the ~12 KB floor under all twelve numbers. The Urdu strings were split
  into their own chunk on 24 August for exactly this reason; the English ones cannot be split
  the same way, but the route-specific ones could be, and that is the standing follow-up.

- **Two hot-linked external images on `/order/qadiriyya` are dying.** One returns 403; the other
  is on `sultan-bahoo.com`, whose TLS certificate has expired (`net::ERR_CERT_DATE_INVALID`), so
  the browser refuses the image outright. Both are `imageUrl` values pointing at third-party
  hosts rather than at `public/photos/`. This was visible only as two console errors on a page
  nobody was debugging. **The archive has no liveness check on external image URLs**, and the
  51-entries-with-no-photograph finding counts a row with a dead hot-link as *having* a
  photograph. Not yet quantified across all 242 populated image fields — that sweep is a
  follow-up, and it needs the network, which this environment does have (HANDOVER §9.53 does not
  apply here).

### Added 26 August 2026 (night, later) — a strip is a claim, and two gates said so in Urdu

Building A2 (the order page's century strip) produced two failures that only ever appear in the
Urdu view, and both are worth knowing before building the next axis, table or grid.

- **`e2e/no-overflow` caught a century label 2px outside its track.** `۲۰ویں` is 40px of
  Nastaliq where `20th` is 26px, and the final century's band on a nine-century axis is 38px.
  The English view was clean and always would have been. The general shape: **any absolutely
  positioned label anchored at a percentage will overflow at the far end of its container in
  Urdu before it does in English**, and the last one is the only one with no neighbour to
  overlap into. The fix here was to anchor the final label to the end of the axis, which is
  where that century ends anyway.

- **`e2e/urdu-accessible-names` reads `title` attributes**, which is easy to forget when the
  visible text is already translated. A verbatim recorded date in a tooltip — "8 Muharram 1040
  AH / 8 August 1630 CE" — is an English accessible name on the Urdu site. It must be declared
  `data-latin`, and **the element it is declared on matters**: putting the declaration on the
  row's link would also have exempted the figure's *name* from the no-leak text walker, which is
  exactly the exemption creep that spec was written against. It went on the mark instead, which
  carries the tooltip and no text at all.

- **A `title` on an `aria-hidden` element is deliberate here, not an oversight.** The strip's
  bars are `aria-hidden` because every date behind them is printed verbatim in the member list
  directly below; the tooltip is a sighted-reader convenience over a redundant graphic.

### Added 26 August 2026 (night, A3) — the sheet's figure name is not the graph's figure identity

**86 of 169 figure slugs and 90 of 169 figure names diverge between the sheet's `principal_figure`
column and the knowledge graph's canonical entity.** Measured 26 August 2026 by slugifying the
snapshot's `principal_figure` and comparing against the `buried_at` subject for the same site.

The graph normalises parentheticals and merges variants, which is correct and which nothing on
the front end should try to reproduce:

| sheet `principal_figure` | graph slug |
|---|---|
| `Sayyid Abdul Latif Kazmi (Bari Imam)` | `bari-imam` |
| `Shiva (Mahadev)`, `Shiva (associated)` | both `shiva` |
| `Durga (Mata)` | `goddess-durga` |
| `Syed Rakhyal Shah` | `syed-rakhyal-shah-sufi-al-qadri` |
| `Khwaja Muhammad Sulaiman Taunsvi` | `khawaja-shah-muhammad-sulaiman-taunsvi` |

**Why this matters beyond A3.** `slugify(principal_figure)` is the obvious way to link a sheet row
to a figure page without paying for the 426 KB graph, and it is wrong for more than half the
archive — producing links to `/saint/` pages that do not exist, every one of them plausible
enough to survive a spot check. The correct cheap path already exists and is now used by three
surfaces: **identity from `data/kg-shrine-figures.json` (11 KB), wording from the sheet row.**
`src/lib/__tests__/placeFigures.test.ts` holds the divergence as a bounded counter-assertion, so
the shortcut cannot quietly become safe (or quietly become worse) without a test moving.

Related and worth knowing before adding any KG-derived section to a route that does not already
have one: **`src/lib/i18n/localizeKgName.ts` is a second door onto the same 426 KB** — it imports
`slugToLabel` from `../lib/kg` for one six-line pure function with no data dependency at all.
`localizeRecordedName.ts` exists as the graph-free equivalent and is what a non-graph route must
use. Moving `slugToLabel` into its own module would close the trap permanently; it is a
five-minute change with no consumer needing it today, which is why it is written down here
instead of done.

### Added 26 August 2026 (night, A6) — the e2e suite flakes under local parallel load

**A full local `npx playwright test` run fails 1–2 tests, and they are different tests each
run.** Observed four times on 26 August: `palette.spec.ts` (keyboard), `nastaliq-metrics.spec.ts`
(saint kicker), `almanac-facets.spec.ts` (`[en]` coverage), `tours.spec.ts` (resume banner). Every
one of them passes on its own, immediately, and the failure mode is `Test timeout of 30000ms
exceeded` rather than a wrong assertion.

The cause is the configuration, not the app: `playwright.config.ts` sets `workers: 1` and
`retries: 2` **only when `process.env.CI` is set**. Locally it runs `workers: undefined`
(Playwright's default, half the CPU count) with zero retries, against a preview server, usually
alongside a dev server and whatever else the session is doing.

**What this means for anyone reading a red local run:** a single failure in a full local suite is
not evidence of a regression. Re-run the named spec on its own before believing it. A failure
that reproduces in isolation is real; one that does not is this.

Two things were deliberately *not* done about it. The global timeout was not raised — that would
slow every honest failure in the suite to thirty seconds of waiting. And local retries were not
turned on, because retries hide real flakiness as readily as they hide fake flakiness. The one
targeted fix is `test.slow()` on the almanac facet round-trip, which genuinely does three cold
navigations twice over and is stating its cost rather than raising anyone else's ceiling.

### Added 27 August 2026 — every image the archive points at, checked; and two instruments that lie

`pipeline/check_image_liveness.py` is new and `pipeline/image_liveness.tsv` is its output. Until
now **nothing had ever checked that the archive's 242 image URLs still answer**, and 108 of them
point at twenty-one hosts this project does not control.

**239 alive, 3 dead** (27 August 2026):

| entry | field | status | host |
|---|---|---|---|
| Gurdwara Sacha Sauda | Image 1 | 404 | commons.wikimedia.org |
| Tomb of Qutbuddin Aibak | Image 1 | 404 | commons.wikimedia.org |
| Shrine of Sachal Sarmast | Image 1 | 403 | heritageofpakistan.org |

Two of those — Gurdwara Sacha Sauda and Shrine of Sachal Sarmast — lose their **only** image. So
**the standing "51 entries carry no photograph" is 53 by this measure**, and the general point
stands whatever the number: a row whose hot-link is dead is counted by `/about` as photographed.

#### Three instruments, and only one of them can be trusted here

This took four attempts and each wrong answer is worth more than the right one.

1. **`urllib` — 32 seconds per request.** The first version used Python's `urllib.request` and
   every request took 32s where `curl` took 0.34s, with the socket timeout not capping it
   (whatever stalls happens before the socket exists). 242 × 32s is over an hour; the script was
   discovered by hanging. The transport is `curl` now.

2. **Concurrency invented 55 dead images.** Eight workers against Wikimedia produced **55 of 65
   URLs reported dead, every one of them a 429, every one of them fine.** Writing that into a
   standing finding would have been this file's own cautionary tale happening again. The script
   now retries 429/503 with backoff, runs two workers by default, and has a **third verdict** —
   `unknown` — so a rate-limit, a timeout or a 5xx can never be counted as a loss. After that:
   63 alive, 2 dead, 0 unknown, from the same 65.

3. **A browser pass is not a valid instrument from inside a proxied sandbox.** Loading all 242
   in Chromium reported **80 failures** — `ERR_BLOCKED_BY_ORB` on upload.wikimedia.org,
   unfollowed 302s on commons.wikimedia.org. It is wrong: the same URLs return `206 image/jpeg`
   over curl seconds later, the failures cluster on exactly the two highest-volume hosts, and on
   `/shrine/shrine-of-mian-mir` **the same URL rendered once and failed once on the same page**.
   That is throttling in the egress path. It also first ran under `page.setContent`, which gives
   a null origin and changes cross-origin image handling — a check looking at the wrong universe,
   caught only because Wikimedia photographs were visibly rendering on the order pages minutes
   earlier. **In principle the browser is the right instrument** (real certificate validation,
   real referrer, and it is what a reader uses); run it from an ordinary network.

4. **And curl here is blind to certificates.** Chromium refused `sultan-bahoo.com` with
   `net::ERR_CERT_DATE_INVALID` on 26 August. `openssl s_client` returned a certificate expired
   **24 June 2026** on one connection and one valid to **28 September 2026** on the next. curl
   through this environment reports `206 image/jpeg` with `ssl_verify_result=0`. The host serves
   inconsistent TLS across edges and the egress path hides it, so that image is recorded alive
   and is at least intermittently broken for readers. **Not counted among the three**, because a
   number in a finding has to be one somebody can reproduce.

The script exits 0 whatever it finds, deliberately: making it a gate would tie `npm run verify`
to twenty-one third-party hosts and to the network.

### Added 27 August 2026 — the dark theme failed contrast on every route, and the sweep never looked

`e2e/a11y.spec.ts` scans every route in both languages, has been green for weeks, and CLAUDE.md
cited it as the reason accessibility is not a worry here. **It had only ever run in one theme.**
The first dark run found **63 serious contrast failures across every route in the archive**,
from three causes that had all been present since dark mode shipped.

This is the ninth instance of the pattern this section exists to catalogue — a check looking at
the wrong universe (§9.29, §9.38, §9.39, §9.40, §9.46, §9.51, §9.54, the `a` exemption in
`urdu-no-leak`) — and the most expensive so far in reader-facing terms, because it was every
page rather than one.

1. **A literal `white` on a ground that flips.** Twelve rules pair `background:
   var(--color-primary)` with `color: white`. The token is `#2a4d9b` in light and `#8aa8e8` in
   dark — a dark cobalt and a light one, because a chip has to stand off a cream page and off a
   brown one. 7.97:1 became **2.37:1** on the language toggle, the map's filter chips, the
   explorer's order chips, scroll-to-top, the 404 action and the tour's next button.

2. **Sixteen anchors with no `color` rule at all**, inheriting the user agent's `#0000ee` —
   roughly 8:1 on cream, **1.96:1** on the dark ground. The almanac's cards, `/about`'s contact
   and licence lines, the nearby-mosque list. There is now an `a { color: var(--color-primary) }`
   floor in `global.css` at specificity 0,0,1.

3. **White on `--color-accent`, failing in *both* themes** — 2.98:1 and 2.09:1 — on the two
   search count badges. The accent is a light gold in both (#c8890a / #e8a82a), so a foreground
   that flips with the theme is wrong in one of them. `--color-on-accent` is declared once in
   `:root` and deliberately never overridden.

#### What to do with this, next time

**The token, not the rule.** All twelve of (1) were reaching for "the colour that reads on the
primary ground", which is what `--color-text-inverse` already was. A theme-flipping ground with a
hardcoded foreground is a bug by construction, whatever the current hexes are — so
`src/styles/__tests__/themeFlippingGrounds.test.ts` checks the *pairing* rather than recomputing
contrast, in milliseconds rather than the five minutes an axe run costs.

Two traps in writing that check, both hit first:

- **`--color-primary: var(--color-kashi-cobalt)` is the identical declaration in both blocks.**
  Only the cobalt underneath differs. A comparison of declarations concludes the token does not
  flip, which is the opposite of the truth — the resolver has to follow the indirection.
- **A token the dark block does not redeclare inherits `:root`.** Absent is not undefined, and
  treating it as undefined makes "is it the same in both themes?" unanswerable for exactly the
  tokens that are.

The a11y suite now carries a dark matrix over nine routes. Nine rather than one, because two of
the three causes are in shared chrome and would have passed on whichever single page was picked.

### Added 27 August 2026 — A4, the field audit: three things the graph knows and no page says

Task A4 of `docs/planning/NEXT_STEPS_2026-08-26.md`, re-run after A2, A3 and A10. For every
property on `KGSaint`, `KGOrder`, `KGPlace`, the event nodes and every relation type: which page
renders it, and does every surface that shows it show its provenance marking.

**Method, and its limits.** A grep for each property name across `src/`, then hand-verification of
every "nothing renders this" — because the grep is wrong in both directions. It called
`datePrecision`, `biographyReviewed` and `biographySource` unrendered; all three are read by a
`lib/data/` helper (`figurePrecision.ts`, `figureProvenance.ts`) whose *caller* is the page, so
the property name never appears in a component. And it called `buried_at`, `located_in` and
`commemorated_by` unrendered for the same reason. **A property-name grep answers "is this string
in a component", which is not the question.** Anyone re-running this must check every hit by hand;
the value is in the shortlist, not the table.

#### The three real gaps

**1. `KGEvent.eventType` is on all 149 events, splits 77 `urs` / 72 `observance`, and reaches no
surface at all.** This is the substantive one. The 72 are Maha Shivratri, Diwali, Cheti Chand,
Guru Nanak Gurpurab, Vaisakhi, daily prakash, "Hinglaj Yatra halt", "Community worship" — which is
to say **the entire non-Muslim half of the archive's calendar is presented under the heading "The
Urs Almanac" with nothing marking that it is not an ʿurs.** An ʿurs is a death anniversary kept as
a festival of union; Diwali is not one, and the archive's own data says so on every row. This is
not a display nicety in an archive whose stated subject is six traditions. Escalated to the plan
as **A12** rather than fixed here, because it touches four listing surfaces, the page's name, and
an editorial decision about what a non-ʿurs day should be called in each language.

**2. `KGEvent.saintSlug` is a second copy of the `commemorated_by` edge, and nothing reads it.**
Present on 149 of 149, and it agrees with the relation on all 149 — measured, no disagreements.
Every consumer goes through the relation. Harmless today and a hazard tomorrow: two
representations of one fact, only one of which any code would notice going wrong.

**3. The knowledge graph's place layer is dead.** `kg.places` holds **94** place nodes and
`located_in` holds 169 edges. `getPlaceBySlug` and `getPlaceForShrine` are exported from
`src/lib/kg.ts` and called by **nothing outside it**. `/place/:slug` uses a different vocabulary
entirely — `src/lib/data/places.ts`, hand-curated, **69 entries**. So the archive maintains two
place vocabularies of different sizes, publishes the graph's one through the JSON-LD and RDF
exports, and shows the other on its own pages. A reader comparing the export with the site would
find different place sets. Nothing here is wrong; nothing has decided which is canonical either.

#### The parity half, which came out clean

Only three relation types carry a `reviewed` flag at all — `belongs_to_order` (44 of 64
unreviewed), `disciple_of` (55 of 60), `successor_of` (25 of 26), all `method:
machine-extracted`. `buried_at`, `located_in` and `commemorated_by` are `method: rule` on every
edge and carry no flag. Every surface that renders one of the three marked types shows the
marking — the order page's member list and its ʿurs list, the figure page's lineage and
memberships, `LineageView`, `LineageChainView`, `/review`. And the surfaces added since the last
audit correctly show *no* marking on the rule-derived edges (A3's place figures, A9's and A3's
observance lists), because inventing a doubt is as wrong as hiding one.

`KGEvent.date` also stays deliberately unread — `recordedObservances.ts` documents why: it is a
bare month on 16 of 149 nodes, so a page using it would show a date for a sixth of the rows it can
actually date and look complete.

### Added 27 August 2026 — B4: Lighthouse ran, and the entity pages jump a page and a half

`.lighthouserc.cjs` carries a note saying lhci could not be run in the environment where its URL
list was last extended. **It runs here.** Ten routes, `numberOfRuns: 1`, local preview, default
mobile throttling (4× CPU, slow 4G), on a laptop also running a dev server — so treat the absolute
timings as pessimistic and the *ordering* and the CLS as real.

| route | perf | a11y | best-pr. | seo | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | **28** | 100 | 75 | 91 | 4777 | 6735 | **4306** | 0.037 |
| `/?lang=ur` | 37 | 100 | 75 | 91 | 3087 | **15072** | 1281 | 0.006 |
| `/saint/data-ganj-bakhsh` | 37 | 100 | 79 | 92 | 2355 | 6466 | 642 | **0.520** |
| `/shrine/data-darbar` | 47 | 100 | 79 | 92 | 2937 | 7842 | 823 | 0.118 |
| `/almanac` | 51 | 100 | 100 | 91 | 2710 | 3160 | 649 | **0.539** |
| `/place/lahore` | 56 | 100 | 100 | 92 | 1979 | 6385 | 656 | 0.105 |
| `/order/qadiriyya` | 66 | 100 | 79 | 92 | 2284 | 3611 | 436 | **0.219** |
| `/about` | 72 | 100 | 100 | 91 | 2709 | 3159 | 674 | 0.021 |
| `/coverage` | 74 | 100 | 100 | 91 | 1893 | 3160 | 719 | 0.021 |
| `/graph` | **90** | 100 | 100 | 91 | 2128 | 3308 | 35 | 0.013 |

**Accessibility is 100 on all ten.** No `error`-level assertion failed, so this would pass CI.
Everything below is a `warn`, which is why none of it has ever been looked at.

#### The one that is a defect rather than a number: CLS

`/saint` 0.52, `/almanac` 0.54, `/order` 0.22, against a 0.1 budget. Lighthouse names the shifting
element as `.entity-article-layout` — the whole article body — and reports **zero unsized images**,
so it is not the usual cause.

Measured directly, unthrottled, on a warm preview, at 390px:

    article height over 5s: 2239 → 2163 → 2163 → 2163 → 2163 → 3618 → 3618 …
    observed CLS: 0.5687

**The page renders its full layout from the bundled knowledge graph, and then grows 1,455px when
the shrine dataset arrives from the CSV.** Every section that needs shrine data — "Where this
figure rests", the observances, the associated-shrine cards, and A10's biography — appears about
two seconds in. On a phone that is a page and a half moving under the reader's thumb while they
are reading the first paragraph.

This is inherent to the runtime-CSV architecture rather than to any one page, and the fix is a
loading-strategy decision with a real trade in it — reserve space, render a skeleton, or hold the
article back and show a blank for two seconds. That is the project head's call, so it is escalated
as **A14** rather than chosen here.

#### The rest, for whoever picks it up

- **The map's TBT is 4,306ms** against a 300ms budget, and its performance score is 28. It is the
  archive's front door. Diagnosed rather than left as a number:

  | script | bootup | longest task | unused bytes |
  |---|---|---|---|
  | `vendor-maplibre` | **8,484ms** | **5,447ms** | 169,678 |
  | `vendor-papa` | 730ms | 729ms | — |
  | `vendor-react` | 510ms | 702ms | — |
  | `vendor-leaflet` | 89ms | — | 28,882 |

  **`maplibre-gl` is 88% of it, and it is already lazy.** `ShrineMap` loads it through
  `React.lazy`, deliberately, and `check-bundle-budget`'s `MUST_STAY_LAZY` keeps it there. The
  lesson is that **the split moved it off the first paint and not off the main thread**: a lazy
  chunk still evaluates, and on the map route it evaluates immediately, because the map mounts
  immediately. The eager-bytes budget cannot see this by construction — it measures the static
  import graph — so a route can pass every budget in the repository and still spend four seconds
  blocked. Whether the archive wants a 1 MB vector basemap at all is a product question (the
  keyless CARTO raster fallback already exists and is what `ThemeAwareTileLayer` falls back to);
  it is not an engineering one, so it is not decided here.

  **`vendor-papa` at 730ms is the second-largest and is a different kind of problem** — that is
  not evaluation, it is papaparse *running*, parsing the ~1 MB sheet CSV on the main thread. There
  is already a worker in this codebase (`src/lib/search/search.worker.ts`) and no reason the parse
  could not join it.
- **`/?lang=ur` has an LCP of 15 seconds, and 14.6s of it is render delay.** The LCP element is a
  sidebar *button*, and TTFB is 454ms — so this is not a heavy image and not the network. It is
  the main thread.

  **One hypothesis was tested and was wrong, which is worth more than the change it produced.**
  `fetchShrines` awaited the 1 MB Urdu article payload, then the Urdu dictionary, and only then
  started the CSV download — a real round trip to Google, queued behind a megabyte of JSON. That
  serialisation was real and is now gone (`cbba48e`, all three start together, the build still
  waits for all three). **It did not move the LCP**: re-measured over two runs, 15,349ms and
  15,343ms, render delay 14,894ms and 14,890ms — indistinguishable from the 15,072ms before it.
  TBT did fall, 1,281ms → ~900ms, which is within what two runs can tell apart.

  So the Urdu front door is **script-evaluation-bound, not fetch-bound**, and the fetch ordering
  was never the thing in front of it. The remaining candidates are the two in the table above:
  `maplibre-gl` at 8,484ms of evaluation, and papaparse at 730ms parsing the CSV on the main
  thread. The change was still correct — an avoidable serialisation on the archive's front door is
  worth removing whether or not it shows up in one metric — but anyone continuing this should
  start from maplibre and not from the data hook.
- **Best practices is 75 on `/` and 79 on the three entity routes**, 100 on the other four. Not
  investigated.
- The upload target has to be overridden to run locally:
  `npx lhci autorun --upload.target=filesystem --upload.outputDir=<dir>`. The configured
  `temporary-public-storage` wants a network round trip to lhci's servers.

### Added 27 August 2026 — the Urdu edition had no citations on 98 entries, and now does

The 26 August finding ("96 of 167 Urdu articles carry no bibliography") was right and understated
what it meant on the page. Re-measured 27 August against the shipped snapshot: **98 of 169 entries
carry a bibliography in English and none in Urdu.** 70 carry both. One carries neither, and it is
the entry that cites nothing in any language.

What an Urdu reader actually got was worse than "no citations". The English article carries the
bibliography, and the Urdu content **replaces** it — so on those 98 entries the citations render,
and then vanish about two seconds later when the 1 MB Urdu chunk lands. Measured on
`/shrine/bari-imam?lang=ur`: 2 citations at t=1.5s, 0 from t=3s onward.

**Closed by falling back to the English bibliography**, which is not a workaround: i18n rule 7 (20
August 2026) permits a Latin bibliography *precisely so* an Urdu reader chasing a source gets the
exact search string, because a citation is a search string and not a sentence. The fallback is
narrow on purpose — only the bibliography, only when the Urdu side has none, only from the
Description the entry already carries. No other section falls back, because every other section is
prose, and untranslated prose is what rule 7 forbids in the same breath.

Two things worth carrying forward:

- **`data-latin` per line, on the evidence.** Data Darbar's citations are genuinely Urdu.
  Declaring every citation line would claim a leak that is not there and inflate the budget that
  counts the real ones.
- **`urdu-no-leak` was testing the one shrine that could not show this.** Its single shrine route
  was Data Darbar, which is one of the 70 whose Urdu article has its own bibliography — so the
  behaviour of the other 98 was invisible to the guard. A second route
  (`shrine:urdu-bibliography-fallback`, Bari Imam) is in the matrix now. **When a guard samples one
  member of a set, check which member**: this is the same shape as the `a` exemption that hid 328
  leaks on the map route, and as the light-only a11y sweep found the same night.

### Added 27 August 2026 — the wider Urdu sweep: 7 of 23 routes leaking, and the snapshot has drifted

Tonight produced the same finding three times — the a11y sweep ran in one theme, the no-leak guard
tested the one shrine that could not exhibit the bibliography gap, and Lighthouse measured two
routes of thirteen until someone widened it. So the walker was pointed at **23 Urdu routes instead
of its usual 14**: one shrine of each of the six categories, the longest name in the archive, three
entries with no photograph, a lineage-only figure, a figure with disputed dates, a deity, the
smallest order, a one-site place, and every route the matrix skips.

**7 of the 23 carried undeclared English.** Three were code and are fixed (`04e0c19`); the other
four are the interesting ones.

#### Two shrines render an entirely English page to an Urdu reader

`Darbar Abul Muali Qadri` (98 undeclared runs) and `Darbar Malik Ahmad Ayaz` (52). They have **no
Urdu article at all** — 168 entries in `src/data/urdu-content.json` against 169 in the snapshot,
and these are the ones missing. Everything falls back: the headings, the prose, the table of
contents. This is content work, not engineering; it is recorded here because "0 of 168 Urdu
articles human-read" is the known Urdu risk and *this* is a different one — two entries where
there is nothing to read.

**The silence is fixed even though the content is not** (`904bd2c`). The page now says the Urdu
text has not been written, above the English article it falls back to, and `ShrineArticle`
declares that article. **What is still undeclared on such a page**, and what has to be done before
the route can join the no-leak matrix:

| component | what leaks |
|---|---|
| `ContentsNav` | the table of contents — seven English headings |
| `.shrine-category-kicker` | the recorded `category`, see below |
| `.shrine-summary-meta-item` | the recorded Location, a paragraph of English survey note |
| the infobox | `site_type_note`, the silsila note, and four recorded Hijri dates |

The category one is a **data bug, not a display bug**: `Darbar Abul Muali Qadri`'s `category` is
`"Islam"`, which is not one of the schema's six values, so `CATEGORY_LABELS` has no entry and it
renders untranslated in both the kicker and the breadcrumb. It is the only off-schema category
value in the snapshot, and one further row has an empty `category` and falls back to the legacy
`Category` column. Fix the sheet rather than the dictionary.

There is also a third piece of evidence that the data build is overdue:
**`src/data/urdu-content.json` contains an article for `darbar-hazrat-shah-gohar-peer`, a slug the
snapshot does not have.** The Urdu work is running ahead of the snapshot in one direction while
the sheet runs ahead of it in the other.

#### The committed snapshot has drifted from the live sheet, and no gate can see it

**The live sheet has 171 rows; `src/data/shrines-fallback.json` has 169.** The two extra are
`Darbar Hazrat Shah Gohar Peer` and `Darbar Mian Qurban Ali Shah`, and their names render in Latin
for an Urdu reader — because `src/data/urdu-seed.json`, the name dictionary, is **generated from
the snapshot**, so a row the snapshot does not have gets no Urdu name.

The structural point is worth more than the two names:

> **Every gate in this repository runs against the committed snapshot. The live site runs against
> the sheet. Anything added to the sheet since the last `npm run data:build` is invisible to all of
> them** — the e2e fixture is generated from the snapshot, the Urdu dictionary is generated from
> the snapshot, the coverage figures on `/about` are computed from it, and `data:validate` reads
> it.

That is not a bug in any check; it is the shape of the whole gate system, and it follows directly
from RULE 3 (the sheet is production, and it deploys with no review step).

**`npm run data:build` is due — and it is not a one-liner, which is why it was not run here.**
Rebuilding the snapshot pulls the two rows in, and both of them have **no Urdu article and no
dictionary entry for their names**. So the rebuild on its own turns the no-leak guard red on
whichever routes those two rows reach, and the only ways to make it green again are to raise a
budget (recording untranslated content as accepted debt, which is the wrong direction) or to
translate them. **The data build and the Urdu content for those two entries have to land
together.** Order: `npm run data:build`, then the two Urdu articles and the two name entries, then
`npm run data:build:urdu`, then re-measure every budget in `e2e/urdu-no-leak.spec.ts` — several
will move, because the fixture the guard runs against is regenerated from the snapshot too.

#### And one negative result worth keeping

The same wider sweep was run for **overflow** — 27 routes at 390px in Urdu, the harshest
combination — and found **zero**. `e2e/no-overflow.spec.ts`'s eight-route sample is, empirically,
representative today. Recorded because the absence is the answer: that guard does not need
widening, and the next person wondering can read this instead of running it again.

### Added 27 August 2026 — A14 measured properly: 81% of the jump is one section, and the shift attribution lied

**The instrument now exists as a file.** `scripts/measure-cls.mjs`. The five-second height trace
quoted in the B4 note above was taken in a scratch script that was never committed, so the number
survived in this document with nothing able to reproduce it — the exact failure RULE 0 is about.
The committed script reproduces it to four decimal places on the first run: **CLS 0.5687 on
`/saint/data-ganj-bakhsh`, article 2163 → 3618px**, identical to what was recorded. That is the
instrument validated against a known answer before anything was concluded from it.

#### The `layout-shift` entry's own attribution is misleading on this app — do not diagnose from it

Chromium hands each shift entry a `sources` array with `previousRect`/`currentRect` per node. On
`/saint` it reported, for the 0.5246 entry at 1652ms:

    div.entity-article-layout  moved  +31px, grew  -31px
    section.kg-section         moved -533px, grew -275px
    section.kg-section         moved -840px, grew   -4px

Read literally: sections moved **up** by 533 and 840 pixels and got **shorter**. The truth is the
opposite — sections were inserted and everything below them moved **down** by 1,486px. Whatever
those rect pairs describe, it is not the net movement, and a fix chosen from them would have been
aimed at the wrong end of the page. `--sections`, which diffs every sectioning element's heading,
top and height between timestamps, is the instrument that gives the right answer, and it is in the
same script. **Diagnose with `--sections`; use the default mode for the score.**

#### What actually appears, by name and by size

`node scripts/measure-cls.mjs --sections --route /saint/data-ganj-bakhsh`, 390×844, dev server:

| at | what | height | position |
|---|---|---|---|
| 1400→1900ms | `Where this figure rests` appears | 194px | top 564px — **in the first viewport** |
| 1400→1900ms | `The life, from the entry` appears | **1,186px** | top 790px — **in the first viewport** |
| " | `Also known as` pushed down | — | +31px, was visible |
| " | `Days kept for this figure` pushed down | — | **+1,475px**, was visible |
| " | `Associated shrines` pushed down | — | +1,486px, was visible |
| " | lineage, gaps, sources, network, infobox, footer | — | +1,486px, all below the fold |

So **A10's biography section is 1,186px of the 1,455px — 81% of the whole defect** — and it lands
directly under the reader's thumb at 790px in an 844px viewport.

**That single number rules out the skeleton, which was option 2 of the three the B4 note escalated.**
A skeleton has to be shown before it is known whether content is coming, and **only 48 of 169
entries carry a biography at all**: on the other 121 figures a 1,186px skeleton would resolve to
nothing and shift the page by the same amount in the opposite direction. Same objection kills
reserve-space, harder — the reserve would be a guess between 0px and 1,186px, wrong either way for
most figures.

#### A second, smaller shift nobody had noticed, at 400→900ms

The article *shrinks* 76px — `Spiritual Lineage` −29px, `What the archive does not record` −22px,
`Sources & Provenance` −24px — and everything below moves up. Three text blocks re-wrapping to
fewer lines is a font metric settle, not data. It is the 0.0441 entry, and it is a separate defect
from the 0.5246 one: no loading strategy fixes it, and `font-display` plus metric overrides would.
Recorded because it will still be there after A14 is closed and would otherwise read as a
regression.

#### `/place` and `/shrine` are over budget for a completely different reason

Both were in the B4 table at 0.105 and 0.118 and were read as the same defect. They are not.

    /place/lahore   400ms → 1400ms: page is 844px — the viewport — and holds nothing but
                    a one-line "Loading…" and the footer at top 232px.
                    1400 → 1900ms: four sections appear (168, 2253, 5851, 3132px) and the
                    footer moves from 232px to 12,381px.

Nothing is inserted *between* visible sections here, because there are no visible sections. **The
only visible element that moves is the footer**, and it moves because an empty page is shorter than
the viewport. That makes it the one part of A14 with no trade in it at all: reserving viewport
height while loading is not a guess about content, it is a statement that the footer must not be
the first thing a reader sees. `/shrine/data-darbar` is the same shape — nothing until 2.6s, the
`SkeletonPage` is ~400px against an 844px viewport — plus a second ~239px shift near 3s from an
`aside` that is timing-dependent and not yet pinned down.

#### One caveat on the dev server as an instrument

`/order/qadiriyya` measures **0.0002** here against Lighthouse's **0.219**. Both are honest: the
order page is already 9,503px tall at first paint, so its insertion happens far below the fold, and
whether that stays below the fold depends on the 4× CPU throttle Lighthouse applies and this script
does not. **Do not quote the dev number for `/order`.** For `/saint`, `/almanac` and `/place` the
two instruments agree to within 0.02 and dev is the faster loop.

### Added 27 August 2026 — A14 closed: every route inside the CLS budget, and no photograph cropped

| route | before | after | what it was |
|---|---|---|---|
| `/saint/data-ganj-bakhsh` | **0.5687** | **0.0704** | two data-dependent sections inserted at y=564 and y=790 |
| `/almanac` | **0.5208** | **0.0211** | the calendar arrived above the coverage tiles and pushed them 2,443px |
| `/order/qadiriyya` | 0.0196 | 0.0235 | (unchanged; see the dev-instrument caveat below) |
| `/shrine/data-darbar` | **0.1115** | **0** | the hero had no reserved box |
| `/place/lahore` | **0.1048** | **0.0004** | the footer was the only thing on screen, then moved 12,149px |

Reproduce any of it with `node scripts/measure-cls.mjs --runs 3`, and diagnose with
`--sections`. `--check` is the invariant for the `/place` half.

**A14 was escalated as a choice between three options and none of them was taken**, because
taking the diagnosis down to the level of *which section* changed what was possible:

- *Reserve space* and *render a skeleton* both require knowing that content is coming before it
  arrives, and **only 48 of 169 entries carry a biography** — on the other 121 either one
  resolves to nothing and shifts the page by as much again in the other direction.
- *Hold the article back* trades a jump for two seconds of blank on the archive's slowest route,
  and on `/place` it is measurably *worse*: an empty page is shorter than the viewport, which is
  what put the footer on screen in the first place.

What was done instead, per route:

1. **`/place`** — the loading branch reserves a viewport (`page-loading-reserve` in
   components.css). This is not a guess about the content that is coming; it is a statement that
   the footer must not be the first thing a reader sees. The footer is rendered *inside* each
   page's article, which is why `.entity-page-wrapper`'s existing `min-height: 100svh` never
   protected it.
2. **`/saint`** — the two sections that wait for the sheet moved below the lineage, from y=564
   and y=790 to y=1488 and y=1714. They now arrive below the fold and move nothing visible. This
   is a reading-order change and is argued as one in the code: the entry's account of a life is
   an attributed quotation from another page, so it sits beside Sources rather than above the
   silsila. Reverting is safe and costs 0.57.
3. **`/almanac`** — the calendar's slot is held open. Both of the page's existing decisions were
   right (the calendar opens the page; the coverage tiles and the caveat are true of the archive
   rather than of the fetch) and together they produced the defect.
4. **`/shrine`** — each photograph reserves its own box from its measured dimensions.

#### The measurement that stopped a one-line fix

`.shrine-hero-img` could have taken a single CSS `aspect-ratio` and been done in a line. I wrote
it as 3:2, because Data Darbar's hero is 1280×857 and 3:2 reproduced its box to within a pixel.
The second entry looked at by hand was Allo Mahar: **1024×1280, portrait.**

`pipeline/measure_image_shapes.py` then measured all of them — 239 of 242 decoded:

    4:3 is both the median and the mode      126 of 239
    portrait (ratio < 1.00)                   31, one image in eight
    p10 0.750    median 1.333    p90 1.779

**16 of the 115 measurable heroes are portrait**, so any single landscape box crops one entry in
seven to a band. So the box is per-image instead, keyed by a 7-character hash of the URL — see
`src/lib/images/imageShapeKey.ts` for why a hash and not the URL (32 KB eager on every route)
and why not the slug (a shape must stop applying when the sheet changes that field).

Cross-validation worth keeping: the 3 images that script cannot decode are **exactly** the 3
that `check_image_liveness.py` found dead on the same day by a different method.

#### Four instrument failures from one night, all of them recorded in the scripts

1. **The `layout-shift` entry's own `sources` rects are misleading on this app.** On `/saint`
   they reported two sections moving *up* by 533px and 840px and getting shorter. The truth is
   that two sections were inserted and everything below moved *down* by 1,486px. A fix chosen
   from those rects would have been aimed at the wrong end of the page. Use `--sections`.
2. **Wikimedia answers a User-Agent-less request with 429, not 403.** The first shape run
   reported 68 of 118 heroes undecodable, every one on commons.wikimedia.org, while
   `check_image_liveness.py` had just found 84 Wikimedia URLs alive. A 2,253-byte `text/html`
   body is the tell. **And the rate limit outlived the run that earned it** — a correct second
   pass still got 429 on all 67 — hence backoff, three workers and `--resume`.
3. **A 64 KB range is not enough for Pillow, and the error does not say "too small".** A JPEG
   with a large EXIF block raises `OSError: Truncated File Read` from the APP handler even though
   the SOF header carrying the dimensions arrived in the first few hundred bytes.
   `ImageFile.Parser` reads a header without demanding the rest of the file.
4. **A check a comment can satisfy is not checking the code.** The first version of the
   duplicate-footer count read 2 on the *fixed* file, because the comment explaining the fix
   contains the string it was matching on. It strips comments now.

#### Two defects found while measuring, unrelated to CLS

- **Every shrine page has been shipping the site footer twice** since 24 August — the whole
  footer nav, 142px apart, on 169 pages. `a1f2585` added a footer to the ten pages that had none
  and appended a bare `<SiteFooter />` beside the one page that already had a customised one.
  `siteFooter.test.ts`'s three assertions all ask "does this page have a footer", and every one
  of them passes on a page that has two: **missing and duplicated are opposite failures of the
  same feature, and only one was being tested.**
- **`img { height: auto }` did not exist**, and there is no base `img` reset in this codebase at
  all. It matters the moment an image carries `width`/`height`: those map to presentational
  hints, which lose to any author rule but *beat* `aspect-ratio`, so `.related-card-img` — which
  shapes itself 16/9 and sets no height — rendered 356×899 and eight of them added 7,192px to a
  shrine page.

#### What is left on these routes, and why it was not chased

- `/saint`'s remaining 0.0704 is **0.0441 of font settle** — three text blocks re-wrapping when
  Merriweather swaps in at ~800ms, with everything below moving up 76px — plus 0.0263 from the
  header's meta row gaining a "next ʿurs" line. The font half is under budget on its own and
  needs fallback metric overrides (`size-adjust`, `ascent-override`) measured per family, not a
  guess. **It will still be there after A14 and is not a regression.**
- **`/order` is the one route where the dev server is not a valid instrument.** It measures
  0.0002–0.0274 here against Lighthouse's 0.219, and both are honest: the order page is already
  9,503px tall at first paint, so whether its insertion stays below the fold depends on the 4×
  CPU throttle Lighthouse applies and this script does not. Do not quote the dev number for it.
- The `aside` shift on `/shrine` at ~3s was the hero and is gone. Nothing else on that page moves.

### Added 27 August 2026 — every remaining layout shift in the archive is the same one, and it is a font

With A14 closed, all fifteen routes measured are inside the 0.1 CLS budget. What is left is not
fifteen small problems; it is **one cause, appearing on almost every route at the same moment.**

    /saint/data-ganj-bakhsh   0.0441 @796ms    three prose blocks re-wrap, everything below moves up 76px
    /                         0.0370 @841ms    the Leaflet attribution control
    /graph                    0.0368 @786ms    filter chips resize
    /almanac                  0.0211 @761ms    the intro paragraph re-wraps
    /order/chishtiyya         0.0195 @765ms    the header meta row
    /review?team=1            0.0042 @822ms    verdict labels

Six routes, six different elements, all between **760ms and 841ms**, and every one of them is
text changing the number of lines it occupies. That is the webfont swap: `index.html` loads
Merriweather, Source Sans 3 and Noto Naskh Arabic from Google Fonts with `display=swap`, so every
page renders in a fallback face and then re-flows when the real one lands. No loading strategy for
the *data* touches it, which is why it survived A14 unchanged, and it is the reason `/saint` is
0.0704 rather than 0.0263.

**Two fixes, and the cheap one is a trap.**

*Fallback metric overrides* (`size-adjust`, `ascent-override`) are the usual answer and cannot be
done honestly here: the override has to be tuned against a specific fallback face, and
`--font-serif` falls back to Georgia while `--font-sans` falls back to `system-ui`. Georgia is
absent on Linux and Android, and `system-ui` is a different font with different metrics on every
platform. Numbers measured on this laptop would be wrong for a reader in Lahore on Android, and
wrong in a way nothing here would catch.

*Self-hosting the Latin faces* is the real fix and the project has already made the argument:
Noto Nastaliq Urdu is self-hosted in `public/fonts/` with its OFL, and the comment says why — "it's
the primary reading face for the whole Urdu experience, so it doesn't depend on a third-party CDN
being reachable." That reasoning does not stop at Nastaliq. Self-hosted and preloaded, the faces
arrive before first paint and there is no swap to shift; it also removes two DNS/TLS handshakes and
a render-blocking stylesheet from in front of **the Urdu route's 15.1s LCP**, which is
render-blocked rather than fetch-blocked and is the worst number in the archive.

**Do it with a script that copies Google's own CSS rather than by hand.** The `unicode-range`
declarations must be preserved verbatim: this archive's prose carries ʿ, ā, ī and similar marks,
some of which fall outside Google's `latin` and `latin-ext` subsets, and a hand-written
`@font-face` that drops a subset renders tofu in exactly the transliterations the archive is
careful about. Copy the blocks, download the woff2 each one points at, rewrite only the `src`.

**And measure it against a production build, not the dev server.** This is the boundary of what
`scripts/measure-cls.mjs` can honestly answer. In dev the fonts would be served from disk in a few
milliseconds and CLS would read 0 whatever the strategy — a green number that says nothing about a
reader on 4G. Throttling dev does not rescue it either: dev ships hundreds of unbundled modules, so
a throttled dev run measures the module waterfall. The same boundary is why `/order`'s dev CLS
(0.0196) disagrees with Lighthouse's (0.219), and why the map's TBT work cannot start here:
`vendor-maplibre` is 8,484ms of *script evaluation*, and dev neither bundles nor minifies it.

### Added 27 August 2026 — the Nastaliq preload gate saves nothing, because the service worker fetches all three anyway

Found while preparing the font self-hosting the previous note recommends. **Verified against
`dist/sw.js` from a real build, not inferred.**

`index.html` preloads Noto Nastaliq Urdu only for readers who will actually see it, and says why:
doing it unconditionally *"would cost every English-first visitor ~154KB they don't need."* The
400 weight was gated on that reasoning after the 700 already had been.

`vite.config.ts` then precaches `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`, and the
manifest in the built service worker contains:

    "fonts/NotoNastaliqUrdu-700.woff2"
    "fonts/NotoNastaliqUrdu-600.woff2"
    "fonts/NotoNastaliqUrdu-400.woff2"

All three, 476 KB, for every visitor — 11% of the 4,269 KB precache. **The gate controls
first-paint priority and does not save a single byte.** Two optimisations in the same build, one
quietly undoing the other's stated purpose, and the comment explaining the intent is what makes it
look done.

This is not an argument for removing the precache: the PWA is why the archive works offline at
all, and a font that is not precached means an offline reader gets a fallback face. It is an
argument that **the byte cost is unconditional and nobody chose it**, which is a different
statement from the one in `index.html`.

#### It also blocks the font self-hosting, and that is why the migration is staged

`pipeline/fetch_google_fonts.py` is committed and does the laborious half: it reads the Google
Fonts URL out of `index.html` (asserting the three tags agree), downloads all **53 `@font-face`
blocks** across Merriweather, Source Sans 3 and Noto Naskh Arabic, and writes
`src/styles/fonts.css` with every block copied verbatim and only `src` rewritten — so
`unicode-range` coverage is identical *by construction* rather than by review. It refuses to write
if any block lacks a `unicode-range`, and refuses any download whose first four bytes are not
`wOF2`, because a rate-limit page is also a 200 with bytes in it and writes to a `.woff2` as tofu.

**The files are deliberately not committed.** They are 1,560 KB, and dropped into `public/fonts/`
the glob above would take every visitor's first load from 4,269 KB to about 5,830 KB — a 37%
regression, including the Cyrillic, Greek and Vietnamese subsets nobody will render — bought to
remove a 76px layout shift. Committing them would have left that as a landmine for whoever wired
the CSS up. Re-run the script; it takes about thirty seconds.

So the migration is one commit, not two, and it contains: `globIgnores` for the font directory
plus a runtime CacheFirst route (what workbox recommends for fonts), the `<link>` swap, preloads
for the latin subsets, **and a decision about what the archive should still render offline.** Then
measure with `node scripts/measure-cls.mjs --base http://localhost:4173` against a preview build.
Not dev — in dev the files come off disk in milliseconds and CLS reads 0 whatever the strategy,
which would look exactly like success.

### Added 27 August 2026 — A11 closed: the archive has a settings page, and nine preferences

Asked for directly by the project head. Full write-up in
`docs/planning/SETTINGS_AND_READING_PREFERENCES.md`; this is the part worth reading before
touching a preference.

**The defect was not "too few options."** Every control this site had lived on the map sidebar —
theme, language, numerals, the tours switch, and a popover holding exactly one option — so a
reader arriving on `/shrine/data-darbar` from a search engine, which is how most readers arrive
given that all 169 entries are prerendered with their own metadata, could not reach a single one
without going to the map first. And nothing said what a preference *did*: `shrines_numerals`
decides whether a recorded date reads ۱۴۱۶ or 1416, which is editorial in a bilingual archive,
and its only affordance was an unlabelled toggle.

Six options now, each deepening a feature that was already here:

| option | the thing worth knowing |
|---|---|
| **Reading size** | Scoped to `.shrine-page`/`.entity-page`, **never `:root`** — the type tokens are in `rem`, so a root scale resizes the tab bar and the map controls, which are laid out at 390px under an overflow guard. Prose 15/16/18px, chrome 10px at all three. |
| **Motion** | `system`/`reduced`, **no `full`**. The attribute path is a universal reset rather than a mirror of the twelve named escapes. |
| **Calendar** | Hijri-first where the archive recorded a Hijri date. A Gregorian-recorded observance is left alone — computing a Hijri date for it would be inventing one (RULE 2). |
| **Distance units** | km/mi, and nine call sites stopped assembling `number + "km away"` in the component. |
| **Saved list** | Export / import / clear. Import **merges**; the parser keeps a slug the archive no longer has. |
| plus | theme, language, numerals, shrine-list destination and tours, consolidated onto one page. |

#### Three mistakes worth more than the features

1. **A custom property's `var()` is substituted where the property is *declared*, not where it
   is used.** The reading size was implemented as `--text-base: calc(1rem * var(--reading-scale))`
   on `:root`, with `--reading-scale` redefined deeper — which changes nothing, because
   `--text-base` has already resolved against `:root`. It measured **16px at every setting**. The
   fix is to declare the tokens on the same element that carries the scale, *and* to give that
   element its own `font-size`: `body` sets `font-size: var(--text-base)` and prose inherits the
   computed pixels, so redefining tokens on a descendant reaches nothing on its own.
   `readingScale.test.ts` pins both.
2. **A label must follow the value it describes, not the position it sits in.** The calendar
   preference has two: the `approximate` flag belongs to the projection, and the "(Hijri)" note
   belongs to the recorded date. Both were wrong until measured in a browser, and the second
   shipped **"Projected: 22–24 July 2027 (Hijri)"** — a Gregorian date labelled Hijri, which is
   worse than no label.
3. **An abbreviation does not inflect and a unit name does.** `distanceAwayMi` rendered
   "1 miles away". The value reaching the string is already localized — it can be "۱", "0.1" or
   "< 1" — so a plural rule would have to parse Eastern digits. `mi`, with /settings spelling out
   "Miles" beside the option.

#### The guards earned their keep, and this is the list

Six of this repo's own checks caught real gaps in this work, on the first run each time:
`hairline.test.ts` (a 1px separator), `docsIndex.test.ts` (a doc not in the index),
`importsAreTracked.test.ts` (three files git did not have), `tabs.test.ts` (**`/settings` owned by
no tab**, so a reader opening it would have seen five unselected tabs),
`cssTokensDefined.test.ts` (a `var(--x, 1)` fallback on an undeclared token, at sixteen use
sites), `noSentenceFragments.test.ts` ("On"/"Off" as radio labels), and
`check-bundle-budget.mjs` (no budget for the new route). None of them was a false positive.

#### Where a preference lives, and why — read this before adding a tenth

`storageKeys.ts` is the list. The split is deliberate and documented on
`ReaderPreferencesContext`:

- **Two are `data-*` attributes on `documentElement`, set before paint in `main.tsx`** — reading
  size and motion. CSS resolves them, so no component re-renders and no attribute is applied
  after the reader has already seen the un-styled frame. Both write *no attribute* for their
  default value, so the plain DOM is the default state.
- **Two are React state, in `ReaderPreferencesContext`** — calendar and units. These are read
  *while rendering*, inside formatters, on four and nine surfaces respectively, and all of them
  must change together the moment the reader chooses.
- **The rest are read once on mount** by the one or two surfaces that own them
  (`directoryPreference`, `toursPreference`), which is why they need no provider.

Reaching for the provider first is the mistake to avoid: it is a re-render in place of a
stylesheet.

### Added 27 August 2026 — the map's blocking time was the sheet arriving late, and `maplibre` is not 8,484ms of anything

**A new instrument, committed: `scripts/measure-blocking.mjs.`** It reports FCP, LCP and its
element, TBT by Lighthouse's definition, and **self time per script from a V8 CPU profile**, over
a preview build under 4× CPU and slow 4G. It exists because B4's attribution came from
Lighthouse, and `.lighthouserc.cjs` records an environment where Lighthouse cannot run — a number
nothing can reproduce is a number that drifts, which is the same argument
`scripts/measure-cls.mjs` was written for.

**Its own first version was wrong and is worth recording as the instrument lesson.** It applied
the 4× CPU throttle and threw away the network half of Lighthouse's mobile preset. It then
reported LCP 484ms on `/` against a recorded 6,735ms, and `vendor-maplibre` at 368ms against a
recorded 8,484ms — on a laptop LAN the scripts arrive so fast that the thing under test barely
happens. Both throttles are on by default now, and `--no-network-throttle` prints a header saying
the numbers are not comparable to anything here.

#### The fix: TBT 1,301ms → 138ms on `/`

Three runs each side, same machine, same pipeline:

    before   TBT 1386 / 1385 / 1253 ms   longest task 706–813ms
    after    TBT  180 /  102 /  110 ms   longest task 105–146ms

The front door goes from 4.5× over the 300ms budget to inside it.

**The cause was not slow code — the request had not been made.** `main.tsx` gates the first
render on `loadUiStrings(lang)` so an Urdu reader never sees a frame of English chrome, so React
does not mount until that chunk lands, so the fetch inside `useShrineData` could not begin.
Measured: the CSV request on `/?lang=ur` started at **3,790ms**, behind the interface strings,
both Nastaliq faces and the 253 KB Urdu content payload. `src/lib/data/csvPrefetch.ts` starts it
at module scope.

**This is the link `cbba48e` missed.** That commit removed a real serialisation *inside*
`fetchShrines` and reported the Urdu LCP unmoved, and its note said to start from `maplibre-gl`
next. The wait was never inside the fetch; it was in front of it.

#### The work did not get cheaper, it got un-collided — and only the task timings show it

    before   82ms@1949  68ms@2828  154ms@2897  709ms@12348  153ms@13099  366ms@13253  99ms@13764  70ms@13869
    after    93ms@1937  66ms@2906  129ms@2974   (nothing after 3.0s)

The first three tasks are React booting and are identical. What disappears is the sheet landing
at 12.3s **in the middle of the map's own startup** — maplibre evaluating, tiles rendering, fonts
swapping — where under 4× throttling it concatenated into 700ms tasks. Arriving at 2.4s on an
otherwise idle main thread, the same parse and build fit in 68ms + 133ms. That is why the script
now records every long task's start, not just a count: two runs with equal TBT can be one 700ms
task during mount or seven 90ms tasks spread out, and only one of them is a page that answers a
tap.

#### Correcting §9's maplibre attribution

The B4 note says **"`maplibre-gl` is 88% of it"** at 8,484ms of bootup, and tells the next person
to start there. Measured here, with both throttles on, `vendor-maplibre`'s **self time is
216–397ms** on `/` and `/?lang=ur`. The largest single entry is `(program)` — V8 parse and
compile — at 795–1,642ms.

The two are not measuring the same thing: Lighthouse's bootup audit attributes a script's
*total* time, including everything it calls into, while this is self time from profiler samples.
Both are legitimate. **What the 8,484ms does not support is the conclusion drawn from it** — that
maplibre is where the map's blocking time lives. It was not; the sheet's arrival was. Treat that
line as a number from another instrument, not as a direction.

Where maplibre *does* cost is **bandwidth**: 279 KB on the critical path, starting at 3,792ms on
`/?lang=ur` and finishing at 7,917ms, contending with the CSV.

#### The Urdu LCP is bandwidth-bound, not evaluation-bound

Unmoved by this change, ~8.7s. The measured critical chain on `/?lang=ur`, resources finishing
before LCP:

    3,534ms   NotoNastaliqUrdu-400.woff2   156 KB
    5,056ms   NotoNastaliqUrdu-600.woff2   161 KB
    7,445ms   urdu-content.js              253 KB
    7,917ms   vendor-maplibre.js           279 KB
    8,310ms   the sheet                    837 KB
    8,519ms   MapTiler style.json
    8,722ms   search.worker.js

That is roughly 1.7 MB before the largest element can paint, on a 1.6 Mbps link, and the profile
shows **18.2s idle against 1.1s of program time** — the route is waiting, not computing. The
overnight note's "script-evaluation-bound, not fetch-bound" was read off Lighthouse's render-delay
figure and does not survive this measurement.

**The next lead, and it is a good one: `urdu-content.js` is 253 KB of shrine *article* text on
the critical path of a route that displays no articles.** The map needs names, which come from
the dictionary, not Descriptions. `useShrineData` already has `onUrduContentLoaded` →
`rebuildWithUrduContent` for the reader who switches language mid-session, so the machinery to
adopt it late exists. The trade is a visible re-render on a shrine page, so it wants to be
route-aware rather than unconditional.

#### One more thing the trace showed — and the reading of it was wrong, corrected below

**Markers do not appear until 10.7s, while the sheet's *headers* arrived at 2.4s.** The first
version of this note said they were waiting on the map, because in one run the marker and the
maplibre canvas appeared 1ms apart. That was a coincidence and the note was wrong; the correction
is in the next section. Markers wait on the sheet's **body**, which is a separate thing from its
headers.

### Added 27 August 2026 — the language toggle was buying an English reader 154 KB of Nastaliq

Found with `scripts/measure-blocking.mjs` and a response listener, while looking for what else was
on the Urdu route's critical path.

`.lang-seg[lang='ur']` in `map.css` set `var(--font-urdu)` — whose first family is Noto Nastaliq
Urdu — under a comment reading *"Urdu segment uses Naskh for the inline label."* The comment was
the intent and the code was not, and the effect is this: **on the English map the only
Arabic-script text painted anywhere is the language toggle's own name, اردو, and painting it
fetched NotoNastaliqUrdu-700 — 154 KB.**

That is precisely the cost `index.html`'s preload gating exists to avoid, in its own words:
preloading unconditionally *"would cost every English-first visitor ~154KB they don't need."* The
preload was gated. The fetch happened anyway, one control over.

**And `e2e/font-preload.spec.ts` already claimed otherwise** — "an English reader who never paints
an Arabic-script glyph now fetches neither face" — with two tests that both passed on a page that
downloaded the face. *Does not preload* and *does not download* are different claims, and only one
of them is the 154 KB. The spec asserts the request now, and the new test was confirmed to fail on
the old CSS.

Fixed by rendering those four letters in the system's own Arabic face for the **English**
interface only; `[dir='rtl']` keeps Nastaliq, because i18n rule 4 requires it on every control in
the Urdu view and an Urdu reader has the face loaded anyway. **No webfont family may appear in
that stack** — font matching is per-character, so naming Noto Naskh Arabic after `system-ui` would
download it for the one glyph `system-ui` cannot draw. The toggle measures 45px against 47px, so
nothing moves.

#### Where the front door stands now

Same instrument, same preset (4× CPU, slow 4G, preview build, 390px), after both of today's
changes:

| | before | after |
|---|---|---|
| `/` TBT | 1386 / 1385 / 1253 ms | **68 / 119 ms** |
| `/` longest task | 706–813 ms | **104–137 ms** |
| `/` LCP | 2068 ms | 1928–1984 ms |
| `/?lang=ur` TBT | 531 ms | 384–472 ms |
| `/?lang=ur` LCP | 8888 ms | 8568–8596 ms |

The map route is inside the 300ms TBT budget with room, from 4.5× over it. **The Urdu LCP has
barely moved and will not until bytes come off its critical path** — the 154 KB helps the English
route, not that one, because an Urdu reader genuinely needs the faces. The lead there is still
`urdu-content.js`: 253 KB of shrine *article* text on a route that displays no articles.

#### One more thing the font trace showed

The Urdu view paints **four** weights — 400, 500, 600, 700 — from **three** faces. There is no 500
weight, so `.tabbar-label` resolves to 600 through CSS font matching (for a target of 500 the
algorithm checks upward first). That is neither a download nor synthetic bolding, so it is left
alone — but a stylesheet asking for a weight the type system does not have is worth knowing about
before someone adds a fourth face to satisfy it.

### Added 27 August 2026 — what time-to-first-marker is actually made of, and two dead fields worth 775 KB

Written after the note above claimed markers were gated on the basemap. **They are not**, and the
sequence of measurements that established it is worth keeping, because three plausible readings
were wrong on the way.

    1,098ms   #root has children
    2,072ms   sidebar, leaflet container, welcome card
    2,347ms   CSV response — headers
    3,107ms   maplibre canvas
   10,928ms   first marker, all 169 markers, marker pane populated

The canvas is up at 3.1s and the markers are not there at 10.9s, so the basemap is not the gate.
`ShrineMarkers` renders straight from `shrines`, so the gate is when that state populates — and
that is when the CSV **body** finishes, not when its headers arrive. Playwright's `response`
event, and the eye reading it, fire at response start.

#### The CSV, measured properly

    uncompressed          856,607 bytes
    gzip (Google serves it when asked)   296,223 bytes
    cache-control         private, max-age=300

**Google does compress it**, so the 289 KB is what a browser gets — the 837 KB figure is the
decoded size and should not be quoted as a transfer cost.

    in isolation, slow 4G      headers 1,167ms · body complete 2,727ms
    inside the app, slow 4G    starts 991ms · completes 10,198ms

So ~7 of those seconds are not the sheet's size. Total encoded bytes finished before the first
marker: **763 KB**, which is 3.9s of transfer at 1.6 Mbps against a 9.4s time-to-marker. **More
than half of time-to-first-marker on a slow phone is round-trip latency and 4×-throttled CPU
across a dependency chain, not bytes.** Which also corrects the framing in the note above: the
*Urdu* route is bandwidth-heavy, but the English front door is not primarily a bandwidth problem.

#### Two fields on every shrine that nothing read

Found while chasing the CPU half. `buildShrine` set **`parsedArticle`** and
**`articleSections`** on all 169 rows on every page load, and outside `articleParsing.ts` the only
mentions in the whole repository were the type declaration and the assignment. Every real consumer
— `useArticleContent`, `ShrinePreview`, `figureBiography` — calls the parser with the row, which
is the right shape: article structure is wanted one entry at a time and the map wants none of it.

    localStorage cache      1,891 KB → 1,116 KB
    (program) self time     ~800–1,600ms → 416ms
    categoryKey.js chunk    218–266ms → 35ms

**The cache number is the one to notice: a 1.9 MB write and read on every visit, ~40% of it an
article parse nothing looked at.** `parsedArticle` serialised to 1,902 characters per shrine,
second only to `raw`.

Two attributions in the profile were also misleading and are worth knowing about:
`categoryKey.js` looked like a hot module at a quarter-second of self time, and the function is
seven string operations — the bundler had put `articleParsing` in that chunk. And the three
`(RegExp: …)` frames at 30–40ms each were `normalizeHeading`'s six regexes running over every
candidate line of 169 Descriptions. Both vanished with the fields. **A chunk name in a profile is
not a module name.**

Cache key bumped to v6: an older entry reads fine, since extra fields are ignored, but it would
keep the 1,891 KB version alive for an hour.

#### Still open, in order of size

1. **`urdu-content.js`, 253 KB of shrine article text on the critical path of a route that shows
   no articles.** Unchanged as the Urdu route's biggest lever. Needs to be route-aware: an
   unconditional deferral flashes English prose at an Urdu reader.
2. **The dependency chain itself.** Half of time-to-first-marker is latency and CPU across
   sequential module loads. Nothing here is one lever; it is the shape of an SPA whose data is a
   third-party CSV.
3. A micro-subset Nastaliq face for the language toggle would give real Nastaliq at ~3 KB instead
   of the system fallback, and needs `fonttools` as a build dependency — a decision, not a tweak.

### Added 27 August 2026 — the archive does work offline, and for five pages that was the problem

**A claim nothing had tested.** `savedShrines.ts` opens by saying the list "works offline in the
PWA"; the service worker precaches 4,269 KB; no test, spec or note had ever checked whether the
archive is usable with the network cut. It is:

    offline /                    169 markers, sidebar, no page errors
    offline /shrine/data-darbar  title + all 17 article sections
    offline /settings            renders
    offline /about /almanac /place/:slug /saint/:slug   all render completely

Recorded as a standing measurement rather than a fix, because the absence of a defect is the
answer and nobody should have to rediscover it. Method: warm visit, `context.setOffline(true)`,
reload. Note that `playwright.config.ts` sets `serviceWorkers: 'block'` to keep the CSV intercept
hermetic, so **the e2e suite cannot see this path at all** — it has to be checked by hand or with
a probe that leaves the worker alone.

#### What it did find

`OfflineDataBanner` was on the map and nowhere else. Five pages rendered the archive from a cache
of unknown age and said nothing.

**`/about` is the case that decides it.** That page computes the coverage figures from the shipped
data on every load *specifically so they cannot go stale* — the standing-findings note above says
a page "cannot go stale the way a note can", and that is the whole reason those numbers are
computed rather than written down. Offline it printed **"171 sites"** from cache with nothing to
qualify it. The exact failure the design was built to avoid, arriving through a door nobody had
checked.

The banner is now on all eight pages that call `useShrineData`, self-hiding unless a live fetch has
actually failed — verified absent on five routes online and present on five offline. It gained an
`overlay`/`inline` variant because the map is a full-height layout with no document flow for a
banner to sit in; `inline` is the default and the map is the exception.

`src/lib/data/__tests__/offlineDisclosure.test.ts` derives the page list from the source rather
than listing it, like `siteFooter.test.ts`, because the failure mode is *a new page*: someone adds
a route, calls `useShrineData`, inherits the gap.

#### One thing the sweep also settled

The Shrine model was checked field by field for others like `parsedArticle` — 29 fields, each
grepped for consumers outside the type and the model. **There are no more dead ones.** Recorded
because the absence is the answer, and the next person wondering can read this instead of running
it again.

### Added 27 August 2026 — production has three off-schema categories and four rows with prose in `status`

**A general sweep of the site found nothing wrong with the site, and something wrong with the
data.** Every route in both languages was walked for console errors, page errors, same-origin
4xx, duplicate DOM ids, h1 counts and links with no accessible name. The only recurring finding
was the already-known 403 on the dead heritageofpakistan.org image. No duplicate ids, no missing
or doubled h1, no inaccessible links. Recorded because the absence is the answer.

The 417 distinct internal link targets were then validated against the data — and two did not
resolve. **That turned out to be the instrument, not the site**: the validator used the
169-row snapshot while the app renders the live sheet's 171. Which is the finding.

#### The gap: every gate reads the snapshot, production is the sheet

    committed snapshot   169 rows, 1 category outside the schema
    live sheet           171 rows, 3 categories outside the schema

    ✗ "Islam"                 ← Darbar Abul Muali Qadri        (known, patch pending since 21 Aug)
    ✗ "Islam"                 ← Darbar Hazrat Shah Gohar Peer  (new)
    ✗ "Sufi shrine (Islam)"   ← Darbar Mian Qurban Ali Shah    (new)

`validate.mjs`'s category guard exists, is correct, and its own comment names this failure — and
it cannot see either new row, because both arrived after the snapshot was built. On the live site
each loses its map colour, drops out of the category filter, and is excluded from every tradition
count. **The overnight handoff recorded "one row's category is Islam"; that is right for the
snapshot and understates production by two.**

`npm run data:check:live` (`scripts/data/check-live-sheet.mjs`) asks production directly. It reads
the sheet URL out of `src/lib/data/constants.ts` rather than carrying a copy, diffs the row set
against the snapshot, and exits non-zero on an off-schema category or a **removed** row — removal
being the serious direction, since the published photo URLs and every external link to
`/shrine/<slug>` ride on those slugs. It is **not** in `npm run verify`: it needs the network and
reads a document that changes without us, and a gate that can go red because someone edited a
spreadsheet mid-build is a gate people learn to skip.

#### What the "report, don't validate" half found

It validates `category` and only *reports* `status`, `support_level`, `info_level` and
`site_type` — counted, most common first — because those vocabularies live in TypeScript it
cannot import and a hardcoded copy would be a third source of truth. The counted list immediately
showed something no enum check was looking for:

    128  Active
     17  Occasional
     13  Heritage
      7  Ruin
      1  Active; in use daily, construction ongoing
      1  Active; deteriorating fabric
      1  Active; physically constrained. Reported as occupying a small area reduced by … (212 chars)
      1  Active, in regular use; reconstructed 2022
      1  Destroyed
      1  (blank)

**Four rows carry prose in `status`**, where the schema section of CLAUDE.md says prose belongs in
`status_note`. A fifth (Shaktipeeth Shri Hinglaj Mata Mandir) has no status at all — a gap to
report, not to fill.

#### The patch

`data/patch_schema_hygiene_2026-08-27.csv`, for a human to import (RULE 3). Four rows, columns
`Name, category, status, status_note`; a blank cell means leave that column alone, matching
`patch_data_hygiene_2026-08-21.csv`, which is still pending and already covers one of the three
categories.

Generated from the live sheet rather than retyped, and **verified lossless**: rebuilding
`status + "; " + status_note` reproduces the original string for all four rows, and every
`status_note` was empty beforehand, so nothing is overwritten. The two `"Islam"` values and the
one `"Sufi shrine (Islam)"` map to `Muslim Shrine` — the schema's own category for a Sufi darbar —
which is a proposal for review, not an import that has been made.

### The next agent-executable piece of work

**Completed 24 August 2026:** `src/data/source-notes.json` now carries the reader-facing
"Where the source contradicts itself" disclosure for **all 52 entries** with internal
`qa_note` contradictions, including the two unmapped survey rows (131 bilingual notes).
Every item is a cleaned restatement of recorded evidence: claims stay attributed, conflicts
remain unresolved, and nothing covered by the 22 August attribution ruling is withheld.

The content-contract test now derives its expected slugs from the committed 169-row snapshot,
adds the two deliberately unmapped rows, and requires exact coverage. It also enforces
bilingual items, minimum lengths and zero Latin letters on the Urdu side. There is no remaining
source-note drafting backlog.

**Frontend preference, 24 August 2026:** the map's "Table of Shrines" button now opens the
Command-K Spotlight search by default. Settings in the sidebar header retains the traditional
table as a persisted browser preference (`shrines_directory_mode`). The keyboard shortcuts
open Spotlight directly in either mode.

The open blue-sky items are N3 (field-kit PWA), N5 (adopt-a-shrine) and the rest of N4 beyond
its type-level groundwork. `docs/planning/NEXT_STEPS_2026-08-21.md` is the working plan; §9 of
this file is the trust-calibration list — read it before believing any older note.

### Added 28 August 2026 — two figures were four nodes, and the fix that suggests itself is wrong 19 times in 21

Worked as a knowledge-base pass while another session held the front end. All of it is on
`claude/kg-review-enrichment`, in a separate worktree, so nothing here raced the tree.

**Two figures had two nodes each, and each page showed half a man.**
`hazrat-wasif-ali-wasif-awan` carried Wasif Ali Wasif's shrine and his ʿurs;
`hazrat-wasif-ali-wasif` carried his master and both his orders. The display name on the two was
character-for-character identical. `shah-abul-muali-qadri` and
`hazrat-syed-muhammad-khair-ul-deen-known-as-shah-abul-muali-qadri` were the same story — shrine
and ʿurs on one, descent from Daud Bandagi Kirmani on the other.

Cause: the graph builds figure nodes from two sides that never spoke. The sheet side
canonicalises `principal_figure` through `saintMergeVariants` and slugifies; the proposal side
takes whatever slug an extractor wrote, and its only guard against minting a duplicate was
`saintMap.has(slug)`. Proposal slugs now resolve against the names already in the graph first
(`scripts/data/lib/saintIdentity.mjs`). 196 nodes → 194, all 637 relations kept, and the two
survivors gained three alt-names, three titles, a date precision and a biography source.

**The instrument lied, and this is the transferable part.** Before finding the exact-name cases I
ran a token matcher over honorific-stripped names — the obvious way to catch near-identical
figures. It proposed **21 merges; 2 were right.** The 19 wrong ones were not noise:

- `shaikh-abdul-latif` is Khwaja Muhammad Zaman's **father**, a Naqshbandi of Luari Sharif — not
  Shah Abdul Latif Bhittai.
- `sayyid-shah-inayat` is Shah Chan Charagh's **maternal uncle** — not Shah Inayat Qadiri of
  Lahore, Bulleh Shah's murshid.
- `shah-saidan-sarmast` is Shah Daula Daryai's **Suhrawardi master** — not Sachal Sarmast.
- `sai-chanduram` and `sant-baba-asudaram` scored 0.67 sharing **no token at all**.

In a corpus of silsilas the people who share a name are fathers and sons, uncles and nephews,
masters and disciples. Name similarity here is evidence of standing **one edge away** from
someone — so a similarity merge does not merely mis-name a figure, it deletes the relation that
made the pair worth recording. `data/kg-seeds.json` now carries **`saintDoNotMerge`**: 11 merges
decided against, each with the corpus sentence that forbids it, quoted byte-exact and re-checked
against its source on every run. Four come from the extractor's own warnings; seven are the false
positives above, recorded so no later pass re-proposes them.

**Three instruments over-fired in one afternoon**, which is the same lesson as
`feedback_measure_before_recording` and worth restating with fresh cases. (1) The token matcher,
2/21. (2) A regex meant to find alt-names that are descriptions rather than names — it flagged
`Sayyid Abdul Latif Shah`, a perfectly good alt-name. (3) A deliberately *conservative* rewrite of
the same rule — it flagged `al-Hujwiri` and `Sayyid Abul Faiz Qalandar Ali Gilani Suhrawardi`. So
**no number is recorded here for the alt-name problem**, only the shape of it: `extractParenthetical`
treats every parenthetical as an alt-name, and some parentheticals are dates (`1713–1775`,
`1895–1960`), ordinals (`4th`, `5th`), roles (`founder of the Rashidi order`, `master-builder`) or
whole sentences (`born Muhammad Wasif Awan; "Wasif" was his pen name/takhallus`). Real, unfixed,
and needing a curated rule rather than a heuristic — the risk of a heuristic is dropping the
genuine Arabic and Persian name particles it cannot tell apart from prose.

**Five more nodes were one figure twice**, and the archive was dividing their sites between two
pages: Kali showed **1 temple of 3**, Valmiki **2 of 3**, Jhulelal **1 of 2**, Guru Nanak
**16 gurdwaras of 17**. Closed with five `saintMergeVariants` entries — 190 nodes now. Not
guessed: `principal_figure` already said `Kali`, `Valmiki (Bhagwan Valmik)` and `Guru Nanak` for
exactly the rows whose legacy cell says otherwise. Verified in a browser at each figure's page,
not just in the JSON.

**Which is the larger finding, and it is a decision, not a patch.** `build-kg.mjs` reads
`row['Sufi Saint']` — the *legacy* column. 95 of 169 rows have a different `principal_figure`
string; **49 rows and 46 of 132 figure slugs would move** if the graph read the schema's own
column. It is mostly the better column, and it is **not uniformly better** (Kalka Cave Temple's
`Kalka Devi (Kali)` would re-split Kali's temples), ten of seventeen merge-variant keys would stop
applying, and its `;`-for-two-figures convention cannot be split naively because
`darbar-wasif-ali-wasif` has a semicolon *inside a parenthetical*. Full analysis, three options
and a recommendation: **`docs/planning/DECISION_figure_identity_column.md`**.

**A merge retires a published URL — found by opening one, not by reasoning about it.** Every
figure gets a prerendered page and a sitemap entry (`scripts/prerender.mjs`, `saintSlugs`), and
`/saint/:slug` answers an unknown figure with a redirect to the map. So all six slugs joined today
were landing on the map under the site's generic title: a soft 404 for six addresses that worked
yesterday. `kg.json` now carries `retiredSlugs` and the route consults it before falling back —
the shape `/coverage` and `/report` already use into `/about`. Built from the merge data rather
than listed, so the next merge inherits it. **If you merge figure nodes, this is the trap.**

And a second trap inside the first, found by grepping for the retired slugs rather than assuming
nothing referenced them: `<Navigate to={`/saint/${moved}`} />` carries **neither query string nor
fragment**. `?lang=ur` is how the Urdu edition is reached, so the first version of the redirect
sent an Urdu reader to the English page — and `e2e/urdu-no-leak.spec.ts` visits one of the retired
slugs with `?lang=ur`, so the spec whose whole purpose is to fail on Latin text under
`[dir='rtl']` would have found none and passed. A guard that stops measuring is worse than one
that fails. Also spent and now removed: `KNOWN_DUPLICATE_FIGURES` in `kgNameCoverage.test.ts`
carried `[['bhagwan-valmik','valmiki']]` with a comment saying the fix was data work waiting to be
done. It was done in `e8e2f7d`, so the allowance is empty and that test is strict again.

**Still standing, deliberately.** `guru-arjan-dev-and-guru-hargobind` and
`guru-nanak-dev-ji-associated-with-bhai-lalo` are single nodes standing for two people, so
**Gurdwara Panjvi Chati Patshahi is on neither Guru Arjan Dev's page nor Guru Hargobind's** — it
is on a page for a man who never existed. Options in the brief. Also untouched: the KG review
worksheet is still at **0 verdicts of 255**, and recording one is a reader's job, not an agent's
(`docs/KG_REVIEW_WORKFLOW.md` is explicit about the three judgments a machine cannot make).

**New gate.** `npm run data:validate:kg-identity`, wired into `data:validate`. Fails on: two nodes
claiming one name; a recorded do-not-merge pair collapsed into one node; a pair whose slug has
vanished; a do-not-merge quote that no longer matches its source; a retired slug that is itself a
live figure, points at itself, or targets a non-figure; and a merge target that resolves to
nothing. **Every one of those was confirmed to exit non-zero** by breaking it on purpose and
restoring — a check nobody has seen fail is a note, not an invariant.

One thing worth knowing for anyone else using a worktree here: `.gitignore` has `node_modules/`
with a trailing slash, which matches a directory and **not a symlink**, so a symlinked
`node_modules` in a worktree shows up as untracked. Never `git add -A` in one.
