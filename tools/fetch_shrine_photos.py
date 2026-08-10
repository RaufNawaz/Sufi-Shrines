#!/usr/bin/env python3
"""Download form-uploaded shrine photos from Drive into public/photos/<slug>/.

Reads data/new-photos-manifest.json (written by the responses sync) and pulls each
Drive file to its target path, skipping anything already on disk. Idempotent.

    python3 tools/fetch_shrine_photos.py                # all slugs
    python3 tools/fetch_shrine_photos.py malik-ayaz     # one slug

Requires gdown (pip install gdown) and Drive files shared as "anyone with the link".
If gdown fails with a permission error, open the printed URL and save the file to the
printed target path by hand — the script will skip it on the next run.
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "new-photos-manifest.json"


def download(drive_id: str, target: pathlib.Path) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 0:
        return True
    url = f"https://drive.google.com/uc?id={drive_id}"
    try:
        subprocess.run(
            ["gdown", "--no-cookies", "-O", str(target), url],
            check=True, capture_output=True, text=True,
        )
    except FileNotFoundError:
        sys.exit("gdown not installed. Run: pip install gdown")
    except subprocess.CalledProcessError as exc:
        print(f"  FAILED {drive_id}\n    open {url}\n    save to {target}")
        print("   ", (exc.stderr or "").strip().splitlines()[-1:] or "")
        target.unlink(missing_ok=True)
        return False
    return target.exists() and target.stat().st_size > 0


def main() -> int:
    if not MANIFEST.exists():
        sys.exit(f"missing {MANIFEST}")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    wanted = sys.argv[1:] or list(manifest)

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
        print("Re-run after saving the failed files by hand; existing files are skipped.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
