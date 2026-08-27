#!/usr/bin/env python3
"""Generate `pipeline/image-hunt/candidates_sikh.tsv` — CANDIDATE photographs of the
18 Sikh gurdwaras in `targets_sikh.tsv` that hold no photograph in the archive.

Candidates only. Nothing here is a published image; a human editor decides.

WHAT THIS SCRIPT GATES, AND WHY (RULE 4 — encode the invariant, don't rely on care)

Every check below exists because the failure it catches is silent. A wrong caption or a
missing licence does not error at write time; it errors months later, in public, on a
page whose whole claim is provenance. So the script **exits non-zero and writes nothing**
rather than emitting a file that violates any of:

  1. Every target slug in `targets_sikh.tsv` gets at least one row. An empty result is a
     result: a target with no candidate gets one row with an empty `image_url` and the
     searches already tried recorded in `note`, so the next session does not repeat them.
  2. No tab or newline survives inside any field. Values are scrubbed before the length
     check, so a stray newline cannot silently split one row into two — the same class of
     bug as the Sheets TSV export that strips newlines inside cells (RULE 3).
  3. A row with a non-empty `image_url` must also carry a `license`, a `source_page_url`
     and a non-empty `source_caption_verbatim`. An image with no stated licence is not a
     candidate, and an image whose identification is not quoted from its own source page
     is an assertion by an agent, which is exactly what RULE 2 forbids.
  4. `identification` and `image_type` are closed vocabularies. `identification` is
     `named-by-source` or `uncertain` — never blank on a row that has an image — and a
     typo in either field is a silent mis-file, not a visible one.
  5. Every non-empty `note` is prefixed so it reads unmistakably as an agent's note and
     never as source text.

Run: python3 pipeline/image-hunt/write_candidates_sikh.py

NAMED FOR ITS TRADITION ON PURPOSE. This was `write_candidates.py` for about ten
minutes, which is a generic filename holding Sikh-specific data — the next agent told
to "land your generator" would have clobbered it silently, and its 21 rows of quoted
provenance are not reconstructible from a diff. Four of these hunts ran in parallel in
one working tree; the sibling that noticed the collision risk is the reason this file
has a suffix. If a fifth tradition is added, give it its own file or make the tradition
an argument — do not reintroduce the shared name.

-----------------------------------------------------------------------------------------
TWO TRAPS FOUND WHILE HUNTING THESE 18 SITES — both cost real time, both are silent

  * The Wikimedia Commons category is **`Category:Gurudwaras in Pakistan`**, spelled with
    the *u*. `Category:Gurdwaras in Pakistan` is not a redirect and not an error: it
    returns an empty member list, exactly as a real-but-empty category would. Several
    opening queries came back clean and wrong. `Category:Gurudwaras in Sindh` and
    `Category:Gurudwaras in Punjab, Pakistan` follow the same spelling.

  * Both `Usman.pg` Rohtas files — `Rohtas 13 by Usman Ghani.jpg` and `A Sikh Monument in
    Rohtas by Usman Ghani.jpg` — are geotagged **32.5745 / 73.3520**, roughly 50 km south
    of Rohtas Fort's real position (~32.97 N / 73.57 E; this archive holds 32.9711 /
    73.5733). A Commons `list=geosearch` around the correct coordinate therefore never
    returns them. Proximity search is a good technique here but it cannot be the only one:
    these two are the strongest Gurdwara Choa Sahib candidates that exist and both are
    invisible to it.
-----------------------------------------------------------------------------------------
"""
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGETS = os.path.join(REPO, "pipeline/image-hunt/targets_sikh.tsv")
OUT = os.path.join(REPO, "pipeline/image-hunt/candidates_sikh.tsv")

COLUMNS = [
    "slug_hint", "site_name", "image_url", "source_page_url", "collection", "creator",
    "license", "date_or_period", "source_caption_verbatim", "image_type",
    "identification", "note",
]

OK_IDENT = {"named-by-source", "uncertain", ""}
OK_TYPE = {"exterior", "interior", "detail", "historical photograph",
           "print/lithograph", "map/plan", ""}

FP = "https://commons.wikimedia.org/wiki/Special:FilePath/"
CP = "https://commons.wikimedia.org/wiki/File:"

NONE = "no openly licensed candidate found"

# ---------------------------------------------------------------------------
# Candidates, keyed by slug_hint. Verified 26 August 2026: every image_url and
# source_page_url below returned HTTP 200.
#
# All five rows are `uncertain`, and that is the headline finding of the hunt:
# not one openly licensed image anywhere names any of these 18 sites in its own
# caption. Where a row is recorded, the note says exactly what the naming rests on.
# ---------------------------------------------------------------------------
CANDIDATES = {
    "gurdwara-choa-sahib": [
        dict(
            image_url=FP + "Rohtas_13_by_Usman_Ghani.jpg",
            source_page_url=CP + "Rohtas_13_by_Usman_Ghani.jpg",
            collection="Wikimedia Commons",
            creator="Usman.pg",
            license="CC BY-SA 3.0",
            date_or_period="2007-10-21",
            source_caption_verbatim="Rohtas Fort",
            image_type="exterior",
            identification="uncertain",
            note=("note: the file's own description is only \"Rohtas Fort\"; the site "
                  "identification comes from its Commons category "
                  "[[Category:Gurdwara Chowa Sahib]] and from the en.wikipedia article "
                  "Gurdwara Chowa Sahib, which uses this exact file captioned \"The "
                  "gurdwara in 2007, prior to restoration works.\" Strongest of the "
                  "three Chowa Sahib candidates. Geotagged 32.5745/73.3520, which is NOT "
                  "the Rohtas Fort coordinate in our data (32.9711/73.5733) - the "
                  "uploader's geotag is ~50km out; check before publishing."),
        ),
        dict(
            image_url=FP + "A_Sikh_Monument_in_Rohtas_by_Usman_Ghani.jpg",
            source_page_url=CP + "A_Sikh_Monument_in_Rohtas_by_Usman_Ghani.jpg",
            collection="Wikimedia Commons",
            creator="Usman.pg",
            license="CC BY-SA 4.0",
            date_or_period="2010-03-23",
            source_caption_verbatim=("Rohtas Fort.This is a Sikh monument with Rohtas "
                                     "Fort wall near Talaqi Gate.A Baradari and a sacred "
                                     "water source for Sikhs(CHOHA) and it is unknown for "
                                     "many visitors.Usman Ghani"),
            image_type="exterior",
            identification="uncertain",
            note=("note: the caption names the Talaqi Gate location and the sacred water "
                  "source \"(CHOHA)\" - chowa/choha is the spring the gurdwara is named "
                  "for - but it never writes \"Gurdwara Chowa Sahib\", and the file is "
                  "filed under [[Category:Sikh Monument in Rohtas Fort]], not under the "
                  "Chowa Sahib category. Location matches our target exactly (Rohtas "
                  "Fort, Talaqi gate). Carries the same ~50km-out geotag as the file "
                  "above."),
        ),
        dict(
            image_url=FP + "Rohtas_Fort_view_of_a_Havelli.jpg",
            source_page_url=CP + "Rohtas_Fort_view_of_a_Havelli.jpg",
            collection="Wikimedia Commons",
            creator="Besal1966",
            license="CC BY-SA 4.0",
            date_or_period="2012-03-11",
            source_caption_verbatim="Rohtas Fort view of a Havelli",
            image_type="detail",
            identification="uncertain",
            note=("note: SOURCES CONFLICT. The Commons page calls this a haveli and files "
                  "it under [[Category:Rohtas Fort havelis]], but both the en.wikipedia "
                  "and pa.wikipedia articles on Gurdwara Chowa Sahib use this exact file "
                  "captioned \"A view of the Gurudwara's baoli, or stepwell.\" Recorded "
                  "because two Wikipedias name it; flagged because the licensed source "
                  "page contradicts them. Needs a human eye before use."),
        ),
    ],
    "gurdwara-shaheed-ganj-singh-singhnian": [
        dict(
            image_url=FP + "Photograph_of_Gurdwara_Shahid_Ganj%2C_ca.1930%27s.jpg",
            source_page_url=CP + "Photograph_of_Gurdwara_Shahid_Ganj,_ca.1930%27s.jpg",
            collection="Wikimedia Commons",
            creator="Unknown photographer",
            license="Public domain",
            date_or_period="ca.1930's",
            source_caption_verbatim=("Photograph of Gurdwara Shahid Ganj [alt. spelt as "
                                     "Shaheed/Sahid], ca.1930's."),
            image_type="historical photograph",
            identification="uncertain",
            note=("note: the caption names \"Gurdwara Shahid Ganj\" but does not "
                  "disambiguate between our target (Shaheed Ganj Singh Singhnian) and "
                  "the adjacent Gurdwara Shahid Ganj Bhai Taru Singh, which stands "
                  "opposite it; en.wikipedia uses this as the lead image of its "
                  "\"Gurdwara Shahid Ganj Singh Singhania\" article, which is the only "
                  "basis for assigning it to this target. Provenance chain is thin: the "
                  "Commons source field is a link to an x.com post, and the PD-scan tag "
                  "is asserted rather than documented."),
        ),
        dict(
            image_url=FP + "Photograph_of_a_group_of_Sikh_pilgrims_from_East_Punjab_visiting_the_Shahidganj_site_in_Lahore%2C_Punjab%2C_Pakistan%2C_1948.jpg",
            source_page_url=CP + "Photograph_of_a_group_of_Sikh_pilgrims_from_East_Punjab_visiting_the_Shahidganj_site_in_Lahore,_Punjab,_Pakistan,_1948.jpg",
            collection="Wikimedia Commons",
            creator="Unknown photographer",
            license="Public domain",
            date_or_period="June 1948",
            source_caption_verbatim=("Photograph of a group of Sikh pilgrims from East "
                                     "Punjab visiting the Shahidganj site in Lahore, "
                                     "Punjab, Pakistan, 1948. Under a heavy police "
                                     "escort, some Sikhs from East Punjab, India, stand "
                                     "before the Shahid Gunj Gurdwara in Lahore, "
                                     "Pakistan, during the commemoration of the martyrdom "
                                     "of Sri Guru Arjan Dev."),
            image_type="historical photograph",
            identification="uncertain",
            note=("note: DO NOT USE WITHOUT CHECKING - THE PUBLIC DOMAIN TAG IS "
                  "CONTESTED. Two things on the Commons page itself: (a) it carries "
                  "[[Category:Deletion requests February 2026]], i.e. a deletion request "
                  "was open on this file at the time of the hunt, and (b) its own "
                  "description links two Getty Images scans of this same photograph "
                  "(gettyimages.ca news-photo 646271410 and 3380584), so a rights holder "
                  "is asserting a claim over it. The licence recorded here is what the "
                  "source page states, not a finding that it is free. Verify the "
                  "deletion request outcome before any use. Separately, the caption names "
                  "\"the Shahid Gunj Gurdwara in Lahore\" without saying which of the two "
                  "Shahidganj gurdwaras, and the image is as much an event photograph as "
                  "a building photograph - the facade sits behind a crowd."),
        ),
    ],
}

# ---------------------------------------------------------------------------
# Targets searched and found empty. The searches are recorded so the next
# session does not repeat them. Where a same-name or same-place image exists but
# belongs to a DIFFERENT site, the note says so — those near-name collisions are
# the main hazard in this dataset ("Gurdwara Chhevin Patshahi" alone names at
# least three separate sites, and "Chhevin Patshahi"/"Panjvin Patshahi"/"Tambu
# Sahib"/"Baoli Sahib" all have well-photographed namesakes in Indian Punjab).
# ---------------------------------------------------------------------------
EMPTY_NOTES = {
    "gurdwara-babay-nanki": (
        "note: searched Commons file search (\"Babay Nanki\", \"Bebe Nanaki Lahore\", "
        "\"Nanki Lahore\"), Wikidata, en/ur/pa/pnb Wikipedia and Commons geosearch at "
        "31.4438/74.472 r=800m (0 files). Nothing on Commons or archive.org names this "
        "site."),
    "gurdwara-baoli-sahib-guru-arjan-dev-ji-lahore": (
        "note: searched Commons (\"Baoli Sahib\", \"Baoli Sahib Lahore\", \"Dabbi "
        "Bazaar\"), Wikidata, en/ur/pa Wikipedia, geosearch at 31.5824/74.3122 r=800m "
        "(100 files, all Badshahi Mosque / Lahore Fort). Every \"Baoli Sahib\" image on "
        "Commons is Goindwal in Indian Punjab, a different site; the Lal Khoohi images "
        "in Lahore are also a different site (near Mochi Gate, per en.wikipedia "
        "\"Gurdwara Lal Khoohi\"). No candidate."),
    "gurdwara-bhai-beba-singh": (
        "note: searched Commons (\"Bhai Beba Singh\", \"Beba Singh\", insource:\"Beba "
        "Singh\", \"Gurdwara Sikh Peshawar\", \"Peshawar Jogan Shah gurdwara\"), "
        "Wikidata, Wikipedia, geosearch at 34.0124/71.5784 r=800m (13 files, all street "
        "scenes and Bala Hisar). No candidate."),
    "gurdwara-chhevin-patshahi-chitti-gatti": (
        "note: searched Commons (\"Chitti Gatti\", \"Chitti Gatti gurdwara\", \"Gurdwara "
        "Chhevin Patshahi\"), Wikidata, Wikipedia, geosearch at 34.3945/73.2155 r=800m "
        "(0 files). The only \"Gurdwara Chhevin Patshahi\" material on Commons is the "
        "Hadiara site in Lahore district - a different site; see the trailing comment "
        "block in this file. No candidate."),
    "gurdwara-chhevin-patshahi-jhalian-jhalian-dhilwan": (
        "note: searched Commons (\"Jhalian\", \"Gurdwara Chhevin Patshahi\"), Wikidata, "
        "Wikipedia, geosearch at 31.46/74.555 r=800m (0 files). All Commons hits for "
        "\"Gurdwara Chhevin Patshahi\" are frescoes and murals from the Hadiara "
        "gurdwara, a different site in the same district - deliberately not recorded; "
        "see the trailing comment block in this file. No candidate."),
    "gurdwara-chhevin-patshahi-mozang": (
        "note: searched Commons (\"Gurdwara Mozang\", intitle:Mozang, \"Gurdwara Chhevin "
        "Patshahi\"), Wikidata, Wikipedia, geosearch at 31.5556/74.3163 r=800m (9 files, "
        "none religious). Hadiara \"Chhevin Patshahi\" material is a different site. No "
        "candidate."),
    "gurdwara-chowmala-sahib": (
        "note: searched Commons (\"Chowmala\", \"Chaumala\", intitle:Chowmala, \"Bhati "
        "Gate\"), Wikidata, Wikipedia, geosearch at 31.5792/74.3089 r=800m (58 files, "
        "all Data Darbar / Badshahi Mosque / Bhati Gate itself). The Walled City of "
        "Lahore Authority's large Commons upload (578 \"WCLA\" hits) includes Gurudwara "
        "Arjun Ram but not Chowmala Sahib. No candidate."),
    "gurdwara-dash-mesh-pita": (
        "note: searched Commons (\"Dash Mesh Pita\", \"Gurdwara Sukkur\", \"Sukkur "
        "gurdwara Sikh\", \"gurdwara Sindh\"), Wikidata, en/ur Wikipedia (an "
        "ur.wikipedia article on a Sikh gurdwara at Sukkur exists but carries no image), "
        "geosearch at 27.697778/68.860833 r=800m (11 files, none of the gurdwara). "
        "Category:Gurudwaras in Sindh holds one subcategory only (Karachi Gurdwara). No "
        "candidate."),
    "gurdwara-khoohi-bhai-lalo-bhai-lalo-di-khooi": (
        "note: searched Commons (\"Khoohi Bhai Lalo\", \"Bhai Lalo\", \"Eminabad\"), "
        "Wikidata, Wikipedia, geosearch at 32.0415/74.2470 r=800m (0 files). Commons has "
        "Gurdwara Chakki Sahib, Eminabad (Dhanna Singh Chahal, 4 October 1932) and "
        "Janamsakhi paintings of Guru Nanak visiting Bhai Lalo - both deliberately not "
        "recorded: Chakki Sahib is a separate Eminabad site, and the paintings depict the "
        "narrative episode, not the building. No candidate."),
    "gurdwara-malji-sahib": (
        "note: searched Commons (\"Malji Sahib\", intitle:Malji, intitle:\"Mal Ji "
        "Sahib\", insource:\"Mal Ji Sahib\"), Wikidata, en/pa Wikipedia, geosearch at "
        "31.456/73.7125 r=800m (1 file, a Janam Asthan panoramio shot). Every Nankana "
        "Sahib gurdwara image on Commons is Gurdwara Janam Asthan. No candidate."),
    "gurdwara-panjvi-chati-patshahi": (
        "note: searched Commons (\"Panjvi Chati Patshahi\", intitle:Panjvin, "
        "intitle:Chevin), Wikidata, Wikipedia, geosearch at 31.4486/73.6849 r=800m (0 "
        "files). The four intitle:Panjvin hits are all Gurdwara Dera Sahib Panjvin "
        "Patshahi in Lahore - a different site. No candidate."),
    "gurdwara-patti-sahib": (
        "note: searched Commons (\"Patti Sahib\" - 16510 hits, all Patti Smith / Adelina "
        "Patti / Patti in Sicily, and insource:\"Patti Sahib\" - 0 hits), Wikidata, en/pa "
        "Wikipedia, geosearch at 31.4507/73.6985 r=800m (17 files, all Gurdwara Janam "
        "Asthan). No candidate."),
    "gurdwara-sach-khand-sahib": (
        "note: searched Commons (\"Sach Khand Sahib\", insource:\"Sach Khand Sahib\", "
        "\"Gurdwara Shikarpur\", \"Shikarpur Sikh\"), Wikidata, Wikipedia, geosearch at "
        "27.9573/68.6347 r=800m (5 files, all Shikarpur civic buildings). The Shikarpur "
        "Sikh material on Commons is frescoes from Sri Khat Wari Darbar - a different "
        "Shikarpur site, deliberately not recorded. No candidate."),
    "gurdwara-singh-sabha": (
        "note: searched Commons (\"Singh Sabha Quetta\", \"Gurdwara Quetta\", \"Quetta "
        "gurudwara Sikh temple\"), Wikidata, Wikipedia, geosearch at 30.192778/67.013611 "
        "r=800m (0 files). No candidate. The name collides heavily with Singh Sabha "
        "gurdwaras worldwide, so match on Quetta as well as the name."),
    "gurdwara-sri-tilganji-sahib": (
        "note: searched Commons (\"Tilganji\", intitle:Tilganji, insource:\"Tilganji\" - "
        "all 0 hits), Wikidata, Wikipedia, geosearch at 30.1885/66.9985 r=800m (9 files, "
        "all Quetta railway station). No candidate."),
    "gurdwara-tambo-sahib": (
        "note: searched Commons (\"Tambo Sahib\", \"Tambu Sahib\", insource:\"Tambu "
        "Sahib\", \"Nankana Sahib Tambu\"), Wikidata, en/pa Wikipedia, geosearch at "
        "31.4483/73.6844 r=800m (0 files). The two insource hits are Gurdwara Tambu Sahib "
        "at Muktsar in Indian Punjab - a different site, deliberately not recorded. No "
        "candidate."),
}

# ---------------------------------------------------------------------------
# Trailing comment block, written verbatim after the data rows. Not candidates:
# an openly licensed body of material found during the hunt that belongs to a
# site this archive has no entry for at all. Every statement below is quoted or
# counted from the Commons file pages themselves.
# ---------------------------------------------------------------------------
TRAILER = [
    "",
    "# ---------------------------------------------------------------------------",
    "# NOT A CANDIDATE FOR ANY TARGET ABOVE - a possible NEW ENTRY for the editor.",
    "#",
    "# Site (as the sources name it): Gurdwara Chhevin Patshahi, Hadiara, Lahore",
    "#   district, Punjab, Pakistan. Also appears on Commons as \"Gurdwara Patshahi",
    "#   Chhevin, Hadiara\". en.wikipedia carries an article titled \"Gurdwara Patshahi",
    "#   Chhevin (Hadiara)\".",
    "#",
    "# Why it is here: this is a THIRD distinct site named \"Gurdwara Chhevin",
    "#   Patshahi\", separate from the Jhalian and Mozang targets in this hunt, and it",
    "#   was correctly not recorded against either. But it is the best-documented",
    "#   openly licensed body of Sikh wall painting in Lahore district on Commons, and",
    "#   this archive holds no entry for it at all.",
    "#",
    "# What the files are: 12 photographs of frescoes and murals inside the gurdwara -",
    "#   the Battle of Kartarpur (April 1635), Guru Hargobind on horseback, Guru Nanak",
    "#   with his retinue, Surya devta, an Indic deity possibly Ganesha, the Nishan",
    "#   Sahib flag of the Akal Sena, and unidentified figures. Interior detail only:",
    "#   no exterior, plan or general view of the building exists on Commons.",
    "#",
    "# Licence: all 12 state Public domain (PD-Art / PD-old-70).",
    "# Creator, as stated: \"Unknown artist\" throughout, with the photographer credited",
    "#   variously as \"presumably ... Dalvir Pannu\" (3 files), \"KHOJ [Gurmukhi] social",
    "#   media\" (8), and \"Muhammad Shoaib\" (1).",
    "#",
    "# NO SITE-SPECIFIC COMMONS CATEGORY EXISTS for this gurdwara - Category:Gurdwara",
    "#   Chhevin Patshahi, Hadiara is empty. The category that actually holds most of",
    "#   them is:",
    "#   https://commons.wikimedia.org/wiki/Category:Sikh_architecture_in_Pakistan",
    "#   To list exactly these 12, search Commons for: Hadiara",
    "#   (13 hits; the 13th, Akal Sena Flag.svg, is a flag graphic, not the site.)",
    "#",
    "# Nothing above is asserted beyond what the Commons file pages state. Counts were",
    "# taken from the API on 26 August 2026; no date, attribution or licence here was",
    "# supplied from general knowledge.",
    "# ---------------------------------------------------------------------------",
]


def clean(v):
    """Collapse any tab/CR/LF inside a value to a single space (invariant 2)."""
    return re.sub(r"[\t\r\n]+", " ", str(v or "")).strip()


def main():
    with open(TARGETS, encoding="utf-8") as fh:
        lines = [ln for ln in fh.read().split("\n") if ln.strip()]
    header = lines[0].split("\t")
    if header[:2] != ["slug_hint", "name"]:
        print(f"REFUSING TO WRITE -- unexpected targets header: {header}", file=sys.stderr)
        sys.exit(1)
    targets = [ln.split("\t") for ln in lines[1:]]

    rows = []
    problems = []
    for t in targets:
        slug, name = t[0], t[1]
        cands = CANDIDATES.get(slug, [])
        if not cands:
            if slug not in EMPTY_NOTES:
                problems.append(f"{slug}: no candidates and no EMPTY_NOTES entry")
                continue
            rows.append(dict(slug_hint=slug, site_name=name, image_url="",
                             source_page_url="", collection="", creator="", license="",
                             date_or_period="", source_caption_verbatim="", image_type="",
                             identification="", note=NONE + " -- " + EMPTY_NOTES[slug]))
        else:
            for c in cands:
                r = dict(slug_hint=slug, site_name=name)
                r.update(c)
                rows.append(r)

    # ---- invariants (see module docstring) --------------------------------
    # 1. every target gets a row
    seen = {r["slug_hint"] for r in rows}
    for t in targets:
        if t[0] not in seen:
            problems.append(f"{t[0]}: target has no row")

    for i, r in enumerate(rows, 1):
        # 2. scrub first, then check nothing survived
        vals = [clean(r.get(c, "")) for c in COLUMNS]
        if len(vals) != len(COLUMNS):
            problems.append(f"row {i}: {len(vals)} fields, expected {len(COLUMNS)}")
        for c, v in zip(COLUMNS, vals):
            if "\t" in v or "\n" in v or "\r" in v:
                problems.append(f"row {i}: tab/newline survived in {c}")
        d = dict(zip(COLUMNS, vals))
        # 3. an image_url obliges a licence, a source page and a verbatim caption
        if d["image_url"]:
            if not d["license"]:
                problems.append(f"row {i}: image_url with no license")
            if not d["source_page_url"]:
                problems.append(f"row {i}: image_url with no source_page_url")
            if not d["source_caption_verbatim"]:
                problems.append(f"row {i}: image_url with no verbatim caption")
            if not d["identification"]:
                problems.append(f"row {i}: image_url with blank identification")
        # 4. closed vocabularies
        if d["identification"] not in OK_IDENT:
            problems.append(f"row {i}: bad identification {d['identification']!r}")
        if d["image_type"] not in OK_TYPE:
            problems.append(f"row {i}: bad image_type {d['image_type']!r}")
        # 5. notes are unmistakably notes
        if d["note"] and not (d["note"].startswith("note: ") or d["note"].startswith(NONE)):
            problems.append(f"row {i}: note not prefixed as a note")
        r["__vals__"] = vals

    # the trailing comment block must not be mistakable for data
    for ln in TRAILER:
        if ln and not ln.startswith("#"):
            problems.append(f"trailer line is not a comment: {ln!r}")
        if "\t" in ln:
            problems.append(f"trailer line contains a tab: {ln!r}")

    if problems:
        print("REFUSING TO WRITE -- invariants failed:", file=sys.stderr)
        for p in problems:
            print("  " + p, file=sys.stderr)
        sys.exit(1)

    with open(OUT, "w", encoding="utf-8", newline="") as fh:
        fh.write("\t".join(COLUMNS) + "\n")
        for r in rows:
            fh.write("\t".join(r["__vals__"]) + "\n")
        for ln in TRAILER:
            fh.write(ln + "\n")

    with_img = [r for r in rows if r["__vals__"][2]]
    slugs_with_img = {r["slug_hint"] for r in with_img}
    print(f"wrote {OUT}")
    print(f"targets={len(targets)}  data rows={len(rows)}  rows with an image_url={len(with_img)}")
    print(f"targets with >=1 candidate={len(slugs_with_img)}  "
          f"targets with none={len(targets) - len(slugs_with_img)}")
    idents = {}
    for r in with_img:
        idents[r["__vals__"][10]] = idents.get(r["__vals__"][10], 0) + 1
    print(f"identification distribution={idents}")


if __name__ == "__main__":
    main()
