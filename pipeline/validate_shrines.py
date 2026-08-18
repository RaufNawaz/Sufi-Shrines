#!/usr/bin/env python3
"""
validate_shrines.py — data-integrity suite for the shrines database.

    python3 validate_shrines.py <sheet.tsv|csv> [--termbase termbase.tsv] [--fail-on ERROR]

Emits a human-readable report to stdout and a machine-readable
`validation_issues.tsv` (name, severity, check, detail) for triage.

Exit code 1 if any issue at or above --fail-on severity is found, so this can
sit in a pre-publish hook and stop a bad row reaching the site.

CHECKS
  ERROR   figure_not_in_description   named figure never appears in its own prose  [catches Allo Mahar]
  ERROR   coord_outside_pakistan      lat/lon outside the national bounding box
  ERROR   coord_far_from_place        >60 km from the place named in the location  [catches Dera Sahib]
  ERROR   date_before_birth           year_built precedes the figure's birth       [catches Bahauddin Zakariya]
  ERROR   died_before_born            death year <= birth year
  ERROR   date_in_future              any year after the current year
  ERROR   internal_artefact           NOTE: / row-refs / ==== leaking into public prose
  ERROR   category_not_in_schema      `category` holds a value outside the six allowed ones,
                                      so categoryKey() maps it to 'default' and the row is
                                      excluded from EVERY category-chip selection live
  WARN    category_missing            neither `category` nor legacy `Category` is set
  WARN    description_hard_wrapped    Description authored with hard line breaks — the marker
                                      of a row converted from a wrapped entry file, whose
                                      single-line fields are then likely cut at their 1st line
  WARN    coord_off_cluster           >5 km from other sites sharing its location  [catches Javindi Bibi]
  WARN    coord_suspicious            longitude or latitude truncated to .0000
  WARN    placeholder_text            "No events scheduled right now" and similar
  WARN    events_empty                Events blank while the description names a festival
  WARN    hotlinked_image             image served from a third-party site
  WARN    no_image                    no image at all
  WARN    termbase_violation          a non-canonical spelling the termbase can fix
  WARN    no_bibliography             description has no Bibliography section
  WARN    expansion_ratio             long entry resting on a single generic source
  WARN    sheet_missing_column        support_level column absent from the sheet entirely
  WARN    badge_not_populated         bibliography supports a real info_level but the
                                      sheet's info_level cell is blank — badge is dark live
  INFO    coord_precision             fewer than 3 or more than 6 decimal places
  INFO    duplicate_coord             exact coordinate shared with another site
"""

import csv, re, sys, math, os, unicodedata
from collections import defaultdict, Counter
from datetime import date

PK_BBOX = (23.4, 37.2, 60.7, 77.9)          # lat_min, lat_max, lon_min, lon_max

# The six values CLAUDE.md's schema allows in `category`. These are join keys, not
# labels: categoryKey() in src/lib/data/categoryKey.ts normalises them to design
# tokens, and MapSidebar filters with `activeCategories.includes(categoryKey(...))`
# where activeCategories only ever holds those six keys. So a seventh value does not
# degrade gracefully — it drops the row out of every category filter. Found live on
# 18 Aug 2026: 'Islam' x2 and 'Sufi shrine (Islam)' x1.
VALID_CATEGORIES = {
 "Muslim Shrine", "Hindu Temple", "Sikh Gurdwara",
 "Nanakpanthi / Udasi Darbar", "Jain Temple", "Secular / Memorial",
}
THIS_YEAR = date.today().year

# Reference points for gross-error detection. Not authoritative gazetteer data —
# only used to ask "is this roughly where the location string says it is?"
PLACES = {
 "lahore":(31.55,74.34), "karachi":(24.86,67.01), "multan":(30.20,71.47),
 "peshawar":(34.01,71.58), "rawalpindi":(33.60,73.04), "islamabad":(33.69,73.05),
 "sialkot":(32.49,74.53), "sukkur":(27.70,68.86), "hyderabad":(25.40,68.37),
 "quetta":(30.18,66.98), "sargodha":(32.08,72.67), "bahawalpur":(29.40,71.68),
 "uch sharif":(29.24,71.06), "nankana sahib":(31.45,73.71), "pakpattan":(30.34,73.39),
 "sehwan":(26.42,67.86), "kasur":(31.12,74.45), "jhang":(31.27,72.32),
 "chakwal":(32.93,72.85), "khushab":(32.30,72.35), "kohat":(33.58,71.44),
 "nowshera":(34.02,71.98), "mansehra":(34.33,73.20), "larkana":(27.56,68.21),
 "shikarpur":(27.96,68.64), "khairpur":(27.53,68.76), "dadu":(26.73,67.78),
 "umarkot":(25.36,69.74), "umerkot":(25.36,69.74), "nagarparkar":(24.36,70.75),
 "ghotki":(28.00,69.32), "jamshoro":(25.43,68.28), "lasbela":(25.87,66.62),
 "kalat":(29.03,66.59), "gujrat":(32.57,74.08), "gujranwala":(32.16,74.19),
 "sheikhupura":(31.71,73.98), "okara":(30.81,73.45), "jhelum":(32.93,73.73),
 "hasan abdal":(33.82,72.69), "attock":(33.77,72.36), "bhalwal":(32.27,72.90),
 "chiniot":(31.72,72.98), "taunsa":(30.70,70.65), "rajanpur":(29.10,70.33),
 "dera ghazi khan":(30.05,70.63), "badin":(24.66,68.84), "matiari":(25.60,68.45),
 "tando allahyar":(25.46,68.72), "narowal":(32.10,74.87), "eminabad":(32.04,74.25),
 "buner":(34.44,72.49), "khuzdar":(27.81,66.61), "jhal magsi":(28.35,67.44),
 "mehar":(27.18,67.82), "daska":(32.32,74.35), "sahiwal":(30.66,73.10),
 "tharparkar":(24.75,70.20), "neelum":(34.60,73.90), "swat":(35.22,72.42),
 "faisalabad":(31.42,73.08), "wazirabad":(32.44,74.12), "mianwali":(32.58,71.53),
}

WORD = re.compile(r"[A-Za-z]{4,}")
STOP = {"shah","syed","sayyid","hazrat","baba","pir","peer","shrine","tomb","saint",
        "mandir","temple","gurdwara","darbar","dargah","sahib","sharif","khwaja",
        "makhdoom","sultan","maharaja","guru","allama","mian","sant","swami","bhai",
        "lord","goddess","deity","mahadev","master","builder","martyrs","community"}
ARTEFACT = re.compile(r"(NOTE:\s|={10,}|\brows?\s+\d+\s*[,)]|\bflag for a browser)")
PLACEHOLDER = re.compile(r"no events scheduled right now|^undocumented$|^not documented$", re.I)
FESTIVAL = re.compile(r"\burs\b|\bmela\b|shivratri|shivaratri|diwali|\bholi\b|gurpurab|"
                      r"janmashtami|cheti chand|vaisakhi|baisakhi|durga puja|"
                      r"eid milad|dhamal|qawwali|akhand path|jayanti|yatra", re.I)
GENERIC_SRC = re.compile(r"general (established )?(histories|accounts|studies)", re.I)
# Admin-area words that may directly follow a place name in a location string
# ("Khuzdar District", "Distt Jhang" style suffixes, "Murree Tehsil"). Matched
# against norm()-ed text, hence lowercase.
ADMIN_AFTER = re.compile(r"\s*(?:district|distt\.?|tehsil)(?![a-z])")
FIELD_HOST = "raufnawaz.github.io"
FREE_HOSTS = ("wikimedia.org", "wikipedia.org")


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return s.lower()

def km(a, b):
    dlat = (a[0]-b[0]) * 111.0
    dlon = (a[1]-b[1]) * 111.0 * math.cos(math.radians((a[0]+b[0])/2))
    return math.hypot(dlat, dlon)

def dp(v):
    return len(v.split(".")[1]) if "." in v else 0

def col(row, *names):
    for n in names:
        for k in row:
            if k.strip().lower() == n:
                return (row[k] or "").strip()
    return ""


def load_termbase(path):
    rules = []
    if not path or not os.path.exists(path):
        return rules
    with open(path, newline="", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("#") or not line.strip():
                continue
            f = line.rstrip("\n").split("\t")
            if len(f) < 3 or f[0].strip().lower() == "canonical":
                continue
            # translate=YES means the canonical column is the foreign term to AVOID —
            # prose should use the English gloss instead (e.g. "mosque", not "masjid").
            # The gloss word is itself listed as a "variant" for join purposes elsewhere,
            # so without this guard the check tells editors to rewrite correct English
            # prose into the foreign term it was told not to use — backwards.
            if len(f) > 5 and f[5].strip().upper() == "YES":
                continue
            canon = f[0].strip()
            for v in (f[2] or "").split(";"):
                v = v.strip()
                if len(v) <= 3 or not re.fullmatch(r"[A-Za-z\- ']+", v):
                    continue
                if norm(v) == norm(canon):
                    continue
                # "Sialkot District" is not a misspelling of "Sialkot" — skip variants
                # that merely add an admin suffix to the canonical form.
                if norm(canon) in norm(v) or norm(v) in norm(canon):
                    continue
                # diacritic/apostrophe-only differences are style, not error
                fold = lambda s: re.sub(r"[^a-z]", "", norm(s))
                sev = "INFO" if fold(v) == fold(canon) else "WARN"
                rules.append((re.compile(rf"\b{re.escape(v)}\b"), v, canon, sev))
    return rules


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    src = args[0]
    tb_path = args[args.index("--termbase")+1] if "--termbase" in args else "termbase.tsv"
    fail_on = args[args.index("--fail-on")+1].upper() if "--fail-on" in args else "ERROR"

    delim = "\t" if src.lower().endswith((".tsv", ".tab")) else ","
    with open(src, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter=delim))
    if not rows:
        sys.exit("empty input")

    tb = load_termbase(tb_path)
    issues = []
    def add(sev, name, check, detail):
        issues.append((name, sev, check, detail))

    header = [k.strip().lower() for k in rows[0].keys() if k]
    if "support_level" not in header:
        add("WARN", "(sheet)", "sheet_missing_column",
            "no support_level column at all — pipeline/support_levels.tsv is computed "
            "but was never imported, so no shrine can show a support-level badge live")

    coords, byplace = {}, defaultdict(list)

    for r in rows:
        name = col(r, "name", "shrine", "title") or "?"
        desc = col(r, "description", "desc", "history", "content")
        loc  = col(r, "location", "address")
        fig  = col(r, "principal_figure", "sufi saint", "saint", "figure")
        ev   = col(r, "events", "event")
        lat_s, lon_s = col(r, "latitude", "lat"), col(r, "longitude", "lon", "lng")
        blob = f"{name} {desc}"

        # --- category is one of the six schema values ---------------------------
        # Read the new column and the legacy one the front end falls back to
        # (shrineModel.ts: `category` || `Category`), so a row that resolves
        # correctly through the fallback is not reported.
        cat_new = (r.get("category") or "").strip()
        cat_old = (r.get("Category") or "").strip()
        cat_eff = cat_new or cat_old
        if not cat_eff:
            add("WARN", name, "category_missing",
                "neither `category` nor legacy `Category` is set — the row cannot be "
                "coloured or filtered by tradition")
        elif cat_eff not in VALID_CATEGORIES:
            add("ERROR", name, "category_not_in_schema",
                f"{cat_eff!r} is not one of the six allowed values, so categoryKey() "
                f"returns 'default': the row draws with the default marker colour and is "
                f"excluded from every category-chip selection. Allowed: "
                f"{', '.join(sorted(VALID_CATEGORIES))}")

        # --- Description authored hard-wrapped ----------------------------------
        # Not a defect in itself, but the one reliable marker of a row converted
        # from a hard-wrapped entry file. Such a conversion has truncated
        # single-line field values at their first physical line (18 Aug 2026:
        # Darbar Hazrat Shah Gohar Peer, 6 cells — see
        # pipeline/fix_wrapped_field_truncation.py). Re-check this row's short
        # fields for values that stop mid-sentence.
        if desc:
            dlines = [l for l in desc.split("\n") if l.strip()]
            if len(dlines) >= 8 and max(len(l) for l in dlines) < 95:
                add("WARN", name, "description_hard_wrapped",
                    f"Description is hard-wrapped ({len(dlines)} lines, longest "
                    f"{max(len(l) for l in dlines)} chars) — check this row's single-line "
                    f"fields for values cut off at their first line")

        # --- figure appears in its own description -----------------------------
        if fig and desc:
            toks = [w for w in WORD.findall(norm(fig)) if w not in STOP]
            if toks and not any(t in norm(desc) for t in toks):
                add("ERROR", name, "figure_not_in_description",
                    f"'{fig}' — no distinctive token appears in the description")

        # --- coordinates -------------------------------------------------------
        try:
            lat, lon = float(lat_s), float(lon_s)
        except ValueError:
            add("ERROR", name, "coord_missing", f"lat={lat_s!r} lon={lon_s!r}")
            lat = lon = None

        if lat is not None:
            if not (PK_BBOX[0] <= lat <= PK_BBOX[1] and PK_BBOX[2] <= lon <= PK_BBOX[3]):
                add("ERROR", name, "coord_outside_pakistan", f"{lat}, {lon}")
            if lat_s.endswith(".0000") or lon_s.endswith(".0000") or \
               (dp(lon_s) == 0 and lon_s) or (dp(lat_s) == 0 and lat_s):
                add("WARN", name, "coord_suspicious", f"truncated value: {lat_s}, {lon_s}")
            d = min(dp(lat_s), dp(lon_s))
            if d < 3 or max(dp(lat_s), dp(lon_s)) > 6:
                add("INFO", name, "coord_precision", f"{lat_s}, {lon_s}")

            key = (round(lat, 5), round(lon, 5))
            if key in coords:
                add("INFO", name, "duplicate_coord", f"identical to {coords[key]}")
            else:
                coords[key] = name

            nloc = norm(loc)
            cands = [(nloc.index(p), -len(p), p) for p in PLACES if p in nloc]
            best = min(cands) if cands else None
            if best:
                pos, hit = best[0], best[2]
                dist = km((lat, lon), PLACES[hit])
                # The gazetteer holds town centres, but the matched name often
                # denotes the town's DISTRICT/TEHSIL rather than the town itself:
                # either an admin word directly follows the matched occurrence
                # ("Khuzdar District", "Distt", "Tehsil"), or the name is a
                # comma-separated container after a more specific locality
                # ("Garh Maharaja (Shorkot), Jhang, Punjab"). A site can
                # legitimately sit tens of km from the district's namesake town,
                # so allow 120 km there and never escalate past WARN. A leading
                # bare town name ("Lahore, Punjab") keeps the strict rule.
                admin_ctx = bool(ADMIN_AFTER.match(nloc[pos + len(hit):])) or \
                            "," in nloc[:pos]
                if admin_ctx:
                    if dist > 120:
                        add("WARN", name, "coord_far_from_place",
                            f"{dist:.0f} km from {hit.title()}")
                elif dist > 60:
                    add("ERROR", name, "coord_far_from_place",
                        f"{dist:.0f} km from {hit.title()}")
                elif dist > 20:
                    add("WARN", name, "coord_far_from_place",
                        f"{dist:.0f} km from {hit.title()}")
                byplace[hit].append((name, lat, lon))

        # --- dates -------------------------------------------------------------
        def yr(*names):
            v = col(r, *names)
            # Prefer a year explicitly marked CE/AD over a bare or AH-marked one, so a
            # mixed "8 Muharram 1040 AH / 8 August 1630 CE" string compares on the same
            # calendar as a plain "1576" elsewhere, instead of grabbing the first digits.
            ce = re.search(r"\b(\d{3,4})\s*(?:CE|AD)\b", v)
            if ce:
                return int(ce.group(1))
            m = re.search(r"\b(\d{3,4})\b", v)
            return int(m.group(1)) if m else None
        built, born, died = yr("year_built", "founded/opened", "founded"), yr("figure_born"), yr("figure_died")
        for label, v in (("year_built", built), ("figure_born", born), ("figure_died", died)):
            if v and v > THIS_YEAR:
                add("ERROR", name, "date_in_future", f"{label}={v}")
        if built and born and built < born:
            add("ERROR", name, "date_before_birth", f"year_built {built} < born {born}")
        if born and died and died <= born:
            add("ERROR", name, "died_before_born", f"born {born}, died {died}")

        # --- artefacts & placeholders -------------------------------------------
        m = ARTEFACT.search(desc)
        if m:
            add("ERROR", name, "internal_artefact", f"...{desc[max(0,m.start()-30):m.start()+60]}...")
        if PLACEHOLDER.search(ev):
            add("WARN", name, "placeholder_text", f"Events = {ev!r}")
        if not ev.strip() and FESTIVAL.search(desc):
            f = FESTIVAL.search(desc).group(0)
            add("WARN", name, "events_empty", f"description mentions '{f}' but Events is blank")

        # --- images --------------------------------------------------------------
        imgs = [v for k, v in r.items()
                if k and k.strip().lower().startswith("image") and (v or "").strip()]
        if not imgs:
            add("WARN", name, "no_image", "no image URL in any image column")
        for u in imgs:
            if FIELD_HOST in u or any(h in u for h in FREE_HOSTS):
                continue
            host = re.sub(r"^https?://(www\.)?", "", u).split("/")[0]
            add("WARN", name, "hotlinked_image", host)

        # --- sourcing -------------------------------------------------------------
        if desc and "## Bibliography" not in desc and "Bibliography" not in desc:
            add("WARN", name, "no_bibliography", "no Bibliography section")
        if desc:
            bib = desc.split("Bibliography", 1)[-1] if "Bibliography" in desc else ""
            n_specific = sum(1 for l in bib.splitlines()
                             if l.strip().startswith("-") and not GENERIC_SRC.search(l))
            if len(desc.split()) > 350 and n_specific <= 1:
                add("WARN", name, "expansion_ratio",
                    f"{len(desc.split())} words on {n_specific} specific source(s)")

            has_field_survey = "shrines project field survey" in desc.lower()
            if (n_specific >= 1 or has_field_survey) and not col(r, "info_level"):
                add("WARN", name, "badge_not_populated",
                    f"{n_specific} specific source(s)"
                    + (", field survey cited" if has_field_survey else "")
                    + " but info_level is blank in the sheet — badge won't render live")

        # --- termbase --------------------------------------------------------------
        seen = set()
        for pat, variant, canon, tsev in tb:
            if variant.lower() in seen:
                continue
            if pat.search(blob):
                seen.add(variant.lower())
                add(tsev, name, "termbase_violation", f"'{variant}' -> '{canon}'")

    # --- cluster coherence ------------------------------------------------------
    for place, members in byplace.items():
        if len(members) < 3:
            continue
        mlat = sorted(m[1] for m in members)[len(members)//2]
        mlon = sorted(m[2] for m in members)[len(members)//2]
        for nm, la, lo in members:
            d = km((la, lo), (mlat, mlon))
            if d > 5:
                add("WARN", nm, "coord_off_cluster",
                    f"{d:.1f} km from the {place.title()} cluster centre")

    # --- report -------------------------------------------------------------------
    with open("validation_issues.tsv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(["name", "severity", "check", "detail"])
        w.writerows(sorted(issues, key=lambda i: ({"ERROR":0,"WARN":1,"INFO":2}[i[1]], i[2], i[0])))

    sev = Counter(i[1] for i in issues)
    chk = Counter((i[1], i[2]) for i in issues)
    print(f"rows: {len(rows)}   issues: {len(issues)}   "
          f"(ERROR {sev['ERROR']}, WARN {sev['WARN']}, INFO {sev['INFO']})")
    print(f"termbase rules loaded: {len(tb)}\n")
    for s in ("ERROR", "WARN", "INFO"):
        rel = [(c, n) for (sv, c), n in chk.items() if sv == s]
        if not rel: continue
        print(s)
        for c, n in sorted(rel, key=lambda x: -x[1]):
            print(f"  {c:<28}{n}")
        print()
    print("wrote validation_issues.tsv")

    order = {"ERROR":0, "WARN":1, "INFO":2}
    if fail_on in order and any(order[i[1]] <= order[fail_on] for i in issues):
        sys.exit(1)


if __name__ == "__main__":
    main()
