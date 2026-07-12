# Local OCR Quickstart (macOS)

This is the macOS counterpart to `LOCAL_OCR_QUICKSTART.md` (Windows/PowerShell).
For full setup from scratch (Homebrew, Poppler, Docker), see
`BOOK_OCR_WORKFLOW_MAC.md` first. This assumes local UTRNet and Python deps are
already installed.

Run UTRNet OCR on a local PDF and save the Urdu transcription. Translation and
Google Sheets write-back are optional — see the flags at the end.

## 1. Open The Project Folder

```bash
cd ~/Harvard/"Shrines Project"
```

## 2. Start The Local UTRNet Model

Open a second terminal tab:

```bash
cd ~/Harvard/End-To-End-Urdu-OCR-WebApp
source .venv/bin/activate
python app.py
```

Leave this window running. The model should be available at:

```text
http://127.0.0.1:7860
```

Optional acceleration check (Apple Silicon uses Metal via MPS, not CUDA):

```bash
python -c "import torch; print(torch.backends.mps.is_available())"
```

## 3. Run OCR On Any PDF In This Folder

Open a third terminal tab:

```bash
cd ~/Harvard/"Shrines Project"
```

List the PDFs in the folder:

```bash
ls *.pdf
```

Run OCR (transcription only, no translation):

```bash
python3.14 tools/process_books.py \
  --test-pdf "YOUR-PDF-NAME.pdf" \
  --first-page 1 \
  --max-pages 10 \
  --utrnet-url "http://127.0.0.1:7860" \
  --dpi 200
```

The script prints timing lines for PDF rendering and each OCR page.

Example:

```bash
python3.14 tools/process_books.py \
  --test-pdf "AFADA-E-KABIR.pdf" \
  --first-page 4 \
  --max-pages 2 \
  --utrnet-url "http://127.0.0.1:7860" \
  --dpi 200
```

If the PDF filename has spaces, keep the quotes:

```bash
--test-pdf "My Urdu Book.pdf"
```

If the PDF is in a subfolder, use the relative path:

```bash
--test-pdf "./books/My Urdu Book.pdf"
```

To process the whole PDF, remove `--max-pages 10`:

```bash
python3.14 tools/process_books.py \
  --test-pdf "YOUR-PDF-NAME.pdf" \
  --first-page 1 \
  --utrnet-url "http://127.0.0.1:7860" \
  --dpi 200
```

## 4. Find The Output

The transcribed Urdu text is saved under:

```text
out/ocr/<book-name>/
```

For example:

```text
out/ocr/AFADA-E-KABIR/p004-p005_20260629_120000_transcribed.txt
```

The `out/` directory is in `.gitignore` — files there are never committed.

## 5. Optional: Also Produce An English Draft

Add `--translate` to request a LibreTranslate machine-translation pass.
You must start LibreTranslate first (see step 5a below).

```bash
python3.14 tools/process_books.py \
  --test-pdf "AFADA-E-KABIR.pdf" \
  --first-page 4 \
  --max-pages 2 \
  --utrnet-url "http://127.0.0.1:7860" \
  --dpi 200 \
  --translate \
  --translation-chars 10000 \
  --translation-delay 0
```

This writes a second file:

```text
out/ocr/AFADA-E-KABIR/p004-p005_20260629_120000_translated.txt
```

Machine translation is a rough draft. Always review it before publication.

### 5a. Start LibreTranslate

Open Docker Desktop and wait until it says Docker is running, then:

```bash
docker start libretranslate
```

If the container does not exist, create it once:

```bash
docker run -d --name libretranslate -p 127.0.0.1:5000:5000 -e LT_LOAD_ONLY=en,ur libretranslate/libretranslate
```

Check that translation is ready:

```bash
curl -s http://127.0.0.1:5000/languages
```

## 6. Stop Everything

Stop the OCR command:

```text
Ctrl+C
```

Stop the local UTRNet model in the `python app.py` window:

```text
Ctrl+C
```

Stop LibreTranslate (only if you started it):

```bash
docker stop libretranslate
```

There's no WSL to shut down on macOS — quitting Docker Desktop (or leaving it
running) is enough.
