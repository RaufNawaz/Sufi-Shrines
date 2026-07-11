"""Verify finished transcriptions and publish them to out/ocr/Final/.

For every book with a full-book transcription (out/ocr/<book>/p001-end_*_transcribed.txt),
run automated verification:
  1. enough text for the book's page count (>= 80 chars/page on average),
  2. the script matches the book's language (Arabic-script books must be
     mostly Arabic-script characters; English books mostly Latin) — this
     catches Urdu OCR run on an English book and vice versa,
  3. not too many empty pages (from the batch log, when one exists).

Books that pass are COPIED to out/ocr/Final/ under a human-readable name:
the original uploaded title (from books/renames.json) plus the run date,
e.g. "Kashf-ul-Mahjoob__2026-07-01_2056.txt". A provenance JSON is copied
alongside when present. Books that fail are HELD with a reason.

State lives in out/ocr/Final/finalized.json; re-runs are idempotent.
--emit-new prints only status changes (for a watcher loop); the default
prints the full status table.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

REPO_ROOT = Path(__file__).resolve().parent.parent
OCR_ROOT = REPO_ROOT / "out" / "ocr"
FINAL_DIR = OCR_ROOT / "Final"
LOGS_DIR = OCR_ROOT / "logs"
RENAMES_PATH = REPO_ROOT / "books" / "renames.json"

MIN_CHARS_PER_PAGE = 80
MAX_EMPTY_PAGE_FRACTION = 0.15
MIN_SCRIPT_FRACTION = 0.60
UPLOADER_SUFFIX = re.compile(r"\s*-\s*saifullah\s+imtiaz\s*$", re.IGNORECASE)
ARABIC_CHARS = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
LATIN_CHARS = re.compile(r"[A-Za-z]")
WINDOWS_BAD = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

# Page counts and language per book (from pdfinfo + the visual audit of
# rendered pages, 2026-07-01). Language means the dominant BODY script:
# "arabic" covers Urdu/Punjabi-Shahmukhi/Persian/Arabic; "latin" is English.
BOOKS_INFO: dict[str, tuple[int, str]] = {
    "01_00529_Tazkirah-Awliya-e-Pakistan_1": (484, "arabic"),
    "02_00530_Tazkirah-Awliya-e-Pakistan_2": (504, "arabic"),
    "03_04_v38_2_2025": (13, "latin"),
    "04_2.-Sufis-and-the-Pre-colonial-Muslim-rulers-of-Ind": (19, "latin"),
    "05_282978288-Jamal-e-Rasool-by-Syed-Abul-Faiz-Qalanda": (203, "arabic"),
    "06_5419-Shah-Husain": (78, "latin"),
    "07_Allama-Muhammad-Iqbal": (466, "arabic"),
    "08_BaleJibreel": (159, "arabic"),
    "09_Bang-e-dara-By-ALLAMA-Iqbal": (272, "arabic"),
    "10_Bibian-e-Pak-Daman-by-Peer-Ghulam-Dastgir-Nami": (23, "arabic"),
    "11_Darbar-Abul-Faiz-Qalandari-Gilani-Soharwardi": (223, "arabic"),
    "12_Darbar-Bibi-Pak-Daman": (74, "arabic"),
    "13_Darbar-Hazrat-Gunj-Anayat-Sarkar": (93, "arabic"),
    "14_Darbar-Modho-Laal-Hussain": (236, "arabic"),
    "15_Exegetical-Notes-of-Holy-Quran-by-Shaykh-Hujwiri1": (112, "arabic"),
    "16_Fatih-e-Quloob-Syeduna-Data-Ganj-Bakhsh-Ali-Hajver": (229, "arabic"),
    "17_Hadrat-Data-Ganj-Bakhsh-ur": (164, "arabic"),
    "18_Hazrat-Bibi-Pak-Damanan-Lahore-ki-Tareekh-by-Hafee": (16, "arabic"),
    "19_Hazrat-Data-Ali-Hajvairy-No-by-Anwar-e-Raza": (730, "arabic"),
    "20_Hazrat-Mian-Mir-And-The-Sufi-Tradition": (176, "latin"),
    "21_Kalam-Shah-Hussain-r.a.-by-syed-babar-ali": (170, "arabic"),
    "22_Kashf-ul-Mahjoob": (569, "arabic"),
    "23_maslik_data_ganj_baksh": (15, "arabic"),
    "24_Sakinat-al-Auliya-main-meer": (318, "arabic"),
    "25_Seerat-Hazrat-Ali-Hajveri": (161, "arabic"),
    "26_Seerat-Hazrat-Data-Ganj-Bakhsh-Rehmatullah-Alaih": (146, "arabic"),
    "27_Shah_Hussain": (224, "arabic"),
    "28_Talzeem-e-Ala-Hazrat-Abul-Faiz-Sufi-Qlandar-Ali-so": (14, "arabic"),
    "29_tareekh-e-beebiyan-pakdamna-mohammad-bakhsh-shaah": (371, "arabic"),
    "30_hazrat-bibi-pakdamanan-kaun-hain": (95, "arabic"),
}


def human_title(stem: str, renames: dict[str, str]) -> str:
    original = renames.get(f"{stem}.pdf", "")
    if original:
        title = Path(original).stem
        title = UPLOADER_SUFFIX.sub("", title).strip()
        if title.lower().endswith(".pdf"):
            title = title[:-4]
    else:
        title = re.sub(r"^\d+_", "", stem)
    title = WINDOWS_BAD.sub("-", title).strip(" .-") or stem
    return title[:120]


def newest_transcription(book_dir: Path) -> Path | None:
    candidates = [
        path for path in book_dir.glob("p001-end_*_transcribed.txt")
        if path.name.endswith("_transcribed.txt")
    ]
    return max(candidates, default=None, key=lambda p: p.name)


def verify(stem: str, source: Path, text: str) -> str:
    """Return "" if the transcription passes, else a hold reason."""
    pages, language = BOOKS_INFO.get(stem, (0, "arabic"))

    if pages and len(text) < MIN_CHARS_PER_PAGE * pages:
        return (
            f"too little text ({len(text)} chars for {pages} pages; "
            f"expected >= {MIN_CHARS_PER_PAGE * pages})"
        )

    arabic = len(ARABIC_CHARS.findall(text))
    latin = len(LATIN_CHARS.findall(text))
    letters = arabic + latin
    if letters:
        fraction = (arabic if language == "arabic" else latin) / letters
        if fraction < MIN_SCRIPT_FRACTION:
            return (
                f"script mismatch: expected {language}, got "
                f"{arabic / letters:.0%} arabic / {latin / letters:.0%} latin "
                "(wrong OCR engine for this book's language?)"
            )

    log_path = LOGS_DIR / f"{stem}.log"
    if pages and log_path.exists():
        empty = log_path.read_text(encoding="utf-8", errors="replace").count("WARNING: page")
        if empty > max(2, int(pages * MAX_EMPTY_PAGE_FRACTION)):
            return f"{empty} of {pages} pages produced no text — check the scan/log"

    return ""


def timestamp_label(source_name: str) -> str:
    match = re.search(r"_(\d{8})_(\d{6})_", source_name)
    if not match:
        return "undated"
    date, clock = match.group(1), match.group(2)
    return f"{date[:4]}-{date[4:6]}-{date[6:]}_{clock[:4]}"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--emit-new", action="store_true",
                        help="Print only status changes (for a watcher loop).")
    args = parser.parse_args(argv)

    renames: dict[str, str] = {}
    if RENAMES_PATH.exists():
        renames = json.loads(RENAMES_PATH.read_text(encoding="utf-8"))

    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    state_path = FINAL_DIR / "finalized.json"
    state: dict[str, dict] = {}
    if state_path.exists():
        state = json.loads(state_path.read_text(encoding="utf-8"))

    changes = 0
    for book_dir in sorted(OCR_ROOT.iterdir()):
        stem = book_dir.name
        if not book_dir.is_dir() or stem in ("logs", "Final") or stem not in BOOKS_INFO:
            continue
        source = newest_transcription(book_dir)
        if source is None:
            continue

        entry = state.get(stem, {})
        already = entry.get("status") == "finalized" and entry.get("source") == source.name
        if already and (FINAL_DIR / entry.get("final_name", "")).exists():
            if not args.emit_new:
                print(f"OK        {stem}: already finalized as {entry['final_name']}")
            continue

        text = source.read_text(encoding="utf-8", errors="replace")
        reason = verify(stem, source, text)
        if reason:
            changed = entry.get("status") != "held" or entry.get("reason") != reason \
                or entry.get("source") != source.name
            state[stem] = {"status": "held", "reason": reason, "source": source.name}
            if changed or not args.emit_new:
                changes += 1
                print(f"HOLD      {stem}: {reason}")
            continue

        final_name = f"{human_title(stem, renames)}__{timestamp_label(source.name)}.txt"
        shutil.copyfile(source, FINAL_DIR / final_name)
        provenance = source.with_name(source.name.replace("_transcribed.txt", "_provenance.json"))
        if provenance.exists():
            shutil.copyfile(provenance, FINAL_DIR / (final_name[:-4] + ".provenance.json"))
        state[stem] = {
            "status": "finalized",
            "source": source.name,
            "final_name": final_name,
            "chars": len(text),
            "finalized_at": datetime.now(timezone.utc).isoformat(),
        }
        changes += 1
        print(f"FINALIZED {final_name}  ({len(text)} chars, from {stem})")

    state_path.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    if not args.emit_new:
        done = sum(1 for entry in state.values() if entry.get("status") == "finalized")
        held = sum(1 for entry in state.values() if entry.get("status") == "held")
        print(f"\nfinalized: {done}  held: {held}  (of {len(BOOKS_INFO)} books)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
