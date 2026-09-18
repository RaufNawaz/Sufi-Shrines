#!/usr/bin/env python3
"""Render a book's pages as VERTICAL panels, each banded horizontally — for two-panel pages.

Why this exists, and the one measurement behind it
--------------------------------------------------
`render_bands.py` cuts a page into 4 horizontal bands and is the right tool for a
single-column page. It is the wrong tool for a page laid out as two side-by-side panels
(an index, a contents spread, an errata table): a horizontal band spans the whole page
width, so each panel gets only ~40% of the band's pixels. `docs/HANDOVER.md` §9.201
recorded that as an untested guess with an estimate of "~2.5x" to be had from splitting
vertically instead. This script is that split, and the guess was measured on
18 September 2026.

**The mechanism, which is not the one the earlier note assumed.** The limit is not the
scan's own resolution. It is the pixels the model is *delivered*: an image is downscaled to
the vision tier's long-edge cap before it is read, so

    legibility  ∝  (tier cap)  ÷  (fraction of the page's width the image covers)

Halving the covered width therefore doubles the pixels per glyph *even when the render
upsamples past the scan's native pixels*. `khulasat_ut_tawarikh`'s embedded scans are
2488 x 3840 (400 ppi, `pdfimages -list`), so rendering a page at `--scale 8800` is a 2.3x
upsample and adds no real detail — and the half-width panel is still far more legible,
because the seam, not the scanner, was the bottleneck. Rendering *taller* bands does
nothing for this: the long edge is the width, and it is the width that sets the scale
factor.

**Measured, 18 September 2026, `khulasat_ut_tawarikh`, two pages, one reader.**

    page   layout                        render                       result
    p0020  two-panel Persian index       4 bands, scale 4400          digit chains unreadable
                                         (2858 x 1133, full width)
    p0020  same                          right panel, scale 8800      folio ۳۹, محمد صادق ۵۰۵ ۵۲۲,
                                         (2960 x 1133, half width)    محمد صالح ۴۸۶ ۵۰۳ ۵۳۹,
                                                                      مخدوم الملک ۶۶, مخدوم جہانیان ۶۲
                                                                      all individually resolvable
    p0055  single-column Persian prose   right panel, scale 8800      نوک پیکان جگر فرسا سوزن اما خار
                                                                      ارزو… read word by word

**What this measurement is NOT.** Two pages, judged by one reader, with no CER against a
hand-verified gold page. That is exactly the shape of the claim §9.201 caught in
`render_bands.py`'s own docstring ("measured on TWO pages and generalised"), so it is
written down here with the same warning attached: before any large run is committed to
this rendering, A/B ~10 pages across independent workers and compute the counts
(`[illegible]` per 1,000 characters read, `[OCR?]` marks, characters read) the way §9.201
did. The number to beat on this corpus is 40.1 `[illegible]` per 1,000 characters.

**The prose case has a cost the table case does not.** A two-panel table splits along a
rule that is already there: each panel is a self-contained column and nothing has to be
rejoined. A vertical split of single-column prose cuts *every line* in half, so a worker
must stitch each line across the seam — and §9.201 recorded a worker resolving band seams
by semantic continuity alone, which is to say the stitching cannot be re-checked
mechanically afterwards. Use `--panels 2` on prose only deliberately, and say so in the
worker's job description.

**Numerals are still not fixed.** An isolated chronogram year or folio digit has no
linguistic context whatever the resolution; §9.201's finding that ۶ and ۹ are not separable
in some of these hands is a property of the scribe, not of the render. Every digit out of
these books still needs `[OCR?]` and a human.

Usage
-----
    python3 pipeline/book_queue/render_panels.py SLUG --pages A-B [--panels 2] [--scale 8800]
                                                 [--bands 4] [--overlap 0.03]

Writes, per page, `--panels` x `--bands` files into out/ocr/SLUG/pages/:

    pNNNN_v1b1.png .. pNNNN_v1b4.png   panel 1 = the RIGHT-hand panel, read first
    pNNNN_v2b1.png .. pNNNN_v2b4.png   panel 2 = the next panel leftwards

Panels are numbered in **reading order for a right-to-left book**, so panel 1 is the
right-hand one. For a `latin` book pass `--ltr` and panel 1 is the left-hand one. Names do
not collide with `render_bands.py`'s `_qN.png`, so both renderings of a page can sit side
by side while an A/B is run. Panels overlap horizontally by `--overlap` as well, so a word
sitting on the rule appears whole in one of them.

Intermediates go to a real temp dir: a cloud Cowork session mounts the repo with unlink(2)
blocked, so scratch written beside the output could never be removed (the same wall that
stops `git add` there).
"""
from __future__ import annotations
import argparse, json, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[2]


def panel_bands(slug: str, n: int, panels: int, bands: int) -> list[Path]:
    d = REPO / "out" / "ocr" / slug / "pages"
    return [d / f"p{n:04d}_v{p}b{b}.png" for p in range(1, panels + 1) for b in range(1, bands + 1)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--scale", type=int, default=8800,
                    help="long edge px of the FULL page before splitting; with --panels 2 each "
                         "panel comes out at about half the page width in px")
    ap.add_argument("--panels", type=int, default=2)
    ap.add_argument("--bands", type=int, default=4, help="horizontal bands per panel")
    ap.add_argument("--pages", help="A-B (1-based PDF indices); default all")
    ap.add_argument("--overlap", type=float, default=0.03,
                    help="fraction overlapped with each neighbour, applied to both splits")
    ap.add_argument("--ltr", action="store_true", help="left-to-right book: panel 1 is the left panel")
    ap.add_argument("--redo", action="store_true")
    a = ap.parse_args()

    state = json.loads((REPO / "pipeline/book_queue/state.json").read_text(encoding="utf-8"))
    b = state["books"][a.slug]
    pdf = REPO / b["pdf_path"]
    if not pdf.exists():
        sys.exit(f"missing {pdf}")
    first, last = (1, b["pages"])
    if a.pages:
        first, last = (int(x) for x in a.pages.split("-"))
    last = min(last, b["pages"])

    pdir = REPO / "out" / "ocr" / a.slug / "pages"
    pdir.mkdir(parents=True, exist_ok=True)
    tdir = Path(tempfile.mkdtemp(prefix=f"panels_{a.slug}_"))
    done = skipped = 0
    try:
        for n in range(first, last + 1):
            outs = panel_bands(a.slug, n, a.panels, a.bands)
            if not a.redo and all(p.exists() for p in outs):
                skipped += 1
                continue
            r = subprocess.run(
                ["pdftoppm", "-f", str(n), "-l", str(n), "-gray", "-png", "-scale-to", str(a.scale),
                 str(pdf), str(tdir / f"p{n}")],
                capture_output=True, text=True)
            produced = sorted(tdir.glob(f"p{n}-*.png"))
            if r.returncode != 0 or not produced:
                sys.exit(f"pdftoppm failed on page {n}: {r.stderr.strip()}")
            src = produced[0]
            with Image.open(src) as im:
                if im.mode != "L":
                    im = im.convert("L")
                W, H = im.size
                pstep = W // a.panels
                pov = int(pstep * a.overlap)
                bstep = H // a.bands
                bov = int(bstep * a.overlap)
                k = 0
                for p in range(a.panels):
                    # panel index 0 is the rightmost column unless --ltr
                    col = p if a.ltr else a.panels - 1 - p
                    x0 = max(0, col * pstep - pov)
                    x1 = min(W, (col + 1) * pstep + pov) if col < a.panels - 1 else W
                    panel = im.crop((x0, 0, x1, H))
                    for i in range(a.bands):
                        top = max(0, i * bstep - bov)
                        bot = min(H, (i + 1) * bstep + bov) if i < a.bands - 1 else H
                        panel.crop((0, top, panel.width, bot)).save(outs[k], optimize=True)
                        k += 1
            src.unlink()
            done += 1
    finally:
        shutil.rmtree(tdir, ignore_errors=True)
    order = "left-to-right" if a.ltr else "right-to-left (panel 1 = right-hand panel)"
    print(f"{a.slug}: pages {first}-{last} -> {a.panels} panels x {a.bands} bands at scale {a.scale}, "
          f"{order} ({done} prepared, {skipped} already had a full set)")


if __name__ == "__main__":
    main()
