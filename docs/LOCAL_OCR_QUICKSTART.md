# Local OCR Quickstart

Use these commands when you want to run the local GPU UTRNet OCR model and
translate the OCR text.

## 1. Open The Project Folder

```powershell
cd "D:\Harvard\Shrines Project"
```

## 2. Start LibreTranslate

First open Docker Desktop and wait until it says Docker is running.

Then run:

```powershell
docker start libretranslate
```

If Docker says the container does not exist, create it once:

```powershell
docker run -d --name libretranslate -p 127.0.0.1:5000:5000 -e LT_LOAD_ONLY=en,ur libretranslate/libretranslate
```

Check that translation is ready:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/languages" -Method Get
```

## 3. Start The Local UTRNet Model

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

## 4. Run OCR And Translation On Any PDF In This Folder

Open a third PowerShell window:

```powershell
cd "D:\Harvard\Shrines Project"
```

List the PDFs in the folder:

```powershell
Get-ChildItem *.pdf
```

Run OCR and translation by replacing the PDF name:

```powershell
py -3 process_books.py `
  --test-pdf "YOUR-PDF-NAME.pdf" `
  --first-page 1 `
  --max-pages 10 `
  --utrnet-url "http://127.0.0.1:7860" `
  --dpi 200 `
  --translation-chars 10000 `
  --translation-delay 0
```

The script prints timing lines for PDF rendering, each OCR page, total OCR, and
translation chunks. Use those lines to see whether OCR or translation is the
slow part.

Example:

```powershell
py -3 process_books.py `
  --test-pdf "AFADA-E-KABIR.pdf" `
  --first-page 4 `
  --max-pages 2 `
  --utrnet-url "http://127.0.0.1:7860" `
  --dpi 200 `
  --translation-chars 10000 `
  --translation-delay 0
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
py -3 process_books.py `
  --test-pdf "YOUR-PDF-NAME.pdf" `
  --first-page 1 `
  --utrnet-url "http://127.0.0.1:7860" `
  --dpi 200 `
  --translation-chars 10000 `
  --translation-delay 0
```

## 5. Find The Output

The output files are saved in:

```text
book_test_output
```

You should get one transcribed file and one translated file:

```text
BOOKNAME_p001-p010_TIMESTAMP_transcribed.txt
BOOKNAME_p001-p010_TIMESTAMP_translated.txt
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

Stop LibreTranslate:

```powershell
docker stop libretranslate
```

Optional full Docker/WSL shutdown:

```powershell
wsl --shutdown
```
