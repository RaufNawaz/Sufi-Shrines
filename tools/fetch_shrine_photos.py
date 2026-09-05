#!/usr/bin/env python3
"""Download form-uploaded shrine photos from Drive into public/photos/<slug>/.

Reads data/new-photos-manifest.json and pulls each Drive file to its target path,
skipping anything already on disk. Idempotent.

    python3 tools/fetch_shrine_photos.py                # all slugs
    python3 tools/fetch_shrine_photos.py malik-ayaz     # one slug
    python3 tools/fetch_shrine_photos.py --force …      # ignore the manifest's own warning

Requires gdown (`pip install gdown`) and Drive files shared as "anyone with the link".

## Read this before believing a failure

**The manifest carries a `_deprecated` note and this script now refuses to run without
`--force` when it does.** That note has said since 10 August 2026 that two of its slugs are
wrong and that *every* `mauj-darya-bukhari` Drive id returns not-found — "those photos are
gone and the shrine needs re-shooting. Do not fetch from this file." On 5 September 2026 a
session ran this script against that slug anyway, watched ten downloads fail, and spent the
next twenty minutes deciding whether the blocker was the agent proxy, a broken venv or Drive
permissions. It was none of them: there is nothing at the other end. A file that knows it is
wrong should be able to stop you.

Three other things that run cost, all fixed here:

- **`gdown` was invoked as a console script.** This repo's `.venv/bin/gdown` has a shebang
  pointing at an interpreter path that no longer exists, so it failed with `exec: … cannot
  execute`, which the old code reported as the last line of stderr under a `FAILED <drive id>`
  heading — indistinguishable from a permissions error. It is now run as
  `sys.executable -m gdown`, which cannot go stale.
- **The target directory was created before the download.** Ten failures left an empty
  `public/photos/mauj-darya-bukhari/` behind, which is precisely the shape of "these photos
  were fetched". Downloads now land in a temp file and are moved into place only on success.
- **"Save the failed files by hand" is bad advice for a file that does not exist.** Drive
  answers *missing* and *private* identically, so the failure line now says so and points at
  `pipeline/photo_manifest.tsv`, whose `join_status` column already types every id
  (`id_not_in_drive` for all twelve of Mauj Darya Bukhari's).

And check this script's exit code directly — it returns 1 on any failure, and piping it
through `tail` reports the pipe's status instead (CLAUDE.md, verification habits).
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "new-photos-manifest.json"


def download(drive_id: str, target: pathlib.Path) -> bool:
    """Fetch one Drive file. Nothing is written to `target` unless it fully succeeds."""
    url = f"https://drive.google.com/uc?id={drive_id}"
    with tempfile.TemporaryDirectory() as tmp:
        staged = pathlib.Path(tmp) / target.name
        try:
            subprocess.run(
                [sys.executable, "-m", "gdown", "--no-cookies", "-O", str(staged), url],
                check=True, capture_output=True, text=True,
            )
        except subprocess.CalledProcessError as exc:
            tail = (exc.stderr or "").strip().splitlines()[-3:]
            print(f"  FAILED {drive_id}")
            print(f"    {url}")
            print("    Drive answers 'missing' and 'private' the same way. Check"
                  " pipeline/photo_manifest.tsv join_status before assuming permissions.")
            for line in tail:
                print(f"    | {line}")
            return False
        except FileNotFoundError:
            sys.exit(f"gdown not importable by {sys.executable}. Run: pip install gdown")
        if not staged.exists() or staged.stat().st_size == 0:
            print(f"  FAILED {drive_id} — gdown exited 0 and wrote nothing")
            return False
        target.parent.mkdir(parents=True, exist_ok=True)
        staged.replace(target)
    return target.exists() and target.stat().st_size > 0


def main() -> int:
    if not MANIFEST.exists():
        sys.exit(f"missing {MANIFEST}")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    args = sys.argv[1:]
    force = "--force" in args
    wanted = [a for a in args if not a.startswith("--")] or [
        k for k in manifest if not k.startswith("_")
    ]

    deprecated = manifest.get("_deprecated")
    if deprecated and not force:
        print("This manifest says it should not be fetched from:\n")
        print(f"  {deprecated.get('note', '(no note)')}\n")
        print("Re-run with --force if you have a reason to disbelieve it.")
        return 2

    ok = failed = skipped = 0
    for slug in wanted:
        entry = manifest.get(slug)
        if entry is None:
            print(f"! unknown slug {slug}")
            continue
        print(f"\n{slug}")
        for photo in entry["photos"]:
            target = ROOT / photo["target"]
            if target.exists() and target.stat().st_size > 0:
                skipped += 1
                continue
            if download(photo["drive_id"], target):
                ok += 1
                print(f"  ok  {photo['target']}")
            else:
                failed += 1

    print(f"\ndownloaded {ok} · already present {skipped} · failed {failed}")
    if failed:
        print("Existing files are skipped, so a re-run costs only the failures.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
