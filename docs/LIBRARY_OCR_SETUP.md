# Library Workstation OCR Kit — Setup

This is the setup document for running the Urdu book OCR pipeline on a
**public/library workstation that resets between visits** — nothing installed
today survives until next time, so the whole stack gets rebuilt from zero on
every visit.

It is the companion to `shrines-ocr-library-kit.zip` (built from this repo by
`pipeline/build_library_ocr_kit.sh` — regenerate the zip any time the tools or
`out/ocr/` state changes; see that script for exactly what it copies). Extract
that zip on the library PC and follow this document top to bottom. It assumes:

- **Windows**, PowerShell, and that you have enough rights on this specific
  machine to run `winget install` (this has been confirmed to work there
  before — see `docs/BOOK_OCR_WORKFLOW.md`, which this condenses). If `winget`
  is blocked this visit, ask library staff; there's no fallback path written
  here for a fully locked-down machine.
- **Internet access**, to fetch the books from Google Drive and the OCR model
  from HuggingFace — both happen fresh every visit, since nothing persists.
- **You will copy results off the machine before you leave.** Nothing you
  produce here survives a reboot unless you carry it out yourself (USB, email,
  Drive — whatever got you the kit in the first place).

Everything below only does OCR — no translation, no writing back to the
Google Sheet, no API keys. Those are separate, optional workflows documented
in `docs/BOOK_OCR_WORKFLOW.md` if you want them later.

---

## 0. What's in the kit

```
shrines-ocr-library-kit/
├── SETUP.md                    ← this file
├── requirements.txt             Python deps for tools/
├── tools/                       the pipeline scripts (download, OCR, finalize, status)
├── books/
│   ├── links.txt                33 Google Drive links to the book PDFs
│   ├── manifest.json            record of what's already been downloaded/OCR'd
│   └── renames.json             Drive-id → human-readable title, for finalize_books.py
├── out/ocr/                     the 30 books already transcribed and finalized
├── data/glossary.csv            Sufi-term hints (only used if you also translate)
└── docs/
    ├── BOOK_OCR_WORKFLOW.md     full reference — every flag, translation, sheet write-back
    └── LOCAL_OCR_QUICKSTART.md  short-form quickstart
```

The book PDFs themselves are **not** in the kit (1.2 GB — that's what Step 3
downloads fresh). Neither is the OCR model's weights — Step 2 fetches those
fresh too. Both live only as links/instructions here, which is why the kit
itself is small enough to email.

`out/ocr/` **is** bundled, with the 30 books already finished. This matters:
the batch OCR script skips any book that already has a transcription in
`out/ocr/<book>/`, so re-downloading all 33 books and running the batch will
**not** re-OCR the 30 done ones — it'll only process whatever's new. You don't
need to figure out which books those are by hand; the tooling does it by
checking what's actually on disk.

---

## 1. Extract and open a PowerShell window

Extract the zip wherever you like on this machine — Desktop, a temp folder,
doesn't matter, since nothing persists anyway. Then:

```powershell
cd "C:\path\to\wherever\you\extracted\it\shrines-ocr-library-kit"
```

Everything below assumes you're in that folder.

---

## 2. Install prerequisites (every visit)

```powershell
winget install -e --id Python.Python.3.14
py install 3.10
winget install -e --id oschwartz10612.Poppler
winget install -e --id Git.Git
```

Close and reopen PowerShell so PATH updates take effect, then verify:

```powershell
py -3 --version         # expect 3.14.x
py -3.10 --version      # expect 3.10.x
pdftoppm -h              # expect usage text
git --version
```

If `pdftoppm` isn't found after reopening, pass its full path explicitly later
with `--pdftoppm "C:\path\to\poppler\Library\bin\pdftoppm.exe"`.

Install the project's Python packages:

```powershell
py -3 -m pip install -r requirements.txt
```

This installs `pillow`, `gdown`, `gradio_client` — everything the download and
OCR scripts need.

---

## 3. Set up the local OCR model (every visit)

The OCR model (UTRNet) is a separate app that isn't part of this kit — it's
cloned fresh and its weights downloaded fresh, every visit.

```powershell
cd ..
git clone https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git
cd End-To-End-Urdu-OCR-WebApp

py -3.10 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Pin the web stack — the app's code doesn't work with current Gradio:

```powershell
python -m pip install --force-reinstall `
  "gradio==4.16.0" `
  "gradio_client==0.8.1" `
  "huggingface_hub==0.20.3" `
  "fastapi==0.109.0" `
  "starlette==0.35.1" `
  "uvicorn==0.27.0.post1" `
  "jinja2==3.1.3"
```

Download the model weights (a few hundred MB total — how long this takes
depends on the library's connection):

```powershell
curl.exe -fL -o "1.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/1.jpg"
curl.exe -fL -o "2.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/2.jpg"
curl.exe -fL -o "3.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/3.jpg"
curl.exe -fL -o "best_norm_ED.pth" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/best_norm_ED.pth"
curl.exe -fL -o "yolov8m_UrduDoc.pt" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/yolov8m_UrduDoc.pt"
```

Start the server and **leave this PowerShell window open** for the rest of
the session:

```powershell
python app.py
```

Wait for `Running on local URL: http://127.0.0.1:7860`. Everything else below
happens in a **second** PowerShell window.

Optional GPU check (this machine most likely has no NVIDIA GPU, in which case
this prints `False` and OCR just runs on CPU — slower, not broken):

```powershell
python -c "import torch; print(torch.cuda.is_available())"
```

---

## 4. Download the books

Second PowerShell window:

```powershell
cd "C:\path\to\wherever\you\extracted\it\shrines-ocr-library-kit"
```

Probe access first — downloads nothing, just reports whether each of the 33
linked files is reachable:

```powershell
py -3 tools\download_books.py --check
```

If any show `PRIVATE`, they aren't shared as "anyone with the link" — that
needs fixing in Drive before they can be fetched anonymously. Everything else
proceeds regardless.

Then download for real:

```powershell
py -3 tools\download_books.py
```

This re-fetches all 33 books into `books\` (~1.2 GB — the bundled
`manifest.json`/`links.txt` don't skip the download, since the actual PDF
files aren't on this machine; they *do* keep the numbering and filenames
consistent with the bundled `out\ocr\` state, which is what lets the next
step correctly identify what's already been transcribed).

---

## 5. Run OCR

Make sure the UTRNet window from Step 3 is still running.

```powershell
py -3 tools\ocr_all_books.py --workers 2 --dpi 300
```

Start with `--workers 2` on an unfamiliar machine; raise to `--workers 4` if
it's handling that fine (more than 4 gains nothing — every worker queues
against the same single model server). Keep `--dpi 300` — that's what the rest
of the corpus was OCR'd at, and it needs to stay consistent.

This step **skips the 30 books already in `out\ocr\`** and only processes
whatever's new. Watch progress in a third window:

```powershell
py -3 tools\ocr_status.py
```

Or read `out\ocr\STATUS.md` directly, which is rewritten as it goes.

---

## 6. Finalize

```powershell
py -3 tools\finalize_books.py
```

Runs the automated quality gate (enough text per page, script matches the
book's language, empty-page rate) and copies anything that passes into
`out\ocr\Final\` under its human-readable title. Anything held back prints a
reason — that needs a manual look, not a re-run.

---

## 7. Take the results with you

Before you leave, copy the **entire `out\` folder** back to your USB (or
email/upload it — it should be small, tens of MB, not gigabytes) — this
machine will not remember any of this once you log off.

```powershell
# from inside the kit folder
Compress-Archive -Path out -DestinationPath ocr-results-$(Get-Date -Format yyyyMMdd).zip
```

Back on the main machine, merge that `out\ocr\` into the repo's own `out/ocr/`
(it's gitignored there too — this is expected, `out/` is regenerable local
state, not something that gets committed). Also bring back the updated
`books\manifest.json` and `books\renames.json` if `download_books.py` recorded
anything new, so the next kit build starts from a caught-up state.

You do **not** need to bring the downloaded book PDFs back — they're
re-downloadable from `links.txt` any time, and carrying 1.2 GB back defeats
the point of not shipping them in the kit.

---

## 8. Shut down

```powershell
# stop the OCR batch, if still running
Ctrl+C

# stop the UTRNet server, in its window
Ctrl+C
```

---

## Condensed — the whole thing once you know the drill

```powershell
# ---- window 1: model server, leave running ----
cd ..\End-To-End-Urdu-OCR-WebApp
.\.venv\Scripts\Activate.ps1
python app.py

# ---- window 2: the pipeline ----
cd shrines-ocr-library-kit
py -3 tools\download_books.py
py -3 tools\ocr_all_books.py --workers 2 --dpi 300
py -3 tools\finalize_books.py

# ---- window 3: progress ----
py -3 tools\ocr_status.py
```

---

## Troubleshooting

**`pdftoppm: command not found`** — reopen PowerShell after installing
Poppler, or pass `--pdftoppm "C:\path\to\poppler\Library\bin\pdftoppm.exe"`.

**`ModuleNotFoundError: gradio_client`** — `py -3 -m pip install -r requirements.txt`.

**UTRNet: `ImportError: cannot import name 'HfFolder' from 'huggingface_hub'`**
```powershell
cd ..\End-To-End-Urdu-OCR-WebApp
.\.venv\Scripts\Activate.ps1
python -m pip install --force-reinstall "huggingface_hub==0.20.3"
python app.py
```

**UTRNet: `TypeError: unhashable type: 'dict'` / "shareable link must be created"**
— the pinned Gradio stack drifted; redo the `--force-reinstall` block in
Step 3, then `python -m pip check` before restarting.

**Download fails with a permission error** — the file on Drive isn't shared
"anyone with the link." Either fix sharing, or export a Netscape
`cookies.txt` from a logged-in browser session and run
`py -3 tools\download_books.py --cookies "C:\path\to\cookies.txt"` once.

**OCR output is empty or Latin gibberish for a book** — it has a broken
embedded text layer that got extracted instead of OCR'd. Force real OCR:
```powershell
py -3 tools\ocr_all_books.py --force-ocr --force --limit 1
```

**Everything is slow** — drop to `--workers 1`. A public library terminal is
probably CPU-only; that's expected, just slower than the model server queue.

For anything not covered here — translation, writing back to the Google
Sheet, per-flag detail — see the bundled `docs/BOOK_OCR_WORKFLOW.md`.
