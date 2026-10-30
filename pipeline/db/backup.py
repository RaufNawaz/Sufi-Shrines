"""
Back up the archive database, prove the backup restores, prune old copies.

  python pipeline/db/backup.py            # nightly: dump + restore drill + prune
  python pipeline/db/backup.py --base     # also a physical base backup (weekly; with the WAL
                                          # archive it allows point-in-time recovery)

Three layers, all under BACKUP_DIR (default ~/pgbackup, outside the iCloud-synced repo: a live
database or its WAL must never sit in a synced folder):
  wal/      every WAL segment, copied by the server's archive_command as it closes (<= 15 min)
  base/     pg_basebackup snapshots, the starting point for point-in-time recovery
  dump/     pg_dump -Fc of the `shrines` database, one per night

A dump only counts once it has been restored: each run restores the new dump into a scratch
database and checks it holds exactly what the live database holds (same rows, same history
count, the export identical). Any failure exits non-zero and is written to backup.log, so the
scheduled task shows it as failed.
"""
import argparse, datetime as dt, hashlib, json, os, shutil, subprocess, sys
from pathlib import Path

from db import DBNAME, connect

PG_BIN = Path(os.environ.get("PG_BIN", Path.home() / "pgsql-17/pgsql/bin"))
BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", Path.home() / "pgbackup"))
KEEP_DUMPS, KEEP_BASES = 30, 4
SCRATCH = "shrines_restore_check"
LOG = BACKUP_DIR / "backup.log"


def log(msg):
    line = f"{dt.datetime.now().isoformat(timespec='seconds')} {msg}"
    print(line)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def run(*args):
    r = subprocess.run([str(PG_BIN / args[0]), *args[1:], "-h", "localhost", "-U", "postgres", "-w"],
                       capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"{args[0]} failed: {r.stderr.strip()[:500]}")
    return r.stdout


def fingerprint(dbname):
    """What must survive a restore: every site and image, byte for byte, and the history count."""
    c = connect("postgres", dbname=dbname)
    cur = c.cursor()
    cur.execute("SELECT md5(string_agg(t::text, '|' ORDER BY id)) FROM sites t")
    s = cur.fetchone()[0]
    cur.execute("SELECT md5(string_agg(t::text, '|' ORDER BY site_id, position)) FROM site_images t")
    i = cur.fetchone()[0]
    cur.execute("SELECT count(*), coalesce(max(change_id), 0) FROM audit.change_log")
    h = cur.fetchone()
    cur.execute("SELECT count(*) FROM schema_migrations")
    m = cur.fetchone()[0]
    c.close()
    return {"sites_md5": s, "images_md5": i, "history": h, "migrations": m}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", action="store_true")
    a = ap.parse_args()
    for d in ("dump", "base", "wal"):
        (BACKUP_DIR / d).mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    try:
        if a.base:
            target = BACKUP_DIR / "base" / stamp
            run("pg_basebackup.exe", "-D", str(target), "-Ft", "-z", "-Xs", "-c", "fast")
            # The WAL file this backup starts from, read from its own manifest: the pruning boundary.
            c = connect("postgres")
            cur = c.cursor()
            ranges = json.loads((target / "backup_manifest").read_text(encoding="utf-8"))["WAL-Ranges"]
            cur.execute("SELECT pg_walfile_name(%s::pg_lsn)", (ranges[0]["Start-LSN"],))
            (target / "START_WAL").write_text(cur.fetchone()[0])
            c.close()
            log(f"base backup {target.name}: ok (starts at {(target / 'START_WAL').read_text()})")

        dump = BACKUP_DIR / "dump" / f"{DBNAME}-{stamp}.dump"
        run("pg_dump.exe", "-d", DBNAME, "-Fc", "-f", str(dump))
        sha = hashlib.sha256(dump.read_bytes()).hexdigest()
        (dump.with_suffix(".sha256")).write_text(f"{sha}  {dump.name}\n")

        # Restore drill.
        live = fingerprint(DBNAME)
        run("dropdb.exe", "--if-exists", SCRATCH)
        run("createdb.exe", SCRATCH)
        run("pg_restore.exe", "-d", SCRATCH, "--no-owner", "--exit-on-error", str(dump))
        restored = fingerprint(SCRATCH)
        run("dropdb.exe", SCRATCH)
        if restored != live:
            raise RuntimeError(f"restored copy differs from live: {restored} vs {live}")
        log(f"dump {dump.name}: {dump.stat().st_size:,} bytes, restore drill ok "
            f"(history {live['history'][0]} changes)")

        # Prune: newest KEEP_* kept; WAL older than the oldest kept base backup removed.
        dumps = sorted((BACKUP_DIR / "dump").glob("*.dump"))
        for old in dumps[:-KEEP_DUMPS]:
            old.unlink()
            old.with_suffix(".sha256").unlink(missing_ok=True)
        bases = sorted(p for p in (BACKUP_DIR / "base").iterdir() if p.is_dir())
        for old in bases[:-KEEP_BASES]:
            shutil.rmtree(old)
        bases = bases[-KEEP_BASES:]
        if bases and (bases[0] / "START_WAL").exists():
            # WAL before the oldest kept base backup's start can never be replayed: remove it.
            r = subprocess.run([str(PG_BIN / "pg_archivecleanup.exe"), str(BACKUP_DIR / "wal"),
                                (bases[0] / "START_WAL").read_text().strip()], capture_output=True, text=True)
            if r.returncode:
                raise RuntimeError(f"pg_archivecleanup failed: {r.stderr.strip()[:300]}")
        # Check the WAL archive is keeping up: the server's last archived segment must be on disk.
        c = connect("postgres")
        cur = c.cursor()
        cur.execute("SELECT last_archived_wal, failed_count, last_failed_wal FROM pg_stat_archiver")
        last, failed, last_failed = cur.fetchone()
        c.close()
        if last and not (BACKUP_DIR / "wal" / last).exists():
            raise RuntimeError(f"WAL archive is not where it should be: {last} missing from {BACKUP_DIR / 'wal'}")
        if last_failed and (not last or last_failed > last):
            raise RuntimeError(f"WAL archiving is failing: last failure {last_failed}")
        log(f"wal archive: ok (last {last})")
    except Exception as e:
        log(f"FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
