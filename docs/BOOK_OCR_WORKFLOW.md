# Book OCR and Translation Workflow

This guide explains how to run the Urdu book OCR pipeline: transcribe a PDF
locally, and optionally produce a machine-translation draft or write results
back to the Google Sheet.

**Default behaviour (no extra flags):** OCR only — renders pages, runs UTRNet,
writes Urdu transcription to `out/ocr/<book>/`. Requires no API keys.

**Optional flags:**

| Flag | Effect | Requires |
|---|---|---|
| `--translate` | LibreTranslate MT pass (draft) | Running LibreTranslate container |
| `--write-sheet` | Read links from sheet, write OCR back | Apps Script deployment + env vars |

The pipeline is:

1. Render selected PDF pages with Poppler / `pdftoppm`.
2. OCR Urdu text with UTRNet.
3. *(Optional, `--translate`)* Translate Urdu to English draft with LibreTranslate.
4. *(Optional, `--write-sheet`)* Write results back to the Google Sheet.

## Main Project Folder

Run the book worker from:

```powershell
cd "D:\Harvard\Shrines Project"
```

## From-Scratch Setup

Use this section on a new computer or if you are rebuilding the pipeline from
zero.

### 1. Install Python

Install the normal project Python:

```powershell
winget install -e --id Python.Python.3.14
```

Install Python 3.10 for the local UTRNet app:

```powershell
py install 3.10
```

Check both:

```powershell
py -3 --version
py -3.10 --version
```

### 2. Install Poppler

Use `winget`:

```powershell
winget install -e --id oschwartz10612.Poppler
```

Close and reopen PowerShell, then check:

```powershell
pdftoppm -h
```

If `pdftoppm` is still not found, use the full path later with:

```powershell
--pdftoppm "C:\path\to\poppler\Library\bin\pdftoppm.exe"
```

### 3. Install Docker Desktop And WSL

Install WSL from Administrator PowerShell:

```powershell
wsl --install
```

Restart the computer. Then install Docker Desktop and open it.

If Docker shows a WSL error, check:

```powershell
wsl --status
wsl --list --verbose
```

In Docker Desktop, enable:

```text
Settings > Resources > WSL Integration
```

Then restart WSL:

```powershell
wsl --shutdown
```

### 4. Create LibreTranslate (Optional)

Skip this step if you only need OCR transcription. Only required when you plan
to run `--translate`.

Open WSL or a terminal where `docker` works:

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

### 5. Install Python Client For HF UTRNet

This is enough for the quick/free Hugging Face OCR path:

```powershell
cd "D:\Harvard\Shrines Project"
py -3 -m pip install -r requirements.txt
```

Test pages 4 and 5 of the local sample book:

```powershell
py -3 tools\process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2
```

If that produces a file under `out/ocr/AFADA-E-KABIR/`, the HF path is working.

### 6. Optional: Set Up Local UTRNet

Use this if you want OCR to run on your own machine instead of the public HF
Space.

```powershell
cd "D:\Harvard"
git clone https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"

py -3.10 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Pin the compatible web stack:

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

Download model files:

```powershell
curl.exe -fL -o "1.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/1.jpg"
curl.exe -fL -o "2.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/2.jpg"
curl.exe -fL -o "3.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/3.jpg"
curl.exe -fL -o "best_norm_ED.pth" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/best_norm_ED.pth"
curl.exe -fL -o "yolov8m_UrduDoc.pt" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/yolov8m_UrduDoc.pt"
```

Start local UTRNet:

```powershell
python app.py
```

Leave it running. In a second PowerShell window:

```powershell
cd "D:\Harvard\Shrines Project"
py -3 tools\process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 --utrnet-url "http://127.0.0.1:7860"
```

### 7. Deploy Apps Script (required only for `--write-sheet`)

Deploy this local file:

```text
D:\Harvard\Shrines Project\google-apps-script\Code.gs
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

In PowerShell:

```powershell
cd "D:\Harvard\Shrines Project"

$env:SHRINES_APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
$env:SHRINES_APPS_SCRIPT_API_KEY = "the-same-secret-from-Script-properties"
```

Small HF test (OCR only to sheet):

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --max-pages 10
```

Small local UTRNet test:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --max-pages 10 --utrnet-url "http://127.0.0.1:7860"
```

After the sheet output looks good, process the full same book:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --force
```

or with local UTRNet:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --force --utrnet-url "http://127.0.0.1:7860"
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

Open Ubuntu/WSL or PowerShell where Docker works.

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

Test LibreTranslate from WSL:

```bash
curl -s http://127.0.0.1:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q":"یہ ایک ٹیسٹ ہے","source":"ur","target":"en","format":"text"}'
```

Test LibreTranslate from Windows PowerShell:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:5000/translate" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"q":"یہ ایک ٹیسٹ ہے","source":"ur","target":"en","format":"text"}'
```

### 2. Choose OCR Mode

There are two UTRNet modes.

Use Hugging Face for quick tests:

```powershell
cd "D:\Harvard\Shrines Project"
py -3 -m pip install -r requirements.txt
```

No UTRNet server is needed for this. The script uses:

```text
abdur75648/UrduOCR-UTRNet
```

Use local UTRNet for privacy or lots of books:

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"
.\.venv\Scripts\Activate.ps1
python app.py
```

Leave that window running. The local URL should usually be:

```text
http://127.0.0.1:7860
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python app.py
```

You can also skip activation and use the venv Python directly:

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"
.\.venv\Scripts\python.exe app.py
```

### 3. Run The Sheet Worker (requires `--write-sheet`)

Open a second PowerShell window:

```powershell
cd "D:\Harvard\Shrines Project"

$env:SHRINES_APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
$env:SHRINES_APPS_SCRIPT_API_KEY = "the-same-secret-from-Script-properties"
```

Optional, if your data is not on the first sheet tab:

```powershell
$env:SHRINES_SHEET_NAME = "Your Sheet Tab Name"
```

Small first run for the first unfinished book:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --max-pages 10 --utrnet-url "http://127.0.0.1:7860"
```

Check the sheet. If the first 10 pages look good, process the whole same book:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --force --utrnet-url "http://127.0.0.1:7860"
```

Use `--force` here because the 10-page test already filled the row. For the
next new row with empty `Transcribed` and `Translated`, you do not need `--force`.

## OCR Local Files (Default Mode)

This mode does not read or write the spreadsheet. It writes local files to
`out/ocr/<book>/`. No API keys required.

### OCR Pages 4 and 5 With Hugging Face UTRNet

```powershell
cd "D:\Harvard\Shrines Project"
py -3 tools\process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2
```

### OCR The First 10 Pages With Hugging Face UTRNet

```powershell
cd "D:\Harvard\Shrines Project"
py -3 tools\process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 1 --max-pages 10
```

### OCR Pages 4 and 5 With Local UTRNet

Start local UTRNet first:

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"
.\.venv\Scripts\Activate.ps1
python app.py
```

Then in a second PowerShell window:

```powershell
cd "D:\Harvard\Shrines Project"
py -3 tools\process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 --utrnet-url "http://127.0.0.1:7860"
```

### OCR + Translation Draft (add `--translate`)

Start LibreTranslate first (see Every-Time Startup Checklist → Step 1), then:

```powershell
py -3 tools\process_books.py `
  --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 `
  --utrnet-url "http://127.0.0.1:7860" --translate
```

### Output Files

Transcription only:

```text
out\ocr\AFADA-E-KABIR\p004-p005_YYYYMMDD_HHMMSS_transcribed.txt
```

With `--translate`:

```text
out\ocr\AFADA-E-KABIR\p004-p005_YYYYMMDD_HHMMSS_translated.txt
```

The `out/` directory is git-ignored — files there are never committed.

## Full Local UTRNet Setup

You only need to do this once.

```powershell
cd "D:\Harvard"
git clone https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"

py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Download UTRNet/Yolo model files:

```powershell
wsl
```

Inside Ubuntu/WSL:

```bash
cd /mnt/d/Harvard/End-To-End-Urdu-OCR-WebApp
bash download_files.sh
exit
```

PowerShell-only fallback if the Bash download did not create the model files:

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"

curl.exe -fL -o "1.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/1.jpg"
curl.exe -fL -o "2.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/2.jpg"
curl.exe -fL -o "3.jpg" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/3.jpg"
curl.exe -fL -o "best_norm_ED.pth" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/best_norm_ED.pth"
curl.exe -fL -o "yolov8m_UrduDoc.pt" "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main/yolov8m_UrduDoc.pt"

Get-ChildItem "1.jpg","2.jpg","3.jpg","best_norm_ED.pth","yolov8m_UrduDoc.pt" | Select-Object Name,Length
```

Start the local app:

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"
.\.venv\Scripts\Activate.ps1
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
D:\Harvard\Shrines Project\google-apps-script\Code.gs
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
frontend config. Keep them in your local PowerShell environment only.

### 3. Set Apps Script Environment Variables

In Windows PowerShell:

```powershell
cd "D:\Harvard\Shrines Project"

$env:SHRINES_APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
$env:SHRINES_APPS_SCRIPT_API_KEY = "the-same-secret-from-Script-properties"
```

If your data is not on the first sheet, also set:

```powershell
$env:SHRINES_SHEET_NAME = "Your Sheet Tab Name"
```

### 4. Run One Sheet Book First

Using Hugging Face UTRNet:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1
```

Using local UTRNet:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --utrnet-url "http://127.0.0.1:7860"
```

Small first test, only first 5 pages of the first unfinished book:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --max-pages 5
```

Specific pages, for example pages 4 and 5:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --first-page 4 --max-pages 2
```

### 5. Process The Rest

Using Hugging Face UTRNet:

```powershell
py -3 tools\process_books.py --write-sheet
```

Using local UTRNet:

```powershell
py -3 tools\process_books.py --write-sheet --utrnet-url "http://127.0.0.1:7860"
```

## Useful Options

Dry run OCR without saving to Google Sheets (requires `--write-sheet`):

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --dry-run
```

Reprocess a sheet row even if output columns already exist:

```powershell
py -3 tools\process_books.py --write-sheet --limit 1 --force
```

Keep temporary rendered page images for debugging:

```powershell
py -3 tools\process_books.py --test-pdf "AFADA-E-KABIR.pdf" --first-page 4 --max-pages 2 --keep-workdir
```

Use a custom Poppler path:

```powershell
py -3 tools\process_books.py --pdftoppm "C:\path\to\poppler\Library\bin\pdftoppm.exe" --test-pdf "AFADA-E-KABIR.pdf"
```

Use Tesseract fallback instead of UTRNet:

```powershell
py -3 tools\process_books.py --ocr-engine tesseract --tesseract "C:\Program Files\Tesseract-OCR\tesseract.exe" --tessdata-dir ".\tessdata" --test-pdf "AFADA-E-KABIR.pdf"
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

in the PowerShell window running `python app.py`.

## Troubleshooting

If Docker is not found inside WSL, enable Docker Desktop WSL integration:

```text
Docker Desktop > Settings > Resources > WSL Integration
```

Then run:

```powershell
wsl --shutdown
```

If `pdftoppm` is not found, either add Poppler to PATH or pass the full path
with `--pdftoppm`.

If `gradio_client` is missing:

```powershell
py -3 -m pip install -r requirements.txt
```

If local UTRNet fails with this error:

```text
ImportError: cannot import name 'HfFolder' from 'huggingface_hub'
```

pin `huggingface_hub` to a version compatible with the app's older Gradio:

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"
.\.venv\Scripts\Activate.ps1
python -m pip install --force-reinstall "huggingface_hub==0.20.3"
python app.py
```

If it still fails, reinstall the matching Gradio stack:

```powershell
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

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"
.\.venv\Scripts\Activate.ps1

python -m pip install --force-reinstall `
  "gradio==4.16.0" `
  "gradio_client==0.8.1" `
  "huggingface_hub==0.20.3" `
  "fastapi==0.109.0" `
  "starlette==0.35.1" `
  "uvicorn==0.27.0.post1" `
  "jinja2==3.1.3"

python -m pip check
python app.py
```

If the local UTRNet app is not responding, make sure the `python app.py` window
is still running and that the URL is exactly:

```text
http://127.0.0.1:7860
```
