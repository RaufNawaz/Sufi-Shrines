#!/usr/bin/env python3
"""public_description_queue.py: the resumable state of the PUBLIC Description stage, row by row.

Rauf, 24 October 2026 (in chat): the rewritten Descriptions stay as the team version; each row gets a
public version distilled from it (everything obviously important, no "what authors say", no side by
side disagreements), with an Urdu article that independent verifiers pass for fidelity and fluency.
He also asked that the scheduled task can stop at any point (the usage limit ends a firing) and the
next firing picks up exactly where it stopped. So every step leaves its result on disk, and this tool
reads the files, never a memory of what a firing meant to do (RULE 4). Brief:
docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md.

    python3 pipeline/book_queue/public_description_queue.py status           # every row and its step
    python3 pipeline/book_queue/public_description_queue.py next [N]         # rows to work, in order
    python3 pipeline/book_queue/public_description_queue.py view ID          # what a drafter needs
    python3 pipeline/book_queue/public_description_queue.py resume ID        # the one next step
    python3 pipeline/book_queue/public_description_queue.py verdict ID V1|V2|V3 PASS|FAIL ROUND
        record a verifier's result: rewrites that verdict line at the top of <id>.notes.md, stamped
        with the md5 (first 8 hex) of the file(s) the verifier read. Save the verifier's report FIRST,
        as entries/descriptions_public/verify/<id>.<V>.r<ROUND>.txt; the command refuses without it.

The steps of a row, in order (a row is resumed at the first one not satisfied):
  1 draft-en   write entries/descriptions_public/<id>.md, and <id>.notes.md (consensus choices, left out)
  2 verify-en  V1 English fidelity, until it PASSes on the current English
  3 draft-ur   write <id>.ur.md, only after V1 has passed (the pilots rewrote their Urdu four times
               because the English kept changing under it)
  4 verify-ur  V2 Urdu fidelity and V3 Urdu fluency, until both PASS on the current files
  5 done       all three PASS lines carry the CURRENT files' md5s; confirm with
               check_public_description.py, which checks the same stamps
A verdict whose stamp no longer matches its file is STALE (the file changed after the verifier read it),
so that verifier runs again; an English change after V1 makes V1 and V2 stale. A verifier that has
FAILed MAX_ROUNDS times sends the row to `rauf`: list it for him; `next` skips it.

Scope: the ids in data/review/descriptions_approved.txt that have a team version in
entries/descriptions/. Order: rows already under way first, then the shortest team version first.
"""
from __future__ import annotations

import csv
import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import urdu_content_qa as uq  # noqa: E402  (slugify: the key of urdu-i18n/content/<slug>.md)

APPROVED = os.path.join(REPO, "data", "review", "descriptions_approved.txt")
TEAM_DIR = os.path.join(REPO, "entries", "descriptions")
PUB_DIR = os.path.join(REPO, "entries", "descriptions_public")
VERIFY_DIR = os.path.join(PUB_DIR, "verify")
SHEETS = [os.path.join(REPO, "data", f) for f in ("import_2026-10-15.csv", "snapshot_2026-10-08_post-import.csv")]
TARGET, LO, HI = 0.75, 0.40, 0.85
MAX_ROUNDS = 4
LABELS = {"V1": "V1 English fidelity", "V2": "V2 Urdu fidelity", "V3": "V3 Urdu fluency"}
READS = {"V1": ("en",), "V2": ("en", "ur"), "V3": ("ur",)}
LINE = re.compile(r"^(V[123]) [A-Za-z ]+: (PASS|FAIL|PENDING)(?: \(round (\d+)\))?((?: (?:en|ur):[0-9a-f]{8})*)\s*$")


def p(id_: str, ext: str) -> str:
    return os.path.join(PUB_DIR, id_ + ext)


def md5(path: str) -> str:
    if not os.path.exists(path):
        return ""
    return hashlib.md5(open(path, "rb").read()).hexdigest()[:8]


def current(id_: str) -> dict:
    return {"en": md5(p(id_, ".md")), "ur": md5(p(id_, ".ur.md"))}


def verdicts(id_: str) -> dict:
    """{V1: (status, round, {en: md5, ur: md5})} from the first lines of the notes file."""
    out = {k: ("PENDING", 0, {}) for k in LABELS}
    if not os.path.exists(p(id_, ".notes.md")):
        return out
    for line in open(p(id_, ".notes.md"), encoding="utf-8").read().split("\n")[:12]:
        m = LINE.match(line)
        if m:
            stamps = dict(s.split(":") for s in m.group(4).split())
            out[m.group(1)] = (m.group(2), int(m.group(3) or 0), stamps)
    return out


def fresh(v: str, stamps: dict, cur: dict) -> bool:
    return all(stamps.get(k) == cur[k] for k in READS[v])


def state(id_: str) -> tuple:
    """(step, detail): the first step of the row that is not satisfied."""
    if not os.path.exists(p(id_, ".md")):
        return "draft-en", "write the public English"
    cur, vs = current(id_), verdicts(id_)
    for v in LABELS:
        st, rnd, _ = vs[v]
        if st == "FAIL" and rnd >= MAX_ROUNDS:
            return "rauf", "%s failed %d rounds: list the row for Rauf" % (v, rnd)
    st, rnd, stamps = vs["V1"]
    if not (st == "PASS" and fresh("V1", stamps, cur)):
        why = "stale, the English changed after round %d" % rnd if st == "PASS" else st.lower()
        return "verify-en", "V1 round %d (%s)" % (rnd + 1, why)
    if not os.path.exists(p(id_, ".ur.md")):
        return "draft-ur", "V1 passed: write the Urdu"
    todo = []
    for v in ("V2", "V3"):
        st, rnd, stamps = vs[v]
        if not (st == "PASS" and fresh(v, stamps, cur)):
            todo.append("%s round %d (%s)" % (v, rnd + 1, "stale" if st == "PASS" else st.lower()))
    if todo:
        return "verify-ur", "; ".join(todo)
    return "done", "all three verifiers passed the current files"


def set_verdict(id_: str, v: str, status: str, rnd: int) -> int:
    report = os.path.join(VERIFY_DIR, "%s.%s.r%d.txt" % (id_, v, rnd))
    if not os.path.exists(report) or not open(report, encoding="utf-8").read().strip():
        print("refused: save the verifier's report first at %s" % os.path.relpath(report, REPO))
        return 1
    cur = current(id_)
    if any(not cur[k] for k in READS[v]):
        print("refused: %s reads %s and a file is missing" % (v, "+".join(READS[v])))
        return 1
    vs = verdicts(id_)
    vs[v] = (status, rnd, {k: cur[k] for k in READS[v]})
    block = []
    for k, label in LABELS.items():
        st, r, stamps = vs[k]
        block.append("%s: %s%s%s" % (label, st, " (round %d)" % r if r else "",
                                       "".join(" %s:%s" % (s, stamps[s]) for s in ("en", "ur") if s in stamps)))
    path = p(id_, ".notes.md")
    body = open(path, encoding="utf-8").read().split("\n") if os.path.exists(path) else []
    body = [l for i, l in enumerate(body) if not (i < 12 and LINE.match(l))]
    while body and not body[0].strip():
        body.pop(0)
    open(path, "w", encoding="utf-8").write("\n".join(block + [""] + body).rstrip("\n") + "\n")
    print(block[list(LABELS).index(v)])
    return 0


def names() -> dict:
    csv.field_size_limit(2**31 - 1)
    for path in SHEETS:
        if os.path.exists(path):
            with open(path, encoding="utf-8", newline="") as fh:
                return {r["id"]: r["Name"] for r in csv.DictReader(fh)}
    return {}


def team_prose(id_: str) -> int:
    t = open(os.path.join(TEAM_DIR, id_ + ".md"), encoding="utf-8").read()
    return len(t.split("\n## Bibliography")[0])


def ids() -> list:
    out = []
    for line in open(APPROVED, encoding="utf-8"):
        i = line.strip()
        if i and not i.startswith("#") and os.path.exists(os.path.join(TEAM_DIR, i + ".md")):
            out.append(i)
    return sorted(set(out), key=lambda i: (team_prose(i), i))


def main() -> int:
    a = sys.argv[1:]
    cmd = a[0] if a else "status"
    if cmd == "verdict" and len(a) == 5 and a[2] in LABELS and a[3] in ("PASS", "FAIL"):
        return set_verdict(a[1], a[2], a[3], int(a[4]))
    if cmd == "resume" and len(a) == 2:
        print("%s  %s: %s" % ((a[1],) + state(a[1])))
        return 0
    all_ids = ids()
    if cmd == "status":
        counts = {}
        for i in all_ids:
            step, detail = state(i)
            counts[step] = counts.get(step, 0) + 1
            print("%-10s %7d  %-58s %s" % (step, team_prose(i), i, detail))
        print("rows %d: %s" % (len(all_ids), ", ".join("%s %d" % kv for kv in sorted(counts.items()))))
        return 0
    if cmd == "next":
        n = int(a[1]) if len(a) > 1 else 4
        under = [i for i in all_ids if state(i)[0] in ("verify-en", "draft-ur", "verify-ur")]
        new = [i for i in all_ids if state(i)[0] == "draft-en"]
        for i in (under + new)[:n]:
            print("%s  %s: %s" % ((i,) + state(i)))
        return 0
    if cmd == "view" and len(a) == 2:
        i = a[1]
        nm = names().get(i, "")
        slug = uq.slugify(nm) if nm else "?"
        tp = team_prose(i)
        ur_old = os.path.join(REPO, "urdu-i18n", "content", slug + ".md")
        print("id            %s" % i)
        print("Name          %s" % nm)
        print("step          %s: %s" % state(i))
        print("team prose    %d chars (entries/descriptions/%s.md, before ## Bibliography)" % (tp, i))
        print("public length up to %d chars (0.75) as the important information allows; accepted %d to %d"
              % (tp * TARGET, tp * LO, tp * HI))
        print("Urdu slug     %s  (at import: urdu-i18n/content/%s.md)" % (slug, slug))
        print("existing Urdu %s" % (os.path.relpath(ur_old, REPO) if os.path.exists(ur_old) else "none"))
        print("write         entries/descriptions_public/%s.md, .ur.md, .notes.md; reports in verify/" % i)
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
