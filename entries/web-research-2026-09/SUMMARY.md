# Web-research pass, September 2026 — what it found

**40 entries researched, 22 STRONG, 18 PARTIAL, none returned empty-handed.** Ten agents, two
waves plus two follow-up passes over the August 2026 corpus. Method, reliability bar and file
template are in `README.md`; the targets and their pre-pass measurements are in `targets.tsv`
and `targets_wave2.tsv`.

Recompute the tally rather than quoting this line — a verdict is a measurement with a date on
it, and this file will be read after it stops being true:

```bash
python3 pipeline/check_research_files.py entries/web-research-2026-09     # structural gate
```

## How the targets were chosen

Not by impression. `pipeline/build_research_batch.py --rank` ranks every row of a live sheet
export by **prose word count** (everything before the first bibliography heading) and
**citation count** (`- ` lines after it). Against `data/live_sheet_2026-09-05.csv` the archive's
thin tail is about 40 entries; the August 2026 pass had already covered 40 *different* ones, so
the frontier was the thinnest entries nobody had researched. The cut fell at 500 prose words —
below that, entries sit at 250–450 words on one or two citations; above it they carry 500+ on
four or five, which is a different problem. The thinnest was Gurdwara Chowmala Sahib, 164 words
on 2 citations.

## The finding that matters most is about an instrument, not a shrine

**`WebFetch` silently truncates a large archive.org `_djvu.txt` at roughly 25 pages and reports
success.** And the URL pattern every previous session used —
`archive.org/download/<id>/<id>_djvu.txt` — returns a **146-byte nginx 404 page** on many items,
because the text file is named after the *scanned file*, not the identifier.

Either failure turns a book that was never read into a confident "the source does not mention
this". In this session it did worse than that: a follow-up agent, searching what it believed was
the full 1962 Department of Archaeology register, could not find "Plate No. 57" or a plate
caption reading "Gurdwara at Mansehra", and **retracted a correct August finding**, recording it
as a possible misreading. The plate pages are at book page 117. Everything it searched was front
matter.

Retrieved properly the book is 124,926 bytes and the caption reproduces exactly, confirmed two
independent ways — the plate sequence itself (`Gurdwara at Mansehra / PLATE NO. 57. / 117`,
correctly between Bhai Bannu at 56 and Bhai Phero at 58) and the front list of illustrations,
anchored by its own surviving numeral "59. Gurdwara at Kahna". The retraction is corrected in
`gurdwara-chhevin-patshahi-chitti-gatti.md`, with the wrong version kept and marked, because the
failure is more instructive than the fact.

The fix is `pipeline/fetch_archive_text.py`, which resolves the real filename through
`https://archive.org/metadata/<identifier>`, downloads the complete text, caches it, and prints
the byte count so a short retrieval is visible:

```bash
python3 pipeline/fetch_archive_text.py <identifier> --list
python3 pipeline/fetch_archive_text.py <identifier> --grep 'PATTERN' --context 3
```

**Every source three agents reported as unreachable retrieves in full:** Larkana "B" gazetteer
`in.gov.ignca.30452` (152 KB), Sialkot 1920 `in.gov.ignca.30718` (501 KB), Lahore 1893-94
`in.ernet.dli.2015.105616` (1.1 MB), Cousens's *Antiquities of Sind* `in.ernet.dli.2015.200876`
(603 KB), Qaiser `HistoricalSikhShrinesInPakistan` (376 KB), the 1962 register
`furg-sikh-shrines-in-west-pakistan-by-khan-mohammad-wal` (125 KB).

Two corollaries, both learned the hard way here:

- **Grep; do not summarise.** Asking a fetch tool to reconstruct a list produced three mutually
  contradictory answers from one document. Literal substring search produced the right one.
- **Probe fuzzily before accepting a negative.** Colonial gazetteer OCR renders "Sialkot" as
  "Sit'd kot" and "Larkana" as "Liirkrtija". Search a bare surname or a three-letter fragment,
  and grep a term that *must* be present to prove the book is the right one.

### The audit of the negatives, and what it cost

Every negative in both passes that rested on an archive.org scan was re-run against the
complete text. **Three of ten were artefacts of the truncating fetch** — real, findable content
that the earlier pass never saw:

- **Gurdwara Baoli Sahib** gained a fourth independent source, the 1893-94 Lahore gazetteer
  (1,126,974 bytes): *"The well is said to have been dug by Arjan, the fifth Sikh Guru; the
  superstructure was built by Ranjit Singh."*
- **Taunsa Sharif** went **PARTIAL → STRONG** on the Dera Ghazi Khan gazetteer (628,749 bytes),
  which dates the shrine's construction to 1272 A.H., names the Nawab of Bahawalpur as patron,
  gives the cost, and names the 1897 custodian.
- **Sakhi Sarwar** was substantially strengthened from the same volume — and sharpened: its
  "1220 A.D." attaches to the saint's **father's** migration, not to the saint.

Six were genuine to begin with, and are now confirmed against a stated byte count so nobody
reads them a third time — the three Larkana darbars (the scan is genuinely illegible, not
truncated), Kalat, *Shikarpur Heritage*, and the 1919 Sukkur gazetteer, whose verdict on
Asudaram's town is its own kind of evidence: *"Pano Akil. Apart from its position as the
headquarters of a taluka, the place is of no importance."*

The tenth, Allo Mahar, is the subtle case: the underlying negative held, but the *framing* — "the
scan is unreachable" — was itself a truncation artefact. Three Sialkot scans have now been read
in full and the district's own shrine inventory names Pir Bawar Nath at Salhoke and Kala Mahr at
Marana while never mentioning Allo Mahar.

### One defect the audit itself introduced

Two files quoted **normalised** OCR inside blockquotes, as if verbatim. The readings were
correct, but the scan actually says "liandsomeat slitino" where the file says "handsomest
shrine". That is unfalsifiable in the wrong direction: a reader who greps the source finds
nothing and cannot distinguish a good reading from a fabrication — the calling session nearly
drew exactly that conclusion while verifying the verdict upgrade. Both files now carry the raw
string beside the reading, and `README.md` carries the rule.

## Results worth carrying forward

**The archive's only entry that cites nothing now has a citable source.** Sant Baba Asudaram
Darbar, Panno Aqil — NOTHING RELIABLE FOUND in August — is upgraded to PARTIAL on
**Encyclopedia Sindhiana entry no. 3866**, published by the Sindhi Language Authority, a
statutory body of the Government of Sindh. Born c. 1895 at Alam Khan Jatoi village, thirteen
years with his murshid Sant Satram Das, aastan built 1940 and completed 1942, died 4 September
1960 aged 64. What changed was method: August tried a search-engine-supplied article URL that
silently resolved to the encyclopedia's homepage; this pass used the encyclopedia's own
**alphabetical browse**. The source was independently confirmed to resolve (HTTP 200, opening
Sindhi text matching) before this was written down.

*Note precisely what this does and does not do: CLAUDE.md's standing finding that exactly one
entry cites nothing remains true of the live sheet, and stays true until the patch is imported.*

**Allo Mahar's gazetteer negative is now real.** The 1920 Sialkot gazetteer, read complete
(501 KB), contains zero occurrences of "Allo" and zero of "Channan"/"Chanan", while "Daska"
occurs 36 times with substantial tehsil content. Previously this was recorded as *unreachable* —
the manual read the acquisition list called for had never actually happened. It has now.

**One identity question settled, one deliberately not.** Qaiser (p. 296) and the 1962 register
(entries 4 and 8) independently place Amar Sadhu at Kot Lakhpat and Hadiara at Police Station
Barki — **distinct sites**, which upgraded `gurdwara-patshahi-chhevin-hadiara-lahore` to STRONG.
By contrast the Chitti Gatti plate question stays open on purpose: the caption is verified to
read "Gurdwara at Mansehra", but a caption naming a town is not an identification of a building,
and it may show the separate 1905 Sri Guru Singh Sabha. The register's index does give identical
page references (49, 62) for "Chitti Gatti, Gurdwara" and "Mansehra, Gurdwara", which raises the
likelihood without establishing it.

**Provenance corrections, where a second source turned out not to be independent.** Cousens's
1929 passage on Gori Temple was recovered at p. 177 — the August keyword search missed it
because the OCR reads "GORlj" — and it now appears that EFT Sindh's damage account and 1715
repair date **derive from that 1929 text** rather than corroborating it. Two sources that agree
because one copied the other are one source.

## Data-quality findings, verified against the sheet

Each of these was checked against `data/live_sheet_2026-09-05.csv` directly rather than relayed:

- **Syed Musa Pak** — `year_built` is `1592 circa` and `figure_died` is **empty**; Auqaf's own
  page gives 1592 as the year of the saint's *martyrdom*. A death year in a construction column.
- **Abdullah Shah Ghazi and Pir Mangho** — the only two rows in the archive carrying
  `year_built 773`, both `circa`, neither `year_built_note` mentioning the date. No source found
  supports an 8th-century date for Pir Mangho.
- **Shah Rukn-e-Alam** — `year_built 1330` compresses two separately dated events in Auqaf's
  account: construction 1320–1324 under Ghiyas-ud-din Tughlaq, hand-over for burial in 1330.
- **Shah Shams-ud-Din Sabzwari** — the entry's `figure_died 1276` matches a 2024 peer-reviewed
  article; Auqaf's official page says 757 AH/1356. Eighty years apart, both citable.
- **Sialkot** — a citable source (Odishabytes, 2020) states the Jagannath temple "was also known
  as Shawala Teja Singh Temple", while the archive publishes these as two entries **1,084 m
  apart**, in different mohallas, with different deities (Lord Jagannath / Shiva) and different
  dates (2007 / blank).

### Rulings from Rauf, 5 September 2026

Asked and answered in the session, per RULE 5 — recorded here, not parked here:

1. **Misplaced values move; unsupported values stay.** Relocate a value only where a cited
   source places it in a different field — so Musa Pak's 1592 moves from `year_built` to
   `figure_died`. Leave `773` and anything else merely unsupported exactly where it is, flagged
   in `qa_note`. The principle: fix what a source proves, touch nothing a source is only silent
   about.
2. **The Sialkot pair stays two entries, cross-referenced.** Note in each that a published source
   equates them while the archive's own coordinates, deities and dates say otherwise. Report the
   conflict without implying the archive is wrong.

## Known gaps in this pass

- **The WebSearch budget (200 calls) is shared across concurrent agents and was exhausted**
  partway through the later batches. Taunsa Sharif specifically never reached the
  Gilmartin/Ansari literature. A thin result from a late batch may be a budget artefact, not an
  evidentiary one — re-run before concluding a source does not exist.
- **Several established outlets refuse `WebFetch` outright**: `tribune.com.pk` (every variant,
  reported independently by three agents), `brecorder.com`, `dailytimes.com.pk`,
  `profit.pakistantoday.com.pk`, `bbc.com`, `samaaenglish.tv`, and `web.archive.org` entirely.
  Express Tribune was the one source that could have settled Shah Noorani's 1449-vs-1494 arrival
  date. These are technical gaps recorded as unverified leads — **not** absence of sourcing.
