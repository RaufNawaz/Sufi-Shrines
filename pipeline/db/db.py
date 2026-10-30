"""Shared connection settings for pipeline/db. No credentials live here or anywhere in the repo.

libpq reads passwords from the pgpass file (%APPDATA%\\postgresql\\pgpass.conf on Windows,
~/.pgpass elsewhere), which setup_cluster.py writes and restricts to the current user.
Override the target with PGHOST / PGPORT / PGDATABASE, as with any libpq program.
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


def connect(user, dbname=DBNAME):
    return psycopg2.connect(host=os.environ.get("PGHOST", "localhost"),
                            port=int(os.environ.get("PGPORT", "5432")),
                            dbname=dbname, user=user, application_name="shrines-pipeline")
