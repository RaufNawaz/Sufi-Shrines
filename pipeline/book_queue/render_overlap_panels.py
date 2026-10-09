#!/usr/bin/env python3
"""Render index/table pages as HEAVILY OVERLAPPING vertical panels, each cut into bands.

Why this exists (measured 29 Sep 2026, khulasat_ut_tawarikh PDF 17-48, docs/HANDOVER.md §9.245)
-------------------------------------------------------------------------------------------
`render_panels.py --panels 2` splits the page at its geometric midline with 3% overlap. On
khulasat's index that is wrong twice over:
  1. PDF 17-24 are THREE-column pages (index pp. 32-25): a midline split cuts the middle column.
  2. On the two-column pages the vertical rule wanders between 0.43 and 0.58 of the page width
     (odd/even scan shift). Urdu/Persian entries START at the right edge of a column, so a
     midline cut regularly put the headword of the left column into the right panel.
The fix used: fixed panels wide enough that every column is WHOLE in its own panel
(2-col: 0.40-1.00 and 0.00-0.60; 3-col: 0.55-1.00, 0.27-0.72, 0.00-0.44), with workers told to
transcribe only the rule-bounded column their panel is centred on. Band overlap 3%.
Rule positions were measured on a 1400-px render first (vertical dark-run profile) and the spans
chosen to contain every measured rule with margin — re-measure before reusing on another book.

Output names  pNNNN_w{k}b{b}.png  (w1 = rightmost column; b1 = top band) — they do not collide
with render_bands.py (_qN) or render_panels.py (_vPbB).

Usage:  render_overlap_panels.py PDF OUTDIR --pages A-B [--three-col A-B] [--scale 8800]
"""
import argparse, glob, os, subprocess, tempfile
from PIL import Image

TWO = [(0.40, 1.0), (0.0, 0.60)]
THREE = [(0.55, 1.0), (0.27, 0.72), (0.0, 0.44)]


def rng(s):
    a, b = (int(x) for x in s.split("-"))
    return range(a, b + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf"); ap.add_argument("outdir")
    ap.add_argument("--pages", required=True)
    ap.add_argument("--three-col", default="", help="page range laid out in three columns")
    ap.add_argument("--scale", type=int, default=8800)
    ap.add_argument("--bands", type=int, default=4)
    a = ap.parse_args()
    three = set(rng(a.three_col)) if a.three_col else set()
    os.makedirs(a.outdir, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for n in rng(a.pages):
        subprocess.run(["pdftoppm", "-f", str(n), "-l", str(n), "-gray", "-png", "-scale-to",
                        str(a.scale), a.pdf, f"{tmp}/p{n}"], check=True)
        src = glob.glob(f"{tmp}/p{n}-*.png")[0]
        im = Image.open(src).convert("L"); W, H = im.size
        bstep = H // a.bands; bov = int(bstep * 0.03)
        for k, (x0, x1) in enumerate(THREE if n in three else TWO, 1):
            col = im.crop((int(x0 * W), 0, int(x1 * W), H))
            for i in range(a.bands):
                top = max(0, i * bstep - bov)
                bot = min(H, (i + 1) * bstep + bov) if i < a.bands - 1 else H
                col.crop((0, top, col.width, bot)).save(f"{a.outdir}/p{n:04d}_w{k}b{i+1}.png")
        os.remove(src)
        print("page", n, "three-col" if n in three else "two-col")


if __name__ == "__main__":
    main()
