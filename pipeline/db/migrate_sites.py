"""
Load the archive's sheet into a local PostgreSQL/PostGIS database: sites, categories, and one row
per image (the sheet's 'Image 1'..'Image 16' columns, unpivoted).

This is a READ-ONLY MIRROR of the sheet (RULE 3: the sheet is production and nothing here writes
to it). Each run drops and rebuilds the four tables inside one transaction, so a failed run leaves
the previous copy intact.

Started from database_migration_script.py (Downloads, 29 Oct 2026). What changed and why:
  - Primary key is the sheet's own `id`, not a row number. A row number changes when the sheet is
    re-sorted, and the media table joins on it.
  - Reads the current columns with the legacy ones as fallback, as the website does: `category`
    over `Category` (Category is empty on 320 of 489 rows and says "Hindu Temple" on 11 Udasi
    darbars), `year_built` + precision + note over `Founded/Opened`, `principal_figure` over
    `Sufi Saint`.
  - No "City, Province" parsing. 302 of 489 Location strings are a single word, so the old parser
    gave them province "Unknown", and it read "Lahore" and "Pakistan" as provinces. Location is
    kept verbatim; `province` is filled only where the string names one, else NULL (RULE 2: missing
    stays empty). The proper source for admin units is the spatial join in pipeline/gis/.
  - Every value read as text (dtype=str): pandas otherwise turns "1041" into 1041.0.
  - Internal columns (qa_note, needs_review, flags) are left out.
  - Credentials come from the DATABASE_URL environment variable, never the file.
  - Keys, foreign keys and the PostGIS extension are created explicitly.

Usage (from the repo root; the venv is ~/.venvs/shrines-db):
  python pipeline/db/migrate_sites.py --dry-run              # build + check, write CSVs, no database
  DATABASE_URL=postgresql://user:pass@localhost:5432/spiritual_sites \
      python pipeline/db/migrate_sites.py                    # load into PostgreSQL
  Add --from-sheet to read the published sheet instead of data/shrines.csv.
"""
import argparse, json, os, re, sys
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
SNAPSHOT = REPO / "data/shrines.csv"
IMAGE_COLS = [f"Image {i}" for i in range(1, 17)]
INTERNAL = {"qa_note", "needs_review", "flags"}
CATEGORIES = {"Muslim Shrine", "Hindu Temple", "Sikh Gurdwara", "Nanakpanthi / Udasi Darbar",
              "Jain Temple", "Secular / Memorial"}
# Only names a Location string states outright. Order matters: "Azad Kashmir" before nothing else
# matches it; "KPK" is the sheet's own abbreviation for Khyber Pakhtunkhwa.
PROVINCES = [
    ("Khyber Pakhtunkhwa", r"\bKhyber\s+Pakhtunkhwa\b|\bKPK?\b"),
    ("Islamabad Capital Territory", r"\bIslamabad\b"),
    ("Gilgit-Baltistan", r"\bGilgit"),
    ("Azad Jammu and Kashmir", r"\bAzad\s+(?:Jammu\s+and\s+)?Kashmir\b|\bAJK\b"),
    ("Balochistan", r"\bBalochistan\b|\bBaluchistan\b"),
    ("Sindh", r"\bSindh\b"),
    ("Punjab", r"\bPunjab\b"),
]
BBOX = (23.0, 37.5, 60.5, 77.9)  # lat min/max, lon min/max: Pakistan, roughly


def first(row, *cols):
    for c in cols:
        v = row.get(c, "")
        if v.strip():
            return v.strip()
    return None


def province_of(loc):
    hits = [name for name, pat in PROVINCES if re.search(pat, loc or "")]
    return hits[0] if len(hits) == 1 else None  # two provinces named: don't pick one


def load_frame(from_sheet):
    if from_sheet:
        url = json.loads((REPO / "data/csv-source.json").read_text())["csvUrl"]
        print(f"reading the published sheet: {url[:60]}...")
        src = url
    else:
        print(f"reading {SNAPSHOT.relative_to(REPO)} (refresh with npm run data:build)")
        src = SNAPSHOT
    return pd.read_csv(src, dtype=str, keep_default_na=False)


def build(df):
    fails = []
    missing = [c for c in ["id", "Name", "Location", "Latitude", "Longitude", *IMAGE_COLS] if c not in df.columns]
    if missing:
        sys.exit(f"sheet is missing columns: {missing}")
    if df["id"].str.strip().eq("").any():
        fails.append(f"{df['id'].str.strip().eq('').sum()} rows have no id")
    dup = df["id"][df["id"].duplicated()].tolist()
    if dup:
        fails.append(f"duplicate ids: {dup[:10]}")

    sites = []
    for r in df.to_dict("records"):
        lat, lon = first(r, "Latitude"), first(r, "Longitude")
        lat = float(lat) if lat else None
        lon = float(lon) if lon else None
        if (lat is None) != (lon is None):
            fails.append(f"{r['id']}: only one of latitude/longitude")
        if lat is not None and not (BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lon <= BBOX[3]):
            fails.append(f"{r['id']}: ({lat}, {lon}) is outside Pakistan's bounding box")
        sites.append({
            "site_id": r["id"].strip(),
            "name": r["Name"].strip(),
            "location_text": first(r, "Location"),
            "province": province_of(r["Location"]),
            "category": first(r, "category", "Category"),
            "site_type": first(r, "site_type"),
            "site_type_note": first(r, "site_type_note"),
            "status": first(r, "status"),
            "status_note": first(r, "status_note"),
            "principal_figure": first(r, "principal_figure", "Sufi Saint"),
            "figure_type": first(r, "figure_type"),
            "figure_born": first(r, "figure_born"),
            "figure_died": first(r, "figure_died"),
            "silsila": first(r, "silsila"),
            "silsila_note": first(r, "silsila_note"),
            "year_built": first(r, "year_built", "Founded/Opened"),
            "year_built_precision": first(r, "year_built_precision"),
            "year_built_note": first(r, "year_built_note"),
            "event_year": first(r, "event_year"),
            "event_note": first(r, "event_note"),
            "events": first(r, "Events"),
            "info_level": first(r, "info_level"),
            "support_level": first(r, "support_level"),
            "description": r.get("Description") or None,  # markdown: never stripped or normalised
            "latitude": lat,
            "longitude": lon,
        })
    sites = pd.DataFrame(sites)
    bad_cat = sorted(set(sites["category"].dropna()) - CATEGORIES)
    if bad_cat:
        fails.append(f"category values outside the schema: {bad_cat}")

    # Categories: one row per (category, site_type) pair actually used.
    categories = (sites[["category", "site_type"]].drop_duplicates()
                  .sort_values(["category", "site_type"], na_position="last").reset_index(drop=True))
    categories.insert(0, "category_id", range(1, len(categories) + 1))
    sites = sites.merge(categories, on=["category", "site_type"], how="left")

    # Media: unpivot Image 1..16, one row per non-empty cell, keeping its slot (Image 1 is the lead).
    media = df[["id", *IMAGE_COLS]].melt(id_vars="id", var_name="source_column", value_name="image_url")
    media["image_url"] = media["image_url"].str.strip()
    media = media[media["image_url"] != ""].copy()
    media["position"] = media["source_column"].str.extract(r"(\d+)$")[0].astype(int)
    media = media.rename(columns={"id": "site_id"}).sort_values(["site_id", "position"]).reset_index(drop=True)
    media.insert(0, "media_id", range(1, len(media) + 1))
    media = media[["media_id", "site_id", "position", "image_url", "source_column"]]

    # Invariants (RULE 4).
    filled = int(sum(df[c].str.strip().ne("").sum() for c in IMAGE_COLS))
    if len(media) != filled:
        fails.append(f"media has {len(media)} rows but the sheet has {filled} filled image cells")
    if media.duplicated(["site_id", "position"]).any():
        fails.append("two images in one slot")
    nl_in = int(df.get("Description", pd.Series(dtype=str)).str.count("\n").sum())
    nl_out = int(sites["description"].fillna("").str.count("\n").sum())
    if nl_in != nl_out:
        fails.append(f"Description newlines changed: {nl_in} in, {nl_out} out")
    leaked = INTERNAL & set(sites.columns)
    if leaked:
        fails.append(f"internal columns in output: {leaked}")
    if fails:
        sys.exit("refusing to continue:\n  " + "\n  ".join(fails))

    sites = sites.drop(columns=["category", "site_type"])
    return sites, categories, media


DDL = """
CREATE EXTENSION IF NOT EXISTS postgis;
DROP TABLE IF EXISTS media, sites, categories CASCADE;
CREATE TABLE categories (
    category_id integer PRIMARY KEY,
    category    text,
    site_type   text,
    UNIQUE (category, site_type)
);
CREATE TABLE sites (
    site_id text PRIMARY KEY,
    name text NOT NULL,
    location_text text, province text,
    category_id integer REFERENCES categories,
    site_type_note text, status text, status_note text,
    principal_figure text, figure_type text, figure_born text, figure_died text,
    silsila text, silsila_note text,
    year_built text, year_built_precision text, year_built_note text,
    event_year text, event_note text, events text,
    info_level text, support_level text, description text,
    latitude double precision, longitude double precision,
    geom geometry(Point, 4326)
);
CREATE TABLE media (
    media_id integer PRIMARY KEY,
    site_id text NOT NULL REFERENCES sites ON DELETE CASCADE,
    position smallint NOT NULL CHECK (position BETWEEN 1 AND 16),
    image_url text NOT NULL,
    source_column text NOT NULL,
    UNIQUE (site_id, position)
);
"""


def load(sites, categories, media, url):
    from sqlalchemy import create_engine, text

    engine = create_engine(url)
    nan = lambda d: d.astype(object).where(d.notna(), None).to_dict("records")
    with engine.begin() as conn:  # one transaction: all of it or none of it
        conn.execute(text(DDL))
        conn.execute(text("INSERT INTO categories VALUES (:category_id, :category, :site_type)"), nan(categories))
        cols = list(sites.columns)
        conn.execute(text(f"INSERT INTO sites ({', '.join(cols)}) VALUES ({', '.join(':' + c for c in cols)})"),
                     nan(sites))
        conn.execute(text("UPDATE sites SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) "
                          "WHERE latitude IS NOT NULL"))
        conn.execute(text("CREATE INDEX sites_geom_idx ON sites USING GIST (geom)"))
        conn.execute(text("INSERT INTO media VALUES (:media_id, :site_id, :position, :image_url, :source_column)"),
                     nan(media))
        for table, frame in [("sites", sites), ("categories", categories), ("media", media)]:
            n = conn.execute(text(f"SELECT count(*) FROM {table}")).scalar()
            if n != len(frame):
                raise RuntimeError(f"{table}: {n} rows in the database, {len(frame)} built; rolled back")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="build and check only; write CSVs, touch no database")
    ap.add_argument("--from-sheet", action="store_true", help="read the published sheet, not data/shrines.csv")
    ap.add_argument("--out", default=None, help="folder for --dry-run CSVs (default: pipeline/db/out)")
    a = ap.parse_args()

    sites, categories, media = build(load_frame(a.from_sheet))
    with_geom = int(sites["latitude"].notna().sum())
    print(f"sites {len(sites)} ({with_geom} with coordinates) | categories {len(categories)} | "
          f"media {len(media)} across {media['site_id'].nunique()} sites | "
          f"province named in Location: {int(sites['province'].notna().sum())}")

    if a.dry_run:
        out = Path(a.out) if a.out else Path(__file__).resolve().parent / "out"
        out.mkdir(parents=True, exist_ok=True)
        for name, frame in [("sites", sites), ("categories", categories), ("media", media)]:
            frame.to_csv(out / f"{name}.csv", index=False)
        print(f"dry run: wrote CSVs to {out}; no database touched")
        return

    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("set DATABASE_URL, e.g. postgresql://postgres:PASSWORD@localhost:5432/spiritual_sites "
                 "(or use --dry-run)")
    load(sites, categories, media, url)
    print("loaded: sites, categories, media (PostGIS geometry + GiST index on sites.geom)")


if __name__ == "__main__":
    main()
