#!/usr/bin/env python3
"""
tools/translate.py — optional batch translator for Urdu OCR output.

Reads *_transcribed.txt files produced by process_books.py and writes English
translation drafts tagged method=mt, reviewed=false.  Never call at runtime
or auto-publish output — all drafts require human review before use.

Engines
-------
nllb (default)
  Runs facebook/nllb-200-distilled-600M locally.  Downloads ~1.2 GB on first
  use from HuggingFace Hub.  No API key required.
  Install:  pip install transformers sentencepiece
            pip install torch --index-url https://download.pytorch.org/whl/cpu

libretranslate
  Posts to a local LibreTranslate container.
  Install:  docker start libretranslate
            (see docs/BOOK_OCR_WORKFLOW.md for setup)

Glossary
--------
data/glossary.csv is loaded automatically.  For each Sufi term found in the
source text, the script appends a human-readable hints file listing the
preferred rendering.  No automated replacement is performed — glossary is
advisory only, for the human reviewer.

Output (per input file)
-----------------------
  out/translations/<book>/<stem>_translated.txt
  out/translations/<book>/<stem>_provenance.json
  out/translations/<book>/<stem>_glossary_hints.txt   (only when hits exist)

All output files are in out/ which is git-ignored.
"""

import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Shared helpers live in _lib (sibling module — importable without sys.path
# tweaks when invoked as `python3 tools/translate.py`).
from _lib import (
    DEFAULT_LIBRETRANSLATE_URL,
    REPO_ROOT,
    PipelineError,
    libre_translate_chunk,
    split_text,
    utf8_stdio,
)

utf8_stdio()

DEFAULT_GLOSSARY = REPO_ROOT / "data" / "glossary.csv"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "out" / "translations"
DEFAULT_NLLB_MODEL = "facebook/nllb-200-distilled-600M"
DEFAULT_LIBRE_URL = DEFAULT_LIBRETRANSLATE_URL
DEFAULT_CHUNK_CHARS = 3000
DEFAULT_TIMEOUT = 60
DEFAULT_LIBRE_RETRIES = 2


# ── Glossary helpers ──────────────────────────────────────────────────────────

def load_glossary(path: Path) -> list[dict]:
    if not path.exists():
        print(
            f"NOTE: glossary file not found at {path} — continuing without term hints.",
            file=sys.stderr,
        )
        return []
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def scan_glossary_hits(text: str, glossary: list[dict]) -> list[dict]:
    hits = []
    for entry in glossary:
        term = entry.get("urdu", "").strip()
        if not term:
            continue
        count = text.count(term)
        if count > 0:
            hits.append({**entry, "count": count})
    return sorted(hits, key=lambda h: -h["count"])


def format_glossary_hints(hits: list[dict]) -> str:
    if not hits:
        return ""
    lines = [
        "Sufi terminology found — suggested renderings for the human reviewer:",
        "─" * 70,
    ]
    for h in hits:
        urdu = h.get("urdu", "")
        english = h.get("english", "")
        translit = h.get("transliteration", "")
        category = h.get("category", "")
        notes = h.get("notes", "")
        preferred = translit or english
        note_parts = [p for p in [category, notes] if p]
        note_str = "  (" + "; ".join(note_parts) + ")" if note_parts else ""
        lines.append(f'  {h["count"]:>3}×  “{urdu}” → {preferred}{note_str}')
    lines += [
        "─" * 70,
        "Apply corrections in the translated draft as needed.",
        "Machine translation is a rough first draft — never publish unreviewed.",
        "",
    ]
    return "\n".join(lines)


# ── Text chunking ─────────────────────────────────────────────────────────────

# The paragraph-boundary chunker is shared with process_books.py via _lib.
chunk_text = split_text


# ── NLLB engine ───────────────────────────────────────────────────────────────

def translate_nllb(
    text: str,
    model_id: str,
    src_lang: str,
    tgt_lang: str,
    chunk_chars: int,
) -> tuple[str, str]:
    """Translate with NLLB-200.  Returns (translated_text, model_id)."""
    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        import torch
    except ImportError as exc:
        raise SystemExit(
            f"Missing dependency for NLLB engine: {exc}\n\n"
            "Install with:\n"
            "  pip install transformers sentencepiece\n"
            "  pip install torch --index-url https://download.pytorch.org/whl/cpu\n\n"
            "CPU-only torch is sufficient for the 600M distilled model.\n"
            "Expect ~1–3 min per 3 000-char chunk on CPU; use a GPU for large batches."
        ) from exc

    print(f"  Loading {model_id} (first use downloads ~1.2 GB)")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
    model.eval()

    forced_bos = tokenizer.lang_code_to_id.get(tgt_lang)
    if forced_bos is None:
        # Newer tokenizer API
        forced_bos = tokenizer.convert_tokens_to_ids(tgt_lang)

    chunks = chunk_text(text, chunk_chars)
    out_chunks: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        if len(chunks) > 1:
            print(f"  Chunk {i}/{len(chunks)} ({len(chunk)} chars)")
        tokenizer.src_lang = src_lang
        inputs = tokenizer(
            chunk,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        )
        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                forced_bos_token_id=forced_bos,
                max_length=1024,
                num_beams=4,
                early_stopping=True,
            )
        out_chunks.append(tokenizer.decode(output_ids[0], skip_special_tokens=True))

    return "\n\n".join(out_chunks), model_id


# ── LibreTranslate engine ─────────────────────────────────────────────────────

def translate_libretranslate(
    text: str,
    endpoint: str,
    src_lang: str,
    tgt_lang: str,
    api_key: str,
    timeout: int,
    chunk_chars: int,
) -> tuple[str, str]:
    """Translate with LibreTranslate.  Returns (translated_text, 'LibreTranslate').

    Uses the shared JSON + retry client from _lib (same one process_books.py uses).
    """
    chunks = chunk_text(text, chunk_chars)
    out_chunks: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        if len(chunks) > 1:
            print(f"  Chunk {i}/{len(chunks)} ({len(chunk)} chars)")
        try:
            out_chunks.append(
                libre_translate_chunk(
                    chunk, endpoint, src_lang, tgt_lang, api_key, timeout,
                    retries=DEFAULT_LIBRE_RETRIES,
                )
            )
        except PipelineError as exc:
            raise SystemExit(
                f"LibreTranslate request failed: {exc}\n"
                "Is the container running?  Try:  docker start libretranslate\n"
                "See docs/BOOK_OCR_WORKFLOW.md for setup."
            ) from exc

    return "\n\n".join(out_chunks), "LibreTranslate"


# ── Output helpers ────────────────────────────────────────────────────────────

def build_output_paths(
    input_path: Path,
    output_root: Path,
) -> tuple[Path, Path, Path]:
    """
    Map input path to output paths.

    input:  out/ocr/<book>/p001-p010_20260629_120000_transcribed.txt
    output: out/translations/<book>/p001-p010_20260629_120000_translated.txt
            out/translations/<book>/p001-p010_20260629_120000_provenance.json
            out/translations/<book>/p001-p010_20260629_120000_glossary_hints.txt
    """
    book = input_path.parent.name
    stem = re.sub(r"_transcribed$", "", input_path.stem)
    dest = output_root / book
    dest.mkdir(parents=True, exist_ok=True)
    return (
        dest / f"{stem}_translated.txt",
        dest / f"{stem}_provenance.json",
        dest / f"{stem}_glossary_hints.txt",
    )


def write_provenance(
    path: Path,
    *,
    source_file: Path,
    translated_file: Path,
    engine: str,
    model_label: str,
    src_lang: str,
    tgt_lang: str,
    glossary_file: Path,
    hits: list[dict],
    char_count: int,
    date_iso: str,
) -> None:
    doc = {
        "schema_version": "1.0.0",
        "source_file": str(source_file),
        "translated_file": str(translated_file),
        "method": "mt",
        "engine": engine,
        "model": model_label,
        "source_lang": src_lang,
        "target_lang": tgt_lang,
        "confidence": None,
        "reviewed": False,
        "reviewed_by": None,
        "reviewed_date": None,
        "glossary_file": str(glossary_file),
        "glossary_hits": len(hits),
        "glossary_terms": [
            {
                "urdu": h.get("urdu", ""),
                "preferred_english": h.get("transliteration") or h.get("english", ""),
                "category": h.get("category", ""),
                "count": h["count"],
            }
            for h in hits
        ],
        "char_count": char_count,
        "date": date_iso,
    }
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")


# ── Per-file translation ──────────────────────────────────────────────────────

def translate_file(
    input_path: Path,
    args: argparse.Namespace,
    glossary: list[dict],
) -> bool:
    translated_path, prov_path, hints_path = build_output_paths(
        input_path, Path(args.output_dir)
    )

    print(f"\n[{input_path.name}]")

    text = input_path.read_text(encoding="utf-8")
    if not text.strip():
        print("  Skipped: empty file.")
        return False

    hits = scan_glossary_hits(text, glossary)
    if hits:
        print(f"  Glossary: {len(hits)} distinct term(s), "
              f"{sum(h['count'] for h in hits)} total occurrences")

    if args.dry_run:
        print(f"  Dry run: {len(text)} chars → {translated_path}")
        return False

    print(f"  Translating {len(text)} chars via {args.engine}…")

    if args.engine == "nllb":
        src = "urd_Arab" if args.source_lang == "ur" else args.source_lang
        tgt = "eng_Latn" if args.target_lang == "en" else args.target_lang
        translated, model_label = translate_nllb(
            text, args.model, src, tgt, args.chunk_chars
        )
    else:
        translated, model_label = translate_libretranslate(
            text, args.libre_url, args.source_lang, args.target_lang,
            args.libre_api_key, args.timeout, args.chunk_chars,
        )

    header = (
        "MACHINE TRANSLATION DRAFT — UNREVIEWED — DO NOT PUBLISH\n"
        f"Engine : {args.engine}\n"
        f"Model  : {model_label}\n"
        f"Source : {input_path}\n"
        + "─" * 70 + "\n\n"
    )
    translated_path.write_text(header + translated, encoding="utf-8", newline="\n")
    print(f"  Wrote draft      : {translated_path}")

    date_iso = datetime.now(timezone.utc).isoformat()
    write_provenance(
        prov_path,
        source_file=input_path,
        translated_file=translated_path,
        engine=args.engine,
        model_label=model_label,
        src_lang=args.source_lang,
        tgt_lang=args.target_lang,
        glossary_file=Path(args.glossary),
        hits=hits,
        char_count=len(translated),
        date_iso=date_iso,
    )
    print(f"  Wrote provenance : {prov_path}")

    if hits:
        hints_text = format_glossary_hints(hits)
        hints_path.write_text(hints_text, encoding="utf-8", newline="\n")
        print(f"  Wrote hints      : {hints_path}")

    return True


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="translate.py",
        description=(
            "Batch-translate Urdu OCR output to an English draft.\n"
            "Output is always tagged method=mt, reviewed=false.\n"
            "All drafts must be reviewed by a human before publication."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=r"""
examples:
  # Translate one file (NLLB, runs locally):
  py -3 tools\translate.py out\ocr\AFADA-E-KABIR\p001-p010_20260629_transcribed.txt

  # Translate all transcribed files in a directory:
  py -3 tools\translate.py out\ocr\AFADA-E-KABIR\

  # Use LibreTranslate instead of NLLB:
  py -3 tools\translate.py out\ocr\AFADA-E-KABIR\ --engine libretranslate

  # Larger, higher-quality NLLB model (requires more RAM and time):
  py -3 tools\translate.py out\ocr\AFADA-E-KABIR\ --model facebook/nllb-200-1.3B

  # Preview without translating:
  py -3 tools\translate.py out\ocr\AFADA-E-KABIR\ --dry-run

required pip packages for nllb engine (install once):
  pip install transformers sentencepiece
  pip install torch --index-url https://download.pytorch.org/whl/cpu
""",
    )
    p.add_argument(
        "input",
        help=(
            "Path to a *_transcribed.txt file or a directory. "
            "Directories are searched recursively for *_transcribed.txt."
        ),
    )
    p.add_argument(
        "--engine",
        choices=["nllb", "libretranslate"],
        default="nllb",
        help=(
            "Translation engine. "
            "'nllb' runs facebook/nllb-200-distilled-600M locally (default). "
            "'libretranslate' posts to a running LibreTranslate container."
        ),
    )
    p.add_argument(
        "--model",
        default=DEFAULT_NLLB_MODEL,
        metavar="MODEL_ID",
        help=(
            f"HuggingFace model ID for the nllb engine. "
            f"Default: {DEFAULT_NLLB_MODEL}. "
            "Use facebook/nllb-200-1.3B for higher quality at the cost of speed/RAM."
        ),
    )
    p.add_argument(
        "--libre-url",
        default=DEFAULT_LIBRE_URL,
        metavar="URL",
        help=f"LibreTranslate /translate endpoint URL. Default: {DEFAULT_LIBRE_URL}",
    )
    p.add_argument(
        "--libre-api-key",
        default="",
        metavar="KEY",
        help="LibreTranslate API key (omit for self-hosted instances without auth).",
    )
    p.add_argument(
        "--source-lang",
        default="ur",
        metavar="LANG",
        help=(
            "Source language. BCP-47 for libretranslate (e.g. ur); "
            "FLORES-200 for nllb (urd_Arab is used automatically when 'ur' is set). "
            "Default: ur"
        ),
    )
    p.add_argument(
        "--target-lang",
        default="en",
        metavar="LANG",
        help=(
            "Target language. BCP-47 for libretranslate (e.g. en); "
            "FLORES-200 for nllb (eng_Latn is used automatically when 'en' is set). "
            "Default: en"
        ),
    )
    p.add_argument(
        "--glossary",
        default=str(DEFAULT_GLOSSARY),
        metavar="PATH",
        help=f"Path to the Sufi terminology glossary CSV. Default: {DEFAULT_GLOSSARY}",
    )
    p.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        metavar="DIR",
        help=f"Root directory for translated output. Default: {DEFAULT_OUTPUT_DIR}",
    )
    p.add_argument(
        "--chunk-chars",
        type=int,
        default=DEFAULT_CHUNK_CHARS,
        metavar="N",
        help=(
            f"Max characters per translation chunk (split on paragraph boundaries). "
            f"Default: {DEFAULT_CHUNK_CHARS}"
        ),
    )
    p.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        metavar="SECS",
        help=f"HTTP timeout for the libretranslate engine. Default: {DEFAULT_TIMEOUT}",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Show what would be translated without calling any engine.",
    )
    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    input_path = Path(args.input).expanduser().resolve()

    glossary = load_glossary(Path(args.glossary))
    if glossary:
        print(f"Loaded {len(glossary)} glossary entries from {args.glossary}")

    if input_path.is_dir():
        files = sorted(input_path.rglob("*_transcribed.txt"))
        if not files:
            print(
                f"No *_transcribed.txt files found under {input_path}",
                file=sys.stderr,
            )
            return 1
        print(f"Found {len(files)} file(s) to translate")
    elif input_path.is_file():
        files = [input_path]
    else:
        print(f"Input path not found: {input_path}", file=sys.stderr)
        return 1

    processed = 0
    errors = 0
    for f in files:
        try:
            if translate_file(f, args, glossary):
                processed += 1
        except SystemExit:
            raise
        except Exception as exc:
            print(f"ERROR [{f.name}]: {exc}", file=sys.stderr)
            errors += 1

    print(
        f"\nDone. {processed}/{len(files)} file(s) translated → {args.output_dir}"
        + (f"  ({errors} error(s))" if errors else "")
    )
    return 1 if errors and processed == 0 else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
