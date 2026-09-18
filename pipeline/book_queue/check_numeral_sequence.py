#!/usr/bin/env python3
"""Flag non-monotonic numerals in a transcribed contents or index column.

Why this exists
---------------
`render_bands.py` records that isolated numerals stay unreliable at every resolution tested, because a
chronogram year or a folio digit has no linguistic context to check it against. A **page-number column
in a table of contents is the one exception**: the surrounding sequence is the context. That is not a
theory — on 18 September 2026 it is what caught a real error. A worker transcribing
`tahqiqat_chishti` pp. 1-7 (seven consecutive contents pages, entry numbers chaining 137 -> 870) read
one panel as 692/693/694/695/667/698/669/670, which is non-monotonic *and* collides with the next
page starting at 671. Reading those as 662-670 makes the whole chain continuous: **۶ and ۹ are not
separable in this scribe's hand.** The worker left the panel as read and flagged every numeral, which
is correct under WORKER_PROTOCOL.md; this script is how the next person finds such a panel without
re-reading 873 images.

What it does and does not claim
-------------------------------
It reports **descents inside an otherwise ascending run** of standalone numeral tokens, in document
order, converting Eastern Arabic-Indic digits (۰-۹) to Western for comparison only. It does **not**
correct anything, and a hit is **not** proof of a misreading: a contents page can legitimately restart
a numbering, and prose pages carry years, ages and quantities in no order at all. Run it on the pages
you believe carry a column, read the hits against the image, and change nothing on its word alone
(CLAUDE.md RULE 2). A clean run is likewise not proof the digits are right — it only says nothing
contradicts itself.

Usage
-----
    python3 pipeline/book_queue/check_numeral_sequence.py SLUG --pages 1-7
    python3 pipeline/book_queue/check_numeral_sequence.py SLUG --pages 1-7 --min-run 4

Exits 1 if any descent was found, so it can be used as a gate (RULE 4).
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EASTERN = "۰۱۲۳۴۵۶۷۸۹"
TRANS = str.maketrans(EASTERN, "0123456789")
# A standalone numeral token: digits (either script) not glued to letters. Markers such as
# "[illegible: 3 lines]" and "[folio 23]" are stripped before matching so they cannot enter a run.
MARKER = re.compile(r"\[[^\]]*\]")
TOKEN = re.compile(rf"(?<![\w{EASTERN}])([0-9{EASTERN}]{{1,5}})(?![\w{EASTERN}])")


def numerals_in(text: str) -> list[str]:
    return TOKEN.findall(MARKER.sub(" ", text))


def descents(seq: list[tuple[int, int, str]], min_run: int) -> list[tuple]:
    """seq is (page, value, as_printed) in document order. Return descents inside ascending runs.

    Two filters keep this from drowning in noise, and both were tuned against the pp. 1-7 case
    above rather than guessed:

    - **A plateau is not a descent.** Equal consecutive values are ordinary in a two-panel contents
      layout (an entry spanning two lines, a repeated page number) and are counted, not reported.
    - **The two tokens must have the same digit length.** `۳۲` after `۳۲۵` is a truncated reading or
      a different column, not a break in a sequence, and reporting it hides the real hits. The cost
      is that a genuine 3-digit-to-2-digit restart is missed; that is the right trade here, because
      a restart is legitimate anyway and this script's job is to find the one-digit substitution.
    """
    hits, plateaus, run = [], 0, []
    for item in seq:
        if run and item[1] == run[-1][1]:
            plateaus += 1
            continue
        if run and item[1] < run[-1][1]:
            if len(run) >= min_run and len(item[2]) == len(run[-1][2]):
                hits.append((run[-1], item))
            run = [item]
        else:
            run.append(item)
    return hits, plateaus


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--pages", required=True, help="A-B (1-based PDF indices)")
    ap.add_argument("--min-run", type=int, default=3,
                    help="how many ascending numerals must precede a descent before it is reported")
    a = ap.parse_args()

    first, last = (int(x) for x in a.pages.split("-"))
    pdir = REPO / "out" / "ocr" / a.slug / "pages"
    seq: list[tuple[int, int, str]] = []
    absent = []
    for n in range(first, last + 1):
        f = pdir / f"p{n:04d}.txt"
        if not f.exists():
            absent.append(n)
            continue
        for tok in numerals_in(f.read_text(encoding="utf-8")):
            seq.append((n, int(tok.translate(TRANS)), tok))

    if absent:
        print(f"no transcription for pages: {absent}", file=sys.stderr)
    print(f"{a.slug} pp. {first}-{last}: {len(seq)} standalone numerals in {last - first + 1 - len(absent)} pages")
    hits, plateaus = descents(seq, a.min_run)
    for before, after in hits:
        print(f"  descent: p{before[0]:04d} {before[2]} ({before[1]}) -> p{after[0]:04d} {after[2]} ({after[1]})")
    if plateaus:
        print(f"  ({plateaus} equal-value repeats skipped — ordinary in a two-panel contents layout)")
    if not hits:
        print("  no descent inside an ascending run — nothing contradicts itself (not proof it is right)")
    print("Read every hit against the page image before changing anything (RULE 2).")
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
