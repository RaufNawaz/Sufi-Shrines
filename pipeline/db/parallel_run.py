"""
The parallel run (docs/DATABASE.md, "Cutover"): each night, reload Supabase from the sheet and prove
the two are identical. Started 19 November 2026 at Rauf's request; scheduled by install_tasks.ps1.

  python pipeline/db/parallel_run.py

One fetch of the published sheet is saved to ~/pgbackup/parallel/ and used for both steps, so the
import and the check see the same sheet. The import runs as shrines_import; its --replace guard
refuses once anyone else (the Table Editor edits as `postgres`) has changed the database, which is
the intended stop at cutover. Every outcome, ok or FAILED, goes to ~/pgbackup/backup.log.
Stop it at cutover: Unregister-ScheduledTask -TaskName 'Shrines DB - parallel run' -Confirm:$false
"""
import datetime as dt, json, os, subprocess, sys, urllib.request
from pathlib import Path

from db import REPO, SUPABASE

BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", Path.home() / "pgbackup"))
LOG = BACKUP_DIR / "backup.log"
KEEP = 30


def log(msg):
    line = f"{dt.datetime.now().isoformat(timespec='seconds')} {msg}"
    print(line)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def step(script, *args):
    env = {**os.environ, "PGHOST": SUPABASE["host"], "PGPORT": str(SUPABASE["port"]),
           "PGDATABASE": SUPABASE["dbname"], "PGUSER_SUFFIX": SUPABASE["suffix"],
           "PGSSLMODE": "require", "SHRINES_IMPORTER": "shrines_import"}
    r = subprocess.run([sys.executable, str(Path(__file__).with_name(script)), *args],
                       capture_output=True, text=True, env=env)
    out = (r.stdout + r.stderr).strip()
    if r.returncode:
        raise RuntimeError(f"{script} failed: {out[-800:]}")
    return out.splitlines()[-1] if out else ""


def main():
    out = BACKUP_DIR / "parallel"
    out.mkdir(parents=True, exist_ok=True)
    sheet = out / f"sheet-{dt.datetime.now():%Y%m%d-%H%M%S}.csv"
    try:
        url = json.loads((REPO / "data" / "csv-source.json").read_text(encoding="utf-8"))["csvUrl"]
        with urllib.request.urlopen(url, timeout=120) as resp:
            sheet.write_bytes(resp.read())
        step("import_sheet.py", "--file", str(sheet), "--replace")
        result = step("export_snapshot.py", "--verify-against", str(sheet))
        if not result.startswith("database equals"):
            raise RuntimeError(f"unexpected verify output: {result}")
    except Exception as e:
        log(f"FAILED (parallel run): {e}")
        sys.exit(1)
    for old in sorted(out.glob("sheet-*.csv"))[:-KEEP]:
        old.unlink()
    log(f"parallel run ok: Supabase reloaded from the sheet and equal to it ({result.split('(')[-1].rstrip(')')})")


if __name__ == "__main__":
    main()
