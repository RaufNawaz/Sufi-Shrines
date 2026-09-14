#!/usr/bin/env bash
# tools/setup_ocr_machine.sh — make a freshly copied project folder able to run the
# book OCR batch. macOS (Homebrew) and Debian/Ubuntu (apt). Idempotent: re-run it
# as often as you like; every step checks before it acts.
#
#   bash tools/setup_ocr_machine.sh --dry-run     # check prerequisites, change nothing
#   bash tools/setup_ocr_machine.sh               # install + set up everything
#   bash tools/setup_ocr_machine.sh --skip-utrnet # only the project side (use the HF Space)
#
# What it sets up, in order:
#   1. system tools: git, curl, poppler (pdftoppm/pdftotext), tesseract + urd/fas/eng data
#   2. the project's Python venv (.venv) with requirements.txt
#   3. the UTRNet OCR server (github.com/abdur75648/End-To-End-Urdu-OCR-WebApp) as a
#      SIBLING folder of the project, on Python 3.10, with the pinned web stack
#      (tools/utrnet-pins.txt) and its model weights from the HuggingFace Space
#   4. prints the exact commands to run the batch
#
# It never touches books/ or out/ — those come across in the folder copy
# (docs/OCR_NEW_MACHINE_RUNBOOK.md, step 1).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UTRNET_DIR="${UTRNET_DIR:-$(dirname "$REPO_ROOT")/End-To-End-Urdu-OCR-WebApp}"
UTRNET_REPO="https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git"
UTRNET_HF="https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main"
UTRNET_PY_VERSION="3.10"
INCOMING="books/incoming-2026-09-11"
INCOMING_EN="books/incoming-2026-09-11-english"

DRY_RUN=0
SKIP_UTRNET=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-utrnet) SKIP_UTRNET=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 64 ;;
  esac
done

MISSING=0
ok()   { printf '  OK       %s\n' "$*"; }
miss() { printf '  MISSING  %s\n' "$*"; MISSING=$((MISSING + 1)); }
warn() { printf '  WARN     %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY_RUN" = 1 ]; then printf '  (dry-run) would run: %s\n' "$*"; else "$@"; fi; }

# ── 0. Where are we, and did the gitignored folders come across? ─────────────
echo "== Project folder"
[ -f "$REPO_ROOT/tools/ocr_all_books.py" ] || die "not the Shrines Project folder: $REPO_ROOT"
ok "$REPO_ROOT"
if [ -d "$REPO_ROOT/out/ocr" ]; then
  done_count=$(find "$REPO_ROOT/out/ocr" -maxdepth 1 -mindepth 1 -type d ! -name logs ! -name Final | wc -l | tr -d ' ')
  ok "out/ocr/ present — $done_count finished book folder(s) will be skipped by the batch"
else
  warn "out/ocr/ is missing. It is gitignored, so a git clone does not bring it: copy the WHOLE folder, or every finished book is redone."
fi
NEW_PDFS=0
if [ -d "$REPO_ROOT/$INCOMING" ] || [ -d "$REPO_ROOT/$INCOMING_EN" ]; then
  NEW_PDFS=$(find "$REPO_ROOT/$INCOMING" "$REPO_ROOT/$INCOMING_EN" -maxdepth 1 -name '*.pdf' 2>/dev/null | wc -l | tr -d ' ')
  ok "$NEW_PDFS new PDF(s) waiting in $INCOMING{,-english}"
  if [ -f "$REPO_ROOT/$INCOMING/manifest.json" ]; then
    ok "download manifest present — the books came across with the folder; runbook step 4 (download) is done"
  fi
else
  warn "$INCOMING/ not present yet — download step still to do (runbook step 4)"
fi

# ── 1. Package manager + system tools ────────────────────────────────────────
echo "== System tools"
OS="$(uname -s)"
PKG=""
case "$OS" in
  Darwin) command -v brew >/dev/null 2>&1 && PKG=brew || miss "Homebrew (install from https://brew.sh, then re-run)" ;;
  Linux)  command -v apt-get >/dev/null 2>&1 && PKG=apt || miss "apt-get (only Debian/Ubuntu are scripted here)" ;;
  *) die "unsupported OS: $OS — on Windows run tools/setup_ocr_machine.ps1" ;;
esac

install_pkg() {  # install_pkg <brew name> <apt name>
  case "$PKG" in
    brew) run brew install "$1" ;;
    apt)  run sudo apt-get install -y "$2" ;;
    *) return 1 ;;
  esac
}

need_bin() {  # need_bin <binary> <brew pkg> <apt pkg>
  if command -v "$1" >/dev/null 2>&1; then ok "$1 ($(command -v "$1"))"; else
    miss "$1"; [ "$DRY_RUN" = 1 ] || install_pkg "$2" "$3"
  fi
}

[ "$PKG" = apt ] && [ "$DRY_RUN" = 0 ] && run sudo apt-get update -y
need_bin git git git
need_bin curl curl curl
need_bin pdftoppm poppler poppler-utils
need_bin pdftotext poppler poppler-utils
need_bin tesseract tesseract tesseract-ocr
if [ -f "$REPO_ROOT/tessdata/urd.traineddata" ] && [ -f "$REPO_ROOT/tessdata/fas.traineddata" ]; then
  ok "tessdata/urd + fas shipped with the project (ocr_all_books.py passes --tessdata-dir automatically)"
else
  warn "tessdata/ (urd, fas) missing from the project copy — Tesseract fallback would need: brew install tesseract-lang / apt install tesseract-ocr-urd tesseract-ocr-fas"
fi
if command -v tesseract >/dev/null 2>&1 && ! tesseract --list-langs 2>/dev/null | grep -qx eng; then
  warn "tesseract has no 'eng' data — the English scans need it: brew install tesseract-lang / apt install tesseract-ocr-eng"
fi

# ── 2. Project Python + venv ─────────────────────────────────────────────────
echo "== Project Python"
PROJECT_PY=""
for candidate in python3.14 python3.13 python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then PROJECT_PY="$candidate"; break; fi
  fi
done
if [ -n "$PROJECT_PY" ]; then ok "$PROJECT_PY ($("$PROJECT_PY" --version 2>&1))"; else
  miss "python >= 3.10 for tools/"; [ "$DRY_RUN" = 1 ] || { install_pkg python@3.12 python3.12-venv; PROJECT_PY=python3.12; }
fi
VENV="$REPO_ROOT/.venv"
if [ -x "$VENV/bin/python" ]; then ok ".venv exists"; else
  miss ".venv (project virtualenv)"
  [ "$DRY_RUN" = 1 ] || run "$PROJECT_PY" -m venv "$VENV"
fi
if [ "$DRY_RUN" = 0 ]; then
  "$VENV/bin/python" -m pip install --quiet --upgrade pip
  "$VENV/bin/python" -m pip install --quiet -r "$REPO_ROOT/requirements.txt"
  ok "requirements.txt installed into .venv (pillow, gdown, gradio_client, openpyxl)"
elif [ -x "$VENV/bin/python" ] && "$VENV/bin/python" -c 'import gdown, gradio_client, PIL' 2>/dev/null; then
  ok ".venv has gdown, gradio_client, pillow"
else
  miss ".venv packages from requirements.txt"
fi

# ── 3. UTRNet OCR server (sibling folder) ────────────────────────────────────
if [ "$SKIP_UTRNET" = 1 ]; then
  echo "== UTRNet: skipped (--skip-utrnet). The batch will need --utrnet-url abdur75648/UrduOCR-UTRNet (public HF Space, slow, shared)."
else
  echo "== UTRNet OCR server → $UTRNET_DIR"
  UTRNET_PY=""
  if command -v "python$UTRNET_PY_VERSION" >/dev/null 2>&1; then UTRNET_PY="python$UTRNET_PY_VERSION"; fi
  if [ -n "$UTRNET_PY" ]; then ok "$UTRNET_PY ($("$UTRNET_PY" --version 2>&1)) — the app's torch/gradio pins need exactly 3.10"; else
    miss "python$UTRNET_PY_VERSION (the UTRNet app is pinned to it)"
    [ "$DRY_RUN" = 1 ] || { install_pkg "python@$UTRNET_PY_VERSION" "python$UTRNET_PY_VERSION python$UTRNET_PY_VERSION-venv"; UTRNET_PY="python$UTRNET_PY_VERSION"; }
  fi
  if [ -d "$UTRNET_DIR/.git" ]; then ok "repo cloned"; else
    miss "repo clone"; [ "$DRY_RUN" = 1 ] || run git clone "$UTRNET_REPO" "$UTRNET_DIR"
  fi
  # The batch talks to a PATCHED app: /predict returns the joined text only (upstream returns
  # an image and the text), recognition is batched, and torch.load is told the 2024 checkpoint
  # is trusted. A fresh clone has none of that, and the Air's working copy was the only place
  # the changes lived until 13 September 2026. tools/utrnet/local-changes.patch is that diff
  # (app.py, read.py, and a pinned requirements.txt) — it must land BEFORE pip reads
  # requirements.txt below. A folder copied from the Air, or unzipped from the bundle, is
  # already patched and reads OK here.
  if grep -q text_recognizer_batch "$UTRNET_DIR/app.py" 2>/dev/null; then ok "local patch applied (app.py has text_recognizer_batch)"; else
    miss "local patch — tools/utrnet/local-changes.patch on app.py, read.py, requirements.txt"
    if [ "$DRY_RUN" = 0 ] && [ -d "$UTRNET_DIR/.git" ]; then
      run git -C "$UTRNET_DIR" apply "$REPO_ROOT/tools/utrnet/local-changes.patch"
      run cp "$REPO_ROOT/tools/utrnet/batch_ocr.py" "$REPO_ROOT/tools/utrnet/README_MAC.md" "$UTRNET_DIR/"
      grep -q text_recognizer_batch "$UTRNET_DIR/app.py" || die "the patch did not apply — upstream has moved; apply tools/utrnet/local-changes.patch by hand"
    fi
  fi
  if [ -x "$UTRNET_DIR/.venv/bin/python" ]; then ok "UTRNet .venv exists"; else
    miss "UTRNet .venv"
    if [ "$DRY_RUN" = 0 ]; then
      [ -n "$UTRNET_PY" ] || die "python$UTRNET_PY_VERSION still not found after install — add it to PATH and re-run"
      run "$UTRNET_PY" -m venv "$UTRNET_DIR/.venv"
    fi
  fi
  if [ "$DRY_RUN" = 0 ]; then
    UPY="$UTRNET_DIR/.venv/bin/python"
    "$UPY" -m pip install --quiet --upgrade pip
    "$UPY" -m pip install --quiet -r "$UTRNET_DIR/requirements.txt"
    # The app does not run on current Gradio; force the stack it was tested with.
    "$UPY" -m pip install --quiet --force-reinstall -r "$REPO_ROOT/tools/utrnet-pins.txt"
    ok "UTRNet requirements + pinned web stack installed"
    if [ "$OS" = Darwin ]; then
      "$UPY" -c 'import torch; print("  torch", torch.__version__, "MPS (Apple GPU):", torch.backends.mps.is_available())' || warn "torch import failed inside the UTRNet venv"
    else
      "$UPY" -c 'import torch; print("  torch", torch.__version__, "CUDA:", torch.cuda.is_available())' || warn "torch import failed inside the UTRNet venv"
      warn "on an NVIDIA machine, if CUDA prints False: install the CUDA wheel per https://pytorch.org/get-started/locally/ inside $UTRNET_DIR/.venv"
    fi
  fi
  # Weights. The upstream download_files.sh fetches the same five files; either path is fine.
  for f in best_norm_ED.pth yolov8m_UrduDoc.pt 1.jpg 2.jpg 3.jpg; do
    target="$UTRNET_DIR/$f"
    minsize=1000; case "$f" in *.pth|*.pt) minsize=40000000 ;; esac
    if [ -f "$target" ] && [ "$(wc -c < "$target" | tr -d ' ')" -ge "$minsize" ]; then ok "weights: $f"; else
      miss "weights: $f"
      [ "$DRY_RUN" = 1 ] || run curl -fL --retry 3 -o "$target" "$UTRNET_HF/$f"
    fi
  done
  if [ "$DRY_RUN" = 0 ]; then
    for f in best_norm_ED.pth yolov8m_UrduDoc.pt; do
      [ "$(wc -c < "$UTRNET_DIR/$f" | tr -d ' ')" -ge 40000000 ] || die "$f downloaded but is under 40 MB — HuggingFace returned an error page; delete it and re-run"
    done
  fi
fi

# ── 4. Verdict + the commands to run ─────────────────────────────────────────
echo
if [ "$MISSING" -gt 0 ]; then
  if [ "$DRY_RUN" = 1 ]; then
    echo "$MISSING prerequisite(s) missing. Run without --dry-run to install them."
    exit 2
  fi
  echo "$MISSING item(s) were missing and have been installed where possible. Re-run with --dry-run to confirm everything reads OK."
else
  echo "All prerequisites present."
fi
if [ -f "$REPO_ROOT/$INCOMING/manifest.json" ] && [ "$NEW_PDFS" -gt 0 ]; then
  DOWNLOAD_STEP="  # the books are already here ($NEW_PDFS PDFs; downloaded and verified 12 Sep 2026) — download, sort and verify are done, go straight to the OCR"
else
  DOWNLOAD_STEP="  python tools/download_books.py --links pipeline/books_links_2026-09-11.txt --out $INCOMING --cookies ~/Downloads/cookies.txt
  python tools/books_manifest.py --sort-downloaded      # English PDFs → $INCOMING_EN
  python tools/books_manifest.py --verify               # sizes + sha256 into the manifest TSV"
fi
cat <<CMDS

── Run the batch ────────────────────────────────────────────────────────────────
Terminal 1 — the OCR model server (leave it running):
  cd "$UTRNET_DIR" && source .venv/bin/activate && python app.py
  # wait for:  Running on local URL: http://127.0.0.1:7860

Terminal 2 — the books:
  cd "$REPO_ROOT" && source .venv/bin/activate
$DOWNLOAD_STEP
  bash tools/run_new_books_ocr.sh --max-pages 3          # smoke test: three pages of every book
  bash tools/run_new_books_ocr.sh                        # UTRNet on the Urdu/Persian scans, text-layer/Tesseract on the English, EPUB extraction

Progress:  python tools/ocr_status.py   (writes out/ocr/STATUS.md)
Details:   docs/OCR_NEW_MACHINE_RUNBOOK.md
CMDS
