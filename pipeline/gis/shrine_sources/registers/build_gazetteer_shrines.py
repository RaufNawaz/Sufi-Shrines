"""Transcribe the shrines that Malik and Mirza list from the colonial Punjab District Gazetteers.

Reads Appendix 1, "Notable Shrines Mentioned in the Punjab District Gazetteers", of
    Malik, A. and Mirza, R. A. (2015). Religion, Land and Politics: Shrines and Literacy in Punjab.
    IFPRI Pakistan Strategy Support Program, Working Paper 30 (pp. 32-34 of the paper, pdf pp. 37-39),
saved under pipeline/gis/sources/shrine_dbs/registers/academic_malik_mirza/ifpri_pssp_wp30.pdf, and writes
    pipeline/gis/shrine_sources/registers/gazetteer_shrines_malik_mirza.csv

Run from anywhere, isolated, with the repository root as the only argument:
    python -I pipeline/gis/shrine_sources/registers/build_gazetteer_shrines.py "<repo root>"

Every field is the appendix's own text. The only edits are joining a cell the PDF wrapped onto the next
line (a hyphen at a line break is dropped: "Za-" + "karia" = "Zakaria") and reading "..." as no figure.
District and tehsil are the colonial ones the appendix gives (Montgomery is today's Sahiwal, Okara and
Pakpattan; Shahpur is Sargodha and Khushab; Bahawalpur is the former state). No district code is assigned
and no point exists: the appendix gives neither. See README_academic.md.
The script exits 1 if the row count drifts from the count checked by eye.
"""
import csv
import re
import sys
from pathlib import Path

from pypdf import PdfReader

PDF = Path("pipeline/gis/sources/shrine_dbs/registers/academic_malik_mirza/ifpri_pssp_wp30.pdf")
OUT = Path("pipeline/gis/shrine_sources/registers/gazetteer_shrines_malik_mirza.csv")
SOURCE = ("Malik and Mirza (2015), IFPRI PSSP Working Paper 30, Appendix 1: Notable Shrines Mentioned in the "
          "Punjab District Gazetteers (source line: 'Punjab District Gazetteers (various years)')")
PAGES = range(36, 39)  # 0-based pdf pages 37-39
DISTRICTS = ["Gujranwala", "Jhang", "Attock", "Rawalpindi", "Sialkot", "Gujrat", "Mianwali", "Montgomery",
             "Multan", "Muzaffargarh", "Bahawalpur", "Shahpur", "Jhelum"]
# Tehsils of more than one word, as the appendix spells them; the rest are one word or "...".
LONG_TEHSILS = ["Gujar Khan", "Esa Khel", "Kot Addu", "Rahim Yar Khan", "Pind Dadan Khan"]
# Counted by eye on the printed pages, 31 October 2026, district by district: Gujranwala 3, Jhang 9, Attock 4,
# Rawalpindi 5, Sialkot 2, Gujrat 2, Mianwali 15, Montgomery 10, Multan 9, Muzaffargarh 14, Bahawalpur 51,
# Shahpur 12, Jhelum 6. The paper's text says 146 shrines; the appendix prints 142 rows, one naming three pirs,
# one naming two, and one with no name. Ahmadpur has 14 rows where the text says 15. Recorded, not reconciled.
EXPECTED_ROWS = 142
COLUMNS = ["row", "colonial_district", "tehsil_as_written", "name_as_written", "fair_attendance_as_written",
           "paper_page", "pdf_page", "source", "note"]


def lines(pdf):
    out = []
    for i in PAGES:
        text = PdfReader(pdf).pages[i].extract_text() or ""
        started = i > PAGES[0]
        for raw in text.split("\n"):
            s = " ".join(raw.split())
            if not started:
                started = s.startswith("District Tehsil Name")
                continue
            if s.startswith("Source: Punjab District Gazetteers"):
                break
            if not s or s.startswith("SUMMARY |") or re.fullmatch(r"\d{2}", s):
                continue
            out.append((s, i + 1))
    return out


def rows(pdf):
    joined = []
    for s, page in lines(pdf):
        if s.split(" ")[0] in DISTRICTS:
            joined.append([s, page])
        elif joined[-1][0].endswith("-"):
            joined[-1][0] = joined[-1][0][:-1] + s
        else:
            joined[-1][0] += " " + s
    out = []
    for n, (s, page) in enumerate(joined, 1):
        district, rest = s.split(" ", 1)
        tehsil = next((t for t in LONG_TEHSILS if rest.startswith(t + " ")), rest.split(" ")[0])
        rest = rest[len(tehsil):].strip()
        m = re.fullmatch(r"(.*?)\s*(\d{1,3}(?:,\d{3})*|\.\.\.)", rest)
        if not m:
            sys.exit(f"row {n}: no attendance figure or '...' at the end: {s!r}")
        name, att = m.group(1).strip(), m.group(2)
        note = []
        if name in ("", "..."):
            note.append("the appendix prints no name in this row")
            name = ""
        if tehsil == "...":
            note.append("the appendix prints no tehsil in this row")
            tehsil = ""
        if "," in name:
            note.append("one row naming more than one saint, as printed")
        out.append({"row": n, "colonial_district": district, "tehsil_as_written": tehsil, "name_as_written": name,
                    "fair_attendance_as_written": "" if att == "..." else att, "paper_page": page - 5,
                    "pdf_page": page, "source": SOURCE, "note": "; ".join(note)})
    return out


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    data = rows(root / PDF)
    with open(root / OUT, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(data)
    by = {}
    for r in data:
        by[r["colonial_district"]] = by.get(r["colonial_district"], 0) + 1
    print(f"{len(data)} rows; by colonial district: {by}")
    if len(data) != EXPECTED_ROWS:
        print(f"FAIL: {len(data)} rows, expected {EXPECTED_ROWS} (counted by eye)")
        sys.exit(1)


if __name__ == "__main__":
    main()
