#!/usr/bin/env python3
"""Fail loudly if a book-notes file carries a bullet-head **id** that is not a real archive row.

RULE 4 invariant for the book-queue notes stage (TAKEAWAYS_PROTOCOL.md Pass 1 and Pass 2).
The protocol's shape is "an archive id goes in bold at the head of its bullet", so this checks
exactly that position -- `- **<id>**` (Pass 1) and `### **<id>**` / `### <id> -- name` (Pass 2) --
and ignores bold used mid-sentence for emphasis.

It ALSO scans backticked `<id>` tokens anywhere in the file -- the "withheld / considered"
lists the notes keep under Doubts -- but only reports one that is a NEAR-MISS of a real row
(difflib ratio >= 0.85), so ordinary backticked prose (`text-layer?`, `urs`, a filename) is
never flagged. Those lists are not decoration: decision (a) (whether a bare toponym takes an
id) will be executed FROM them, so a misspelt id there is a silent failure at reversal time.

  exit 0  every bullet-head id resolves, and no backticked token looks like a misspelt id
  exit 2  a bullet-head id does not resolve (printed, with the files that carry it)
  exit 3  bullet heads are clean but a backticked token is a near-miss of a real id

History: the first version of this check keyed on "looks like a slug" and skipped any token with
fewer than two hyphens, so it silently passed over `golra-sharif` and `sial-sharif` -- two real
ids -- while reporting itself green. A check that cannot see a whole class of the thing it checks
is worse than none. Anchor on position, not on the shape of the string.

Third instance of that same lesson, 20 September 2026 (HANDOVER 9.216): three boivin workers
wrote `shrine-of-makhdoom-jahaniyyan-jahangasht` -- the book's prose spells the saint
"Jahaniyyan" with two y's, the archive row is `shrine-of-makhdoom-jahaniyan-jahangasht` with
one. The bullet-head check caught it (measured: exit 2). The SAME misspelling also sat in a
backticked withheld-id list in the same three files, where this check was blind and reported
"OK" (measured). Hence the near-miss scan below.

Fourth instance, 22 September 2026 (HANDOVER 9.223), created by ruling (a) itself. A bullet head
may now carry 35 ids (Lahore), which no author keeps on one 900-character line: chunk 003 of
schimmel_as_through_a_veil wrapped its Lahore head over twelve lines. This script read line by
line, so it validated the three ids on the bullet's first line, was blind to the other 28, and
printed "OK -- every bullet-head id resolves" at exit 0. Measured that day: 12 ids seen where a
continuation-aware scan sees 44. Same lesson a fourth time, and this time the blind spot was
opened by a change in the WRITING convention, not by a bug in the pattern -- so the fix is to
join each bullet with its continuation lines BEFORE reading the leading bold run.

Usage: check_note_ids.py <shrine_index.tsv> <notes_file> [notes_file ...]
"""
import difflib, re, sys

if len(sys.argv) < 3:
    sys.exit(__doc__)
idx_path, files = sys.argv[1], sys.argv[2:]

# RULE 4 guard, added 20 September 2026 (HANDOVER 9.219). The argc<3 test above passes
# happily when the caller forgets the index and supplies only notes files -- argv[1] is then
# a .notes.md, which this script parses as if it were the index. Measured that day: eleven
# notes files and no index produced "716 rows with an id, 0 with an EMPTY id cell", every one
# of eighteen VALID ids reported as UNKNOWN, and "10 file(s)" instead of 11. That is a false
# RED that reads exactly like catastrophic data loss, and it is the mirror of the false GREEN
# in this file's History note. A check whose own inputs can be silently wrong is not a check.
if not idx_path.endswith('.tsv'):
    sys.exit("check_note_ids.py: first argument must be the shrine index .tsv, got %r\n"
             "Usage: check_note_ids.py <shrine_index.tsv> <notes_file> [notes_file ...]" % idx_path)
with open(idx_path, encoding='utf-8') as _fh:
    _hdr = _fh.readline().rstrip('\n\r').split('\t')
if _hdr[:2] != ['id', 'name']:
    sys.exit("check_note_ids.py: %r is not the shrine index -- header starts %r, expected "
             "['id', 'name']\nUsage: check_note_ids.py <shrine_index.tsv> <notes_file> ..."
             % (idx_path, _hdr[:2]))

ids, empty_id_rows = set(), []
with open(idx_path, encoding='utf-8') as fh:
    fh.readline()                                   # header
    for line in fh:
        if not line.strip():
            continue
        cols = line.rstrip('\n').split('\t')
        (ids.add(cols[0].strip()) if cols[0].strip()
         else empty_id_rows.append(cols[1] if len(cols) > 1 else '?'))

# A bullet head may carry SEVERAL ids: "- **a**, **b** and **c** -- fact".
# Anchoring on the FIRST bold token only made this check blind to ids 2..n.
# That is not hypothetical: rizvi chunks 024/025/027 write the eighteen Guru Nanak
# rows as one combined bullet, so eighteen ids per file sat in a position the check
# could not see, and a probe bullet carrying a fabricated second id passed green
# (measured 19 September 2026, HANDOVER 9.212). Same lesson as the first version's
# two-hyphen bug: a check that cannot see a whole class of the thing it checks is
# worse than none. Consume the whole leading run of bold tokens.
RUN = re.compile(r'\*\*([^*]+)\*\*(?:\s*(?:,|/|&|and)\s*)?')

# A line that begins a NEW bullet -- used to decide where a wrapped bullet head ends.
BULLET_START = re.compile(r'^\s*[-*]\s+')

HEADS = (
    (re.compile(r'^\s*[-*]\s+(?=\*\*)'), True),       # - **id**, **id2** ...: fact
    (re.compile(r'^#{2,4}\s+(?=\*\*)'), True),         # ### **id**
    (re.compile(r'^#{2,4}\s+([a-z0-9][a-z0-9-]+)\s+[-—]'), False),  # ### id - Name
)


def head_tokens(line):
    """Every id-position token at the head of this line (may be several)."""
    for pat, is_run in HEADS:
        m = pat.match(line)
        if not m:
            continue
        if not is_run:
            return [m.group(1).strip()]
        rest, toks, pos = line[m.end():], [], 0
        while True:
            mm = RUN.match(rest, pos)
            if not mm:
                break
            toks.append(mm.group(1).strip())
            pos = mm.end()
        return toks
    return []

def logical_lines(path):
    """Yield each line with its continuation lines appended.

    A bullet head carrying many ids (ruling (a): Lahore is 35 rows) wraps in any sane editor.
    A continuation is an indented line that does not itself start a new bullet or a heading.
    Without this, every id past the first physical line sits in a position this check cannot
    see -- the exact failure recorded as the fourth instance in this file's docstring.
    """
    raw = open(path, encoding='utf-8').read().split('\n')
    i = 0
    while i < len(raw):
        buf, j = raw[i], i + 1
        if BULLET_START.match(raw[i]):
            while (j < len(raw) and raw[j].startswith((' ', '\t'))
                   and not BULLET_START.match(raw[j])
                   and not raw[j].lstrip().startswith('#')):
                buf += ' ' + raw[j].strip()
                j += 1
        yield buf
        i = j


used, unknown = {}, {}
for f in files:
    for line in logical_lines(f):
        for tok in head_tokens(line):
            if tok in ids:
                used.setdefault(tok, set()).add(f)
            elif re.fullmatch(r'[a-z0-9][a-z0-9-]{3,}', tok):
                # lowercase-hyphen token in id position that is not a row
                unknown.setdefault(tok, set()).add(f)

print(f"shrine_index.tsv: {len(ids)} rows with an id, "
      f"{len(empty_id_rows)} with an EMPTY id cell {empty_id_rows}")
print(f"{len(files)} file(s); {len(used)} distinct archive ids used at a bullet head:")
for tok in sorted(used):
    print(f"  {tok}  ({len(used[tok])} file(s))")
if unknown:
    print("\nUNKNOWN IDS in id position -- not in shrine_index.tsv:", file=sys.stderr)
    for tok, fs in sorted(unknown.items()):
        print(f"  {tok}: {sorted(fs)}", file=sys.stderr)
    sys.exit(2)
print("\nOK -- every bullet-head id resolves to a row in shrine_index.tsv")

# --- backticked withheld/considered ids: flag only NEAR-MISSES of a real row ---------------
# A misspelt id in a Doubts list is invisible to the bullet-head check above, and those lists
# are exactly what a decision-(a) reversal is executed from. Requiring a high similarity to a
# real id keeps ordinary backticked prose out of the report.
TICK = re.compile(r'`([a-z0-9][a-z0-9-]{5,})`')
near = {}
for f in files:
    for tok in set(TICK.findall(open(f, encoding='utf-8').read())):
        if tok in ids or '-' not in tok:
            continue
        m = difflib.get_close_matches(tok, ids, n=1, cutoff=0.85)
        if m:
            near.setdefault((tok, m[0]), set()).add(f)
print(f"backticked id-like tokens: {len(near)} near-miss(es) of a real row")
if near:
    print("\nSUSPECTED MISSPELT IDS in backticked lists -- not rows, but close to one:",
          file=sys.stderr)
    for (tok, best), fs in sorted(near.items()):
        print(f"  `{tok}`  ->  did you mean `{best}` ?  {sorted(fs)}", file=sys.stderr)
    sys.exit(3)
print("OK -- no backticked token looks like a misspelt archive id")
