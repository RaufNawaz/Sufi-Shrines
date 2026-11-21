"""
One-time, idempotent setup of the cluster for the archive: roles, the `shrines` database, PostGIS.
Run as the superuser (postgres), whose password must already be in the pgpass file.

  python pipeline/db/setup_cluster.py                 # roles + database + extension
  python pipeline/db/setup_cluster.py --add-editor adil
  python pipeline/db/setup_cluster.py --supabase      # hosted: roles and grants only (PGHOST etc. set)

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
        hosts = [os.environ["PGHOST"]] if os.environ.get("PGHOST") else ["localhost", "127.0.0.1"]
        port, user = os.environ.get("PGPORT", "5432"), role + os.environ.get("PGUSER_SUFFIX", "")
        with open(p, "a", encoding="utf-8") as f:
            for host in hosts:
                f.write(f"{host}:{port}:*:{user}:{pw}\n")
        print(f"  {role}: created; password written to {p}")
    cur.execute(sql.SQL("GRANT {} TO {}").format(sql.Identifier(member_of), sql.Identifier(role)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--add-editor", metavar="NAME", help="create a personal editor login")
    ap.add_argument("--supabase", action="store_true", help="hosted project: roles and grants only")
    a = ap.parse_args()
    if a.supabase:
        return supabase()

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


def supabase():
    """Supabase: the database, PostGIS (schema extensions) and `public` already exist and belong to
    Supabase. Changing their ownership or revoking PUBLIC, as the local setup does, would break its own
    services, so here only our roles are made and given what migrate.py needs. `postgres` is not a
    superuser on Supabase; it gets membership in shrines_owner so migrate.py can SET ROLE to it."""
    if not (os.environ.get("PGHOST") and os.environ.get("PGDATABASE") == "postgres"):
        sys.exit("--supabase needs PGHOST (the project's host) and PGDATABASE=postgres")
    c = connect("postgres")
    c.autocommit = True
    cur = c.cursor()
    cur.execute("SELECT extnamespace::regnamespace::text FROM pg_extension WHERE extname = 'postgis'")
    r = cur.fetchone()
    if not r:
        sys.exit("PostGIS is not enabled: Database -> Extensions -> postgis, schema extensions")
    print("  postgis in schema", r[0])
    for role in (OWNER, EDITOR, READER):
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
        if not cur.fetchone():
            cur.execute(sql.SQL("CREATE ROLE {} NOLOGIN").format(sql.Identifier(role)))
        print(f"  {role}: ok")
    ensure_login(cur, EXPORT_LOGIN, READER)
    ensure_login(cur, "shrines_import", OWNER)  # import_sheet.py SETs ROLE to the owner

    def grant(stmt, *roles):
        cur.execute(sql.SQL(stmt).format(*map(sql.Identifier, roles)))

    grant("GRANT {} TO postgres", OWNER)
    grant("GRANT CREATE ON DATABASE postgres TO {}", OWNER)  # CREATE SCHEMA audit, archive
    grant("GRANT USAGE, CREATE ON SCHEMA public TO {}", OWNER)  # 0001 starts there; schema_migrations
    grant("GRANT USAGE ON SCHEMA extensions TO {}, {}, {}", OWNER, EDITOR, READER)
    print("supabase roles ready; next: migrate.py")


if __name__ == "__main__":
    main()
