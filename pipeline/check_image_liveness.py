#!/usr/bin/env python3
"""check_image_liveness.py — does every image the archive points at still load?

Why this exists
---------------
242 image fields are populated across 118 of the archive's 169 entries, and
**134 of them point at this project's own published site while 108 point at
twenty-one other hosts.** Nothing has ever checked that any of them still
answer. Two were found dead by accident on 26 August 2026 — one 403, one whose
TLS certificate had expired — as a pair of console errors on a page nobody was
debugging.

That matters beyond the broken pictures. The archive's standing finding is
"51 of 169 entries carry no photograph"; an entry whose only image is a dead
hot-link is counted as *having* one, so the real gap is larger than the
published number by however many of these fail. A number that cannot be checked
is a number that drifts (CLAUDE.md's standing-findings lesson), so this makes it
checkable.

What it reports, and what it deliberately does not
--------------------------------------------------
A URL is called **dead** only on evidence: a 4xx/5xx, a transport failure
(DNS, TLS, connection), or a 200 whose content-type is not an image — that last
one is the quiet failure, because a host that answers a missing image with an
HTML error page returns 200 and renders as a broken picture rather than as an
error.

It does **not** judge whether the picture is the right picture. That is
`pipeline/photo_manifest.tsv`'s RMS comparison and a human's job (RULE 4:
filenames lie, and one filename in this archive spans two shrines).

What was measured on 27 August 2026
-----------------------------------
242 fields, 22 hosts (134 on the project's own published site, 84 on Wikimedia,
24 spread over twenty other hosts). **239 alive, 3 dead:**

  Gurdwara Sacha Sauda      Image 1  404  commons.wikimedia.org
  Tomb of Qutbuddin Aibak   Image 1  404  commons.wikimedia.org
  Shrine of Sachal Sarmast  Image 1  403  heritageofpakistan.org

Two of those entries — Gurdwara Sacha Sauda and Shrine of Sachal Sarmast — lose
their *only* image, so the archive's "51 entries carry no photograph" is 53 by
this measure.

Two things this could not establish, both worth knowing before re-running it
-----------------------------------------------------------------------------
**A browser pass is not a valid instrument from a proxied environment.** Loading
all 242 in Chromium reported 80 failures — `ERR_BLOCKED_BY_ORB` on
upload.wikimedia.org, unfollowed 302s on commons.wikimedia.org — and the number
is wrong. The same URLs return `206 image/jpeg` over curl seconds later, the
failures cluster on exactly the two highest-volume hosts, and on one shrine page
**the same URL rendered once and failed once**. That is throttling in the egress
path, not the archive's data. Re-run the browser check from an ordinary network
before believing any figure it produces; it is the better instrument in
principle, because it applies real certificate validation and it is what a
reader uses.

**And this script is blind to certificate validity here.** Chromium refused
`sultan-bahoo.com` with `net::ERR_CERT_DATE_INVALID` on 26 August; `openssl
s_client` returned a certificate expired 24 June 2026 on one connection and one
valid to 28 September on the next; curl through this environment reports
`206 image/jpeg` with `ssl_verify_result=0`. The host's TLS is inconsistent
across edges and the egress path hides it. That image is recorded here as alive
and is at least intermittently broken for real readers.

Usage
-----
    python3 pipeline/check_image_liveness.py [--out pipeline/image_liveness.tsv]
                                             [--workers 8] [--timeout 20]
                                             [--host HOST]   # only this host

Exit code is 0 whatever it finds: this is a survey, not a gate. Making it a
gate would tie `npm run verify` to twenty-one third-party hosts and to the
network, which would fail for reasons that have nothing to do with a commit.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import pathlib
import shutil
import subprocess
import time
import sys
import urllib.parse
from collections import Counter
from typing import NamedTuple

ROOT = pathlib.Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / "src" / "data" / "shrines-fallback.json"
DEFAULT_OUT = ROOT / "pipeline" / "image_liveness.tsv"

# A plain urllib request is refused outright by several of these hosts.
UA = "Mozilla/5.0 (compatible; ShrinesArchiveLinkCheck/1.0; +https://raufnawaz.github.io/Sufi-Shrines/)"

# Wikimedia serves 84 of this archive's 242 images and rate-limits a sweep on
# sight. Two workers and a wait between attempts is slower than the machine can
# go and roughly as fast as the hosts will allow.
RETRIES = 4
BACKOFF_SECONDS = 4


class Target(NamedTuple):
    shrine: str
    column: str
    url: str


class Result(NamedTuple):
    target: Target
    status: str
    content_type: str
    final_url: str
    note: str
    attempts: int = 1

    @property
    def verdict(self) -> str:
        """alive | DEAD | unknown — and the third one is the important one.

        A 429 is not a dead image, it is this script being impolite. The first
        run reported **55 of 65 Wikimedia URLs as dead**, every one of them a
        429 from eight concurrent requests, and every one of them fine. Writing
        that into a standing finding would have been a textbook
        confidently-wrong diagnosis (HANDOVER §9's whole point), so a status
        that means "ask again later" gets its own verdict and is never counted
        as a loss. Same for a timeout and for a 5xx: the archive cannot tell the
        difference between a host that is gone and a host that is having a bad
        minute, so it says so.
        """
        if self.status.startswith("2") and self.content_type.startswith("image/"):
            return "alive"
        if self.status in {"429", "500", "502", "503", "504"} or self.status == "-":
            return "unknown"
        return "DEAD"

    @property
    def alive(self) -> bool:
        return self.verdict == "alive"


def targets() -> list[Target]:
    rows = json.loads(SNAPSHOT.read_text(encoding="utf-8"))["rows"]
    out: list[Target] = []
    for row in rows:
        for column, value in row.items():
            if not column.startswith("Image "):
                continue
            url = (value or "").strip()
            if url:
                out.append(Target(row.get("Name", "").strip(), column, url))
    return out


def probe(url: str, timeout: int) -> tuple[str, str, str, str, int]:
    """(status, content-type, final url, note), via curl.

    **Not `urllib`, and the reason is worth keeping.** The first version of this
    used `urllib.request` and every single request took **32 seconds** where
    `curl` against the same URL took 0.34 — and the socket timeout did not cap
    it, because whatever stalls happens before the socket exists (a resolver
    that waits out an AAAA lookup is the usual suspect). 242 URLs at 32 seconds
    apiece is over an hour of nothing, which is how the first run of this script
    was discovered: it hung.

    So the transport is `curl`, which is present everywhere this project runs,
    follows redirects, honours `--max-time` for real, and reports exactly the
    four things wanted here through `-w`. Python keeps the parts it is good at.
    """
    attempt = 0
    while True:
        attempt += 1
        status, ctype, final, note = _curl(url, timeout)
        # 429 and 503 are "not now", not "not there". Wikimedia serves 84 of
        # this archive's images and rate-limits a sweep immediately.
        if status not in {"429", "503"} or attempt >= RETRIES:
            return status, ctype, final, note, attempt
        time.sleep(BACKOFF_SECONDS * attempt)


def _curl(url: str, timeout: int) -> tuple[str, str, str, str]:
    result = subprocess.run(
        [
            "curl",
            "--silent",
            "--show-error",
            "--location",  # Special:FilePath is a redirect to the real image
            "--max-time",
            str(timeout),
            "--user-agent",
            UA,
            "--header",
            "Accept: image/*,*/*",
            # One byte is enough to learn the status and the content type, and
            # keeps a sweep of 242 images off anyone's bandwidth.
            "--range",
            "0-0",
            "--output",
            "/dev/null",
            "--write-out",
            "%{http_code}\t%{content_type}\t%{url_effective}",
            url,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0 and not result.stdout.strip():
        # A transport failure: DNS, TLS, refused connection, timeout. curl's
        # own message is the most informative thing available and is kept
        # verbatim (it is what names an expired certificate).
        return "-", "", url, f"curl {result.returncode}: {result.stderr.strip()}"
    parts = (result.stdout.strip().split("\t") + ["", "", ""])[:3]
    status, ctype, final = parts
    ctype = ctype.split(";")[0].strip().lower()
    note = "" if result.returncode == 0 else f"curl {result.returncode}: {result.stderr.strip()}"
    return status or "-", ctype, final or url, note


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=pathlib.Path, default=DEFAULT_OUT)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--host", default="", help="only check URLs on this host")
    args = parser.parse_args()

    if not shutil.which("curl"):
        print("[liveness] curl is not on PATH; this script needs it (see probe()).", file=sys.stderr)
        return 2

    found = targets()
    if args.host:
        found = [t for t in found if args.host in t.url]
    print(f"[liveness] {len(found)} image field(s) to check", flush=True)

    results: list[Result] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(probe, t.url, args.timeout): t for t in found}
        for done, future in enumerate(concurrent.futures.as_completed(futures), 1):
            target = futures[future]
            status, ctype, final, note, attempts = future.result()
            results.append(Result(target, status, ctype, final, note, attempts))
            if done % 25 == 0:
                print(f"[liveness]   {done}/{len(found)}", flush=True)

    results.sort(key=lambda r: (r.target.shrine, r.target.column))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as handle:
        handle.write(
            "shrine\tcolumn\turl\tstatus\tcontent_type\tfinal_url\tnote\tattempts\tverdict\n"
        )
        for r in results:
            verdict = r.verdict
            # Single-line fields, the photo_manifest.tsv precedent.
            fields = [
                r.target.shrine,
                r.target.column,
                r.target.url,
                r.status,
                r.content_type,
                r.final_url if r.final_url != r.target.url else "",
                r.note,
                str(r.attempts),
                verdict,
            ]
            handle.write("\t".join(f.replace("\t", " ").replace("\n", " ") for f in fields) + "\n")

    dead = [r for r in results if r.verdict == "DEAD"]
    unknown = [r for r in results if r.verdict == "unknown"]
    alive = [r for r in results if r.verdict == "alive"]
    print(f"\n[liveness] {len(alive)} alive, {len(dead)} DEAD, {len(unknown)} unknown")
    print(f"[liveness] written to {args.out.relative_to(ROOT)}")
    if unknown:
        print("\n[liveness] unknown (rate-limited, timed out, or a 5xx — ask again, do not")
        print("[liveness] record these as losses):")
        for r in unknown:
            print(f"  {r.target.shrine} · {r.target.column} · {r.status} {r.note}")

    by_host: Counter[str] = Counter()
    for r in dead:
        try:
            by_host[urllib.parse.urlsplit(r.target.url).hostname or "?"] += 1
        except Exception:  # noqa: BLE001
            by_host["?"] += 1
    if dead:
        print("\n[liveness] dead by host:")
        for host, count in by_host.most_common():
            print(f"  {count:>4}  {host}")
        print("\n[liveness] every dead field:")
        for r in dead:
            print(f"  {r.target.shrine} · {r.target.column} · {r.status} {r.note} · {r.target.url}")

    # Entries whose every image is dead: the ones the archive believes are
    # photographed and are not.
    per_shrine: dict[str, list[Result]] = {}
    for r in results:
        per_shrine.setdefault(r.target.shrine, []).append(r)
    blank = [
        name
        for name, rows in per_shrine.items()
        if rows and all(r.verdict == "DEAD" for r in rows)
    ]
    print(f"\n[liveness] entries whose every image is DEAD: {len(blank)}")
    for name in sorted(blank):
        print(f"  {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
