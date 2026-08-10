# New-Laptop Walkthrough — Move, OCR, Translate, Photos

Complete step-by-step for moving the Shrines Project from the MacBook Air to the
**M1 Pro 16"**, finishing the outstanding OCR work, and fetching the field-survey
photos. Every command is here in the order you run it.

Written 2026-08-09. Companion references: `BOOK_OCR_WORKFLOW_MAC.md` (every flag
explained) and `LOCAL_OCR_QUICKSTART_MAC.md` (short form).

---

## Where things stand right now

Worth knowing before you start, because it determines how much work this actually is:

| Thing | State |
| --- | --- |
| Books in `books/` | 30 PDFs downloaded |
| OCR | **All 30 finalized** (`out/ocr/Final/finalized.json` = 30/30 `finalized`) |
| Books added 2026-08-09 | 2 — *Haqeeqat ul Fuqara*, *Tarikh-e-Lahore (1884)* — links recorded, **not yet downloaded** |
| Dataset | `shrines_updated_2026-08-09.tsv`, 168 rows, verified |
| Field-survey photos | 48 images across 5 slugs — **manifest written, none on disk** |
| Project folder size | 2.2 GB |

**So the OCR job is two books, not thirty.** The Air's thermal throttling made the
original batch slow, not inaccurate — there is no reason to redo finished work.

Total hands-on time: roughly 30 minutes of typing, plus unattended download and
OCR time.

---

# PART 1 — On the MacBook Air, before you move anything

## Step 1.1 — Commit the untracked working files

Several files exist only on this laptop and are not yet in git. Get them into the
repo so they are recoverable.

```bash
cd ~/Harvard/"Shrines Project"

git status --short
```

You should see `tools/fetch_shrine_photos.py`, `tools/swap_photo_urls.py`,
`data/new-photos-manifest.json`, and the two `.tsv` files as untracked (`??`).

```bash
git add tools/fetch_shrine_photos.py tools/swap_photo_urls.py \
        data/new-photos-manifest.json \
        shrines_updated.tsv shrines_updated_2026-08-09.tsv \
        docs/NEW_LAPTOP_OCR_RUNBOOK.md

git commit -m "Add photo fetch/swap tooling, photo manifest, 2026-08-09 dataset, and migration runbook"
git push
```

Do **not** `git add` anything under `books/` or `out/` — they are gitignored
deliberately (1.2 GB of PDFs).

## Step 1.2 — Clear out build junk

```bash
cd ~/Harvard/"Shrines Project"
rm -f vite.config.ts.timestamp-*.mjs
rm -rf dist
```

## Step 1.3 — Set aside the UTRNet model weights

The OCR model lives in a **separate folder outside the project** —
`~/Harvard/End-To-End-Urdu-OCR-WebApp` — so copying "Shrines Project" will not
bring it. Its virtualenv can't survive a copy (absolute paths, Python 3.10), but
the model weights are just files and are the slow part of that setup.

```bash
mkdir -p ~/Desktop/utrnet-weights
cp ~/Harvard/End-To-End-Urdu-OCR-WebApp/best_norm_ED.pth \
   ~/Harvard/End-To-End-Urdu-OCR-WebApp/yolov8m_UrduDoc.pt \
   ~/Desktop/utrnet-weights/

ls -lh ~/Desktop/utrnet-weights/
```

## Step 1.4 — Copy the project folder

Plug in the external drive (or mount the M1 Pro over your network / use a USB
stick). Then:

```bash
rsync -avh --progress \
  --exclude 'node_modules/' \
  --exclude '.venv/' \
  --exclude 'dist/' \
  --exclude '.DS_Store' \
  --exclude 'vite.config.ts.timestamp-*' \
  ~/Harvard/"Shrines Project"/ \
  /Volumes/<DESTINATION>/"Shrines Project"/
```

Replace `<DESTINATION>` with your actual volume name (`ls /Volumes` to check).
**The trailing slashes matter** — they mean "copy the contents of this folder into
that folder" rather than nesting it.

Also copy the weights folder:

```bash
rsync -avh --progress ~/Desktop/utrnet-weights/ /Volumes/<DESTINATION>/utrnet-weights/
```

### Why those exclusions

| Excluded | Size | Reason |
| --- | --- | --- |
| `node_modules/` | 499 MB | ~100k tiny files — slowest possible thing to copy. `npm ci` rebuilds it in two minutes. |
| `.venv/` | 56 MB | Already broken. `pyvenv.cfg` points at `/Users/rauf/Desktop/Harvard/Shrines Project/.venv` (the folder has since moved) and it's Python 3.12 while the tooling uses 3.14. |
| `dist/` | — | Build output. `npm run build` regenerates it. |

What you **are** copying, and want to: `books/` (1.2 GB, the corpus), `out/`
(36 MB, all 30 finished transcriptions), `chunks/` and `summaries/`, `.git/`
(298 MB, your history and the `origin` remote), and every untracked working file.

> **Check iCloud before you bother.** This folder lives under
> `~/Desktop/Desktop - rauf's MacBook Air/`, which is the iCloud Desktop &
> Documents sync location. If that sync is on and the M1 Pro uses the same Apple
> ID, some of this may replicate on its own. I'd still do the direct copy —
> 2.2 GB with `node_modules` inside is the exact workload iCloud handles worst —
> but check first in case the folder is already waiting for you.

## Step 1.5 — Optional: do the photos now

The photo fetch has nothing to do with OCR and needs no setup beyond `gdown`. If
you want it done before you switch machines, jump to **Part 6** and run it here.
Otherwise carry on.

---

# PART 2 — On the M1 Pro: install prerequisites

## Step 2.1 — Homebrew

If you don't have it, install from <https://brew.sh>, then:

```bash
brew --version
```

## Step 2.2 — Everything else

```bash
brew install git python@3.14 python@3.10 poppler node
brew install --cask docker
```

| Package | What it's for |
| --- | --- |
| `python@3.14` | The project tooling in `tools/` |
| `python@3.10` | The UTRNet web app only — its pinned Gradio stack will not install on 3.14 |
| `poppler` | `pdftoppm` / `pdftotext`, used to render PDF pages |
| `node` | Site build (`.nvmrc` pins Node 20 — use `nvm` if you prefer) |
| Docker Desktop | Only needed if you want LibreTranslate translation drafts |

## Step 2.3 — Verify

```bash
python3.14 --version      # expect 3.14.x
python3.10 --version      # expect 3.10.x
pdftoppm -h               # expect usage text
git --version
node --version
```

If `pdftoppm` is not found: `brew link poppler`, then open a new terminal tab. If
it still isn't found, you can pass the full path to any OCR command with
`--pdftoppm "$(brew --prefix poppler)/bin/pdftoppm"`.

If you'll use Docker, open Docker Desktop from Applications once and wait until it
says it's running.

---

# PART 3 — Put the project in place

## Step 3.1 — Copy from the drive

```bash
mkdir -p ~/Harvard
rsync -avh --progress /Volumes/<DESTINATION>/"Shrines Project"/ ~/Harvard/"Shrines Project"/
rsync -avh --progress /Volumes/<DESTINATION>/utrnet-weights/ ~/Desktop/utrnet-weights/
```

## Step 3.2 — Clean up anything stale that came across

```bash
cd ~/Harvard/"Shrines Project"
rm -rf .venv node_modules dist
```

## Step 3.3 — Confirm the copy is intact

```bash
cd ~/Harvard/"Shrines Project"

git status                        # repo should be recognised, remote intact
git log --oneline -3

ls books/*.pdf | wc -l            # expect 30
du -sh books out                  # expect ~1.2G and ~36M
python3 -c "import json; d=json.load(open('out/ocr/Final/finalized.json')); print(len(d),'books finalized')"
```

That last line should print `30 books finalized`. If it does, all the previous OCR
work made it across and you never have to touch those books again.

---

# PART 4 — Python and Node dependencies

## Step 4.1 — Project tooling

```bash
cd ~/Harvard/"Shrines Project"
python3.14 -m pip install -r requirements.txt
```

Installs `pillow`, `gdown`, `gradio_client`, `openpyxl` — enough for book
downloads, OCR, and the photo fetch.

## Step 4.2 — Node (only if you'll rebuild the site)

```bash
npm ci
```

## Step 4.3 — Verify

```bash
python3.14 -c "import gradio_client, gdown, PIL, openpyxl; print('python deps ok')"
```

---

# PART 5 — Set up the UTRNet OCR model

This is the one piece that isn't in the project folder. Once running, it serves a
local endpoint at `http://127.0.0.1:7860` that the OCR scripts post page images to.

## Step 5.1 — Clone the app

```bash
cd ~/Harvard
git clone https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
```

## Step 5.2 — Build its virtualenv on Python 3.10

```bash
python3.10 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Step 5.3 — Pin the web stack

The app's code is incompatible with current Gradio. This is not optional.

```bash
python -m pip install --force-reinstall \
  "gradio==4.16.0" \
  "gradio_client==0.8.1" \
  "huggingface_hub==0.20.3" \
  "fastapi==0.109.0" \
  "starlette==0.35.1" \
  "uvicorn==0.27.0.post1" \
  "jinja2==3.1.3"

python -m pip check
```

## Step 5.4 — Put the model weights in place

Using the files you carried over in Step 1.3:

```bash
cp ~/Desktop/utrnet-weights/best_norm_ED.pth ~/Harvard/End-To-End-Urdu-OCR-WebApp/
cp ~/Desktop/utrnet-weights/yolov8m_UrduDoc.pt ~/Harvard/End-To-End-Urdu-OCR-WebApp/
```

If you didn't carry them, download instead:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
bash download_files.sh
```

Or, if that script is missing:

```bash
curl -fL -o "1.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/1.jpg"
curl -fL -o "2.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/2.jpg"
curl -fL -o "3.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/3.jpg"
curl -fL -o "best_norm_ED.pth" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/best_norm_ED.pth"
curl -fL -o "yolov8m_UrduDoc.pt" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/yolov8m_UrduDoc.pt"
```

Confirm:

```bash
ls -lh best_norm_ED.pth yolov8m_UrduDoc.pt
```

## Step 5.5 — Confirm Metal acceleration

Apple Silicon uses MPS, not CUDA. This should print `True`:

```bash
python -c "import torch; print(torch.backends.mps.is_available())"
```

If it prints `False`, OCR falls back to CPU — it will still work, just slower.

## Step 5.6 — Start the server

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate
python app.py
```

**Leave this terminal tab running.** You should see `Running on local URL:
http://127.0.0.1:7860`. Everything from here on happens in a second tab.

---

# PART 6 — The photos (48 images, 5 shrines)

Independent of OCR — you can do this at any point, on either laptop.

`data/new-photos-manifest.json` maps five slugs to 48 Drive photo IDs. None are on
disk yet, so the TSV still points at Drive URLs, which hotlink badly and get
throttled.

| Slug | Photos |
| --- | --- |
| `shah-gohar-peer` | 9 |
| `mian-qurban-ali-shah` | 10 |
| `shah-abul-muali-qadri` | 9 |
| `malik-ayaz` | 10 |
| `mauj-darya-bukhari` | 10 |

## Step 6.1 — Fetch

```bash
cd ~/Harvard/"Shrines Project"
python3.14 tools/fetch_shrine_photos.py
```

Files land at `public/photos/<slug>/<slug>-NN.jpg`. The script is idempotent —
re-runs skip anything already downloaded.

One slug at a time, if you prefer:

```bash
python3.14 tools/fetch_shrine_photos.py malik-ayaz
```

## Step 6.2 — Handle failures

Any download that fails prints the Drive URL and the exact target path. That means
the file isn't shared as "anyone with the link". Either fix sharing in Drive and
re-run, or open the URL, save the file to the printed path by hand, and re-run —
existing files are skipped.

## Step 6.3 — Verify

```bash
find public/photos -name '*.jpg' | wc -l      # expect 48
ls public/photos/
```

## Step 6.4 — Rewrite the TSV to canonical URLs

```bash
python3.14 tools/swap_photo_urls.py shrines_updated_2026-08-09.tsv --dry-run
python3.14 tools/swap_photo_urls.py shrines_updated_2026-08-09.tsv
```

The dry run tells you how many links it would swap and how many images aren't on
disk yet. It only rewrites a cell when the image actually exists locally, so a
partial fetch is safe — run it again after filling gaps.

---

# PART 7 — Download the two new books

`books/links.txt` came across with the copy and already lists both books added on
2026-08-09. The downloader skips anything already present.

## Step 7.1 — Probe access first

```bash
cd ~/Harvard/"Shrines Project"
python3.14 tools/download_books.py --check
```

Downloads nothing; just reports whether each link is reachable.

## Step 7.2 — Download

```bash
python3.14 tools/download_books.py
```

## Step 7.3 — Verify

```bash
ls books/*.pdf | wc -l                  # expect 32
ls books/ | grep -iE "haqeeqat|tarikh"  # note the assigned filenames
```

`download_books.py` assigns numbered filenames, so check what it actually chose —
you'll need the exact name in Part 8.

> **If a download fails with a permission error**, the file isn't shared publicly.
> Export a Netscape `cookies.txt` from a logged-in browser session and run
> `python3.14 tools/download_books.py --cookies ~/Downloads/cookies.txt` once —
> gdown caches it afterwards.

---

# PART 8 — OCR the two new books

Make sure UTRNet is running (Part 5, Step 5.6) in another tab.

## Step 8.1 — Smoke test on one already-finished book

Before touching the new books, confirm the pipeline works end to end:

```bash
cd ~/Harvard/"Shrines Project"
python3.14 tools/process_books.py \
  --test-pdf "./books/22_Kashf-ul-Mahjoob.pdf" \
  --first-page 1 --max-pages 2 \
  --utrnet-url "http://127.0.0.1:7860" \
  --dpi 300
```

Check the output contains Urdu text:

```bash
ls -t out/ocr/22_Kashf-ul-Mahjoob/ | head -3
```

If you get an empty file or Latin gibberish, stop and fix that before continuing —
see Appendix B.

## Step 8.2 — Run the batch

The batch runner automatically skips every book that already has a transcription,
so this processes only the two new ones:

```bash
python3.14 tools/ocr_all_books.py --workers 4 --dpi 300
```

- `--workers 4` is the practical ceiling. All workers queue against one UTRNet
  server, so more just renders pages faster than the model consumes them. The
  efficiency cores handle `pdftoppm` while the GPU stays busy. Drop to 3 if the
  fans get loud.
- `--dpi 300` is the default and what the existing corpus used — keep it
  consistent.
- Whole books by default (`--max-pages 0`).
- Output: `out/ocr/<book>/p001-end_<timestamp>_transcribed.txt`
- Logs: `out/ocr/logs/<book>.log`

## Step 8.3 — Watch progress

Third terminal tab:

```bash
cd ~/Harvard/"Shrines Project"
while true; do python3.14 tools/ocr_status.py; sleep 30; done
```

Then read `out/ocr/STATUS.md` — it's rewritten atomically, so it's always
complete when you open it. `Ctrl+C` to stop watching.

## Step 8.4 — Finalize

Runs the automated quality gate: enough text per page, script matches the book's
language, empty-page rate acceptable. Passing books get copied to `out/ocr/Final/`
under their original upload titles.

```bash
python3.14 tools/finalize_books.py
```

Expect the count to go from 30 to 32. Anything reported as **HELD** failed a check
and needs a manual look before you use it.

## Step 8.5 — Optional post-correction

Rule-based cleanup (NFC normalisation, stray tatweel removal, whitespace and Urdu
punctuation spacing) plus per-paragraph confidence scoring:

```bash
python3.14 tools/ocr_postcorrect.py
```

Writes `out/ocr_corrected/<book>/` — a corrected draft, a provenance JSON with
confidence scores and flags, and a diff against the raw OCR. Everything is tagged
`reviewed=false`. Per `CLAUDE.md`, unreviewed OCR is a draft, never a citable
source.

---

# PART 9 — Translation drafts

Two engines — pick one.

## Option A — NLLB-200, fully local, no Docker

```bash
cd ~/Harvard/"Shrines Project"
python3.14 -m pip install -r requirements-translate.txt
python3.14 tools/translate.py --engine nllb --dry-run
python3.14 tools/translate.py --engine nllb
```

Downloads ~1.2 GB of model on first use. Runs offline afterwards.

## Option B — LibreTranslate in Docker

```bash
docker run -d --name libretranslate -p 127.0.0.1:5000:5000 \
  -e LT_LOAD_ONLY=en,ur libretranslate/libretranslate

docker logs -f libretranslate     # wait for "Listening at", then Ctrl+C
```

Test it:

```bash
curl -s http://127.0.0.1:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q":"یہ ایک ٹیسٹ ہے","source":"ur","target":"en","format":"text"}'
```

Then:

```bash
python3.14 tools/translate.py --engine libretranslate --libre-url http://127.0.0.1:5000
```

On later sessions the container already exists — just `docker start libretranslate`.

## Either way

Output is tagged `method=mt, reviewed=false`. A glossary hints file is written per
book from `data/glossary.csv`, listing preferred renderings for Sufi terms found in
the text — advisory only, no automatic substitution. Machine translation is a
draft; it does not go near published copy without human review.

---

# PART 10 — English key-takeaways summaries

Reads `out/ocr/Final/`, chunks long books on paragraph boundaries (never
mid-sentence), and summarizes via the Anthropic API. Resumable — skips books and
chunks that already have output.

```bash
cd ~/Harvard/"Shrines Project"
export ANTHROPIC_API_KEY=sk-ant-...        # never commit this

python3.14 tools/summarize_books.py --dry-run     # chunking + cost estimate, no API calls
python3.14 tools/summarize_books.py --limit 1     # one book, check quality
python3.14 tools/summarize_books.py               # the rest
```

Output: `summaries/<book>_takeaways.txt`. A token and cost report prints at the end.

To keep the key across sessions, add the `export` line to `~/.zshrc` — but never
into any file in the repo.

---

# PART 11 — *Haqeeqat ul Fuqara* specifically

## Background

This PDF (21.8 MB, Drive id `1Dmljka0fvXQMD_oC7MuW63wX3RZI2fmm`) sits in the form's
uploads folder but **its link appears nowhere in the responses sheet**. One
response has "Book uploaded" in the trailing column with no matching link in
column 21. It was uploaded 2026-06-15 at 21:22:22 UTC — one second before
*Tarikh-e-Lahore*, same surveyor, same session as the Darbar Modho Laal Hussain
submission.

External catalogue records describe it as a biography of Hazrat Madho Lal Hussain,
which fits that upload context. **Treat this as a working hypothesis, not a
citation.** Confirm from the title page and opening chapter once OCR completes.

## Step 11.1 — Get the filename

```bash
cd ~/Harvard/"Shrines Project"
ls books/ | grep -i haqeeqat
```

## Step 11.2 — OCR the front matter first

Eight pages is enough to see the title page, author, and publisher:

```bash
python3.14 tools/process_books.py \
  --test-pdf "./books/<FILENAME>.pdf" \
  --first-page 1 --max-pages 8 \
  --utrnet-url "http://127.0.0.1:7860" --dpi 300
```

## Step 11.3 — Then the whole book

```bash
python3.14 tools/process_books.py \
  --test-pdf "./books/<FILENAME>.pdf" \
  --first-page 1 \
  --utrnet-url "http://127.0.0.1:7860" --dpi 300

python3.14 tools/finalize_books.py
python3.14 tools/translate.py --engine nllb
python3.14 tools/summarize_books.py --limit 1
```

(If you already ran Part 8's batch, this book is done — skip to 11.4.)

## Step 11.4 — Send it back to me

I can't read the transcription until it exists. Once it does, open a session in
this folder and point me at:

```text
out/ocr/Final/<Haqeeqat-ul-Fuqara>__<date>.txt
summaries/<Haqeeqat-ul-Fuqara>_takeaways.txt
```

I'll read the text, confirm or correct the Madho Lal Hussain attribution from
internal evidence, and draft the sourced additions — a themed `## ` section plus a
`## Bibliography` entry in house style — for whichever shrine row the content
actually supports. If it turns out to be a *tazkirah*-style work covering several
saints, I'll split the material across the relevant rows rather than forcing it
into one.

## Step 11.5 — Close the provenance gap properly

Ask Saifullah which submission the book belongs to. That gives you a surveyor's
attribution instead of an inference from upload timestamps — the difference between
a citable provenance record and a guess.

---

# PART 12 — Validate and rebuild

```bash
cd ~/Harvard/"Shrines Project"

npm run data:validate      # dataset + tours + Urdu parity + no-leak gates
npm run verify             # typecheck + lint + unit tests
```

Both must be green. If you changed anything touching Urdu or i18n, also run:

```bash
npm run build:e2e
npm run e2e                # includes the no-English-leak guard for ?lang=ur
```

Optional local preview:

```bash
npm run dev
```

The updated TSV then replaces the master sheet contents the same way
`FULL_SHEET_REPLACEMENT.tsv` was used before. Confirm that against your own
sheet-update habit before pasting — it overwrites 168 rows.

---

# PART 13 — Commit

```bash
cd ~/Harvard/"Shrines Project"

git status --short
git add public/photos data/new-photos-manifest.json shrines_updated_2026-08-09.tsv
git commit -m "Self-host 48 field-survey photos for 5 shrines; point dataset at canonical URLs"
git push
```

`out/`, `books/`, `chunks/` and `summaries/` stay local — they're gitignored and
regenerable.

---

# PART 14 — Shutting down

```bash
# stop the OCR batch
Ctrl+C

# stop UTRNet, in its tab
Ctrl+C

# stop LibreTranslate, if you started it
docker stop libretranslate
```

---

# Appendix A — The whole thing, condensed

Once everything is installed, this is the entire working sequence:

```bash
# ---- terminal 1: model server (leave running) ----
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate
python app.py

# ---- terminal 2: the pipeline ----
cd ~/Harvard/"Shrines Project"

python3.14 tools/download_books.py                                  # 2 new PDFs
python3.14 tools/ocr_all_books.py --workers 4 --dpi 300             # OCRs only what's missing
python3.14 tools/finalize_books.py                                  # quality gate -> out/ocr/Final/
python3.14 tools/ocr_postcorrect.py                                 # optional cleanup
python3.14 tools/translate.py --engine nllb                         # English drafts
export ANTHROPIC_API_KEY=sk-ant-...
python3.14 tools/summarize_books.py                                 # key takeaways

python3.14 tools/fetch_shrine_photos.py                             # 48 photos
python3.14 tools/swap_photo_urls.py shrines_updated_2026-08-09.tsv  # Drive -> github.io

npm run data:validate && npm run verify

# ---- terminal 3: progress ----
cd ~/Harvard/"Shrines Project"
while true; do python3.14 tools/ocr_status.py; sleep 30; done
```

---

# Appendix B — Troubleshooting

**`pdftoppm: command not found`**
`brew link poppler` and open a new terminal. Or pass the path explicitly:
`--pdftoppm "$(brew --prefix poppler)/bin/pdftoppm"`

**`ModuleNotFoundError: gradio_client`**
`python3.14 -m pip install -r requirements.txt`

**UTRNet: `ImportError: cannot import name 'HfFolder' from 'huggingface_hub'`**
```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp && source .venv/bin/activate
python -m pip install --force-reinstall "huggingface_hub==0.20.3"
python app.py
```

**UTRNet: `TypeError: unhashable type: 'dict'` / "shareable link must be created"**
The Gradio web stack drifted. Reinstall the full pinned set from Step 5.3, then
`python -m pip check` before restarting.

**UTRNet starts but OCR requests hang**
Confirm the `python app.py` tab is still alive and the URL is exactly
`http://127.0.0.1:7860`. Restart the server, then retry.

**OCR output is empty or Latin gibberish**
The book has a broken embedded text layer and was extracted rather than OCR'd.
Force real OCR:
```bash
python3.14 tools/ocr_all_books.py --force-ocr --force --limit 1
```
Two books already known bad this way (`08_BaleJibreel`, `28_Talzeem`) are handled
automatically by the `--ocr-anyway` default.

**Book download fails with a permission error**
Not shared as "anyone with the link". Fix sharing in Drive, or use
`--cookies ~/Downloads/cookies.txt` once.

**Photo download fails**
Same cause. The script prints the URL and target path — save it by hand and re-run.

**`torch.backends.mps.is_available()` prints `False`**
OCR falls back to CPU. It still works, just slower. Usually means torch was
installed as a CPU-only build; reinstalling inside the 3.10 venv normally fixes it.

**Everything is slow / fans loud**
Drop to `--workers 3`. More than 4 gains nothing anyway — they all queue against
one model server.

---

# Appendix C — What each tool does

| Tool | Purpose |
| --- | --- |
| `tools/download_books.py` | Pulls book PDFs from the Drive links in `books/links.txt`; maintains `books/manifest.json` with size and sha1 so duplicate uploads are flagged |
| `tools/process_books.py` | The core worker — renders PDF pages, runs OCR, optionally translates and writes back to the sheet |
| `tools/ocr_all_books.py` | Runs `process_books.py` across the whole corpus in a small parallel pool; skips finished books |
| `tools/ocr_status.py` | Regenerates `out/ocr/STATUS.md`, a live progress dashboard derived from the filesystem |
| `tools/finalize_books.py` | Automated quality gate; publishes passing transcriptions to `out/ocr/Final/` under human-readable names |
| `tools/ocr_postcorrect.py` | Rule-based Urdu cleanup plus per-paragraph confidence scoring and diffs |
| `tools/translate.py` | Batch Urdu→English drafts via NLLB or LibreTranslate; loads `data/glossary.csv` as advisory hints |
| `tools/summarize_books.py` | Chunks and summarizes finalized books into English key takeaways via the Anthropic API |
| `tools/fetch_shrine_photos.py` | Downloads form-uploaded photos into `public/photos/<slug>/` from the manifest |
| `tools/swap_photo_urls.py` | Rewrites Drive image links in a TSV to canonical github.io URLs, only for images present on disk |

### Where output lands

```text
books/                              downloaded PDFs + manifest.json + links.txt
out/ocr/<book>/                     raw transcriptions
out/ocr/logs/<book>.log             per-book batch logs
out/ocr/STATUS.md                   live progress dashboard
out/ocr/Final/                      verified, published transcriptions
out/ocr_corrected/<book>/           post-corrected drafts + provenance + diffs
out/translations/                   machine-translation drafts
chunks/<book>/                      chunked text for summarization
summaries/<book>_takeaways.txt      English key takeaways
public/photos/<slug>/               self-hosted field-survey photos
```

All of these are gitignored and regenerable from `books/` plus the tooling.

---

# Appendix D — Running the pipeline on a RunPod GPU

For occasional heavy runs (re-OCR at higher DPI, a large new batch) rather than
the routine two-books-a-month case.

## Is it worth it?

For **two books, no.** Pod setup is 30–45 minutes; the Air will chew through two
books overnight while you sleep, for free. Reach for this when you're re-OCRing the
whole 32-book corpus, raising DPI, or testing a different engine — jobs where hours
of compute actually pile up.

## D1. Which GPU

**RTX 4090.** The models here are small — UTRNet recognition weights plus
YOLOv8m for layout, and NLLB-200-distilled at 600M params (~1.2 GB in fp16).
Nothing approaches 24 GB of VRAM, so the A40's 48 GB and the H100's 80 GB are
capacity you'd pay for and never use.

Between the A40 ($0.44/hr) and the 4090 ($0.74/hr) it's throughput, not memory:
the 4090 is roughly 2x the fp32 compute for 1.7x the price, so cost *per completed
job* is lower and it finishes sooner. Skip the H100 at $2.89/hr entirely.

Fall back to the A40 only if the logs show `pdftoppm` render times dominating the
OCR times — that means you're CPU-bound and a faster GPU buys nothing.

## D2. Before deploying

1. **Billing → add credit.** RunPod is prepaid; minimum top-up is $10.
2. **Secure Cloud vs Community Cloud.** Community is cheaper but interruptible.
   Our pipeline is fully resumable — `ocr_all_books.py` skips books that already
   have a transcription and `download_books.py` skips downloaded PDFs — so an
   eviction costs you only the book in flight. Community is a reasonable risk;
   use Secure for a first run while you're still learning the flow.

## D3. Deploy the pod

From the **Pods → Deploy** screen:

| Setting | Value |
| --- | --- |
| GPU | RTX 4090 |
| GPU count | 1 |
| Template | Official **RunPod PyTorch** (CUDA 12.x) |
| Container disk | 30 GB |
| Volume disk | 60 GB — mounted at `/workspace` |
| Exposed ports | none needed |

Container disk and volume disk are under **Pod Template Overrides**.

Sizing note: 60 GB gives room for the 1.2 GB corpus plus 300 DPI page renders,
which are large but transient (`process_books.py` cleans up unless you pass
`--keep-workdir`).

You do **not** need to expose port 7860. UTRNet runs inside the pod and
`process_books.py` reaches it at `127.0.0.1:7860` — exposing it publicly just puts
an unauthenticated model server on the internet.

If you'll come back to this more than once, attach a **Network Volume** instead of
a plain volume disk. It survives pod termination (billed per GB-month), so the
corpus and finished OCR persist and you skip the download every time.

Then **Deploy On-Demand**. Wait for initialisation, then **Connect → Start Web
Terminal** (or use SSH, which you'll want anyway for `rsync`).

## D4. Set up the pod (Linux + CUDA — not the macOS steps)

```bash
apt update && apt install -y poppler-utils git rsync
cd /workspace
git clone https://github.com/RaufNawaz/Sufi-Shrines.git "Shrines Project"
cd "Shrines Project"
pip install -r requirements.txt
```

### Get the books without uploading 1.2 GB

`books/links.txt` is gitignored, so it isn't in the clone — but it's a few KB.
Copy just that one file up, then let the pod pull the PDFs straight from Drive on
its own fast connection rather than pushing them from your home upload:

```bash
# from the Air
scp books/links.txt root@<POD_IP>:/workspace/"Shrines Project"/books/links.txt
```

```bash
# on the pod
cd /workspace/"Shrines Project"
python3 tools/download_books.py --check
python3 tools/download_books.py
```

### UTRNet, with a CUDA-aware torch

```bash
cd /workspace
git clone https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git
cd End-To-End-Urdu-OCR-WebApp
```

> **The one real trap.** The template ships a CUDA-enabled torch system-wide. If
> you create a plain venv and `pip install -r requirements.txt`, you'll pull a
> CPU-only torch into it and silently lose the GPU — the whole point of the pod.
> Build the venv with `--system-site-packages` so it inherits the CUDA build:

```bash
python -m venv --system-site-packages .venv
source .venv/bin/activate

python -m pip install --force-reinstall \
  "gradio==4.16.0" "gradio_client==0.8.1" "huggingface_hub==0.20.3" \
  "fastapi==0.109.0" "starlette==0.35.1" "uvicorn==0.27.0.post1" "jinja2==3.1.3"

bash download_files.sh
```

**Verify before you run anything expensive** — this must print `True`:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Then start it and leave it running (`tmux` or a second SSH session):

```bash
python app.py
```

## D5. Run the batch

```bash
cd /workspace/"Shrines Project"
nproc                                        # check vCPU count first
python3 tools/ocr_all_books.py --workers 4 --dpi 300
python3 tools/finalize_books.py
```

Set `--workers` to roughly half your vCPUs; they render pages on CPU while the GPU
serves one inference queue. Run it under `tmux` so an SSH drop doesn't kill the job.

## D6. Pull the results back and shut down

Output is small — `out/` is ~36 MB:

```bash
# from the Air
rsync -avh root@<POD_IP>:/workspace/"Shrines Project"/out/ ~/Harvard/"Shrines Project"/out/
rsync -avh root@<POD_IP>:/workspace/"Shrines Project"/summaries/ ~/Harvard/"Shrines Project"/summaries/
```

Then **terminate** the pod — not just stop it. A stopped pod releases the GPU but
still bills for attached storage. Terminate when you're done, or keep a Network
Volume and terminate the pod itself.

> RunPod's console layout changes fairly often. The settings above are what
> matter; if a label has moved, look for the equivalent under the deploy screen's
> template/override section rather than assuming it's gone.
