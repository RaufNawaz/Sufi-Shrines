# Web-research pass — September 2026

Directed research over the **29 thinnest entries in the archive that the August 2026 pass did
not cover** (`entries/web-research-2026-08/targets.tsv` holds that pass's 40). Selected by
measurement rather than impression:

```bash
python3 pipeline/build_research_batch.py data/live_sheet_2026-09-05.csv --rank
```

ranks every row by prose word count (everything *before* the first bibliography heading) and
citation count (`- ` lines after it). The 29 in `targets.tsv` are the shortest, least-cited
rows left once the August targets are removed. Most sit at 250–450 words of prose on one or two
citations — several of them for shrines with a substantial published scholarly literature
(Shah Rukn-e-Alam, Sakhi Sarwar, Shah Abdul Karim Bulri, Pir Baba), which is precisely why they
are worth a pass.

Scaffolding regenerates from a live sheet export; it is never hand-edited:

```bash
python3 pipeline/build_research_batch.py data/live_sheet_2026-09-05.csv \
    --batch 2026-09 --targets pipeline/research_targets_2026-09.txt
```

One file per entry, named by `file_slug` from `targets.tsv`. The **sheet join key is the exact
`name` column in `targets.tsv`**, not the filename. `current-content/<slug>.current.txt` holds
what the archive publishes for that entry today — read it first, so that a "finding" is
actually new and so that a *conflict* with what is already published is noticed rather than
silently overwritten.

## Reliability bar

Citable: published books (author/title/year, incl. full-text scans on archive.org — e.g.
Iqbal Qaiser, *Historical Sikh Shrines in Pakistan*; colonial district gazetteers), academic
papers and monographs, established press (Dawn, The News/TNS, Express Tribune, The Friday
Times, The Nation, Arab News, Herald), official bodies (ETPB, Auqaf, Walled City of Lahore
Authority, provincial heritage/archaeology departments, UNESCO).

Not citable: personal blogs, Tripadvisor/travel aggregators, Find a Grave, YouTube, TikTok,
forums, and wikis. Wikipedia may be used only as a pointer to its own citations, which must
then be fetched and verified directly.

## Rules of evidence (RULE 2 applies)

- Every fact carries a verbatim quote (≤50 words) from a page the researcher **actually
  fetched**, plus a full citation with URL and access date.
- A source that could not be fetched is an **unverified lead**, listed separately, never a
  citation. A search-result snippet is not a fetch.
- Conflicts between sources are reported, never resolved. Conflicts with what the archive
  already publishes (see `current-content/`) are reported too, and are the single most valuable
  thing this pass can produce.
- **Quoting OCR: give the raw string, not a tidied one.** Colonial-gazetteer scans render
  "handsomest shrine" as "liandsomeat slitino" and "Bahawalpur" as "Bnlmwalpnr". A normalised
  quote presented as verbatim is unfalsifiable: the next reader greps the scan, finds nothing,
  and cannot tell a good reading from a fabrication. Quote the literal text and put the reading
  beside it. (Two files in this pass needed this correction after the fact.)
- **Check the byte count before believing a negative.** `WebFetch` silently truncates a large
  archive.org `_djvu.txt` at roughly 25 pages and reports success, and
  `archive.org/download/<id>/<id>_djvu.txt` 404s on many items because the text file is named
  after the scanned file. Use `pipeline/fetch_archive_text.py`, which resolves the real name and
  prints the size. Three of ten audited negatives in this pass were artefacts of that truncation.
- "Nothing reliable found" is a valid and useful result. Nothing is filled from general
  knowledge. `docs/allo_mahar_resolution.md` is 700 confident words about the wrong man,
  assembled from real sentences about a real saint — that is the failure this bar exists to
  prevent.

## File template

```
# <exact sheet Name>
file_slug / researched date / batch

## Verified findings   (fact + quote + full citation + reliability class)
## Conflicts           (with other sources, and with the current entry — or "None found.")
## Unverified leads    (title + URL only)
## Acquisition leads   (full-text scans / books relevant to this site)
## Verdict             STRONG (≥2 independent verified sources) / PARTIAL / NOTHING RELIABLE FOUND
```

## Downstream

Findings rated STRONG/PARTIAL get folded into `data/patch_web_research_2026-09.csv`
(id, Description, qa_note — full-Description replacement against the live sheet, additions
only, conflicts flagged in `qa_note` per the both-accounts editorial decision of 16 Aug 2026).
Agents do not write to the sheet (RULE 3); a human imports the patch.
