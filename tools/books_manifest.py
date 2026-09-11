"""The 2026-09-11 book intake: manifest, links file, verification, sorting.

Input is the raw Drive listing captured on 11 September 2026
(pipeline/books_drive_listing_2026-09-11.json — 45 files, ~1.46 GB, uploaded
through the Google Form's "upload a book or pamphlet" question by Adil Ahsan
and Saifullah Imtiaz). Output is what the OCR machine needs:

  pipeline/books_manifest_2026-09-11.tsv   one row per Drive file: uploader,
                                           language guess, duplicate-of, whether
                                           it is already in books/ or out/ocr/,
                                           and how the pipeline will route it
  pipeline/books_links_2026-09-11.txt      the unique ids, one per line, in the
                                           shape tools/download_books.py reads

Both are regenerated from the JSON, so edit the rules here, not the TSV.

  python3 tools/books_manifest.py                  # (re)build TSV + links file
  python3 tools/books_manifest.py --verify         # fill downloaded_bytes/sha256
                                                   # from books/incoming-2026-09-11/
  python3 tools/books_manifest.py --sort-downloaded
      # move the English-print PDFs into books/incoming-2026-09-11-english/ so
      # they are OCRed with Tesseract (eng), never with UTRNet (Urdu-only)

Language is guessed from the title and the uploader, and says so in the
column name. Nothing here asserts what a book *is*; it records what the
filename says and which OCR engine that implies. RULE 2 applies to
bibliographies too — a guess is labelled a guess.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

from _lib import OCR_ROOT, REPO_ROOT, safe_filename_part, utf8_stdio

utf8_stdio()

LISTING = REPO_ROOT / "pipeline" / "books_drive_listing_2026-09-11.json"
MANIFEST_TSV = REPO_ROOT / "pipeline" / "books_manifest_2026-09-11.tsv"
LINKS_TXT = REPO_ROOT / "pipeline" / "books_links_2026-09-11.txt"
INCOMING = REPO_ROOT / "books" / "incoming-2026-09-11"
INCOMING_ENGLISH = REPO_ROOT / "books" / "incoming-2026-09-11-english"
OLD_BOOKS = REPO_ROOT / "books"

COLUMNS = [
    "file_id", "title", "size_bytes", "kind", "uploader", "language_guess",
    "duplicate_of", "already_in_books", "already_ocrd", "routing", "note",
    "saved_as", "downloaded_bytes", "sha256", "drive_created",
]

UPLOADER_RE = re.compile(r"\s*-\s*(adil ahsan|saifullah imtiaz)\s*(?:\.(?:pdf|epub))?\s*$", re.IGNORECASE)

# Title-keyed overrides for the Urdu/Persian scans (uploaded by Saifullah
# Imtiaz). Everything from Adil Ahsan is an English-language print book (libgen
# PDFs of academic presses), which the rule below handles without a table.
SAIFULLAH_RULES: list[tuple[re.Pattern[str], str, str, str]] = [
    # (title pattern, language_guess, routing, note)
    (re.compile(r"^Masnavi_0\d", re.I), "Persian (Rumi's Masnavi) — scan; an Urdu translation may be interleaved",
     "UTRNet (Persian Naskh transcribed near-perfectly on book 24 in July)",
     "Six volumes. Masnavi_01 and Masnavi_01_text are two files of volume 1 (80 MB vs 105 MB); the '_text' one may carry a text layer — the pdftotext probe decides."),
    (re.compile(r"Khulasat Ut Tawarikh", re.I), "Persian chronicle, or its Urdu translation — open page 1 before trusting either",
     "UTRNet", ""),
    (re.compile(r"^revisedtranslati00nizauoft", re.I), "UNKNOWN — archive.org scan; the filename is an archive.org identifier, not a title",
     "HOLD — open the first page and move it by hand to the Urdu folder (UTRNet) or the -english folder (Tesseract)",
     "Do not batch this blind: UTRNet on an English scan produces garbage that finalize_books.py cannot flag for a book it has no BOOKS_INFO row for."),
    (re.compile(r"Tareeq-Lahore", re.I), "Urdu (scan)", "UTRNet",
     "2015.398396 is a Digital Library of India id. Possibly the same work as the 'Tarikh-e-Lahore (1884)' link added to books/links.txt on 2026-08-09 (id 1JXAGvxVyJKqrpYFwDUET4x288bpKjW9z, 67.1 MB) — different file, different size; not asserted."),
    (re.compile(r"Tazkirah-Awliya-e-Pak-o-Hind", re.I), "Urdu (scan)", "UTRNet",
     "NOT the same work as the finished 01_00529/02_00530 'Tazkirah-Awliya-e-Pakistan' volumes — different title, different archive number (00523)."),
    (re.compile(r"Tahqiqaat-Chishti", re.I), "Urdu (scan)", "UTRNet", ""),
    (re.compile(r"HADEEQAT-UL-AULIA", re.I), "Urdu (scan)", "UTRNet", ""),
    (re.compile(r"Wasif Ali Wasif", re.I), "Urdu print (scan)", "UTRNet", "Wasif Ali Wasif has a shrine page in the archive (slug wasif-ali-wasif)."),
    (re.compile(r"Shah Jamal-ul-Bahr", re.I), "Urdu (scan)", "UTRNet", "Shah Jamal has a shrine page in the archive (slug shah-jamal)."),
]

ENGLISH_ROUTING = (
    "text layer expected (born-digital PDF): ocr_all_books.py extracts it with pdftotext "
    "and never OCRs; if the probe fails, run the -english folder with --ocr-engine tesseract "
    "--ocr-lang eng"
)


def uploader_of(title: str) -> str:
    match = UPLOADER_RE.search(title)
    return match.group(1).title() if match else ""


def classify(entry: dict) -> tuple[str, str, str]:
    """(language_guess, routing, note) for one listing entry."""
    title = entry["title"].strip()
    if entry["mimeType"] == "application/epub+zip":
        return ("English (EPUB, born-digital)",
                "tools/extract_epub_text.py (no OCR; EPUB text is already text)", "")
    who = uploader_of(title)
    if who == "Adil Ahsan":
        note = ""
        if entry["size"] > 80_000_000:
            note = "Large for a born-digital PDF — probably page images; expect the pdftotext probe to fail and Tesseract (eng) to take it."
        return ("English print (academic / literary translation)", ENGLISH_ROUTING, note)
    for pattern, language, routing, note in SAIFULLAH_RULES:
        if pattern.search(title):
            return (language, routing, note)
    return ("Urdu (scan) — by uploader, not verified", "UTRNet", "No title rule matched; treated as an Urdu scan because every other Saifullah Imtiaz upload has been one.")


def load_listing() -> list[dict]:
    data = json.loads(LISTING.read_text(encoding="utf-8"))
    files = sorted(data["files"], key=lambda f: f["createdTime"])
    ids = [f["id"] for f in files]
    if len(ids) != len(set(ids)):
        raise SystemExit("listing has duplicate ids — re-capture it")
    return files


def existing_state() -> tuple[set[str], dict[int, str], set[str]]:
    """Ids already recorded in books/, sizes of PDFs already in books/, and out/ocr book names."""
    known_ids: set[str] = set()
    manifest = OLD_BOOKS / "manifest.json"
    if manifest.exists():
        known_ids |= set(json.loads(manifest.read_text(encoding="utf-8")).keys())
    links = OLD_BOOKS / "links.txt"
    if links.exists():
        known_ids |= set(re.findall(r"id=([-\w]{20,})", links.read_text(encoding="utf-8")))
    sizes = {p.stat().st_size: p.name for p in OLD_BOOKS.glob("*.pdf")}
    ocr_names = {p.name for p in OCR_ROOT.iterdir() if p.is_dir()} if OCR_ROOT.is_dir() else set()
    return known_ids, sizes, ocr_names


def near_ocr_name(title: str, ocr_names: set[str]) -> str:
    """A conservative hint only: shared 8+-char alphabetic token with a finished book."""
    tokens = {t.lower() for t in re.findall(r"[A-Za-z]{8,}", title)}
    hits = []
    for name in sorted(ocr_names):
        name_tokens = {t.lower() for t in re.findall(r"[A-Za-z]{8,}", name)}
        if tokens & name_tokens:
            hits.append(name)
    return "; ".join(hits)


def build_rows(files: list[dict]) -> list[dict]:
    known_ids, old_sizes, ocr_names = existing_state()
    seen_size_title: dict[tuple[int, str], str] = {}
    rows: list[dict] = []
    for f in files:
        title = f["title"].strip()
        key = (f["size"], re.sub(r"\s+", " ", title.lower()))
        duplicate_of = seen_size_title.get(key, "")
        if not duplicate_of:
            seen_size_title[key] = f["id"]
        language, routing, note = classify(f)
        in_books = ""
        if f["id"] in known_ids:
            in_books = "yes (id in books/manifest.json or links.txt)"
        elif f["size"] in old_sizes:
            in_books = f"size-match: {old_sizes[f['size']]} — check by hash before skipping"
        near = near_ocr_name(title, ocr_names)
        already = "no"
        if near:
            already = "no"  # a shared token is a hint for a human, never a match
            note = (note + " " if note else "") + f"Shares a name token with finished book(s): {near} — verified not the same work only where the note above says so."
        if duplicate_of:
            note = (note + " " if note else "") + "Same byte size and title as an earlier upload — duplicate; download the earlier id only."
        rows.append({
            "file_id": f["id"],
            "title": title,
            "size_bytes": f["size"],
            "kind": "epub" if f["mimeType"] == "application/epub+zip" else "pdf",
            "uploader": uploader_of(title) or "(no uploader suffix)",
            "language_guess": language,
            "duplicate_of": duplicate_of,
            "already_in_books": in_books or "no",
            "already_ocrd": already,
            "routing": routing,
            "note": note,
            "saved_as": "",
            "downloaded_bytes": "",
            "sha256": "",
            "drive_created": f["createdTime"],
        })
    return rows


def read_tsv() -> list[dict]:
    with MANIFEST_TSV.open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh, delimiter="\t"))


def write_tsv(rows: list[dict]) -> None:
    with MANIFEST_TSV.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=COLUMNS, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in COLUMNS})


def write_links(rows: list[dict]) -> int:
    lines = [
        "# Book uploads from the Google Form's file-response folder, captured 2026-09-11.",
        "# Built by tools/books_manifest.py from pipeline/books_drive_listing_2026-09-11.json —",
        "# duplicates (same size + title) and anything already in books/ are left out.",
        "# Download:  python3 tools/download_books.py --links pipeline/books_links_2026-09-11.txt \\",
        "#                --out books/incoming-2026-09-11 [--cookies ~/Downloads/cookies.txt]",
        "# The files are private to the project Drive: anonymous download was refused on",
        "# 2026-09-11 (every id redirected to a Google sign-in), so --cookies is required.",
        "",
    ]
    count = 0
    for row in rows:
        if row["duplicate_of"] or row["already_in_books"].startswith("yes"):
            continue
        lines.append(f"# {row['title']}  ({int(row['size_bytes']) / 1e6:.1f} MB, {row['language_guess'].split(' — ')[0]})")
        lines.append(f"https://drive.google.com/open?id={row['file_id']}")
        count += 1
    LINKS_TXT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return count


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify(rows: list[dict]) -> int:
    """Fill saved_as / downloaded_bytes / sha256 from the incoming folders' download manifests."""
    problems = 0
    by_id = {r["file_id"]: r for r in rows}
    for folder in (INCOMING, INCOMING_ENGLISH):
        manifest = folder / "manifest.json"
        if not manifest.exists():
            continue
        entries = json.loads(manifest.read_text(encoding="utf-8"))
        for fid, entry in entries.items():
            row = by_id.get(fid)
            if not row or not isinstance(entry, dict) or entry.get("status") != "ok":
                continue
            path = folder / entry["saved_as"]
            if not path.exists():
                path = (INCOMING_ENGLISH if folder == INCOMING else INCOMING) / entry["saved_as"]
            if not path.exists():
                print(f"MISSING  {entry['saved_as']} (in manifest, not on disk)")
                problems += 1
                continue
            size = path.stat().st_size
            row["saved_as"] = str(path.relative_to(REPO_ROOT))
            row["downloaded_bytes"] = str(size)
            row["sha256"] = sha256_of(path)
            expected = int(row["size_bytes"])
            if size != expected:
                print(f"SIZE MISMATCH {path.name}: Drive says {expected}, disk has {size}")
                problems += 1
            else:
                print(f"OK       {path.name} ({size / 1e6:.1f} MB)")
    downloaded = sum(1 for r in rows if r["downloaded_bytes"])
    wanted = sum(1 for r in rows if not r["duplicate_of"] and not r["already_in_books"].startswith("yes"))
    print(f"\nverified {downloaded} of {wanted} wanted files; {problems} problem(s)")
    return problems


def sort_downloaded(rows: list[dict]) -> int:
    """Move English-print PDFs (and the EPUB) out of the UTRNet folder."""
    manifest = INCOMING / "manifest.json"
    if not manifest.exists():
        print(f"nothing to sort: {manifest} does not exist yet")
        return 0
    entries = json.loads(manifest.read_text(encoding="utf-8"))
    by_id = {r["file_id"]: r for r in rows}
    moved = 0
    INCOMING_ENGLISH.mkdir(parents=True, exist_ok=True)
    for fid, entry in entries.items():
        row = by_id.get(fid)
        if not row or not isinstance(entry, dict) or entry.get("status") != "ok":
            continue
        src = INCOMING / entry["saved_as"]
        if not src.exists():
            continue
        english = row["language_guess"].startswith("English")
        if english:
            dst = INCOMING_ENGLISH / entry["saved_as"]
            shutil.move(str(src), dst)
            moved += 1
            print(f"-> english  {entry['saved_as']}")
    # download_books.py's own manifest stays in INCOMING; --verify looks in both folders.
    print(f"moved {moved} file(s) to {INCOMING_ENGLISH.relative_to(REPO_ROOT)}")
    held = [r for r in rows if r["routing"].startswith("HOLD")]
    for r in held:
        print(f"HOLD     {r['title']} — {r['routing']}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--verify", action="store_true", help="Fill download columns from the incoming folders.")
    parser.add_argument("--sort-downloaded", action="store_true", help="Move English PDFs to the -english folder.")
    args = parser.parse_args(argv)

    if args.verify or args.sort_downloaded:
        if not MANIFEST_TSV.exists():
            print(f"ERROR: {MANIFEST_TSV} not built yet — run without flags first", file=sys.stderr)
            return 1
        rows = read_tsv()
        code = 0
        if args.sort_downloaded:
            code |= sort_downloaded(rows)
        if args.verify:
            code |= 1 if verify(rows) else 0
            write_tsv(rows)
            print(f"wrote {MANIFEST_TSV.relative_to(REPO_ROOT)}")
        return code

    files = load_listing()
    rows = build_rows(files)
    write_tsv(rows)
    count = write_links(rows)
    total = sum(int(r["size_bytes"]) for r in rows)
    wanted_bytes = sum(int(r["size_bytes"]) for r in rows if not r["duplicate_of"] and not r["already_in_books"].startswith("yes"))
    dups = sum(1 for r in rows if r["duplicate_of"])
    english = sum(1 for r in rows if r["language_guess"].startswith("English") and not r["duplicate_of"])
    print(f"{len(rows)} files in the Drive listing, {total / 1e6:.0f} MB")
    print(f"{dups} duplicate upload(s) skipped; {count} unique files to download, {wanted_bytes / 1e6:.0f} MB")
    print(f"{english} English-print (text-layer / Tesseract route), {count - english} Urdu/Persian scans or unknown (UTRNet route)")
    print(f"wrote {MANIFEST_TSV.relative_to(REPO_ROOT)} and {LINKS_TXT.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
