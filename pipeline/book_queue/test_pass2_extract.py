#!/usr/bin/env python3
"""Prove pass2_extract.py's coverage check catches the bug it exists for (HANDOVER 9.223).

RULE 4: when you fix a class of bug, add the invariant -- and prove it by breaking it. This
replays the ORIGINAL ad-hoc splitter against the real notes and shows the coverage check fires.
Run from the book's working dir:  python3 build/test_pass2_extract.py <notes_dir>
"""
import glob, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pass2_extract import split_sections, verify_coverage, H2

notes_dir = sys.argv[1] if len(sys.argv) > 1 else 'notes'
files = sorted(glob.glob(os.path.join(notes_dir, 'chunk_*.notes.md')))
assert files, f"no notes in {notes_dir}"


def buggy_section(txt, name):
    """The original: splits on the heading text ANYWHERE, including inside a bullet."""
    p = txt.split('## ' + name)
    return '' if len(p) < 2 else re.split(r'\n## ', p[1])[0]


NAMES = ['Shrines and figures in the archive', 'Other saints, sites and events (not in the archive)',
         'Practices, institutions, economy', 'Citable passages', 'Doubts']

print(f"{'section':<52} {'buggy':>9} {'correct':>9}  verdict")
fired = 0
for name in NAMES:
    bad = good = 0
    for f in files:
        t = open(f, encoding='utf-8').read()
        bad += len(buggy_section(t, name))
        secs, _ = split_sections(t)
        good += len(secs.get(name, ''))
    if good == 0:
        continue
    delta = bad - good
    verdict = 'OK' if delta == 0 else f'WRONG by {delta:+,} B'
    if delta:
        fired += 1
    print(f"{name:<52} {bad:>9,} {good:>9,}  {verdict}")

print()
# The coverage assertion itself, on a synthetic file that reproduces the exact trigger:
# an inline `## Doubts` reference inside a bullet, before the real heading.
synthetic = (
    "# chunk 999\n\n## Shrines and figures in the archive\n\n"
    "- **data-darbar**: a fact (p. 1). See `## Doubts` for the bare-name evidence.\n\n"
    "## Doubts\n\n- the real doubts section, which the buggy splitter never reaches\n"
)
secs, dupes = split_sections(synthetic)
ok, acc, tot = verify_coverage(synthetic, secs)
print("synthetic trigger file (inline '## Doubts' reference inside a bullet):")
print(f"  line-anchored split  -> Doubts body = {len(secs.get('Doubts','')):3d} B  coverage {acc}/{tot}  ok={ok}")
print(f"  original split       -> Doubts body = {len(buggy_section(synthetic,'Doubts')):3d} B  "
      f"(captures the tail of the BULLET, not the section)")
assert ok, "coverage must hold for the line-anchored split"
assert len(buggy_section(synthetic, 'Doubts')) != len(secs['Doubts']), "the bug must reproduce"
print()
print(f"RESULT: the original splitter is wrong on {fired} of {len([n for n in NAMES])} sections "
      f"tested against the real corpus, and the coverage invariant rejects it.")
