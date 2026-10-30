"""
Export the database to the CSV shape the site build reads (the sheet's columns, in the sheet's
order, rows in sheet_row order), so `npm run data:build` sees exactly what it saw from the sheet.

  python pipeline/db/export_snapshot.py --out data/db-export/shrines-sheet.csv
  python pipeline/db/export_snapshot.py --verify-against sheet.csv   # cell-by-cell check, exit 1 on any difference

Description is written whole, without the Description 2..5 continuation columns: the build's join
loop stops at the first missing one, so the site receives the same text.

Connects as shrines_export, which can only read.
"""
import argparse, csv, io, sys
from pathlib import Path

from db import EXPORT_LOGIN, connect
from sheetmap import IMAGE_COLS, SHEET_TO_DB, join_description


def fetch(cur):
    cols = [v for v in SHEET_TO_DB.values() if v]
    cur.execute(f"SELECT {', '.join(cols)} FROM sites ORDER BY sheet_row")
    sites = [dict(zip(cols, r)) for r in cur.fetchall()]
    cur.execute("SELECT site_id, position, url FROM site_images")
    imgs = {}
    for sid, pos, url in cur.fetchall():
        imgs.setdefault(sid, {})[pos] = url
    out = []
    for s in sites:
        row = {}
        for h, col in SHEET_TO_DB.items():
            if col is None:
                v = imgs.get(s["id"], {}).get(IMAGE_COLS.index(h) + 1)
            else:
                v = s[col]
            row[h] = "" if v is None else str(v)
        out.append(row)
    return out


def verify(cur, sheet_rows):
    """Every cell of the sheet (continuations joined) against the database read back."""
    db_rows = fetch(cur)
    problems = []
    if len(db_rows) != len(sheet_rows):
        problems.append(f"{len(db_rows)} rows in the database, {len(sheet_rows)} in the sheet")
    for i, (d, s) in enumerate(zip(db_rows, sheet_rows), start=1):
        s = dict(s, Description=join_description(s))
        for h in SHEET_TO_DB:
            if d[h] != s[h]:
                problems.append(f"row {i} ({s.get('id')}) {h!r}: sheet {s[h][:60]!r} vs db {d[h][:60]!r}")
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    ap.add_argument("--verify-against")
    a = ap.parse_args()
    c = connect(EXPORT_LOGIN)
    c.set_session(readonly=True)
    cur = c.cursor()
    if a.verify_against:
        sheet = list(csv.DictReader(open(a.verify_against, encoding="utf-8", newline="")))
        problems = verify(cur, sheet)
        if problems:
            sys.exit(f"{len(problems)} differences:\n  " + "\n  ".join(problems[:40]))
        print(f"database equals {a.verify_against} cell for cell ({len(sheet)} rows)")
    if a.out:
        rows = fetch(cur)
        buf = io.StringIO(newline="")
        w = csv.DictWriter(buf, fieldnames=list(SHEET_TO_DB), lineterminator="\r\n")
        w.writeheader()
        w.writerows(rows)
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text(buf.getvalue(), encoding="utf-8", newline="")
        print(f"wrote {a.out}: {len(rows)} rows")


if __name__ == "__main__":
    main()
