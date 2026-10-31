"""Collect the existence-check verdicts into one file for check_existence.py.

Joins the Claude judges' batch verdicts (claude_judge/verdicts/*.jsonl, results cited as r1, r2...) with the
places the mechanical pass settled (claude_judge/mechanical.jsonl). Maps each cited result number back to
its URL through candidates.jsonl. Fails loudly on a place judged twice, a cited result number that does not
exist, or a candidate left unjudged when --complete is given.

Writes workspace/out/claude_judge/judged_all.jsonl:
  {"id", "verdict", "kind", "evidence": [{"url", "quote"}], "note", "judged_by"}

  python collect_judgements.py [--complete]
"""
import argparse
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, "workspace", "out", "claude_judge")
JUDGE = "Claude Sonnet 5.5 subagents (claude-sonnet-5-5), judge_instructions.md"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--complete", action="store_true", help="fail if any candidate has no verdict")
    ap.add_argument("--verdicts", default=os.path.join(DIR, "verdicts", "*.jsonl"))
    ap.add_argument("--out", default=os.path.join(DIR, "judged_all.jsonl"))
    a = ap.parse_args()
    with open(os.path.join(DIR, "candidates.jsonl"), encoding="utf-8") as fh:
        cands = {c["id"]: c for c in map(json.loads, fh)}
    problems, out = [], {}
    for f in sorted(glob.glob(a.verdicts)):
        with open(f, encoding="utf-8") as fh:
            for n, line in enumerate(fh, 1):
                if not line.strip():
                    continue
                try:
                    v = json.loads(line)
                except json.JSONDecodeError:
                    problems.append(f"{os.path.basename(f)}:{n} is not JSON")
                    continue
                pid = v.get("id")
                if pid not in cands:
                    problems.append(f"{os.path.basename(f)}:{n} id {pid} is not a candidate")
                    continue
                if pid in out:
                    problems.append(f"{pid} judged twice")
                    continue
                if v.get("verdict") not in ("confirmed", "plausible", "no_evidence", "contradicted"):
                    problems.append(f"{pid} has verdict {v.get('verdict')!r}")
                    continue
                results = cands[pid]["results"]
                ev = []
                for e in v.get("evidence") or []:
                    r = e.get("r")
                    if not isinstance(r, int) or not 1 <= r <= len(results):
                        problems.append(f"{pid} cites r{r}, which does not exist")
                        continue
                    ev.append({"url": results[r - 1]["url"], "quote": e.get("quote", "")})
                out[pid] = {"id": pid, "verdict": v["verdict"], "kind": v.get("kind") or "unclear", "evidence": ev,
                            "note": v.get("note", ""), "judged_by": JUDGE}
    with open(os.path.join(DIR, "mechanical.jsonl"), encoding="utf-8") as fh:
        for m in map(json.loads, fh):
            if m["place_id"] in out:
                problems.append(f"{m['place_id']} both judged and settled mechanically")
                continue
            out[m["place_id"]] = {"id": m["place_id"], "verdict": "no_evidence", "kind": "unclear", "evidence": [],
                                  "note": m["reason"], "judged_by": "mechanical pass (prefilter_candidates.py)"}
    unjudged = sorted(set(cands) - set(out))
    if a.complete and unjudged:
        problems.append(f"{len(unjudged)} candidates have no verdict, e.g. {unjudged[:5]}")
    with open(a.out, "w", encoding="utf-8") as fh:
        for pid in sorted(out):
            fh.write(json.dumps(out[pid], ensure_ascii=False) + "\n")
    print(f"{len(out)} places with a verdict ({sum(1 for p in out if p in cands)} judged by Claude, "
          f"{sum(1 for p in out if p not in cands)} mechanical); {len(unjudged)} candidates unjudged")
    for p in problems:
        print("PROBLEM", p)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
