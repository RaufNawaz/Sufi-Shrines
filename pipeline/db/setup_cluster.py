"""
One-time, idempotent setup of the cluster for the archive: roles, the `shrines` database, PostGIS.
Run as the superuser (postgres), whose password must already be in the pgpass file.

  python pipeline/db/setup_cluster.py                 # roles + database + extension
  python pipeline/db/setup_cluster.py --add-editor adil

Roles:
  shrines_owner   NOLOGIN  owns every table; migrations run as it (SET ROLE)
  shrines_editor  NOLOGIN  may change content (sites, site_images); may read history
  shrines_reader  NOLOGIN  may read
  shrines_export  LOGIN    member of shrines_reader; what the export and backups use
  <person>        LOGIN    one per person, member of shrines_editor, so the history says who

A new login's password is generated here and written only to this user's pgpass file. It is
never printed, and never written to the repository.
"""
import argparse, os, re, secrets, sys
from pathlib import Path

from psycopg2 import sql

from db import DBNAME, EDITOR, EXPORT_LOGIN, OWNER, READER, connect


def pgpass_path():
    if os.environ.get("PGPASSFILE"):
        return Path(os.environ["PGPASSFILE"])
    if os.name == "nt":
        return Path(os.environ["APPDATA"]) / "postgresql" / "pgpass.conf"
    return Path.home() / ".pgpass"


def ensure_login(cur, role, member_of):
    """Create a LOGIN role with a generated password (stored in pgpass) if it does not exist."""
    if not re.fullmatch(r"[a-z][a-z0-9_]*", role):
        sys.exit(f"role name must be lower-case letters, digits, underscore: {role!r}")
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
    if cur.fetchone():
        print(f"  {role}: exists")
    else:
        pw = secrets.token_urlsafe(24)
        cur.execute(sql.SQL("CREATE ROLE {} LOGIN PASSWORD %s").format(sql.Identifier(role)), (pw,))
        p = pgpass_path()
        with open(p, "a", encoding="utf-8") as f:
            for host in ("localhost", "127.0.0.1"):
                f.write(f"{host}:5432:*:{role}:{pw}\n")
        print(f"  {role}: created; password written to {p}")
    cur.execute(sql.SQL("GRANT {} TO {}").format(sql.Identifier(member_of), sql.Identifier(role)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--add-editor", metavar="NAME", help="create a personal editor login")
    a = ap.parse_args()

    c = connect("postgres", dbname="postgres")
    c.autocommit = True
    cur = c.cursor()
    if a.add_editor:
        ensure_login(cur, a.add_editor, EDITOR)
        return
    for role in (OWNER, EDITOR, READER):
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
        if not cur.fetchone():
            cur.execute(sql.SQL("CREATE ROLE {} NOLOGIN").format(sql.Identifier(role)))
        print(f"  {role}: ok")
    ensure_login(cur, EXPORT_LOGIN, READER)
    ensure_login(cur, "rauf", EDITOR)

    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DBNAME,))
    if not cur.fetchone():
        cur.execute(sql.SQL("CREATE DATABASE {} OWNER {} ENCODING 'UTF8' TEMPLATE template0")
                    .format(sql.Identifier(DBNAME), sql.Identifier(OWNER)))
    cur.execute(sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(sql.Identifier(DBNAME)))
    cur.execute(sql.SQL("GRANT CONNECT ON DATABASE {} TO {}, {}, {}").format(
        sql.Identifier(DBNAME), sql.Identifier(OWNER), sql.Identifier(EDITOR), sql.Identifier(READER)))
    c.close()

    d = connect("postgres")
    d.autocommit = True
    cur = d.cursor()
    cur.execute("CREATE EXTENSION IF NOT EXISTS postgis")       # needs the superuser
    cur.execute(sql.SQL("ALTER SCHEMA public OWNER TO {}").format(sql.Identifier(OWNER)))
    cur.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
    cur.execute("SELECT postgis_full_version()")
    print("  postgis:", cur.fetchone()[0].split(" ")[0:2])
    print(f"database {DBNAME!r} ready")


if __name__ == "__main__":
    main()
