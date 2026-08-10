#!/usr/bin/env python3
"""Swap Drive image links in a shrines TSV for github.io URLs, once the files exist.

Drive links are a stopgap: they hotlink badly and Drive throttles them. Once
tools/fetch_shrine_photos.py has pulled the images into public/photos/<slug>/,
run this to rewrite the Image columns to the project's canonical URLs.

    python3 tools/swap_photo_urls.py shrines_updated_2026-08-09.tsv
    python3 tools/swap_photo_urls.py shrines_updated_2026-08-09.tsv --dry-run

Only rewrites a cell when the corresponding file is actually present on disk, so
it is safe to run early and re-run later.
"""
from __future__ import annotations

import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "new-photos-manifest.json"
BASE = "https://raufnawaz.github.io/Sufi-Shrines"

csv.field_size_limit(10**9)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    dry = "--dry-run" in sys.argv
    if not args:
        sys.exit(__doc__)
    path = pathlib.Path(args[0])
    if not path.is_absolute():
        path = ROOT / path
    if not MANIFEST.exists():
        sys.exit(f"missing {MANIFEST}")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    # drive id -> canonical url, but only for images that exist on disk
    lookup: dict[str, str] = {}
    missing = 0
    for slug, entry in manifest.items():
        for photo in entry["photos"]:
            if (ROOT / photo["target"]).exists():
                lookup[photo["drive_id"]] = photo["url"]
            else:
                missing += 1

    rows = list(csv.reader(path.open(encoding="utf-8"), delimiter="\t"))
    header, data = rows[0], rows[1:]
    img_cols = [i for i, h in enumerate(header) if h.startswith("Image ")]

    swapped = 0
    for row in data:
        for i in img_cols:
            if i >= len(row):
                continue
            cell = row[i]
            if "drive.google.com" not in cell:
                continue
            drive_id = cell.rsplit("id=", 1)[-1].split("&")[0]
            if drive_id in lookup:
                row[i] = lookup[drive_id]
                swapped += 1

    print(f"swapped {swapped} link(s); {missing} image(s) not yet on disk")
    if dry:
        print("dry run — nothing written")
        return 0
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh, delimiter="\t", quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
        writer.writerow(header)
        writer.writerows(data)
    print(f"wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
