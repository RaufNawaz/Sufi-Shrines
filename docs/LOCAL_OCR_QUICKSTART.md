# Local OCR Quickstart

Run UTRNet OCR on a local PDF and save the Urdu transcription. Translation and
Google Sheets write-back are optional — see the flags at the end.

## 1. Open The Project Folder

```powershell
cd "D:\Harvard\Shrines Project"
```

## 2. Start The Local UTRNet Model

Open a second PowerShell window:

```powershell
cd "D:\Harvard\End-To-End-Urdu-OCR-WebApp"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python app.py
```

Leave this window running. The model should be available at:

```text
http://127.0.0.1:7860
```

Optional GPU check:

```powershell
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NO CUDA')"
```

## 3. Run OCR On Any PDF In This Folder

Open a third PowerShell window:

```powershell
cd "D:\Harvard\Shrines Project"
```

List the PDFs in the folder:

```powershell
Get-ChildItem *.pdf
```

Run OCR (transcription only, no translation):

```powershell
py -3 tools\process_books.py `
  --test-pdf "YOUR-PDF-NAME.pdf" `
  --first-page 1 `
  --max-pages 10 `
  --utrnet-url "http://127.0.0.1:7860" `
  --dpi 200
```

The script prints timing lines for PDF rendering and each OCR page.

Example:

```powershell
py -3 tools\process_books.py `
  --test-pdf "AFADA-E-KABIR.pdf" `
  --first-page 4 `
  --max-pages 2 `
  --utrnet-url "http://127.0.0.1:7860" `
  --dpi 200
```

If the PDF filename has spaces, keep the quotes:

```powershell
--test-pdf "My Urdu Book.pdf"
```

If the PDF is in a subfolder, use the relative path:

```powershell
--test-pdf ".\books\My Urdu Book.pdf"
```

To process the whole PDF, remove `--max-pages 10`:

```powershell
py -3 tools\process_books.py `
  --test-pdf "YOUR-PDF-NAME.pdf" `
  --first-page 1 `
  --utrnet-url "http://127.0.0.1:7860" `
  --dpi 200
```

## 4. Find The Output

The transcribed Urdu text is saved under:

```text
out\ocr\<book-name>\
```

For example:

```text
out\ocr\AFADA-E-KABIR\p004-p005_20260629_120000_transcribed.txt
```

The `out\` directory is in `.gitignore` — files there are never committed.

## 5. Optional: Also Produce An English Draft

Add `--translate` to request a LibreTranslate machine-translation pass.
You must start LibreTranslate first (see step 5a below).

```powershell
py -3 tools\process_books.py `
  --test-pdf "AFADA-E-KABIR.pdf" `
  --first-page 4 `
  --max-pages 2 `
  --utrnet-url "http://127.0.0.1:7860" `
  --dpi 200 `
  --translate `
  --translation-chars 10000 `
  --translation-delay 0
```

This writes a second file:

```text
out\ocr\AFADA-E-KABIR\p004-p005_20260629_120000_translated.txt
```

Machine translation is a rough draft. Always review it before publication.

### 5a. Start LibreTranslate

Open Docker Desktop and wait until it says Docker is running, then:

```powershell
docker start libretranslate
```

If the container does not exist, create it once:

```powershell
docker run -d --name libretranslate -p 127.0.0.1:5000:5000 -e LT_LOAD_ONLY=en,ur libretranslate/libretranslate
```

Check that translation is ready:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/languages" -Method Get
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

```powershell
docker stop libretranslate
```

Optional full Docker/WSL shutdown:

```powershell
wsl --shutdown
```
