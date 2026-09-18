#!/usr/bin/env python3
"""Resolve a queued book's source file by CONTENT, not by the path state.json records.

Why this exists (measured 18 September 2026, HANDOVER §9.202a): **34 of the 42 books have a
`pdf_path` in state.json that points at a file which does not exist.** Only 8 resolve. The recorded
paths are all of the form `books/<slug>.pdf`; the files actually live under
`books/incoming-2026-09-11/` and `books/incoming-2026-09-11-english/` under their original
download names, and `books/renames.json` does not map the slugs. Nothing is lost — every one of the
34 was located by size + head-hash — but the runbook's resume step 3 tells a fresh session to look
for `books/<file>.pdf` and stage it if missing, which on 34 books sends you hunting for a file that
was never there. Identify the source by hash, not by the recorded path.

Second trap this encodes: `pdf_sha256_head` is **not** a hash of the whole file. It is sha256 of the
**first 1 MB**, truncated to 16 hex chars (`queue.py:256`, `sha256_head(p, mb=1)`). A whole-file
`shasum -a 256 | cut -c1-16` disagrees with the recorded value and looks exactly like the runbook's
stop-and-ask condition ("a different file means a different upload"), with the byte count matching
to the byte — a false alarm that is more convincing than a real one. Use `head_hash()` below.

Usage:

    resolve_pdf.py                  audit every book; prints a table; EXIT 1 if any path is stale
    resolve_pdf.py --slug SLUG      print the resolved path for one book; EXIT 1 if unresolvable
    resolve_pdf.py --fix            rewrite the stale pdf_path values that were resolved by hash
    resolve_pdf.py --json           machine-readable audit

`--fix` writes a timestamped backup beside state.json first, only touches `pdf_path`, and refuses to
run if any book holds an active lease (another session may be mid-batch — two scheduled runs landed
on 18 September without knowing about each other, see §9.202).
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
STATE = HERE / "state.json"
BOOKS = REPO / "books"
SUFFIXES = (".pdf", ".epub")


def head_hash(path: Path, mb: int = 1) -> str:
    """Identical to queue.py:256 sha256_head(). Hash of the FIRST mb megabytes, 16 hex chars."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        h.update(f.read(mb * 1024 * 1024))
    return h.hexdigest()[:16]


def load_state() -> tuple[dict, dict]:
    state = json.loads(STATE.read_text(encoding="utf-8"))
    books = state["books"] if isinstance(state, dict) and "books" in state else state
    return state, books


def index_by_size(root: Path) -> dict[int, list[Path]]:
    """Every candidate source file under books/, bucketed by byte size (the cheap discriminator)."""
    idx: dict[int, list[Path]] = {}
    for dirpath, _dirnames, filenames in os.walk(root):
        for fn in filenames:
            if not fn.lower().endswith(SUFFIXES):
                continue
            fp = Path(dirpath) / fn
            try:
                idx.setdefault(fp.stat().st_size, []).append(fp)
            except OSError:
                continue
    return idx


def resolve_one(book: dict, idx: dict[int, list[Path]]) -> tuple[str, Path | None]:
    """Return (status, path). status is 'ok' | 'relocated' | 'stale-unresolved' | 'no-path'.

    'ok' means the recorded path exists AND its hash matches. A recorded path that exists but whose
    hash disagrees is NOT ok: that is the runbook's real stop-and-ask case, reported as 'CONFLICT'.
    """
    recorded = book.get("pdf_path")
    if not recorded:
        return "no-path", None
    want_hash = book.get("pdf_sha256_head")
    want_bytes = book.get("pdf_bytes")

    p = REPO / recorded
    if p.exists():
        if want_hash and head_hash(p) != want_hash:
            return "CONFLICT", p
        return "ok", p

    for cand in idx.get(want_bytes or -1, []):
        try:
            if want_hash and head_hash(cand) == want_hash:
                return "relocated", cand
        except OSError:
            continue
    return "stale-unresolved", None


def audit(books: dict, idx: dict[int, list[Path]]) -> list[tuple[str, str, str, Path | None]]:
    rows = []
    for slug, book in sorted(books.items()):
        status, path = resolve_one(book, idx)
        rows.append((slug, status, book.get("pdf_path") or "", path))
    return rows


def rel(p: Path | None) -> str:
    if p is None:
        return ""
    try:
        return str(p.relative_to(REPO))
    except ValueError:
        return str(p)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", help="resolve one book and print its path")
    ap.add_argument("--fix", action="store_true", help="rewrite stale pdf_path values in state.json")
    ap.add_argument("--json", action="store_true", dest="as_json")
    args = ap.parse_args()

    if not STATE.exists():
        print(f"no state.json at {STATE}", file=sys.stderr)
        return 2
    state, books = load_state()
    idx = index_by_size(BOOKS)

    if args.slug:
        if args.slug not in books:
            print(f"unknown slug: {args.slug}", file=sys.stderr)
            return 2
        status, path = resolve_one(books[args.slug], idx)
        if status == "CONFLICT":
            print(f"CONFLICT: {rel(path)} exists but its head-hash does not match state.json. "
                  f"A different file means a different upload — stop and ask.", file=sys.stderr)
            return 1
        if path is None:
            print(f"unresolved: {args.slug} (recorded {books[args.slug].get('pdf_path')})", file=sys.stderr)
            return 1
        print(rel(path))
        return 0

    rows = audit(books, idx)
    counts: dict[str, int] = {}
    for _slug, status, _rec, _path in rows:
        counts[status] = counts.get(status, 0) + 1

    if args.as_json:
        print(json.dumps(
            {"counts": counts,
             "books": [{"slug": s, "status": st, "recorded": rc, "resolved": rel(p)}
                       for s, st, rc, p in rows]},
            indent=2))
    else:
        width = max((len(s) for s, *_ in rows), default=4)
        for slug, status, recorded, path in rows:
            if status == "ok":
                continue
            print(f"{slug:<{width}}  {status}")
            print(f"{'':<{width}}    recorded: {recorded}")
            print(f"{'':<{width}}    actual  : {rel(path) or 'NOT FOUND by size+hash'}")
        print()
        print("  ".join(f"{k}={v}" for k, v in sorted(counts.items())))

    if args.fix:
        leased = [s for s, b in books.items() if b.get("leases")]
        if leased:
            print(f"refusing --fix: active leases on {', '.join(sorted(leased))}. "
                  f"Another session may be mid-batch; sweep-leases or wait.", file=sys.stderr)
            return 2
        if any(st == "CONFLICT" for _s, st, _r, _p in rows):
            print("refusing --fix: at least one CONFLICT. Resolve that by hand first.", file=sys.stderr)
            return 2
        changed = 0
        for slug, status, _recorded, path in rows:
            if status == "relocated" and path is not None:
                books[slug]["pdf_path"] = rel(path)
                changed += 1
        if changed:
            stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d_%H%M%S")
            backup = STATE.with_name(f"state.json.bak-{stamp}")
            shutil.copy2(STATE, backup)
            STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"rewrote {changed} pdf_path values; backup at {rel(backup)}")
        else:
            print("nothing to fix")
        return 0

    stale = counts.get("relocated", 0) + counts.get("stale-unresolved", 0) + counts.get("CONFLICT", 0)
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
