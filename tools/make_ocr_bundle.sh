#!/usr/bin/env bash
# tools/make_ocr_bundle.sh — build the ONE zip that moves the book-OCR batch to another
# machine. Unzip it anywhere; the runbook's three commands then work from inside it.
#
#   bash tools/make_ocr_bundle.sh                    # ~/Desktop/shrines-ocr-bundle-<date>.zip, then self-checks it
#   bash tools/make_ocr_bundle.sh --out /Volumes/X   # write it somewhere else
#   bash tools/make_ocr_bundle.sh --no-check         # skip the unzip-and-dry-run self-check
#
# What goes in — two top-level folders with plain ASCII names (the repo folder's curly
# apostrophe, CLAUDE.md RULE 1, does not travel):
#   Shrines Project/               the working tree minus .git, node_modules, .venv, dist,
#                                  media-source, and the 30 July scans (books/*.pdf: already
#                                  transcribed — out/ocr/ carries the transcriptions)
#     books/incoming-2026-09-11*/  the 42 new books (17 Urdu/Persian, 24 English PDFs, 1 EPUB)
#     out/                         the 30 finished transcriptions, so the batch skips them
#     tessdata/                    urd + fas Tesseract data (gitignored — a clone lacks it)
#   End-To-End-Urdu-OCR-WebApp/    the UTRNet server WITH both model files and the local
#                                  patch (batched, text-only /predict) — minus its venvs
#   START_HERE.txt                 the commands, in order
#   BUNDLE_SHA256SUMS.txt          every file's sha256; verify_bundle.sh checks them
#
# Refuses to build (RULE 4 — fail loudly, never "be careful") if any of the 42 wanted
# files is missing or has a size other than the Drive listing records in
# pipeline/books_manifest_2026-09-11.tsv; if out/ocr has fewer than 30 finished books; if a
# model file is under 40 MB; if app.py lacks the local patch; if tessdata is missing.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UTRNET_DIR="${UTRNET_DIR:-$(dirname "$REPO_ROOT")/End-To-End-Urdu-OCR-WebApp}"
MANIFEST="$REPO_ROOT/pipeline/books_manifest_2026-09-11.tsv"
OUT_DIR="$HOME/Desktop"
CHECK=1
while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT_DIR="$2"; shift 2 ;;
    --no-check) CHECK=0; shift ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 64 ;;
  esac
done
ZIP="$OUT_DIR/shrines-ocr-bundle-$(date +%F).zip"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
ok()  { printf '  OK   %s\n' "$*"; }

# ── 1. Preconditions ─────────────────────────────────────────────────────────
echo "== Preconditions"
[ -f "$MANIFEST" ] || die "manifest missing: $MANIFEST"
# Every row with a saved_as path must exist at exactly the byte count Drive listed.
# (books_manifest.py --verify does the same with sha256; this is the cheap gate before zipping.)
WANTED=0; BAD=0
# awk, not `read`: a tab is whitespace to `read`, so the empty duplicate_of / note columns
# collapse and every later field shifts one column left (first run of this script, 13 Sep 2026:
# 45 "downloaded files", all with the sha256 where the path should be).
while IFS='|' read -r saved_as size_bytes; do
  WANTED=$((WANTED + 1))
  f="$REPO_ROOT/$saved_as"
  if [ ! -f "$f" ]; then echo "  MISSING  $saved_as" >&2; BAD=$((BAD + 1)); continue; fi
  actual=$(stat -f %z "$f" 2>/dev/null || stat -c %s "$f")
  if [ "$actual" != "$size_bytes" ]; then echo "  SIZE     $saved_as ($actual, Drive says $size_bytes)" >&2; BAD=$((BAD + 1)); fi
done < <(awk -F'\t' 'NR > 1 && $12 != "" { print $12 "|" $3 }' "$MANIFEST")
[ "$WANTED" -eq 42 ] || die "manifest lists $WANTED downloaded files, expected 42"
[ "$BAD" -eq 0 ] || die "$BAD of $WANTED intake files missing or wrong size — run: .venv/bin/python tools/books_manifest.py --verify"
ok "$WANTED intake files present at the sizes Drive recorded"

FINISHED=$(find "$REPO_ROOT/out/ocr" -mindepth 2 -maxdepth 2 -name '*_transcribed.txt' -path '*/p001-end_*' 2>/dev/null | wc -l | tr -d ' ')
[ "$FINISHED" -ge 30 ] || die "out/ocr holds $FINISHED finished transcriptions, expected 30 (July's batch)"
ok "$FINISHED finished transcriptions in out/ocr"

for f in best_norm_ED.pth yolov8m_UrduDoc.pt; do
  [ -f "$UTRNET_DIR/$f" ] || die "model file missing: $UTRNET_DIR/$f"
  sz=$(stat -f %z "$UTRNET_DIR/$f" 2>/dev/null || stat -c %s "$UTRNET_DIR/$f")
  [ "$sz" -ge 40000000 ] || die "$f is $sz bytes — under 40 MB, so it is an error page, not a model"
done
ok "both UTRNet model files present (>40 MB)"
grep -q text_recognizer_batch "$UTRNET_DIR/app.py" || die "$UTRNET_DIR/app.py lacks the local patch (text_recognizer_batch); see tools/utrnet/local-changes.patch"
ok "UTRNet app.py carries the local batch patch"
[ -f "$REPO_ROOT/tessdata/urd.traineddata" ] && [ -f "$REPO_ROOT/tessdata/fas.traineddata" ] || die "tessdata/urd + fas missing"
ok "tessdata urd + fas present"
command -v zip >/dev/null || die "zip not found"
command -v rsync >/dev/null || die "rsync not found"
mkdir -p "$OUT_DIR"
[ ! -e "$ZIP" ] || die "$ZIP already exists — move it or delete it first (this script never overwrites)"

# ── 2. Stage ─────────────────────────────────────────────────────────────────
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/ocr-bundle.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
echo "== Staging in $STAGE"
# Gitignored folders that have nothing to do with OCR and together weigh ~1 GB (measured
# 13 Sep 2026: media/ 312M, Awqaf/ 117M — a separate project, CLAUDE.md RULE 1 — archive/ 9M,
# chunks/ 18M, storybook-static/ 9M). The first run staged them all; the list below is the fix.
rsync -a --no-links \
  --exclude '/.git/' --exclude '/node_modules/' --exclude '/.venv/' --exclude '/dist/' \
  --exclude '/media-source/' --exclude '/media/' --exclude '/Awqaf/' --exclude '/archive/' \
  --exclude '/chunks/' --exclude '/books/*.pdf' \
  --exclude '/playwright-report/' --exclude '/test-results/' --exclude '/storybook-static/' \
  --exclude '/coverage/' --exclude '/.cache/' --exclude '/.lighthouseci/' \
  --exclude '.DS_Store' --exclude '__pycache__/' --exclude '*.pyc' \
  "$REPO_ROOT/" "$STAGE/Shrines Project/"
STAGED_MB=$(du -sm "$STAGE/Shrines Project" | cut -f1)
[ "$STAGED_MB" -lt 1700 ] || die "staged project folder is ${STAGED_MB} MB — expected ~1.5 GB (1.3 GB of books + the tree); a new large gitignored folder needs adding to the exclude list above"
rsync -a --no-links \
  --exclude '/.venv/' --exclude '/.venv-mac/' --exclude '__pycache__/' --exclude '*.pyc' \
  --exclude '/rafat_*/' --exclude '/ocr_test/' --exclude '.DS_Store' \
  "$UTRNET_DIR/" "$STAGE/End-To-End-Urdu-OCR-WebApp/"

COMMIT="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
N_PDF=$(find "$STAGE/Shrines Project/books" -name '*.pdf' | wc -l | tr -d ' ')
N_EPUB=$(find "$STAGE/Shrines Project/books" -name '*.epub' | wc -l | tr -d ' ')
cat > "$STAGE/START_HERE.txt" <<TXT
Shrines OCR bundle — built $(date '+%Y-%m-%d %H:%M') from commit $COMMIT
Contents: "Shrines Project/" (tools, docs, $N_PDF PDFs + $N_EPUB EPUB in books/incoming-2026-09-11*/, $FINISHED finished transcriptions in out/ocr/, tessdata/)
          "End-To-End-Urdu-OCR-WebApp/" (the UTRNet OCR server, model weights included, local patch applied)
Keep the two folders side by side: the setup script looks for the OCR server as a sibling of "Shrines Project".

1. Optional integrity check (about a minute):
     bash verify_bundle.sh
2. Install what the machine lacks (Python venvs, Poppler, Tesseract). Everything else is already here —
   the books are downloaded and verified, so the runbook's download step (§4) is DONE and is skipped:
     cd "Shrines Project"
     bash tools/setup_ocr_machine.sh --dry-run     # reports OK / MISSING, changes nothing
     bash tools/setup_ocr_machine.sh               # installs the missing pieces; re-run --dry-run until it says "All prerequisites present."
   Windows:  powershell -ExecutionPolicy Bypass -File tools\\setup_ocr_machine.ps1 -DryRun   (then without -DryRun)
3. Run:
     Terminal 1:  cd End-To-End-Urdu-OCR-WebApp && source .venv/bin/activate && python app.py
                  (wait for: Running on local URL: http://127.0.0.1:7860)
     Terminal 2:  cd "Shrines Project" && source .venv/bin/activate
                  bash tools/run_new_books_ocr.sh --max-pages 3      # smoke test, three pages per book
                  bash tools/run_new_books_ocr.sh                    # the whole batch; safe to interrupt and re-run
     Progress:    python tools/ocr_status.py    (writes out/ocr/STATUS.md)
4. Bring back "Shrines Project/out/ocr/" and pipeline/books_manifest_2026-09-11.tsv — docs/OCR_NEW_MACHINE_RUNBOOK.md §6.

Full procedure, timings and known gaps: Shrines Project/docs/OCR_NEW_MACHINE_RUNBOOK.md
TXT
cat > "$STAGE/verify_bundle.sh" <<'SH'
#!/usr/bin/env bash
# Checks every file in this bundle against BUNDLE_SHA256SUMS.txt. Exit 0 = intact.
cd "$(dirname "$0")"
if command -v sha256sum >/dev/null 2>&1; then sha256sum -c --quiet BUNDLE_SHA256SUMS.txt
else shasum -a 256 -c --quiet BUNDLE_SHA256SUMS.txt; fi
rc=$?
[ $rc -eq 0 ] && echo "bundle intact: $(wc -l < BUNDLE_SHA256SUMS.txt | tr -d ' ') files verified" || echo "BUNDLE DAMAGED — the files above differ from the list" >&2
exit $rc
SH
chmod +x "$STAGE/verify_bundle.sh"
(cd "$STAGE" && find . -type f ! -name BUNDLE_SHA256SUMS.txt ! -name verify_bundle.sh -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 > BUNDLE_SHA256SUMS.txt)
N_FILES=$(wc -l < "$STAGE/BUNDLE_SHA256SUMS.txt" | tr -d ' ')
echo "  staged $N_FILES files:"; du -sh "$STAGE"/* | sed 's/^/    /'

# ── 3. Zip ───────────────────────────────────────────────────────────────────
echo "== Zipping → $ZIP"
(cd "$STAGE" && zip -r -q -X "$ZIP" .)
ok "$(du -h "$ZIP" | cut -f1) written"

# ── 4. Self-check: unzip somewhere else and run the setup script's dry-run there ─
if [ "$CHECK" = 1 ]; then
  echo "== Self-check (unzip + setup --dry-run in a scratch folder)"
  T="$(mktemp -d "${TMPDIR:-/tmp}/ocr-bundle-check.XXXXXX")"
  unzip -q "$ZIP" -d "$T"
  (cd "$T" && bash verify_bundle.sh) || die "self-check: sha256 verification failed inside the zip"
  LOG="$T/setup-dry-run.log"
  bash "$T/Shrines Project/tools/setup_ocr_machine.sh" --dry-run > "$LOG" 2>&1 || true   # exit 2 is expected: no venvs on the far side
  for needle in "out/ocr/ present — $FINISHED finished" "$N_PDF new PDF" "OK       weights: best_norm_ED.pth" "OK       weights: yolov8m_UrduDoc.pt" "tessdata/urd + fas shipped" "OK       local patch"; do
    grep -qF -- "$needle" "$LOG" || { cat "$LOG" >&2; die "self-check: setup --dry-run did not report: $needle"; }
  done
  rm -rf "$T"
  ok "the unzipped copy verifies, and setup --dry-run sees the books, the transcriptions, the weights, the patch and tessdata"
fi

echo
echo "Bundle: $ZIP"
echo "Copy it to the other machine, unzip, open START_HERE.txt."
