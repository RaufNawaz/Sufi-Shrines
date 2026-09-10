#!/usr/bin/env python3
"""Fetch the COMPLETE OCR text of an archive.org scan, and search it locally.

Why this exists (measured 5 September 2026, and it invalidated three agents'
conclusions in one session):

  1. **The obvious URL is wrong for many items.** The pattern every previous
     session used, `archive.org/download/<id>/<id>_djvu.txt`, only works when the
     item's text file happens to be named after the identifier. For
     `furg-sikh-shrines-in-west-pakistan-by-khan-mohammad-wal` the text file is
     named after the *scanned file* — a 96-character title — so the obvious URL
     returns a 146-byte nginx **404 page**, which a careless reader will treat as
     "the book has no text layer". `https://archive.org/metadata/<id>` lists the
     real filenames; this script reads it and picks the right one.

  2. **WebFetch silently truncates large OCR text at roughly 25 pages**, with no
     error. Three separate leads in this session were recorded as "unreachable"
     or, worse, as a *retraction of a correct earlier finding*, because the tool
     returned the front matter of a 400-page gazetteer and nothing said so. The
     whole text of that 1962 register is 125 KB; curl retrieves it in one request.

  3. **Asking a summariser to reconstruct a list is not searching.** One agent
     got three mutually contradictory answers to "what does the plate list say"
     from the same document, and concluded the source did not contain a caption
     it does contain, on page 117. Grep the file. A literal search has no opinion.

Usage:
    python3 pipeline/fetch_archive_text.py <identifier> [--grep PATTERN]... \
        [--context N] [--out FILE] [--list]

    # what text files does this item actually have?
    python3 pipeline/fetch_archive_text.py in.gov.ignca.30452 --list

    # download once, search for several things, with surrounding lines
    python3 pipeline/fetch_archive_text.py \
        furg-sikh-shrines-in-west-pakistan-by-khan-mohammad-wal \
        --grep 'Mansehra' --grep 'Chitti' --context 4

Cached under the scratchpad by identifier, so repeated searches cost one fetch.
Prints the byte count it actually received: a book that comes back in a few KB
was not retrieved, whatever the exit code says.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

META = 'https://archive.org/metadata/{}'
DOWNLOAD = 'https://archive.org/download/{}/{}'
# curl, not urllib: python's urllib takes ~32s per request in this environment
# where curl takes under a second (see the memory "measure the instrument first").
CURL = ['curl', '-sL', '--compressed', '-m', '300']

TEXT_SUFFIXES = ('_djvu.txt', '.txt')


def curl(url: str, out: Path | None = None) -> bytes:
    cmd = list(CURL) + [url]
    if out is not None:
        cmd += ['-o', str(out)]
        subprocess.run(cmd, check=True)
        return out.read_bytes()
    return subprocess.run(cmd, check=True, capture_output=True).stdout


def text_files(identifier: str) -> list[dict]:
    raw = curl(META.format(identifier))
    if not raw.strip():
        raise SystemExit(f'empty metadata response for {identifier!r} — bad identifier?')
    meta = json.loads(raw)
    if not meta or 'files' not in meta:
        raise SystemExit(f'no files listed for {identifier!r} — bad identifier?')
    files = [f for f in meta['files'] if f['name'].endswith(TEXT_SUFFIXES)]
    # Prefer the OCR text layer over incidental .txt files, then largest first.
    files.sort(key=lambda f: (not f['name'].endswith('_djvu.txt'), -int(f.get('size', 0))))
    return files


def fetch(identifier: str, cache_dir: Path) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cached = cache_dir / f'{identifier}.txt'
    if cached.exists() and cached.stat().st_size > 0:
        return cached
    files = text_files(identifier)
    if not files:
        raise SystemExit(f'{identifier}: no text layer on this item (only images/PDF?)')
    name = files[0]['name']
    from urllib.parse import quote
    curl(DOWNLOAD.format(identifier, quote(name)), out=cached)
    return cached


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('identifier')
    ap.add_argument('--grep', action='append', default=[],
                    help='case-insensitive regex to search for; repeatable')
    ap.add_argument('--context', type=int, default=0)
    ap.add_argument('--out', help='also copy the fetched text here')
    ap.add_argument('--list', action='store_true', help='list text files and exit')
    ap.add_argument('--cache', default=None)
    args = ap.parse_args()

    if args.list:
        for f in text_files(args.identifier):
            print(f"{int(f.get('size', 0)):>12,}  {f['name']}")
        return 0

    cache = Path(args.cache) if args.cache else Path(tempfile.gettempdir()) / 'ia-text'
    path = fetch(args.identifier, cache)
    size = path.stat().st_size
    print(f'{args.identifier}: {size:,} bytes of OCR text at {path}')
    if size < 20_000:
        print('  ^ suspiciously small for a book. Check --list before believing a '
              'negative result from this text.', file=sys.stderr)

    if args.out:
        Path(args.out).write_bytes(path.read_bytes())

    text = path.read_text(encoding='utf-8', errors='replace')
    lines = text.splitlines()
    for pattern in args.grep:
        rx = re.compile(pattern, re.I)
        hits = [i for i, l in enumerate(lines) if rx.search(l)]
        print(f'\n=== {pattern!r}: {len(hits)} line(s) ===')
        for i in hits[:60]:
            lo, hi = max(0, i - args.context), min(len(lines), i + args.context + 1)
            for j in range(lo, hi):
                mark = '>' if j == i else ' '
                print(f'  {mark} {j+1:>6}: {lines[j].strip()}')
            if args.context:
                print('   ---')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
