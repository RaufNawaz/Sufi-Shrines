#!/usr/bin/env python3
"""Resumable book queue: download → render → transcribe → assemble, with per page checkpoints.

Why this exists
---------------
The 42 books in the field survey's Drive upload folder are being transcribed in a cloud
Claude session that has no GPU and a usage limit that ends sessions without warning. The
UTRNet pipeline in tools/ needs a GPU laptop. So the OCR here is "Claude reads each page
image and writes the text" (route=vision) or the PDF's own text layer (route=text_probe),
and the only thing that makes that survivable is bookkeeping that never trusts memory:

  * every page's transcription is its own file  out/ocr/<slug>/pages/pNNNN.txt
  * `check` derives progress from the files that exist, never from what a worker claimed
  * `state.json` (this folder, committed) records status, page counts, leases and the
    file hashes needed to prove a fresh session is looking at the same PDFs
  * a fresh session runs `status`, then `next`, and continues at the first unfinished page

The final per book product matches what tools/finalize_books.py expects:
  out/ocr/<slug>/p001-end_<timestamp>_transcribed.txt   (+ _provenance.json)
with one difference: page boundaries are kept as `[p. N]` marker lines (N = PDF page
index, 1-based) so that shrine entries can cite a page. finalize_books' script check
tolerates the markers (they are a handful of ASCII characters per page).

Commands
--------
  init                         create/refresh state.json from manifest.json (idempotent)
  status [--group G]           one line per book
  next                         the highest priority book with unfinished work, and what to do
  ingest SLUG PDF              register a local PDF: size check vs Drive, page count, text layer probe
  render SLUG [--scale N] [--pages A-B]     pdftoppm → out/ocr/SLUG/pages/pNNNN.png (skips existing)
  extract SLUG                 route=text layer: pdftotext per page → pNNNN.txt, all pages done
  lease SLUG [--size N] [--worker W]        reserve the next unfinished page range for a worker
  release SLUG RANGE           drop a lease (worker failed)
  sweep-leases [--hours H]     expire leases older than H hours (default 3)
  check SLUG                   recount done pages from files; assemble when complete
  mark SLUG STATUS [--note T]  set a downstream status: summarized | integrated | skipped
  export SLUG DIR              copy assembled transcription + provenance to a mirror directory

All paths are relative to the repo root unless absolute. No third party imports.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
MANIFEST = HERE / "manifest.json"
STATE = HERE / "state.json"
OCR_ROOT = REPO_ROOT / "out" / "ocr"

STATUSES = ["pending", "ingested", "rendering", "transcribing", "transcribed", "summarized", "integrated", "skipped"]
# Long edge in px. Claude's vision tiers (platform.claude.com/docs/en/build-with-claude/vision, Sept 2026):
# standard tier fits 1568 px / 1568 visual tokens; high resolution tier (Claude 4.7 and later) fits
# 2576 px / 4784 visual tokens. Tokens are ceil(w/28)*ceil(h/28), so 1568 costs ~2240 tokens per page.
# The pilot (14 Sep 2026) found the in-session image viewer shows at most 2000 px on the long edge, so
# anything above 2000 is downscaled again before Claude sees it: 2000 is the useful ceiling (~2900 tokens).
SCALE_STANDARD = 1568
SCALE_HIRES = 2000
DEFAULT_SCALE = SCALE_STANDARD
DEFAULT_LEASE = 25            # pages per worker batch
SPREAD_RATIO = 1.15           # width/height above this = two page spread, split before transcription
ARABIC_CHARS = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
LATIN_CHARS = re.compile(r"[A-Za-z]")
BIDI_CONTROLS = re.compile("[‎‏‪-‮⁦-⁩﻿]")
BLANK_MARKER = "[blank page]"


# ── small helpers ─────────────────────────────────────────────────────────────

def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def _write_state(state: dict) -> None:
    state["updated"] = now()
    tmp = STATE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(STATE)


def save_state(state: dict, only: str | None = None) -> None:
    """Persist state. With `only=<slug>`, re-read the file first and replace just that book's entry.

    Why: a `render` or a Tesseract `extract` runs for an hour holding a copy of state loaded at its
    start; saving that copy whole would silently undo every lease, check and mark that other
    commands wrote in the meantime (this happened on 14 Sep 2026: an assembled book reverted to
    "ingested"). Every single book command therefore saves through `only`, under a file lock."""
    import fcntl
    lock = STATE.with_suffix(".lock")
    with lock.open("w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        if only is not None and STATE.exists():
            current = load_json(STATE)
            current["books"][only] = state["books"][only]
            state = current
        _write_state(state)
        fcntl.flock(lf, fcntl.LOCK_UN)


def load_state() -> dict:
    if not STATE.exists():
        sys.exit("state.json missing: run `queue.py init` first")
    return load_json(STATE)


def book_dir(slug: str) -> Path:
    return OCR_ROOT / slug


def pages_dir(slug: str) -> Path:
    return book_dir(slug) / "pages"


def page_png(slug: str, n: int) -> Path:
    return pages_dir(slug) / f"p{n:04d}.png"


def page_images(slug: str, n: int) -> list[Path]:
    """Images a worker must read for PDF page n: one file, or two halves of a split spread."""
    halves = [pages_dir(slug) / f"p{n:04d}_a.png", pages_dir(slug) / f"p{n:04d}_b.png"]
    if all(h.exists() for h in halves):
        return halves
    return [page_png(slug, n)] if page_png(slug, n).exists() else []


def embedded_image_profile(pdf: Path, sample: int = 40) -> dict:
    """Summarise the scan images inside the PDF via `pdfimages -list` (first `sample` pages).

    Tells us whether pages are single embedded scans (then extraction beats re-rendering),
    their native pixel size (no point rendering above it), colour depth, and whether they
    are two page spreads (width/height above SPREAD_RATIO)."""
    r = run(["pdfimages", "-f", "1", "-l", str(sample), "-list", str(pdf)])
    per_page: dict[int, list[tuple[int, int, str, int]]] = {}
    for line in r.stdout.splitlines()[2:]:
        parts = line.split()
        if len(parts) < 8 or not parts[0].isdigit():
            continue
        page, kind, w, h, color, comp, bpc = int(parts[0]), parts[2], int(parts[3]), int(parts[4]), parts[5], parts[6], parts[7]
        if kind != "image":
            continue
        per_page.setdefault(page, []).append((w, h, color, int(bpc) if bpc.isdigit() else 0))
    if not per_page:
        return {"pages_sampled": sample, "images_per_page": 0, "note": "no embedded images: born digital or vector PDF"}
    biggest = [max(v, key=lambda t: t[0] * t[1]) for v in per_page.values()]
    ws = sorted(t[0] for t in biggest); hs = sorted(t[1] for t in biggest)
    med_w, med_h = ws[len(ws) // 2], hs[len(hs) // 2]
    spreads = sum(1 for t in biggest if t[0] / max(t[1], 1) > SPREAD_RATIO)
    return {"pages_sampled": len(per_page),
            "images_per_page": round(sum(len(v) for v in per_page.values()) / len(per_page), 2),
            "median_width": med_w, "median_height": med_h,
            "color": biggest[0][2], "bpc": biggest[0][3],
            "spread_pages": spreads, "spread_fraction": round(spreads / len(biggest), 2)}


def _finish_image(src: Path, dest: Path, scale: int, keep_color: bool) -> None:
    """Downscale (never upscale) to `scale` on the long edge with a high quality filter, grayscale, PNG."""
    from PIL import Image
    with Image.open(src) as im:
        im.load()
        if not keep_color and im.mode not in ("L", "1"):
            im = im.convert("L")
        elif im.mode == "1":
            im = im.convert("L")  # bilevel scans resize badly as 1-bit; go through 8-bit gray
        w, h = im.size
        long_edge = max(w, h)
        if long_edge > scale:
            f = scale / long_edge
            im = im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS)
        im.save(dest, format="PNG", compress_level=6)


def _split_halves(src: Path, dest_a: Path, dest_b: Path, scale: int, overlap: float = 0.04) -> None:
    """Cut a tall page into top (a) and bottom (b) halves that overlap by a few lines, each downscaled
    to `scale` on its long edge. For dense lithographs this doubles the pixels per line the reader
    sees (the in-session viewer caps a whole page at 2000 px)."""
    from PIL import Image
    with Image.open(src) as im:
        im.load()
        if im.mode != "L":
            im = im.convert("L")
        w, h = im.size
        mid = h // 2
        ov = int(h * overlap)
        top = im.crop((0, 0, w, min(h, mid + ov)))
        bottom = im.crop((0, max(0, mid - ov), w, h))
        for part, dest in ((top, dest_a), (bottom, dest_b)):
            pw, ph = part.size
            f = scale / max(pw, ph)
            if f < 1:
                part = part.resize((max(1, round(pw * f)), max(1, round(ph * f))), Image.LANCZOS)
            part.save(dest, format="PNG", compress_level=6)


def _split_spread(src: Path, dest_a: Path, dest_b: Path, language: str, overlap: float = 0.03) -> None:
    """Cut a two page spread into the page read first (a) and second (b). Urdu books: right page first."""
    from PIL import Image
    with Image.open(src) as im:
        w, h = im.size
        mid = w // 2
        ov = int(w * overlap)
        left = im.crop((0, 0, mid + ov, h))
        right = im.crop((mid - ov, 0, w, h))
        first, second = (right, left) if language == "arabic" else (left, right)
        first.save(dest_a, format="PNG", optimize=True)
        second.save(dest_b, format="PNG", optimize=True)


def page_txt(slug: str, n: int) -> Path:
    return pages_dir(slug) / f"p{n:04d}.txt"


def ranges_to_str(nums: list[int]) -> str:
    """[1,2,3,5] -> '1-3,5'"""
    if not nums:
        return ""
    nums = sorted(set(nums))
    out, start, prev = [], nums[0], nums[0]
    for n in nums[1:]:
        if n == prev + 1:
            prev = n
            continue
        out.append(f"{start}-{prev}" if start != prev else str(start))
        start = prev = n
    out.append(f"{start}-{prev}" if start != prev else str(start))
    return ",".join(out)


def str_to_ranges(s: str) -> set[int]:
    got: set[int] = set()
    for part in filter(None, (p.strip() for p in s.split(","))):
        if "-" in part:
            a, b = part.split("-", 1)
            got.update(range(int(a), int(b) + 1))
        else:
            got.add(int(part))
    return got


def parse_range(s: str) -> tuple[int, int]:
    a, b = s.split("-", 1) if "-" in s else (s, s)
    return int(a), int(b)


def sha256_head(p: Path, mb: int = 1) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        h.update(f.read(mb * 1024 * 1024))
    return h.hexdigest()[:16]


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def pdf_pages(pdf: Path) -> int:
    r = run(["pdfinfo", str(pdf)])
    m = re.search(r"^Pages:\s+(\d+)", r.stdout, re.M)
    if not m:
        sys.exit(f"pdfinfo could not read {pdf}: {r.stderr.strip()}")
    return int(m.group(1))


def probe_text_layer(pdf: Path, pages: int, language: str) -> dict:
    """Same logic as tools/ocr_all_books.py has_usable_text_layer, reported rather than boolean."""
    probe = min(10, pages)
    r = run(["pdftotext", "-f", "1", "-l", str(probe), "-layout", str(pdf), "-"])
    text = BIDI_CONTROLS.sub("", r.stdout or "")
    total = len(text.strip())
    bad = text.count("�")
    arabic = len(ARABIC_CHARS.findall(text))
    latin = len(LATIN_CHARS.findall(text))
    script_ok = (arabic > latin) if language == "arabic" else (latin > arabic)
    usable = total >= 1200 and (bad / max(total, 1)) <= 0.02 and script_ok
    return {"probe_pages": probe, "chars": total, "replacement_chars": bad,
            "arabic_chars": arabic, "latin_chars": latin, "script_matches": script_ok, "usable": usable}


def log(book: dict, msg: str) -> None:
    book.setdefault("log", []).append({"t": now(), "msg": msg})
    book["log"] = book["log"][-40:]


# ── commands ──────────────────────────────────────────────────────────────────

def cmd_init(_: argparse.Namespace) -> None:
    manifest = load_json(MANIFEST)
    state = load_json(STATE) if STATE.exists() else {"version": 1, "created": now(), "books": {}}
    added = 0
    for b in manifest["books"]:
        if b["slug"] not in state["books"]:
            state["books"][b["slug"]] = {
                "status": "pending", "priority": b["priority"], "group": b["group"], "route_planned": b["route"],
                "language": b["language"], "pdf_path": None, "pdf_bytes": None, "pdf_sha256_head": None,
                "pages": 0, "text_layer": None, "route_used": None, "render_scale": None,
                "pages_done": "", "leases": {}, "assembled_file": None, "takeaways_file": None,
                "integrated_into": [], "log": [],
            }
            added += 1
        else:  # keep priority/group in sync with the manifest
            state["books"][b["slug"]].update(priority=b["priority"], group=b["group"], route_planned=b["route"])
    save_state(state)
    print(f"state.json: {len(state['books'])} books ({added} added)")


def cmd_status(args: argparse.Namespace) -> None:
    state = load_state()
    rows = sorted(state["books"].items(), key=lambda kv: (kv[1]["priority"], kv[0]))
    tot_pages = tot_done = 0
    print(f"{'prio':>4} {'slug':40s} {'group':12s} {'status':12s} {'route':10s} {'pages':>6} {'done':>6} leases")
    for slug, b in rows:
        if args.group and b["group"] != args.group:
            continue
        done = len(str_to_ranges(b["pages_done"])) if b["pages_done"] else 0
        tot_pages += b["pages"]; tot_done += done
        leases = ",".join(b["leases"].keys()) if b["leases"] else "-"
        print(f"{b['priority']:4d} {slug:40s} {b['group']:12s} {b['status']:12s} {str(b['route_used'] or b['route_planned']):10s} "
              f"{b['pages']:6d} {done:6d} {leases}")
    print(f"\npages known {tot_pages}, transcribed {tot_done}. updated {state.get('updated')}")


def unfinished_pages(b: dict) -> list[int]:
    done = str_to_ranges(b["pages_done"]) if b["pages_done"] else set()
    return [n for n in range(1, b["pages"] + 1) if n not in done]


def cmd_next(_: argparse.Namespace) -> None:
    state = load_state()
    for slug, b in sorted(state["books"].items(), key=lambda kv: (kv[1]["priority"], kv[0])):
        st = b["status"]
        if st in ("skipped", "integrated"):
            continue
        if st == "pending":
            print(f"{slug}: PDF not ingested yet → stage it from the Mac and run `ingest {slug} books/<file>.pdf`")
            return
        if st in ("ingested", "rendering", "transcribing"):
            left = unfinished_pages(b)
            leased = set().union(*(str_to_ranges(r) for r in b["leases"])) if b["leases"] else set()
            free = [n for n in left if n not in leased]
            if b["route_used"] == "text_layer":
                print(f"{slug}: text layer usable → run `extract {slug}`")
            else:
                print(f"{slug}: {len(left)} of {b['pages']} pages left ({len(free)} unleased); "
                      f"next free page {free[0] if free else '-'} → `lease {slug}` then transcribe, then `check {slug}`")
            return
        if st == "transcribed":
            print(f"{slug}: transcription assembled at {b['assembled_file']} → summarise, then `mark {slug} summarized`")
            return
        if st == "summarized":
            print(f"{slug}: takeaways at {b['takeaways_file']} → integrate into shrine entries, then `mark {slug} integrated`")
            return
    print("queue empty: every book is integrated or skipped")


def cmd_ingest(args: argparse.Namespace) -> None:
    state = load_state()
    manifest = {b["slug"]: b for b in load_json(MANIFEST)["books"]}
    slug = args.slug
    if slug not in state["books"]:
        sys.exit(f"unknown slug {slug}")
    pdf = Path(args.pdf) if Path(args.pdf).is_absolute() else REPO_ROOT / args.pdf
    if not pdf.exists():
        sys.exit(f"no such file: {pdf}")
    b, m = state["books"][slug], manifest[slug]
    size = pdf.stat().st_size
    if size != m["bytes"]:
        print(f"WARNING: size {size} differs from Drive listing {m['bytes']} — is this the same file?", file=sys.stderr)
        if not args.force:
            sys.exit("refusing to ingest a file whose size does not match; pass --force if it is intentional")
    if pdf.suffix.lower() == ".epub":
        b.update(pdf_path=str(pdf.relative_to(REPO_ROOT)) if pdf.is_relative_to(REPO_ROOT) else str(pdf),
                 pdf_bytes=size, pdf_sha256_head=sha256_head(pdf), pages=0, text_layer=True, route_used="epub", status="ingested")
        log(b, "ingested EPUB")
        save_state(state, only=slug)
        print(f"{slug}: EPUB registered; unpack with `extract {slug}`")
        return
    pages = pdf_pages(pdf)
    probe = probe_text_layer(pdf, pages, b["language"])
    images = embedded_image_profile(pdf)
    if b["route_planned"] == "text_probe" and probe["usable"]:
        route = "text_layer"
    elif b["language"] == "latin":
        # Clean Latin print is what Tesseract is good at (CER of a few percent on book scans);
        # spending vision tokens on it would be waste. Nastaliq never goes this way.
        route = "tesseract"
    else:
        route = "vision"
    if b["route_planned"] == "text_probe" and not probe["usable"]:
        print(f"note: text layer NOT usable ({probe}); falling back to {route}", file=sys.stderr)
    b.update(pdf_path=str(pdf.relative_to(REPO_ROOT)) if pdf.is_relative_to(REPO_ROOT) else str(pdf),
             pdf_bytes=size, pdf_sha256_head=sha256_head(pdf), pages=pages, text_layer=probe, scan_images=images,
             route_used=route, status="ingested")
    log(b, f"ingested: {pages} pages, route={route}")
    pages_dir(slug).mkdir(parents=True, exist_ok=True)
    save_state(state, only=slug)
    print(f"{slug}: {pages} pages, route={route}, text probe chars={probe['chars']} arabic={probe['arabic_chars']} latin={probe['latin_chars']}")
    print(f"  embedded scans: {images}")
    if images.get("spread_fraction", 0) > 0.5:
        print("  NOTE: most pages are two page spreads → render with --split-spreads")


def cmd_render(args: argparse.Namespace) -> None:
    state = load_state()
    b = state["books"][args.slug]
    if not b["pdf_path"]:
        sys.exit("ingest first")
    pdf = REPO_ROOT / b["pdf_path"] if not Path(b["pdf_path"]).is_absolute() else Path(b["pdf_path"])
    scale = args.scale or b["render_scale"] or DEFAULT_SCALE
    if b["render_scale"] and b["render_scale"] != scale:
        sys.exit(f"book already rendered at scale {b['render_scale']}; mixing scales confuses the pilot numbers — pass the same value")
    first, last = parse_range(args.pages) if args.pages else (1, b["pages"])
    last = min(last, b["pages"])
    pdir = pages_dir(args.slug)
    pdir.mkdir(parents=True, exist_ok=True)
    # Intermediates live OUTSIDE the repository. A cloud Cowork session mounts this folder with
    # unlink(2) blocked, so a `_tmp*.png` written next to the output could never be removed and
    # `render` died with PermissionError on its own scratch file (measured 17 Sep 2026). The finished
    # pNNNN.png still lands in pdir; only the scratch moved.
    import tempfile, shutil
    tdir = Path(tempfile.mkdtemp(prefix=f"bq_render_{args.slug}_"))
    halves = args.halves
    if getattr(args, "redo", False):
        # Overwrite whatever is there. Needed to change scale or halves mode for a range: on a mount
        # where unlink is blocked the old files cannot be removed first, and a write overwrites in place.
        todo = list(range(first, last + 1))
    elif halves:
        # a page already prepared as a single image is redone as halves; a page with halves is kept
        todo = [n for n in range(first, last + 1) if len(page_images(args.slug, n)) != 2]
    else:
        todo = [n for n in range(first, last + 1) if not page_images(args.slug, n)]
    split = args.split_spreads
    native = not args.rerender  # default: extract the embedded scan; --rerender forces pdftoppm
    used_native = used_render = 0
    for n in todo:
        tmp_prefix = tdir / f"_tmp{n}"
        src: Path | None = None
        if native:
            # pdfimages gives the scan as stored (no resampling, no double compression). Use it when the
            # page is exactly one image; otherwise fall back to rendering the page.
            r = run(["pdfimages", "-f", str(n), "-l", str(n), "-png", str(pdf), str(tmp_prefix)])
            produced = sorted(tdir.glob(f"_tmp{n}-*.png"))
            if r.returncode == 0 and produced:
                # Several images on a page are usually one scan plus a logo, watermark or thumbnail:
                # take the largest if it dwarfs the runner up (4x the pixels), else render the page.
                from PIL import Image
                sizes = []
                for p in produced:
                    with Image.open(p) as im:
                        sizes.append((im.size[0] * im.size[1], p))
                sizes.sort(reverse=True)
                if len(sizes) == 1 or sizes[0][0] >= 4 * sizes[1][0]:
                    src = sizes[0][1]; used_native += 1
                    for _, p in sizes[1:]:
                        p.unlink()
                else:
                    for _, p in sizes:
                        p.unlink()
            else:
                for p in produced:
                    p.unlink()
        if src is None:
            # Render straight to the target size (2x-then-downscale cost 66 s a page on the 4200 px scans).
            r = run(["pdftoppm", "-f", str(n), "-l", str(n), "-gray", "-png", "-scale-to", str(scale), str(pdf), str(tmp_prefix)])
            produced = sorted(tdir.glob(f"_tmp{n}-*.png"))
            if r.returncode != 0 or len(produced) != 1:
                sys.exit(f"pdftoppm failed on page {n}: {r.stderr.strip()} {produced}")
            src = produced[0]; used_render += 1
        from PIL import Image
        with Image.open(src) as im:
            w, h = im.size
        if split and w / max(h, 1) > SPREAD_RATIO:
            half_a, half_b = tdir / f"_half{n}a.png", tdir / f"_half{n}b.png"
            _split_spread(src, half_a, half_b, b["language"])
            _finish_image(half_a, pdir / f"p{n:04d}_a.png", scale, args.keep_color)
            _finish_image(half_b, pdir / f"p{n:04d}_b.png", scale, args.keep_color)
            half_a.unlink(); half_b.unlink()
        elif halves:
            _split_halves(src, pdir / f"p{n:04d}_a.png", pdir / f"p{n:04d}_b.png", scale)
            single = page_png(args.slug, n)
            if single.exists():
                try:
                    single.unlink()
                except PermissionError:
                    print(f"warning: cannot remove superseded {single.name} (unlink blocked on this mount); "
                          f"page_images() will now see three files for page {n}", file=sys.stderr)
        else:
            _finish_image(src, page_png(args.slug, n), scale, args.keep_color)
    shutil.rmtree(tdir, ignore_errors=True)
    b["render_scale"] = scale
    b["render_mode"] = {"native_extract": used_native, "rerendered": used_render, "split_spreads": bool(split), "halves": bool(halves), "keep_color": bool(args.keep_color)}
    if b["status"] == "ingested":
        b["status"] = "rendering"
    log(b, f"rendered pages {first}-{last} at scale {scale} ({len(todo)} new; native {used_native}, rerendered {used_render}, split={split})")
    save_state(state, only=args.slug)
    print(f"{args.slug}: pages {first}-{last} ready at scale {scale} ({len(todo)} newly prepared: {used_native} extracted native scans, {used_render} rendered; split_spreads={split})")


def cmd_extract(args: argparse.Namespace) -> None:
    state = load_state()
    b = state["books"][args.slug]
    if b["route_used"] not in ("text_layer", "epub", "tesseract"):
        sys.exit(f"route is {b['route_used']}; extract is only for text_layer, tesseract or epub books")
    pdf = REPO_ROOT / b["pdf_path"] if not Path(b["pdf_path"]).is_absolute() else Path(b["pdf_path"])
    pages_dir(args.slug).mkdir(parents=True, exist_ok=True)
    if b["route_used"] == "tesseract":
        # Render at 300 dpi gray (Tesseract's sweet spot), OCR with the English model, one page per call,
        # skipping pages already done so the loop is resumable. Runs for an hour or two per book on 2 cores.
        first, last = parse_range(args.pages) if args.pages else (1, b["pages"])
        done = 0
        for n in range(first, min(last, b["pages"]) + 1):
            if page_txt(args.slug, n).exists():
                continue
            tmp = pages_dir(args.slug) / f"_tess{n}"
            r = run(["pdftoppm", "-f", str(n), "-l", str(n), "-gray", "-r", "300", "-png", str(pdf), str(tmp)])
            imgs = sorted(pages_dir(args.slug).glob(f"_tess{n}-*.png"))
            if r.returncode != 0 or len(imgs) != 1:
                sys.exit(f"pdftoppm failed on page {n}: {r.stderr.strip()}")
            r = run(["tesseract", str(imgs[0]), "-", "-l", "eng", "--psm", "3"])
            imgs[0].unlink()
            txt = (r.stdout or "").strip()
            page_txt(args.slug, n).write_text(txt or BLANK_MARKER, encoding="utf-8")
            done += 1
        if b["status"] == "ingested":
            b["status"] = "transcribing"
        log(b, f"tesseract pages {first}-{last} ({done} new)")
        save_state(state, only=args.slug)
        print(f"{args.slug}: tesseract done for {first}-{last} ({done} new); run `check {args.slug}`")
        return
    if b["route_used"] == "epub":
        import zipfile, html
        from html.parser import HTMLParser

        class _Strip(HTMLParser):
            def __init__(self):
                super().__init__(); self.parts: list[str] = []
            def handle_data(self, d): self.parts.append(d)
            def handle_starttag(self, tag, attrs):
                if tag in ("p", "div", "br", "h1", "h2", "h3", "h4", "li"): self.parts.append("\n")
        with zipfile.ZipFile(pdf) as z:
            docs = sorted(n for n in z.namelist() if n.lower().endswith((".xhtml", ".html", ".htm")))
            for i, name in enumerate(docs, 1):
                s = _Strip(); s.feed(z.read(name).decode("utf-8", "replace"))
                txt = html.unescape("".join(s.parts))
                txt = re.sub(r"\n{3,}", "\n\n", txt).strip()
                page_txt(args.slug, i).write_text(txt or BLANK_MARKER, encoding="utf-8")
        b["pages"] = len(docs)
        log(b, f"extracted EPUB: {len(docs)} sections as pages")
    else:
        for n in range(1, b["pages"] + 1):
            if page_txt(args.slug, n).exists():
                continue
            r = run(["pdftotext", "-f", str(n), "-l", str(n), "-layout", str(pdf), "-"])
            txt = BIDI_CONTROLS.sub("", r.stdout or "").strip()
            page_txt(args.slug, n).write_text(txt or BLANK_MARKER, encoding="utf-8")
        log(b, f"extracted text layer for {b['pages']} pages")
    save_state(state, only=args.slug)
    print(f"{args.slug}: extracted; now run `check {args.slug}`")


def cmd_lease(args: argparse.Namespace) -> None:
    state = load_state()
    b = state["books"][args.slug]
    if b["pages"] == 0:
        sys.exit("ingest first")
    leased: set[int] = set()
    for r in b["leases"]:
        leased |= str_to_ranges(r)
    free = [n for n in unfinished_pages(b) if n not in leased and page_images(args.slug, n)]
    if not free:
        unrendered = [n for n in unfinished_pages(b) if n not in leased]
        if unrendered:
            sys.exit(f"no rendered free pages; run `render {args.slug} --pages {unrendered[0]}-{min(unrendered[0]+args.size-1, b['pages'])}` first")
        sys.exit("nothing to lease: all pages done or leased")
    # Take the first `size` free pages even when they are not contiguous: after an interrupted
    # round the gaps are small (a few pages per old lease) and a worker's fixed cost (reading the
    # protocol) is the same for 3 pages as for 25.
    batch = free[:args.size]
    rng = ranges_to_str(batch)
    b["leases"][rng] = {"worker": args.worker or "unnamed", "since": now()}
    if b["status"] in ("ingested", "rendering"):
        b["status"] = "transcribing"
    save_state(state, only=args.slug)
    print(json.dumps({"slug": args.slug, "range": rng, "first": batch[0], "last": batch[-1], "count": len(batch),
                      "png_dir": str(pages_dir(args.slug)), "language": b["language"],
                      "pages": {str(n): [p.name for p in page_images(args.slug, n)] for n in batch}}, ensure_ascii=False))


def cmd_eval(args: argparse.Namespace) -> None:
    """CER/WER of a worker page against a hand verified gold page, via the repo's eval/ocr/run_cer.py."""
    hyp = page_txt(args.slug, args.page)
    gold = Path(args.gold) if Path(args.gold).is_absolute() else REPO_ROOT / args.gold
    if not hyp.exists() or not gold.exists():
        sys.exit(f"missing {hyp if not hyp.exists() else gold}")
    r = run([sys.executable, str(REPO_ROOT / "eval" / "ocr" / "run_cer.py"), "--gold", str(gold), "--hyp", str(hyp)])
    print(r.stdout.strip() or r.stderr.strip())


def cmd_release(args: argparse.Namespace) -> None:
    state = load_state()
    b = state["books"][args.slug]
    if b["leases"].pop(args.range, None) is None:
        sys.exit(f"no lease {args.range}")
    log(b, f"lease {args.range} released")
    save_state(state, only=args.slug)
    print("released")


def cmd_sweep(args: argparse.Namespace) -> None:
    state = load_state()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
    n = 0
    for slug, b in state["books"].items():
        for rng, lease in list(b["leases"].items()):
            since = datetime.strptime(lease["since"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            if since < cutoff:
                del b["leases"][rng]; n += 1
                log(b, f"lease {rng} expired (worker {lease['worker']})")
    save_state(state)
    print(f"expired {n} stale leases")


def cmd_check(args: argparse.Namespace) -> None:
    state = load_state()
    b = state["books"][args.slug]
    if b["pages"] == 0:
        sys.exit("ingest first")
    done = []
    thin = []
    for n in range(1, b["pages"] + 1):
        p = page_txt(args.slug, n)
        if p.exists():
            t = p.read_text(encoding="utf-8").strip()
            if t:
                done.append(n)
                if len(t) < 40 and t != BLANK_MARKER and not t.startswith("["):
                    thin.append(n)
    b["pages_done"] = ranges_to_str(done)
    done_set = set(done)
    for rng in list(b["leases"]):
        if str_to_ranges(rng) <= done_set:
            del b["leases"][rng]
    complete = len(done) == b["pages"]
    if complete and b["status"] in ("ingested", "rendering", "transcribing"):
        ts = datetime.now().strftime("%Y-%m-%d_%H%M")
        out = book_dir(args.slug) / f"p001-end_{ts}_transcribed.txt"
        parts = []
        for n in range(1, b["pages"] + 1):
            t = page_txt(args.slug, n).read_text(encoding="utf-8").strip()
            parts.append(f"[p. {n}]\n\n{t}")
        out.write_text("\n\n".join(parts) + "\n", encoding="utf-8")
        method = {"vision": "claude-vision-in-session (Cowork cloud, page images read by Claude)",
                  "text_layer": "pdftotext-embedded-text-layer", "epub": "epub-unpacked",
                  "tesseract": "tesseract-5.3-eng-300dpi (Latin print scans)"}[b["route_used"]]
        prov = {"method": method, "source": Path(b["pdf_path"]).name, "pages": b["pages"], "render_scale": b["render_scale"],
                "page_marker": "[p. N] = 1-based PDF page index, not the printed folio",
                "note": "Transcribed page by page in a cloud session with per page checkpoints (pipeline/book_queue). "
                        "Uncertain readings are marked [OCR?], gaps [illegible], empty pages [blank page]. Draft until reviewed.",
                "reviewed": False, "assembled": now()}
        (book_dir(args.slug) / f"p001-end_{ts}_provenance.json").write_text(json.dumps(prov, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        b["assembled_file"] = str(out.relative_to(REPO_ROOT))
        b["status"] = "transcribed"
        log(b, f"assembled {out.name}")
    save_state(state, only=args.slug)
    words = 0
    if b.get("assembled_file"):
        words = len((REPO_ROOT / b["assembled_file"]).read_text(encoding="utf-8").split())
    print(f"{args.slug}: {len(done)}/{b['pages']} pages have text; status={b['status']}"
          + (f"; assembled {words} words → {b['assembled_file']}" if complete else "")
          + (f"; THIN pages (under 40 chars, look at them): {ranges_to_str(thin)}" if thin else ""))


def cmd_mark(args: argparse.Namespace) -> None:
    state = load_state()
    b = state["books"][args.slug]
    if args.status not in STATUSES:
        sys.exit(f"status must be one of {STATUSES}")
    b["status"] = args.status
    if args.file:
        if args.status == "summarized":
            b["takeaways_file"] = args.file
        elif args.status == "integrated":
            b["integrated_into"] = [s.strip() for s in args.file.split(",") if s.strip()]
    log(b, f"marked {args.status}" + (f": {args.note}" if args.note else ""))
    save_state(state, only=args.slug)
    print(f"{args.slug}: {args.status}")


def cmd_export(args: argparse.Namespace) -> None:
    state = load_state()
    b = state["books"][args.slug]
    if not b["assembled_file"]:
        sys.exit("nothing assembled yet")
    dest = Path(args.dir) / args.slug
    dest.mkdir(parents=True, exist_ok=True)
    src = REPO_ROOT / b["assembled_file"]
    shutil.copy2(src, dest / src.name)
    prov = src.with_name(src.name.replace("_transcribed.txt", "_provenance.json"))
    if prov.exists():
        shutil.copy2(prov, dest / prov.name)
    print(f"exported to {dest}")


def cmd_chunk(args: argparse.Namespace) -> None:
    """Split the assembled transcription into ~N word chunks on page boundaries for the notes stage.

    Chunks land in out/ocr/<slug>/chunks/chunk_NNN.txt and keep every `[p. N]` marker, so a note
    written from a chunk can always cite the PDF page (and the folio line inside it). Re-running is a
    no-op when chunks exist; --force rebuilds. Idempotent per book, like everything else here."""
    state = load_state()
    b = state["books"][args.slug]
    if not b.get("assembled_file"):
        sys.exit("nothing assembled yet")
    src = REPO_ROOT / b["assembled_file"]
    cdir = book_dir(args.slug) / "chunks"
    if cdir.exists() and any(cdir.glob("chunk_*.txt")) and not args.force:
        print(f"{args.slug}: {len(list(cdir.glob('chunk_*.txt')))} chunks already present")
        return
    cdir.mkdir(parents=True, exist_ok=True)
    for old in cdir.glob("chunk_*.txt"):
        old.unlink()
    text = src.read_text(encoding="utf-8")
    pages = re.split(r"(?m)^(?=\[p\. \d+\]$)", text)
    pages = [p for p in pages if p.strip()]
    chunks, cur, cur_words = [], [], 0
    for pg in pages:
        w = len(pg.split())
        if cur and cur_words + w > args.words:
            chunks.append("".join(cur)); cur, cur_words = [], 0
        cur.append(pg); cur_words += w
    if cur:
        chunks.append("".join(cur))
    for i, c in enumerate(chunks, 1):
        (cdir / f"chunk_{i:03d}.txt").write_text(c, encoding="utf-8")
    b["chunks"] = len(chunks)
    log(b, f"chunked into {len(chunks)} chunks of ~{args.words} words")
    save_state(state, only=args.slug)
    print(f"{args.slug}: {len(chunks)} chunks written to {cdir.relative_to(REPO_ROOT)} (target {args.words} words)")


def cmd_notes_status(args: argparse.Namespace) -> None:
    """Which chunks still lack a notes file (chunk_NNN.notes.md).

    Guards a false green measured 18 September 2026 (HANDOVER 9.202c). `out/` is gitignored, so on a
    fresh clone, or after any cleanup, a book's chunks are simply absent -- and the old version of
    this command then printed {"chunks": 0, "notes_missing": []}, which is indistinguishable from a
    fully noted book. **24 of the 42 books were in exactly that state, three of them already marked
    `summarized`.** A caller reading `notes_missing` alone would have concluded they were done.

    So the count recorded in state.json is now compared against disk, and the command EXITS NON-ZERO
    on any disagreement (RULE 4: a check that fails loudly beats a note saying be careful). The
    original two keys are unchanged, so existing callers keep working; `chunks_recorded`, `chunks_ok`,
    `notes_present` and `warning` are additive. Remedy for a mismatch is not to re-transcribe: run
    `queue.py chunk <slug> --words N` with the N in that book's own log line, then restore the notes
    from the committed copies under entries/book_takeaways/<slug>/ (9.195)."""
    cdir = book_dir(args.slug) / "chunks"
    chunks = sorted(cdir.glob("chunk_*.txt")) if cdir.exists() else []
    missing = [c.name for c in chunks if not c.with_suffix(".notes.md").exists()]
    notes_present = len(sorted(cdir.glob("chunk_*.notes.md"))) if cdir.exists() else 0

    recorded = None
    try:
        recorded = load_state()["books"][args.slug].get("chunks")
    except Exception:
        pass

    out = {"slug": args.slug, "chunks": len(chunks), "notes_missing": missing,
           "chunks_recorded": recorded, "notes_present": notes_present}
    ok = recorded is None or int(recorded or 0) == len(chunks)
    out["chunks_ok"] = ok
    if not ok:
        committed = REPO_ROOT / "entries" / "book_takeaways" / args.slug
        n_committed = len(sorted(committed.glob("chunk_*.notes.md"))) if committed.is_dir() else 0
        out["notes_committed"] = n_committed
        out["warning"] = (
            f"state.json records {recorded} chunks but {len(chunks)} are on disk in "
            f"{cdir.relative_to(REPO_ROOT)}. notes_missing is NOT trustworthy here: an empty list "
            f"means only that no chunk file was found to be missing a note. "
            f"{n_committed} committed notes exist under entries/book_takeaways/{args.slug}/. "
            f"Re-chunk with the words value in this book's log line, then copy those notes back in.")
    print(json.dumps(out))
    if not ok:
        sys.exit(1)


def cmd_folio_check(args: argparse.Namespace) -> None:
    """Invariant: the PDF index minus the printed folio should be one constant per book.

    Why this exists (CLAUDE.md RULE 4): a worker reading the folio tens digit one too high is
    invisible inside its own 25 page batch and obvious across the book. It happened twice on
    hadeeqat_ul_aulia (pages 76-100 and 176-200, offset 2 where 290 pages gave 12) and once on
    tareekh_lahore (51-75, offset -5 where the rest gave +3). Run this after every batch.
    A book legitimately has more than one offset when leaves are missing or a section restarts the
    numbering, so a second offset is a question, not automatically an error: it fails only when a
    minority offset covers fewer pages than --min-share of the book."""
    state = load_state()
    b = state["books"][args.slug]
    d = pages_dir(args.slug)
    offs: dict[int, list[int]] = {}
    read = 0
    for n in range(1, b["pages"] + 1):
        f = page_txt(args.slug, n)
        if not f.exists():
            continue
        read += 1
        m = re.match(r"\[folio (\d+)\]", f.read_text(encoding="utf-8"))
        if m:
            offs.setdefault(n - int(m.group(1)), []).append(n)
    if read == 0:
        # RULE 4, and the same trap this file's own docstring names: until 16 September 2026 this
        # printed "no folio lines found" and exited 0 when it had read nothing at all. `out/` is
        # gitignored and per-page text is cleared once a book is assembled, so on a working copy
        # holding only assembled books that reassuring line was the answer for EVERY book. An
        # instrument that reports what it could not see is worse than no instrument. This check
        # reads pages/ only; it deliberately does not fall back to the assembled file, because the
        # offsets it exists to catch are per-page facts.
        print(f"{args.slug}: CANNOT CHECK \u2014 no page text in {d} (0 of {b['pages']} pages). "
              f"Re-render and re-transcribe, or restore pages/, before trusting a folio result.",
              file=sys.stderr)
        sys.exit(2)
    if not offs:
        print(f"{args.slug}: {read} pages read, none carry a folio line"); return
    total = sum(len(v) for v in offs.values())
    ranked = sorted(offs.items(), key=lambda kv: -len(kv[1]))
    print(f"{args.slug}: {total} pages carry a folio line")
    bad = False
    for off, pages in ranked:
        share = len(pages) / total
        flag = ""
        if off != ranked[0][0] and share < args.min_share:
            flag = "  <-- CHECK: a minority offset this small is usually a misread tens digit"
            bad = True
        print(f"  offset {off:+d}: {len(pages):4d} pages ({share:.0%}) {ranges_to_str(pages)[:80]}{flag}")
    b["folio_offsets"] = {str(off): ranges_to_str(pages) for off, pages in ranked}
    save_state(state, only=args.slug)
    if bad:
        sys.exit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init").set_defaults(fn=cmd_init)
    p = sub.add_parser("status"); p.add_argument("--group"); p.set_defaults(fn=cmd_status)
    sub.add_parser("next").set_defaults(fn=cmd_next)
    p = sub.add_parser("ingest"); p.add_argument("slug"); p.add_argument("pdf"); p.add_argument("--force", action="store_true"); p.set_defaults(fn=cmd_ingest)
    p = sub.add_parser("render"); p.add_argument("slug"); p.add_argument("--scale", type=int, help=f"long edge px; {SCALE_STANDARD} standard tier, {SCALE_HIRES} high res tier")
    p.add_argument("--pages"); p.add_argument("--split-spreads", action="store_true", help="cut landscape two page scans into two images")
    p.add_argument("--halves", action="store_true", help="cut each page into overlapping top and bottom halves (dense lithographs)")
    p.add_argument("--rerender", action="store_true", help="always rasterise with pdftoppm instead of extracting the embedded scan")
    p.add_argument("--keep-color", action="store_true", help="do not convert to grayscale"); p.set_defaults(fn=cmd_render)
    p.add_argument("--redo", action="store_true", help="re-prepare pages that already have images (to change scale or mode)")
    p = sub.add_parser("eval"); p.add_argument("slug"); p.add_argument("page", type=int); p.add_argument("gold", help="path to the hand verified gold text for that page"); p.set_defaults(fn=cmd_eval)
    p = sub.add_parser("extract"); p.add_argument("slug"); p.add_argument("--pages", help="tesseract only: A-B page range"); p.set_defaults(fn=cmd_extract)
    p = sub.add_parser("lease"); p.add_argument("slug"); p.add_argument("--size", type=int, default=DEFAULT_LEASE); p.add_argument("--worker"); p.set_defaults(fn=cmd_lease)
    p = sub.add_parser("release"); p.add_argument("slug"); p.add_argument("range"); p.set_defaults(fn=cmd_release)
    p = sub.add_parser("sweep-leases"); p.add_argument("--hours", type=float, default=3); p.set_defaults(fn=cmd_sweep)
    p = sub.add_parser("check"); p.add_argument("slug"); p.set_defaults(fn=cmd_check)
    p = sub.add_parser("mark"); p.add_argument("slug"); p.add_argument("status"); p.add_argument("--note"); p.add_argument("--file"); p.set_defaults(fn=cmd_mark)
    p = sub.add_parser("export"); p.add_argument("slug"); p.add_argument("dir"); p.set_defaults(fn=cmd_export)
    p = sub.add_parser("chunk"); p.add_argument("slug"); p.add_argument("--words", type=int, default=6000); p.add_argument("--force", action="store_true"); p.set_defaults(fn=cmd_chunk)
    p = sub.add_parser("notes-status"); p.add_argument("slug"); p.set_defaults(fn=cmd_notes_status)
    p = sub.add_parser("folio-check"); p.add_argument("slug"); p.add_argument("--min-share", type=float, default=0.15); p.set_defaults(fn=cmd_folio_check)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
