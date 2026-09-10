# Swami Dharmdas Darbar, Larkana (Kennedy Market)
swami-dharmdas-darbar-larkana-kennedy-market / researched 16 August 2026 / batch E

## Verified findings

1. **Nanakpanthi darbar founded in Kennedy Market, Larkana, by Swami Dharmdas.**
   Quote: "Swami Dharmdas who founded a darbar in Kennedy Market in Larkana."
   Citation: Zulfiqar Ali Kalhoro, "Nanakpanthi Saints of Sindh", *The Friday Times*, 13 April 2018, https://www.thefridaytimes.com/13-Apr-2018/nanakpanthi-saints-of-sindh, accessed 16 August 2026.
   Reliability: established press (The Friday Times); author is an anthropologist at PIDE.

2. **Lineage and earlier darbar.**
   Quote: "Swami Dharamdas was a disciple of Sant Bhai Wasan Shah in Rohri. First, he established a darbar in Mena village and later in Larkana."
   Citation: Kalhoro, *The Friday Times*, 13 April 2018 (as above), accessed 16 August 2026.
   (Note: the article spells the name both "Dharmdas" and "Dharamdas" and treats them as the same person.)

   This is the article's entire coverage — it gives **no dates, no urs/festival, and no building description** for the Larkana darbar.

## Conflicts

None found (only one citable source located). One point to watch for the book pass: fetched reference material on Kennedy Market itself (Wikipedia pointer, not citable) dates the market's opening to 1964 — how a darbar was "founded in Kennedy Market" relative to that date (darbar older than the market's name, or established after 1964) is unexplained by any fetched source.

## Unverified leads

- "Swami Dharamdas Darbar" Facebook page — https://www.facebook.com/SwamiDharamdasDarbar/ (not citable; suggests an active devotional community)
- "Nanakpanthi Saints of Sindh", The Free Library mirror — https://www.thefreelibrary.com/Nanakpanthi+Saints+of+Sindh-a0534655445 (HTTP 403)
- "Nanakpanthi Saints of Sindh", PIDE PDF — https://file.pide.org.pk/pdfpideinpress/nanakpanthi-saints-of-sindh.pdf (downloaded; image-only scan, text not machine-verifiable — same article)
- "Historical Kennedy Market Tower in Larkana being destroyed", *Daily Times* — https://dailytimes.com.pk/24777/historical-kennedy-market-tower-in-larkana-being-destroyed/ (HTTP 403; Kennedy Market context)
- Wikipedia, "Kennedy Market" — https://en.wikipedia.org/wiki/Kennedy_Market (pointer only)

## Acquisition leads

- *Gazetteer of the Province of Sind, B volume — Larkana district* — HathiTrust catalog record: https://catalog.hathitrust.org/Record/012154441 (predates Kennedy Market; useful for Larkana's darbars and dharamshalas generally)
- *Gazetteer of the province of Sind vol. IV*, 1927 — archive.org identifier `in.gov.ignca.30452` (full text downloadable; metadata does not name the district — confirm on download whether this is the Larkana B volume)
- *A Gazetteer of the Province of Sind*, 2nd ed., 1876 — archive.org identifier `wbsl.16342`

## Verdict

**PARTIAL** — one verified citable source (Kalhoro, The Friday Times 2018) establishing the founder, his lineage (disciple of Sant Bhai Wasan Shah of Rohri), the earlier Mena village darbar, and the Kennedy Market location; no second independent source and no dates found despite repeated query variants (Dharmdas/Dharamdas/Dharam Das, Kennedy Market, Larkana darbar).

---

## Follow-up: *Gazetteer of the Province of Sind*, Larkana District volume (archive.org `in.gov.ignca.30452`) — 5 September 2026

Fetched the full text (file `30452_djvu.txt`, via https://archive.org/download/in.gov.ignca.30452/30452_djvu.txt, 22,499 lines). The title page confirms this is the correct book:

"Gazetteer ol thA Province of Siu(i ... Volume ... Liirkrtija District" [OCR-garbled rendering of "Gazetteer of the Province of Sind ... Volume ... Larkana District"]

Citation: *Gazetteer of the Province of Sind*, Larkana District volume (Bombay: Government Central Press, 1927), title page, full text via Internet Archive, https://archive.org/details/in.gov.ignca.30452, accessed 5 September 2026.

As with the other two Larkana-district entries checked this session, the scan's OCR is severely degraded (the title itself is barely legible; sampled body paragraphs are mostly unreadable character salad). A direct keyword search for "Dharmdas," "Dharamdas," "Kennedy," and "Mena" returned zero matches, as did "Larkana" and "market" generally. A follow-up AI-assisted fuzzy read of the same text, asked specifically whether any garbled passage plausibly matched "Swami Dharmdas," "Kennedy Market," or an earlier darbar in "Mena village," also came back negative, qualified as: "the OCR degradation makes it impossible to extract reliable information about specific Nanakpanthi religious sites." Archive.org's search-inside index has no index built for this item (`"error":"No hOCR or Abbyy file present"`).

This is an **unreachable lead, not a checked-and-silent one**: the correct volume has been identified and downloaded, but cannot be read reliably enough to confirm or rule out a mention of Swami Dharmdas, Kennedy Market, or Mena village. (The acquisition list's HathiTrust catalog record for the same volume, https://catalog.hathitrust.org/Record/012154441, was not checked in this pass and may hold a cleaner scan.)

### Revised verdict
PARTIAL — unchanged. The Larkana volume was located and confirmed as the correct book, but could not actually be read; recorded here so it is not re-attempted blind.

---

## Re-verification against the complete text — 5 September 2026

Re-fetched `in.gov.ignca.30452` with `pipeline/fetch_archive_text.py`: **151,574 bytes**, matching
the previous follow-up's own 22,499-line download of the same identifier. **This is not a
WebFetch-truncation case** — both sessions retrieved the complete text.

Re-ran the literal terms (`Dharmdas`, `Dharamdas`, `Kennedy`, `Mena`) — zero hits, confirmed
again — and added fuzzy fragments: `harm` (for Dharmdas/Dharamdas) and broader vocabulary checks
shared with the other two Larkana-district entries in this batch (`Nanak`, `Guru`, `dharam`,
`sadhu`, `yogi`, `tapedar`, `Hindu`, `Sikh`, `darbar`) — all zero, fuzzy or literal. As with the
Bhai Waliram file (same book, same session), a loosened pattern for known place names *does*
surface fragments — `arka` for Larkana ("LARKAKA," "IjarkAna") and `amb`/`kam` for Kambar
("Kambat," "Kamhjir") — confirming the district is right, while the specific site vocabulary
remains unrecoverable at any pattern width tried.

**One additional, independent reason this book cannot settle the question, regardless of OCR
quality:** the file's own Conflicts section already notes a fetched (if uncitable) pointer that
Kennedy Market's own name dates to 1964. This gazetteer's title page reads 1927, thirty-seven
years earlier. Even a perfectly clean scan of this edition could not confirm or rule out a darbar
"founded in Kennedy Market" under that name, because the market did not yet carry that name when
this book was compiled — the same structural reason the 1919 Sukkur gazetteer was ruled out for
other entries in this batch, here applying to the *market's name* rather than the district
boundary.

Citation: *Gazetteer of the Province of Sind*, Larkana District volume (Bombay: Government
Central Press, 1927), full text via Internet Archive, https://archive.org/details/in.gov.ignca.30452,
accessed 5 September 2026 (151,574 bytes, complete text confirmed via
`pipeline/fetch_archive_text.py --list`).

### Revised verdict
PARTIAL — unchanged, but reclassified. Confirmed **not** a truncation artifact: the full
151,574-byte text was searched. The scan-quality dead end stands as before, and is now
compounded by a scope problem independent of OCR quality — the 1927 volume predates the market's
own 1964 name, so it could not answer this file's central question even if perfectly legible.
