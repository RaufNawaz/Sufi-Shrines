#!/usr/bin/env bash
# Build shrines-ocr-library-kit.zip — a portable bundle of the OCR pipeline
# for a library/public workstation that resets between visits (see
# docs/LIBRARY_OCR_SETUP.md, which this kit ships alongside).
#
# Deliberately excludes book PDFs and OCR model weights (both re-fetched from
# the internet at the destination) so the kit stays small enough to email.
# Run from anywhere; paths are resolved relative to the repo root.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_ZIP="$REPO_ROOT/shrines-ocr-library-kit.zip"
STAGE="$(mktemp -d)/shrines-ocr-library-kit"

cd "$REPO_ROOT"

for required in books/links.txt books/manifest.json books/renames.json out/ocr; do
  if [ ! -e "$required" ]; then
    echo "ERROR: expected $required — run from a checkout with the local OCR state present." >&2
    exit 1
  fi
done

mkdir -p "$STAGE"

cp docs/LIBRARY_OCR_SETUP.md "$STAGE/SETUP.md"
cp requirements.txt "$STAGE/"

mkdir -p "$STAGE/tools"
cp tools/_lib.py tools/download_books.py tools/process_books.py \
   tools/ocr_all_books.py tools/ocr_status.py tools/finalize_books.py \
   tools/ocr_postcorrect.py \
   "$STAGE/tools/"

mkdir -p "$STAGE/books"
cp books/links.txt books/manifest.json books/renames.json "$STAGE/books/"

mkdir -p "$STAGE/data"
cp data/glossary.csv "$STAGE/data/" 2>/dev/null || true

mkdir -p "$STAGE/docs"
cp docs/BOOK_OCR_WORKFLOW.md docs/LOCAL_OCR_QUICKSTART.md "$STAGE/docs/"

# The 30 already-finished transcriptions — lets ocr_all_books.py skip them
# instead of re-OCRing the whole corpus on the library machine.
cp -r out/ocr "$STAGE/out-ocr-tmp"
mkdir -p "$STAGE/out"
mv "$STAGE/out-ocr-tmp" "$STAGE/out/ocr"

rm -f "$OUT_ZIP"
( cd "$(dirname "$STAGE")" && zip -rq "$OUT_ZIP" "$(basename "$STAGE")" )

rm -rf "$(dirname "$STAGE")"

echo "Built: $OUT_ZIP"
du -sh "$OUT_ZIP"
