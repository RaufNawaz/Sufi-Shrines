#!/usr/bin/env python3
"""measure_image_shapes.py — how tall is a hero box allowed to be?

Why this exists
---------------
`.shrine-hero-img` had no reserved box: a replaced element has no height until
it decodes, so the hero measured **0px and then 240px** about a second after the
article had already rendered, and the infobox — which sits at y=483 and is on
screen at 390×844 — moved 239px down with it. That was the whole of
`/shrine`'s CLS 0.1115 (measure it with `node scripts/measure-cls.mjs`).

Reserving the box means committing to **one** aspect ratio for every hero in the
archive, and `object-fit: cover` then crops whatever does not match it. For an
archive whose distinguishing content is its photographs that is an editorial
cost, not a free win, and it must not be paid on a guess: the first version of
the fix picked 3:2 because Data Darbar's hero happens to be 1280×857, and the
second entry checked by hand (Allo Mahar, 1024×1280) was **portrait**, which a
3:2 box crops to a 40% band.

So this measures the shapes rather than assuming them.

What it does
------------
Reads the committed snapshot, takes each entry's images in `Image 1..16` order,
and asks each URL for its first 64 KB — enough for a JPEG's SOF marker or a
PNG's IHDR — then lets Pillow read the dimensions off the partial file. Falls
back to a full download only for the ones a partial read cannot decode.

Four things learned the hard way. The first two are already in HANDOVER §9; the
last two cost this script a wrong answer before it gave a right one.

- **It shells out to curl.** `urllib` takes ~32 seconds per request in this
  environment against curl's 0.34, so a 242-URL pass is the difference between
  two minutes and two hours.
- **A browser is not the instrument.** Loading these URLs in Chromium from
  inside the sandbox reports failures that curl does not see seconds later.
- **Wikimedia answers a request with no User-Agent with 429, not 403.** The
  first run of this script reported 68 of 118 heroes "undecodable", every one of
  them on commons.wikimedia.org — while `check_image_liveness.py` had just found
  84 Wikimedia URLs alive. The difference was the `--user-agent` that script
  sets and this one had not. A 2,253-byte `text/html` body is the tell: it is a
  rate-limit page, and a script that only asks "did Pillow parse it" reads that
  as a broken picture.
- **The rate limit outlives the run that earned it.** After one 12-worker pass
  with no User-Agent, a *correct* second pass still got 429 on all 67 Wikimedia
  heroes: the budget was already spent. Hence the backoff, the small worker
  count, and `--resume`, which reads the TSV and asks only for what is missing —
  so a partial answer accumulates instead of a fresh sweep re-earning the block.
- **A 64 KB range is not enough for Pillow, and the failure is not "too small".**
  A JPEG carrying a large EXIF block raises `OSError: Truncated File Read` from
  inside the APP-marker handler even though the SOF header holding the
  dimensions arrived in the first few hundred bytes. `ImageFile.Parser` reads
  the header without demanding the rest of the file, which is what this uses.

Usage
-----
    python3 pipeline/measure_image_shapes.py                  # hero images only
    python3 pipeline/measure_image_shapes.py --all            # every image field
    python3 pipeline/measure_image_shapes.py --tsv out.tsv
"""

from __future__ import annotations

import argparse
import io
import json
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageFile

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / "src" / "data" / "shrines-fallback.json"
IMAGE_FIELDS = [f"Image {i}" for i in range(1, 17)]
RANGE_BYTES = 262_143
TIMEOUT_S = 25
# Six, not twelve: the concurrency is what turns Wikimedia's rate limit from a
# theoretical courtesy into 68 wrong answers.
WORKERS = 3
# Attempts per URL, and the pause before each retry. Wikimedia's 429 clears on
# the scale of seconds-to-minutes, so a short ladder recovers most of a pass
# without a sweep that starts the block over.
RETRY_SLEEPS_S = (2, 6, 15)
# Matches check_image_liveness.py exactly. Both scripts hit the same hosts, and
# a host that has decided how to treat this archive should see one identity.
UA = "Mozilla/5.0 (compatible; ShrinesArchiveLinkCheck/1.0; +https://raufnawaz.github.io/Sufi-Shrines/)"


def slugify(name: str) -> str:
    """Mirrors src/lib/data/slugify.ts closely enough to name a row."""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def fetch(url: str, *, partial: bool) -> tuple[bytes | None, str]:
    """Bytes and the HTTP status, because the status is what distinguishes a
    rate limit from a broken picture."""
    cmd = [
        "curl",
        "--silent",
        "--show-error",
        "--location",  # Special:FilePath is a redirect to the real image
        "--max-time",
        str(TIMEOUT_S),
        "--user-agent",
        UA,
        "--header",
        "Accept: image/*,*/*",
        "--write-out",
        "%{http_code}",
    ]
    if partial:
        cmd += ["--range", f"0-{RANGE_BYTES}"]
    cmd.append(url)
    try:
        out = subprocess.run(cmd, capture_output=True, timeout=TIMEOUT_S + 10)
    except subprocess.TimeoutExpired:
        return None, "timeout"
    body = out.stdout or b""
    # --write-out appends the status to stdout after the body.
    status = body[-3:].decode("ascii", "replace") if len(body) >= 3 else "?"
    return body[:-3] or None, status


def read_size(blob: bytes) -> tuple[int, int] | None:
    """Dimensions from a possibly-incomplete file.

    `Image.open` on a truncated JPEG raises out of the APP-marker handler even
    when the SOF header it needs has already arrived, so the parser — which is
    built for a stream — goes first."""
    parser = ImageFile.Parser()
    try:
        parser.feed(blob)
        if parser.image is not None:
            return parser.image.size
    except Exception:  # noqa: BLE001 — an incomplete file is the normal case here
        pass
    try:
        with Image.open(io.BytesIO(blob)) as img:
            return img.size
    except Exception:  # noqa: BLE001
        return None


def dimensions(url: str) -> tuple[int, int] | str:
    """(width, height), or a string naming why not."""
    last = "no response"
    for attempt in range(len(RETRY_SLEEPS_S) + 1):
        for partial in (True, False):
            blob, status = fetch(url, partial=partial)
            last = status
            if blob:
                size = read_size(blob)
                if size:
                    return size
        # Only a rate limit is worth waiting out. A 404 will still be a 404.
        if last != "429" or attempt == len(RETRY_SLEEPS_S):
            break
        time.sleep(RETRY_SLEEPS_S[attempt])
    return f"HTTP {last}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="every image field, not just heroes")
    ap.add_argument("--tsv", help="write the per-image rows here")
    ap.add_argument(
        "--resume",
        action="store_true",
        help="keep the rows already in --tsv and fetch only what is missing",
    )
    args = ap.parse_args()

    if not SNAPSHOT.exists():
        print(f"missing snapshot: {SNAPSHOT}", file=sys.stderr)
        return 2

    rows = json.loads(SNAPSHOT.read_text())["rows"]
    targets: list[tuple[str, str, str]] = []  # (slug, field, url)
    for row in rows:
        slug = slugify(row.get("Name", ""))
        for field in IMAGE_FIELDS:
            value = row.get(field)
            if isinstance(value, str) and value.strip().startswith("http"):
                targets.append((slug, field, value.strip()))
                if not args.all:
                    break  # the hero is the first populated field, which is what the box is for

    label = "every image" if args.all else "hero images"
    print(f"{len(targets)} {label} across {len({t[0] for t in targets})} entries")

    known: dict[tuple[str, str], tuple[int, int]] = {}
    if args.resume and args.tsv and Path(args.tsv).exists():
        for line in Path(args.tsv).read_text(encoding="utf-8").splitlines()[1:]:
            parts = line.split("\t")
            if len(parts) >= 4:
                known[(parts[0], parts[1])] = (int(parts[2]), int(parts[3]))
        print(f"resuming: {len(known)} already measured")

    pending = [t for t in targets if (t[0], t[1]) not in known]
    print(f"fetching {len(pending)}\n")

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        fetched = list(pool.map(lambda t: dimensions(t[2]), pending))
    results = dict(zip([(t[0], t[1]) for t in pending], fetched))

    measured: list[tuple[str, str, int, int, float, str]] = []
    failed: list[tuple[str, str, str]] = []
    for slug, field, url in targets:
        size = known.get((slug, field)) or results[(slug, field)]
        if isinstance(size, str):
            failed.append((slug, field, f"{size}  {url}"))
            continue
        width, height = size
        if height == 0:
            failed.append((slug, field, f"height 0  {url}"))
            continue
        measured.append((slug, field, width, height, width / height, url))

    portrait = [m for m in measured if m[4] < 1.0]
    square_ish = [m for m in measured if 1.0 <= m[4] < 1.25]
    landscape = [m for m in measured if m[4] >= 1.25]

    print(f"decoded {len(measured)}, undecodable {len(failed)}\n")
    print(f"  portrait  (ratio < 1.00)      {len(portrait):4d}")
    print(f"  near-square (1.00–1.25)       {len(square_ish):4d}")
    print(f"  landscape (>= 1.25)           {len(landscape):4d}\n")

    ratios = sorted(m[4] for m in measured)
    if ratios:
        def pct(p: float) -> float:
            return ratios[min(len(ratios) - 1, int(p * len(ratios)))]

        print("  ratio distribution (width / height)")
        for name, value in (
            ("min", ratios[0]),
            ("p10", pct(0.10)),
            ("median", pct(0.50)),
            ("p90", pct(0.90)),
            ("max", ratios[-1]),
        ):
            print(f"    {name:<7} {value:.3f}")
        print()

    common: dict[str, int] = {}
    for _slug, _field, _w, _h, ratio, _url in measured:
        approx = Fraction(ratio).limit_denominator(9)
        common[f"{approx.numerator}:{approx.denominator}"] = (
            common.get(f"{approx.numerator}:{approx.denominator}", 0) + 1
        )
    print("  most common ratios, rounded to small whole numbers")
    for shape, count in sorted(common.items(), key=lambda kv: -kv[1])[:8]:
        print(f"    {shape:<8} {count:4d}")
    print()

    if portrait:
        print(f"  the {len(portrait)} portrait heroes a landscape box would crop:")
        for slug, field, width, height, ratio, _url in sorted(portrait, key=lambda m: m[4])[:20]:
            print(f"    {ratio:.3f}  {width}×{height}  {slug} ({field})")
        if len(portrait) > 20:
            print(f"    … and {len(portrait) - 20} more")
        print()

    if failed:
        print(f"  {len(failed)} could not be decoded — read the status before believing it:")
        for slug, field, why in failed[:12]:
            print(f"    {slug} ({field})  {why[:96]}")
        print()

    if args.tsv:
        out = Path(args.tsv)
        with out.open("w", encoding="utf-8") as handle:
            # The URL is the join key the front end needs, not the slug: a
            # reserved box keyed on a URL self-invalidates the moment the sheet
            # points that field somewhere else, where one keyed on a slug would
            # go on reserving the old shape for a new picture.
            handle.write("slug\tfield\twidth\theight\tratio\turl\n")
            for slug, field, width, height, ratio, url in measured:
                handle.write(f"{slug}\t{field}\t{width}\t{height}\t{ratio:.4f}\t{url}\n")
        print(f"wrote {out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
