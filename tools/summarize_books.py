#!/usr/bin/env python3
"""
summarize_books.py
==================
Turn the OCR'd Urdu shrine books into English "key takeaways" text files,
one per book, ready to paste into the shrines information sheet.

Pipeline per book:
  1. Read the OCR'd .txt and count words.
  2. If <= SHORT_BOOK_MAX_WORDS  -> process the whole book in a single API call.
     Otherwise                   -> split into ~WORDS_PER_CHUNK-word chunks on
                                     PARAGRAPH boundaries (never mid-sentence),
                                     saved to  chunks/<book>/chunk_001.txt ...
  3. Summarise each chunk (or the whole short book) with the Anthropic
     Messages API (model = claude-sonnet-5). Key comes from the
     ANTHROPIC_API_KEY environment variable -- it is NEVER hard-coded.
  4. For split books, make ONE final call that consolidates the chunk
     takeaways into a single deduplicated, organised set.
  5. Write plain-text takeaways to  summaries/<book>_takeaways.txt

Resumable:
  - Skips any book whose summaries/<book>_takeaways.txt already exists.
  - Skips any chunk whose chunk_NNN.summary.txt already exists.
  - Reuses chunk_NNN.txt files that were already written.
Reliability:
  - Retry-with-backoff (honours Retry-After) on 429/5xx/overloaded/network errors.
Reporting:
  - Prints progress ("book 4 of 30, chunk 2 of 3") and a total token / cost
    report at the end.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...        # (Windows: set ANTHROPIC_API_KEY=...)
    python3 summarize_books.py                 # run for real
    python3 summarize_books.py --dry-run       # chunk + estimate cost, NO API calls
    python3 summarize_books.py --limit 3       # only the first 3 books (testing)
"""

import argparse
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# Shared helpers (sibling module — importable when run as python3 tools/summarize_books.py).
from _lib import OCR_ROOT, REPO_ROOT, WINDOWS_UNSAFE, utf8_stdio

utf8_stdio()

# --------------------------------------------------------------------------- #
#  CONFIG                                                                      #
# --------------------------------------------------------------------------- #
# The OCR'd Urdu text lives here (NOT ./books/, which holds the source PDFs).
INPUT_DIR      = OCR_ROOT / "Final"
CHUNKS_DIR     = REPO_ROOT / "chunks"
SUMMARIES_DIR  = REPO_ROOT / "summaries"

MODEL                = "claude-sonnet-5"
WORDS_PER_CHUNK      = 5000     # target size of each chunk
SHORT_BOOK_MAX_WORDS = 5000     # <= this  ->  no splitting, one API call
MAX_OUTPUT_TOKENS    = 1500     # per chunk / short-book summary
CONSOLIDATE_MAX_TOKENS = 3000   # final combined summary

MAX_RETRIES       = 6
API_URL           = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

# Pricing per 1,000,000 tokens. VERIFY current claude-sonnet-5 rates at
# https://claude.com/pricing and update these two numbers -- the script always
# also prints raw token counts, which are the ground truth for cost.
PRICE_IN_PER_MTOK  = 3.00
PRICE_OUT_PER_MTOK = 15.00

# --------------------------------------------------------------------------- #
#  PROMPTS  (tuned for shrine information pages)                               #
# --------------------------------------------------------------------------- #
CHUNK_SYSTEM = """This is OCR'd Urdu text from a book and may contain recognition errors \
- use context to infer the intended meaning. Give me the key takeaways in English as \
bullet points (no word-for-word translation).

Because these notes will populate a Sufi shrine's information page, prioritise and \
clearly group the takeaways under these headings (omit any heading the text says nothing about):
- Saint(s): full name, titles/laqab, spiritual lineage/silsila, birth & death dates and places, teachers and notable disciples.
- Shrine / Darbar: location, founding or construction, custodianship, architecture, notable physical features.
- Practices & Events: urs dates, rituals, festivals, offerings, pilgrimage customs.
- Legends & Miracles (karamat): notable stories associated with the saint or shrine.
- Significance: historical, spiritual and cultural importance; key dates, places, named people and works.
- Other essentials: any further main arguments, claims or facts that don't fit above.

Keep it concise and factual. Flag anything you are unsure about because of OCR errors \
by adding "[OCR?]" next to it. Output only the bullet points."""

CONSOLIDATE_SYSTEM = """Below are bullet-point takeaways extracted from consecutive chunks \
of ONE OCR'd Urdu book (a Sufi hagiography / shrine text). Merge them into a single clean, \
deduplicated set of key takeaways in English for the shrine's information page.

- Remove duplicates and repetition; combine related points.
- Keep the same grouping: Saint(s); Shrine / Darbar; Practices & Events; Legends & Miracles; Significance; Other essentials. Omit empty headings.
- Preserve every specific name, date, place and fact. Keep "[OCR?]" flags where uncertainty was noted.
- Organise logically and concisely. Output only the consolidated bullet points."""

# --------------------------------------------------------------------------- #
#  TEXT / CHUNKING HELPERS                                                     #
# --------------------------------------------------------------------------- #
_TIMESTAMP_RE = re.compile(r"__\d{4}-\d{2}-\d{2}_\d{4}$")


def clean_book_name(filename: str) -> str:
    """'Kashf-ul-Mahjoob__2026-07-02_0249.txt' -> 'Kashf-ul-Mahjoob'."""
    stem = filename[:-4] if filename.lower().endswith(".txt") else filename
    stem = _TIMESTAMP_RE.sub("", stem).strip()
    # Strip Windows-illegal filename chars (shared regex; Urdu '؟' U+061F is allowed).
    stem = WINDOWS_UNSAFE.sub("", stem).strip()
    return stem or "book"


def word_count(text: str) -> int:
    return len(text.split())


def _split_paragraphs(text: str):
    """Split on blank lines; keep non-empty, stripped blocks."""
    parts = re.split(r"\n[ \t]*\n", text)
    return [p.strip() for p in parts if p.strip()]


def _split_sentences_urdu(paragraph: str):
    """Split an over-long paragraph on Urdu/Arabic sentence enders, keeping them."""
    pieces = re.split(r"(?<=[۔؟!\.])\s+", paragraph)
    return [p for p in pieces if p.strip()]


def chunk_text(text: str, target_words: int):
    """
    Split text into chunks of ~target_words, breaking only on paragraph
    boundaries so no sentence is cut. Paragraphs longer than the target are
    themselves split on sentence boundaries as a fallback. Greedy packing means
    a book only slightly over the threshold yields exactly two chunks.
    """
    units = []
    for para in _split_paragraphs(text):
        if word_count(para) > target_words:
            sub, sw = [], 0
            for sent in _split_sentences_urdu(para):
                w = word_count(sent)
                if sub and sw + w > target_words:
                    units.append(" ".join(sub))
                    sub, sw = [sent], w
                else:
                    sub.append(sent)
                    sw += w
            if sub:
                units.append(" ".join(sub))
        else:
            units.append(para)

    chunks, cur, cw = [], [], 0
    for unit in units:
        w = word_count(unit)
        if cur and cw + w > target_words:
            chunks.append("\n\n".join(cur))
            cur, cw = [unit], w
        else:
            cur.append(unit)
            cw += w
    if cur:
        chunks.append("\n\n".join(cur))
    return chunks


# --------------------------------------------------------------------------- #
#  API CALL  (stdlib only -- no 'anthropic' package required)                  #
# --------------------------------------------------------------------------- #
_RETRYABLE = {408, 409, 429, 500, 502, 503, 504, 529}


def call_api(api_key: str, system: str, user_text: str, max_tokens: int):
    """POST to the Messages API with retry+backoff. Returns (text, in_tok, out_tok)."""
    body = json.dumps({
        "model": MODEL,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user_text}],
    }).encode("utf-8")
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    delay = 2.0
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(API_URL, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = "".join(
                block.get("text", "")
                for block in data.get("content", [])
                if block.get("type") == "text"
            ).strip()
            usage = data.get("usage", {})
            return text, usage.get("input_tokens", 0), usage.get("output_tokens", 0)

        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")
            if e.code in _RETRYABLE and attempt < MAX_RETRIES:
                retry_after = e.headers.get("retry-after")
                wait = float(retry_after) if retry_after else delay
                wait += random.uniform(0, 1)
                print(f"      API {e.code}; retry {attempt}/{MAX_RETRIES} in {wait:.1f}s", flush=True)
                time.sleep(wait)
                delay = min(delay * 2, 60)
                continue
            raise RuntimeError(f"HTTP {e.code} from API: {detail[:500]}") from None

        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < MAX_RETRIES:
                wait = delay + random.uniform(0, 1)
                print(f"      network error ({e}); retry {attempt}/{MAX_RETRIES} in {wait:.1f}s", flush=True)
                time.sleep(wait)
                delay = min(delay * 2, 60)
                continue
            raise RuntimeError(f"Network error after {MAX_RETRIES} attempts: {e}") from None

    raise RuntimeError("Exhausted retries without a response")


# --------------------------------------------------------------------------- #
#  TOKEN / COST ESTIMATION (for --dry-run)                                     #
# --------------------------------------------------------------------------- #
def estimate_input_tokens(words: int) -> int:
    # Urdu tokenises densely; ~2.5 tokens/word is a rough middle estimate.
    return int(words * 2.5)


# --------------------------------------------------------------------------- #
#  PER-BOOK PROCESSING                                                         #
# --------------------------------------------------------------------------- #
class Usage:
    def __init__(self):
        self.in_tok = 0
        self.out_tok = 0
        self.calls = 0

    def add(self, i, o):
        self.in_tok += i
        self.out_tok += o
        self.calls += 1

    def cost(self):
        return (self.in_tok / 1e6 * PRICE_IN_PER_MTOK
                + self.out_tok / 1e6 * PRICE_OUT_PER_MTOK)


def process_book(path: Path, idx: int, total: int, api_key: str,
                 dry_run: bool, usage: Usage, est: dict):
    name = clean_book_name(path.name)
    out_file = SUMMARIES_DIR / f"{name}_takeaways.txt"
    raw = path.read_text(encoding="utf-8", errors="replace")
    words = word_count(raw)

    if out_file.exists():
        print(f"[book {idx}/{total}] {name}: summary exists -> skipping", flush=True)
        return

    # ---- short book: single call, no chunking --------------------------- #
    if words <= SHORT_BOOK_MAX_WORDS:
        print(f"[book {idx}/{total}] {name}: {words:,} words -> single piece", flush=True)
        if dry_run:
            est["calls"] += 1
            est["in_tok"] += estimate_input_tokens(words)
            est["out_tok"] += MAX_OUTPUT_TOKENS
            return
        text, i, o = call_api(api_key, CHUNK_SYSTEM, f"[Book: {name}]\n\n{raw}", MAX_OUTPUT_TOKENS)
        usage.add(i, o)
        SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)
        out_file.write_text(text + "\n", encoding="utf-8")
        print(f"           done ({o:,} out-tokens)", flush=True)
        return

    # ---- long book: chunk, summarise each, consolidate ------------------ #
    book_chunk_dir = CHUNKS_DIR / name
    existing = sorted(book_chunk_dir.glob("chunk_[0-9][0-9][0-9].txt"))
    if existing:
        chunks = [p.read_text(encoding="utf-8") for p in existing]
    else:
        chunks = chunk_text(raw, WORDS_PER_CHUNK)
        book_chunk_dir.mkdir(parents=True, exist_ok=True)
        for i, ch in enumerate(chunks, 1):
            (book_chunk_dir / f"chunk_{i:03d}.txt").write_text(ch, encoding="utf-8")

    n = len(chunks)
    print(f"[book {idx}/{total}] {name}: {words:,} words -> {n} chunks", flush=True)

    if dry_run:
        est["calls"] += n + 1                       # n chunk calls + 1 consolidation
        est["in_tok"] += sum(estimate_input_tokens(word_count(c)) for c in chunks)
        est["out_tok"] += n * MAX_OUTPUT_TOKENS
        est["in_tok"] += n * MAX_OUTPUT_TOKENS       # chunk summaries fed into consolidation
        est["out_tok"] += CONSOLIDATE_MAX_TOKENS
        return

    chunk_summaries = []
    for i, ch in enumerate(chunks, 1):
        summ_path = book_chunk_dir / f"chunk_{i:03d}.summary.txt"
        if summ_path.exists():
            print(f"      chunk {i}/{n}: cached", flush=True)
            chunk_summaries.append(summ_path.read_text(encoding="utf-8"))
            continue
        print(f"      chunk {i}/{n}: summarising", flush=True)
        user = f"[Book: {name} - chunk {i} of {n}]\n\n{ch}"
        text, ti, to = call_api(api_key, CHUNK_SYSTEM, user, MAX_OUTPUT_TOKENS)
        usage.add(ti, to)
        summ_path.write_text(text, encoding="utf-8")
        chunk_summaries.append(text)

    print(f"      consolidating {n} chunk-summaries", flush=True)
    combined = "\n\n---\n\n".join(
        f"[Chunk {i} takeaways]\n{s}" for i, s in enumerate(chunk_summaries, 1)
    )
    final, ti, to = call_api(api_key, CONSOLIDATE_SYSTEM, combined, CONSOLIDATE_MAX_TOKENS)
    usage.add(ti, to)
    SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)
    out_file.write_text(final + "\n", encoding="utf-8")
    print(f"           done -> {out_file.name}", flush=True)


# --------------------------------------------------------------------------- #
#  MAIN                                                                        #
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Summarise OCR'd Urdu shrine books into English takeaways.")
    ap.add_argument("--dry-run", action="store_true", help="chunk + estimate cost, make NO API calls")
    ap.add_argument("--limit", type=int, default=0, help="process only the first N books (testing)")
    ap.add_argument("--input-dir", default=str(INPUT_DIR), help="folder of OCR'd .txt files")
    args = ap.parse_args()

    in_dir = Path(args.input_dir)
    if not in_dir.is_dir():
        sys.exit(f"Input folder not found: {in_dir}")

    books = sorted(p for p in in_dir.glob("*.txt"))
    if args.limit:
        books = books[:args.limit]
    if not books:
        sys.exit(f"No .txt files in {in_dir}")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not args.dry_run and not api_key:
        sys.exit("ANTHROPIC_API_KEY is not set. `export ANTHROPIC_API_KEY=...` and re-run "
                 "(or use --dry-run to chunk and estimate without calling the API).")

    total = len(books)
    mode = "DRY RUN (no API calls)" if args.dry_run else f"model={MODEL}"
    print(f"=== Summarising {total} book(s) | {mode} ===\n", flush=True)

    usage = Usage()
    est = {"calls": 0, "in_tok": 0, "out_tok": 0}

    for idx, path in enumerate(books, 1):
        try:
            process_book(path, idx, total, api_key, args.dry_run, usage, est)
        except Exception as e:                       # noqa: BLE001 - keep going, resumable
            print(f"  !! {path.name}: {e}", flush=True)
            print("     (left un-summarised; re-run to retry this book)", flush=True)

    print("\n=== SUMMARY ===", flush=True)
    if args.dry_run:
        est_cost = (est["in_tok"] / 1e6 * PRICE_IN_PER_MTOK
                    + est["out_tok"] / 1e6 * PRICE_OUT_PER_MTOK)
        print(f"Planned API calls : {est['calls']:,}", flush=True)
        print(f"Est. input tokens : {est['in_tok']:,}", flush=True)
        print(f"Est. output tokens: {est['out_tok']:,}", flush=True)
        print(f"Est. cost         : ${est_cost:,.2f}  "
              f"(@ ${PRICE_IN_PER_MTOK}/${PRICE_OUT_PER_MTOK} per Mtok in/out -- VERIFY current pricing)",
              flush=True)
        print("Rough estimate: Urdu token counts and pricing are approximate.", flush=True)
        print(f"\nChunk files written under: {CHUNKS_DIR}", flush=True)
    else:
        print(f"API calls made  : {usage.calls:,}", flush=True)
        print(f"Input tokens    : {usage.in_tok:,}", flush=True)
        print(f"Output tokens   : {usage.out_tok:,}", flush=True)
        print(f"Total cost      : ${usage.cost():,.2f}  "
              f"(@ ${PRICE_IN_PER_MTOK}/${PRICE_OUT_PER_MTOK} per Mtok in/out)", flush=True)
        print(f"\nTakeaways written to: {SUMMARIES_DIR}", flush=True)


if __name__ == "__main__":
    main()
