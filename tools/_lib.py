"""Shared helpers for the tools/ scripts.

Consolidates boilerplate that used to be copy-pasted across the pipeline
scripts: the UTF-8 stdio shim, repo-root path anchoring, filename
sanitisation, and the LibreTranslate client + text chunker.

Sibling modules in this directory are importable without any sys.path
tweaking when a script is invoked as `python3 tools/<name>.py` — Python puts
the script's own directory at the front of sys.path.
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
OCR_ROOT = REPO_ROOT / "out" / "ocr"

# ── Constants ─────────────────────────────────────────────────────────────────

USER_AGENT = "ShrineBookProcessor/1.0"
DEFAULT_LIBRETRANSLATE_URL = "http://127.0.0.1:5000/translate"

# Characters that are illegal in Windows filenames (ASCII control chars too).
WINDOWS_UNSAFE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


class PipelineError(RuntimeError):
    """Expected, user-facing pipeline failure (bad input, dead service, …)."""


# ── UTF-8 stdio shim ─────────────────────────────────────────────────────────

def utf8_stdio() -> None:
    """Force UTF-8 stdout/stderr (Windows terminals default to cp1252).

    Safe to call more than once and from any platform: streams that already
    speak UTF-8 (macOS/Linux terminals, or a previous call) are left alone.
    """
    for name in ("stdout", "stderr"):
        stream = getattr(sys, name, None)
        if stream is None:
            continue
        encoding = (getattr(stream, "encoding", "") or "").replace("-", "").lower()
        if encoding == "utf8":
            continue  # already UTF-8 — also guards against double-wrapping
        buffer = getattr(stream, "buffer", None)
        if buffer is None:
            continue  # non-standard stream (StringIO under tests, …)
        setattr(
            sys,
            name,
            io.TextIOWrapper(buffer, encoding="utf-8", errors="replace", line_buffering=True),
        )


# ── Filename sanitisation ────────────────────────────────────────────────────

def safe_filename_part(value: object, fallback: str = "book", max_len: int = 0, min_len: int = 1) -> str:
    """Reduce an arbitrary string to a safe ASCII filename fragment.

    Non [A-Za-z0-9._-] runs become single dashes; dash runs collapse; edge
    punctuation is stripped. Optionally truncate to ``max_len`` characters.
    Returns ``fallback`` when fewer than ``min_len`` characters survive.
    """
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", StringValue(value).strip())
    cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-._")
    if max_len > 0:
        cleaned = cleaned[:max_len].rstrip("-._")
    return cleaned if len(cleaned) >= min_len else fallback


# ── Text helpers ─────────────────────────────────────────────────────────────

def StringValue(value: object) -> str:
    return "" if value is None else str(value)


def clean_text(value: object) -> str:
    text = StringValue(value)
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\f", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_text(text: str, max_chars: int) -> list[str]:
    """Split text into <= max_chars chunks on paragraph boundaries.

    Oversized paragraphs are themselves split on word boundaries as a
    fallback, so every returned chunk fits in max_chars.
    """
    value = clean_text(text)
    if not value:
        return []
    if max_chars <= 0 or len(value) <= max_chars:
        return [value]

    chunks: list[str] = []
    current = ""

    def flush_current() -> None:
        nonlocal current
        if current.strip():
            chunks.append(current.strip())
        current = ""

    def split_oversized(piece: str) -> list[str]:
        remaining = piece.strip()
        pieces: list[str] = []
        while len(remaining) > max_chars:
            cut = remaining.rfind(" ", 0, max_chars)
            if cut < int(max_chars * 0.65):
                cut = max_chars
            pieces.append(remaining[:cut].strip())
            remaining = remaining[cut:].strip()
        if remaining:
            pieces.append(remaining)
        return pieces

    paragraphs = re.split(r"\n\s*\n", value)
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        if len(paragraph) > max_chars:
            flush_current()
            chunks.extend(split_oversized(paragraph))
            continue

        candidate = paragraph if not current else f"{current}\n\n{paragraph}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            flush_current()
            current = paragraph

    flush_current()
    return chunks


# ── LibreTranslate client ────────────────────────────────────────────────────

def normalize_translate_endpoint(url: str) -> str:
    cleaned = StringValue(url).strip().rstrip("/")
    if not cleaned:
        return DEFAULT_LIBRETRANSLATE_URL
    if cleaned.endswith("/translate"):
        return cleaned
    return f"{cleaned}/translate"


def libre_translate_chunk(
    text: str,
    endpoint: str,
    source: str,
    target: str,
    api_key: str,
    timeout: int,
    retries: int,
) -> str:
    """Translate one chunk via LibreTranslate (JSON POST, retry with backoff)."""
    payload = {
        "q": text,
        "source": source,
        "target": target,
        "format": "text",
    }
    if api_key:
        payload["api_key"] = api_key

    data = json.dumps(payload).encode("utf-8")
    last_error = None  # type: Exception | None

    for attempt in range(retries + 1):
        request = urllib.request.Request(
            endpoint,
            data=data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            translated = StringValue(parsed.get("translatedText", "")).strip()
            return translated or text
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            last_error = PipelineError(f"LibreTranslate HTTP {exc.code}: {body[:500]}")
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc

        if attempt < retries:
            time.sleep(min(2 ** attempt, 8))

    raise PipelineError(f"Translation failed: {last_error}")


# ── Google Sheets CSV source ─────────────────────────────────────────────────

def load_csv_url() -> str:
    """Return the published Google Sheets CSV URL.

    Priority: the VITE_CSV_URL env var (the same override the JS side uses),
    then the deprecated SHRINES_CSV_URL env var, then data/csv-source.json —
    the single checked-in source of truth. Returns "" when none is available;
    callers should fail with a helpful message only when they actually need it.
    """
    for env_name in ("VITE_CSV_URL", "SHRINES_CSV_URL"):
        value = os.environ.get(env_name, "").strip()
        if value:
            return value
    source = REPO_ROOT / "data" / "csv-source.json"
    try:
        parsed = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ""
    return StringValue(parsed.get("csvUrl", "")).strip()
