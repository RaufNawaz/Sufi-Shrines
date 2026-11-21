"""Shared connection settings for pipeline/db. No credentials live here or anywhere in the repo.

libpq reads passwords from the pgpass file (%APPDATA%\\postgresql\\pgpass.conf on Windows,
~/.pgpass elsewhere), which setup_cluster.py writes and restricts to the current user.
Override the target with PGHOST / PGPORT / PGDATABASE, as with any libpq program.
Supabase's session pooler wants `role.<project-ref>` as the user: set PGUSER_SUFFIX=.<project-ref>.
"""
import os
from pathlib import Path

import psycopg2

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DBNAME = os.environ.get("PGDATABASE", "shrines")

# Role names. Group roles carry privileges; people and programs log in as members of them.
OWNER, EDITOR, READER = "shrines_owner", "shrines_editor", "shrines_reader"
EXPORT_LOGIN = "shrines_export"

# The hosted master (Rauf, 30 Oct 2026; created 19 Nov 2026). Not secret: the ref is in every project URL.
SUPABASE = {"host": "aws-0-ap-south-1.pooler.supabase.com", "port": 5432, "dbname": "postgres",
            "suffix": ".atpwkivodppjzewytekw"}


def connect(user, dbname=DBNAME, host=None, port=None, suffix=None):
    # archive: the tables (migration 0002); extensions: where Supabase keeps PostGIS.
    # TimeZone fixed so a row's text (timestamps included) is the same from any server.
    return psycopg2.connect(host=host or os.environ.get("PGHOST", "localhost"),
                            port=int(port or os.environ.get("PGPORT", "5432")),
                            dbname=dbname,
                            user=user + (os.environ.get("PGUSER_SUFFIX", "") if suffix is None else suffix),
                            application_name="shrines-pipeline",
                            options="-c search_path=archive,public,extensions -c TimeZone=UTC")
