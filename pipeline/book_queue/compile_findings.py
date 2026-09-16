#!/usr/bin/env python3
"""Compile the per chunk notes into (a) one findings CSV and (b) per book takeaways stubs.

The notes files (out/ocr/<slug>/chunks/chunk_NNN.notes.md) are written by workers under
TAKEAWAYS_PROTOCOL.md: English bullets grouped under headings, each bullet carrying a page
reference like "(p. 27)" or "(p. 27, folio 15)" and, where the worker could place it, an archive
row id in bold at the head of the bullet.

This script does no interpretation. It parses those bullets into rows so that a human, or a later
consolidation pass, can sort the whole corpus by shrine. Columns:

  shrine_id      archive row id the worker attached, or "" for unplaced material
  shrine_name    resolved from data/shrines.json, so a typo'd id shows up as UNKNOWN
  book_slug      which book
  book_title     short title from the manifest
  section        the notes heading the bullet sat under (Shrines and figures, Practices, Legends …)
  finding        the bullet text, page reference included
  pages          page references pulled out of the bullet, comma separated
  flags          OCR? / illegible / editor-dispute markers found in the bullet
  chunk          source notes file, so any row can be traced back

Usage:  python3 pipeline/book_queue/compile_findings.py [--out data/book_findings.csv]
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
OCR = REPO / "out" / "ocr"

PAGE_RE = re.compile(r"\(pp?\.\s*([0-9,\s–-]+?)(?:,\s*folios?\s*[0-9–,\s-]+)?\)")
ID_RE = re.compile(r"\*\*([a-z0-9][a-z0-9-]{2,})\*\*")
HEAD_RE = re.compile(r"^##+\s*(.+?)\s*$")


def load_names() -> dict[str, str]:
    rows = json.loads((REPO / "data" / "shrines.json").read_text(encoding="utf-8"))
    rows = rows["rows"] if isinstance(rows, dict) and "rows" in rows else rows
    return {r.get("id", ""): r.get("Name", "") for r in rows if r.get("id")}


def load_titles() -> dict[str, str]:
    m = json.loads((REPO / "pipeline" / "book_queue" / "manifest.json").read_text(encoding="utf-8"))
    return {b["slug"]: b["short_title"] for b in m["books"]}


def resolve(i: str, names: dict[str, str]) -> str:
    """Exact id, else a unique prefix match, else "". Workers sometimes shorten a long id
    (shrine-of-jalaluddin-surkh-posh-bukhari for …-bukhari-jalaluddin-bukhari)."""
    if i in names:
        return i
    hits = [k for k in names if k.startswith(i) or i.startswith(k)]
    return hits[0] if len(hits) == 1 else ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/book_findings.csv")
    ap.add_argument("--min-coverage", type=float, default=0.85,
                    help="fail if less than this fraction of the notes text reaches the CSV")
    args = ap.parse_args()
    names, titles = load_names(), load_titles()
    rows, bad_ids = [], set()
    note_chars = captured_chars = 0
    for notes in sorted(OCR.glob("*/chunks/chunk_*.notes.md")):
        slug = notes.parent.parent.name
        body = notes.read_text(encoding="utf-8")
        note_chars += sum(len(l.strip()) for l in body.splitlines() if l.strip())

        # Fold the file into events. A bullet is a "- " line PLUS every continuation line
        # under it, because these notes are hard wrapped at about 100 characters and a
        # bullet routinely runs to six lines. Reading line by line — which this script did
        # until 16 September 2026 — kept only each bullet's first line and silently dropped
        # the rest, which is most of the text: every date, folio and Urdu quotation that
        # happened to wrap was lost, and four consolidation workers reported their input
        # arriving truncated mid-sentence before the cause was found. A blank line or the
        # next bullet or heading closes the bullet. (CLAUDE.md RULE 4: the coverage gate
        # below now fails loudly if this ever regresses.)
        events: list[tuple] = []
        pending_indent: int | None = None
        pending_parts: list[str] = []

        def flush() -> None:
            nonlocal pending_indent, pending_parts
            if pending_indent is not None and pending_parts:
                events.append(("bullet", pending_indent, " ".join(pending_parts).strip()))
            pending_indent, pending_parts = None, []

        for raw_line in body.splitlines():
            h = HEAD_RE.match(raw_line)
            if h:
                flush()
                events.append(("head", raw_line, h.group(1)))
                continue
            stripped = raw_line.lstrip()
            if not stripped:
                flush()
                continue
            if stripped.startswith(("-", "*")):
                flush()
                pending_indent = len(raw_line) - len(stripped)
                pending_parts = [stripped.lstrip("-*").strip()]
                continue
            if pending_indent is not None:
                pending_parts.append(stripped)
        flush()

        section, current = "", ""
        for ev in events:
            if ev[0] == "head":
                raw_line, section = ev[1], ev[2]
                # A "### <id> — <name>" heading pins the shrine for what follows; any other
                # heading clears it, so a Practices bullet is never misattributed.
                found = [r for r in (resolve(i, names) for i in ID_RE.findall(section)) if r]
                current = found[0] if (raw_line.startswith("###") and found) else ""
                continue
            _, indent, text = ev
            if len(text) < 15:
                continue
            captured_chars += len(text)
            explicit = [r for r in (resolve(i, names) for i in ID_RE.findall(text)) if r]
            for i in ID_RE.findall(text):
                if "-" in i and not resolve(i, names):
                    bad_ids.add(i)
            if explicit:
                sid = explicit[0]
                # A top level bullet naming a shrine sets the context for its nested bullets.
                if indent == 0:
                    current = sid
            else:
                # Nested bullets inherit; a new top level bullet with no id in the archive
                # section ends the previous shrine's run.
                sid = current if indent > 0 else ""
                if indent == 0:
                    current = ""
            pages = ",".join(pp.strip() for pp in PAGE_RE.findall(text))
            flags = " ".join(f for f in ("[OCR?]", "[illegible", "غلط", "disput", "editor") if f in text)
            rows.append({
                "shrine_id": sid,
                "shrine_name": names.get(sid, "") if sid else "",
                "book_slug": slug,
                "book_title": titles.get(slug, slug),
                "section": section,
                "level": indent // 2,
                "finding": text,
                "pages": pages,
                "flags": flags,
                "chunk": notes.name,
            })

    out = REPO / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    cols = ["shrine_id","shrine_name","book_slug","book_title","section","level","finding","pages","flags","chunk"]
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["shrine_id"] == "", r["shrine_id"], r["book_slug"], r["chunk"])))
    placed = [r for r in rows if r["shrine_id"]]
    per_shrine: dict[str, int] = {}
    for r in placed:
        per_shrine[r["shrine_id"]] = per_shrine.get(r["shrine_id"], 0) + 1
    books = sorted(set(r["book_slug"] for r in rows))
    print(f"{out.relative_to(REPO)}: {len(rows)} findings from {len(books)} book(s): {', '.join(books)}")
    print(f"  attached to an archive row: {len(placed)} ({len(placed)/max(len(rows),1):.0%}) across {len(per_shrine)} shrines")
    print(f"  cross cutting or not in the archive: {len(rows)-len(placed)}")
    coverage = captured_chars / max(note_chars, 1)
    print(f"  text captured from the notes files: {coverage:.0%} "
          f"({captured_chars:,} of {note_chars:,} non-blank characters)")
    if coverage < args.min_coverage:
        print(f"  FAIL: coverage {coverage:.0%} is below --min-coverage {args.min_coverage:.0%}. "
              f"A bullet's continuation lines are being dropped again; see the fold loop above.")
        return 1
    if bad_ids:
        print(f"  ids that resolve to no archive row: {sorted(bad_ids)[:10]}")
    for sid, n in sorted(per_shrine.items(), key=lambda kv: -kv[1])[:14]:
        print(f"    {n:4d}  {sid}  {names.get(sid,'')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
