#!/usr/bin/env python3
"""Check that a book's printed folios step by exactly one between adjacent transcribed pages.

Why this exists
---------------
On 18 September 2026 six workers transcribed `khulasat_ut_tawarikh` pp. 99-164 independently, each
reading the printed folio off its own pages, none told the relation the earlier batch had established.
All 66 agreed with each other and **all 66 were wrong by exactly 100**: they read the Nastaliq ۴ as ۳,
so p0099 came back as folio 390 instead of 490. A run of 66 self-consistent folios passes every
internal test there is. `check_folio_direction.py` fitted them happily — "descending, k=489, 66/66,
no deviation" — and exited 0, because a whole range misread by a constant still fits a line. Its own
docstring says so; that limit was real and this is the tool that covers it.

What actually caught the error was the **join to the batch next door**: the page before, transcribed
in an earlier run, carried folio 491, and 491 -> 390 is a 101-folio jump at a boundary where the
sentence runs straight on. So the signal is not the fit, it is the **discontinuity against
neighbouring work**. Nothing in the pipeline looked for that. This does.

It fits the same two models as `check_folio_direction.py` over whatever range you give it, then walks
every transcribed page in PDF order and reports each adjacent pair whose folios do not differ by 1 in
the direction the winning model implies. Gaps in the transcribed set are skipped silently (an
untranscribed page is not a discontinuity); a pair that is adjacent in the PDF and jumps is reported.

Exits 1 on any hit, so it can be a gate.

What it does NOT claim
----------------------
- It cannot see an error that is uniform across **every** transcribed page of a book. If the first
  batch of a new book misreads a digit the same way on all of its pages, there is no neighbour to
  disagree with it, and this tool is silent. The first batch of a book is still unprotected: read a
  folio off the image at full scan resolution before trusting it.
- A folio confirmed by this tool is confirmed only *against its neighbours*. Two adjacent batches that
  make the same mistake agree with each other.
- A real jump in the source (a missing leaf, a scan that skips a gathering, two volumes in one file)
  is a true positive here and a correct reading in the files. A hit means "look at the images", never
  "change the number".

Measured 18 September 2026 (`khulasat_ut_tawarikh`):
    --pages 49-164, corrected files    116 pages, 0 breaks                       rc=0
    --pages 49-164, workers' raw files 1 break at 98/99 (491 -> 390, step -101)  rc=1
    tahqiqat_chishti --pages 1-66      48 folios, 0 breaks (ascending control)   rc=0

Usage
-----
    python3 pipeline/book_queue/check_folio_continuity.py SLUG [--pages A-B]
"""
from __future__ import annotations
import argparse, re, sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FOLIO = re.compile(r"^\s*\[folio\s+([0-9]+)\s*\]", re.MULTILINE)


def read_folios(slug: str, first: int | None, last: int | None) -> dict[int, int]:
    pdir = REPO / "out" / "ocr" / slug / "pages"
    if not pdir.is_dir():
        sys.exit(f"no such directory: {pdir}")
    out: dict[int, int] = {}
    for f in sorted(pdir.glob("p[0-9][0-9][0-9][0-9].txt")):
        n = int(f.stem[1:])
        if first is not None and not (first <= n <= last):
            continue
        m = FOLIO.search(f.read_text(encoding="utf-8"))
        if m:
            out[n] = int(m.group(1))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--pages", help="A-B (1-based PDF indices); default every transcribed page")
    a = ap.parse_args()
    first = last = None
    if a.pages:
        first, last = (int(x) for x in a.pages.split("-"))

    folios = read_folios(a.slug, first, last)
    if len(folios) < 2:
        rng = f" in {a.pages}" if a.pages else ""
        print(f"{a.slug}: fewer than two pages carry a [folio N] line{rng} — nothing to compare",
              file=sys.stderr)
        sys.exit(0)

    # Same two models as check_folio_direction.py; the winner only fixes the expected sign of the step.
    asc = Counter(fo - n for n, fo in folios.items())
    desc = Counter(fo + n for n, fo in folios.items())
    na = asc.most_common(1)[0][1]
    nd = desc.most_common(1)[0][1]
    step = -1 if nd > na else +1
    model = "descending (PDF runs back-to-front)" if step == -1 else "ascending (ordinary scan order)"

    pages = sorted(folios)
    print(f"{a.slug}: {len(pages)} pages carry a folio"
          + (f" (range {a.pages})" if a.pages else "")
          + f"; model is {model}, so adjacent pages should step by {step:+d}")

    breaks, skipped = [], 0
    for x, y in zip(pages, pages[1:]):
        if y != x + 1:
            skipped += 1          # untranscribed page between them: not a discontinuity
            continue
        got = folios[y] - folios[x]
        if got != step:
            breaks.append((x, y, folios[x], folios[y], got))

    if skipped:
        print(f"  {skipped} PDF gap(s) in the transcribed set were skipped "
              f"(an untranscribed page is not a discontinuity)")

    if not breaks:
        print(f"  no break: every adjacent transcribed pair steps by {step:+d}.")
        sys.exit(0)

    print(f"  {len(breaks)} discontinuity(ies) — read these page images before changing any number:")
    for x, y, fx, fy, got in breaks:
        print(f"    p{x:04d} folio {fx}  ->  p{y:04d} folio {fy}   step {got:+d}, expected {step:+d}")
    print("  A jump of exactly ±100 or ±10 across a batch boundary is usually one batch misreading a"
          " hundreds or tens digit, not a missing leaf (measured: khulasat pp. 99-164, 18 Sep 2026).")
    sys.exit(1)


if __name__ == "__main__":
    main()
