# Shrines Spreadsheet — Enrichment Runbook

**Purpose:** each run does ONE incremental batch of work on `Shrines_with_Descriptions.xlsx` — fill some missing descriptions, add some new shrines, and (where possible) add images — then records progress so the next run picks up where this one left off. Runs are cumulative: the sheet gets richer every time.

**How it's triggered:** manually, via the "Shrines enrichment (manual)" scheduled task, or by telling Claude *"run the shrines enrichment."*

**Two halves:**
- `tools/shrines_enrich.py` — the safe engine (finds gaps, backs up, writes results, dedups, logs). Deterministic.
- This runbook — the research + writing Claude does each run.

---

## Per-run procedure (follow in order)

### 1. See the current state
```
python3 tools/shrines_enrich.py --status --limit 20
```
This prints: data-row count, rows missing a Description, rows missing Image 1, and the next candidate sites from `_enrichment_queue.md` (flagging any already in the sheet).

### 2. Choose this run's batch (defaults — adjust to taste)
- **6–8 descriptions** for existing rows that lack one. Rotate across faiths (Muslim / Sikh / Hindu) and regions so coverage stays balanced. Skip non-site placeholder rows (e.g. a bare district name) — flag those to the user instead.
- **4–6 new shrines** from the top of `_enrichment_queue.md` (verify each is real and not already present before writing).
- **Images** for ~3–5 of the description rows you're filling and any new rows — best effort (see §5).

### 3. Research rules (accuracy is paramount — this is a research dataset)
- Web-search every site before writing. **Do not fabricate** names, dates, saints, or coordinates.
- Where a fact is uncertain, disputed, or legendary, **hedge** ("traditionally", "is said to", "according to legend") — never invent false precision.
- Prefer authoritative sources (Wikipedia/Wikimedia, gazetteers, ASI/UNESCO, academic works, reputable press).

### 4. House style for descriptions (match the existing entries exactly)
- Warm, dignified, scholarly-narrative prose. **British spellings** (centre, honour, defence). Italicise transliterated terms/titles on first use with markdown `*...*` (e.g. *urs*, *langar*, *sarovar*, *Shakti Peetha*, *Guru Granth Sahib*).
- Markdown `##` section headers. Adapt to the site, but follow this shape:
  `## Overview` → `## History / The Life of the Saint / Mythology & Origins` → one or two thematic sections (architecture, devotional life, partition history, pilgrimage) → `## Legacy` (or `## Significance Today`) → `## Bibliography` (3–5 real, general references — no fake page numbers).
- Length **~700–1,100 words** (~4,500–7,000 characters).
- **Do NOT add the trailing `====` separator** — the engine appends it automatically.
- Read an existing long entry first for tone (e.g. row 2 Data Darbar, or `_staging_descriptions.md` from the first session).

### 5. Image rules
- **Preferred source: Wikimedia Commons.** Store the image in the stable direct form `https://commons.wikimedia.org/wiki/Special:FilePath/<EXACT_FILENAME>` (spaces → underscores; keep the extension and any commas/parentheses). This redirects to the current full-resolution file.
- **Primary method to find a filename WITHOUT a browser** (works even when the Chrome connector is unavailable): run a web search of the form
  `site:commons.wikimedia.org "<distinctive site name>" <city/region>`
  This returns direct `File:...` page URLs — and the filename is in the URL itself, so you do **not** need to open/render the Commons page. Convert `File:Name.jpg` → `Special:FilePath/Name.jpg`.
  - **Strict acceptance rule:** only use a file whose **filename explicitly names the exact site** (good: `Pir_Baba_Buner.jpg`, `Ghamkol_Shareef_Kohat,_KPK_Pakistan.jpg`, `Darbar_e_aliya_mohra_sharif.jpg`). **Reject** generic, wrong-place, or scenery files (e.g. `Karachi_Mandir.jpg`, `Natural_beauty_in_kaka_sahib.jpg`, another city's tomb, a "hills view"). When unsure → `NONE`.
  - A result that is only a Commons **Category** page, or a Wikipedia/Wikidata page, is **not** enough on its own: `web_fetch` cannot render Commons / Wikidata / API pages here to read their file list, so treat those as "no confident match" → `NONE`.
- The image must depict **that specific site**. A blank is far better than a wrong link — this is a research dataset.
- **Flag auto-sourced images.** When a file is accepted on filename match but not actually viewed, list it in `_image_unverified.md` (row, site, field, Commons file, a `[ ]` checkbox) and note in `_ENRICHMENT_LOG.md` that the batch is unverified, so a human or a later browser-enabled run can spot-check.
- **Filling images on EXISTING rows:** `shrines_enrich.py --write` only fills descriptions and appends new rows — it does **not** touch image cells on existing rows. Add those with a small `openpyxl` script that (a) backs up to `archive/xlsx_backups/` first, (b) fills only **empty** Image cells, (c) verifies the row's Name still matches, (d) copies cell style from row 2. New rows carry images via the `IMAGE1:` / `IMAGE2:` fields in the `<<<SHRINE>>>` block.
- Never use Facebook / Instagram / Twitter / Pinterest / YouTube / Flickr / Google-search URLs, and never put an article- or category-page URL in an image field.
- **Best (optional) verification:** if a Chrome browser is ever connected, use the **Claude-in-Chrome** tools to open the Commons file and confirm the photo before accepting. Without a browser, the `site:commons` + strict-filename-match method above is the standard.

### 6. Coordinates & categories (for new rows)
- Coordinates in **decimal degrees**; get them as precisely as possible. If only an area-level estimate is possible, still provide it but note "coordinates approximate" in the block's `NOTE`.
- **Category must be one of exactly:** `Muslim Shrine`, `Sikh Gurdwara`, `Hindu Temple` (the web app filters on these three). If a site is really Jain/Buddhist/other, use the closest of the three and say so in the description + NOTE.

### 7. Write the batch to a staging file, then apply it
Create `_enrichment_batch.md` containing your blocks in these EXACT formats:

To fill a description on an existing row:
```
<<<ENTRY row=<ROW NUMBER FROM --status> name="<EXACT NAME AS IN SHEET>">>>
## Overview
... full markdown description, no trailing separator ...
## Bibliography
- ...
<<<END>>>
```

To add a new shrine (appended as a new row):
```
<<<SHRINE add=YES>>>
NAME: <common English name>
LOCATION: <area>, <city>, <province>, Pakistan
CATEGORY: Muslim Shrine | Sikh Gurdwara | Hindu Temple
LATITUDE: <decimal>
LONGITUDE: <decimal>
FOUNDED: <century or year, or "Unknown">
SAINT: <saint / guru / deity, or "—">
IMAGE1: <direct Commons/Wikipedia image URL, or NONE>
IMAGE2: <direct image URL, or NONE>
EVENTS: <e.g. "Annual urs" / "Vaisakhi" / "No events scheduled right now">
DESCRIPTION: <200–500 word description, single line, no trailing separator>
NOTE: <optional: flag approximate coords / duplicates / uncertainties>
<<<END>>>
```
Then apply (this backs up the workbook automatically, fills only empty descriptions, verifies each row's name still matches, dedups new rows, copies cell styles, and appends the separator):
```
python3 tools/shrines_enrich.py --write _enrichment_batch.md
```

### 8. Verify
Re-run `--status` (or reload) and confirm the counts moved as expected and nothing looks wrong. The engine prints exactly what it wrote/skipped; read that output.

### 9. Update the queue and report
- In `_enrichment_queue.md`: change `- [ ]` to `- [x]` for sites you added, and append any new candidate sites you discovered.
- Give the user a 2–4 sentence summary: what was filled, what was added, any data-quality flags (duplicates, missing images, shaky coordinates).

---

## Guardrails (the engine enforces these, but keep them in mind)
- A timestamped backup is written to `archive/xlsx_backups/` before every `--write`.
- Existing descriptions are **never** overwritten.
- New rows that duplicate an existing name (normalised) are skipped.
- Every run is appended to `_ENRICHMENT_LOG.md`.

## Known follow-ups (from the 2026-07-04 session)
- Row 6 (Ganj-e-Inayat): Image 1 is a Facebook page URL, not a photo — replace or clear.
- Possible duplicate: row 106 "Jagannath Temple, Sialkot" ≈ row 72 "Shahwala Teja Singh Mandir".
- 3 unverified image candidates for rows 96 / 104 / 106 are listed in `_RESUME_LOG.md`.
