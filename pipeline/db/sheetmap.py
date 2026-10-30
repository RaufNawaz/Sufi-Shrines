"""The one mapping between the Google Sheet's headers and the database's columns.

Sheet values are join keys (RULE 3); only the column *names* change here, never a value.
Image 1..16 live in site_images; Description 2..5 are joined into description (see join_description).
"""
import re

# sheet header -> sites column, in the sheet's own order (the export writes this order back)
SHEET_TO_DB = {
    "Name": "name", "Location": "location", "Category": "legacy_category",
    "Latitude": "latitude", "Longitude": "longitude", "Founded/Opened": "legacy_founded",
    "Sufi Saint": "legacy_sufi_saint",
    **{f"Image {i}": None for i in range(1, 17)},          # -> site_images
    "Events": "events", "Description": "description",
    "qa_note": "qa_note", "needs_review": "needs_review", "id": "id", "category": "category",
    "site_type": "site_type", "site_type_note": "site_type_note", "status": "status",
    "status_note": "status_note", "principal_figure": "principal_figure", "figure_type": "figure_type",
    "silsila": "silsila", "silsila_note": "silsila_note", "year_built": "year_built",
    "year_built_precision": "year_built_precision", "year_built_note": "year_built_note",
    "figure_born": "figure_born", "figure_died": "figure_died", "event_year": "event_year",
    "event_note": "event_note", "flags": "flags", "info_level": "info_level",
    "support_level": "support_level",
}
IMAGE_COLS = [f"Image {i}" for i in range(1, 17)]
CONTINUATION = re.compile(r"^Description (\d+)$")


def join_description(row):
    """Description 2, 3, ... joined into Description with a blank line, walking 2, 3, ... until the
    first missing header. Byte-for-byte the rule of joinContinuationColumns() in
    scripts/data/build-dataset.mjs and src/lib/data/fieldAliasing.ts, so the site sees no change."""
    desc = row.get("Description", "")
    n = 2
    while f"Description {n}" in row:
        s = row[f"Description {n}"].strip()
        if s:
            desc = f"{desc}\n\n{s}" if desc else s
        n += 1
    return desc
