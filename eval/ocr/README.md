# OCR Evaluation Gold Samples

Gold samples are manually verified Urdu transcriptions used to measure OCR
quality (CER/WER) before and after post-correction.

## How to add a gold sample

1. Run OCR on a PDF with `process_books.py`:
   ```powershell
   py -3 tools\process_books.py --test-pdf "BOOK.pdf" --first-page 4 --max-pages 1
   ```

2. Open the resulting `out\ocr\<book>\..._transcribed.txt` in a text editor.

3. Manually correct every OCR error by reference to the original scan.

4. Save the corrected text as a gold file:
   ```text
   eval\ocr\samples\<book-slug>\p004_gold.txt
   ```

5. Keep the raw OCR file path for reporting (it lives under `out\ocr\`).

## Naming convention

| File | Path pattern |
|---|---|
| Gold reference | `eval/ocr/samples/<set>/<name>_gold.txt` |
| Raw OCR | `out/ocr/<set>/<name>_transcribed.txt` |
| Post-corrected | `out/ocr_corrected/<set>/<name>_corrected.txt` |

The `run_cer.py --batch` command discovers pairs automatically by this pattern.

## Running evaluation

Single pair:
```powershell
py -3 eval\ocr\run_cer.py `
  --gold eval\ocr\samples\example\p001_gold.txt `
  --hyp  out\ocr\example\p001_transcribed.txt `
  --corrected out\ocr_corrected\example\p001_corrected.txt
```

Batch (all samples):
```powershell
py -3 eval\ocr\run_cer.py --batch eval\ocr\samples\ --report eval\ocr\REPORT.md
```

## Metrics

- **CER** (Character Error Rate): `edit_distance(hyp, ref) / len(ref)` — lower is better.
- **WER** (Word Error Rate): word-level edit distance / reference word count.
- **ΔCER**: `corrected_CER − raw_CER`; negative means post-correction improved accuracy.

Acceptance criterion (C2): post-correction measurably lowers CER on these samples.

## Sample format

Plain UTF-8 text. Each file contains the manually transcribed Urdu text for
one or more consecutive pages. Paragraphs are separated by one blank line.
No metadata headers.

---

*Add real samples by running OCR on source PDFs and manually correcting them.*
*The example sample in `samples/example/` shows the expected file format.*
