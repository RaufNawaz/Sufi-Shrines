#!/usr/bin/env python3
"""
tools/ocr_postcorrect.py — OCR post-correction and confidence scoring for Urdu Nastaliq.

Reads *_transcribed.txt files produced by process_books.py and applies:
  1. Rule-based corrections (always on, no deps): NFC normalisation, stray
     tatweel removal, whitespace normalisation, Urdu punctuation spacing.
  2. Optional LLM correction via a local Ollama server (--ollama-url).
  3. Per-paragraph confidence scoring (fraction of valid Urdu/Arabic chars).

Output per input file:
  out/ocr_corrected/<book>/<stem>_corrected.txt      post-corrected draft
  out/ocr_corrected/<book>/<stem>_provenance.json    method, confidence, flags
  out/ocr_corrected/<book>/<stem>_diff.txt           unified diff vs. raw OCR

All output is tagged reviewed=false.  Low-confidence paragraphs are flagged
in provenance.  Never publish unreviewed OCR output.

Evaluate against gold samples with:
  py -3 eval/ocr/run_cer.py --help
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

# Shared helpers (sibling module — importable when run as python3 tools/ocr_postcorrect.py).
from _lib import REPO_ROOT, utf8_stdio

utf8_stdio()

# Anchored to the repo root so the default works from any cwd (--output-dir overrides).
DEFAULT_OUTPUT_DIR = REPO_ROOT / "out" / "ocr_corrected"
DEFAULT_MIN_CONFIDENCE = 0.70
DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
DEFAULT_OLLAMA_MODEL = "aya:8b"
DEFAULT_LLM_TIMEOUT = 120
DEFAULT_CHUNK_CHARS = 2000

# ── Confidence scoring ────────────────────────────────────────────────────────

# Unicode ranges that contain valid Urdu/Arabic script characters.
_URDU_RANGES: tuple[range, ...] = (
    range(0x0600, 0x0700),  # Arabic
    range(0x0750, 0x0780),  # Arabic Supplement
    range(0x08A0, 0x0900),  # Arabic Extended-A
    range(0xFB50, 0xFE00),  # Arabic Presentation Forms-A
    range(0xFE70, 0xFF00),  # Arabic Presentation Forms-B
)

# Non-Urdu characters that are legitimately expected in OCR'd Urdu text.
_EXPECTED: frozenset[str] = frozenset(
    "،؟!۔٫؛()[]{}«»\"""''،.-:;/\\0123456789٠١٢٣٤٥٦٧٨٩‌‍‏۔"
)


def _is_urdu_char(c: str) -> bool:
    cp = ord(c)
    return any(cp in r for r in _URDU_RANGES)


def score_block(text: str) -> float:
    """Return 0.0–1.0 confidence that this paragraph is clean Urdu OCR text."""
    non_ws = [c for c in text if not c.isspace()]
    if not non_ws:
        return 1.0
    ok = sum(1 for c in non_ws if _is_urdu_char(c) or c in _EXPECTED or c.isdigit())
    return ok / len(non_ws)


def score_document(text: str) -> dict:
    """Compute per-block and aggregate confidence scores for the whole document."""
    blocks = [b for b in re.split(r"\n{2,}", text) if b.strip()]
    if not blocks:
        return {"mean": 1.0, "min": 1.0, "low_count": 0, "total": 0, "blocks": []}

    block_scores = [score_block(b) for b in blocks]
    low = sum(1 for s in block_scores if s < DEFAULT_MIN_CONFIDENCE)
    mean_conf = sum(block_scores) / len(block_scores)
    return {
        "mean": round(mean_conf, 4),
        "min": round(min(block_scores), 4),
        "low_count": low,
        "total": len(blocks),
        "blocks": [
            {
                "index": i,
                "confidence": round(s, 4),
                "char_count": len(blocks[i]),
                **({"flag": "low_confidence"} if s < DEFAULT_MIN_CONFIDENCE else {}),
            }
            for i, s in enumerate(block_scores)
        ],
    }


# ── Rule-based corrections ────────────────────────────────────────────────────

# Tatweel (U+0640) at word boundaries is an OCR artifact.
# Keep it mid-word (intentional elongation); strip it when isolated or edge-only.
_TATWEEL_BOUNDARY = re.compile(
    r"(?<!\S)ـ+|"        # tatweel after whitespace / start of line
    r"ـ+(?!\S)|"         # tatweel before whitespace / end of line
    r"(?<!\w)ـ+(?!\w)"   # tatweel surrounded by non-word chars
)

# Urdu terminal punctuation that should not have a space before it.
_PUNC_SPACE_BEFORE = re.compile(r" +([،؛؟۔،؟!۔])")

# Collapse 3+ consecutive blank lines to exactly two.
_EXCESS_BLANK = re.compile(r"\n{4,}")


def apply_rules(text: str) -> str:
    """Apply conservative rule-based corrections. Returns corrected text."""
    # 1. Strip BOM and ASCII control chars except newline/tab.
    text = text.lstrip("﻿")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # 2. NFC normalisation (safe for Arabic — composes but does not decompose).
    text = unicodedata.normalize("NFC", text)

    # 3. Remove stray tatweel at word boundaries.
    text = _TATWEEL_BOUNDARY.sub("", text)

    # 4. Remove space before Urdu punctuation.
    text = _PUNC_SPACE_BEFORE.sub(r"\1", text)

    # 5. Collapse runs of spaces within a line to one space.
    text = re.sub(r"[^\S\n]+", " ", text)

    # 6. Trim trailing whitespace on each line.
    text = "\n".join(line.rstrip() for line in text.splitlines())

    # 7. Collapse 4+ blank lines to 2.
    text = _EXCESS_BLANK.sub("\n\n\n", text)

    return text.strip()


# ── LLM correction via Ollama ─────────────────────────────────────────────────

_LLM_PROMPT_TEMPLATE = (
    "You are an expert Urdu manuscript editor. "
    "The following text was produced by an OCR system scanning Nastaliq-script pages "
    "and may contain errors: wrong dots (nuqat), character confusion, word-boundary problems.\n\n"
    "Rules:\n"
    "- Fix OCR errors only. Do not change meaning, style, or wording.\n"
    "- Keep all proper names, honorifics, and religious terms exactly as-is.\n"
    "- Return ONLY the corrected Urdu text. No explanations, no English.\n\n"
    "Text:\n{text}"
)


def _chunk_text(text: str, max_chars: int) -> list[str]:
    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for para in paragraphs:
        if current and current_len + len(para) + 2 > max_chars:
            chunks.append("\n\n".join(current))
            current = []
            current_len = 0
        current.append(para)
        current_len += len(para) + 2
    if current:
        chunks.append("\n\n".join(current))
    return chunks or [text]


def correct_with_ollama(
    text: str,
    url: str,
    model: str,
    timeout: int,
    chunk_chars: int,
) -> str:
    """Send text to a local Ollama instance for LLM correction."""
    import urllib.error
    import urllib.request

    chunks = _chunk_text(text, chunk_chars)
    corrected_chunks: list[str] = []

    for i, chunk in enumerate(chunks, 1):
        if len(chunks) > 1:
            print(f"    LLM chunk {i}/{len(chunks)} ({len(chunk)} chars)")
        prompt = _LLM_PROMPT_TEMPLATE.format(text=chunk)
        payload = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode()
        req = urllib.request.Request(url, data=payload, method="POST")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                result = json.loads(resp.read())
        except urllib.error.URLError as exc:
            raise SystemExit(
                f"Ollama request failed: {exc}\n"
                "Is Ollama running?  ollama serve\n"
                f"Is the model pulled?  ollama pull {model}"
            ) from exc
        corrected_chunks.append(result.get("response", chunk).strip())

    return "\n\n".join(corrected_chunks)


# ── Output helpers ────────────────────────────────────────────────────────────

def build_output_paths(input_path: Path, output_root: Path) -> tuple[Path, Path, Path]:
    """
    Map input path to output paths.

    input:  out/ocr/<book>/p001-p010_..._transcribed.txt
    output: out/ocr_corrected/<book>/p001-p010_..._corrected.txt
            out/ocr_corrected/<book>/p001-p010_..._provenance.json
            out/ocr_corrected/<book>/p001-p010_..._diff.txt
    """
    book = input_path.parent.name
    stem = re.sub(r"_transcribed$", "", input_path.stem)
    dest = output_root / book
    dest.mkdir(parents=True, exist_ok=True)
    return (
        dest / f"{stem}_corrected.txt",
        dest / f"{stem}_provenance.json",
        dest / f"{stem}_diff.txt",
    )


def write_provenance(
    path: Path,
    *,
    source_file: Path,
    corrected_file: Path,
    rules_applied: bool,
    llm_engine: str | None,
    llm_model: str | None,
    confidence: dict,
    date_iso: str,
) -> None:
    doc = {
        "schema_version": "1.0.0",
        "source_file": str(source_file),
        "corrected_file": str(corrected_file),
        "method": "ocr+postcorrect",
        "rules_applied": rules_applied,
        "llm_engine": llm_engine,
        "llm_model": llm_model,
        "reviewed": False,
        "reviewed_by": None,
        "reviewed_date": None,
        "confidence": {
            "mean": confidence["mean"],
            "min": confidence["min"],
            "low_confidence_blocks": confidence["low_count"],
            "total_blocks": confidence["total"],
            "threshold": DEFAULT_MIN_CONFIDENCE,
        },
        "blocks": confidence["blocks"],
        "date": date_iso,
    }
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")


def write_diff(path: Path, original: str, corrected: str, label: str) -> int:
    """Write a unified diff. Returns the number of changed lines."""
    orig_lines = original.splitlines(keepends=True)
    corr_lines = corrected.splitlines(keepends=True)
    diff = list(
        difflib.unified_diff(
            orig_lines,
            corr_lines,
            fromfile=f"{label} (raw OCR)",
            tofile=f"{label} (post-corrected)",
            lineterm="",
        )
    )
    changed = sum(1 for l in diff if l.startswith(("+", "-")) and not l.startswith(("+++", "---")))
    if diff:
        path.write_text("\n".join(diff), encoding="utf-8", newline="\n")
    else:
        path.write_text("(no changes)\n", encoding="utf-8", newline="\n")
    return changed


# ── Per-file processing ───────────────────────────────────────────────────────

def postcorrect_file(
    input_path: Path,
    args: argparse.Namespace,
) -> bool:
    corrected_path, prov_path, diff_path = build_output_paths(
        input_path, Path(args.output_dir)
    )

    print(f"\n[{input_path.name}]")

    raw_text = input_path.read_text(encoding="utf-8")
    if not raw_text.strip():
        print("  Skipped: empty file.")
        return False

    if args.dry_run:
        pre_conf = score_document(raw_text)
        print(
            f"  Dry run: {len(raw_text)} chars, "
            f"confidence mean={pre_conf['mean']:.2f} min={pre_conf['min']:.2f}, "
            f"{pre_conf['low_count']}/{pre_conf['total']} low-confidence blocks"
        )
        return False

    # Step 1: rule-based correction.
    text = apply_rules(raw_text)
    rule_changes = sum(1 for a, b in zip(raw_text.splitlines(), text.splitlines()) if a != b)
    print(f"  Rules: {rule_changes} line(s) changed")

    # Step 2: optional LLM correction.
    llm_engine = None
    llm_model = None
    if args.ollama_url:
        llm_model = args.ollama_model
        llm_engine = "ollama"
        print(f"  LLM: {llm_model} via {args.ollama_url}")
        text = correct_with_ollama(
            text, args.ollama_url, llm_model, args.llm_timeout, args.chunk_chars
        )

    # Step 3: confidence scoring.
    conf = score_document(text)
    print(
        f"  Confidence: mean={conf['mean']:.2f} min={conf['min']:.2f}, "
        f"{conf['low_count']}/{conf['total']} low-confidence block(s)"
    )
    if conf["low_count"]:
        low_idx = [b["index"] for b in conf["blocks"] if "flag" in b]
        print(f"  Low-confidence paragraphs: {low_idx}")

    # Write outputs.
    corrected_path.write_text(text, encoding="utf-8", newline="\n")
    print(f"  Wrote corrected : {corrected_path}")

    changed_lines = write_diff(diff_path, raw_text, text, input_path.name)
    print(f"  Wrote diff      : {diff_path}  ({changed_lines} changed line(s))")

    write_provenance(
        prov_path,
        source_file=input_path,
        corrected_file=corrected_path,
        rules_applied=True,
        llm_engine=llm_engine,
        llm_model=llm_model,
        confidence=conf,
        date_iso=datetime.now(timezone.utc).isoformat(),
    )
    print(f"  Wrote provenance: {prov_path}")

    return True


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="ocr_postcorrect.py",
        description=(
            "Post-correct Urdu OCR output and score confidence per paragraph.\n"
            "All output is tagged reviewed=false and must be reviewed before publication."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=r"""
examples:
  # Rule-based correction only (no extra deps):
  py -3 tools\ocr_postcorrect.py out\ocr\AFADA-E-KABIR\

  # Add LLM correction via a local Ollama server:
  py -3 tools\ocr_postcorrect.py out\ocr\AFADA-E-KABIR\ --ollama-url http://127.0.0.1:11434/api/generate

  # Preview confidence scores without writing output:
  py -3 tools\ocr_postcorrect.py out\ocr\AFADA-E-KABIR\ --dry-run

  # Evaluate against gold samples:
  py -3 eval\ocr\run_cer.py --help

required for LLM correction (one-time setup):
  winget install Ollama.Ollama
  ollama pull aya:8b
  ollama serve
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
        "--ollama-url",
        default="",
        metavar="URL",
        help=(
            "Ollama generate endpoint. If set, an LLM correction pass is applied "
            f"after rule-based correction. Example: {DEFAULT_OLLAMA_URL}"
        ),
    )
    p.add_argument(
        "--ollama-model",
        default=DEFAULT_OLLAMA_MODEL,
        metavar="MODEL",
        help=(
            f"Ollama model name. Default: {DEFAULT_OLLAMA_MODEL}. "
            "Must support Urdu script. See: https://ollama.com/library"
        ),
    )
    p.add_argument(
        "--llm-timeout",
        type=int,
        default=DEFAULT_LLM_TIMEOUT,
        metavar="SECS",
        help=f"HTTP timeout per LLM chunk. Default: {DEFAULT_LLM_TIMEOUT}",
    )
    p.add_argument(
        "--chunk-chars",
        type=int,
        default=DEFAULT_CHUNK_CHARS,
        metavar="N",
        help=f"Max chars per LLM correction chunk. Default: {DEFAULT_CHUNK_CHARS}",
    )
    p.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        metavar="DIR",
        help=f"Root output directory. Default: {DEFAULT_OUTPUT_DIR}",
    )
    p.add_argument(
        "--min-confidence",
        type=float,
        default=DEFAULT_MIN_CONFIDENCE,
        metavar="FLOAT",
        help=f"Confidence threshold below which a block is flagged. Default: {DEFAULT_MIN_CONFIDENCE}",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Print confidence stats without writing any output.",
    )
    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    input_path = Path(args.input).expanduser().resolve()

    if input_path.is_dir():
        files = sorted(input_path.rglob("*_transcribed.txt"))
        if not files:
            print(f"No *_transcribed.txt files under {input_path}", file=sys.stderr)
            return 1
        print(f"Found {len(files)} file(s)")
    elif input_path.is_file():
        files = [input_path]
    else:
        print(f"Input not found: {input_path}", file=sys.stderr)
        return 1

    processed = 0
    errors = 0
    for f in files:
        try:
            if postcorrect_file(f, args):
                processed += 1
        except SystemExit:
            raise
        except Exception as exc:
            print(f"ERROR [{f.name}]: {exc}", file=sys.stderr)
            errors += 1

    print(
        f"\nDone. {processed}/{len(files)} file(s) processed → {args.output_dir}"
        + (f"  ({errors} error(s))" if errors else "")
    )
    return 1 if errors and processed == 0 else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
