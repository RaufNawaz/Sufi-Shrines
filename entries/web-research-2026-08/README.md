# Web-research pass — August 2026

Directed research over the 40 remaining `Web-compiled` entries (see `targets.tsv`) that the
`out/ocr/` book corpus cannot improve. Direction from Rauf, 16 Aug 2026: *"find information
online only to the extent that it is reliable and accurate, after which we can wait for
Saifullah to send the books."*

One file per entry, named by `file_slug` from `targets.tsv`. The **sheet join key is the
exact `name` column in `targets.tsv`**, not the filename.

## Reliability bar

Citable: published books (author/title/year, incl. full-text scans on archive.org — e.g.
Iqbal Qaiser, *Historical Sikh Shrines in Pakistan*; colonial district gazetteers), academic
papers, established press (Dawn, The News/TNS, Express Tribune, The Friday Times, The Nation),
official bodies (ETPB, Auqaf, Walled City of Lahore Authority, provincial heritage/archaeology
departments, UNESCO).

Not citable: personal blogs, Tripadvisor/travel aggregators, Find a Grave, YouTube, TikTok,
forums, and wikis. Wikipedia may be used only as a pointer to its own citations, which must
then be fetched and verified directly.

## Rules of evidence (RULE 2 applies)

- Every fact carries a verbatim quote (≤50 words) from a page the researcher actually fetched,
  plus a full citation with URL and access date.
- A source that could not be fetched is an **unverified lead**, listed separately, never a
  citation.
- Conflicts between sources are reported, never resolved.
- "Nothing reliable found" is a valid and useful result. Nothing is filled from general
  knowledge.

## File template

```
# <exact sheet Name>
file_slug / researched date / batch

## Verified findings   (fact + quote + full citation + reliability class)
## Conflicts           (or "None found.")
## Unverified leads    (title + URL only)
## Acquisition leads   (full-text scans relevant to this site — for the Saifullah book list)
## Verdict             STRONG (≥2 independent verified sources) / PARTIAL / NOTHING RELIABLE FOUND
```

## Downstream

Findings rated STRONG/PARTIAL get folded into a `data/patch_web_research.csv`
(id, Description, qa_note — full-Description replacement against the live sheet, additions
only, conflicts flagged in qa_note per the both-accounts editorial decision of 16 Aug).
