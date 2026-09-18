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

**Two fixes found in that run, not yet made.** (1) The printed folio sits ABOVE the frame rule and
band q1 clips it — that is why pp. 49 and 51 of `tahqiqat_chishti` have no folio line at all. A taller
q1, or a small top overlap, recovers those folios without re-scanning anything. (2) On two-panel table
pages (a contents spread, say) a horizontal band gives each side-by-side panel only ~40% of the
2462 px width, and a worker repeatedly could not tell which panel an entry belonged to. **A vertical
split — one band per panel, full width — would give each panel ~2.5x the effective resolution** and is
the likeliest single fix for both panel-pairing and digits. Untested; try it on one contents page.

Usage
-----
    python3 pipeline/book_queue/render_bands.py SLUG --scale 4400 --bands 4 [--pages A-B]

Writes out/ocr/SLUG/pages/pNNNN_q1.png .. _qN.png with a 3% overlap between neighbours, grayscale,
downscale-only. Skips pages that already have a full set unless --redo. Intermediates go to a real
temp dir: a cloud Cowork session mounts the repo with unlink(2) blocked, so scratch files written
beside the output can never be removed (this is the same wall that stops `git add` here).
"""
from __future__ import annotations
import argparse, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[2]


def bands_for(slug: str, n: int, count: int) -> list[Path]:
    d = REPO / "out" / "ocr" / slug / "pages"
    return [d / f"p{n:04d}_q{i}.png" for i in range(1, count + 1)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--scale", type=int, default=4400, help="long edge px of the full page before banding")
    ap.add_argument("--bands", type=int, default=4)
    ap.add_argument("--pages", help="A-B (1-based PDF indices); default all")
    ap.add_argument("--overlap", type=float, default=0.03, help="fraction of band height overlapped with neighbours")
    ap.add_argument("--redo", action="store_true")
    a = ap.parse_args()

    import json
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
    tdir = Path(tempfile.mkdtemp(prefix=f"bands_{a.slug}_"))
    done = skipped = 0
    try:
        for n in range(first, last + 1):
            outs = bands_for(a.slug, n, a.bands)
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
                step = H // a.bands
                ov = int(step * a.overlap)
                for i in range(a.bands):
                    top = max(0, i * step - ov)
                    bot = min(H, (i + 1) * step + ov) if i < a.bands - 1 else H
                    im.crop((0, top, W, bot)).save(outs[i], optimize=True)
            src.unlink()
            done += 1
    finally:
        shutil.rmtree(tdir, ignore_errors=True)
    print(f"{a.slug}: pages {first}-{last} -> {a.bands} bands each at scale {a.scale} "
          f"({done} prepared, {skipped} already had a full set)")


if __name__ == "__main__":
    main()
