# What the literature says about OCR of Urdu Nastaliq books in 2026, and what this queue adopts

*Web survey run 14 September 2026 before the first page of the cloud queue was transcribed. Written
for `docs/CLOUD_OCR_QUEUE.md`; the "Adopted" lines are what changed in `pipeline/book_queue/`.*

## 1. Engines: where Nastaliq recognition actually stands

**The one Urdu specific benchmark paper of the year** is Arif and Farid, "From Press to Pixels:
Evolving Urdu Text Recognition" (LREC 2026; arXiv 2505.13943 v3). On their Urdu Newspaper Benchmark
(829 paragraph images, 9,982 sentences, Nastaliq) the word error rates were:

| engine | WER | note |
|---|---|---|
| Gemini 2.5 Pro | 0.133 | best overall |
| Claude 3.7 Sonnet | 0.249 | |
| GPT 4.1 | 0.254 | |
| Llama 4 Maverick | 0.305 | |
| GPT 4o | 0.327 | fine tuned on 500 in domain samples: 0.269 |
| TrOCR | 0.422 | best classical baseline (CER 0.159) |
| Kraken | 0.558 | CER 0.221 |
| **UTRNet** | **0.602** | CER 0.306. This is the engine in `tools/` |
| EasyOCR | 0.802 | |
| Tesseract | 2.401 | unusable on Nastaliq |

Three findings carry over directly. First, every classical engine collapses on Nastaliq relative to
Naskh; the repo's UTRNet output for the 30 existing books should be read with that in mind and a CER
on a few gold pages would be worth knowing. Second, a SwinIR super resolution pass before recognition
cut LLM WER by 24.9% (Gemini) to 70.6% (Llama), so **input resolution is the single biggest lever**.
Third, LLM errors are dominated by **deletions** (skipped words and lines, a conservative decoder) and
by YEH / ALEF confusions; their prompt was "You are an OCR system. Your job is to transcribe image text
exactly as shown, without interpretation, paraphrasing, translation, summarization, or hallucination
… Preserve sentence structure NOT spacing. If anything is unreadable, write '[UNREADABLE]'", at
temperature 0. Multi column layouts had to be segmented first because "LLMs tend to extract text
across columns non-sequentially".

**Historical print more generally** (Russian Civil type, 1,029 pages, 12 LLMs; arXiv 2510.06743):
Gemini 2.5 Pro 3.36% CER, Qwen 2.5 VL 5.81%, Claude 3.5 6.79%, against Tesseract 21.55% and Surya
45.96%. Full page mode beat line by line for the strong models. Characteristic LLM failure: not
modernising but **over historicising** (inserting archaic letters and diacritics the printer never
used). A cross pathway study on historical text (Information 17(8):722, 2026) found direct multimodal
transcription most accurate (3.84% CER / 6.68% WER) versus OCR plus LLM correction (4.74 / 8.47) and
plain OCR (11.74 / 29.89), with the warning that **numbers and measurements in tables remained the
persistent risk** even when aggregate CER was low.

**Open weights for Urdu** exist but do not fit this workspace. Qaari 0.1 (Qwen2 VL 2B fine tuned on
10,000 synthetic Urdu images in five Nastaliq fonts; CER 0.029 on its own synthetic test, degrades on
unseen fonts and low resolution scans) and urdu-deepseek-ocr (DeepSeek OCR with LoRA on 6,291 images,
no CER reported) are GPU models hosted on Hugging Face, which this workspace cannot reach, and a 2B
vision model on two CPU cores would take minutes per page. Kraken runs on CPU and OpenITI's MAKHZAN
dataset (Zenodo, CC BY NC SA) includes Urdu offset print for training, but its Nastaliq WER above
(0.558) is not competitive with reading the page in a frontier model. General document OCR leaders on
OmniDocBench (GLM OCR 94.62, PaddleOCR VL 94.50, Gemini 3.1 Pro about 90.3) are Chinese and English
centred; none reports Urdu.

**Adopted.** Route = Claude reading each page (Rauf's decision, and the literature agrees that a
frontier multimodal model is the right class of tool for Nastaliq). The queue records the engine per
book in the provenance JSON so a later Gemini or API pass can be compared page for page.

## 2. Image resolution and cost (Anthropic vision docs, read 14 Sep 2026)

Images are tokenised in 28 px patches: cost = ⌈w/28⌉ × ⌈h/28⌉ visual tokens. Standard tier fits
1568 px on the long edge (1568 tokens max as quoted in the docs' table, about 2,240 for a full
1120 × 1568 page); the high resolution tier for Claude 4.7 and later fits 2576 px and 4,784 tokens,
which for a 1.4:1 book page means about 1630 × 2290 px. Lossy recompression is warned against
("heavy JPEG compression can make text difficult to read", and artefacts compound across passes).

**Adopted.** `render` now extracts the embedded scan with `pdfimages` (no re-rasterising, no second
compression), converts to 8 bit grayscale and **downscales only**, with LANCZOS, to the chosen long
edge; PNG output. Two presets: `--scale 1568` (about 2,240 tokens a page) and `--scale 2290` (about
4,780). The pilot reads the same difficult pages at both and picks per book; expect the modern prints
(Shah Jamal, Wasif) to be fine at 1568 and the two Digital Library of India lithographs to need 2290.
Rendering above the scan's native pixel size is pointless; `ingest` now records the native size.

## 3. Layout: spreads and columns

Two page spreads halve the effective resolution and invite cross page line merging; multi column
pages invite cross column merging (Arif and Farid segment columns with a YOLO model before
recognition).

**Adopted.** `ingest` reports the fraction of landscape scans; `render --split-spreads` cuts them
into two images with a 3% overlap, right page first for Urdu, and the worker writes both halves into
the single page text file with `[spread: first page]` / `[spread: second page]` markers. Column order
is a written rule in the worker protocol (right column first in Urdu) and the pilot checks it on
the Tazkirah, whose pages may be two column.

## 4. Deletions, hallucinations and how to catch them

The dominant LLM OCR error is silent omission; the second is plausible invented text; the third is
"correcting" the source. Post correction of the text alone does not help for low resource
languages: "OCR Error Post-Correction with LLMs in Historical Documents: No Free Lunches" (arXiv
2502.01205) found every open model made Finnish worse and only GPT 4o helped modestly (11.9% CER),
with over generation ("Here is the corrected text…") and dropped segments as failure modes; the
Russian study found models re-performed OCR rather than correcting, "offering no benefit or actively
harming accuracy".

**Adopted.**
- Worker protocol: count the printed lines before writing; after writing, every printed line must
  have a counterpart. Never guess a proper noun, date or numeral silently: `[OCR?]` after it or
  `[illegible]`. No modernising, no added diacritics, no translation.
- No text only post correction pass. A page whose report carries `[illegible` or three or more
  `[OCR?]` flags is re-read once at the higher scale by a different worker; the two readings are
  reconciled by a third look at the image, never by preference for the fluent one.
- Numbers get a dedicated check at the takeaways stage: every date or count that enters a shrine
  entry is re-read from the page image, because "lower aggregate error rates do not guarantee safe
  quantitative reuse".

## 5. Evaluation

Every study above measured against hand verified gold pages with explicit Unicode normalisation,
segmented at 200 to 300 words, and reported by page quality class. The repo has `eval/ocr/run_cer.py`
(CER and WER, pure stdlib) and exactly one gold sample.

**Adopted.** `queue.py eval <slug> <page> <gold.txt>` wraps `run_cer.py`. The pilot produces three
gold pages per print class (Rauf or a careful double reading verifies them), giving a CER per class
that goes into `state.json` and this document. Normalisation for the comparison: NFC, strip
ZWNJ/ZWJ and tatweel, treat Urdu and Western digits as equal, optionally strip harakat; documented in
`eval/ocr/README.md` when the pilot lands.

## 6. Reproducibility

Both historical print studies stress recording prompts, processing dates and model versions.
**Adopted.** Provenance JSON per book: method, model family, render scale, split flag, date, and the
protocol version; `state.json` keeps the per batch log.

## Sources

- Arif and Farid, From Press to Pixels: Evolving Urdu Text Recognition, LREC 2026 — https://aclanthology.org/2026.lrec-1.235/ and https://arxiv.org/html/2505.13943v3
- Evaluating LLMs for Historical Document OCR (Russian Civil type) — https://arxiv.org/pdf/2510.06743
- Reframing Historical Text Extraction: cross pathway validation, Information 17(8):722 — https://www.mdpi.com/2078-2489/17/8/722
- OCR Error Post-Correction with LLMs in Historical Documents: No Free Lunches — https://arxiv.org/html/2502.01205v1
- Anthropic, Vision (image sizing, token formula, tiers) — https://platform.claude.com/docs/en/build-with-claude/vision
- Qaari 0.1 Urdu OCR (Qwen2 VL 2B) model card — https://huggingface.co/oddadmix/Qaari-0.1-Urdu-OCR-VL-2B-Instruct
- urdu-deepseek-ocr — https://github.com/0xnomy/urdu-deepseek-ocr
- OpenITI MAKHZAN dataset, Journal of Open Humanities Data — https://openhumanitiesdata.metajnl.com/articles/10.5334/johd.465
- Hugging Face, Supercharge your OCR pipelines with open models — https://huggingface.co/blog/ocr-open-models
- The Definitive Guide to OCR in 2026 (pipelines vs VLMs, evaluation practice) — https://slavadubrov.github.io/blog/2026/03/04/ocr-guide/
- Best LLM for OCR 2026 (OmniDocBench ranking) — https://ofox.ai/blog/best-ai-model-for-ocr-2026/
- Cleaning up scanned PDFs for OCR (deskew, despeckle, margins) — https://pdf-lab.com/blogs/cleaning-up-scanned-pdfs-for-ocr
