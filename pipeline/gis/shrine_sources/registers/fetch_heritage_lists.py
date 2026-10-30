"""
Pakistan's protected-monument lists, fetched and parsed into one auditable table.
Python stdlib only (plus the `pdftotext` binary, once, to turn the 1997 EPA PDF into text).

Stages
  python -I fetch_heritage_lists.py fetch   [--refresh] [--workers N]   download raw sources
  python -I fetch_heritage_lists.py parse                               build the CSV
  python -I fetch_heritage_lists.py all                                 both

Raw downloads land in pipeline/gis/sources/shrine_dbs/heritage/ (gitignored). They are treated
as untrusted data: nothing there is executed, and this script lives outside that folder.
Every download is recorded in heritage/fetch_manifest.csv (url, file, bytes, sha256, time).

Sources (see README_heritage.md for what each one is and how they relate):
  A. Wikipedia "List of cultural heritage sites in ..." pages (Wiki Loves Monuments lists):
     {{PKmonument row}} templates, ids PB-/SD-/KPK-/BA-/ICT-/AJK-/GB-/FATA-.
  B. Pakistan EPA, "Guidelines for Sensitive and Critical Areas" (October 1997), Appendix II:
     the federal list (Antiquities Act 1975) by province and district, the Sindh "Protected
     Heritage" notification of 7 Sept 1995 and the Punjab "Special Premises" list (1985
     Ordinance). The EPA says the appendix is M. Rafique Mughal's 1996 compilation.
  C. Department of Archaeology & Museums (doam.gov.pk): the "Protected Monument & Sites" tab of
     /public/heritage-sites (current federal list, name + province only), each protected item's
     page, and the "All Heritage Sites" national inventory (/public/sites/<id>), whose pages
     carry Type, Province, District, coordinates and Legal Status.

Exit status is non-zero if any page fails to parse cleanly: a Wikipedia page whose number of
{{PKmonument row}} templates differs from its parsed rows, an EPA section whose serials do not
run in order, a DOAM page without the fields it should have, or a missing raw file.
"""
import csv
import hashlib
import html
import json
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
GIS = HERE.parents[1]
RAW = GIS / "sources" / "shrine_dbs" / "heritage"
DICT = GIS / "boundaries" / "pk_dictionary.csv"
OUT_CSV = HERE / "heritage_monuments.csv"

UA = "shrines-archive-gis/1.0 (research; raufnawaz.github.io/Sufi-Shrines)"
BROWSER_UA = "Mozilla/5.0 (compatible; shrines-archive-gis/1.0; raufnawaz.github.io/Sufi-Shrines)"

WIKI_PAGES = [
    "List of cultural heritage sites in Punjab, Pakistan",
    "List of cultural heritage sites in Lahore",
    "List of cultural heritage sites in Sindh",
    "List of cultural heritage sites in Karachi",
    "List of cultural heritage sites in Khyber Pakhtunkhwa",
    "List of cultural heritage sites in Balochistan, Pakistan",
    "List of cultural heritage sites in Islamabad",
    "List of cultural heritage sites in Azad Kashmir",
    "List of cultural heritage sites in Gilgit-Baltistan",
]
EPA_URL = ("https://web.archive.org/web/20131014185608id_/"
           "http://www.environment.gov.pk/eia_pdf/f_Crit_%20Areas.pdf")
DOAM_INDEX = "https://doam.gov.pk/public/heritage-sites"
DOAM_SITE = "https://doam.gov.pk/public/sites/{}"
DOAM_PROT = "https://doam.gov.pk/public/heritage-sites/{}"
PB_GALLERY = "archaeology.punjab.gov.pk/gallery_protect_monument_museum"
PB_CDX = ("https://web.archive.org/cdx/search/cdx?url=" + PB_GALLERY
          + "&matchType=prefix&fl=original,timestamp,statuscode&filter=statuscode:200&output=json")

FIELDS = ["list", "official_id", "province", "district_as_written", "district_code", "name",
          "name_ur", "kind", "kind_basis", "lat", "lon", "wikidata", "source_url",
          "source_locator", "fetched_on", "note"]

ERRORS = []

# doam.gov.pk publishes an AAAA record whose address does not answer: every urllib request then
# waits ~21 s for the IPv6 connect to time out before falling back (measured 22.2 s vs 1.1 s on
# 30 Oct 2026). Resolve IPv4 only.
_getaddrinfo = socket.getaddrinfo


def _ipv4_only(host, port, family=0, *args, **kwargs):
    return _getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)


socket.getaddrinfo = _ipv4_only


def err(msg):
    ERRORS.append(msg)
    print("PARSE ERROR: " + msg, file=sys.stderr)


# ---------------------------------------------------------------------------------- fetching

def http_get(url, ua=UA, tries=4, timeout=60):
    delay = 5
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": ua})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - retried, then raised
            if i + 1 == tries:
                raise
            print(f"  retry {i + 1} {url}: {e}", file=sys.stderr)
            time.sleep(delay)
            delay *= 2


class Manifest:
    def __init__(self, path):
        self.path = path
        self.rows = {}
        if path.exists():
            with path.open(encoding="utf-8", newline="") as f:
                for r in csv.DictReader(f):
                    self.rows[r["file"]] = r

    def add(self, url, file, data):
        self.rows[str(file.relative_to(RAW)).replace("\\", "/")] = {
            "url": url, "file": str(file.relative_to(RAW)).replace("\\", "/"),
            "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "fetched_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

    def fetched_on(self, file):
        r = self.rows.get(str(file.relative_to(RAW)).replace("\\", "/"))
        return r["fetched_utc"][:10] if r else ""

    def save(self):
        with self.path.open("w", encoding="utf-8", newline="\n") as f:
            w = csv.DictWriter(f, ["url", "file", "bytes", "sha256", "fetched_utc"],
                               lineterminator="\n")
            w.writeheader()
            for k in sorted(self.rows):
                w.writerow(self.rows[k])


def save(man, url, path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    man.add(url, path, data)


def wiki_slug(title):
    return re.sub(r"[^A-Za-z0-9]+", "_", title).strip("_")


def fetch_wikipedia(man, refresh):
    for title in WIKI_PAGES:
        path = RAW / "wikipedia" / (wiki_slug(title) + ".json")
        if path.exists() and not refresh:
            continue
        url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "prop": "revisions", "titles": title, "rvprop": "ids|timestamp|content",
            "rvslots": "main", "format": "json", "formatversion": "2", "redirects": "1"})
        save(man, url, path, http_get(url))
        print("  wikipedia:", title)
        time.sleep(1)


def fetch_epa(man, refresh):
    pdf = RAW / "epa1997" / "f_Crit_Areas.pdf"
    txt = RAW / "epa1997" / "f_Crit_Areas.layout.txt"
    if refresh or not pdf.exists() or not pdf.read_bytes()[:4] == b"%PDF":
        data = http_get(EPA_URL, ua=BROWSER_UA, timeout=180)
        if not data.startswith(b"%PDF"):
            raise SystemExit("EPA download is not a PDF (Wayback served a page?): " + EPA_URL)
        save(man, EPA_URL, pdf, data)
        print("  epa1997 pdf")
    if refresh or not txt.exists():
        exe = shutil.which("pdftotext")
        if not exe:
            raise SystemExit("pdftotext not found: install poppler/xpdf, or supply " + str(txt))
        subprocess.run([exe, "-layout", "-enc", "UTF-8", str(pdf), str(txt)], check=True)
        man.add("pdftotext -layout " + pdf.name, txt, txt.read_bytes())


def doam_index_ids(index_html):
    """(protected ids by province, inventory ids by province) from the heritage-sites page."""
    t = index_html
    i5 = t.find('id="tab-f-5"')
    i2 = t.find('id="tab-f-2"', i5)
    i1 = t.find('id="tab-f-1"')
    if min(i5, i2, i1) < 0:
        raise ValueError("DOAM index: tab-f-1/tab-f-5/tab-f-2 markers missing")

    def sections(seg, prefix, kind):
        out = []
        parts = re.split(r'<h5 class="mb-0">\s*<a[^>]*href="#(' + prefix + r'\d+)"[^>]*>(.*?)</a>',
                         seg, flags=re.S)
        for k in range(1, len(parts) - 2, 3):
            prov = html.unescape(re.sub(r"\s+", " ", parts[k + 1])).strip()
            body = parts[k + 2]
            items = re.findall(r'href="https://doam\.gov\.pk/public/' + kind
                               + r'/(\d+)">(.*?)</a>', body, flags=re.S)
            n_li = body.count("<li")
            out.append((prov, [(int(a), html.unescape(re.sub(r"\s+", " ", b)).strip())
                               for a, b in items], n_li))
        return out

    return sections(t[i5:i2], "collapsewh", "heritage-sites"), sections(t[i1:i5], "collapsewhh",
                                                                        "sites")


def fetch_doam(man, refresh, workers):
    idx = RAW / "doam" / "heritage-sites.html"
    if refresh or not idx.exists():
        save(man, DOAM_INDEX, idx, http_get(DOAM_INDEX, ua=BROWSER_UA, timeout=180))
        print("  doam index")
    prot, inv = doam_index_ids(idx.read_text(encoding="utf-8", errors="replace"))
    jobs = []
    for _, items, _ in prot:
        jobs += [(DOAM_PROT.format(i), RAW / "doam" / "protected" / f"{i}.html") for i, _ in items]
    for _, items, _ in inv:
        jobs += [(DOAM_SITE.format(i), RAW / "doam" / "sites" / f"{i}.html") for i, _ in items]
    known = set(man.rows)
    todo = [(u, p) for u, p in jobs if refresh or not p.exists()
            or str(p.relative_to(RAW)).replace("\\", "/") not in known]
    print(f"  doam: {len(jobs)} item pages, {len(todo)} to fetch with {workers} workers")
    done = 0
    failed = []

    def one(job):
        u, p = job
        try:
            data = http_get(u, ua=BROWSER_UA)
        except Exception as e:  # noqa: BLE001
            return u, p, None, e
        time.sleep(0.3)
        return u, p, data, None

    with ThreadPoolExecutor(max_workers=workers) as ex:
        for u, p, data, e in ex.map(one, todo):
            if data is None:
                failed.append((u, str(e)))
                continue
            save(man, u, p, data)
            done += 1
            if done % 100 == 0:
                man.save()
                print(f"    {done}/{len(todo)}", flush=True)
    man.save()
    if failed:
        for u, e in failed:
            print("  FETCH FAILED", u, e, file=sys.stderr)
        raise SystemExit(f"{len(failed)} DOAM pages failed to download; rerun `fetch` to resume")


def fetch_wiki_qids(man, refresh):
    """Wikidata ids of the articles that row descriptions link to (pageprops.wikibase_item)."""
    path = RAW / "wikipedia" / "linked_article_qids.json"
    if path.exists() and not refresh:
        return
    titles = set()
    for title in WIKI_PAGES:
        page = load_wiki_page(title)
        for _, params, _ in wiki_rows(page["content"]):
            t = first_link_target(params.get("description", ""))
            if t:
                titles.add(t)
    titles = sorted(titles)
    out = []
    for k in range(0, len(titles), 50):
        url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "prop": "pageprops", "ppprop": "wikibase_item", "redirects": "1",
            "titles": "|".join(titles[k:k + 50]), "format": "json", "formatversion": "2"})
        out.append(json.loads(http_get(url)))
        time.sleep(1)
    data = json.dumps(out, ensure_ascii=False, indent=1).encode("utf-8")
    save(man, "en.wikipedia.org/w/api.php prop=pageprops (batched; see script)", path, data)
    print(f"  wikipedia: qids for {len(titles)} linked articles")


def fetch_punjab_gallery(man, refresh):
    """Punjab Directorate General of Archaeology, 'Protection of Monuments/Museums' gallery.
    The live site is down ('Website Under Maintenance', 30 Oct 2026); the Wayback Machine holds
    every page of the gallery from 8-22 June 2021."""
    d = RAW / "punjab_doa_2021"
    cdx = d / "cdx.json"
    if refresh or not cdx.exists():
        save(man, PB_CDX, cdx, http_get(PB_CDX, timeout=180))
    rows = json.loads(cdx.read_text(encoding="utf-8"))[1:]
    latest = {}
    for orig, ts, _ in rows:
        m = re.search(r"[?&]page=(\d+)$", orig)
        pg = int(m.group(1)) if m else (0 if orig.rstrip("/").endswith("museum") else None)
        if pg is None:
            continue
        if pg not in latest or ts > latest[pg][1]:
            latest[pg] = (orig, ts)
    for pg, (orig, ts) in sorted(latest.items()):
        path = d / f"page_{pg:02d}.html"
        if path.exists() and not refresh:
            continue
        url = f"https://web.archive.org/web/{ts}id_/{orig}"
        save(man, url, path, http_get(url, ua=BROWSER_UA, timeout=120))
        time.sleep(1)
    print(f"  punjab gallery: {len(latest)} archived pages")
    # each item's page says which law protects it ("Protected Under: Antiquities Act, 1975")
    ncdx = d / "node_cdx.json"
    if refresh or not ncdx.exists():
        u = ("https://web.archive.org/cdx/search/cdx?url=archaeology.punjab.gov.pk/node/"
             "&matchType=prefix&fl=original,timestamp&filter=statuscode:200&collapse=urlkey"
             "&limit=5000&output=json")
        save(man, u, ncdx, http_get(u, timeout=300))
    snaps = {}
    for orig, ts in json.loads(ncdx.read_text(encoding="utf-8"))[1:]:
        m = re.search(r"/node/(\d+)/?$", orig)
        if m:
            snaps.setdefault(int(m.group(1)), (orig, ts))
    want = set()
    for f in sorted(d.glob("page_*.html")):
        want |= {int(n[5:]) for n, _ in gallery_items(f.read_text(encoding="utf-8", errors="replace"))
                 if re.fullmatch(r"node/\d+", n)}
    got = 0
    for n in sorted(want):
        path = d / "node" / f"{n}.html"
        if n not in snaps or (path.exists() and not refresh):
            continue
        orig, ts = snaps[n]
        url = f"https://web.archive.org/web/{ts}id_/{orig}"
        try:
            save(man, url, path, http_get(url, ua=BROWSER_UA, timeout=120))
            got += 1
        except Exception as e:  # noqa: BLE001 - an unarchivable page is recorded, not fatal
            print(f"  punjab node {n}: {e}", file=sys.stderr)
        time.sleep(0.5)
    print(f"  punjab gallery: {len(want)} items, {len([n for n in want if n in snaps])} with an "
          f"archived item page, {got} fetched now")


def gallery_items(t):
    """[(item path, name)] from one gallery page: 'node/570', or a slug such as 'jahangir-tomb'."""
    return [(a, html.unescape(re.sub(r"\s+", " ", b)).strip()) for a, b in re.findall(
        r'<div class="galleryp-title"><a href="(?:https?://[^"/]*)?/([^"]+)">(.*?)</a>', t, flags=re.S)]


def do_fetch(refresh, workers):
    RAW.mkdir(parents=True, exist_ok=True)
    man = Manifest(RAW / "fetch_manifest.csv")
    try:
        fetch_wikipedia(man, refresh)
        fetch_wiki_qids(man, refresh)
        fetch_epa(man, refresh)
        fetch_punjab_gallery(man, refresh)
        man.save()
        fetch_doam(man, refresh, workers)
    finally:
        man.save()


# ---------------------------------------------------------------------------------- kind

# Each pattern is matched case-insensitively; the matched text goes into kind_basis.
KIND_PATTERNS = [
    ("gurdwara", r"gurdw?ara|gurudwara|gurdawara"),
    ("samadhi", r"samadh[ia]?|samadhi|smadh"),
    ("temple", r"temples?|teples?|mandirs?|mandar|shiv[ae]la|shiwala|fire temple"),
    ("church", r"church(?:es)?|curch|chueh|chapel|cathedral"),
    ("graveyard", r"graveyards?|graveryard|cemetery|qabristan|necropolis|chaukhandi|chowkhundi|"
                  r"graves"),
    ("tomb_shrine", r"tombs?|tobm|mausoleum|maqbara|maqbra|mazaa?r|darbar|dargah|"
                    r"shrines?|shinr|shirne|shrineoff|khanqah|khanqa|astana|aastana?|asthan|"
                    r"ziarat (?:of|hazrat|sharif|baba|pir)|qubb?o|quba|chill?ah?[- ]?gah|"
                    r"jo[- ]than|rauza|cenotaph|gumbad|gumbat|gunbad|grave|"
                    r"ziy?aa?rat (?:of|hazrat|sharif|baba|pir)"),
    ("mosque", r"mosques?|moque|masjid|masajid|masji|musjid|mowque|jamia?e? masjid|jami masjid"),
    ("other_religious", r"stupas?|tope|monaster(?:y|ies)|vihara|buddhist|imam ?barg[ae]h|"
                        r"imambara|idgah|eidgah|janaza ?gah|janazegah|dar-?e-? ?meher|dare meher|"
                        r"agiary|synagogue|dh?a?ram ?sh?all?a|dhramshalla|hindu ghat"),
]
KIND_RE = [(k, re.compile(r"(?<![a-z])(" + p + r")(?![a-z])", re.I)) for k, p in KIND_PATTERNS]
# A keyword preceded by one of these (within three words) names a neighbour, not the item:
# "Mosque near the tomb of ...", "Baradari attached to the Shrine of ...".
LOCATOR_RE = re.compile(r"\b(near|at|beside|behind|opposite|adjacent|attached|inside|over|from|"
                        r"to|by|in|compound|around|outside|north\S*|south\S*|east|west)\b"
                        r"(?:\s+\S+){0,3}\s*$", re.I)
# WLM `type` and DOAM inventory `Type:` values, used only when the name matches nothing.
TYPE_KIND = [
    ("gurdwara", r"gurdwara"), ("samadhi", r"samadhi"), ("temple", r"temple|mandir"),
    ("church", r"church"), ("graveyard", r"graveyard|cemetery|necropolis"),
    ("tomb_shrine", r"tomb|shrine|mausoleum|maqbara|darbar|mazar"),
    ("mosque", r"mosque|masjid"),
    ("other_religious", r"stupa|monastery|buddhist|religious|imambargah|imambara")]


def classify(name, type_hint=""):
    """(kind, kind_basis, also) from the name as written; type field only as a fallback."""
    hits = []
    for kind, rx in KIND_RE:
        for m in rx.finditer(name):
            before = name[:m.start()]
            # "Tomb of X near the shrine of Y": a keyword after a locator is a neighbour,
            # unless it is the very first keyword in the name.
            hits.append((m.start(), kind, m.group(1), bool(LOCATOR_RE.search(before))))
    hits.sort()
    head = [h for h in hits if not h[3]]
    if hits and not head:
        # every keyword names a neighbour: "Gate on North-East of Wazir Khan's Mosque"
        return "not_religious", "locator-only:" + hits[0][2], sorted({h[1] for h in hits})
    if head:
        _, kind, word, _ = head[0]
        also = sorted({h[1] for h in hits if h[1] != kind})
        return kind, f"name:{word}", also
    t = (type_hint or "").strip()
    if t:
        for kind, p in TYPE_KIND:
            m = re.search(p, t, re.I)
            if m:
                return kind, f"type:{t}", []
    return "not_religious", "", []


# ---------------------------------------------------------------------------------- districts

PROVINCES = {  # every spelling a source uses -> pk_dictionary province_name
    "punjab": "Punjab", "pk-pb": "Punjab", "sindh": "Sindh", "pk-sd": "Sindh",
    "khyber pakhtunkhwa": "Khyber Pakhtunkhwa", "pk-kp": "Khyber Pakhtunkhwa",
    "pk-fa": "Khyber Pakhtunkhwa", "balochistan": "Balochistan", "pk-ba": "Balochistan",
    "islamabad": "Islamabad", "pk-is": "Islamabad", "azad jammu and kashmir": "Azad Kashmir",
    "azad kashmir": "Azad Kashmir", "pk-jk": "Azad Kashmir", "gilgit baltistan": "Gilgit Baltistan",
    "gilgit-baltistan": "Gilgit Baltistan", "pk-gb": "Gilgit Baltistan",
}

# Spellings and former names that denote exactly one present-day district (no split involved).
DISTRICT_ALIASES = {
    "Punjab": {"fasialabad": "Faisalabad", "rawalpini": "Rawalpindi", "sheikupura": "Sheikhupura",
               "rajanjpur": "Rajanpur", "rajanpure": "Rajanpur", "rahimyar khan": "Rahim Yar Khan",
               "rahim yar khan": "Rahim Yar Khan", "leyah": "Leiah", "layyah": "Leiah",
               "leiyah": "Leiah", "d g khan": "Dera Ghazi Khan", "dg khan": "Dera Ghazi Khan",
               "sargoha": "Sargodha", "mandi bahauddin": "Mandi Bahauddin",
               "mandi bahaudin": "Mandi Bahauddin", "nankana": "Nankana Sahib",
               "toba tek singh": "Toba Tek Singh", "t t singh": "Toba Tek Singh",
               "pak pattan": "Pakpattan", "musaffargarh": "Muzaffargarh"},
    "Sindh": {"nawabshah": "Shaheed Benazir Abad", "shaheed benazirabad": "Shaheed Benazir Abad",
              "benazirabad": "Shaheed Benazir Abad", "kyderabad": "Hyderabad",
              "umerkot": "Umer Kot", "umarkot": "Umer Kot", "mirpurkhas": "Mirpur Khas",
              "naushahro feroze": "Naushahro Feroze", "naushero feroz": "Naushahro Feroze",
              "kamber shahdadkot": "Kambar Shahdad Kot", "qambar shahdadkot": "Kambar Shahdad Kot",
              "kambar shahdadkot": "Kambar Shahdad Kot", "tando allahyar": "Tando Allahyar"},
    "Khyber Pakhtunkhwa": {"d i khan": "D. I. Khan", "di khan": "D. I. Khan",
                           "dera ismail khan": "D. I. Khan", "nowshara": "Nowshera",
                           "mansera": "Mansehra", "batagram": "Batagram", "battagram": "Batagram",
                           "lower dir": "Lower Dir", "upper dir": "Upper Dir",
                           "khyber agency": "Khyber", "north waziristan agency": "North Waziristan",
                           "south waziristan agency": "South Waziristan",
                           "mohmand agency": "Mohmand", "bajaur agency": "Bajaur",
                           "kurram agency": "Kurram", "orakzai agency": "Orakzai",
                           "marden": "Mardan", "sawabi": "Swabi"},
    "Balochistan": {"lasbella": "Lasbela", "las bela": "Lasbela", "killa abdullah": "Killa Abdullah",
                    "qila abdullah": "Killa Abdullah", "killa saifullah": "Killa Saifullah",
                    "qila saifullah": "Killa Saifullah", "bolan": "Kachhi", "turbat": "Kech"},
    "Gilgit Baltistan": {"diamer": "Diamir", "diamier": "Diamir", "ghangche": "Ghanche",
                         "baltistan": None},
    "Azad Kashmir": {"sudhanoti": "Sudhnoti", "sudhnati": "Sudhnoti",
                     "hattian bala": "Jhelum Valley", "hattian": "Jhelum Valley"},
    "Islamabad": {"islamabad capital territory": "Islamabad", "ict": "Islamabad",
                  "islamabad city": "Islamabad"},
}

# Districts that have been divided since these lists' notifications (the 1975-1996 federal and
# provincial notifications, which the Wikipedia lists copy). A list that names the parent cannot
# by itself say which present-day district an item is in, so the code is given only when the
# item's own text names a tehsil of exactly one of the successors. The parent -> successor table
# is administrative history, used only to WITHHOLD a code; see README_heritage.md.
SPLITS = {
    ("Sindh", "Karachi"): ["Central Karachi", "East Karachi", "Korangi Karachi", "Malir Karachi",
                           "South Karachi", "West Karachi"],
    ("Sindh", "Hyderabad"): ["Hyderabad", "Matiari", "Tando Allahyar", "Tando Muhammad Khan"],
    ("Sindh", "Dadu"): ["Dadu", "Jamshoro"],
    ("Sindh", "Larkana"): ["Larkana", "Kambar Shahdad Kot"],
    ("Sindh", "Jacobabad"): ["Jacobabad", "Kashmore"],
    ("Sindh", "Thatta"): ["Thatta", "Sujawal"],
    ("Sindh", "Tharparkar"): ["Tharparkar", "Umer Kot", "Mirpur Khas"],
    ("Sindh", "Sukkur"): ["Sukkur", "Ghotki"],
    ("Sindh", "Shaheed Benazir Abad"): ["Shaheed Benazir Abad", "Naushahro Feroze"],
    ("Punjab", "Multan"): ["Multan", "Lodhran", "Khanewal"],
    ("Punjab", "Jhang"): ["Jhang", "Chiniot"],
    ("Punjab", "Sheikhupura"): ["Sheikhupura", "Nankana Sahib"],
    ("Punjab", "Gujrat"): ["Gujrat", "Mandi Bahauddin"],
    ("Punjab", "Jhelum"): ["Jhelum", "Chakwal"],
    ("Punjab", "Sahiwal"): ["Sahiwal", "Okara", "Pakpattan"],
    ("Punjab", "Sargodha"): ["Sargodha", "Khushab"],
    ("Punjab", "Muzaffargarh"): ["Muzaffargarh", "Leiah"],
    ("Punjab", "Dera Ghazi Khan"): ["Dera Ghazi Khan", "Rajanpur"],
    ("Punjab", "Gujranwala"): ["Gujranwala", "Hafizabad"],
    ("Punjab", "Sialkot"): ["Sialkot", "Narowal"],
    ("Punjab", "Faisalabad"): ["Faisalabad", "Toba Tek Singh"],
    ("Punjab", "Lahore"): ["Lahore", "Kasur"],
    ("Khyber Pakhtunkhwa", "Abbottabad"): ["Abbottabad", "Haripur"],
    ("Khyber Pakhtunkhwa", "Mansehra"): ["Mansehra", "Batagram", "Tor Ghar"],
    ("Khyber Pakhtunkhwa", "Peshawar"): ["Peshawar", "Charsadda", "Nowshera"],
    ("Khyber Pakhtunkhwa", "Mardan"): ["Mardan", "Swabi"],
    ("Khyber Pakhtunkhwa", "Swat"): ["Swat", "Shangla"],
    ("Khyber Pakhtunkhwa", "Kohat"): ["Kohat", "Karak", "Hangu"],
    ("Khyber Pakhtunkhwa", "Bannu"): ["Bannu", "Lakki Marwat"],
    ("Khyber Pakhtunkhwa", "D. I. Khan"): ["D. I. Khan", "Tank"],
    ("Khyber Pakhtunkhwa", "Chitral"): ["Chitral Lower", "Chitral Upper"],
    ("Khyber Pakhtunkhwa", "Dir"): ["Lower Dir", "Upper Dir"],
    ("Khyber Pakhtunkhwa", "Kohistan"): ["Kohistan Lower", "Kohistan Upper", "Kolai Palas Kohistan"],
    ("Balochistan", "Sibi"): ["Sibi", "Ziarat", "Harnai", "Kohlu", "Dera Bugti", "Lehri"],
    ("Balochistan", "Kachhi"): ["Kachhi", "Jhal Magsi", "Lehri"],
    ("Balochistan", "Loralai"): ["Loralai", "Barkhan", "Musakhel", "Duki"],
    ("Balochistan", "Kalat"): ["Kalat", "Mastung", "Shaheed Sikandarabad"],
    ("Balochistan", "Kharan"): ["Kharan", "Washuk"],
    ("Balochistan", "Nasirabad"): ["Nasirabad", "Jaffarabad", "Sohbatpur"],
    ("Balochistan", "Killa Abdullah"): ["Killa Abdullah", "Chaman"],
    ("Balochistan", "Lasbela"): ["Lasbela"],  # Hub (2022) is not in pk_dictionary
    ("Balochistan", "Quetta"): ["Quetta"],
    ("Gilgit Baltistan", "Diamir"): ["Diamir", "Darel", "Tangir"],
    ("Gilgit Baltistan", "Gilgit"): ["Gilgit", "Hunza", "Nagar"],
    ("Gilgit Baltistan", "Skardu"): ["Skardu", "Shigar", "Kharmang", "Rondu"],
    ("Gilgit Baltistan", "Ghizer"): ["Ghizer", "Gupis-Yasin"],
    ("Gilgit Baltistan", "Hunza-Nagar"): ["Hunza", "Nagar"],
}
TEHSIL_STOP = {"bagh", "bela", "bara", "mach", "nag", "hub", "dina", "topi", "drug", "naal",
               "mola", "seo", "tall", "khar", "lora", "safi", "wari", "city"}


def norm(s):
    s = s.lower().replace("&", " and ")
    s = re.sub(r"\b(district|distt|dist|tehsil|division)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


class Districts:
    def __init__(self, path):
        self.code = {}       # (province, district_name) -> code
        self.by_norm = {}    # (province, norm) -> district_name
        self.tehsils = {}    # (province, district_name) -> [tehsil names]
        with path.open(encoding="utf-8", newline="") as f:
            for r in csv.DictReader(f):
                p, d = r["province_name"], r["district_name"]
                if r["level"] == "district":
                    self.code[(p, d)] = r["district_code"]
                    self.by_norm[(p, norm(d))] = d
                elif r["level"] == "tehsil":
                    self.tehsils.setdefault((p, d), []).append(r["tehsil_name"])
        for p, al in DISTRICT_ALIASES.items():
            for k, v in al.items():
                if v is not None:
                    assert (p, v) in self.code, (p, v)
                self.by_norm[(p, norm(k))] = v
        for (p, parent), kids in SPLITS.items():
            for k in kids:
                assert (p, k) in self.code, (p, k)

    def name_of(self, province, written):
        """Present-day district name for a spelling, or None."""
        return self.by_norm.get((province, norm(written)))

    def parent_of(self, province, written):
        """Present-day district (or SPLITS parent) a written district name denotes, or None."""
        if not province or not written:
            return None
        key = norm(re.sub(r"\(.*?\)", " ", written))
        if key in ("karachi", "karachi city") and province == "Sindh":
            return "Karachi"
        d = self.name_of(province, key)
        if d:
            return d
        for (p, par) in SPLITS:
            if p == province and norm(par) == key:
                return par
        return None

    def resolve(self, province, written, text, seen=frozenset()):
        """(district_code, note). `text` is the item's own wording (name, address); `seen` is
        the set of districts the same source writes elsewhere for this province."""
        if not province or not written:
            return "", "no district in source"
        m = re.search(r"now\s+(?:in\s+)?([A-Za-z .'-]+?)(?:\s+district)?\)?\s*$", written, re.I)
        if m and self.name_of(province, m.group(1)):
            d = self.name_of(province, m.group(1))
            return self.code[(province, d)], f"district_code from 'now {m.group(1).strip()}' in source"
        key = norm(re.sub(r"\(.*?\)", " ", written))
        parent = self.parent_of(province, written)
        if parent is None:
            if (province, key) in self.by_norm:  # alias mapped to None (a region, not a district)
                return "", f"'{written}' is a region, not a district"
            owners = {d for (p, d), ts in self.tehsils.items() if p == province
                      for t in ts if norm(t).replace(" ", "") == key.replace(" ", "")}
            if len(owners) == 1:
                d = owners.pop()
                return self.code[(province, d)], (f"'{written}' is a tehsil name, "
                                                   f"of {d} in pk_dictionary")
            return "", f"district '{written}' not matched to pk_dictionary"
        kids = SPLITS.get((province, parent))
        if not kids or kids == [parent]:
            return self.code[(province, parent)], ""
        # Divided since the notification the list copies. 1) A successor's tehsil named in the
        # item's own text decides it (the parent's name is ignored: the federal lists end every
        # item with it). 2) Otherwise, successors that this same source writes as districts of
        # their own are set aside; if only the parent is left, it is the parent.
        t = " " + norm(text) + " "
        t = t.replace(" " + norm(parent) + " ", " ")
        found = {}
        for k in kids:
            for teh in self.tehsils.get((province, k), []) + [k]:
                n0 = norm(teh)
                for n in {n0, re.sub(r" (sharif|city|saddar|cantt|town)$", "", n0)}:
                    if len(n) < 4 or n in TEHSIL_STOP or n == norm(parent):
                        continue
                    if f" {n} " in t:
                        found.setdefault(k, set()).add(teh)
        divided = f"'{written}' since divided ({', '.join(kids)})"
        if len(found) == 1:
            k, teh = next(iter(found.items()))
            return self.code[(province, k)], f"{divided}; code from '{sorted(teh)[0]}' named in the item"
        if found:
            return "", f"{divided}: ambiguous; text names " + "/".join(sorted(found))
        left = [k for k in kids if k == parent or k not in seen]
        if left == [parent] and (province, parent) in self.code:
            others = [k for k in kids if k != parent]
            return self.code[(province, parent)], (
                f"{divided}; code by elimination: this source lists {', '.join(others)} "
                f"as separate districts")
        return "", f"{divided}: ambiguous"


# ---------------------------------------------------------------------------------- wikipedia

def load_wiki_page(title):
    path = RAW / "wikipedia" / (wiki_slug(title) + ".json")
    if not path.exists():
        raise SystemExit(f"missing raw file {path}; run `fetch`")
    d = json.loads(path.read_text(encoding="utf-8"))
    pg = d["query"]["pages"][0]
    rev = pg["revisions"][0]
    return {"title": pg["title"], "revid": rev["revid"], "timestamp": rev["timestamp"],
            "content": rev["slots"]["main"]["content"], "path": path}


def match_braces(s, i):
    """Index just past the }} closing the {{ at s[i]."""
    depth = 0
    j = i
    while j < len(s) - 1:
        two = s[j:j + 2]
        if two == "{{":
            depth += 1
            j += 2
            continue
        if two == "}}":
            depth -= 1
            j += 2
            if depth == 0:
                return j
            continue
        j += 1
    return -1


def split_params(body):
    parts, depth_b, depth_l, cur, j = [], 0, 0, [], 0
    while j < len(body):
        two = body[j:j + 2]
        if two == "{{":
            depth_b += 1; cur.append(two); j += 2; continue
        if two == "}}":
            depth_b -= 1; cur.append(two); j += 2; continue
        if two == "[[":
            depth_l += 1; cur.append(two); j += 2; continue
        if two == "]]":
            depth_l -= 1; cur.append(two); j += 2; continue
        c = body[j]
        if c == "|" and depth_b == 0 and depth_l == 0:
            parts.append("".join(cur)); cur = []
        else:
            cur.append(c)
        j += 1
    parts.append("".join(cur))
    return parts


ROW_START = re.compile(r"\{\{\s*PKmonument[ _]row\s*(?=\|)", re.I)


def strip_refs(s):
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<ref[^>/]*/>", "", s, flags=re.I)
    return re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.I | re.S)


def wiki_rows(text):
    """[(offset, params, raw)] for every {{PKmonument row}} in the page."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    rows = []
    for m in ROW_START.finditer(text):
        end = match_braces(text, m.start())
        if end < 0:
            err(f"unclosed PKmonument row at offset {m.start()}")
            continue
        raw = text[m.start():end]
        parts = split_params(strip_refs(raw[2:-2]))
        params = {}
        for p in parts[1:]:
            if "=" in p:
                k, v = p.split("=", 1)
                params[k.strip().lower()] = v.strip()
        rows.append((m.start(), params, raw))
    return rows


def first_link_target(s):
    m = re.search(r"\[\[([^\]|#]+)", strip_refs(s))
    if not m or re.match(r"(?i)(file|image|category):", m.group(1)):
        return ""
    t = m.group(1).strip()
    return t[0].upper() + t[1:] if t else ""


def wikiclean(s):
    s = strip_refs(s)
    for _ in range(5):
        s = re.sub(r"\{\{\s*convert\s*\|([^|{}]*)\|([^|{}]*)[^{}]*\}\}", r"\1 \2", s, flags=re.I)
        s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:File|Image):[^\]]*\]\]", "", s, flags=re.I)
    s = re.sub(r"\[\[[^\]|]*\|([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[https?://\S+\s+([^\]]*)\]", r"\1", s)
    s = re.sub(r"<br\s*/?>", "; ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("'''", "").replace("''", "")
    s = html.unescape(s).replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip(" ,;")


def wlm_list(oid):
    if re.match(r"^[A-Z]+-U-|^L-U-", oid):
        return "wlm_unprotected"
    if oid.startswith("PB-P-"):
        return "wlm_punjab_special_premises"
    if oid.startswith("SD-P-"):
        return "wlm_sindh_protected_heritage"
    if re.match(r"^(PB|SD|BA)-\d", oid):
        return "wlm_federal"
    if oid.startswith("KPK-"):
        return "wlm_kp"
    if oid.startswith("FATA-"):
        return "wlm_kp_ex_fata"
    if oid.startswith("ICT-"):
        return "wlm_islamabad"
    if oid.startswith("AJK-"):
        return "wlm_azad_kashmir"
    if oid.startswith("GB-"):
        return "wlm_gilgit_baltistan"
    return "wlm_other"


def parse_wikipedia(man, dists, qids):
    out, seen = [], {}
    aware = {}  # province -> districts this source writes
    for title in WIKI_PAGES:
        text = re.sub(r"<!--.*?-->", "", load_wiki_page(title)["content"], flags=re.S)
        hdrs = [(m.start(), m.group(1).strip()) for m in
                re.finditer(r"\{\{\s*PKmonument header\s*\|\s*prov_iso\s*=\s*([A-Z-]+)", text)]
        for off, p, _ in wiki_rows(text):
            iso = [h for o, h in hdrs if o < off]
            prov = PROVINCES.get((iso[-1] if iso else "").lower(), "")
            d = dists.parent_of(prov, wikiclean(p.get("district", "")))
            if d:
                aware.setdefault(prov, set()).add(d)
    for title in WIKI_PAGES:
        page = load_wiki_page(title)
        text = re.sub(r"<!--.*?-->", "", page["content"], flags=re.S)
        n_tpl = len(ROW_START.findall(text))
        rows = wiki_rows(page["content"])
        n_num = len(re.findall(r"^\s*\|\s*number\s*=", text, flags=re.M))
        if not (n_tpl == len(rows) == n_num):
            err(f"{title}: {n_tpl} row templates, {len(rows)} parsed, {n_num} number= params")
        heads = [(m.start(), m.group(2).strip())
                 for m in re.finditer(r"^(={2,4})\s*(.*?)\s*\1\s*$", text, flags=re.M)]
        hdrs = [(m.start(), m.group(1).strip()) for m in
                re.finditer(r"\{\{\s*PKmonument header\s*\|\s*prov_iso\s*=\s*([A-Z-]+)", text)]
        url = ("https://en.wikipedia.org/w/index.php?title="
               + urllib.parse.quote(page["title"].replace(" ", "_")) + f"&oldid={page['revid']}")
        fetched = man.fetched_on(page["path"])
        for k, (off, p, raw) in enumerate(rows, 1):
            # offsets in wiki_rows are on comment-stripped text, as are heads/hdrs
            oid = wikiclean(p.get("number", "")).replace(" ", "")
            if not oid:
                err(f"{title}: row {k} has no number")
            sec = [h for o, h in heads if o < off]
            iso = [h for o, h in hdrs if o < off]
            province = PROVINCES.get((iso[-1] if iso else "").lower(), "")
            if not province:
                err(f"{title}: row {k} ({oid}) has no PKmonument header before it")
            name = wikiclean(p.get("description", ""))
            addr = wikiclean(p.get("address", "") or p.get("adress", ""))
            dist = wikiclean(p.get("district", ""))
            typ = wikiclean(p.get("type", ""))
            if not name:
                err(f"{title}: row {k} ({oid}) has no description")
            kind, basis, also = classify(name, typ)
            sec_txt = sec[-1] if (sec and "Karachi" in title) else ""  # Karachi's quarters
            code, dnote = dists.resolve(province, dist, " , ".join((name, addr, sec_txt)),
                                        aware.get(province, set()))
            lat, lon = wikiclean(p.get("lat", "")), wikiclean(p.get("lon", ""))
            notes = []
            if not all(re.fullmatch(r"-?\d+(\.\d+)?", v) for v in (lat, lon) if v):
                notes.append(f"source coordinate fields read lat={lat!r} lon={lon!r}; not used")
                lat = lon = ""
            if addr:
                notes.append(f"address: {addr}")
            if typ:
                notes.append(f"type: {typ}")
            if also:
                notes.append("also matches: " + ", ".join(also))
            if dnote:
                notes.append(dnote)
            if "makli" in (name + addr).lower() and kind != "graveyard":
                notes.append("within the Makli necropolis")
            # Only when the whole description is one link: "Tomb of [[Yar Muhammad Khan Kalhora]]"
            # links the man, not the tomb, and his QID would be wrong here.
            desc = strip_refs(p.get("description", "")).strip()
            qid = ""
            if re.fullmatch(r"'*\[\[[^\[\]]+\]\]'*", desc):
                qid = qids.get(first_link_target(desc), "")
            row = {"list": wlm_list(oid), "official_id": oid, "province": province,
                   "district_as_written": dist, "district_code": code, "name": name,
                   "name_ur": "", "kind": kind, "kind_basis": basis, "lat": lat, "lon": lon,
                   "wikidata": qid, "source_url": url,
                   "source_locator": f"section '{sec[-1] if sec else '(lead)'}'; "
                                     f"PKmonument row {k} of {len(rows)}; number={oid}",
                   "fetched_on": fetched, "note": "; ".join(notes)}
            key = (oid, norm(name))
            if key in seen:  # the same row on a province page and a city page
                continue
            others = [r for (o, _), r in seen.items() if o == oid]
            for o in others:  # the lists reuse ids: PB-40 is one site on one page, another elsewhere
                o["note"] = "; ".join(x for x in (o["note"], f"id {oid} is also used for "
                                                  f"'{name}' on '{page['title']}'") if x)
                row["note"] = "; ".join(x for x in (row["note"], f"id {oid} is also used for "
                                                    f"'{o['name']}' on another list page") if x)
            seen[key] = row
            out.append(row)
    return out


def load_qids():
    path = RAW / "wikipedia" / "linked_article_qids.json"
    if not path.exists():
        raise SystemExit(f"missing raw file {path}; run `fetch`")
    q = {}
    for d in json.loads(path.read_text(encoding="utf-8")):
        qq = d.get("query", {})
        redir = {}
        for r in qq.get("normalized", []) + qq.get("redirects", []):
            redir[r["from"]] = r["to"]
        found = {pg["title"]: pg.get("pageprops", {}).get("wikibase_item", "")
                 for pg in qq.get("pages", [])}
        for t, v in found.items():
            q[t] = v
        for f, t in redir.items():
            tt = redir.get(t, t)
            q[f] = found.get(tt, q.get(tt, ""))
    return q


# ---------------------------------------------------------------------------------- EPA 1997

EPA_SECTIONS = {
    "I": ("epa1997_federal", "Sindh", "Archaeological sites and monuments in Sindh protected by "
          "the Federal Government (Antiquities Act 1975)"),
    "II": ("epa1997_sindh_protected_heritage", "Sindh", "Buildings declared 'Protected Heritage' "
           "by the Government of Sindh (Sindh Cultural Heritage (Preservation) Act 1994, 7 Sept 1995)"),
    "III": ("epa1997_federal", "Punjab", "Archaeological sites and monuments in Punjab protected "
            "by the Federal Government"),
    "IV": ("epa1997_punjab_special_premises", "Punjab", "Monuments declared 'Special Premises' by "
           "the Government of Punjab (Punjab Special Premises (Preservation) Ordinance 1985)"),
    "V": ("epa1997_federal", "Balochistan", "Archaeological sites and monuments in Balochistan "
          "protected by the Federal Government"),
    "VI": ("epa1997_federal", "Khyber Pakhtunkhwa", "Archaeological sites and monuments in the "
           "N.W. Frontier Province and Northern Areas protected by the Federal Government"),
}
FOOTER_RE = re.compile(r"^\s*Guidelines for Sensitive\s+(\d+)\s+October 1997\s*$")
STOP_RE = re.compile(r"NATIONAL MONUMENT|WORLD HER|^\s*TABLE\b|^\s*Distri\w*\s{2,}|NUMBER OF PROTECT")


def parse_epa(man, dists):
    txt = RAW / "epa1997" / "f_Crit_Areas.layout.txt"
    pdf = RAW / "epa1997" / "f_Crit_Areas.pdf"
    if not txt.exists():
        raise SystemExit(f"missing {txt}; run `fetch`")
    lines = txt.read_text(encoding="utf-8").splitlines()
    fetched = man.fetched_on(pdf)
    start = next((i for i, l in enumerate(lines) if "ARCHAEOLOGICAL SITES AND MONUMENTS" in l
                  and i > 1000), None)
    if start is None:
        err("EPA: appendix start not found")
        return []
    items, sec, dist, state, pending = [], None, None, "skip", []
    for i in range(start - 6, len(lines)):
        line = lines[i]
        s = line.strip()
        if re.fullmatch(r"(I|II|III|IV|V|VI)", s):
            sec, dist, state = s, None, "head"
            continue
        if sec is None:
            continue
        m = FOOTER_RE.match(line)
        if m:
            for it in pending:
                it["page"] = int(m.group(1))
            pending = []
            continue
        if s in ("", "and Critical Areas") or s.startswith("List Of Notified Protected Ecosystems"):
            continue
        if "Contacts for Archaeological" in s or s.startswith("Appendix III"):
            break
        if STOP_RE.search(line):
            state = "skip"
            continue
        if state == "skip":
            continue
        md = re.match(r"^([A-Z][A-Za-z ]*?)\s+\S*trict\.?\s*$", line)
        if md and not line.startswith(" "):
            dist, state = md.group(1).strip(), "list"
            continue
        mi = re.match(r"^(\d+)\s*\.?\s*(\S.*)$", line)
        if mi and state in ("list", "head") and not line.startswith(" "):
            if dist is None:
                err(f"EPA §{sec} line {i + 1}: item before any district heading")
            it = {"sec": sec, "serial": int(mi.group(1)), "text": mi.group(2).strip(),
                  "district": dist, "line": i + 1, "page": None}
            items.append(it)
            pending.append(it)
            continue
        if line.startswith("     ") and items and items[-1]["sec"] == sec and state == "list":
            items[-1]["text"] += " " + s
            continue
        if state == "head":  # title lines of a section
            continue
        err(f"EPA §{sec} line {i + 1}: unrecognised line {s!r}")
    # serial order check: strictly increasing within a section (gaps are the source's own)
    gaps = {}
    for key in EPA_SECTIONS:
        ser = [it["serial"] for it in items if it["sec"] == key]
        if not ser:
            err(f"EPA §{key}: no items parsed")
            continue
        if ser[0] != 1:
            err(f"EPA §{key}: first serial {ser[0]}")
        for a, b in zip(ser, ser[1:]):
            if b <= a:
                err(f"EPA §{key}: serial {b} follows {a}")
            elif b != a + 1:
                gaps.setdefault(key, []).extend(range(a + 1, b))
    aware = {}
    for it in items:
        prov = EPA_SECTIONS[it["sec"]][1]
        d = dists.parent_of(prov, it["district"])
        if d:
            aware.setdefault(prov, set()).add(d)
    out = []
    for it in items:
        lst, prov, title = EPA_SECTIONS[it["sec"]]
        text = re.sub(r"\s+", " ", it["text"]).strip()
        province = prov
        if it["district"].lower().startswith("gilgit"):
            province = "Gilgit Baltistan"
        kind, basis, also = classify(text)
        written = it["district"]
        notes = []
        if also:
            notes.append("also matches: " + ", ".join(also))
        # Items end ", <District>." The heading can disagree: the PDF has no 'Swat District'
        # heading, so Swat's items sit under Peshawar; a Balochistan item sits under 'Karachi'.
        tail = re.sub(r"[.,\s]+$", "", text).rsplit(",", 1)[-1].strip()
        hp, tp = dists.parent_of(province, written), dists.parent_of(province, tail)
        if tp and tp != hp and "," in text:
            notes.append(f"heading reads '{written} District' but the item ends '{tail}'; "
                         f"district resolved from the item")
            written_for_code = tail
        else:
            written_for_code = written
        code, dnote = dists.resolve(province, written_for_code, text, aware.get(province, set()))
        if dnote:
            notes.append(dnote)
        if "makli" in text.lower() and kind != "graveyard":
            notes.append("within the Makli necropolis")
        g = gaps.get(it["sec"])
        if g and it is next(x for x in items if x["sec"] == it["sec"]):
            notes.append(f"section has no serial(s) {g} in the source")
        out.append({"list": lst, "official_id": str(it["serial"]), "province": province,
                    "district_as_written": it["district"], "district_code": code,
                    "name": text, "name_ur": "", "kind": kind, "kind_basis": basis, "lat": "",
                    "lon": "", "wikidata": "", "source_url": EPA_URL,
                    "source_locator": f"Appendix II §{it['sec']} ({title}); "
                                      f"'{it['district']} District'; serial {it['serial']}; "
                                      f"printed page {it['page']}; layout.txt line {it['line']}",
                    "fetched_on": fetched, "note": "; ".join(notes)})
    return out, gaps


# ---------------------------------------------------------------------------------- DOAM

def page_lines(path):
    t = path.read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S | re.I)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", t))
    return [re.sub(r"\s+", " ", l).strip() for l in t.split("\n") if l.strip()]


INV_LABELS = ["Type", "Province", "District", "Period", "Relative Chronology", "Description",
              "Latitude", "Longitude", "Ownership", "Legal Status", "Title of Publication",
              "Published In", "Year of Publication", "Bibliography/Reference"]


def parse_inventory_page(path):
    L = page_lines(path)
    try:
        i = L.index("Type:")
    except ValueError:
        return None
    rec = {"name": L[i - 1]}
    labels = {l + ":" for l in INV_LABELS}
    j = i
    while j < len(L) and L[j] != "Social Media Links":
        if L[j] in labels:
            lab = L[j][:-1]
            vals = []
            j += 1
            while j < len(L) and L[j] not in labels and L[j] != "Social Media Links":
                vals.append(L[j])
                j += 1
            rec[lab] = " ".join(vals).strip()
            continue
        j += 1
    return rec


def coord(v):
    v = (v or "").strip()
    try:
        f = float(v)
    except ValueError:
        return ""
    if f == 0:
        return ""
    return f"{f:.6f}".rstrip("0").rstrip(".")


def parse_doam(man, dists):
    idx = RAW / "doam" / "heritage-sites.html"
    if not idx.exists():
        raise SystemExit(f"missing {idx}; run `fetch`")
    prot, inv = doam_index_ids(idx.read_text(encoding="utf-8", errors="replace"))
    for prov, items, n_li in prot + inv:
        if len(items) != n_li:
            err(f"DOAM index {prov}: {n_li} <li> but {len(items)} links")
    inv_rows, by_name = [], {}
    missing = 0
    recs = {}
    aware = {}
    for prov_written, items, _ in inv:
        for sid, _ in items:
            path = RAW / "doam" / "sites" / f"{sid}.html"
            if path.exists():
                rec = recs[sid] = parse_inventory_page(path)
                if rec:
                    rp = PROVINCES.get(rec.get("Province", "").lower(),
                                       PROVINCES.get(prov_written.lower(), ""))
                    dd = dists.parent_of(rp, rec.get("District", ""))
                    if dd:
                        aware.setdefault(rp, set()).add(dd)
    for prov_written, items, _ in inv:
        province = PROVINCES.get(prov_written.lower(), "")
        if not province:
            err(f"DOAM inventory: unknown province {prov_written!r}")
        for k, (sid, idx_name) in enumerate(items, 1):
            path = RAW / "doam" / "sites" / f"{sid}.html"
            if not path.exists():
                missing += 1
                continue
            rec = recs.get(sid)
            if rec is None or "Legal Status" not in rec or "District" not in rec:
                err(f"DOAM inventory page {sid} lacks Type/District/Legal Status fields")
                continue
            name = rec["name"] or idx_name
            rp = PROVINCES.get(rec.get("Province", "").lower(), province)
            typ = rec.get("Type", "")
            kind, basis, also = classify(name, typ)
            dist = rec.get("District", "")
            code, dnote = dists.resolve(rp, dist, name + " , " + rec.get("Description", "")[:300],
                                        aware.get(rp, set()))
            notes = [f"type: {typ}", f"legal status: {rec.get('Legal Status', '')}"]
            for lab in ("Period", "Relative Chronology", "Ownership"):
                if rec.get(lab):
                    notes.append(f"{lab.lower()}: {rec[lab]}")
            if also:
                notes.append("also matches: " + ", ".join(also))
            if dnote:
                notes.append(dnote)
            if rp != province:
                notes.append(f"index lists it under {prov_written}")
            row = {"list": "doam_inventory", "official_id": f"sites/{sid}", "province": rp,
                   "district_as_written": dist, "district_code": code, "name": name,
                   "name_ur": "", "kind": kind, "kind_basis": basis,
                   "lat": coord(rec.get("Latitude")), "lon": coord(rec.get("Longitude")),
                   "wikidata": "", "source_url": DOAM_SITE.format(sid),
                   "source_locator": f"heritage-sites page, 'All Heritage Sites' tab, "
                                     f"{prov_written} item {k}; record sites/{sid}",
                   "fetched_on": man.fetched_on(path), "note": "; ".join(notes)}
            inv_rows.append(row)
            by_name.setdefault((rp, norm(name)), []).append(row)
    if missing:
        err(f"DOAM inventory: {missing} item pages not downloaded; run `fetch`")
    prot_rows = []
    for prov_written, items, _ in prot:
        province = PROVINCES.get(prov_written.lower(), "")
        for k, (sid, name) in enumerate(items, 1):
            path = RAW / "doam" / "protected" / f"{sid}.html"
            if not path.exists():
                err(f"DOAM protected page {sid} not downloaded")
                continue
            kind, basis, also = classify(name)
            notes = ["DOAM list gives province only"]
            dist, code = "", ""
            cands = by_name.get((province, norm(name)), [])
            prot_c = [c for c in cands if "legal status: Protected" in c["note"]]
            use = prot_c if len(prot_c) == 1 else (cands if len(cands) == 1 else [])
            if use:
                c = use[0]
                dist, code = c["district_as_written"], c["district_code"]
                notes = [f"district from DOAM inventory record {c['official_id']} "
                         f"(same name, same province)"]
            elif cands:
                notes.append(f"{len(cands)} inventory records share this name; district not taken")
            if also:
                notes.append("also matches: " + ", ".join(also))
            prot_rows.append({"list": "doam_protected", "official_id": f"heritage-sites/{sid}",
                              "province": province, "district_as_written": dist,
                              "district_code": code, "name": name, "name_ur": "", "kind": kind,
                              "kind_basis": basis, "lat": "", "lon": "", "wikidata": "",
                              "source_url": DOAM_PROT.format(sid),
                              "source_locator": f"heritage-sites page, 'Protected Monument & "
                                                f"Sites' tab, {prov_written} item {k}",
                              "fetched_on": man.fetched_on(path), "note": "; ".join(notes)})
    return prot_rows, inv_rows


# ---------------------------------------------------------------------------------- Punjab

def parse_punjab_gallery(man, dists, borrow_rows):
    """Punjab DG Archaeology gallery (Wayback, June 2021): name + node id; law from item page.
    District is borrowed only from a single exact-name match in the EPA/WLM Punjab rows."""
    d = RAW / "punjab_doa_2021"
    pages = sorted(d.glob("page_*.html"))
    if not pages:
        raise SystemExit(f"missing {d}; run `fetch`")
    man_rows = man.rows
    index = {}
    for r in borrow_rows:
        if r["province"] != "Punjab" or not r["district_code"]:
            continue
        for nm in {norm(r["name"]), norm(r["name"].split(",")[0])}:
            index.setdefault(nm, set()).add((r["district_as_written"], r["district_code"]))
    out, seen = [], {}
    for path in pages:
        pg = int(re.search(r"page_(\d+)", path.name).group(1))
        t = path.read_text(encoding="utf-8", errors="replace")
        items = gallery_items(t)
        n_titles = t.count('class="galleryp-title"')
        if n_titles != len(items):
            err(f"Punjab gallery {path.name}: {n_titles} titles, {len(items)} parsed")
        url = man_rows.get(f"punjab_doa_2021/{path.name}", {}).get("url", "")
        for k, (nid, name) in enumerate(items, 1):
            if nid in seen:
                seen[nid]["note"] += f"; also on gallery page {pg}"
                continue
            law = ""
            npath = d / "node" / f"{nid[5:]}.html" if nid.startswith("node/") else d / "-"
            if npath.exists():
                L = page_lines(npath)
                if "Protected Under:" in L:
                    i = L.index("Protected Under:")
                    law = L[i + 1] if i + 1 < len(L) and L[i + 1] != "Footer Columns" else ""
            kind, basis, also = classify(name)
            notes = [f"protected under: {law}" if law else
                     ("item page archived but names no law" if npath.exists()
                      else "item page not fetched (not archived, or a non-node page)")]
            cands = index.get(norm(name), set())
            dist, code = "", ""
            if len({c for _, c in cands}) == 1:
                dist, code = sorted(cands)[0]
                notes.append("district borrowed from the EPA/Wikipedia Punjab row of the same name")
            elif cands:
                notes.append(f"name matches rows in {len(cands)} districts; none taken")
            else:
                notes.append("source gives no district")
            if also:
                notes.append("also matches: " + ", ".join(also))
            row = {"list": "punjab_doa_gallery_2021", "official_id": nid,
                   "province": "Punjab", "district_as_written": dist, "district_code": code,
                   "name": name, "name_ur": "", "kind": kind, "kind_basis": basis, "lat": "",
                   "lon": "", "wikidata": "", "source_url": url,
                   "source_locator": f"'Protection of Monuments/Museums' gallery page {pg} "
                                     f"(Wayback), item {k}; /{nid}",
                   "fetched_on": man.fetched_on(path), "note": "; ".join(notes)}
            seen[nid] = row
            out.append(row)
    return out


# ---------------------------------------------------------------------------------- output

def do_parse():
    man = Manifest(RAW / "fetch_manifest.csv")
    dists = Districts(DICT)
    rows = parse_wikipedia(man, dists, load_qids())
    epa, gaps = parse_epa(man, dists)
    prot, inv = parse_doam(man, dists)
    pbg = parse_punjab_gallery(man, dists, rows + epa)
    rows += epa + pbg + prot + inv
    for r in rows:
        for k, v in r.items():
            if isinstance(v, str) and ("\n" in v or "\r" in v):
                r[k] = re.sub(r"\s+", " ", v)
        if r["kind"] not in {"tomb_shrine", "temple", "gurdwara", "samadhi", "mosque", "church",
                             "other_religious", "graveyard", "not_religious"}:
            err(f"bad kind {r['kind']!r}")
        if r["district_code"] and not re.fullmatch(r"PK\d{3}", r["district_code"]):
            err(f"bad district_code {r['district_code']!r}")
    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    # summary
    from collections import Counter
    c = Counter((r["list"], r["province"]) for r in rows)
    print(f"wrote {len(rows)} rows to {OUT_CSV}")
    for (lst, p), n in sorted(c.items()):
        print(f"  {lst:40s} {p:20s} {n}")
    print("EPA serial gaps (in the source):", gaps)
    if ERRORS:
        print(f"{len(ERRORS)} parse error(s)", file=sys.stderr)
        return 1
    return 0


# ---------------------------------------------------------------------------------- main

def main(argv):
    if not argv or argv[0] not in ("fetch", "parse", "all"):
        print(__doc__)
        return 2
    refresh = "--refresh" in argv
    workers = 3
    if "--workers" in argv:
        workers = int(argv[argv.index("--workers") + 1])
    if argv[0] in ("fetch", "all"):
        do_fetch(refresh, workers)
    if argv[0] in ("parse", "all"):
        return do_parse()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
