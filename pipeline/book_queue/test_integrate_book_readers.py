#!/usr/bin/env python3
"""Invariants for integrate_book.py's opt-in readers added in the 12 Oct 2026 batch (HANDOVER 9.327).

RULE 4: each reader is proved on a synthetic takeaways file that has exactly the shape it exists for,
and each refusal is proved to fire. Run:  python3 pipeline/book_queue/test_integrate_book_readers.py
Exits non-zero on the first failure.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import integrate_book as ib

IDS = {'row-a', 'row-b', 'row-c'}

# --doubt-heads: bold-head bullet and bold-led paragraph attach to head ids only; body ids never do;
# a bold line in the middle of a paragraph is not an item start.
doubts = """## Doubts and review points

### 1. Things

- **`row-a` rests on one word** (p. 3). A body mention of `row-c` does not attach.
  continued line of the same item.
- **Name collisions:** the body names **row-b** only.

**row-b and its date.** Printed twice (p. 9).
Second line, which mentions row-c in the body.

Opening line of a paragraph with no bold head
**`row-c`**: a bold run mid-paragraph is not an item start.

## Next section
"""
L = doubts.split('\n')
d = ib.doubt_head_items(L, IDS)
assert set(d) == {'row-a', 'row-b'}, d
assert len(d['row-a']) == 1 and d['row-a'][0][1].startswith('  continued'), d['row-a']
assert len(d['row-b']) == 1 and d['row-b'][0][0].startswith('**row-b'), d['row-b']
print('doubt_head_items: OK')

# --group-lines: whole bullet copied, ids from the first line, name from the quotes, kind from the text
# or the override; "not attached" bullets dropped; a bullet with no bold id refuses.
groups = """### Place-level and person-level attachments

- **row-a**, **row-b** (the book's "Lahore") — **place-level.** material
  more material (p. 4).
- **row-c** (the book's `Shiva`, the one row):
  a fact (p. 5).
- **row-a** (the book's "Elsewhere") — not attached: a declined mapping.
"""
G = groups.split('\n')
res, dropped = ib.line_range_groups(G, '3-8', IDS, {5: 'person'})
assert dropped == 1, dropped
assert [(r[0], r[1], r[3]) for r in res] == [('Lahore', 'place', ['row-a', 'row-b']), ('Shiva', 'person', ['row-c'])], res
assert res[0][4][0].startswith('- **row-a**'), 'the head line is copied (inline treatment)'
try:
    ib.line_range_groups(G, '5-6', IDS)
    raise AssertionError('a bullet whose kind cannot be read must refuse')
except SystemExit:
    pass
try:
    ib.line_range_groups(['- **Karachi** text with no id', ''], '1-1', IDS)
    raise AssertionError('a bullet with no bold archive id must refuse')
except SystemExit:
    pass
print('line_range_groups: OK')

# --rows-line: `### Name — N rows` + `**Rows:**` line; the count must match.
rows = """## Place-level material (ruling (a))

### Lahore — 2 rows

**Rows:** `row-a`, `row-b`

- a fact (p. 7).

---

### Figure-level bullets (not place-level)
"""
R = rows.split('\n')
rg = ib.rows_line_groups(R, IDS)
assert [(g[0], g[1], g[3]) for g in rg] == [('Lahore', 'place', ['row-a', 'row-b'])], rg
assert not any(l.startswith('**Rows:**') for l in rg[0][4]), 'the Rows line is the join key, not copied'
try:
    ib.rows_line_groups(rows.replace('— 2 rows', '— 3 rows').split('\n'), IDS)
    raise AssertionError('a count mismatch must refuse')
except SystemExit:
    pass
print('rows_line_groups: OK')
print('ALL OK')
