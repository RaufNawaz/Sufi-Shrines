#!/usr/bin/env python3
"""Render a book's pages as horizontal bands, for the scribal-lithograph books.

Why this exists
---------------
Six workers failed on `tahqiqat_chishti` on 15 and 17 September 2026 at full-page and half-page
renders. Measured on 17 September: the limiting variable is the *pixel width of the text line*, not
the page scale, because a tall image is downscaled to fit the vision tier before the model sees it.

    width   preparation                     word-level result on the same pages
    1119    --halves --scale 2000           30-40% readable; 15 Sep hold
    1679    --halves --scale 3000           30-70% marked [illegible] by six workers
    2462    4 bands  --scale 4400           ~82% (clean page) / ~62% (verse page); dots resolvable

At 2462 px the dots that separate ج/ح/خ, ب/پ/ت/ٹ/ن/ی and س/ش are legible again — verified on
`خانقاہ` / `عالیجاہ` / `حضرت` on one line, and `شیخ` / `سلوک` on another. Below that they are gone
and a worker cannot tell those letters apart at all, which is why the earlier passes produced a
lattice rather than a text.

**What more pixels do NOT fix, and no rendering setting will:** the last word or two of most lines
bleeds into the frame rule in the original impression, and isolated numerals — chronogram years and
folio digits — have no linguistic context to check them against. Those stay unreliable at every
resolution tested. Every numeral out of these books needs a human or a specialist HTR model before
it enters a shrine record, whatever the engine.

**That table was measured on TWO pages and it is optimistic. Re-measured over 66 pages on 18 September
2026** (`tahqiqat_chishti` pp. 1-66, six workers, 4 bands at scale 4400) against the 1679 px pass on
the identical pages: Arabic characters read rose 12% (55,240 -> 61,616), bulk illegible stretches
almost vanished (162 lines inside `[illegible: N lines]` -> 14), `[OCR?]` marks nearly doubled
(1,276 -> 2,321) — but **`[illegible]` per 1,000 characters actually read was unchanged, 40.2 -> 40.1**,
and 24 of the 66 pages read *fewer* characters than at 1679 px. Worker self-assessment across the 66
was 33-80%, **mean ~48%**, not the 62-82% above. The band render moves the failure mode from whole
unreadable lines to word-level doubt; it does not make this book citable. Full account, and the three
decisions it raises, in `docs/HANDOVER.md` §9.201.

THE 2000 px CAP — why `--halves` exists and is now the default
---------------------------------------------------------------
§9.210 (18 September 2026): three `khulasat_ut_tawarikh` workers independently reported that the
image tool **downsamples any image whose long edge exceeds 2000 px before the model sees it**, and
all three worked around it by cropping the band PNG into overlapping left/right halves with PIL.
**Confirmed directly on 21 September 2026**: a 2763 x 616 crop of khulasat p. 297 came back annotated
`original 2763x616, displayed at 2000x446`. So a 2763 px band is delivered at 2000 px — below the
threshold at which the dots separating ب/پ/ت/ن/ی resolve — and the 2462 px and 1679 px rows of the
table above were separated by far less than they appear.

A half of a 2763 px band is 1550 px and crosses no cap, so it reaches the model whole. **Both are
needed.** §9.216 (20 September 2026) measured the one worker who read only the halves and dropped
the full band: it read 26% fewer characters than the batch mean, carried 51% of the batch's entire
`[illegible]` count, had three times the per-1,000 rate of the next worst worker, and lost the only
line in 66 pages genuinely lost to crop geometry. The band carries the line count, the row
correspondence and the structure against which the halves are joined; the halves carry the words.
**Read the band for structure AND both halves for words. A worker short of context drops pages,
never images.**

`--folio-strip` is §9.215's finding, adapted: a small unscaled crop of the region carrying the
printed folio raised folio capture on `tahqiqat_chishti` from ~60% to 85%. On that book the folio
sits in a top *corner*; on `khulasat_ut_tawarikh` §9.210 found it centred above the text block and
drifting up to ~150 px between pages, so the crop here is a centred top strip wide enough to absorb
the drift. Confirmed on p. 297, whose ۲۹۲ sits at x ≈ 0.50W, y ≈ 0.035H.

Usage
-----
    python3 pipeline/book_queue/render_bands.py SLUG --scale 4400 --bands 4 [--pages A-B]
    python3 pipeline/book_queue/render_bands.py SLUG --pdf book.pdf --outdir ./pages --pages 297-362

Writes out/ocr/SLUG/pages/pNNNN_q1.png .. _qN.png with a 3% overlap between neighbours, grayscale,
downscale-only; with `--halves` (default) also pNNNN_qI_r.png / _l.png, the right and left halves of
each band with ~340 px of horizontal overlap (right first: these books read right to left); with
`--folio-strip` (default) also pNNNN_ft.png. `--pdf`/`--outdir` let it run in the cloud container
against a staged PDF with no state.json present — which is where it should run, because the
container allows 600 s per call and the Mac 180 s. Skips pages that already have a full set unless
--redo. Intermediates go to a real temp dir: a cloud Cowork session mounts the repo with unlink(2)
blocked, so scratch files written beside the output can never be removed (this is the same wall that
stops `git add` here).
"""
from __future__ import annotations
import argparse, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[2]

# A band wider than this is downsampled to it before the model sees it (§9.210, confirmed 21 Sep 2026).
VISION_LONG_EDGE_CAP = 2000
# Horizontal overlap between the _r and _l halves of a band, in px. Wide enough that no word is cut
# in two at every resolution tried, and that a worker can anchor the two halves on a shared run.
HALF_OVERLAP = 340


def band_paths(outdir: Path, n: int, count: int) -> list[Path]:
    return [outdir / f"p{n:04d}_q{i}.png" for i in range(1, count + 1)]


def expected_paths(outdir: Path, n: int, count: int, halves: bool, folio: bool) -> list[Path]:
    out = band_paths(outdir, n, count)
    if halves:
        for i in range(1, count + 1):
            out += [outdir / f"p{n:04d}_q{i}_r.png", outdir / f"p{n:04d}_q{i}_l.png"]
    if folio:
        out.append(outdir / f"p{n:04d}_ft.png")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--scale", type=int, default=4400, help="long edge px of the full page before banding")
    ap.add_argument("--bands", type=int, default=4)
    ap.add_argument("--pages", help="A-B (1-based PDF indices); default all")
    ap.add_argument("--overlap", type=float, default=0.03, help="fraction of band height overlapped with neighbours")
    ap.add_argument("--pdf", help="path to the PDF, bypassing state.json (for the cloud container)")
    ap.add_argument("--outdir", help="output directory, bypassing out/ocr/SLUG/pages")
    ap.add_argument("--last-page", type=int, help="page count, required with --pdf when --pages is open-ended")
    ap.add_argument("--no-halves", dest="halves", action="store_false",
                    help="skip the _r/_l half crops (NOT recommended: see the 2000 px cap above)")
    ap.add_argument("--no-folio-strip", dest="folio", action="store_false", help="skip the _ft folio crop")
    ap.add_argument("--folio-top", type=float, default=0.12, help="_ft crop: fraction of page height")
    ap.add_argument("--folio-width", type=float, default=0.40, help="_ft crop: fraction of page width, centred")
    ap.add_argument("--redo", action="store_true")
    a = ap.parse_args()

    if a.pdf:
        pdf = Path(a.pdf).resolve()
        last_known = a.last_page or 10**6
    else:
        import json
        state = json.loads((REPO / "pipeline/book_queue/state.json").read_text(encoding="utf-8"))
        b = state["books"][a.slug]
        pdf = REPO / b["pdf_path"]
        last_known = b["pages"]
    if not pdf.exists():
        sys.exit(f"missing {pdf}")
    first, last = (1, last_known)
    if a.pages:
        first, last = (int(x) for x in a.pages.split("-"))
    last = min(last, last_known)

    pdir = Path(a.outdir).resolve() if a.outdir else REPO / "out" / "ocr" / a.slug / "pages"
    pdir.mkdir(parents=True, exist_ok=True)
    tdir = Path(tempfile.mkdtemp(prefix=f"bands_{a.slug}_"))
    done = skipped = 0
    capped = []
    try:
        for n in range(first, last + 1):
            outs = band_paths(pdir, n, a.bands)
            if not a.redo and all(p.exists() for p in expected_paths(pdir, n, a.bands, a.halves, a.folio)):
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
                step = H // a.bands
                ov = int(step * a.overlap)
                for i in range(a.bands):
                    top = max(0, i * step - ov)
                    bot = min(H, (i + 1) * step + ov) if i < a.bands - 1 else H
                    band = im.crop((0, top, W, bot))
                    band.save(outs[i])
                    if a.halves:
                        hw = (W + HALF_OVERLAP) // 2
                        # right half first: these books read right to left
                        band.crop((W - hw, 0, W, band.height)).save(
                            pdir / f"p{n:04d}_q{i+1}_r.png")
                        band.crop((0, 0, hw, band.height)).save(
                            pdir / f"p{n:04d}_q{i+1}_l.png")
                        if hw > VISION_LONG_EDGE_CAP and not capped:
                            capped.append((n, hw))
                if a.folio:
                    fw = int(W * a.folio_width)
                    x0 = (W - fw) // 2
                    im.crop((x0, 0, x0 + fw, int(H * a.folio_top))).save(
                        pdir / f"p{n:04d}_ft.png")
            src.unlink()
            done += 1
    finally:
        shutil.rmtree(tdir, ignore_errors=True)
    print(f"{a.slug}: pages {first}-{last} -> {a.bands} bands each at scale {a.scale}"
          f"{' + _r/_l halves' if a.halves else ''}{' + _ft folio strip' if a.folio else ''} "
          f"({done} prepared, {skipped} already had a full set)")
    if capped:
        print(f"WARNING: half width {capped[0][1]} px still exceeds the {VISION_LONG_EDGE_CAP} px "
              f"vision cap; raise --bands or lower --scale, or the halves buy nothing")


if __name__ == "__main__":
    main()
