"""
Apply pipeline/db/migrations/*.sql in name order, each in its own transaction, as shrines_owner.

Every applied file is recorded with its SHA-256. The runner refuses to continue if an applied
file has changed since (write a new migration instead), or if the files on disk skip one that the
database has recorded.

  python pipeline/db/migrate.py            # apply what is pending
  python pipeline/db/migrate.py --status   # list applied and pending, change nothing
"""
import argparse, hashlib, sys

from psycopg2 import sql

from db import HERE, OWNER, connect

MIGRATIONS = HERE / "migrations"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--status", action="store_true")
    a = ap.parse_args()

    files = sorted(MIGRATIONS.glob("*.sql"))
    c = connect("postgres")
    cur = c.cursor()
    cur.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(OWNER)))
    cur.execute("""CREATE TABLE IF NOT EXISTS schema_migrations (
                       filename text PRIMARY KEY, sha256 text NOT NULL,
                       applied_at timestamptz NOT NULL DEFAULT now())""")
    c.commit()
    cur.execute("SELECT filename, sha256 FROM schema_migrations")
    applied = dict(cur.fetchall())

    on_disk = {f.name for f in files}
    missing = sorted(set(applied) - on_disk)
    if missing:
        sys.exit(f"applied migrations missing from disk: {missing}")
    for f in files:
        digest = hashlib.sha256(f.read_bytes()).hexdigest()
        if f.name in applied:
            if applied[f.name] != digest:
                sys.exit(f"{f.name} has changed since it was applied; write a new migration instead")
            print(f"  applied  {f.name}")
            continue
        if a.status:
            print(f"  pending  {f.name}")
            continue
        try:
            cur.execute(f.read_text(encoding="utf-8"))
            cur.execute("INSERT INTO schema_migrations (filename, sha256) VALUES (%s, %s)", (f.name, digest))
            c.commit()
            print(f"  applied  {f.name} (now)")
        except Exception as e:
            c.rollback()
            sys.exit(f"{f.name} failed and was rolled back: {e}")


if __name__ == "__main__":
    main()
