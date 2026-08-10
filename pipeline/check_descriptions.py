#!/usr/bin/env python3
"""
check_descriptions.py <table.csv|tsv> [--min-rows 163]

Pipeline guard: asserts the table still carries real multi-line Descriptions.
Run after every pipeline step (rule: never ship a Description that has lost
its newlines).

Hard failures (exit 1):
  - row count below --min-rows
  - no Description column
  - the "Pak Daman" row's Description contains no newline
Also prints the multiline-description distribution for eyeballing drift.
"""
import csv, sys

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    min_rows = int(sys.argv[sys.argv.index("--min-rows") + 1]) if "--min-rows" in sys.argv else 163
    delim = "\t" if src.lower().endswith((".tsv", ".tab")) else ","
    with open(src, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter=delim))
    def col(row, name):
        for k in row:
            if k and k.strip().lower() == name:
                return row[k] or ""
        return ""
    fails = []
    if len(rows) < min_rows:
        fails.append(f"row count {len(rows)} < {min_rows}")
    if rows and all(col(r, "description") == "" for r in rows[:5]) and \
       "description" not in [c.strip().lower() for c in rows[0]]:
        fails.append("no Description column found")
    pak = [r for r in rows if "pak daman" in col(r, "name").lower()]
    if not pak:
        fails.append('no row with "Pak Daman" in Name')
    for r in pak:
        n = col(r, "description").count("\n")
        print(f'Pak Daman check: {col(r, "name")!r} -> {n} newlines in Description')
        if n == 0:
            fails.append("Pak Daman Description has 0 newlines (FLATTENED)")
    buckets = {"0": 0, "1-2": 0, "3-9": 0, "10+": 0}
    for r in rows:
        n = col(r, "description").count("\n")
        buckets["0" if n == 0 else "1-2" if n <= 2 else "3-9" if n <= 9 else "10+"] += 1
    print(f"{src}: rows={len(rows)}  Description newline buckets: {buckets}")
    if fails:
        print("FAIL:", "; ".join(fails))
        sys.exit(1)
    print("OK")

if __name__ == "__main__":
    main()
