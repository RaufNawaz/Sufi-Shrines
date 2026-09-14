# Running this Urdu OCR on macOS

This app is **UTRNet** (YOLOv8 line detection + a CRNN recognizer) for Urdu OCR.
It is licensed CC BY-NC-SA 4.0 — **academic / non-commercial use only**, which
matches this project. The model weights (`best_norm_ED.pth`, `yolov8m_UrduDoc.pt`)
are already in this folder, so nothing needs downloading.

> The bundled `.venv` is a **Windows** virtualenv and will not run on macOS. Use
> the steps below to create a fresh Mac environment (`.venv-mac`).

## 1. Setup (one time)

```bash
cd "/Users/rauf/Desktop/Harvard/End-To-End-Urdu-OCR-WebApp"
bash setup_mac.sh
```

That creates `.venv-mac`, installs Mac-appropriate dependencies
(`requirements-mac.txt`), and confirms the weights are present.

If you don't have Python yet: `brew install python@3.11`. English-page OCR also
needs Tesseract: `brew install tesseract`.

## 2. Activate the environment (each session)

```bash
source .venv-mac/bin/activate
```

## 3. Quick sanity check

```bash
python batch_ocr.py --input 1.jpg --output ocr_test
cat ocr_test/1.txt
```

You should see Urdu text. (`app.py` still works too — `python app.py` launches the
Gradio single-image demo in your browser.)

## 4. Batch OCR a book (folder of images **or** a PDF)

```bash
# a folder of page images -> one .txt per page, plus _combined.txt
python batch_ocr.py --input /path/to/page_images --output book_ocr

# a PDF directly (uses PyMuPDF), all pages
python batch_ocr.py --input "book.pdf" --output book_ocr --dpi 200

# just a page range of a PDF
python batch_ocr.py --input "book.pdf" --output book_ocr --pages 54-58 --dpi 200
```

Options: `--device auto|cpu|mps|cuda` (auto picks Apple GPU/MPS if available, else
CPU), `--dpi` (PDF render resolution, 200 is a good default; try 300 for small
type), `--conf` (YOLO line-detection confidence, default 0.2).

If MPS ever errors on a specific op, rerun with `--device cpu` (it's only slower,
not less accurate). CPU is fine for a few hundred pages.

## Important accuracy note (please read)

UTRNet is trained on **printed** Urdu Nastaliq. The Bulleh Shah / Taufiq Rafat book
in the Poetry Model Project has its originals in **handwritten calligraphic**
Nastaliq, which is a much harder case — the model may make more errors there than
on printed text. **Test before trusting it at scale.**

### Recommended first test — the Rafat book's original pages

```bash
source .venv-mac/bin/activate
python batch_ocr.py \
  --input "/Users/rauf/Desktop/Harvard/Poetry Model Project/Bulleh Shah/Bulleh Shah, A Selection  Rendered into English Verse (Bullhe Shāh Taufiq Rafat) (z-library.sk, 1lib.sk, z-lib.sk).pdf" \
  --output rafat_ocr_test --pages 54-58 --dpi 300
```

PDF pages 54, 56, 58 are the Urdu originals of poems 1-3 (book pages 34/36/38);
55 and 57 are the English. Open `rafat_ocr_test/p0054.txt` etc. and compare the
Urdu against the page images. If it's clean, this can OCR the whole book fast and
replace the slow hand-transcription. If it's noisy on the calligraphy, better uses
are: (a) OCR a **printed** Urdu edition of Bulleh Shah with this tool instead, or
(b) keep using it for printed sources and hand-transcribe the calligraphic Rafat
originals.

## Two engines: Urdu pages vs English pages

UTRNet is an **Urdu-only** recognizer — it cannot read English (it returns
Urdu-looking gibberish for Latin text). So `batch_ocr.py` routes each page:

- **Even PDF pages** (the Urdu originals) → your `--urdu-engine`: `ollama` (a local
  vision-LLM — the default, and best on calligraphy) or `utrnet` (the bundled CRNN).
- **Odd PDF pages** (the English translations) → Tesseract (`brew install tesseract`).

Controlled by `--urdu-parity even|odd|all`, `--urdu-engine ollama|utrnet`, and
`--english-engine tesseract|none`. Each page's `.txt` is tagged `[urdu]` or `[eng]`
in `_combined.txt`. This routing is what makes pairing work — if the English pages
were fed to an Urdu engine they'd look like Urdu and every poem would collapse into
one blob (the bug seen in the first test).

### Urdu vision-LLM (default engine)

`--urdu-engine ollama` sends each Urdu page to a local vision model via Ollama —
much better on Nastaliq/calligraphy than the CRNN, and fully offline. One-time setup:

```
# install the Ollama app (https://ollama.com  or  brew install ollama), then:
ollama pull qwen2.5vl:7b
```

Then run `batch_ocr.py` normally (it defaults to this engine). Choose another model
with `--ollama-model`. With this engine you do NOT need torch/torchvision/ultralytics
— those are only for `--urdu-engine utrnet`.

> A vision-LLM reads calligraphy well but can occasionally normalise or misread a
> word, so a quick proofread is still wise for an authoritative corpus. Temperature
> is pinned to 0 to keep it faithful.

## Pairing Urdu + English into poems

`batch_ocr.py` writes **one text file per page** (`p0054.txt`, `p0055.txt`, ...) —
it does not itself pair them. Because the book alternates *Urdu original* then
*facing English*, use `assemble_rafat_poems.py` to group them into per-poem units:

```
python assemble_rafat_poems.py --ocr rafat_ocr --out rafat_poems
cat rafat_poems/poem_001.txt        # URDU block + ENGLISH block, together
```

It detects each page's script (Urdu vs English) and pairs a run of Urdu page(s)
with the following English page(s), so poems that spill across several pages are
handled too — those get flagged `needs_check` in `manifest.json` for a quick
eyeball. Run OCR on the **poem range only** (PDF ~54-231; earlier pages are the
English Introduction, later pages the glossary/index) so front/back matter doesn't
leak in:

```
python batch_ocr.py --input ".../Taufiq Rafat....pdf" --output rafat_ocr --pages 54-231 --dpi 300
python assemble_rafat_poems.py --ocr rafat_ocr --out rafat_poems
```

## Will this heat up / strain the laptop?

OCR is deep-learning inference, so yes — while it runs the fans will spin and the
Mac will get warm, like a long video export or a big compile. It's a **bounded,
one-time batch** (not a background process) and will **not** harm the machine:
Apple Silicon thermally throttles itself to stay safe, and temperatures drop back
as soon as it finishes. Rough cost on an M-series Mac: ~1-3 seconds/page (faster on
MPS), so the ~178 poem pages take a few minutes.

To keep it cool and controlled:

- Run in **page-range batches** (`--pages 54-90`, then `91-130`, ...) — short bursts
  instead of one long pull.
- `--throttle 0.5` pauses half a second between pages (lower sustained load/heat,
  slightly slower); `--limit 10` stops after 10 pages for a quick trial.
- `--dpi 200` is less work than 300 (use 300 only if small type is misread).
- `--device cpu` is steady/predictable if MPS runs hot or errors.
- Keep it plugged in, on a hard surface for airflow, with other heavy apps closed.

## Files added for Mac

- `setup_mac.sh` — creates `.venv-mac` and installs deps
- `requirements-mac.txt` — Mac-compatible dependency versions (torch 2.2.2 etc.)
- `batch_ocr.py` — batch OCR over a folder/PDF, with MPS/CPU auto-detection, plus `--throttle`/`--limit`
- `assemble_rafat_poems.py` — pairs the per-page OCR into per-poem Urdu+English units
- `README_MAC.md` — this file

(Originals `app.py`, `read.py`, `model.py`, `utils.py`, weights — unchanged.)
