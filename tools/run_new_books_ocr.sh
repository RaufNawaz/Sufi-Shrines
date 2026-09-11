#!/usr/bin/env bash
# tools/run_new_books_ocr.sh — OCR everything downloaded on 2026-09-11, routed by script.
#
#   Urdu / Persian scans   books/incoming-2026-09-11/          → UTRNet (local server on :7860)
#   English print PDFs     books/incoming-2026-09-11-english/  → pdftotext text layer, else Tesseract eng
#   EPUBs                  either folder                       → tools/extract_epub_text.py
#
# Every step skips books that already have a transcription in out/ocr/<book>/,
# so this is safe to re-run after an interruption. Flags after the script name
# are passed straight to ocr_all_books.py (e.g. --workers 2 --dpi 200 --max-pages 3
# for a smoke test).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
PY="${PYTHON:-$REPO_ROOT/.venv/bin/python}"
[ -x "$PY" ] || PY=python3
INCOMING="books/incoming-2026-09-11"
INCOMING_EN="books/incoming-2026-09-11-english"
UTRNET_URL="${UTRNET_URL:-http://127.0.0.1:7860}"

[ -d "$INCOMING" ] || { echo "ERROR: $INCOMING does not exist — download first (see docs/OCR_NEW_MACHINE_RUNBOOK.md step 4)" >&2; exit 1; }

# ── EPUBs (no OCR) ───────────────────────────────────────────────────────────
if compgen -G "$INCOMING/*.epub" >/dev/null || compgen -G "$INCOMING_EN/*.epub" >/dev/null; then
  echo "== EPUB text extraction"
  "$PY" tools/extract_epub_text.py $(ls "$INCOMING"/*.epub "$INCOMING_EN"/*.epub 2>/dev/null)
fi

# ── Urdu / Persian scans → UTRNet ────────────────────────────────────────────
if compgen -G "$INCOMING/*.pdf" >/dev/null; then
  echo "== Urdu/Persian scans → UTRNet at $UTRNET_URL"
  if ! curl -sf -o /dev/null --max-time 5 "$UTRNET_URL"; then
    echo "ERROR: UTRNet server not reachable at $UTRNET_URL. Start it first:" >&2
    echo "  cd ../End-To-End-Urdu-OCR-WebApp && source .venv/bin/activate && python app.py" >&2
    exit 2
  fi
  "$PY" tools/ocr_all_books.py --books-dir "$INCOMING" --utrnet-url "$UTRNET_URL" "$@"
else
  echo "== no PDFs in $INCOMING (all sorted elsewhere, or not downloaded)"
fi

# ── English print → text layer, else Tesseract eng ───────────────────────────
if [ -d "$INCOMING_EN" ] && compgen -G "$INCOMING_EN/*.pdf" >/dev/null; then
  echo "== English print → pdftotext text layer, Tesseract (eng) for the scans"
  # ocr_all_books.py extracts any usable embedded text layer before it OCRs anything;
  # what is left is scanned pages, and those must go to Tesseract with English data —
  # UTRNet is Urdu-only and would transcribe them as Urdu-looking noise.
  TESSERACT_LANG=eng "$PY" tools/ocr_all_books.py --books-dir "$INCOMING_EN" --ocr-engine tesseract "$@"
fi

echo
echo "Done. Status table: $PY tools/ocr_status.py  →  out/ocr/STATUS.md"
echo "Note: tools/finalize_books.py only knows the 30 books of July (BOOKS_INFO); the new ones are"
echo "      reviewed by hand from out/ocr/<book>/p001-end_*_transcribed.txt until rows are added."
