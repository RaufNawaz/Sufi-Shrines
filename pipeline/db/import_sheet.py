"""
Load the Google Sheet into the database. Used for the first load and, until cutover, to refresh
the database from the sheet during the parallel run (docs/DATABASE.md).

  python pipeline/db/import_sheet.py --from-sheet          # the published CSV (data/csv-source.json)
  python pipeline/db/import_sheet.py --file path/to.csv     # a CSV export (CSV, never TSV: RULE 3)
  add --replace to reload a database that already holds rows

Refuses to:
  * load into a non-empty database without --replace;
  * --replace once any person has edited the database (a change_log row not made by the importer):
    from then on the database is the master and the sheet is the copy, so reloading would lose work;
  * load a sheet whose headers are not exactly the ones sheetmap.py knows (a renamed or new column
    must be a decision, not a silent drop);
  * finish unless the database, read back, equals the sheet cell for cell (export_snapshot.verify).
Runs in one transaction: a refusal or failure leaves the database as it was.
"""
import argparse, csv, io, json, sys, urllib.request

from psycopg2 import sql

from db import OWNER, REPO, connect
from sheetmap import CONTINUATION, IMAGE_COLS, SHEET_TO_DB, join_description
import export_snapshot

IMPORTER = "postgres"


def read_sheet(args):
    if args.file:
        text = open(args.file, encoding="utf-8", newline="").read()
    else:
        url = json.loads((REPO / "data/csv-source.json").read_text())["csvUrl"]
        req = urllib.request.Request(url, headers={"User-Agent": "shrines-archive-db/1.0"})
        text = urllib.request.urlopen(req, timeout=120).read().decode("utf-8")
    if "\t" in text.splitlines()[0] and "," not in text.splitlines()[0]:
        sys.exit("this looks like TSV; export CSV (TSV strips newlines inside cells: RULE 3)")
    return list(csv.DictReader(io.StringIO(text, newline="")))


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--from-sheet", action="store_true")
    g.add_argument("--file")
    ap.add_argument("--replace", action="store_true")
    a = ap.parse_args()

    rows = read_sheet(a)
    headers = list(rows[0].keys())
    unknown = [h for h in headers if h not in SHEET_TO_DB and not CONTINUATION.match(h)]
    absent = [h for h in SHEET_TO_DB if h not in headers]
    if unknown or absent:
        sys.exit(f"sheet headers changed; update sheetmap.py deliberately. new: {unknown} missing: {absent}")

    c = connect(IMPORTER)
    cur = c.cursor()
    cur.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(OWNER)))
    cur.execute("SELECT count(*) FROM sites")
    if cur.fetchone()[0]:
        if not a.replace:
            sys.exit("the database already holds sites; pass --replace to reload (before cutover only)")
        cur.execute("SELECT changed_by, count(*) FROM audit.change_log WHERE changed_by <> %s GROUP BY 1",
                    (IMPORTER,))
        edits = cur.fetchall()
        if edits:
            sys.exit(f"refusing --replace: people have edited the database {edits}; it is the master now")
        cur.execute("DELETE FROM site_images")
        cur.execute("DELETE FROM sites")

    cols = [v for v in SHEET_TO_DB.values() if v]
    insert = sql.SQL("INSERT INTO sites ({}, sheet_row) VALUES ({}, %s)").format(
        sql.SQL(", ").join(map(sql.Identifier, cols)), sql.SQL(", ").join(sql.Placeholder() * len(cols)))
    n_img = 0
    for i, r in enumerate(rows, start=1):
        r = dict(r, Description=join_description(r))
        vals = [(r[h] if r[h] != "" else None) for h, col in SHEET_TO_DB.items() if col]
        cur.execute(insert, vals + [i])
        for pos, h in enumerate(IMAGE_COLS, start=1):
            if r[h] != "":
                cur.execute("INSERT INTO site_images (site_id, position, url) VALUES (%s, %s, %s)",
                            (r["id"], pos, r[h]))
                n_img += 1

    problems = export_snapshot.verify(cur, rows)
    if problems:
        c.rollback()
        sys.exit("read-back differs from the sheet; nothing loaded:\n  " + "\n  ".join(problems[:20]))
    c.commit()
    print(f"loaded {len(rows)} sites and {n_img} images; read-back equals the sheet cell for cell")


if __name__ == "__main__":
    main()
