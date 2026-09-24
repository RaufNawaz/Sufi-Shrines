#!/usr/bin/env python3
"""Find a book's printed folio and the PDF->folio offset, and CHECK the answer before trusting it.

A folio is the page number the book itself prints. The archive cites facts as `(p. N, folio F)`,
so getting F right matters, and getting it wrong is worse than omitting it.

WHY THIS EXISTS (HANDOVER 9.213, 9.217, 9.218, 9.221, 9.223)
------------------------------------------------------------
Five runs have now derived a folio rule by eye and four have had to be corrected. The failures
were not arithmetic, they were instrument failures:

  * abbas: the measurement said "this book prints no folio" because only one isolated numeric
    line existed in the whole text layer. A rendered page image showed a folio on EVERY page --
    dropped by the same oldstyle-figure font that dropped the dates. Right instruction, wrong reason.
  * schimmel_as_through_a_veil: a `\\d{1,3}` scan found 4 folios in 382 pages. The folio was not
    missing; it was (a) inside the running-header line, not alone, and (b) split by a space on
    every three-digit page -- `1 10`, `12 1`, `35 6`. A tolerant scan found 340.
  * khulasat: the hundreds digit was wrong on 14 of 66 pages (9.222) -- the same split-digit class
    in a different script and route, which is why this script treats it as the default, not a quirk.

So this probe looks in three positions, tolerates split digits, and then applies a check the
book itself supplies for free:

    THE PARITY RULE. In a conventionally imposed book the folio sits on the OUTER edge, so a
    verso (even) folio leads its running header and a recto (odd) folio trails it. On
    schimmel_as_through_a_veil this held 340/340 with zero violations. A leading ODD number is
    therefore not a folio -- it is a chapter number, a date, a footnote marker or noise.

The parity rule costs nothing, needs no page image, and catches the class of error that produced
four corrections. It is not proof: verify against a rendered page image before briefing workers
(`pdftoppm -r 110 -png -f P -l P`), which is also how you find out whether a `[blank page]` is
actually an unpaginated PLATE -- eight of them were, in one book (`pdfimages -list -f A -l B`).

Usage:  folio_probe.py <chunks_dir_or_file> [--show N]
"""
import argparse, collections, glob, os, re, sys

PAGE = re.compile(r'\[p\. (\d+)\]')
# a number whose digits may be separated by single spaces: "1 10" -> 110
NUM = r'(\d(?:\s?\d){0,3})'
LEAD = re.compile(r'^' + NUM + r'\s{2,}(\S.*)$')
TRAIL = re.compile(r'^(.*\S)\s{2,}' + NUM + r'$')
ALONE = re.compile(r'^' + NUM + r'$')


def load(path):
    if os.path.isdir(path):
        text = ''.join(open(f, encoding='utf-8').read()
                       for f in sorted(glob.glob(os.path.join(path, 'chunk_*.txt'))))
    else:
        text = open(path, encoding='utf-8').read()
    parts = PAGE.split(text)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts) - 1, 2)}


def first_line(body):
    for l in body.split('\n'):
        if l.strip():
            return l.strip()
    return ''


def probe(pages):
    rows, blanks, noheader = {}, [], []
    for n, body in sorted(pages.items()):
        fl = first_line(body)
        if not fl:
            blanks.append(n); continue
        if fl == '[blank page]':
            blanks.append(n); continue
        for rx, pos in ((ALONE, 'alone'), (LEAD, 'lead'), (TRAIL, 'trail')):
            m = rx.match(fl)
            if not m:
                continue
            raw = m.group(1) if pos != 'trail' else m.group(2)
            rows[n] = (int(raw.replace(' ', '')), pos, raw, fl[:48])
            break
        else:
            noheader.append((n, fl[:60]))
    return rows, blanks, noheader


def zones(rows):
    """Contiguous runs of constant (folio - pdf) offset."""
    out = []
    for n in sorted(rows):
        off = rows[n][0] - n
        if out and out[-1][2] == off:
            out[-1][1] = n
        else:
            out.append([n, n, off])
    return [z for z in out if z[1] - z[0] >= 2]   # drop one-off noise


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path'); ap.add_argument('--show', type=int, default=0)
    a = ap.parse_args()
    pages = load(a.path)
    if not pages:
        sys.exit("folio_probe.py: no [p. N] markers found")
    rows, blanks, noheader = probe(pages)
    tot = len(pages)
    print(f"pages with a [p. N] marker : {tot}")
    print(f"folio candidates found     : {len(rows)}  ({100*len(rows)//max(tot,1)}%)")
    print(f"[blank page] / empty       : {len(blanks)}  {blanks if len(blanks)<=20 else ''}")
    print(f"no header line             : {len(noheader)}")

    pos = collections.Counter(v[1] for v in rows.values())
    print(f"positions                  : {dict(pos)}")
    split = [v[2] for v in rows.values() if ' ' in v[2]]
    print(f"space-split digit folios   : {len(split)}  e.g. {split[:6]}")

    print("\n-- PARITY SELF-CHECK (lead=even, trail=odd) --")
    checked = [(n, v) for n, v in rows.items() if v[1] in ('lead', 'trail')]
    bad = [(n, v[0], v[1]) for n, v in checked if (v[1] == 'lead') != (v[0] % 2 == 0)]
    if not checked:
        print("  n/a -- no header-embedded folios")
    else:
        print(f"  checked {len(checked)}, violations {len(bad)}"
              f"  -> {'PASS, the folio reading is self-consistent' if not bad else 'FAIL'}")
        for n, f, p in bad[:10]:
            print(f"    PDF {n}: folio {f} in {p} position")

    print("\n-- OFFSET ZONES (folio = PDF + offset) --")
    zs = zones(rows)
    for lo, hi, off in zs:
        print(f"  PDF {lo:4d}-{hi:4d}   offset {off:+4d}   ({hi-lo+1} pages)")
    for i in range(len(zs) - 1):
        gap_lo, gap_hi = zs[i][1] + 1, zs[i + 1][0] - 1
        step = zs[i + 1][2] - zs[i][2]
        gap = gap_hi - gap_lo + 1
        if gap > 0:
            inblank = sum(1 for p in range(gap_lo, gap_hi + 1) if p in blanks)
            note = ("  <-- step equals the gap: an UNPAGINATED insert (check `pdfimages -list` "
                    "-- it may be PLATES, not blanks)") if step == -gap else ""
            print(f"  gap PDF {gap_lo}-{gap_hi} ({gap} pages, {inblank} marked blank), "
                  f"offset steps {step:+d}{note}")

    if a.show:
        print(f"\n-- first {a.show} readings --")
        for n in sorted(rows)[:a.show]:
            f, p, raw, hdr = rows[n]
            print(f"  PDF {n:4d} folio {f:4d} {p:5s} off {f-n:+4d}  raw={raw!r}  {hdr!r}")

    print("\nVERIFY AGAINST A RENDERED PAGE before briefing workers:")
    print("  pdftoppm -r 110 -png -f <PDF> -l <PDF> -gray <book.pdf> /tmp/pg")
    if blanks:
        print(f"  pdfimages -list -f {blanks[0]} -l {blanks[-1]} <book.pdf>   # are the blanks plates?")


if __name__ == '__main__':
    main()
