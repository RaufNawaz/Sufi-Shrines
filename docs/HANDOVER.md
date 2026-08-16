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

## 9. Trust calibration — read before relying on earlier notes

Prior sessions produced confident diagnoses that were wrong. A successor should know which, so
as not to inherit them:

- **"The bibliography parser is broken and the support numbers are garbage."** False. The
  parser was correct; it had been fed a flattened TSV. The input was bad, not the code.
- **"9 field visits."** Actually 14.
- **"Audio recordings exist."** Then "none exist." Then "video only." Final answer: 18 video
  files, zero audio.
- **"The front end is vanilla self-contained JS."** It is React + TypeScript + Vite.
- **"MapTiler is out of credits / missing `.env`."** Neither — it is an origin restriction.
- **A coordinate given for Bibi Jawindi** was Baha'al-Halim's exact point, creating a duplicate.
- **The `re.I` on `ARTEFACT`** caused legitimate prose to be edited to satisfy a broken linter.
  The linter was wrong. Do not edit content to satisfy a check.

The pattern in most of these: a plausible cause asserted before the cheap verification was run.
The mitigation that has actually worked is encoding invariants that fail loudly — the
unbalanced-asterisk check, the no-newlines-in-Description guard, the marker-count-vs-row-count
check. Prefer those over careful intentions.

---

## 10. Risks if this is left unattended

1. **`~/shrines` is unversioned and unbacked-up.** The termbase, the photo manifest and every
   pipeline script live there. One disk failure erases months of mapping work that cannot be
   reconstructed from the sheet.
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
   coverage.

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
