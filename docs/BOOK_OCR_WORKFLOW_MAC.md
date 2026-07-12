# Book OCR and Translation Workflow (macOS)

This is the macOS counterpart to `BOOK_OCR_WORKFLOW.md` (Windows/PowerShell).
Same pipeline, same flags — just Homebrew/bash instead of winget/PowerShell.
Commands assume the project lives at `~/Harvard/Shrines Project`; adjust the
`cd` paths if you put it somewhere else.

This guide explains how to run the Urdu book OCR pipeline: transcribe a PDF
locally, and optionally produce a machine-translation draft or write results
back to the Google Sheet.

**Default behaviour (no extra flags):** OCR only — renders pages, runs UTRNet,
writes Urdu transcription to `out/ocr/<book>/`. Requires no API keys.

**Optional flags:**

| Flag            | Effect                                | Requires                          |
| --------------- | ------------------------------------- | --------------------------------- |
| `--translate`   | LibreTranslate MT pass (draft)        | Running LibreTranslate container  |
| `--write-sheet` | Read links from sheet, write OCR back | Apps Script deployment + env vars |

The pipeline is:

1. Render selected PDF pages with Poppler / `pdftoppm`.
2. OCR Urdu text with UTRNet.
3. _(Optional, `--translate`)_ Translate Urdu to English draft with LibreTranslate.
4. _(Optional, `--write-sheet`)_ Write results back to the Google Sheet.

## Main Project Folder

Run the book worker from:

```bash
cd ~/Harvard/"Shrines Project"
```

## From-Scratch Setup

Use this section on a new computer or if you are rebuilding the pipeline from
zero.

### 1. Install Python

Install Homebrew first if you don't have it: https://brew.sh

Install the normal project Python:

```bash
brew install python@3.14
```

Install Python 3.10 for the local UTRNet app:

```bash
brew install python@3.10
```

Check both:

```bash
python3.14 --version
python3.10 --version
```

### 2. Install Poppler

```bash
brew install poppler
```

Check:

```bash
pdftoppm -h
```

If `pdftoppm` is still not found, use the full path later with:

```bash
--pdftoppm "$(brew --prefix poppler)/bin/pdftoppm"
```

### 3. Install Docker Desktop

```bash
brew install --cask docker
```

Open Docker Desktop from Applications and wait until it says it's running.
Unlike Windows, macOS Docker Desktop doesn't need WSL — it runs its own
lightweight Linux VM automatically, no extra setup required.

### 4. Create LibreTranslate (Optional)

Skip this step if you only need OCR transcription. Only required when you plan
to run `--translate`.

```bash
docker run -d --name libretranslate -p 127.0.0.1:5000:5000 -e LT_LOAD_ONLY=en,ur libretranslate/libretranslate
docker logs -f libretranslate
```

Wait until it says it is listening, then press `Ctrl+C`.

Test:

```bash
curl -s http://127.0.0.1:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q":"یہ ایک ٹیسٹ ہے","source":"ur","target":"en","format":"text"}'
```

### 5. Install Python Dependencies For HF UTRNet

This is enough for the quick/free Hugging Face OCR path:

```bash
cd ~/Harvard/"Shrines Project"
python3.14 -m pip install -r requirements.txt
```

Test pages 4 and 5 of the local sample book:

```bash
python3.14 tools/process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2
```

If that produces a file under `out/ocr/AFADA-E-KABIR/`, the HF path is working.

### 6. Optional: Set Up Local UTRNet

Use this if you want OCR to run on your own machine instead of the public HF
Space.

```bash
cd ~/Harvard
git clone https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp

python3.10 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Pin the compatible web stack:

```bash
python -m pip install --force-reinstall \
  "gradio==4.16.0" \
  "gradio_client==0.8.1" \
  "huggingface_hub==0.20.3" \
  "fastapi==0.109.0" \
  "starlette==0.35.1" \
  "uvicorn==0.27.0.post1" \
  "jinja2==3.1.3"
```

Download model files:

```bash
curl -fL -o "1.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/1.jpg"
curl -fL -o "2.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/2.jpg"
curl -fL -o "3.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/3.jpg"
curl -fL -o "best_norm_ED.pth" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/best_norm_ED.pth"
curl -fL -o "yolov8m_UrduDoc.pt" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/yolov8m_UrduDoc.pt"
```

Or, if the repo ships `download_files.sh`, just run it directly (no WSL needed on Mac):

```bash
bash download_files.sh
```

Start local UTRNet:

```bash
python app.py
```

Leave it running. In a second terminal tab:

```bash
cd ~/Harvard/"Shrines Project"
python3.14 tools/process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 --utrnet-url "http://127.0.0.1:7860"
```

Optional GPU/acceleration check (Apple Silicon uses Metal via MPS, not CUDA):

```bash
python -c "import torch; print(torch.backends.mps.is_available())"
```

### 7. Deploy Apps Script (required only for `--write-sheet`)

Deploy this local file:

```text
google-apps-script/Code.gs
```

In the Google Sheet:

1. Open the shrine data spreadsheet.
2. Go to `Extensions > Apps Script`.
3. Delete any starter code.
4. Paste the full contents of `google-apps-script/Code.gs`.
5. Set the secret in `Project Settings > Script properties` (never in the code):
   add property `SCRIPT_API_KEY` with a long random value.
6. Save.
7. Go to `Deploy > New deployment > Web app`.
8. Use:

```text
Execute as: Me
Who has access: Anyone
```

9. Authorize the app.
10. Copy the web app URL.

### 8. First Google Sheets Test (requires `--write-sheet`)

In the sheet, add:

```text
Book
Transcribed
Translated
```

Upload a PDF to Google Drive, share it as `Anyone with the link can view`, and
paste the link into the `Book` column.

```bash
cd ~/Harvard/"Shrines Project"

export SHRINES_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
export SHRINES_APPS_SCRIPT_API_KEY="the-same-secret-from-Script-properties"
```

Small HF test (OCR only to sheet):

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --max-pages 10
```

Small local UTRNet test:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --max-pages 10 --utrnet-url "http://127.0.0.1:7860"
```

After the sheet output looks good, process the full same book:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --force
```

or with local UTRNet:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --force --utrnet-url "http://127.0.0.1:7860"
```

## Every-Time Startup Checklist

### 0. Add The Book Link (only for `--write-sheet` mode)

1. Upload the PDF to Google Drive.
2. Set sharing to:

```text
Anyone with the link can view
```

3. Paste the link into the shrine row's `Book` column.
4. Leave `Transcribed` and `Translated` empty for a first run.

### 1. Start LibreTranslate (only if using `--translate`)

Skip this step entirely if you are doing OCR-only runs.

If the container already exists:

```bash
docker start libretranslate
docker logs -f libretranslate
```

If you need to create it again:

```bash
docker run -d --name libretranslate -p 127.0.0.1:5000:5000 -e LT_LOAD_ONLY=en,ur libretranslate/libretranslate
docker logs -f libretranslate
```

When you see a line like this, it is running:

```text
Listening at: http://[::]:5000
```

Press `Ctrl+C` to stop watching logs. This does not stop the container.

Test LibreTranslate:

```bash
curl -s http://127.0.0.1:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q":"یہ ایک ٹیسٹ ہے","source":"ur","target":"en","format":"text"}'
```

### 2. Choose OCR Mode

There are two UTRNet modes.

Use Hugging Face for quick tests:

```bash
cd ~/Harvard/"Shrines Project"
python3.14 -m pip install -r requirements.txt
```

No UTRNet server is needed for this. The script uses:

```text
abdur75648/UrduOCR-UTRNet
```

Use local UTRNet for privacy or lots of books:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate
python app.py
```

Leave that window running. The local URL should usually be:

```text
http://127.0.0.1:7860
```

You can also skip activation and use the venv Python directly:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
.venv/bin/python app.py
```

### 3. Run The Sheet Worker (requires `--write-sheet`)

Open a second terminal tab:

```bash
cd ~/Harvard/"Shrines Project"

export SHRINES_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
export SHRINES_APPS_SCRIPT_API_KEY="the-same-secret-from-Script-properties"
```

Optional, if your data is not on the first sheet tab:

```bash
export SHRINES_SHEET_NAME="Your Sheet Tab Name"
```

Small first run for the first unfinished book:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --max-pages 10 --utrnet-url "http://127.0.0.1:7860"
```

Check the sheet. If the first 10 pages look good, process the whole same book:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --force --utrnet-url "http://127.0.0.1:7860"
```

Use `--force` here because the 10-page test already filled the row. For the
next new row with empty `Transcribed` and `Translated`, you do not need `--force`.

## OCR Local Files (Default Mode)

This mode does not read or write the spreadsheet. It writes local files to
`out/ocr/<book>/`. No API keys required.

### OCR Pages 4 and 5 With Hugging Face UTRNet

```bash
cd ~/Harvard/"Shrines Project"
python3.14 tools/process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2
```

### OCR The First 10 Pages With Hugging Face UTRNet

```bash
cd ~/Harvard/"Shrines Project"
python3.14 tools/process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 1 --max-pages 10
```

### OCR Pages 4 and 5 With Local UTRNet

Start local UTRNet first:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate
python app.py
```

Then in a second terminal tab:

```bash
cd ~/Harvard/"Shrines Project"
python3.14 tools/process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 --utrnet-url "http://127.0.0.1:7860"
```

### OCR + Translation Draft (add `--translate`)

Start LibreTranslate first (see Every-Time Startup Checklist → Step 1), then:

```bash
python3.14 tools/process_books.py \
  --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 \
  --utrnet-url "http://127.0.0.1:7860" --translate
```

### Output Files

Transcription only:

```text
out/ocr/AFADA-E-KABIR/p004-p005_YYYYMMDD_HHMMSS_transcribed.txt
```

With `--translate`:

```text
out/ocr/AFADA-E-KABIR/p004-p005_YYYYMMDD_HHMMSS_translated.txt
```

The `out/` directory is git-ignored — files there are never committed.

## Full Local UTRNet Setup

You only need to do this once.

```bash
cd ~/Harvard
git clone https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp

python3.10 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Download UTRNet/Yolo model files — if the repo ships a download script, just run it:

```bash
bash download_files.sh
```

Fallback if that script doesn't create the model files:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp

curl -fL -o "1.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/1.jpg"
curl -fL -o "2.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/2.jpg"
curl -fL -o "3.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/3.jpg"
curl -fL -o "best_norm_ED.pth" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/best_norm_ED.pth"
curl -fL -o "yolov8m_UrduDoc.pt" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/yolov8m_UrduDoc.pt"

ls -la 1.jpg 2.jpg 3.jpg best_norm_ED.pth yolov8m_UrduDoc.pt
```

Start the local app:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate
python app.py
```

## Switch To Google Sheets Mode

Use this when you are ready to process books from the spreadsheet and write
`Transcribed` / `Translated` back to the sheet.

### 1. Prepare The Sheet

Add this column to your Google Sheet:

```text
Book
```

Paste a shared Google Drive PDF link or a direct PDF link into `Book` for each
shrine row.

The script will fill:

```text
Transcribed
Translated
Transcribed 2
Translated 2
...
```

Overflow columns are used automatically when a full book is too large for one
Google Sheets cell.

Rows are skipped when `Book` is filled and both `Transcribed` and `Translated`
already have text.

### 2. Make Sure Apps Script Is Deployed

Deploy this file from this project:

```text
google-apps-script/Code.gs
```

Full setup:

1. Open the shrine data Google Sheet.
2. Go to:

```text
Extensions > Apps Script
```

3. Delete any starter code.
4. Paste the full contents of:

```text
google-apps-script/Code.gs
```

5. Set the secret in `Project Settings > Script properties` (never in the code):
   add property `SCRIPT_API_KEY` with a long random value.
6. Save the Apps Script project.
7. Deploy:

```text
Deploy > New deployment > Web app
```

8. Use these deployment settings:

```text
Execute as: Me
Who has access: Anyone
```

9. Click `Deploy`.
10. Authorize the app when Google asks.
11. Copy the web app URL. It should look like:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

12. Use that URL as `SHRINES_APPS_SCRIPT_URL`.
13. Use the same long secret as `SHRINES_APPS_SCRIPT_API_KEY`.

Important: do not put this Apps Script URL or secret back into the public
frontend config. Keep them in your local shell environment only (e.g. add the
`export` lines to `~/.zshrc` if you want them to persist across terminals —
just never commit them).

### 3. Set Apps Script Environment Variables

```bash
cd ~/Harvard/"Shrines Project"

export SHRINES_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
export SHRINES_APPS_SCRIPT_API_KEY="the-same-secret-from-Script-properties"
```

If your data is not on the first sheet, also set:

```bash
export SHRINES_SHEET_NAME="Your Sheet Tab Name"
```

### 4. Run One Sheet Book First

Using Hugging Face UTRNet:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1
```

Using local UTRNet:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --utrnet-url "http://127.0.0.1:7860"
```

Small first test, only first 5 pages of the first unfinished book:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --max-pages 5
```

Specific pages, for example pages 4 and 5:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --first-page 4 --max-pages 2
```

### 5. Process The Rest

Using Hugging Face UTRNet:

```bash
python3.14 tools/process_books.py --write-sheet
```

Using local UTRNet:

```bash
python3.14 tools/process_books.py --write-sheet --utrnet-url "http://127.0.0.1:7860"
```

## Useful Options

Dry run OCR without saving to Google Sheets (requires `--write-sheet`):

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --dry-run
```

Reprocess a sheet row even if output columns already exist:

```bash
python3.14 tools/process_books.py --write-sheet --limit 1 --force
```

Keep temporary rendered page images for debugging:

```bash
python3.14 tools/process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 --keep-workdir
```

Use a custom Poppler path:

```bash
python3.14 tools/process_books.py --pdftoppm "$(brew --prefix poppler)/bin/pdftoppm" --test-pdf "AFADA-E-KABIR.pdf"
```

Use Tesseract fallback instead of UTRNet (install with `brew install tesseract` first):

```bash
python3.14 tools/process_books.py --ocr-engine tesseract --tesseract "$(brew --prefix tesseract)/bin/tesseract" --tessdata-dir "./tessdata" --test-pdf "AFADA-E-KABIR.pdf"
```

## Stop Services

Stop LibreTranslate:

```bash
docker stop libretranslate
```

Stop local UTRNet:

```text
Ctrl+C
```

in the terminal tab running `python app.py`.

## Troubleshooting

If `pdftoppm` is not found, either add Poppler to PATH (`brew link poppler` or
open a new terminal) or pass the full path with `--pdftoppm`.

If `gradio_client` is missing:

```bash
python3.14 -m pip install -r requirements.txt
```

If local UTRNet fails with this error:

```text
ImportError: cannot import name 'HfFolder' from 'huggingface_hub'
```

pin `huggingface_hub` to a version compatible with the app's older Gradio:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate
python -m pip install --force-reinstall "huggingface_hub==0.20.3"
python app.py
```

If it still fails, reinstall the matching Gradio stack:

```bash
python -m pip install --force-reinstall "gradio==4.16.0" "gradio_client==0.8.1" "huggingface_hub==0.20.3"
python app.py
```

If local UTRNet starts with `Running on local URL` but then crashes with:

```text
TypeError: unhashable type: 'dict'
ValueError: When localhost is not accessible, a shareable link must be created.
```

pin Gradio's web-server dependencies to versions compatible with
`gradio==4.16.0`:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate

python -m pip install --force-reinstall \
  "gradio==4.16.0" \
  "gradio_client==0.8.1" \
  "huggingface_hub==0.20.3" \
  "fastapi==0.109.0" \
  "starlette==0.35.1" \
  "uvicorn==0.27.0.post1" \
  "jinja2==3.1.3"

python -m pip check
python app.py
```

If the local UTRNet app is not responding, make sure the `python app.py` window
is still running and that the URL is exactly:

```text
http://127.0.0.1:7860
```
