"""Run Urdu OCR on every PDF in books/ using parallel process_books.py workers.

Each worker is one `tools/process_books.py --test-pdf ...` subprocess. All
workers send page images to the same local UTRNet server, which runs the
models on the GPU and processes one prediction at a time (Gradio queues the
rest) — so a small worker pool keeps the GPU busy while other workers render
PDF pages on the CPU. More workers than ~4 adds nothing.

Per-book output lands where process_books.py always puts it:
  out/ocr/<book-name>/pXXX-end_<timestamp>_transcribed.txt
Per-book logs go to out/ocr/logs/<book-name>.log. Books that already have a
transcription for the requested page range are skipped (use --force to redo).

Prerequisite (in a separate PowerShell window, leave it running):
  cd "D:\\Harvard\\End-To-End-Urdu-OCR-WebApp"
  .\\.venv\\Scripts\\Activate.ps1
  python app.py

Examples:
  py -3 tools/ocr_all_books.py                          # OCR all of books/
  py -3 tools/ocr_all_books.py --max-pages 2            # quick smoke test
  py -3 tools/ocr_all_books.py --workers 2 --dpi 300    # gentler, higher res
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from collections import deque
from datetime import datetime
from pathlib import Path

# Sibling modules are importable as-is when run as `python3 tools/ocr_all_books.py`.
from _lib import OCR_ROOT, REPO_ROOT, safe_filename_part, utf8_stdio
from process_books import get_page_range_label

utf8_stdio()

DEFAULT_LOCAL_UTRNET = "http://127.0.0.1:7860"
HEARTBEAT_SECONDS = 60

# Born-digital PDFs (e.g. Word exports) carry an exact embedded text layer —
# extracting it beats OCR every time. Corrupt layers (unmapped glyphs → U+FFFD)
# and watermark-only layers must still go to OCR.
EXTRACT_PROBE_PAGES = 10
EXTRACT_MIN_TOTAL_CHARS = 1200
EXTRACT_MAX_BAD_RATIO = 0.02
BIDI_CONTROLS = re.compile("[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]")


def has_usable_text_layer(pdf: Path, pdftotext: str) -> bool:
    try:
        result = subprocess.run(
            [pdftotext, "-f", "1", "-l", str(EXTRACT_PROBE_PAGES), "-enc", "UTF-8", str(pdf), "-"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    if result.returncode != 0:
        return False
    stripped = re.sub(r"\s+", "", result.stdout)
    if len(stripped) < EXTRACT_MIN_TOTAL_CHARS:
        return False
    return stripped.count("\ufffd") / len(stripped) <= EXTRACT_MAX_BAD_RATIO


def extract_text_layer(job: "Job", page_range: str, args: argparse.Namespace, pdftotext: str) -> None:
    command = [pdftotext, "-enc", "UTF-8", "-f", str(args.first_page)]
    if args.max_pages > 0:
        command += ["-l", str(args.first_page + args.max_pages - 1)]
    command += [str(job.pdf), "-"]
    result = subprocess.run(
        command, capture_output=True, text=True, encoding="utf-8", errors="replace",
        timeout=args.command_timeout,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip()[:300] or f"pdftotext exit {result.returncode}")

    text = BIDI_CONTROLS.sub("", result.stdout)
    text = text.replace("\f", "\n\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        raise RuntimeError("text-layer extraction produced no text")

    job.output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = job.output_dir / f"{page_range}_{timestamp}_transcribed.txt"
    out_path.write_text(text + "\n", encoding="utf-8", newline="\n")
    provenance = {
        "method": "pdftotext-embedded-text-layer",
        "source": job.pdf.name,
        "note": (
            "Extracted from the PDF's embedded text layer; no OCR run. Legacy "
            "OCR layers (Acrobat 'Paper Capture') contain their own errors — review."
        ),
        "reviewed": False,
    }
    (job.output_dir / f"{page_range}_{timestamp}_provenance.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    job.result = f"OK   {out_path.relative_to(REPO_ROOT)} ({len(text)} chars, extracted text layer)"


def format_duration(seconds: float) -> str:
    minutes, secs = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes:02d}m"
    if minutes:
        return f"{minutes}m {secs:02d}s"
    return f"{secs}s"


def sweep_render_scratch(root: Path, min_age_seconds: float) -> int:
    """Delete leftover shrine-book-* render folders (normal completions clean
    themselves; killed/crashed workers leave theirs behind)."""
    if not root.is_dir():
        return 0
    swept = 0
    now = time.time()
    for stale in root.glob("shrine-book-*"):
        try:
            if now - stale.stat().st_mtime >= min_age_seconds:
                shutil.rmtree(stale, ignore_errors=True)
                swept += 1
        except OSError:
            continue
    return swept


def server_is_up(url: str, timeout: int = 5) -> bool:
    request = urllib.request.Request(url, headers={"User-Agent": "ShrineOCRBatch/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout):
            return True
    except urllib.error.HTTPError:
        return True  # server answered, whatever the status
    except Exception:  # noqa: BLE001
        return False


class Job:
    def __init__(self, pdf: Path, book_name: str, log_path: Path, output_dir: Path):
        self.pdf = pdf
        self.book_name = book_name
        self.log_path = log_path
        self.output_dir = output_dir
        self.process: subprocess.Popen | None = None
        self.log_file = None
        self.started_at = 0.0
        self.result = ""
        self.duration = 0.0


def build_command(job: Job, args: argparse.Namespace) -> list[str]:
    command = [
        sys.executable,
        str(REPO_ROOT / "tools" / "process_books.py"),
        "--test-pdf", str(job.pdf),
        "--first-page", str(args.first_page),
        "--dpi", str(args.dpi),
        "--ocr-engine", args.ocr_engine,
        "--utrnet-url", args.utrnet_url,
        "--command-timeout", str(args.command_timeout),
    ]
    if args.max_pages > 0:
        command += ["--max-pages", str(args.max_pages)]
    if args.split_spreads:
        command += ["--split-spreads"]
    if args.ocr_engine == "tesseract":
        tessdata = REPO_ROOT / "tessdata"
        if tessdata.is_dir():
            command += ["--tessdata-dir", str(tessdata)]
    return command


def newest_transcription(job: Job, page_range: str) -> Path | None:
    candidates = sorted(
        job.output_dir.glob(f"{page_range}_*_transcribed.txt"),
        key=lambda path: path.stat().st_mtime,
    )
    return candidates[-1] if candidates else None


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--books-dir", default=str(REPO_ROOT / "books"))
    parser.add_argument("--workers", type=int, default=3, help="Parallel books (default 3).")
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--first-page", type=int, default=1)
    parser.add_argument("--max-pages", type=int, default=0, help="0 = whole book.")
    parser.add_argument("--ocr-engine", choices=("utrnet", "tesseract"), default="utrnet")
    parser.add_argument("--split-spreads", action="store_true",
                        help="Pass --split-spreads to every worker (two-page spread scans).")
    parser.add_argument(
        "--utrnet-url",
        default=os.getenv("UTRNET_URL", DEFAULT_LOCAL_UTRNET),
        help="Local UTRNet server (default http://127.0.0.1:7860 — your GPU).",
    )
    parser.add_argument("--command-timeout", type=int, default=1800,
                        help="Per pdftoppm/tesseract call timeout in seconds.")
    parser.add_argument("--temp-dir", default="",
                        help="Redirect workers' TEMP/TMP (page-render scratch) to this directory.")
    parser.add_argument("--pdftotext", default=os.getenv("PDFTOTEXT", "pdftotext"))
    parser.add_argument("--force-ocr", action="store_true",
                        help="OCR every book, even ones with a usable embedded text layer.")
    parser.add_argument(
        "--ocr-anyway",
        default="08_BaleJibreel,28_Talzeem",
        help=(
            "Comma-separated filename substrings that must always be OCRed, never "
            "text-layer extracted. Defaults cover known-bad layers: 08 stores text "
            "in reversed visual order, 28 has unmapped (corrupt) glyphs."
        ),
    )
    parser.add_argument("--limit", type=int, default=0, help="Process at most N books.")
    parser.add_argument("--force", action="store_true", help="Redo books that already have output.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.workers < 1:
        print("ERROR: --workers must be at least 1", file=sys.stderr)
        return 1

    books_dir = Path(args.books_dir)
    if not books_dir.is_dir():
        print(f"ERROR: books directory not found: {books_dir}", file=sys.stderr)
        return 1

    pdfs = sorted(path for path in books_dir.glob("*.pdf") if path.is_file())
    if args.limit > 0:
        pdfs = pdfs[: args.limit]
    if not pdfs:
        print(f"ERROR: no PDFs found in {books_dir}", file=sys.stderr)
        return 1

    skipped_others = [
        path.name
        for path in books_dir.glob("*")
        if path.is_file() and path.suffix.lower() != ".pdf"
        and path.name not in ("links.txt", "manifest.json", "renames.json")
    ]
    if skipped_others:
        print(f"Ignoring non-PDF file(s): {', '.join(skipped_others)}")

    # Book name must be unique because it names the output folder.
    names: dict[str, Path] = {}
    conflicts: list[str] = []
    jobs: list[Job] = []
    page_range = get_page_range_label(args.first_page, args.max_pages)
    out_root = OCR_ROOT
    logs_dir = out_root / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    for pdf in pdfs:
        book_name = safe_filename_part(pdf.stem)
        if book_name in names:
            conflicts.append(
                f"  {pdf.name} and {names[book_name].name} both map to output name "
                f"'{book_name}' — rename one (e.g. add a numeric prefix)."
            )
            continue
        names[book_name] = pdf
        jobs.append(Job(pdf, book_name, logs_dir / f"{book_name}.log", out_root / book_name))

    if conflicts:
        print("ERROR: conflicting book names; these files were NOT queued:", file=sys.stderr)
        for line in conflicts:
            print(line, file=sys.stderr)

    pdftotext = None if args.force_ocr else shutil.which(args.pdftotext)
    if not args.force_ocr and not pdftotext:
        print("NOTE: pdftotext not found — text-layer detection disabled, OCR-ing everything.")
    ocr_anyway = [part.strip().lower() for part in args.ocr_anyway.split(",") if part.strip()]

    pending: deque[Job] = deque()
    extract_jobs: list[Job] = []
    skipped: list[Job] = []
    for job in jobs:
        if not args.force and any(job.output_dir.glob(f"{page_range}_*_transcribed.txt")):
            job.result = "SKIP (already transcribed; use --force to redo)"
            skipped.append(job)
        elif (
            pdftotext
            and not any(part in job.pdf.name.lower() for part in ocr_anyway)
            and has_usable_text_layer(job.pdf, pdftotext)
        ):
            extract_jobs.append(job)
        else:
            pending.append(job)

    if args.ocr_engine == "utrnet" and pending and not server_is_up(args.utrnet_url):
        print(
            f"ERROR: UTRNet server is not reachable at {args.utrnet_url}\n"
            "Start it in a separate PowerShell window and leave it running:\n"
            '  cd "D:\\Harvard\\End-To-End-Urdu-OCR-WebApp"\n'
            "  .\\.venv\\Scripts\\Activate.ps1\n"
            "  python app.py",
            file=sys.stderr,
        )
        return 2

    print(
        f"OCR batch: {len(pending)} book(s) to OCR, {len(extract_jobs)} with embedded "
        f"text layer (extracted directly, no OCR), {len(skipped)} already done, "
        f"workers={args.workers}, engine={args.ocr_engine}, dpi={args.dpi}, "
        f"pages={page_range}"
    )
    for job in skipped:
        print(f"  SKIP {job.pdf.name}")

    scratch_root = Path(args.temp_dir).resolve() if args.temp_dir else Path(tempfile.gettempdir())
    if args.temp_dir:
        scratch_root.mkdir(parents=True, exist_ok=True)
    swept = sweep_render_scratch(scratch_root, 3600)
    if swept:
        print(f"cleaned {swept} stale render folder(s) in {scratch_root}")

    running: list[Job] = []
    finished: list[Job] = []
    failures = 0
    started_at = time.monotonic()
    last_heartbeat = started_at

    for job in extract_jobs:
        extract_started = time.monotonic()
        try:
            extract_text_layer(job, page_range, args, pdftotext)
        except Exception as exc:  # noqa: BLE001 - record and move on to the OCR books
            failures += 1
            job.result = f"FAIL text-layer extraction: {exc}"
        job.duration = time.monotonic() - extract_started
        finished.append(job)
        print(f"{job.result.split()[0]} {job.pdf.name} — embedded text layer, extracted without OCR")

    def start_next() -> None:
        job = pending.popleft()
        job.log_file = job.log_path.open("w", encoding="utf-8")
        env = dict(os.environ, PYTHONUTF8="1")
        if args.temp_dir:
            env["TEMP"] = env["TMP"] = str(scratch_root)
        job.started_at = time.monotonic()
        job.process = subprocess.Popen(
            build_command(job, args),
            stdout=job.log_file,
            stderr=subprocess.STDOUT,
            cwd=REPO_ROOT,
            env=env,
        )
        running.append(job)
        print(f"START {job.pdf.name}  (log: {job.log_path.relative_to(REPO_ROOT)})")

    try:
        while pending or running:
            while pending and len(running) < args.workers:
                start_next()

            for job in list(running):
                code = job.process.poll()
                if code is None:
                    continue
                running.remove(job)
                job.log_file.close()
                job.duration = time.monotonic() - job.started_at
                output_file = newest_transcription(job, page_range)
                empty_pages = job.log_path.read_text(
                    encoding="utf-8", errors="replace"
                ).count("WARNING: page")
                empty_note = f", {empty_pages} EMPTY page(s) — check log" if empty_pages else ""
                if code == 0 and output_file is not None:
                    chars = len(output_file.read_text(encoding="utf-8", errors="replace"))
                    job.result = f"OK   {output_file.relative_to(REPO_ROOT)} ({chars} chars{empty_note})"
                else:
                    failures += 1
                    job.result = (
                        f"FAIL exit={code} — see {job.log_path.relative_to(REPO_ROOT)}"
                    )
                finished.append(job)
                print(
                    f"{job.result.split()[0]} {job.pdf.name} in {format_duration(job.duration)} "
                    f"[{len(finished)}/{len(finished) + len(running) + len(pending)} done]"
                )

            now = time.monotonic()
            if running and now - last_heartbeat >= HEARTBEAT_SECONDS:
                last_heartbeat = now
                active = ", ".join(
                    f"{job.pdf.name} ({format_duration(now - job.started_at)})"
                    for job in running
                )
                print(f"  ...running: {active}; {len(pending)} queued, {len(finished)} done")

            if running:
                time.sleep(2)
    except KeyboardInterrupt:
        print("\nInterrupted — terminating workers...", file=sys.stderr)
        for job in running:
            job.process.terminate()
            job.result = "ABORTED"
            if job.log_file:
                job.log_file.close()
            finished.append(job)
        failures += len(running) or 1
        time.sleep(2)
        sweep_render_scratch(scratch_root, 0)

    print(f"\n===== Summary ({format_duration(time.monotonic() - started_at)} total) =====")
    for job in skipped + finished:
        duration = f" [{format_duration(job.duration)}]" if job.duration else ""
        print(f"  {job.pdf.name}: {job.result}{duration}")
    done_ok = sum(1 for job in finished if job.result.startswith("OK"))
    print(f"\nOK: {done_ok}  FAIL: {failures}  SKIP: {len(skipped)}")
    if failures == 0 and done_ok:
        print("Next steps: py -3 tools/ocr_postcorrect.py and py -3 tools/extract.py")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
