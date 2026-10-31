"""
The archive pins that independent records place elsewhere (district_counts/archive_location_check.csv,
HANDOVER 9.434), and the pins several archive rows share: for each, the point the independent records
give, the evidence, and a satellite comparison for a person to look at (Rauf, 30 October 2026: "go
ahead" with a CSV patch after a satellite check).

Nothing here is a guessed coordinate (RULE 2): a proposed point is the mean of the named independent
records chosen in DECISIONS below (OSM, Wikidata, DOAM; GeoNames never sets a point, its coordinates
are coarse), and those records must agree within AGREE_M of one another or the script refuses.

Writes (repo root relative):
  data/review/pin_check_2026-10-30.csv          one row per pin: current, proposed, evidence, tier
  data/review/pin_check_2026-10-30/<id>.jpg     satellite: current pin red, proposed green
Imagery: Esri World Imagery tiles (the GIS viewer's basemap), cached in pipeline/gis/sources/ (gitignored).

Usage (GIS venv, for Pillow):  ~/.venvs/gis312/Scripts/python pipeline/gis/shrine_sources/pin_review/pin_review.py
"""
import csv, io, math, sys, time, urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[4]
DC = ROOT / "pipeline/gis/shrine_sources/district_counts"
OUT_CSV = ROOT / "data/review/pin_check_2026-10-30.csv"
OUT_IMG = ROOT / "data/review/pin_check_2026-10-30"
CACHE = ROOT / "pipeline/gis/sources/imagery_tiles"
TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
AGREE_M = 150
LINK = {"osm": "https://www.openstreetmap.org/{}", "doam": "https://doam.gov.pk/public/{}",
        "wikidata": "https://www.wikidata.org/wiki/{}", "geonames": "https://www.geonames.org/{}"}

# archive id -> (tier, records that set the point, records that corroborate only, reasoning)
# Tier A: two or more independent sources agree on the new point. Tier B: one precise source (with or
# without a GeoNames record nearby). Tier C: no independent point; flagged, not moved.
DECISIONS = {
    "shrine-of-hafiz-muhammad-jamal-multani": ("A", ["doam:sites/10280", "osm:way/900538810"], ["osm:way/900538809"],
        "DOAM 'Shrine of Hafiz Jamal' and OSM 'Tomb of Hafiz Jamal Multani' agree; the pin is 1.5 km away."),
    "shrine-of-hazrat-shah-ali-akbar-shah-ali-akbar-shamsi": ("A", ["osm:way/900538792", "wikidata:Q6794057"], ["osm:way/900538796"],
        "OSM 'Tomb of Shah Ali Akbar' and Wikidata 'tomb of Shah Ali Akbar'. The check's averaged centre included his "
        "mother's tomb (DOAM sites/6430, OSM way/900538821), left out here. DOAM sites/6427 'Tomb of Shah Ali Akbar (Suraj Miani)' "
        "lies 0.9 km further and disagrees with the other two: noted, not used."),
    "darbar-malik-ahmad-ayaz": ("A", ["osm:way/903945368", "osm:node/8395172968", "doam:sites/10165"], [],
        "OSM 'Hazrat Ahmad Ayaz', OSM 'Tomb of Malik Ayaz', DOAM 'Tomb of Malik Ayaz Rang Mahal' agree. The pin is Data Darbar's own."),
    "tomb-of-baha-al-halim-uch-sharif": ("A", ["doam:sites/6550", "wikidata:Q18210989"], ["osm:node/4736287721"],
        "DOAM 'Tomb of Bhawal Haleem' and Wikidata 'tomb of Baha'al-Halim' agree to a metre. The pin is shared with Javindi Bibi's row."),
    "tomb-of-javindi-bibi": ("A", ["wikidata:Q7818612", "doam:sites/6552"], [],
        "Wikidata 'tomb of Bibi Jawindi' and DOAM 'Tomb of Bibi Jawindi' agree. The pin is shared with Baha'al-Halim's row."),
    "darbar-abul-muali-qadri": ("A", ["osm:way/611963337", "doam:sites/10193"], ["osm:way/611963338"],
        "OSM 'Shrine of Shah Abu al Mali' and DOAM 'Shrine of Hazrat Shah Abul Ma`ali' agree. The row's own note says the pin "
        "is Mochi Gate's coordinate, an approximate landmark."),
    "lal-shahbaz-qalandar": ("A", ["osm:relation/12152063", "doam:sites/5179"], ["geonames:11120809"],
        "OSM 'Lal Shahbaz Qalandar Shrine' and DOAM 'Shrine of Lal Shahbaz Qalandar' agree; GeoNames too."),
    "tahir-bandagi-qadri": ("A", ["osm:way/1078951946", "doam:sites/10192"], [],
        "OSM 'Shrine of Hazrat Tahir Bandagi' and DOAM 'Shrine of Sheikh Muhammad Tahir Bandagi' agree. The pin is the shared "
        "Miani Sahib point of four rows."),
    "samadhi-of-maharaja-ranjit-singh": ("A", ["doam:sites/6470", "osm:way/105841052", "wikidata:Q3383698"], ["geonames:7043731"],
        "DOAM, OSM and Wikidata agree on Ranjit Singh's samadhi. The check's centre included Kharak Singh's and Nau Nihal Singh's "
        "samadhis beside it, left out here."),
    "shrine-of-miran-hussain-zanjani-zanjani-sahib": ("A", ["osm:way/618664586", "doam:sites/10204"], [],
        "OSM 'Shrine of Chah Miran' and DOAM 'Shrine of Hazrat Miran Hussain Janjani' agree."),
    "shrine-of-akhund-panju-baba": ("B", ["doam:sites/4612"], ["geonames:1106957"],
        "DOAM 'Akhund Panju Baba Tomb'; GeoNames 'Akhun Panju Baba Ziarat' lies about 190 m from it. The pin is 2.1 km away."),
    "shrine-of-akhund-darweza-baba": ("B", ["osm:node/8436248356"], ["geonames:8624279"],
        "OSM 'Ziarat Akhund Darwaza'; GeoNames 'Akhun Darweza Baba Ziarat' lies about 270 m from it."),
    "ghazi-ilm-din-shaheed": ("B", ["osm:way/611906754"], [],
        "OSM 'Shrine of Ilm-ud-Din' in Miani Sahib graveyard. The pin is the shared Miani Sahib point of four rows."),
    "darbar-hazrat-khawaja-shah-muhammad-sulaiman-taunsvi-r-a": ("B", ["osm:node/2899978113"], [],
        "OSM 'Shrine Hazarat Khawja Shah Suleman Taunsvi(R.A)'; the pin is 850 m away."),
    "wasif-ali-wasif": ("B", ["osm:way/611906758"], [],
        "OSM 'Shrine of Hazrat Wasif Ali Wasif' in Miani Sahib graveyard. The pin is the shared Miani Sahib point of four rows."),
    "chandragup-baba-chandragup": ("B", ["osm:node/4081039771"], [],
        "OSM 'Chandragup' (the mud volcano); the pin is 370 m away."),
    "khawaja-feroz-ud-din-gharib-nawaz": ("C", [], [],
        "No independent record. Shares the Miani Sahib point with three rows that move; this one stays until a person places it."),
    "sevapanthi-darbar-bhai-gurdas-gandava": ("C", [], [],
        "No independent record (OSM has nothing within 4 km). Shares a 3-decimal town point with Ayub Shah Bukhari's row."),
    "shrine-of-hazrat-muhammad-ayub-shah-bukhari": ("C", [], [],
        "Only GeoNames (1.1 km, coarse). Shares a 3-decimal town point with the Sevapanthi Darbar row."),
}


# What the satellite comparison shows (read by Claude on 30 October 2026, image by image; a person
# should glance at the same images before importing) and what follows from it.
SATELLITE = {
    "shrine-of-hafiz-muhammad-jamal-multani": ("move", "Proposed point on a walled shrine compound in the old city; the pin is by Qila Kohna's stadium."),
    "shrine-of-hazrat-shah-ali-akbar-shah-ali-akbar-shamsi": ("move", "Proposed point on a tiled domed tomb beside a graveyard; the pin is in plain housing."),
    "darbar-malik-ahmad-ayaz": ("move", "Proposed point in the Shah Alam market streets the row's Location names; the pin is Data Darbar."),
    "tomb-of-baha-al-halim-uch-sharif": ("move", "Proposed point on an octagonal tomb in the Uch tomb complex; the pin is in the town centre."),
    "tomb-of-javindi-bibi": ("move", "Proposed point on the octagonal tomb of the Uch complex, about 60 m from Baha'al-Halim's; the pin is in the town centre."),
    "darbar-abul-muali-qadri": ("move", "Proposed point on a white-domed shrine; the pin is Mochi Gate."),
    "lal-shahbaz-qalandar": ("move", "Proposed point beside the great domed shrine of Sehwan; the pin is in fields across the canal."),
    "tahir-bandagi-qadri": ("move", "Proposed point on a structure inside Miani Sahib graveyard (the row's Location); the pin is a street junction outside it."),
    "samadhi-of-maharaja-ranjit-singh": ("move", "Proposed point on the white samadhi by Hazuri Bagh and Badshahi Mosque (the row's Location); the pin is in the old city."),
    "shrine-of-miran-hussain-zanjani-zanjani-sahib": ("move", "Proposed point on a small shrine compound with trees in Chah Miran (the row's Location)."),
    "shrine-of-akhund-panju-baba": ("move", "Proposed point on a walled compound with a small white dome; GeoNames' ziarat lies 190 m from it."),
    "shrine-of-akhund-darweza-baba": ("move", "Proposed point on a walled enclosure at the edge of a large graveyard (Hazarkhwani, the row's Location)."),
    "ghazi-ilm-din-shaheed": ("move", "Proposed point inside Miani Sahib graveyard (the row's Location); the pin is a street junction outside it."),
    "darbar-hazrat-khawaja-shah-muhammad-sulaiman-taunsvi-r-a": ("move", "Proposed point on a large white-domed shrine with a courtyard; the pin is in housing 850 m away."),
    "wasif-ali-wasif": ("move", "Proposed point on a white built structure at the edge of Miani Sahib graveyard (the row's Location)."),
    "chandragup-baba-chandragup": ("keep", "The pin is on the mud volcano's crater, the sacred site itself; OSM's point is in open plain 370 m away. Keep the pin."),
    "khawaja-feroz-ud-din-gharib-nawaz": ("flag", "No independent point. Stays on the shared Miani Sahib point; needs a person who knows the grave."),
    "sevapanthi-darbar-bhai-gurdas-gandava": ("flag", "No independent point; a 3-decimal town point. Needs a person or a field visit."),
    "shrine-of-hazrat-muhammad-ayub-shah-bukhari": ("flag", "No independent point; a 3-decimal town point. Needs a person or a field visit."),
}


def hav(a, b, c, d):
    p1, p2 = math.radians(a), math.radians(c)
    return 2 * 6371000 * math.asin(math.sqrt(math.sin((p2 - p1) / 2) ** 2 +
                                             math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b) / 2) ** 2))


def px(lat, lon, z):
    n = 256 * 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def tile(z, x, y):
    f = CACHE / f"{z}_{x}_{y}.jpg"
    if not f.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(TILE.format(z=z, x=x, y=y), headers={"User-Agent": "ShrinesArchiveResearch/1.0"})
        f.write_bytes(urllib.request.urlopen(req, timeout=30).read())
        time.sleep(0.2)
    return Image.open(io.BytesIO(f.read_bytes())).convert("RGB")


def picture(cur, new, path, size=640):
    """Left: both points at the zoom that holds them. Right: a close-up (zoom 18) at the proposed point,
    or at the current pin when there is none."""
    left = panel(cur, new, size)
    right = panel(new or cur, None, size, zoom=18, colour=(40, 220, 90) if new else (230, 40, 40))
    both = Image.new("RGB", (size * 2 + 8, size), (0, 0, 0))
    both.paste(left, (0, 0))
    both.paste(right, (size + 8, 0))
    both.save(path, quality=85)


def panel(cur, new, size, zoom=None, colour=(230, 40, 40)):
    pts = [p for p in (cur, new) if p]
    clat, clon = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    z = zoom or 18
    while zoom is None and z > 12:
        if not new or max(abs(a - b) for a, b in zip(px(*cur, z), px(*new, z))) < size * 0.7:
            break
        z -= 1
    cx, cy = px(clat, clon, z)
    x0, y0 = cx - size / 2, cy - size / 2
    img = Image.new("RGB", (size, size))
    for tx in range(int(x0 // 256), int((x0 + size) // 256) + 1):
        for ty in range(int(y0 // 256), int((y0 + size) // 256) + 1):
            img.paste(tile(z, tx, ty), (int(tx * 256 - x0), int(ty * 256 - y0)))
    d = ImageDraw.Draw(img)
    for p, col in ((cur, colour), (new, (40, 220, 90))):
        if p:
            x, y = px(*p, z)
            x, y = x - x0, y - y0
            d.ellipse([x - 11, y - 11, x + 11, y + 11], outline=col, width=4)
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=col)
    m = 156543.03 * math.cos(math.radians(clat)) / 2 ** z      # metres per pixel
    bar = 100 if m * 200 > 100 else 50
    d.rectangle([12, size - 30, 12 + bar / m, size - 24], fill=(255, 255, 255))
    label = "close-up" if zoom else "red: current pin   green: proposed"
    d.text((12, size - 46), f"{bar} m   zoom {z}   {label}", fill=(255, 255, 255))
    return img


def main():
    recs = {f"{r['source']}:{r['source_id']}": r for r in csv.DictReader(open(DC / "sites.csv", encoding="utf-8"))}
    sheet = {r["id"]: r for r in csv.DictReader(open(ROOT / "data/shrines.csv", encoding="utf-8"))}
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    rows, bad = [], []
    if set(SATELLITE) != set(DECISIONS):
        sys.exit("refusing: every pin needs a satellite reading, and only those")
    for sid, (tier, setters, corrob, why) in DECISIONS.items():
        if sid not in sheet:
            bad.append(f"{sid}: not in data/shrines.csv")
            continue
        s = sheet[sid]
        cur = (float(s["Latitude"]), float(s["Longitude"]))
        missing = [k for k in setters + corrob if k not in recs]
        if missing:
            bad.append(f"{sid}: records not in sites.csv: {missing}")
            continue
        pts = [(float(recs[k]["lat"]), float(recs[k]["lon"])) for k in setters]
        spread = max((hav(*a, *b) for a in pts for b in pts), default=0)
        if spread > AGREE_M:
            bad.append(f"{sid}: the setting records are {spread:.0f} m apart (> {AGREE_M})")
            continue
        new = (round(sum(p[0] for p in pts) / len(pts), 6), round(sum(p[1] for p in pts) / len(pts), 6)) if pts else None
        picture(cur, new, OUT_IMG / f"{sid}.jpg")
        ev = [f"{k} '{recs[k]['name']}' {LINK[k.split(':')[0]].format(k.split(':', 1)[1])}" for k in setters + corrob]
        rows.append({"id": sid, "name": s["Name"], "tier": tier, "current_lat": s["Latitude"], "current_lon": s["Longitude"],
                     "proposed_lat": new[0] if new else "", "proposed_lon": new[1] if new else "",
                     "move_m": round(hav(*cur, *new)) if new else "", "point_from": ";".join(setters), "setting_records_spread_m": round(spread) if pts else "",
                     "evidence": " | ".join(ev), "reasoning": why, "satellite": f"data/review/pin_check_2026-10-30/{sid}.jpg",
                     "satellite_read": SATELLITE[sid][1], "recommend": SATELLITE[sid][0]})
        print(f"{tier} {sid}: move {rows[-1]['move_m']} m" if new else f"{tier} {sid}: no independent point")
    if bad:
        sys.exit("refusing:\n  " + "\n  ".join(bad))
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} pins -> {OUT_CSV}")


if __name__ == "__main__":
    main()
