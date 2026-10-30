"""Classify the wide OSM pull (overpass_counts.ql) into counted sites, with the rule recorded.

Stdlib only; imported by build_district_counts.py. Every element gets:
  tier       A  the tags say it is a shrine, tomb, temple, gurdwara or samadhi
             B  the tags say place of worship / monument, and the NAME says shrine
                (darbar, mazar, dargah, ...), temple, gurdwara or samadhi. A bare named point,
                or one tagged only tourism=attraction, counts as site-like.
             C  a Muslim (or untagged) place of worship named for a person with a
                saint's honorific (Pir, Baba, Sakhi, Hazrat, ...), with no mosque word.
                The weakest tier: many such names are mosques. Counted separately.
             -  dropped (the rule says why)
  tradition  muslim | hindu | sikh | jain | other (Parsi fire temples) | unknown
  rule       the deciding rule, so any count can be audited back to its elements

Measured by reading samples of every rule (HANDOVER 9.434); the precision figures are in
district_counts/README.md, not here, because they are a measurement and this is code.
"""

import re

SHRINE_WORDS = (r"darbar|darbaar|darbār|durbar|dargah|dargāh|dargha|mazar|mazār|mazaar|mazar-e|ziarat|ziyarat|shrine|"
                r"astana|aastana|khanqah|khanqa|khankah|maqbara|maqbarah|tomb|mausoleum|roza|rauza|"
                r"دربار|مزار|درگاہ|زیارت|آستانہ|خانقاہ|مقبرہ|روضہ")
TEMPLE_WORDS = r"mandir|temple|مندر|dharamsala|dharamshala"
GURDWARA_WORDS = r"gurdwara|gurudwara|gurduara|گوردوارہ|گردوارہ"
SAMADHI_WORDS = r"samadhi|samadh|سمادھی"
MOSQUE_WORDS = r"masjid|masjed|mosque|jamia|jama |jamiya|مسجد|جامع|imam ?barg[h]?a+h|imambara|امام بارگاہ|madrassa|madrasa|madrasah|مدرسہ|school|quran|سکول"
# A business or a road named for a nearby darbar; and a graveyard is not the shrine in it.
NOT_A_SITE_NAME = re.compile(r"(?<!\w)(hotel|dhaba|restaurant|cafe|caterers|lawn|market|bazar|"
                             r"parking|road|chowk|street|stop|qabristan|graveyard|ہوٹل|قبرستان|روڈ|چوک)(?!\w)", re.I)
HONORIFIC = (r"\b(pir|peer|baba|sakhi|sain|saeen|hazrat|hazart|bibi|sultan|qalandar|lal|shah)\b|"
             r"پیر|بابا|سخی|سائیں|حضرت|بی بی|قلندر")
# Not a site: a road, a shop, a settlement or an office named after a shrine.
NOT_A_SITE_KEYS = ("highway", "barrier", "man_made", "leisure", "shop", "place", "office", "railway", "public_transport",
                   "boundary", "craft", "healthcare", "aeroway", "waterway", "natural")
NOT_A_SITE_AMENITY = {"restaurant", "cafe", "fast_food", "parking", "bus_station", "school",
                      "hospital", "clinic", "bank", "fuel", "marketplace", "community_centre",
                      "college", "university", "pharmacy", "police", "townhall", "library",
                      "kindergarten", "taxi", "toilets", "atm", "post_office", "doctors",
                      "events_venue", "food_court"}
NOT_A_SITE_TOURISM = {"hotel", "guest_house", "hostel", "motel", "information", "viewpoint", "camp_site"}
NON_MUSLIM_RELIGION = {"hindu": "hindu", "sikh": "sikh", "jain": "jain"}
# "shinto" is not dropped: 14 Pakistani darbars carry it, a mapper's slip (an editor preset
# called "shrine"), and their names are read instead of their religion tag.
MISTAGGED_RELIGION = {"shinto"}
NEIGHBOURHOOD = re.compile(r"guru ?mandir", re.I)  # Gurumandir, Karachi: offices named for it
FIRE_TEMPLE = re.compile(r"fire temple|agiary|parsi|zoroastr", re.I)
SITE_LIKE_EXTRA_KEYS = re.compile(r"^(name.*|alt_name.*|old_name.*|official_name.*|religion|denomination|"
                                  r"wikidata|wikipedia|source.*|note|description|addr:.*|building|"
                                  r"tourism|heritage.*|start_date|image|wikimedia_commons|check_date|historic.*|cemetery|ruins|"
                                  r"area|ele|subject.*|fixme|operator|phone|website|addr.*|loc_name)$")
DROP_RELIGION = {"christian", "buddhist", "bahai", "zoroastrian", "none", "taoist", "jewish"}


def _rx(words):
    # Whole words only, in both scripts: درگاہ sits inside بندرگاہ (a port), مندر inside
    # سمندری (Samundri), and "mazar" inside the surname Mazari.
    return re.compile(r"(?<!\w)(?:" + words + r")(?!\w)", re.I)


RX = {k: _rx(v) for k, v in dict(shrine=SHRINE_WORDS, temple=TEMPLE_WORDS, gurdwara=GURDWARA_WORDS,
                                   samadhi=SAMADHI_WORDS, mosque=MOSQUE_WORDS, hon=HONORIFIC).items()}


def names(tags):
    return " | ".join(v for k, v in tags.items() if k == "name" or k.startswith("name:")
                      or k in ("alt_name", "old_name", "official_name"))


def classify(tags):
    """Return (tier, tradition, rule) for one element's tags."""
    nm = names(tags)
    rel = (tags.get("religion") or "").lower()
    if rel in MISTAGGED_RELIGION:
        rel = ""
    amen = tags.get("amenity", "")
    hist = tags.get("historic", "")
    bld = tags.get("building", "")
    pow_ = (tags.get("place_of_worship") or "").lower()

    for k in NOT_A_SITE_KEYS + tuple(t for t in tags if t.startswith(("abandoned:", "disused:"))):
        if k in tags and amen != "place_of_worship" and hist not in ("tomb", "mausoleum"):
            return "-", "", f"drop:{k}"
    if amen in NOT_A_SITE_AMENITY:
        return "-", "", f"drop:amenity={amen}"
    if tags.get("tourism") in NOT_A_SITE_TOURISM:
        return "-", "", f"drop:tourism={tags['tourism']}"
    if NOT_A_SITE_NAME.search(nm) and hist not in ("tomb", "mausoleum"):
        return "-", "", "drop:business-or-road-name"
    if NEIGHBOURHOOD.search(nm) and amen != "place_of_worship":
        return "-", "", "drop:gurumandir-locality"
    if rel in DROP_RELIGION or RX["mosque"].search(nm) and not RX["shrine"].search(nm):
        if rel in DROP_RELIGION:
            return "-", "", f"drop:religion={rel}"
        return "-", "", "drop:mosque-name"
    if bld in ("mosque", "church") or pow_ in ("mosque", "church", "husayniyyah", "musalla"):
        if not RX["shrine"].search(nm):
            return "-", "", f"drop:{'building' if bld in ('mosque', 'church') else 'pow'}={bld or pow_}"

    def tradition():
        if rel in NON_MUSLIM_RELIGION:
            return NON_MUSLIM_RELIGION[rel]
        if FIRE_TEMPLE.search(nm):
            return "other"
        if re.search(r"jain|جین", nm, re.I):
            return "jain"
        if RX["gurdwara"].search(nm):
            return "sikh"
        if RX["temple"].search(nm):
            return "hindu"
        if RX["samadhi"].search(nm):
            return "unknown"  # Hindu, Sikh and Nanakpanthi samadhis are not told apart by a name
        if rel in ("muslim", "islamic") or RX["shrine"].search(nm):
            return "muslim"
        return "unknown"

    # Tier A: the tags themselves.
    if hist in ("tomb", "mausoleum") or "tomb" in tags or bld in ("shrine", "tomb", "mausoleum") \
            or pow_ in ("shrine", "dargah", "mazar", "tomb"):
        return "A", tradition(), "A:tag-tomb-shrine"
    if amen == "place_of_worship" and rel in NON_MUSLIM_RELIGION:
        return "A", NON_MUSLIM_RELIGION[rel], f"A:pow-religion={rel}"
    if bld == "temple":
        return "A", tradition(), "A:building=temple"

    worshipish = amen == "place_of_worship" or hist in ("monument", "memorial", "wayside_shrine") \
        or tags.get("landuse") in ("religious", "cemetery") or amen == "grave_yard"         or tags.get("tourism") == "attraction" or all(SITE_LIKE_EXTRA_KEYS.match(k) for k in tags)
    # Tier B: a site-like tag and a decisive name.
    for kind in ("shrine", "gurdwara", "temple", "samadhi"):
        if RX[kind].search(nm):
            if worshipish or bld not in ("", "no"):
                if kind == "shrine" and RX["mosque"].search(nm):
                    # "X Shrine Mosque" is the mosque beside a shrine (13 of 15 audited);
                    # a tomb or khanqah named with its mosque is the site itself.
                    if re.search(r"(?<!\w)(tomb|khanqah?|maqbara|مقبرہ|خانقاہ)(?!\w)", nm, re.I):
                        return "B", tradition(), "B:name-tomb-and-mosque"
                    return "-", "", "drop:mosque-of-a-shrine"
                return "B", tradition(), f"B:name-{kind}"
            return "-", "", f"drop:name-{kind}-no-site-tag"
    # Tier C: a person's place of worship.
    if amen == "place_of_worship" and rel in ("", "muslim", "islamic") and RX["hon"].search(nm):
        return "C", "muslim", "C:pow-honorific"
    if hist == "wayside_shrine":
        return "-", "", "drop:wayside_shrine-unnamed-or-generic"
    return "-", "", "drop:no-rule"
