
### 9.223 — 22 September 2026: schimmel_as_through_a_veil noted 16/16 AND consolidated (the corpus's first Pass 2), the folio is recoverable at scale for the first time, and ruling (a) silently blinded the id check

**Section numbering.** The largest number before this append was **222**; `### 9.216` and `### 9.222`
each appear twice. Checked by sorting, not by reading the end of the file.

**What this run did.** Priority 118 `schimmel_as_through_a_veil` (Annemarie Schimmel, *As Through a
Veil: Mystical Poetry in Islam*, Columbia University Press, 1982, 382 pp., **text_layer**) went from
**0/16 to 16/16 chunk notes and then through Pass 2 to `summarized`** — the first Pass 2 in the
project's history, and the seventh book to reach the end of the pipeline. Pass 1: 7,076 lines /
620,781 bytes, 2,781 page references, 1,010 `[text-layer?]` flags, `check_note_ids.py` exit 0 over
93 distinct archive ids. Pass 2: `entries/book_takeaways/schimmel_as_through_a_veil.md`, 2,952 lines,
1,433 page references, **all 93 ids carried through with zero loss**, `Reviewed: no.` intact.

**Pass 2 was unblocked by Rauf's 21 September rulings and by one more he gave on 22 September: a
PERSON who is principal figure of many rows takes ALL of them**, exactly as a toponym does (Guru
Nanak 18, Shiva 8). `TAKEAWAYS_PROTOCOL.md` is updated and **now contains no interim rule at all** —
every mapping question in it is ruled. Rauf also confirmed ruling (a) is meant to be heavy: "yes
lahore will be heavy".

## The folio: the first book in the corpus worth asserting one for

**2,651 of Pass 1's 2,781 page references carry a real folio.** `abbas` asserted zero. The folio sits
**inside the running-header line** — leading on verso, trailing on recto. Zero exceptions on the 340
of 382 pages that carry one: **PDF 12-128 -> folio = PDF - 10; PDF 137-382 -> folio = PDF - 18**;
PDF 1-11 is roman front matter.

**The offset does not step arbitrarily: -18 is -10 minus eight, and the eight are PDF 129-136, an
unpaginated PLATE insert.** The transcription writes `[blank page]` for all eight; `pdfimages -list`
shows each carries a full-page 300 dpi RGB image. **`[blank page]` can mean a picture, not an empty
page** — check with `pdfimages` before believing it. The other nine blanks are genuine.

**The parity rule is a free self-check and held 340/340**: a leading folio is always even, a trailing
folio always odd. It needs no page image, only the book's own typography. **This is the cheapest
folio guard found so far — try it on every book before anything more expensive.**

**Three-digit folios are split by a space** (`1 10`, `12 1`, `35 6`) — the same hundreds-digit class
as khulasat in §9.222, in a different book, script and route. **Treat split digits as a corpus-wide
default.** A `\d{1,3}` regex found 4 folios in 382 pages; a tolerant one found 340.

## The damage: all transliteration destroyed, but the digits survive

Zero macrons, dots-below, ayn or hamza in 764,603 characters. ayn -> `c`, `e` or `<`; i-macron -> `f`
or `r`; final a-macron -> `ii`; h-dot -> `IJ`; s/d/z/t-dot -> `$` or U+FFFD (300); **`m` <-> `rn` both
ways, corrupting ordinary English** (`Rurni`, `modem` for modern); German u/o-umlaut -> `ii`/`o`/`D`/`O`;
`Th` -> `171`. Systematic but **not** reversible token by token, so full inline treatment, not the
ligature exemption. **Unlike abbas the body digits survive** — dates are quotable. But index and
endnote locators are destroyed (`n` -> `0`/`"`/`}`, the `/` inside a locator vanishing), so **no
locator may ever become a `(p. N)`**. Arabic/Sindhi original script survives only as 181 fragments
and was not reconstructed — **TAKEAWAYS_PROTOCOL's "quote the original script" needs a
recoverability caveat.**

## Ruling (a) opened a FOURTH blind spot in check_note_ids.py, and it reported green

A bullet head can now carry 35 ids (Lahore), which wraps. The script read **line by line**, so on
chunk 003 it validated the 3 ids on the first physical line, was blind to the other 28, and printed
"OK — every bullet-head id resolves" at **exit 0**. Measured: **12 ids seen where a
continuation-aware scan sees 44.** Fourth instance of that file's own docstring lesson, and the first
where the blind spot was opened by a change in the **writing convention** rather than a bug in the
pattern — **a ruling can invalidate a check.** Fixed (`logical_lines` joins continuation lines) and
**proved by planting a fabricated id on a continuation line: exit 2** where the old version passed.

## The toponym map undercounted the two largest places, and a second extraction bug nearly cost Pass 2

A comma split requiring an exact token misses any row mixing the place with prose (four Lahore rows
end `Lahore.` or `Lahore —`): **Lahore is 35, not 31; Karachi 11, not 9; Islamabad 4.** Five workers
caught it independently, but three chunks were noted against three different Lahore sets (31/35/36)
before the fix; Pass 2 reconciles to 35. **`location_short` is truncated at 60 chars on 49 of 169
rows, so the ruling-(a) join is lossy by construction.** Rauf ruled 22 Sep: **regenerate that column
at full length** rather than hand-patching. `darbar-malik-ahmad-ayaz` is the known casualty and is
deliberately off the Lahore line.

**The second bug, in this run's own Pass 2 tooling:** the script cutting notes into per-section
sources split on `'## ' + name` **anywhere in the text**, and several notes files contain inline
references like "See `## Doubts` for..." inside a bullet. Measured: the **Doubts** extract captured
**41,567 of 172,618 bytes** and was wrong for 14 of 16 chunks; **Arguments** lost 27 KB across chunks
001/011/016; **Practices** was wrong on chunk 010. Citable, Other and all five archive-section
extracts were byte-identical either way, so the 21 id subsections were never at risk. **A worker
caught it, reported its source was broken, and read the 16 notes files directly instead of
consolidating what it was handed** — the behaviour the protocol wants. Arguments and Practices were
re-run against line-anchored extracts, recovering 47 bullets including the whole Introduction.
**Same lesson as the id check, twice in one run: anchor a pattern on position, not on the shape of a
string.** A heading regex must be `(?m)^## `.

## Pass 2's one structural decision

The protocol says one subsection per archive id. Under ruling (a) that is 93 subsections, 72 saying
only that Lahore appears somewhere. The file instead carries **21 `###` subsections for ids with
site-specific material**, ordered by volume, plus a **`## Place-level material` section by place**
naming every row it attaches to. Nothing dropped, every id attached, substantive rows not buried.

**What the consolidation found.** Two ids carry a fifth of the file (`bhit-bhit-shah`,
`mazar-e-iqbal`); eleven of twenty-one are under 2 KB. **Almost all place-level attachment is a
publisher's address** — every Islamabad and Karachi occurrence, and Lahore but for two topical facts
(Hujwiri's last years, p. 61; Madho Lal Husain's tomb at Shalimar, pp. 170-171). Chunk 009's whole
35-row Lahore attachment rests on the single imprint "(Lahore, 1932)". **Multan is the one
substantially topical place.** **`mazar-e-iqbal` has no shrine evidence at all** — no tomb, burial
place or silsila anywhere; twelve of its bullets are Lahore imprints. **The shrine economy is absent
from 382 pages** — no langar, land, revenue, Auqaf or sajjada nashin; what the book has instead is a
publishing infrastructure and a performance economy.

## What a human must check

- **Seven death years disagree with the archive** — Bullhe Shah 1754 vs 1757, Sachal 1826 vs 1827,
  Fariduddin Ganj-i Shakar 1265 vs 1266, Madho Lal Husain 1593 vs 1599, Hujwiri c. 1071 vs 1072, plus
  Lal Shahbaz Qalandar and Waris Shah given only a century. **Seven others agree exactly**, which
  makes the disagreements harder to dismiss. Printed index headwords in a 1982 monograph, not damage.
- **Shah Abdul Latif's 1752 exists only in the index** (p. 349); every body passage says not stated.
- **`5` is printed for `S` in the abbreviations key** (p. 232) and `S` is the siglum for Brockelmann's
  supplements throughout the notes — a mis-key that yields a plausible but wrong citation silently.
- **Sorley's forename prints as both "Henry T." and "Herbert T."** (p. 283 vs p. 340).
- **PDF 379-382 are not Schimmel's book** — a digitiser's Sindhi appendix, "The Reading Generation".
- p. 220's arithmetic impossibility; two destroyed Koranic verse numerals; five bibliography entries
  where the repeat-author dash fails so attribution is positional, not printed.

## Process

**The bridge went down at 05:07Z and stayed down for about twelve hours.** Everything was staged into
the container before the first worker launched, so **no worker ever touched it** and the outage cost
nothing but the write-back, which completed at 17:3xZ: 36 files, zero rejected, 16/16 `cmp`-identical
across both canonical locations, `notes-status` 16/16, `check_note_ids` exit 0.

**A coordinator error worth recording:** wave-3 workers were told to read "BRIEF.md 7 and 8".
There was no section 8. Two of four said so explicitly and noted against 1-7, which cost nothing. A
brief citing a section it does not contain invites a worker to hallucinate it; the flag was right.

**Scheduled tasks restructured, at Rauf's instruction.** The notes task is now
**"Sufi-Shrines book queue — transcription + notes (hourly)"**, `5 * * * *` (was `5 1-23/3 * * *`),
with a **fully rewritten prompt covering both stages, transcription first**. The old
"advance the transcription front" task is renamed `[SUPERSEDED 22 Sep ...]` and left disabled — it had
been **disabled AND failing since 21 Sep**, which is why thousands of pages sat untouched while the
notes prompt described it as live at `35 * * * *`. **Rauf's stated order, 22 Sep: finish transcription
on all books except the 5 skipped, then notes, then shrine entries.**

**Next: transcription.** 29 of 42 books fully transcribed, 8,982 of 13,926 pages. Outstanding:
tahqiqat_chishti (300/873), khulasat_ut_tawarikh (330/610), masnavi_01_text (0/416), masnavi_02
(0/366), masnavi_03 (0/462), masnavi_04 (0/374), masnavi_05 (0/432), masnavi_06 (0/542) — **3,445
pages actually left**, not the 4,075 the old prompt quoted, which was the total page count of those
eight books and never subtracted the 630 already done. Notes stage: 6 books left, all transcribed.
