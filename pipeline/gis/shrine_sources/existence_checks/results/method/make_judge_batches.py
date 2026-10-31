"""Write the candidate places (prefilter_candidates.py) not yet judged into compact batch files for the
Claude judges: numbered results, no URLs (judges cite r1, r2...; collect_judgements.py maps them back).

  python make_judge_batches.py --size 60
"""
import argparse
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, "workspace", "out", "claude_judge")


def judged():
    ids = set()
    for f in glob.glob(os.path.join(DIR, "verdicts", "*.jsonl")):
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                try:
                    ids.add(json.loads(line)["id"])
                except (json.JSONDecodeError, KeyError):
                    pass
    return ids


def render(c):
    lines = [f"### {c['id']} | names: {' / '.join(c['names'])} | tradition: {c['tradition']} | "
             f"district: {c['district']}, {c['province']} | database: {c['database']}"]
    for i, r in enumerate(c["results"], 1):
        d = f", {r['distance_m']} m" if r["distance_m"] is not None else ""
        snip = f" :: {r['snippet']}" if r["snippet"] else ""
        lines.append(f"r{i} [{r['api']}{d}] {r['title']}{snip}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=60)
    a = ap.parse_args()
    os.makedirs(os.path.join(DIR, "batches"), exist_ok=True)
    os.makedirs(os.path.join(DIR, "verdicts"), exist_ok=True)
    done = judged()
    pending = {os.path.basename(f) for f in glob.glob(os.path.join(DIR, "batches", "*.txt"))
               if not os.path.exists(os.path.join(DIR, "verdicts", os.path.basename(f)[:-4] + ".jsonl"))}
    in_pending = set()
    for f in pending:
        with open(os.path.join(DIR, "batches", f), encoding="utf-8") as fh:
            in_pending |= {l.split(" | ")[0][4:] for l in fh if l.startswith("### ")}
    with open(os.path.join(DIR, "candidates.jsonl"), encoding="utf-8") as fh:
        todo = [c for c in map(json.loads, fh) if c["id"] not in done and c["id"] not in in_pending]
    n0 = len(glob.glob(os.path.join(DIR, "batches", "*.txt")))
    made = []
    for k in range(0, len(todo), a.size):
        name = f"batch_{n0 + len(made) + 1:03d}"
        with open(os.path.join(DIR, "batches", name + ".txt"), "w", encoding="utf-8") as fh:
            fh.write("\n\n".join(render(c) for c in todo[k:k + a.size]) + "\n")
        made.append(name)
    print(f"{len(todo)} places in {len(made)} new batches: {', '.join(made)}; {len(pending)} batches still unjudged")


if __name__ == "__main__":
    main()
