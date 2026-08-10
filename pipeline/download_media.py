#!/usr/bin/env python3
"""
download_media.py — pull the field media out of Drive, named correctly.

    python3 download_media.py --dry-run          # see what it would do
    python3 download_media.py --photos           # photos only
    python3 download_media.py --books            # book PDFs
    python3 download_media.py --video            # WARNING: two files are ~690MB each

Reads `photo_manifest.tsv` and downloads each file BY DRIVE ID into:

    media/photos/<slug>/<slug>-NN.<ext>
    media/books/<slug>/<slug>-book-NN.pdf
    media/video/<slug>/<slug>-video-NN.<ext>

WHY BY ID AND NOT A FOLDER ZIP
The uploaded filenames are unusable — they are things like `dfdfdfd - Saifullah
Imtiaz.png`, `sdsfdg`, `dds`. One name, `dfdfdfdfd - Saifullah Imtiaz.jpg`, is three
different photographs spanning TWO different shrines. And 73 files carry no extension at
all. So a folder download loses the shrine attribution permanently. The Drive ID is the
only key that survives, and the survey rows are what map ID to shrine.

Extensions are set from `mime_type`, never from the filename.

SETUP — one of these:

    pip3 install --break-system-packages gdown        # simplest
    # or, more reliable for restricted files:
    brew install rclone && rclone config              # set up a "gdrive" remote

gdown works when a file is link-shared. These live in a form-responses folder owned by
another account, so some may refuse — the script reports each failure with its ID so you
can fetch the remainder with rclone or by hand.
"""

import csv, os, sys, subprocess, shutil, time
from collections import defaultdict

MANIFEST = "photo_manifest.tsv"

EXT = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/heic": "heic", "image/tiff": "tif",
    "application/pdf": "pdf",
    "video/mp4": "mp4", "video/quicktime": "mov", "video/x-matroska": "mkv",
    "video/3gpp": "3gp", "video/x-msvideo": "avi",
    "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
    "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
}

DIRS = {"photo": "photos", "book": "books", "video_audio": "video"}
TAG  = {"photo": "", "book": "-book", "video_audio": "-video"}


def have(cmd):
    return shutil.which(cmd) is not None


def have_gdown():
    """gdown installed via `pip --user` puts its script outside PATH on macOS,
    so check for the importable module rather than the binary."""
    r = subprocess.run([sys.executable, "-c", "import gdown"],
                       capture_output=True, text=True)
    return r.returncode == 0


def _gdown(argv, dest):
    r = subprocess.run([sys.executable, "-m", "gdown"] + argv,
                       capture_output=True, text=True)
    if r.returncode == 0 and os.path.exists(dest) and os.path.getsize(dest) > 1024:
        return True, ""
    if os.path.exists(dest):
        os.remove(dest)              # gdown writes an HTML error page on failure
    err = (r.stderr or r.stdout).strip().splitlines()
    return False, (err[-1] if err else "unknown gdown failure")


def fetch(drive_id, dest):
    """Try gdown (module form), then rclone. Return (ok, tool, message)."""
    msg = "gdown not installed"
    if have_gdown():
        # newer gdown takes a bare id/url; older wants --id. Try both.
        ok, msg = _gdown([drive_id, "-O", dest, "--quiet"], dest)
        if ok:
            return True, "gdown", ""
        ok, msg2 = _gdown(["--id", drive_id, "-O", dest, "--quiet"], dest)
        if ok:
            return True, "gdown", ""
        msg = f"{msg} / {msg2}"

    if have("rclone"):
        # `rclone backend copyid` is the correct way to fetch a single file by its
        # Drive file ID. (`copyto gdrive:{ID}` is root-folder-ID syntax, not file.)
        # It wants a destination DIRECTORY, then renames afterwards.
        outdir = os.path.dirname(dest) or "."
        r = subprocess.run(
            ["rclone", "backend", "copyid", "gdrive:", drive_id, outdir + "/"],
            capture_output=True, text=True)
        if r.returncode == 0:
            # copyid writes the file under its ORIGINAL Drive name; find the newest
            # arrival in outdir that isn't already one of our renamed targets.
            try:
                cands = [os.path.join(outdir, f) for f in os.listdir(outdir)]
                cands = [c for c in cands
                         if os.path.isfile(c) and not os.path.basename(c).startswith(
                             os.path.basename(dest).rsplit("-", 1)[0] + "-")]
                if cands:
                    newest = max(cands, key=os.path.getmtime)
                    shutil.move(newest, dest)
                    if os.path.getsize(dest) > 1024:
                        return True, "rclone", ""
            except Exception as e:
                msg += f" | rclone rename failed: {e}"
        else:
            tail = (r.stderr or "failed").strip().splitlines()
            msg += " | rclone: " + (tail[-1] if tail else "failed")

    return False, "", msg


def main():
    args = sys.argv[1:]
    dry = "--dry-run" in args
    kinds = set()
    if "--photos" in args: kinds.add("photo")
    if "--books" in args:  kinds.add("book")
    if "--video" in args:  kinds.add("video_audio")
    if not kinds: kinds = {"photo", "book"}      # video excluded by default: huge

    if not os.path.exists(MANIFEST):
        sys.exit(f"{MANIFEST} not found — run this beside the manifest.")

    rows = list(csv.DictReader(open(MANIFEST, newline="", encoding="utf-8"), delimiter="\t"))
    todo, skipped = [], []

    counters = defaultdict(int)
    for r in rows:
        kind = r["upload_question"]
        if kind not in kinds:
            continue
        if r["join_status"] != "matched":
            skipped.append((r["shrine_name"], r["drive_id"], r["join_status"]))
            continue

        mime = (r["mime_type"] or "").strip()
        # the one known bad file: a 26MB database backup sitting in the photo folder
        if not (mime.startswith("image/") or mime.startswith("video/")
                or mime.startswith("audio/") or mime == "application/pdf"):
            skipped.append((r["shrine_name"], r["drive_id"], f"not media ({mime})"))
            continue
        if kind == "photo" and not mime.startswith("image/"):
            skipped.append((r["shrine_name"], r["drive_id"], f"in photo field but {mime}"))
            continue

        slug = r["slug"]
        key = (slug, kind)
        counters[key] += 1
        n = counters[key]
        ext = EXT.get(mime, "bin")
        name = f"{slug}{TAG[kind]}-{n:02d}.{ext}"
        dest = os.path.join("media", DIRS[kind], slug, name)
        todo.append((r["shrine_name"], slug, kind, r["drive_id"], dest,
                     int(r["bytes"] or 0), r["drive_filename"]))

    total_bytes = sum(t[5] for t in todo)
    print(f"{len(todo)} files to fetch  ({total_bytes/1e6:.0f} MB)   "
          f"{len(skipped)} skipped\n")

    by_shrine = defaultdict(list)
    for t in todo: by_shrine[t[0]].append(t)
    for shrine, items in sorted(by_shrine.items()):
        mb = sum(i[5] for i in items) / 1e6
        print(f"  {shrine[:44]:<46}{len(items):>3} files  {mb:>7.1f} MB")

    if skipped:
        print(f"\nSKIPPED ({len(skipped)}):")
        for s, i, why in skipped:
            print(f"  {s[:40]:<42}{i:<36}{why}")

    if dry:
        print("\ndry run — nothing downloaded. Sample targets:")
        for t in todo[:8]:
            print(f"  {t[6][:38]:<40}-> {t[4]}")
        return

    if not (have_gdown() or have("rclone")):
        sys.exit("\nInstall one first:\n"
                 "  python3 -m pip install --user gdown\n"
                 "  brew install rclone && rclone config   (remote named 'gdrive')")

    ok, failed = 0, []
    for i, (shrine, slug, kind, did, dest, nbytes, orig) in enumerate(todo, 1):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if os.path.exists(dest) and os.path.getsize(dest) > 1024:
            print(f"[{i}/{len(todo)}] skip (exists) {dest}")
            ok += 1
            continue
        good, tool, msg = fetch(did, dest)
        if good:
            ok += 1
            print(f"[{i}/{len(todo)}] {tool:<7} {dest}")
        else:
            failed.append((shrine, did, dest, msg))
            print(f"[{i}/{len(todo)}] FAIL    {did}  {msg[:70]}")
        time.sleep(0.4)      # be polite to Drive

    print(f"\n{ok} downloaded, {len(failed)} failed")
    if failed:
        with open("download_failures.tsv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh, delimiter="\t")
            w.writerow(["shrine", "drive_id", "intended_path", "error"])
            w.writerows(failed)
        print("wrote download_failures.tsv")
        print("\nFor the failures, either share the Drive folder as 'anyone with the "
              "link' and re-run, or fetch them with rclone against an authenticated "
              "remote. Do not rename anything by hand — the manifest is the mapping.")


if __name__ == "__main__":
    main()
