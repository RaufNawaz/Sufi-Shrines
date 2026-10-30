#!/usr/bin/env python3
"""place_description_queue.py: where every place and province article stands, read from the files.

Rauf, 30 October 2026: every place and province gets its own description from the books, by the
same process as the shrine articles, and the work must pick itself up again after a usage limit
("have a watcher so that if limit runs out it just picks up again as it resets"). So, as with
public_description_queue.py, the state of a place lives in the files alone, and a firing that is
cut off loses at most the step it was in.

Steps, in order (docs/prompts/PLACE_DESCRIPTION_BRIEF.md):

  sources      entries/places/sources/<slug>.sources.md missing: run build_place_sources.py
  draft-team   write entries/places/<slug>.md and .notes.md from the sources
  fix-team     the team version exists and check_place_description.py team fails
  draft-en     write entries/places_public/<slug>.md
  verify-en    V1 until it passes
  draft-ur     write entries/places_public/<slug>.ur.md
  verify-ur    V2 and V3 until both pass
  draft-short-en   the long article is done: write the short one, <slug>.short.md (only where the
                   long prose is at least check_place_description.SHORT_MIN_LONG words)
  verify-short-en  V1 on the short English, against the long English
  draft-short-ur   write <slug>.short.ur.md
  verify-short-ur  V2 and V3 on the short Urdu
  done         all three PASS stamps match the current files, for the long article and (where one is
               needed) the short one
  rauf         a verifier failed four rounds: list the place for Rauf
  pilot-review a place after Lahore while Lahore (the pilot) is not marked approved

    python3 pipeline/book_queue/place_description_queue.py status
    python3 pipeline/book_queue/place_description_queue.py next [N]
    python3 pipeline/book_queue/place_description_queue.py state SLUG
    python3 pipeline/book_queue/place_description_queue.py verdict SLUG V1|V2|V3 PASS|FAIL ROUND
    python3 pipeline/book_queue/place_description_queue.py verdict SLUG.short V1|V2|V3 PASS|FAIL ROUND

The order is `data/review/places_queue.txt` (one slug a line; Lahore first, as the pilot). A place
with no source file has no book material and is not queued: its page keeps its site list.
"""
from __future__ import annotations

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))

import check_place_description as cpl  # noqa: E402
import public_description_queue as pq  # noqa: E402

QUEUE = os.path.join(REPO, "data", "review", "places_queue.txt")
# Rauf approves the Lahore pilot's style before the rest run (30 October 2026). The scheduled
# task does not draft past the pilot until this file lists `lahore`.
APPROVED = os.path.join(REPO, "data", "review", "places_approved.txt")
PILOT = "lahore"


def slugs() -> list:
    out = []
    for line in open(QUEUE, encoding="utf-8").read().split("\n"):
        s = line.split("#")[0].strip()
        if s:
            out.append(s)
    return out


def approved() -> set:
    if not os.path.exists(APPROVED):
        return set()
    return {l.split("#")[0].strip() for l in open(APPROVED, encoding="utf-8") if l.split("#")[0].strip()}


def state(slug: str) -> tuple:
    cpl.use_place_dirs()
    if not os.path.exists(os.path.join(cpl.SOURCE_DIR, slug + ".sources.md")):
        return "sources", "run build_place_sources.py"
    if slug != PILOT and PILOT not in approved():
        return "pilot-review", "waits for Rauf to approve the Lahore pilot (data/review/places_approved.txt)"
    if not os.path.exists(os.path.join(cpl.TEAM_DIR, slug + ".md")):
        return "draft-team", "write the team version from the sources"
    errs = cpl.check_team(slug, quiet=True)
    if errs:
        return "fix-team", "%d checker error(s), first: %s" % (len(errs), errs[0][:120])
    st, detail = pq.state(slug)
    if st != "done" or not cpl.needs_short(slug):
        return st, detail
    # The short article (Rauf, 30 October 2026), after the long one is done.
    sid = slug + cpl.SHORT
    sst, sdetail = pq.state(sid)
    if sst == "draft-en":
        return "draft-short-en", "write %s.short.md, target %d words (long %d)" % (
            slug, cpl.short_target(cpl.long_prose_words(slug)), cpl.long_prose_words(slug))
    names = {"verify-en": "verify-short-en", "draft-ur": "draft-short-ur", "verify-ur": "verify-short-ur"}
    return names.get(sst, sst), ("short: " + sdetail if sst != "done" else detail)


def main() -> int:
    args = sys.argv[1:]
    if not args or args[0] == "status":
        counts = {}
        for s in slugs():
            st, detail = state(s)
            counts[st] = counts.get(st, 0) + 1
            print("%-22s %-12s %s" % (s, st, detail))
        print("\n" + "  ".join("%s %d" % kv for kv in sorted(counts.items())))
        return 0
    if args[0] == "next":
        n = int(args[1]) if len(args) > 1 else 3
        rows = [(s,) + state(s) for s in slugs()]
        live = [r for r in rows if r[1] not in ("done", "rauf", "pilot-review")]
        # a place already under way first, then queue order
        live.sort(key=lambda r: (r[1] in ("draft-team", "sources"),))
        for s, st, detail in live[:n]:
            print("%-22s %-12s %s" % (s, st, detail))
        return 0
    if args[0] == "state":
        print("%s %s" % state(args[1]))
        return 0
    if args[0] == "verdict":
        cpl.use_place_dirs()
        slug, v, status, rnd = args[1], args[2], args[3], int(args[4])
        return pq.set_verdict(slug, v, status, rnd)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
