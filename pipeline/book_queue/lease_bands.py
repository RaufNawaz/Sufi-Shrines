#!/usr/bin/env python3
"""Take (or restore) leases on a page range that `queue.py lease` cannot see.

Why this exists
---------------
`queue.py lease` computes its free list from `page_images()`, which looks only for
`pNNNN.png` (or the `_a`/`_b` spread halves). The scribal-lithograph books are rendered
by `render_bands.py` into `pNNNN_q1..q4.png` **in the cloud container**, and those band
files are deliberately never mirrored to the Mac — they are ~40x the size of the text
they produce. So on this repo `lease` reports "no rendered free pages" for exactly the
ranges that are ready to transcribe, and it hands out the *wrong* pages (an old
full-page render from a superseded scale) for the ones that are not.

Four runs in a row hand-rolled the same inline `load_state`/`save_state` snippet to work
around this (state log, 18 Sep 20:47Z, 19 Sep 02:43Z, 20 Sep 13:41Z, and this one), which
is a workaround being rediscovered rather than an invariant being encoded — CLAUDE.md
RULE 4. This is that snippet, named, with the reason attached.

It writes through `queue.py`'s own `load_state`/`save_state(only=slug)`, so it takes the
same `fcntl` lock and rewrites only this book's entry: a concurrent run working on a
different book cannot be clobbered, and cannot clobber this.

Usage
-----
    python3 pipeline/book_queue/lease_bands.py SLUG --range 297-362 --size 11
    python3 pipeline/book_queue/lease_bands.py SLUG --range 17-38 --worker HOLD-my-reason
    python3 pipeline/book_queue/lease_bands.py SLUG --list

`--range A-B --size N` splits A..B into consecutive chunks of N and leases them to
w1, w2, ... in order. `--worker NAME` leases the whole range to one named holder, which
is how a deliberate HOLD is expressed. Pages that already have a `pNNNN.txt` are refused:
a page that is done is never redone (WORKER_PROTOCOL), so leasing it is always a mistake.
"""
from __future__ import annotations
import argparse, importlib.util, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("queue_mod", HERE / "queue.py")
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--range", dest="rng", help="A-B, 1-based PDF page indices")
    ap.add_argument("--size", type=int, default=11, help="pages per worker lease")
    ap.add_argument("--worker", help="lease the whole range to this one holder instead of w1..wN")
    ap.add_argument("--note", help="extra text for the state log")
    ap.add_argument("--list", action="store_true", help="print this book's leases and exit")
    a = ap.parse_args()

    state = q.load_state()
    if a.slug not in state["books"]:
        sys.exit(f"unknown slug {a.slug}")
    b = state["books"][a.slug]

    if a.list or not a.rng:
        print(json.dumps({"slug": a.slug, "status": b["status"], "pages": b["pages"],
                          "pages_done": b["pages_done"], "leases": b["leases"]}, indent=1))
        return

    first, last = (int(x) for x in a.rng.split("-"))
    if not (1 <= first <= last <= b["pages"]):
        sys.exit(f"range {a.rng} outside 1-{b['pages']}")
    done = q.str_to_ranges(b["pages_done"]) if b["pages_done"] else set()
    clash = sorted(n for n in range(first, last + 1) if n in done)
    if clash:
        sys.exit(f"refusing: {len(clash)} page(s) in {a.rng} are already transcribed "
                 f"(first {clash[0]}, last {clash[-1]}); a done page is never redone")
    held = set()
    for r in b["leases"]:
        held |= q.str_to_ranges(r)
    overlap = sorted(n for n in range(first, last + 1) if n in held)
    if overlap:
        sys.exit(f"refusing: {len(overlap)} page(s) in {a.rng} are already leased "
                 f"(first {overlap[0]}, last {overlap[-1]}); see --list")

    taken = []
    if a.worker:
        chunks = [(first, last, a.worker)]
    else:
        chunks = []
        i, k = first, 1
        while i <= last:
            j = min(i + a.size - 1, last)
            chunks.append((i, j, f"w{k}"))
            i, k = j + 1, k + 1
    for lo, hi, w in chunks:
        r = f"{lo}-{hi}" if hi > lo else str(lo)
        b["leases"][r] = {"worker": w, "since": q.now()}
        msg = f"lease {r} taken (worker {w}) via lease_bands.py: bands rendered in the cloud container, invisible to queue.py lease"
        if a.note:
            msg += f" — {a.note}"
        q.log(b, msg)
        taken.append({"range": r, "worker": w})
    if b["status"] in ("ingested", "rendering"):
        b["status"] = "transcribing"
    q.save_state(state, only=a.slug)
    print(json.dumps({"slug": a.slug, "taken": taken, "all_leases": b["leases"]}, indent=1))


if __name__ == "__main__":
    main()
