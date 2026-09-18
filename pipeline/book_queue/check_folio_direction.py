#!/usr/bin/env python3
"""Fit a book's printed folios against BOTH page-order directions, and report which one holds.

Why this exists
---------------
`queue.py folio-check` assumes a single ascending relation, ``folio = pdf_index + k``, and buckets
pages by that offset. On 18 September 2026 `khulasat_ut_tawarikh` broke that assumption completely:
its Persian body is scanned in **reverse page order**, so ``folio = 589 - pdf_index``. Every page
therefore lands in its own offset bucket and `folio-check` printed **fifty consecutive singleton
offsets, each annotated "a minority offset this small is usually a misread tens digit"** — fifty
false alarms on a run that is in fact perfectly regular, and no mention of the actual pattern.

That failure mode is worse than silence. A check whose output is fifty CHECK lines on clean data
teaches its reader to skip it, and the next genuinely misread tens digit goes past unseen.

So this tool fits two models and names the winner:

    ascending    folio =  pdf_index + k      (normal scan order)
    descending   folio =  k - pdf_index      (the PDF runs back-to-front)

It reports the best-fitting constant for each, the number of pages each explains, and then lists
only the pages that disagree with the winner. Exits 1 if any page disagrees, so it can be a gate.

Measured result on `khulasat_ut_tawarikh` pp. 49-98 (18 September 2026):
**descending, k = 589, 50 of 50 pages, no deviation** — verified twice over, because two independent
transcription passes (twelve workers, no shared context) produced identical folio numbers on all
fifty pages. The book's English front matter on pp. 10-15 is separately ascending (roman ii-vii), so
a book can carry both relations in different ranges: use --pages to fit a range at a time rather
than assuming one relation covers the file.

What it does NOT claim
----------------------
A clean fit is not proof the digits are right: a whole range misread by a constant amount still fits.
It proves only that the folios are *self-consistent* with one page order. And it says nothing about
which direction is the reading order of the *text* — that has to come from sentence continuity across
page boundaries, which is a worker's judgement, not arithmetic.

Usage
-----
    python3 pipeline/book_queue/check_folio_direction.py SLUG [--pages A-B]
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
    if not folios:
        rng = f" in {a.pages}" if a.pages else ""
        print(f"{a.slug}: no page carries a [folio N] line{rng} — nothing to fit", file=sys.stderr)
        sys.exit(0)

    asc = Counter(fo - n for n, fo in folios.items())
    desc = Counter(fo + n for n, fo in folios.items())
    ka, na = asc.most_common(1)[0]
    kd, nd = desc.most_common(1)[0]
    total = len(folios)

    print(f"{a.slug}: {total} pages carry a folio"
          + (f" (range {a.pages})" if a.pages else ""))
    print(f"  ascending   folio = pdf + {ka}      fits {na}/{total} ({na*100//total}%)")
    print(f"  descending  folio = {kd} - pdf      fits {nd}/{total} ({nd*100//total}%)")

    if nd > na:
        model, k, fits = "descending", kd, nd
        predict = lambda n: k - n
        print(f"  --> DESCENDING wins: the PDF runs back-to-front over these pages.")
        print(f"      Reading order is the reverse of PDF order; assembly must reverse it.")
    else:
        model, k, fits = "ascending", ka, na
        predict = lambda n: n + k
        print(f"  --> ascending wins (ordinary scan order).")

    bad = {n: fo for n, fo in folios.items() if fo != predict(n)}
    if not bad:
        print(f"  no deviation: all {total} folios agree with the {model} model.")
        sys.exit(0)

    print(f"  {len(bad)} page(s) disagree with the {model} model "
          f"(a small deviation is usually a misread tens or hundreds digit):")
    for n in sorted(bad):
        print(f"    p{n:04d}: printed {bad[n]}, model predicts {predict(n)} "
              f"(difference {bad[n] - predict(n):+d})")
    sys.exit(1)


if __name__ == "__main__":
    main()
