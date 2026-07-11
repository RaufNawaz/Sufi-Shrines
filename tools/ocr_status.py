"""Regenerate out/ocr/STATUS.md — a live progress dashboard for the OCR batch.

Everything is derived from the filesystem (worker logs, transcription files,
Final/finalized.json), so this works no matter how the batch was launched.
Intended to be run in a loop (e.g. every 30s); writes atomically so the file
is always complete when read.
"""
from __future__ import annotations

import io
import json
import re
import shutil
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from finalize_books import BOOKS_INFO, newest_transcription  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
OCR_ROOT = REPO_ROOT / "out" / "ocr"
LOGS_DIR = OCR_ROOT / "logs"
STATUS_PATH = OCR_ROOT / "STATUS.md"
RUNNING_WINDOW_SECONDS = 90
FALLBACK_SECONDS_PER_PAGE = 2.2

PAGE_LINE = re.compile(r"OCR page (\d+)/(\d+)")


def book_status(stem: str) -> dict:
    pages, language = BOOKS_INFO[stem]
    info = {"stem": stem, "pages": pages, "language": language}

    transcription = None
    book_dir = OCR_ROOT / stem
    if book_dir.is_dir():
        transcription = newest_transcription(book_dir)
    if transcription is not None:
        info["status"] = "done"
        info["chars"] = len(transcription.read_text(encoding="utf-8", errors="replace"))
        info["output"] = transcription.name
        return info

    log_path = LOGS_DIR / f"{stem}.log"
    if log_path.exists():
        age = time.time() - log_path.stat().st_mtime
        content = log_path.read_text(encoding="utf-8", errors="replace")
        matches = PAGE_LINE.findall(content)
        page, total = (int(matches[-1][0]), int(matches[-1][1])) if matches else (0, pages)
        info["progress"] = (page, total)
        info["elapsed"] = time.time() - log_path.stat().st_ctime
        info["status"] = "running" if age <= RUNNING_WINDOW_SECONDS else "stalled"
        return info

    info["status"] = "queued"
    return info


def batch_is_active() -> bool:
    """True when workers show signs of life: fresh logs or fresh page renders.

    A worker rendering a 500-page book writes nothing to its log for many
    minutes, but pdftoppm drops page PNGs into a shrine-book-* temp dir
    continuously — so check both.
    """
    freshest = 0.0
    if LOGS_DIR.is_dir():
        for log in LOGS_DIR.glob("*.log"):
            freshest = max(freshest, log.stat().st_mtime)
    for root in (Path(tempfile.gettempdir()), REPO_ROOT / "out" / "tmp"):
        if not root.is_dir():
            continue
        for temp_dir in root.glob("shrine-book-*"):
            pages_dir = temp_dir / "pages"
            for png in (pages_dir if pages_dir.is_dir() else temp_dir).glob("*.png"):
                freshest = max(freshest, png.stat().st_mtime)
    return bool(freshest) and (time.time() - freshest) <= 120


def active_renders() -> list[str]:
    """Page counts of render folders written to in the last 2 minutes."""
    lines = []
    for root in (REPO_ROOT / "out" / "tmp", Path(tempfile.gettempdir())):
        if not root.is_dir():
            continue
        for temp_dir in root.glob("shrine-book-*"):
            pages = list((temp_dir / "pages").glob("page-*.png"))
            if not pages:
                continue
            newest = max(p.stat().st_mtime for p in pages)
            if time.time() - newest <= 120:
                lines.append(f"{len(pages)} pages rendered so far ({temp_dir.name[-8:]})")
    return lines


def main() -> int:
    final_state: dict[str, dict] = {}
    final_path = OCR_ROOT / "Final" / "finalized.json"
    if final_path.exists():
        final_state = json.loads(final_path.read_text(encoding="utf-8"))

    books = [book_status(stem) for stem in sorted(BOOKS_INFO)]
    if any(b["status"] == "stalled" for b in books) and batch_is_active():
        for b in books:
            if b["status"] == "stalled":
                b["status"] = "rendering" if b["progress"][0] == 0 else "running"

    done = [b for b in books if b["status"] == "done"]
    running = [b for b in books if b["status"] in ("running", "rendering")]
    queued = [b for b in books if b["status"] == "queued"]
    stalled = [b for b in books if b["status"] == "stalled"]

    remaining_pages = sum(b["pages"] for b in queued)
    for b in running:
        page, total = b["progress"]
        remaining_pages += max(0, total - page)
    eta_minutes = int(remaining_pages * FALLBACK_SECONDS_PER_PAGE / 60)

    lines = [
        "# OCR Batch Status",
        "",
        f"_Updated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} — refreshes every ~30s. "
        "Close and reopen (or use an auto-reloading editor) to see updates._",
        "",
        f"**{len(done)}/{len(books)} books transcribed** · {len(running)} running · "
        f"{len(queued)} queued · {len(stalled)} stalled · "
        f"rough ETA for the rest: ~{eta_minutes} min ({remaining_pages} pages left)",
        "",
        f"Disk free: C: {shutil.disk_usage('C:').free / 1e9:.1f} GB · "
        f"D: {shutil.disk_usage('D:').free / 1e9:.1f} GB",
        *(
            [""] + [f"**Live renders:** {' · '.join(render_lines)}"]
            if (render_lines := active_renders())
            else []
        ),
        "",
        "| # | Book | Pages | Status | Finalized |",
        "|---|------|-------|--------|-----------|",
    ]

    for b in books:
        stem = b["stem"]
        number = stem.split("_", 1)[0]
        title = stem.split("_", 1)[1] if "_" in stem else stem
        fin = final_state.get(stem, {})
        if fin.get("status") == "finalized":
            fin_cell = f"✅ {fin['final_name']}"
        elif fin.get("status") == "held":
            fin_cell = f"🔒 held: {fin['reason'][:60]}"
        else:
            fin_cell = "—"

        if b["status"] == "done":
            status = f"✅ done ({b['chars']:,} chars)"
        elif b["status"] == "running":
            page, total = b["progress"]
            pct = f"{page / total:.0%}" if total else "…"
            status = f"🔄 page {page}/{total} ({pct}, {int(b['elapsed'] // 60)}m elapsed)"
        elif b["status"] == "rendering":
            status = f"🔄 rendering page images ({int(b['elapsed'] // 60)}m elapsed, OCR starts after)"
        elif b["status"] == "stalled":
            page, total = b["progress"]
            status = f"⚠️ interrupted at page {page}/{total} — will redo on next batch run"
        else:
            status = "⏳ queued"

        lines.append(f"| {number} | {title[:48]} | {b['pages']} | {status} | {fin_cell} |")

    lines += [
        "",
        "Legend: ✅ transcribed · 🔄 OCR in progress · ⏳ waiting for a worker · "
        "⚠️ interrupted · 🔒 failed verification (see reason)",
        "",
        "Transcriptions: `out/ocr/<book>/p001-end_*_transcribed.txt` · "
        "Verified copies with human names: `out/ocr/Final/` · "
        "Per-book OCR logs: `out/ocr/logs/`",
    ]

    tmp = STATUS_PATH.with_suffix(".md.tmp")
    tmp.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    tmp.replace(STATUS_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
