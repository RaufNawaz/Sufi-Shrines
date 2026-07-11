"""Download shrine book uploads from Google Drive into books/.

Reads Drive links from a links file (default books/links.txt), dedupes the
file ids, downloads each file with gdown, and maintains books/manifest.json
mapping every Drive id to the saved filename, the original upload name, size,
and a sha1 (so duplicate uploads are flagged). Re-runs skip files that are
already downloaded, so appending new links and re-running is safe.

The files must be readable by this machine without an interactive login:
either shared as "Anyone with the link", or a Netscape cookies.txt exported
from an authenticated browser session (pass --cookies PATH once; gdown then
reuses it from ~/.cache/gdown/cookies.txt).

Examples:
  py -3 tools/download_books.py --check          # probe access, download nothing
  py -3 tools/download_books.py                  # download everything missing
  py -3 tools/download_books.py --cookies "%USERPROFILE%\\Downloads\\cookies.txt"
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

REPO_ROOT = Path(__file__).resolve().parent.parent
USER_AGENT = "Mozilla/5.0 (ShrineBookDownloader/1.0)"

MAGIC_KINDS = [
    (b"%PDF-", "pdf", ".pdf"),
    (b"\xff\xd8\xff", "jpeg", ".jpg"),
    (b"\x89PNG", "png", ".png"),
    (b"PK\x03\x04", "zip-container", ""),
]


def extract_drive_file_ids(text: str) -> list[str]:
    ids: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        for token in re.split(r"[\s,]+", line):
            token = token.strip()
            if not token:
                continue
            fid = ""
            if re.fullmatch(r"[-\w]{20,}", token):
                fid = token
            else:
                parsed = urllib.parse.urlparse(token)
                query = urllib.parse.parse_qs(parsed.query)
                if query.get("id"):
                    fid = query["id"][0]
                else:
                    match = re.search(r"/(?:file/)?d/([-\w]{20,})", parsed.path)
                    if match:
                        fid = match.group(1)
            if fid and fid not in ids:
                ids.append(fid)
    return ids


def probe_access(file_id: str, timeout: int = 30) -> tuple[str, str]:
    """Return (verdict, detail) without downloading: public | private | error."""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            content_type = (response.headers.get("Content-Type") or "").lower()
            final_url = response.geturl()
            if "text/html" not in content_type:
                return ("public", content_type)
            body = response.read(4096).decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001 - report and move on
        return ("error", f"{type(exc).__name__}: {exc}")

    if "accounts.google.com" in final_url or "ServiceLogin" in body:
        return ("private", "login required")
    if "download" in body.lower():
        return ("public", "large-file confirm page")
    return ("error", "unrecognised HTML response")


def ascii_slug(value: str, fallback: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value)
    slug = re.sub(r"-{2,}", "-", slug).strip("-._")
    slug = slug[:40].rstrip("-._")
    return slug if len(slug) >= 3 else fallback


def sniff_kind(path: Path) -> tuple[str, str]:
    with path.open("rb") as file:
        header = file.read(8)
    for magic, kind, ext in MAGIC_KINDS:
        if header.startswith(magic):
            return kind, ext
    return "unknown", ""


def sha1_of(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as file:
        while True:
            chunk = file.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"WARNING: {path} is not valid JSON; starting a fresh manifest.")
    return {}


def save_manifest(path: Path, manifest: dict) -> None:
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def install_cookies(cookies_path: Path) -> Path:
    cache_dir = Path.home() / ".cache" / "gdown"
    cache_dir.mkdir(parents=True, exist_ok=True)
    target = cache_dir / "cookies.txt"
    shutil.copyfile(cookies_path, target)
    return target


def download_one(file_id: str, work_dir: Path, retries: int, quiet: bool) -> Path:
    import gdown

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            result = gdown.download(
                id=file_id,
                output=str(work_dir) + os.sep,
                quiet=quiet,
                use_cookies=True,
            )
            if result:
                return Path(result)
            last_error = RuntimeError("gdown returned no file (permission or quota issue)")
        except Exception as exc:  # noqa: BLE001 - retry then report
            last_error = exc
        if attempt < retries:
            time.sleep(min(2 ** (attempt + 1), 10))
    raise RuntimeError(str(last_error))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--links", default=str(REPO_ROOT / "books" / "links.txt"))
    parser.add_argument("--out", default=str(REPO_ROOT / "books"))
    parser.add_argument("--check", action="store_true", help="Probe access only; download nothing.")
    parser.add_argument("--cookies", default="", help="Netscape cookies.txt to install for gdown.")
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--quiet", action="store_true", help="Hide per-file progress bars.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    links_path = Path(args.links)
    if not links_path.exists():
        print(f"ERROR: links file not found: {links_path}", file=sys.stderr)
        return 1

    ids = extract_drive_file_ids(links_path.read_text(encoding="utf-8"))
    if not ids:
        print("ERROR: no Google Drive file ids found in the links file.", file=sys.stderr)
        return 1
    print(f"Found {len(ids)} unique Drive file id(s) in {links_path.name}")

    if args.check:
        counts = {"public": 0, "private": 0, "error": 0}
        for index, fid in enumerate(ids, start=1):
            verdict, detail = probe_access(fid)
            counts[verdict] += 1
            print(f"[{index:02d}/{len(ids)}] {verdict.upper():7s} {fid} ({detail})")
        print(f"\npublic: {counts['public']}  private: {counts['private']}  error: {counts['error']}")
        if counts["private"]:
            print(
                "\nPrivate files cannot be downloaded anonymously. Either share them\n"
                "('Anyone with the link' on the form's '(File responses)' folder in\n"
                "Drive) or pass --cookies with a cookies.txt exported from a logged-in\n"
                "browser session."
            )
        return 0 if counts["public"] == len(ids) else 1

    try:
        import gdown  # noqa: F401
    except ImportError:
        print("ERROR: gdown is not installed. Run: py -3 -m pip install gdown", file=sys.stderr)
        return 1

    if args.cookies:
        cookies_source = Path(os.path.expandvars(args.cookies)).expanduser()
        if not cookies_source.exists():
            print(f"ERROR: cookies file not found: {cookies_source}", file=sys.stderr)
            return 1
        installed = install_cookies(cookies_source)
        print(f"Installed cookies for gdown at {installed}")

    books_dir = Path(args.out)
    books_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = books_dir / "manifest.json"
    manifest = load_manifest(manifest_path)
    seen_hashes = {
        entry["sha1"]: entry["saved_as"]
        for entry in manifest.values()
        if isinstance(entry, dict) and entry.get("sha1")
    }

    ok = skipped = failed = 0
    for index, fid in enumerate(ids, start=1):
        prefix = f"[{index:02d}/{len(ids)}]"
        entry = manifest.get(fid)
        if (
            isinstance(entry, dict)
            and entry.get("status") == "ok"
            and (books_dir / entry.get("saved_as", "")).exists()
        ):
            print(f"{prefix} SKIP {entry['saved_as']} (already downloaded)")
            skipped += 1
            continue

        print(f"{prefix} downloading {fid}")
        try:
            with tempfile.TemporaryDirectory(prefix="book-dl-") as temp_dir:
                downloaded = download_one(fid, Path(temp_dir), args.retries, args.quiet)
                original_name = downloaded.name
                kind, kind_ext = sniff_kind(downloaded)
                ext = downloaded.suffix.lower()
                if kind == "pdf":
                    ext = ".pdf"
                elif not ext and kind_ext:
                    ext = kind_ext
                slug = ascii_slug(downloaded.stem, fallback=fid[:10])
                saved_as = f"{index:02d}_{slug}{ext}"
                target = books_dir / saved_as
                shutil.move(str(downloaded), target)

            size = target.stat().st_size
            digest = sha1_of(target)
            duplicate_of = seen_hashes.get(digest, "")
            if duplicate_of and duplicate_of != saved_as:
                print(f"{prefix}   NOTE: identical content to {duplicate_of}")
            else:
                seen_hashes[digest] = saved_as

            manifest[fid] = {
                "status": "ok",
                "saved_as": saved_as,
                "original_name": original_name,
                "kind": kind,
                "bytes": size,
                "sha1": digest,
                "duplicate_of": duplicate_of,
                "downloaded_at": datetime.now(timezone.utc).isoformat(),
            }
            save_manifest(manifest_path, manifest)
            ok += 1
            print(f"{prefix} OK   {saved_as}  ({size / 1e6:.1f} MB, {kind})  ← {original_name}")
            if kind not in ("pdf",):
                print(f"{prefix}   WARNING: not a PDF — the OCR batch will skip this file.")
        except Exception as exc:  # noqa: BLE001 - record and continue
            failed += 1
            manifest[fid] = {
                "status": "failed",
                "error": str(exc)[:500],
                "attempted_at": datetime.now(timezone.utc).isoformat(),
            }
            save_manifest(manifest_path, manifest)
            print(f"{prefix} FAIL {fid}: {exc}", file=sys.stderr)

    print(f"\nDone. downloaded: {ok}  skipped: {skipped}  failed: {failed}")
    print(f"Manifest: {manifest_path}")
    if failed:
        print(
            "Some downloads failed. If the error mentions permissions, run\n"
            "  py -3 tools/download_books.py --check\n"
            "and see the sharing instructions it prints.",
            file=sys.stderr,
        )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
