#!/usr/bin/env python3
"""
reflow_descriptions.py — put back the newlines a TSV export stripped.

    python3 reflow_descriptions.py shrines_final_v2.csv shrines_reflowed.csv
    python3 reflow_descriptions.py shrines_final_v2.csv --report      # look, change nothing

WHAT THIS CAN AND CANNOT RECOVER

Recoverable with certainty:
  A markdown heading ("## Bibliography") can ONLY occur at the start of a line. If one
  appears mid-string, a newline was definitely removed, and its exact position is known.
  Same for bibliography list items: "- " directly after a heading or another citation.

NOT recoverable:
  Paragraph breaks *inside* a prose section. "…in 1857. The shrine was rebuilt…" is
  indistinguishable from "…in 1857.\n\nThe shrine was rebuilt…" once flattened. This
  script does NOT guess at those. A reflowed row therefore comes back structurally
  correct but with each section as one paragraph. That renders fine; it is just less
  airy than the original. Re-exporting from the sheet as CSV is the only true fix.

So this is a repair, not a restoration, and it says so per row.

SAFETY
  - Touches ONLY rows whose Description is long and contains no newline at all.
  - A row with no "##" marker cannot be reflowed; it is reported, not mangled.
  - Never alters any other column, the row count, or the column order.
  - Prints a before/after preview for every row it changes.
"""

import csv, re, sys

HEADING   = re.compile(r"\s*(##+)\s+")
BIB_MARK  = re.compile(r"##+\s*Bibliograph\w*", re.I)
# a citation item: whitespace, a dash, whitespace, then something that starts a title
BIB_ITEM  = re.compile(r"\s+[-*•]\s+(?=[A-Z“\"'*‘\d])")

MINLEN = 400


def reflow(desc):
    """Return (new_desc, n_headings, n_items) or (None, 0, 0) if nothing to do."""
    if "##" not in desc:
        return None, 0, 0

    # 1. every heading starts its own line, with a blank line before it
    out, n_head = HEADING.subn(lambda m: "\n\n" + m.group(1) + " ", desc)
    out = out.strip()

    # 2. inside the bibliography only, every citation starts its own line
    n_item = 0
    m = BIB_MARK.search(out)
    if m:
        head, tail = out[:m.end()], out[m.end():]
        tail, n_item = BIB_ITEM.subn("\n- ", tail)
        out = head + tail

    out = re.sub(r"\n{3,}", "\n\n", out).strip()
    return out, n_head, n_item


def main(argv):
    src = argv[0]
    report_only = "--report" in argv
    dst = None if report_only else (argv[1] if len(argv) > 1 else None)
    if not report_only and not dst:
        sys.exit(__doc__)

    delim = "\t" if src.lower().endswith((".tsv", ".tab")) else ","
    with open(src, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh, delimiter=delim)
        header = rdr.fieldnames
        rows = list(rdr)

    lower = {h.strip().lower(): h for h in header}
    D = lower.get("description")
    N = lower.get("name")
    if not D:
        sys.exit("no Description column")

    n_nl = sum(1 for r in rows if "\n" in (r[D] or ""))
    flat = [r for r in rows
            if (r[D] or "") and "\n" not in r[D] and len(r[D]) > MINLEN]

    print(f"{src}: {len(rows)} rows | {n_nl} already have newlines | "
          f"{len(flat)} long and flat\n")

    fixed, unfixable = [], []
    for r in flat:
        name = r.get(N, "?")
        new, nh, ni = reflow(r[D])
        if new is None:
            unfixable.append((name, len(r[D])))
            continue
        fixed.append((name, len(r[D]), nh, ni, r[D][:150], new))
        if not report_only:
            r[D] = new

    for name, ln, nh, ni, before, after in fixed:
        print("=" * 74)
        print(f"{name}   ({ln} chars)")
        print(f"  restored {nh} heading(s), {ni} bibliography item(s)")
        print("  BEFORE: " + before.replace("\n", "\\n")[:150])
        print("  AFTER:")
        for line in after.splitlines()[:8]:
            print("    " + (line[:96] if line else ""))
        rest = len(after.splitlines()) - 8
        if rest > 0:
            print(f"    … {rest} more line(s)")

    if unfixable:
        print("\n" + "=" * 74)
        print(f"CANNOT REFLOW ({len(unfixable)}) — no '##' marker, so there is no")
        print("evidence a newline was ever there. Possibly genuinely one paragraph.")
        for name, ln in unfixable:
            print(f"   {name}  ({ln} chars)")
        print("\nCheck these against the sheet by eye. If the sheet shows paragraphs,")
        print("re-export as CSV (not TSV) and rebuild — that recovers them properly.")

    print(f"\n{len(fixed)} reflowed, {len(unfixable)} left alone")

    if report_only:
        print("\n--report: nothing written.")
        return

    with open(dst, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader(); w.writerows(rows)
    print(f"wrote {dst}")

    still = [r.get(N) for r in rows
             if (r[D] or "") and "\n" not in r[D] and len(r[D]) > MINLEN]
    if still:
        print(f"\nNOTE: {len(still)} row(s) are still flat and will trip the guard in")
        print("finalise_sheet.py. Run that with --allow-flat once you have decided they")
        print("are genuinely single-paragraph:")
        for n in still:
            print(f"   {n}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
