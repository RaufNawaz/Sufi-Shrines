# Bhai Waliram Darbar
bhai-waliram-darbar / researched 16 August 2026 / batch E

## Verified findings

1. **Nanakpanthi saint; darbar located in Digano Mahesar village, Miro Khan taluka (Sindh).**
   Quote: "Bhai Waliram was another famous Nanakpanthi saint who established his darbar in Digano Mahesar village in Miro Khan taluka."
   Citation: Zulfiqar Ali Kalhoro, "Nanakpanthi Saints of Sindh", *The Friday Times*, 13 April 2018, https://www.thefridaytimes.com/13-Apr-2018/nanakpanthi-saints-of-sindh, accessed 16 August 2026.
   Reliability: established press (The Friday Times); author is an anthropologist at PIDE.

   This is the article's entire coverage of the site — it gives **no dates, no urs/festival, no building description, and no district name**. The town question posed for this entry resolves, on this source, to: village Digano Mahesar, Miro Khan taluka. Which district Miro Khan taluka falls in (secondary sources point to Kamber-Shahdadkot) was **not** verified from a citable fetched page and is left open.

## Conflicts

None found (only one citable source located).

## Unverified leads

- "Nanakpanthi Saints of Sindh", The Free Library mirror — https://www.thefreelibrary.com/Nanakpanthi+Saints+of+Sindh-a0534655445 (HTTP 403; indexes the same Friday Times article)
- "Nanakpanthi Saints of Sindh", PIDE republication page — https://pide.org.pk/research/nanakpanthi-saints-of-sindh/ (HTTP 403)
- "Nanakpanthi Saints of Sindh", PIDE PDF — https://file.pide.org.pk/pdfpideinpress/nanakpanthi-saints-of-sindh.pdf (downloaded; image-only scan, text not machine-verifiable — same article)
- "Kamber Shahdadkot Brief District Profile", RSPN — https://rspn.org/success/wp-content/uploads/2016/05/Kamber-District-profile.pdf (for locating Miro Khan taluka; not fetched)

## Acquisition leads

**Checked 16 August 2026:** *Gazetteer of the Province of Sind, "B" Volume III — Sukkur District* (1919, archive.org `in.ernet.dli.2015.34603`) was fetched in full and searched for "Waliram"/"Wali Ram"/"Digano"/"Miro Khan" — zero hits. This is a scope miss, not a content gap: the book's own administrative history (p.40) states that in 1901 the Larkana, Ratodero, Kambar, Labdarya, Mehar, Warah and Kakar talukas — including Miro Khan taluka, where this darbar is placed — were separated from Sukkur/Shikarpur territory to form the new Larkana district, 18 years before this volume was compiled. The Larkana "B" volume gazetteer (already on the acquisition list below) is the correct target, not this one.

- *Gazetteer of the Province of Sind, B volume — Larkana district* (Miro Khan taluka was historically in Larkana district) — HathiTrust catalog record: https://catalog.hathitrust.org/Record/012154441
- *Gazetteer of the province of Sind vol. IV*, 1927 — archive.org identifier `in.gov.ignca.30452` (full text downloadable; metadata does not name the district — confirm on download whether this is the Larkana B volume)
- *A Gazetteer of the Province of Sind*, 2nd ed., 1876 — archive.org identifier `wbsl.16342`

## Verdict

**PARTIAL** — one verified citable source (Kalhoro, The Friday Times 2018) establishing the saint's Nanakpanthi identity and the darbar's village/taluka; nothing further found. Repeated query variants (Waliram / Wali Ram, Digano Mahesar, Miro Khan) surfaced only mirrors of the same article.

---

## Follow-up: *Gazetteer of the Province of Sind*, Larkana District volume (archive.org `in.gov.ignca.30452`) — 5 September 2026

Fetched the full text (file `30452_djvu.txt`, via https://archive.org/download/in.gov.ignca.30452/30452_djvu.txt, 22,499 lines). The title page confirms this is the correct book — the one this file's own acquisition leads pointed to after the 1919 Sukkur volume proved to be the wrong scope:

"Gazetteer ol thA Province of Siu(i ... Volume ... Liirkrtija District" [OCR-garbled rendering of "Gazetteer of the Province of Sind ... Volume ... Larkana District"]

Citation: *Gazetteer of the Province of Sind*, Larkana District volume (Bombay: Government Central Press, 1927), title page, full text via Internet Archive, https://archive.org/details/in.gov.ignca.30452, accessed 5 September 2026.

The scan's OCR is severely degraded throughout, not only in the title shown above — a sampled body paragraph, almost certainly the district's own taluka list, reads "nt4 JaiiritAjut, Kjuubafr Ratodw iiud Mimkkiu" where it should give Larkana, Kambar, Ratodero and other taluka names. A direct keyword search for "Waliram," "Wali Ram," "Digano," and "Miro Khan"/"Mirokhan" returned zero matches, as did "Larkana," "Kambar/Qambar," "temple," "mandir," "Hindu," and "darbar" generally — but given the demonstrated OCR quality, a zero-match keyword search cannot be read as "not mentioned" here. A follow-up AI-assisted fuzzy read of the same text, asked specifically whether any garbled passage plausibly matched "Bhai Waliram," "Digano Mahesar," or "Miro Khan taluka," also came back negative but explicitly qualified: "the text is too corrupted to identify this reference with confidence." Archive.org's own search-inside index returned `{"error":"No hOCR or Abbyy file present"}` for every query tried against this item, so no better-indexed alternative was available.

This is an **unreachable lead, not a checked-and-silent one**: the correct book has been identified and downloaded, but this particular scan cannot be read reliably enough, by keyword or by fuzzy reading, to say whether it mentions Bhai Waliram, Digano Mahesar, or Miro Khan taluka at all. (A cleaner copy may exist — the acquisition list's own HathiTrust catalog record, https://catalog.hathitrust.org/Record/012154441, was not checked in this pass.)

### Revised verdict
PARTIAL — unchanged. The Larkana volume was located and confirmed as the correct book, but could not actually be read; recorded here so the next person does not re-download and re-diagnose the same OCR failure.

---

## Re-verification against the complete text — 5 September 2026

Re-fetched `in.gov.ignca.30452` with `pipeline/fetch_archive_text.py`, which resolves the real
filename through the item's own metadata rather than a guessed URL: **151,574 bytes** — this
matches the previous follow-up's own 22,499-line download (that pass already used the raw
`archive.org/download/.../30452_djvu.txt` URL and got the complete file; the byte count is now
independently confirmed by the tool this whole audit is standardised on). **This is not a
WebFetch-truncation case** — the full book was searched both times, by two different tools.

Re-ran the literal terms (`Waliram`, `Wali Ram`, `Digano`) — zero hits, as before — and added a
battery of short fuzzy fragments per this audit's method: `lira`, `esar`, `igan`, `irokh`,
`miro`, `ilay`. All zero or noise-only (the one `lira` hit is "'tMlira" inside an unrelated
garbled word). The book's OCR does render *some* proper nouns legibly once the pattern is loosened
past exact spelling — a fuzzy search for `arka` (not tried in the earlier follow-up, which only
tried literal "Larkana") surfaces "LARKAKA" and "IjarkAna," and a fuzzy search for `amb`/`kam`
surfaces "Kambat," "Kamhjir," "Kamdii" — confirming this is genuinely the right district volume
and that the earlier follow-up's zero-match literal searches for "Larkana"/"Kambar" understated
what the scan actually contains. But a parallel check for baseline religious vocabulary a
gazetteer's population/temple sections would be expected to use somewhere — `Nanak`, `Guru`,
`dharam`, `sadhu`, `yogi`, `tapedar`, `Hindu`, `Sikh`, `darbar` — returned **zero hits for every
one of these**, fuzzy or literal, despite the book having extensive census and social content.
That absence of even generic religious words, not just the site-specific ones, is the real tell:
the pages that would carry this content are not silent on Bhai Waliram, they are illegible to
keyword search of any kind, positive or negative.

Citation: *Gazetteer of the Province of Sind*, Larkana District volume (Bombay: Government
Central Press, 1927), full text via Internet Archive, https://archive.org/details/in.gov.ignca.30452,
accessed 5 September 2026 (151,574 bytes, complete text confirmed via
`pipeline/fetch_archive_text.py --list`).

### Revised verdict
PARTIAL — unchanged, but reclassified. Confirmed **not** a truncation artifact: the full
151,574-byte text was searched, twice, by two different tools. It is a genuine scan-quality dead
end — the OCR is degraded enough that even words independently known to occur in the book
(Larkana, Kambar) survive only as fragments under a loosened pattern, and generic religious-site
vocabulary does not survive at all — so no reliable positive or negative can be drawn about Bhai
Waliram from this particular digitization. The HathiTrust record already on the acquisition list,
not a further re-fetch of this same scan, is the only path forward.
