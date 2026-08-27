#!/usr/bin/env python3
"""
Build a full-sheet CSV for import: the live sheet, plus the patches that are
still pending against it.

## Why this exists

The Google Sheet is production (RULE 3): a cell edit deploys instantly, with no
review step. So a patch is prepared here, checked here, and imported by a human
with "Replace current sheet". The failure this script exists to prevent is the
one that has actually happened to this project: a partial patch file gets
imported with "Replace current sheet" and silently deletes every row and column
the patch did not carry. This writes the **whole sheet**, so Replace is safe.

## What it does

1. Reads a live-sheet CSV export (fetched, not guessed).
2. Applies each patch file's non-empty cells, joined on `Name`.
3. Refuses to write if any invariant fails (RULE 4 — a check that exits
   non-zero, not a note saying be careful).

## The invariants

- Row and column count must not fall. A patch may not lose a row; the two rows
  the app drops for having no coordinates are still rows of the sheet and must
  survive the round trip.
- Every column of the live export must appear in the output, in the live order.
- No Description may lose its newlines. `Description` carries meaningful
  markdown, and Sheets' TSV export silently strips newlines inside cells — this
  refuses to write output that has already lost them.
- Asterisks in Description must be balanced, the check that has caught real
  corruption before.
- A patch's own `Name` must exist in the live sheet. A typo'd name would
  otherwise be a silently skipped fix.
- Nothing is invented: only cells the patch states non-empty are changed, and
  the script reports every one it changed.

Usage:
    python3 pipeline/build_import_csv.py LIVE.csv OUT.csv PATCH.csv [PATCH2.csv ...]
"""

import csv
import re
import sys
from pathlib import Path

# Sheets' own limit is far higher; the Descriptions here run past csv's default.
csv.field_size_limit(10_000_000)


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or []), list(reader)


def fail(message):
    print(f"[build-import] FAIL — {message}", file=sys.stderr)
    sys.exit(1)


def main(argv):
    if len(argv) < 4:
        fail("usage: build_import_csv.py LIVE.csv OUT.csv PATCH.csv [...]")

    live_path, out_path, patch_paths = argv[1], argv[2], argv[3:]
    columns, rows = read_csv(live_path)
    print(f"[build-import] live: {len(rows)} rows x {len(columns)} cols ({live_path})")

    by_name = {}
    for row in rows:
        name = (row.get("Name") or "").strip()
        if not name:
            fail("a live row has no Name — Name is the join key for every patch")
        if name in by_name:
            fail(f"duplicate Name in the live sheet: {name!r} — the join key is not unique")
        by_name[name] = row

    changes = []
    for patch_path in patch_paths:
        patch_columns, patch_rows = read_csv(patch_path)
        unknown = [c for c in patch_columns if c not in columns]
        if unknown:
            fail(f"{patch_path} carries columns the sheet does not have: {unknown}")
        for patch_row in patch_rows:
            name = (patch_row.get("Name") or "").strip()
            if name not in by_name:
                fail(f"{patch_path} patches {name!r}, which is not in the live sheet")
            target = by_name[name]
            for column in patch_columns:
                if column == "Name":
                    continue
                value = patch_row.get(column)
                # Only stated cells change. An empty patch cell means "not
                # addressed by this patch", never "clear this value".
                if value is None or not value.strip():
                    continue
                before = (target.get(column) or "").strip()
                after = value.strip()
                if before == after:
                    continue
                target[column] = after
                changes.append((Path(patch_path).name, name, column, before, after))

    # ── Invariants (RULE 4) ──────────────────────────────────────────────────
    if len(rows) != len(by_name):
        fail("row count changed while applying patches")

    single_paragraph = []
    for row in rows:
        name = (row.get("Name") or "").strip()
        description = row.get("Description") or ""

        # The newline-stripping corruption, detected by its signature rather
        # than by length.
        #
        # The first version of this check failed any Description over 400 chars
        # with no newline, and the live sheet has exactly one: Sant Baba
        # Asudaram Darbar, 1,339 characters of genuine single-paragraph prose
        # with no headings, no list items and no bibliography — the one entry
        # the archive's standing findings name as citing nothing. The content
        # was right and the check was wrong, which is the trap RULE 4 names
        # explicitly: do not edit content to satisfy a failing check.
        #
        # What can only be corruption is a *line-start* marker in a cell with
        # no lines. `## History` or a `- ` bibliography item exists only at the
        # beginning of a line, so finding one mid-string means the newlines that
        # put it there are gone.
        if "\n" not in description and ("##" in description or " - " in description):
            fail(f"{name}: Description has markdown markers but no newlines — markdown lost")
        if len(description) > 400 and "\n" not in description:
            single_paragraph.append(name)

        if description.count("*") % 2 != 0:
            fail(f"{name}: unbalanced asterisks in Description ({description.count('*')})")

    # Internal notes must not sit in a public column — and the check has to know
    # what an internal note actually is.
    #
    # The first version matched the surveyor's name anywhere in Location,
    # Description or Events, and flagged 17 rows. Sixteen of them were correct
    # provenance: "Shrines Project field survey, Darbar Ghazi Ilm Din Shaheed
    # responses (surveyor: Saifullah), 2026" is a citation, and an archive whose
    # distinguishing claim is provenance must name its surveyor. What is not
    # public is an *instruction to the team* — the imperative, and the `FLAG:`
    # workflow marker.
    internal = re.compile(r"\bask\s+saifullah\b|(?:^|[\s—-])FLAG:", re.IGNORECASE)
    leaked = [
        (row.get("Name"), column)
        for row in rows
        for column in ("Location", "Description", "Events")
        if internal.search(row.get(column) or "")
    ]
    if leaked:
        fail(f"an instruction to the team is still in a public column: {leaked}")

    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for row in rows:
            writer.writerow({c: row.get(c, "") for c in columns})

    print(f"[build-import] wrote {out_path}: {len(rows)} rows x {len(columns)} cols")
    if single_paragraph:
        # Reported, not failed: unstructured prose is a content state the
        # archive knows about, not a corruption.
        print(f"[build-import] note — {len(single_paragraph)} long Description(s) carry no")
        print("[build-import]      headings or bibliography at all: " + ", ".join(single_paragraph))
    print(f"[build-import] {len(changes)} cell(s) changed:")
    for patch, name, column, before, after in changes:
        shorten = lambda s: (s[:70] + "…") if len(s) > 70 else s
        print(f"  · {name} · {column}   [{patch}]")
        print(f"      was: {shorten(before)!r}")
        print(f"      now: {shorten(after)!r}")
    print("[build-import] OK — import with: Replace current sheet, comma separator,")
    print("[build-import]      'Convert text to numbers, dates and formulas' OFF (RULE 3).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
