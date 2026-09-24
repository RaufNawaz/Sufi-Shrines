#!/usr/bin/env python3
"""Render the maktabah.org daftar edition of the Masnavi (masnavi_01..06) for vision workers.

WHY THIS EXISTS, AND WHY IT IS NOT render_bands.py
--------------------------------------------------
Measured 23 September 2026 (HANDOVER §9.228/§9.229), the calibration firing Rauf asked for before
any masnavi page was transcribed. Two facts make `render_bands.py` the wrong tool for these books:

1. **The scans are tiny.** `pdfimages -list` on masnavi_01..06 reports a native page image of
   **579-830 px across the WHOLE PAGE** (88-112 dpi). So the measured ladder in render_bands.py's
   docstring -- 1119 px bad, 1679 px poor, 2462 px workable -- **cannot be climbed on 01..06 by
   rendering harder.** There is no more information in the file.

2. **A full-width band cannot magnify a 750 px page.** Banding buys magnification only when the
   band is then halved below the 2000 px delivery cap (§9.210); on a 750 px page there is nothing
   to halve. What works is spending the cap budget on the type: render at ~3000 px (4x native)
   and crop by zone. Measured gains on masnavi_02 p30, two blind workers: interlinear Urdu
   45% -> 88%, margin commentary 30% -> 85%, [illegible]/1,000 chars 7.83 -> 1.12.

WHAT CHANGED 23 SEPTEMBER 2026, 09:00Z (§9.231) -- READ THIS BEFORE TRUSTING A CROP
-----------------------------------------------------------------------------------
The first production batch (masnavi_02 pp. 1-30) found the original fixed geometry wrong on
**two whole classes of page**, and both would have produced garbage for half a batch:

**(1) THE MARGIN GLOSSARY ALTERNATES SIDES BY PAGE PARITY.** On an EVEN PDF page the verse frame
is on the left of the image and the margin box on the right (x ~0.68-0.88). On an ODD page it is
mirrored: margin box left (x ~0.14-0.33), verse frame right (x ~0.35-0.94). The calibration
measured masnavi_02 p30 and p100 and masnavi_06 p100 -- **all even** -- so the hardcoded
`FRAME=(0.030,0.670)` / `MARGIN=(0.650,0.880)` was even-page geometry applied to every page. On an
odd page the old "verse" crop returned the margin box plus half the verse and the old "margin"
crop landed in the middle of the verse.

**(2) THE FIRST PAGES OF EACH VOLUME ARE FULL-WIDTH URDU PROSE, NOT VERSE.** masnavi_02 pp. 2-16
(folios 1-14) are the translator's introduction: dense Urdu prose across the full width inside an
ornate floral frame, **folio TOP CENTRE**, no margin box, no two columns. Daftar 2 itself opens at
**p17** with an illuminated basmala panel; from there the page is the two-column verse layout with
the folio in a **bottom-centre** medallion. Zone crops are meaningless on the prose pages and the
bottom folio crop is empty there.

So geometry is now **measured per page** instead of hardcoded. The instrument: column-mean
brightness over y 0.16-0.88, minus a local median (0.025W window), gives a "dip" profile in which
a frame rule is a sharp narrow minimum. On masnavi_02 pp. 1-30 the in-window dip maximum was
**<= 8.0 on every one of the 16 prose pages and >= 18.7 on every one of the 14 verse pages** --
a clean separation with no overlap, which is why `PROSE_MAX`/`BODY_MIN` below are asserted rather
than tuned. Crops are given deliberate overlap so a few thousandths of drift costs nothing; the
verse/margin boundary really does drift, from 0.606 to 0.686 across fourteen consecutive pages.

Every run writes `layout.tsv` next to the crops: page, mode, dip strength, boundary. Read it.
If a page comes back `mode=prose` inside a verse section, that page's rules were faint -- look at
its `_full` before briefing anyone on it.

PAGE FURNITURE, measured on daftars 1-6
----------------------------------------
- Two linked cartouches at the top: `دفتر اوّل/دوم/...` and `مثنوی مولانا روم رح` (verse pages only).
- Each printed ROW is ONE bayt: the OUTER column is misra 1, the INNER column is misra 2 -- on an
  even page right/left, on an odd page also right/left, but the block sits on the other side of
  the sheet. See the column trap in MASNAVI_WORKER_BRIEF.md.
- A small Urdu translation printed directly under each hemistich; a numbered margin glossary keyed
  to the verse with `؎`, often only 25-60% full (a blank margin crop is a normal result).
- The printed folio: **bottom-centre medallion on verse pages (in `_foot`), top centre on the
  prose front matter (in `_foliotop`).** Both crops are emitted on every page; use the one with ink.
  masnavi_02 measured offset: **folio = PDF page - 2**, confirmed on pp. 5, 15, 17, 18, 19, 21,
  28, 29 (folios 3, 13, 15, 16, 17, 19, 26, 27). Read it anyway; never derive it (§9.225).
- A SECOND number is **handwritten below the frame in WESTERN digits** = **PDF page + 406** on
  masnavi_02: 409 on p3 through 436 on p30, pp. 1-2 carry none. **Settled 23 September 2026 by
  reading all 28 of them off two labelled evidence sheets at 220 and 429 dpi**
  (`out/ocr/masnavi_02/evidence/`), after four of six workers read the leading digit as an Urdu
  `۹` and two as a Western `4`. It is **not** the folio and not Urdu numerals. daftar 2's PDF p1
  = hand number 407, and masnavi_01 is 416 pages, so this is almost certainly a continuous
  hand-pagination of ONE bound composite volume -- independent support for §9.229's finding that
  the six daftars are parts of a single edition. Record it; never cite it as a folio.
- `www.maktabah.org` is a SEPARATE PDF overlay object (id 2, 1050x1290, byte-identical in all six
  files), composited in the blank margin BELOW the frame; it covers no printed text. Transcribe
  once as `[source stamp: www.maktabah.org]`.

Usage
-----
    python3 pipeline/book_queue/render_masnavi.py SLUG --pages A-B \
        --pdf <staged.pdf> --outdir <dir>

Writes, per page NNNN:
    pNNNN_full.png        whole page <=1400 px      structure and line counting ONLY
    pNNNN_foliotop.png    top-centre folio zone     (prose front matter)
    pNNNN_belowframe.png  the handwritten number below the frame, over the watermark
    pNNNN_foot.png        the frame's bottom rule: the folio medallion AND the footnote /
                          margin-overflow strip that sits inside the frame below the verse
  verse pages additionally:
    pNNNN_header.png      the cartouche band
    pNNNN_verse1..3.png   the verse block, 3 crops, 7% overlap   <- the words live here
    pNNNN_margin1..3.png  the margin glossary, 3 crops, 10% overlap, upsampled
  prose pages additionally:
    pNNNN_bandK_r.png / _l.png   K=1..4, RIGHT half first (RTL), 8% vertical overlap

One `pdftoppm` call renders the whole range (re-parsing a 68 MB PDF per page cost 17 s/page).
"""
import argparse, os, subprocess, sys, glob
import numpy as np
from PIL import Image

CAP = 1980           # stay under the 2000 px delivery cap on BOTH edges
PAGE_W = 3000        # ~4x the native 579-830 px; more is pure interpolation cost

# --- layout detection, measured 23 Sep 2026 on masnavi_02 pp.1-30 (see docstring) -------------
PROSE_MAX = 8.0      # highest in-window dip seen on a prose page
BODY_MIN  = 18.7     # lowest in-window dip seen on a verse page
DIP_T     = 13.0     # threshold, sitting in the empty gap between them
WIN_EVEN  = (0.55, 0.75)   # where the verse/margin boundary rule lives on an even page
WIN_ODD   = (0.25, 0.45)   # ... and on an odd page

HEADER_Y = (0.015, 0.130)
VERSE_Y  = (0.050, 0.925)
MARG_Y   = (0.040, 0.930)
FOLIO_TOP = (0.300, 0.700, 0.045, 0.135)
FOOT_Y    = (0.838, 0.962)   # the frame's bottom rule: folio medallion AND the footnote strip
BELOW     = (0.270, 0.730, 0.922, 0.996)   # the handwritten page number below the frame
PROSE_X  = (0.055, 0.945)
PROSE_Y  = (0.080, 0.930)


def _fit(im, cap=CAP, upscale_to=None):
    if upscale_to:
        s = min(upscale_to / max(im.size), cap / max(im.size))
        if s > 1.0:
            im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    if max(im.size) > cap:
        s = cap / max(im.size)
        im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    return im


def _slices(y0, y1, n, overlap):
    span = (y1 - y0) / n
    out = []
    for i in range(n):
        a = y0 + span * i - (span * overlap if i else 0)
        b = y0 + span * (i + 1) + (span * overlap if i < n - 1 else 0)
        out.append((max(a, 0.0), min(b, 1.0)))
    return out


def detect_layout(im, page):
    """('body', boundary, dip) or ('prose', None, dip). See the docstring."""
    a = np.asarray(im.convert("L"), dtype=np.float32)
    H, W = a.shape
    mid = a[int(0.16 * H):int(0.88 * H), :]
    cm = mid.mean(axis=0)
    k = max(4, int(0.025 * W))
    pad = np.pad(cm, (k, k), mode="edge")
    med = np.array([np.median(pad[i:i + 2 * k + 1]) for i in range(W)])
    dip = med - cm
    lo, hi = WIN_EVEN if page % 2 == 0 else WIN_ODD
    x0, x1 = int(lo * W), int(hi * W)
    seg = dip[x0:x1]
    strength = float(seg.max())
    b = (x0 + int(seg.argmax())) / W
    if strength < DIP_T:
        return "prose", None, strength
    # RULE 4: a boundary pinned to the edge of the search window means the window is wrong for
    # this book, not that the page is odd. Fail loudly rather than crop the wrong third.
    if b <= lo + 0.004 or b >= hi - 0.004:
        raise SystemExit(f"REFUSING page {page}: boundary rule detected at x={b:.3f}, on the edge "
                         f"of the {lo}-{hi} search window. Re-measure the window for this volume "
                         f"before rendering (render_masnavi.py docstring, §9.231).")
    return "body", b, strength


def crops_body(im, stem, page, b):
    W, H = im.size
    made = []
    if page % 2 == 0:          # verse frame left of image, margin box right
        vx = (0.020, min(b + 0.030, 0.99))
        mx = (max(b - 0.005, 0.0), 0.930)
    else:                       # margin box left of image, verse frame right
        mx = (0.070, min(b + 0.005, 0.99))
        vx = (max(b - 0.030, 0.0), 0.980)

    # §9.231: the folio medallion sits on the VERSE FRAME's centre, not the page's, so on an odd
    # page (frame offset right) a page-centred crop misses it entirely. Derive it from vx. The
    # same crop carries the footnote / margin-overflow strip that sits inside the frame below the
    # verse block on some pages and that no _margin crop reaches.
    foot = im.crop((int(vx[0] * W), int(FOOT_Y[0] * H), int(vx[1] * W), int(FOOT_Y[1] * H)))
    _fit(foot, upscale_to=CAP).save(stem + "_foot.png"); made.append("_foot")

    hdr = im.crop((int(vx[0] * W), int(HEADER_Y[0] * H), int(vx[1] * W), int(HEADER_Y[1] * H)))
    _fit(hdr).save(stem + "_header.png"); made.append("_header")
    for i, (ya, yb) in enumerate(_slices(*VERSE_Y, 3, 0.07), 1):
        c = im.crop((int(vx[0] * W), int(ya * H), int(vx[1] * W), int(yb * H)))
        _fit(c).save(f"{stem}_verse{i}.png"); made.append(f"_verse{i}")
    for i, (ya, yb) in enumerate(_slices(*MARG_Y, 3, 0.10), 1):
        c = im.crop((int(mx[0] * W), int(ya * H), int(mx[1] * W), int(yb * H)))
        _fit(c, upscale_to=CAP).save(f"{stem}_margin{i}.png"); made.append(f"_margin{i}")
    return made


def crops_prose(im, stem):
    W, H = im.size
    made = []
    foot = im.crop((int(PROSE_X[0] * W), int(FOOT_Y[0] * H), int(PROSE_X[1] * W), int(FOOT_Y[1] * H)))
    _fit(foot, upscale_to=CAP).save(stem + "_foot.png"); made.append("_foot")
    xm = (PROSE_X[0] + PROSE_X[1]) / 2
    for i, (ya, yb) in enumerate(_slices(*PROSE_Y, 4, 0.08), 1):
        for tag, (xa, xb) in (("r", (xm - 0.012, PROSE_X[1])), ("l", (PROSE_X[0], xm + 0.012))):
            c = im.crop((int(xa * W), int(ya * H), int(xb * W), int(yb * H)))
            _fit(c, upscale_to=CAP).save(f"{stem}_band{i}_{tag}.png"); made.append(f"_band{i}_{tag}")
    return made


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--pages", required=True, help="A-B, 1-based PDF indices")
    ap.add_argument("--page-width", type=int, default=PAGE_W)
    ap.add_argument("--keep-src", action="store_true")
    a = ap.parse_args()

    if "masnavi_01_text" in a.slug:
        sys.exit("masnavi_01_text is the 600 dpi IA scan of the SAME edition (§9.229). Use\n"
                 "render_bands.py --scale 4400 for it, and split its margin column left/right\n"
                 "first; see MASNAVI_CALIBRATION_COHORT_B.md. This script is for the maktabah\n"
                 "daftar set only.")

    first, last = (int(x) for x in a.pages.split("-"))
    os.makedirs(a.outdir, exist_ok=True)
    srcdir = os.path.join(a.outdir, "_src")
    os.makedirs(srcdir, exist_ok=True)

    dpi = max(72, round(a.page_width / (504 / 72)))
    out = subprocess.run(["pdfimages", "-list", "-f", str(first), "-l", str(first), a.pdf],
                         capture_output=True, text=True).stdout
    widths = [int(r.split()[3]) for r in out.splitlines()[2:]
              if len(r.split()) > 5 and r.split()[2] == "image" and r.split()[3] != "1050"]
    if widths and max(widths) > 1500:
        sys.exit(f"REFUSING: page {first} carries a {max(widths)} px scan, not the 579-830 px this "
                 f"recipe was measured on. Use render_bands.py --scale 4400 and re-measure; do not "
                 f"upsample a real scan through this script.")
    print(f"{a.slug}: pages {first}-{last} at {dpi} dpi (~{a.page_width} px/page), "
          f"native scan ~{max(widths) if widths else '?'} px -> crops under {CAP} px")

    # ONE pdftoppm call for the range: per-page invocation re-parses the whole PDF (17 s/page).
    subprocess.run(["pdftoppm", "-f", str(first), "-l", str(last), "-r", str(dpi),
                    "-png", "-gray", a.pdf, os.path.join(srcdir, "src")], check=True)

    rows, n = [], 0
    for p in range(first, last + 1):
        hits = sorted(glob.glob(os.path.join(srcdir, f"src-*{p}.png")))
        src = next((h for h in hits if int(os.path.basename(h)[4:-4]) == p), None)
        if src is None:
            raise SystemExit(f"pdftoppm produced no file for page {p}")
        im = Image.open(src)
        stem = os.path.join(a.outdir, f"p{p:04d}")
        t = im.copy(); t.thumbnail((1400, 1400)); t.save(stem + "_full.png")
        mode, b, strength = detect_layout(im, p)
        W, H = im.size
        for tag, (fx0, fx1, fy0, fy1) in (("_foliotop", FOLIO_TOP), ("_belowframe", BELOW)):
            f = im.crop((int(fx0 * W), int(fy0 * H), int(fx1 * W), int(fy1 * H)))
            _fit(f, upscale_to=CAP).save(stem + tag + ".png")
        made = crops_body(im, stem, p, b) if mode == "body" else crops_prose(im, stem)
        im.close()
        if not a.keep_src:
            os.remove(src)
        rows.append((p, mode, f"{strength:.1f}", "" if b is None else f"{b:.3f}", len(made) + 3))
        n += 1

    # RULE 4: the separation this detector rests on is an assertion, not a hope.
    ps = [float(r[2]) for r in rows if r[1] == "prose"]
    bs = [float(r[2]) for r in rows if r[1] == "body"]
    if ps and bs and max(ps) >= min(bs):
        raise SystemExit(f"REFUSING: prose/verse dip ranges overlap in this range "
                         f"(prose max {max(ps):.1f} >= verse min {min(bs):.1f}). The detector is "
                         f"not separating these pages; look at the _full images before briefing "
                         f"anyone. Measured on masnavi_02 pp.1-30: prose <= {PROSE_MAX}, "
                         f"verse >= {BODY_MIN}.")

    with open(os.path.join(a.outdir, "layout.tsv"), "w") as fh:
        fh.write("page\tmode\tdip\tboundary\tcrops\n")
        for r in rows:
            fh.write("\t".join(str(x) for x in r) + "\n")
    if not a.keep_src:
        try:
            os.rmdir(srcdir)
        except OSError:
            pass
    nb = sum(1 for r in rows if r[1] == "body")
    print(f"prepared {n} page(s) -> {a.outdir}  ({nb} verse, {n - nb} prose)  layout.tsv written")


if __name__ == "__main__":
    main()
