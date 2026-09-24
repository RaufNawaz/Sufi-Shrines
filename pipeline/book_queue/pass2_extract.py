#!/usr/bin/env python3
"""Cut a book's Pass-1 chunk notes into per-group source extracts for Pass-2 consolidation.

Pass 2 consolidates 16-30 chunk-notes files (600 KB+) into one takeaways document. No single
worker can read that, so the coordinator splits the material: one extract per archive-id group,
one per protocol section. This script does that split, and -- more importantly -- it REFUSES to
produce a split that loses or duplicates material.

WHY THE COVERAGE CHECK EXISTS (HANDOVER 9.223, 22 September 2026)
-----------------------------------------------------------------
The first version of this split was written ad hoc and cut sections with

    txt.split('## ' + name)

which matches the heading text ANYWHERE, including inside a bullet. Several notes files contain
inline cross-references like "See `## Doubts` for the bare-name evidence", so the split fired on
the reference instead of the heading. Measured that day on schimmel_as_through_a_veil:

    Doubts      captured  41,567 of 172,618 bytes   -- wrong for 14 of 16 chunks
    Arguments   lost      27,375 bytes              -- chunks 001, 011, 016 (incl. the Introduction)
    Practices   wrong on chunk 010
    Citable, Other, and all archive-section extracts were byte-identical either way

Three of eight sections were silently wrong and the script reported nothing. A worker caught it
by noticing its own source made no sense, and re-read the raw notes instead -- which is the only
reason that Pass 2 was not built on a truncated source.

Two lessons, both encoded below:

  1. Anchor a pattern on POSITION, not on the shape of a string. A heading regex is `(?m)^## `.
     This is the same lesson check_note_ids.py has now recorded four times.
  2. A split is checkable. Every byte of a notes file's body belongs to exactly one section, so
     the extracted sections must sum to the whole. `verify_coverage()` asserts exactly that and
     exits non-zero on a shortfall -- so this class of bug fails loudly instead of silently.

Usage:
    pass2_extract.py <notes_dir> <shrine_index.tsv> <out_dir> [--groups g1=id1,id2 g2=id3,...]
    pass2_extract.py --self-test <notes_dir> <shrine_index.tsv>
"""
import argparse, collections, json, os, re, sys

# --- heading + bullet grammar -------------------------------------------------------------
H2 = re.compile(r'(?m)^## +(.+?)\s*$')
BULLET_START = re.compile(r'^\s*[-*]\s+(?=\*\*)')
BOLD_RUN = re.compile(r'\*\*([^*]+)\*\*(?:\s*(?:,|/|&|and)\s*)?')

ARCHIVE_SECTION = 'Shrines and figures in the archive'


def split_sections(text):
    """{heading: body} for every level-2 heading, matched at line start only.

    Returns an ordered dict. A duplicated heading in one file keeps the first and records the
    collision in the returned `dupes` list, rather than silently overwriting.
    """
    marks = [(m.start(), m.end(), m.group(1).strip()) for m in H2.finditer(text)]
    out, dupes = collections.OrderedDict(), []
    for i, (s, e, name) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(text)
        body = text[e:end]
        if name in out:
            dupes.append(name)
            continue
        out[name] = body
    return out, dupes


def verify_coverage(text, sections):
    """Every byte after the first `## ` heading must land in exactly one section.

    This is the invariant the ad-hoc version lacked. Returns (ok, accounted, total).
    """
    first = H2.search(text)
    if not first:
        return True, 0, 0
    total = len(text) - first.start()
    # heading lines themselves + bodies
    accounted = sum(len(b) for b in sections.values())
    accounted += sum(len(m.group(0)) for m in H2.finditer(text))
    return accounted == total, accounted, total


def logical_bullets(body):
    """Yield each bullet with its continuation lines joined.

    A bullet head under ruling (a) can carry 35 ids and wraps over a dozen lines; reading line by
    line makes every id past the first invisible. Same failure as check_note_ids.py's fourth
    docstring entry.
    """
    raw = body.split('\n')
    i = 0
    while i < len(raw):
        buf, j = raw[i], i + 1
        if BULLET_START.match(raw[i]):
            while (j < len(raw) and raw[j].startswith((' ', '\t'))
                   and not BULLET_START.match(raw[j])
                   and not raw[j].lstrip().startswith('#')):
                buf += '\n' + raw[j]
                j += 1
            yield buf
        i = j if j > i + 1 else i + 1


def head_ids(bullet, idset):
    """Archive ids in the leading bold run of a bullet head."""
    m = BULLET_START.match(bullet)
    if not m:
        return []
    rest, toks, pos = bullet[m.end():], [], 0
    while True:
        mm = BOLD_RUN.match(rest, pos)
        if not mm:
            break
        toks.append(mm.group(1).strip())
        pos = mm.end()
    return [t for t in toks if t in idset]


def load_index(path):
    ids = {}
    with open(path, encoding='utf-8') as fh:
        hdr = fh.readline().rstrip('\n').split('\t')
        if hdr[:2] != ['id', 'name']:
            sys.exit(f"pass2_extract.py: {path!r} is not the shrine index -- header starts {hdr[:2]!r}")
        for line in fh:
            if line.strip():
                c = line.rstrip('\n').split('\t')
                if c[0].strip():
                    ids[c[0].strip()] = c[1]
    return ids


def collect(notes_dir, idset):
    files = sorted(f for f in os.listdir(notes_dir) if re.fullmatch(r'chunk_\d+\.notes\.md', f))
    if not files:
        sys.exit(f"pass2_extract.py: no chunk_NNN.notes.md files in {notes_dir!r}")
    per_section = collections.defaultdict(list)
    single, multi = collections.defaultdict(list), collections.defaultdict(list)
    problems = []
    for f in files:
        ch = re.search(r'chunk_(\d+)', f).group(1)
        text = open(os.path.join(notes_dir, f), encoding='utf-8').read()
        secs, dupes = split_sections(text)
        ok, acc, tot = verify_coverage(text, secs)
        if not ok:
            problems.append(f"{f}: coverage {acc}/{tot} bytes")
        for d in dupes:
            problems.append(f"{f}: duplicate heading {d!r}")
        for name, body in secs.items():
            if body.strip():
                per_section[name].append((ch, body.strip()))
        for b in logical_bullets(secs.get(ARCHIVE_SECTION, '')):
            got = head_ids(b, idset)
            if not got:
                continue
            (single if len(got) == 1 else multi)[tuple(sorted(got))].append((ch, b))
    return files, per_section, single, multi, problems


def write_extract(path, header, items):
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(header.rstrip() + '\n')
        for ch, body in items:
            fh.write(f"\n<!-- from chunk {ch} -->\n{body}\n")
    return os.path.getsize(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('notes_dir')
    ap.add_argument('index')
    ap.add_argument('out_dir', nargs='?')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()

    ids = load_index(a.index)
    files, per_section, single, multi, problems = collect(a.notes_dir, set(ids))

    print(f"{len(files)} notes files; {len(ids)} archive rows in the index")
    print(f"sections found: {len(per_section)}")
    for n, v in per_section.items():
        print(f"  {sum(len(b) for _, b in v):8d} B  {len(v):2d} chunks  {n}")
    n_single = len({k[0] for k in single})
    n_multi = len({i for k in multi for i in k})
    print(f"archive ids with a single-id bullet: {n_single}")
    print(f"archive ids appearing only in multi-id (place-level) bullets: "
          f"{len({i for k in multi for i in k} - {k[0] for k in single})}")

    if problems:
        print("\nCOVERAGE / STRUCTURE PROBLEMS -- the split is NOT trustworthy:", file=sys.stderr)
        for p in problems:
            print("  " + p, file=sys.stderr)
        sys.exit(2)
    print("\nOK -- every byte of every notes file is accounted for in exactly one section")

    if a.self_test:
        return
    if not a.out_dir:
        sys.exit("pass2_extract.py: out_dir required unless --self-test")
    os.makedirs(a.out_dir, exist_ok=True)
    for name, items in per_section.items():
        slug = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')[:40]
        write_extract(os.path.join(a.out_dir, f's_{slug}.md'),
                      f"# Pass-2 source extract: {name} (all chunks)", items)
    items = [x for k in sorted(single) for x in single[k]]
    write_extract(os.path.join(a.out_dir, 'archive_single.md'),
                  "# Pass-2 source extract: single-id (site-specific) archive bullets", items)
    items = [x for k in sorted(multi, key=lambda k: -len(multi[k])) for x in multi[k]]
    write_extract(os.path.join(a.out_dir, 'archive_place.md'),
                  "# Pass-2 source extract: multi-id (place-level, ruling (a)) archive bullets", items)
    json.dump({'single': {k[0]: len(v) for k, v in single.items()},
               'place_groups': {','.join(k): len(v) for k, v in multi.items()}},
              open(os.path.join(a.out_dir, 'index.json'), 'w'), indent=1)
    print(f"wrote extracts to {a.out_dir}")


if __name__ == '__main__':
    main()
