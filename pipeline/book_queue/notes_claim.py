#!/usr/bin/env python3
"""Claim a book for the NOTES stage, so two concurrent runs cannot note it at once.

RULE 4 invariant for the book-queue notes stage. Exits non-zero and names the holder
rather than printing a warning nobody reads.

WHY THIS EXISTS (measured, 20 September 2026, HANDOVER 9.218). Two firings of the same
hourly scheduled task noted chunks 001-006 of `abbas_female_voice_sufi_ritual` in
parallel. The 20:08Z run committed its six files to both canonical locations and
verified them by md5; at 20:19:54Z the same six paths held different files, written by
the 20:05Z firing. Neither set was wrong. Six chunks of model work were done twice and
one set was discarded by timing rather than by anyone's decision. The same two runs also
independently rendered the same five page images of the same PDF.

`queue.py` is careful about concurrency everywhere else: it takes an exclusive flock on
`state.json` for every book command (queue.py:101-109), and the TRANSCRIPTION stage
leases page ranges with a three-hour sweep. But writing a chunk's notes file is not a
`queue.py` operation at all, so nothing in the state machine ever learns that a book is
being noted, and two notes runs are invisible to each other by construction. The two
duplicate `### 9.201` headings on 18 September and the two `### 9.216` headings on
20 September were this same collision surfacing as a numbering nuisance; it was read as
a numbering problem three times before it cost work.

WHY IT IS A SEPARATE FILE AND NOT A PATCH TO queue.py. It was written while another run
was executing `queue.py`; editing that file under a live reader was not worth the risk.
Folding these subcommands into `queue.py` later is fine — the on-disk format below is the
contract, not this script.

WHY unlink IS NEVER USED. `unlink(2)` is blocked inside a Cowork connected folder (this
is also why `git add` bus-errors here). A release therefore REWRITES the claim file with
`"status": "released"`; it never removes it. Any code reading these files must treat a
released or expired claim as free, not assume absence means free.

THE ATOMIC PRIMITIVE is `open(..., O_CREAT|O_EXCL)`, which is atomic on this mount. The
only race left is two runs taking over the same EXPIRED claim in the same instant, which
a 90-minute default TTL makes vanishingly rare, and which costs a duplicated book rather
than a corrupted file.

  claim SLUG   [--session ID] [--ttl-min N] [--note TEXT]
      exit 0  claim taken (or renewed — the same session re-claiming is idempotent)
      exit 3  a DIFFERENT session holds a live claim; the holder and its expiry are printed
  release SLUG [--session ID]
      exit 0  released (releasing something you do not hold is a no-op, and says so)
  status [--slug SLUG]
      exit 0  always; prints every live claim, or all claims with --all
  next-free SLUG [SLUG ...]
      prints the first slug with no live claim, exit 0; exit 4 if every candidate is claimed

Usage from a scheduled run, before doing any notes work:

    python3 pipeline/book_queue/notes_claim.py claim <slug> --session "$SESSION" \
      || exit 0   # another run has it; stop, do not pick a second book behind its back
"""
import argparse, errno, json, os, sys
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
CLAIMS = os.path.join(HERE, "notes_claims")
DEFAULT_TTL_MIN = 90


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def path_for(slug: str) -> str:
    if "/" in slug or slug.startswith("."):
        sys.exit(f"refusing a slug that is a path: {slug!r}")
    return os.path.join(CLAIMS, f"{slug}.json")


def read_claim(slug: str):
    try:
        with open(path_for(slug), encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as exc:
        # A half-written claim is a live claim's worst case: treat it as HELD, never as
        # free, so a corrupt file can never authorise a second run onto the same book.
        return {"slug": slug, "session": "(unreadable claim file)", "status": "active",
                "expires_at": iso(now() + timedelta(minutes=DEFAULT_TTL_MIN)),
                "note": f"unparseable: {exc}"}


def is_live(claim) -> bool:
    if not claim or claim.get("status") != "active":
        return False
    try:
        return parse(claim["expires_at"]) > now()
    except (KeyError, ValueError):
        return True  # unreadable expiry: assume live, see above


def write_claim(slug: str, payload: dict, exclusive: bool) -> bool:
    os.makedirs(CLAIMS, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | (os.O_EXCL if exclusive else os.O_TRUNC)
    try:
        fd = os.open(path_for(slug), flags, 0o644)
    except OSError as exc:
        if exclusive and exc.errno == errno.EEXIST:
            return False
        raise
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, sort_keys=True)
        fh.write("\n")
    return True


def cmd_claim(a) -> None:
    session = a.session or os.environ.get("CLAUDE_SESSION_ID") or f"pid-{os.getpid()}"
    payload = {"slug": a.slug, "session": session, "status": "active",
               "claimed_at": iso(now()),
               "expires_at": iso(now() + timedelta(minutes=a.ttl_min)),
               "note": a.note or ""}
    if write_claim(a.slug, payload, exclusive=True):
        print(f"claimed {a.slug} for {session} until {payload['expires_at']}")
        return
    held = read_claim(a.slug)
    if is_live(held) and held.get("session") != session:
        print(f"REFUSED: {a.slug} is already claimed by {held.get('session')} "
              f"since {held.get('claimed_at')}, expires {held.get('expires_at')}."
              f"{(' note: ' + held['note']) if held.get('note') else ''}\n"
              f"Do NOT note this book. Pick the next unclaimed one "
              f"(`notes_claim.py next-free <slug> <slug> ...`) or stop.", file=sys.stderr)
        sys.exit(3)
    why = "renewing own claim" if held and held.get("session") == session else \
          "taking over a released or expired claim"
    payload["note"] = (payload["note"] + f" [{why}; previous holder "
                       f"{held.get('session') if held else 'none'}]").strip()
    write_claim(a.slug, payload, exclusive=False)
    print(f"claimed {a.slug} for {session} until {payload['expires_at']} ({why})")


def cmd_release(a) -> None:
    session = a.session or os.environ.get("CLAUDE_SESSION_ID") or f"pid-{os.getpid()}"
    held = read_claim(a.slug)
    if not held:
        print(f"no claim on {a.slug}; nothing to release")
        return
    if held.get("session") != session and is_live(held):
        print(f"not releasing {a.slug}: it is held by {held.get('session')}, not {session}")
        return
    held.update(status="released", released_at=iso(now()), released_by=session)
    write_claim(a.slug, held, exclusive=False)   # rewrite, never unlink (blocked on this mount)
    print(f"released {a.slug}")


def all_claims():
    if not os.path.isdir(CLAIMS):
        return []
    out = []
    for name in sorted(os.listdir(CLAIMS)):
        if name.endswith(".json"):
            c = read_claim(name[:-5])
            if c:
                out.append(c)
    return out


def cmd_status(a) -> None:
    claims = all_claims()
    if a.slug:
        claims = [c for c in claims if c.get("slug") == a.slug]
    shown = [c for c in claims if a.all or is_live(c)]
    if not shown:
        print("no live notes claims" if not a.all else "no claims recorded")
        return
    for c in shown:
        state = "LIVE " if is_live(c) else "free "
        print(f"{state} {c.get('slug'):42s} {c.get('session'):28s} "
              f"claimed {c.get('claimed_at')} expires {c.get('expires_at')} "
              f"{c.get('status')}{(' — ' + c['note']) if c.get('note') else ''}")


def cmd_next_free(a) -> None:
    for slug in a.slugs:
        if not is_live(read_claim(slug)):
            print(slug)
            return
    print("every candidate slug is claimed by a live run", file=sys.stderr)
    sys.exit(4)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("claim"); c.add_argument("slug")
    c.add_argument("--session"); c.add_argument("--note")
    c.add_argument("--ttl-min", type=int, default=DEFAULT_TTL_MIN)
    c.set_defaults(fn=cmd_claim)

    r = sub.add_parser("release"); r.add_argument("slug")
    r.add_argument("--session"); r.set_defaults(fn=cmd_release)

    s = sub.add_parser("status"); s.add_argument("--slug")
    s.add_argument("--all", action="store_true"); s.set_defaults(fn=cmd_status)

    n = sub.add_parser("next-free"); n.add_argument("slugs", nargs="+")
    n.set_defaults(fn=cmd_next_free)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
