#!/usr/bin/env python3
"""Extract the DEFERRED MAPPINGS out of a book's Pass-2 `s_doubts.md` extract.

Why this exists (HANDOVER 9.233, 24 September 2026)
---------------------------------------------------
BOOK_QUEUE_TASK.md says notes written before 21 September name under Doubts the archive row a
reversal of ruling (a) would take, and that the conversion happens at Pass 2. Workers since have
kept the same discipline for every decline they make -- imprint cities, bare index entries,
name-element toponyms -- each one enumerating its ids on one physical line so the reversal is one
step. Nobody had ever handed a Pass-2 worker those lines.

On the 24 September run a twelve-line ad-hoc extractor over `s_doubts.md` produced 34 deferred
mappings for `sorley_shah_abdul_latif_of_bhit` (27,881 B) and 46 for `boivin_hindu_sufis_south_asia`
(37,163 B). That is the difference between a Pass-2 worker reading 385 KB of Doubts on the
off-chance and reading 28 KB that is all signal -- and `sorley/archive_place.md` was 76 bytes,
EMPTY, so every one of that book's 15 multi-id bullets came out of this extract and nothing else.

That script lived only in a cloud container and §9.233 predicted it would otherwise be
rediscovered. This is it, committed (CLAUDE.md RULE 0).

It is deliberately a SEPARATE script rather than a ninth extract inside pass2_extract.py, because
pass2_extract.py's contract is that every byte of every notes file lands in exactly one output
(`verify_coverage`). Hedges are a SECOND view of bytes that already live in `s_doubts.md`, so
folding them in would break that invariant, which is the one thing that script exists to protect.

Usage:
    pass2_hedges.py <pass2_dir>            # reads <pass2_dir>/s_doubts.md, writes <pass2_dir>/hedges.md
    pass2_hedges.py <pass2_dir> --pattern '...'   # override the match
"""
import argparse, os, re, sys

DEFAULT = (r'bare toponym|toponym|ruling \(a\)|reversal|would take|person-level|place-level|'
           r'not mapped|non-mapping|declin|imprint|index entry|pointer, not a statement')

CHUNK_MARK = re.compile(r'(?m)^<!-- from chunk (\d+) -->\s*$')


def logical_bullets(body):
    """Split on bullet starts at line level; a wrapped bullet stays one item.

    A bullet is a line beginning with '-' or '*' at any indent; its continuation lines are the
    following lines that do NOT start a new bullet and are not a heading or a chunk marker.
    """
    out, cur = [], []
    for line in body.splitlines():
        if re.match(r'^\s{0,3}[-*]\s+\S', line) or line.startswith('#') or CHUNK_MARK.match(line):
            if cur:
                out.append('\n'.join(cur))
            cur = [line]
        else:
            if cur:
                cur.append(line)
    if cur:
        out.append('\n'.join(cur))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pass2_dir')
    ap.add_argument('--pattern', default=DEFAULT)
    ap.add_argument('--source', default='s_doubts.md')
    a = ap.parse_args()

    src = os.path.join(a.pass2_dir, a.source)
    if not os.path.exists(src):
        sys.exit(f"pass2_hedges.py: no {a.source} in {a.pass2_dir!r} -- run pass2_extract.py first")
    pat = re.compile(a.pattern, re.I)

    text = open(src, encoding='utf-8').read()
    chunk, kept, total = '???', [], 0
    for item in logical_bullets(text):
        m = CHUNK_MARK.match(item)
        if m:
            chunk = m.group(1)
            continue
        if item.startswith('#'):
            continue
        total += 1
        if pat.search(item):
            kept.append((chunk, item))

    out = os.path.join(a.pass2_dir, 'hedges.md')
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write("# Deferred mappings and declines, pulled from the Doubts sections\n")
        fh.write(f"# source: {a.source}; pattern: {a.pattern}\n")
        fh.write("# Each item is a line a Pass-1 worker wrote INSTEAD of firing a mapping. The ids\n"
                 "# are enumerated so a reversal is one step. DO NOT reverse one on your own\n"
                 "# judgement -- the imprint-city, province-join and bare-index-entry questions are\n"
                 "# Rauf's to rule (CLAUDE.md RULE 5). Carry them into 'Doubts and review points'.\n")
        last = None
        for ch, item in kept:
            if ch != last:
                fh.write(f"\n<!-- from chunk {ch} -->\n")
                last = ch
            fh.write(item.rstrip() + '\n')
    print(f"{len(kept)} of {total} Doubts bullets matched; wrote {out} ({os.path.getsize(out)} B)")


if __name__ == '__main__':
    main()
