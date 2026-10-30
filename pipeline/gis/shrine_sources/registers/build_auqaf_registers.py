"""Transcribe the provincial Auqaf shrine registers that are published as HTML.

Reads the raw pages saved under
    pipeline/gis/sources/shrine_dbs/registers/<source>/
and writes
    pipeline/gis/shrine_sources/registers/auqaf_registers.csv
    pipeline/gis/shrine_sources/registers/auqaf_district_totals.csv

Run from anywhere, isolated, with the repository root as the only argument:
    python -I pipeline/gis/shrine_sources/registers/build_auqaf_registers.py "<repo root>"

Nothing here infers a district. A district is recorded only where the document states
one (a "DISTRICT X" heading, or "District X" / "Distt X" inside the entry), and a
district_code only where that statement maps unambiguously to the current dictionary.
Every other row carries its zone or circle in `note`. See README_auqaf.md.
The script exits non-zero if a parse count drifts from what was checked by eye.
"""
import csv
import html
import re
import sys
from pathlib import Path

FETCHED_ON = "2026-10-30"
COLUMNS = ["register", "province", "district_as_written", "district_code", "name_as_written",
           "name_ur", "tradition", "source_url", "source_locator", "source_date", "fetched_on", "note"]
TOTAL_COLUMNS = ["register", "province", "district_as_written", "district_code", "stated_total",
                 "what_is_counted", "source_url", "source_locator", "source_date"]


def html_to_lines(path: Path) -> list[str]:
    t = path.read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    t = re.sub(r"<(td|th)[^>]*>", " | ", t)
    t = re.sub(r"<tr[^>]*>", "\n", t)
    t = re.sub(r"<br\s*/?>|</p>|</li>|</h\d>|</div>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    out = []
    for line in t.split("\n"):
        line = re.sub(r"[ \t\xa0]+", " ", line).strip()
        line = re.sub(r"^\|\s*", "", line).strip()
        if line:
            out.append(line)
    return out


# ---------------------------------------------------------------- Punjab
PUNJAB_URL = "https://auqaf.punjab.gov.pk/shrines"
PUNJAB_ZONES = ["Lahore Zone", "Gujranwala Zone", "Rawalpindi Zone", "Faisalabad Zone",
                "Sargodha Zone", "Pakpattan Zone", "Multan Zone", "Dera Ghazi Khan Zone",
                "Bahawalpur Zone"]
PUNJAB_ITEM = re.compile(r"^(Darbar|Dargah|Darabr|Baithak)\b")
# Districts stated inside an entry's own text. Only these two entries state one.
PUNJAB_STATED = {
    "Darbar & Masjid Hazrat Noor Shah Bukhari Distt Khanewal": ("Distt Khanewal", "PK615", ""),
    "Darbar Hazrat Abdul Waheed Dist. Khoshan": (
        "Dist. Khoshan", "",
        "'Khoshan' is not a district name; probably Khushab (Sargodha Zone) but not stated, so no code"),
}
# Counts cross-checked on 2026-10-30 by an independent awk count over the extracted text.
PUNJAB_EXPECTED = {"Lahore Zone": 108, "Gujranwala Zone": 73, "Rawalpindi Zone": 71,
                   "Faisalabad Zone": 56, "Sargodha Zone": 25, "Pakpattan Zone": 52,
                   "Multan Zone": 32, "Dera Ghazi Khan Zone": 27, "Bahawalpur Zone": 35}


def punjab(src: Path) -> list[dict]:
    lines = html_to_lines(src / "shrines.html")
    start = lines.index("Zone-Wise Shrines")
    # skip the in-page table of contents: the first nine zone names after the heading
    i = start + 1
    seen_toc = 0
    while seen_toc < len(PUNJAB_ZONES):
        if lines[i] in PUNJAB_ZONES:
            seen_toc += 1
        i += 1
    rows, zone, n_in_zone = [], None, 0
    for line in lines[i:]:
        if line.startswith("TendersCareers"):
            break
        if line in PUNJAB_ZONES:
            zone, n_in_zone = line, 0
            continue
        if line == "Top":
            continue
        if not PUNJAB_ITEM.match(line):
            sys.exit(f"punjab: unexpected line inside zone list: {line!r}")
        n_in_zone += 1
        dist, code, extra = PUNJAB_STATED.get(line, ("", "", ""))
        note = f"zone={zone}; the register is organised by Auqaf zone, not district; no district stated"
        if dist:
            note = f"zone={zone}; district stated inside the entry text" + (f"; {extra}" if extra else "")
        rows.append(dict(register="Punjab Auqaf & Religious Affairs Department - Zone-Wise Shrines (website)",
                         province="Punjab", district_as_written=dist, district_code=code,
                         name_as_written=line, name_ur="", tradition="Muslim Shrine",
                         source_url=PUNJAB_URL,
                         source_locator=f"'Zone-Wise Shrines' > '{zone}', item {n_in_zone} in page order",
                         source_date="undated web page", fetched_on=FETCHED_ON, note=note))
    counts = {z: sum(1 for r in rows if f"zone={z};" in r["note"]) for z in PUNJAB_ZONES}
    if counts != PUNJAB_EXPECTED:
        sys.exit(f"punjab: zone counts drifted: {counts}")
    # Data Darbar is in the page's 'Major Shrines' list but not in any zone list
    # (it has its own 'Data Darbar Zone' office per /our-offices).
    major = lines[lines.index("Major Shrines") + 1: start]
    dd = [m for m in major if "Data Gunj" in m]
    if len(dd) != 1:
        sys.exit("punjab: Data Darbar not found exactly once in Major Shrines")
    rows.append(dict(register="Punjab Auqaf & Religious Affairs Department - Zone-Wise Shrines (website)",
                     province="Punjab", district_as_written="", district_code="",
                     name_as_written=dd[0], name_ur="", tradition="Muslim Shrine", source_url=PUNJAB_URL,
                     source_locator="'Major Shrines' list (absent from every zone list)",
                     source_date="undated web page", fetched_on=FETCHED_ON,
                     note="listed only under 'Major Shrines'; administered by a separate 'Data Darbar Zone' "
                          "(https://auqaf.punjab.gov.pk/our-offices); the text names Lahore as a place, "
                          "not as a district"))
    return rows


# ---------------------------------------------------------------- Sindh
SINDH_URL = "https://arazud.sindh.gov.pk/list-of-dargahs-mosques"
SINDH_SRNO = re.compile(r"^(\d+)/(\d+)$")
# Heading -> (district_code, note). A heading is coded only when it says DISTRICT and the
# district maps to the current dictionary without a split or redraw in between.
SINDH_HEADINGS = {
    "DISTRICT MIRPURKHAS": ("PK716", "heading states the district"),
    "DISTRICT TANDO MUHAMMAD KHAN": ("PK725", "heading states the district"),
    "DISTRICT WEST KARACHI": ("", "heading states 'DISTRICT WEST KARACHI', but Karachi's districts were "
                                  "redrawn (2011, Korangi 2013, Keamari 2020), so the current district is "
                                  "ambiguous; no code"),
}
# Entries whose own text states a district (overrides the heading) or conflicts with it.
SINDH_ENTRY = {
    18: ("District Badin", "PK701", "entry text states District Badin although it sits under the heading "
                                    "'DISTRICT MIRPURKHAS'"),
    20: ("", "", "entry text names Hyderabad although it sits under 'DISTRICT MIRPURKHAS'; conflict, no code"),
    26: ("District Thatta", "", "entry text states District Thatta; Sujawal District was split from Thatta "
                                "in 2013, so the current district is ambiguous; no code"),
    27: ("District Thatta", "", "entry text states District Thatta; Sujawal District was split from Thatta "
                                "in 2013, so the current district is ambiguous; no code"),
    28: ("District Badin", "PK701", "entry text states District Badin although it sits under the heading "
                                    "'DISTRICT TANDO MUHAMMAD KHAN'"),
    34: ("District Dadu", "PK703", "entry text states District Dadu"),
    45: ("District Jacobabad", "", "entry text states District Jacobabad, but Kandhkot is in Kashmore "
                                   "District, split from Jacobabad in 2004; the document's district is "
                                   "recorded as written; no code"),
    49: ("District Nawabshah", "PK719", "entry text states District Nawabshah; the district was renamed "
                                        "Shaheed Benazirabad (a rename, not a split)"),
    50: ("District Khairpur", "PK711", "entry text states District Khairpur"),
    51: ("District Khairpur", "PK711", "entry text states District Khairpur"),
}
SINDH_EXPECTED_ROWS = 80


def sindh(src: Path) -> list[dict]:
    lines = html_to_lines(src / "list-of-dargahs-mosques.html")
    a = lines.index("DISTRICT WISE LIST OF DARGAHS UNDER THE CONTROL OF AUQAF DEPARTMENT SINDH")
    b = lines.index("DISTRICT WISE LIST OF MOSQUE UNDER THE CONTROL OF AUQAF DEPARTMENT SINDH")
    rows, heading, pending = [], None, None
    for line in lines[a + 1:b]:
        if line in ("Sr.No.", "Name of Dargahs"):
            continue
        m = SINDH_SRNO.match(line)
        if m:
            pending = (int(m.group(1)), int(m.group(2)), line)
            continue
        if pending is None:
            heading = line  # a section heading (circle or district)
            continue
        serial, _, srno = pending
        pending = None
        if serial in SINDH_ENTRY:
            dist, code, note = SINDH_ENTRY[serial]
        elif heading in SINDH_HEADINGS:
            code, note = SINDH_HEADINGS[heading]
            dist = heading
        else:
            dist, code = "", ""
            note = "no district stated; the heading is an Auqaf circle, not a district"
        rows.append(dict(register="Sindh Auqaf Department - District wise list of Dargahs (website)",
                         province="Sindh", district_as_written=dist, district_code=code,
                         name_as_written=line, name_ur="", tradition="Muslim Shrine", source_url=SINDH_URL,
                         source_locator=f"'DISTRICT WISE LIST OF DARGAHS UNDER THE CONTROL OF AUQAF "
                                        f"DEPARTMENT SINDH', heading '{heading}', Sr.No. {srno}",
                         source_date="undated web page", fetched_on=FETCHED_ON,
                         note=f"section heading as written: '{heading}'; {note}"))
    serials = [int(r["source_locator"].rsplit("Sr.No. ", 1)[1].split("/")[0]) for r in rows]
    if len(rows) != SINDH_EXPECTED_ROWS or serials != list(range(1, SINDH_EXPECTED_ROWS + 1)):
        sys.exit(f"sindh: expected serials 1..{SINDH_EXPECTED_ROWS}, got {len(rows)} rows")
    return rows


def totals(reg: Path) -> list[dict]:
    """Totals stated in documents (not computed here). Province-level only: no source found
    states a per-district total. Each value is checked against the saved page."""
    out = []
    faq = " ".join(html_to_lines(reg / "punjab_auqaf_web" / "faqs.html"))
    if "Currently, there are 548 Shrines under Administrative control of Auqaf Department." not in faq:
        sys.exit("totals: Punjab FAQ sentence not found")
    out.append(dict(register="Punjab Auqaf & Religious Affairs Department", province="Punjab",
                    district_as_written="(province total; no district stated)", district_code="",
                    stated_total=548, what_is_counted="Shrines under Administrative control of Auqaf Department",
                    source_url="https://auqaf.punjab.gov.pk/faqs",
                    source_locator="FAQ 'How many Shrines are there under Administrative control of Auqaf?'",
                    source_date="undated web page (fetched 2026-10-30)"))
    about = " ".join(html_to_lines(reg / "sindh_arazud" / "about-auqaf.html"))
    if "Total No. of Dargahs under administrative Control of Auqaf Department : 78" not in about:
        sys.exit("totals: Sindh about-auqaf sentence not found")
    out.append(dict(register="Sindh Auqaf Department", province="Sindh",
                    district_as_written="(province total; no district stated)", district_code="",
                    stated_total=78, what_is_counted="Dargahs under administrative Control of Auqaf Department "
                                                     "(the same site's list enumerates 80)",
                    source_url="https://arazud.sindh.gov.pk/about-auqaf",
                    source_locator="'Total No. of Dargahs under administrative Control of Auqaf Department : 78'",
                    source_date="undated web page (fetched 2026-10-30)"))
    return out


def write(path: Path, cols: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    root = Path(sys.argv[1])
    reg = root / "pipeline/gis/sources/shrine_dbs/registers"
    out = root / "pipeline/gis/shrine_sources/registers"
    rows = punjab(reg / "punjab_auqaf_web") + sindh(reg / "sindh_arazud")
    codes = {r["district_code"] for r in csv.DictReader(
        (root / "pipeline/gis/boundaries/pk_dictionary.csv").open(encoding="utf-8"))}
    bad = [r for r in rows if r["district_code"] and r["district_code"] not in codes]
    if bad:
        sys.exit(f"unknown district codes: {[r['district_code'] for r in bad]}")
    write(out / "auqaf_registers.csv", COLUMNS, rows)
    write(out / "auqaf_district_totals.csv", TOTAL_COLUMNS, totals(reg))
    by = {}
    for r in rows:
        by[r["province"]] = by.get(r["province"], 0) + 1
    print("rows by province:", by, "| with district_code:", sum(1 for r in rows if r["district_code"]))


if __name__ == "__main__":
    main()
