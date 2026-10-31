"""Gather outside evidence for one-source shrine places (stage A of the existence check).

Reads workspace/inputs/places_to_confirm.jsonl and, for each place, queries free structured APIs
(Wikipedia en/ur search and geosearch, Commons geosearch, Wikidata search, Ollama web search when it
has credits). Writes one compact item per place to workspace/inputs/shrine_evidence.jsonl for the
worker, and per-place hit counts and API errors to workspace/inputs/shrine_evidence_meta.jsonl.

Standard library only. At most one request per second per host; every response cached on disk by
request; resumable (places already written are skipped).

  python gather_evidence.py --sample 20     # random 20 places (seed 1), for a test
  python gather_evidence.py                 # everything not yet written
  python gather_evidence.py --stats         # print per-API counts from the meta file
"""
import argparse
import collections
import concurrent.futures
import hashlib
import html
import json
import os
import random
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WS = os.path.join(HERE, "workspace")
IN_FILE = os.path.join(WS, "inputs", "places_to_confirm.jsonl")
OUT_FILE = os.path.join(WS, "inputs", "shrine_evidence.jsonl")
META_FILE = os.path.join(WS, "inputs", "shrine_evidence_meta.jsonl")
CACHE_DIR = os.path.join(WS, "cache", "evidence")
UA = "ShrineExistenceCheck/1.0 (research tool; https://raufnawaz.github.io/Sufi-Shrines/)"
OLLAMA_SEARCH = "https://ollama.com/api/web_search"

SOURCE_ORDER = {"doam": 0, "osm": 1, "wikidata": 2, "geonames": 3, "osm (weak tier C)": 4}
MAX_CANDIDATES = 12
SNIPPET_CHARS = 300

# Honorifics and place-type words that rarely appear in an article's text exactly as on a map label.
# Used for the fallback search and for ranking candidates, never to change the place's names.
GENERIC = set("""
darbar durbar dargah hazrat hazarat hz syed syyed sayed sayyid mazar mazaar mazār ziarat ziyarat zairat
shrine tomb tombs of the and sain sarkar rahmatullah alaih alai ra r.a rh qs sharif shareef
masjid mosque mandir temple samadhi samadh gurdwara gurudwara sahib ka ki ke wala wali walay
دربار درگاہ حضرت سید مزار زیارت مقبرہ شریف رحمۃ رحمت اللہ علیہ کا کی کے سرکار سائیں مسجد مندر گوردوارہ سمادھی
""".split())

_host_lock = {}
_host_last = {}
_host_gap = {}  # seconds between requests per host; doubled after a 429/403
_locks_guard = threading.Lock()
STATS = collections.Counter()


def is_urdu(s):
    return bool(re.search(r"[؀-ۿ]", s))


def tokens(s):
    return [t for t in re.findall(r"[\w']+", s.lower()) if len(t) >= 3 or is_urdu(t)]


def core_name(name):
    return " ".join(t for t in re.findall(r"[\w.']+", name) if t.lower().strip(".") not in GENERIC
                    and t.lower() not in GENERIC)


def strip_html(s):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", "", s or "")).split())


def trim(s, n=SNIPPET_CHARS):
    s = strip_html(s)
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + " ..."


def wait_turn(host):
    with _locks_guard:
        lock = _host_lock.setdefault(host, threading.Lock())
    lock.acquire()
    try:
        gap = time.time() - _host_last.get(host, 0)
        min_gap = _host_gap.get(host, 1.0)
        if gap < min_gap:
            time.sleep(min_gap - gap)
        _host_last[host] = time.time()
    finally:
        lock.release()


def http_json(url, body=None, headers=None):
    """GET (or POST when body is given) returning parsed JSON; cached on disk by request."""
    key = hashlib.sha256((url + "\n" + json.dumps(body, sort_keys=True)).encode("utf-8")).hexdigest()
    path = os.path.join(CACHE_DIR, key[:2], key + ".json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)["body"]
    host = urllib.parse.urlparse(url).netloc
    hdrs = {"User-Agent": UA, "Accept": "application/json"}
    hdrs.update(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs["Content-Type"] = "application/json"
    last = None
    # Wikimedia's geosearch refuses intermittently ("too busy"); short retries get through.
    for attempt in range(8):
        wait_turn(host)
        try:
            req = urllib.request.Request(url, data=data, headers=hdrs, method="POST" if data else "GET")
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=30) as r:
                parsed = json.loads(r.read().decode("utf-8"))
            STATS[host + " requests"] += 1
            STATS[host + " seconds"] += time.time() - t0
            if isinstance(parsed, dict) and "error" in parsed and "query" not in parsed:
                err = parsed["error"]
                if isinstance(err, dict) and err.get("code") in ("cirrussearch-too-busy-error", "ratelimited", "maxlag"):
                    last = RuntimeError(f"API error: {err.get('code')}")
                    STATS[host + " busy"] += 1
                    time.sleep(2 + attempt)
                    continue
                raise RuntimeError(f"API error: {str(err)[:200]}")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump({"url": url, "body": parsed}, fh, ensure_ascii=False)
            os.replace(tmp, path)
            return parsed
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 403) and "ollama.com" not in host:
                # An API refusing us: back off 15 minutes, then continue at half the rate. Never work around it.
                _host_gap[host] = _host_gap.get(host, 1.0) * 2
                STATS[host + " refused"] += 1
                print(f"{time.strftime('%H:%M')} {host} HTTP {e.code}: backing off 15 min, then 1 request per "
                      f"{_host_gap[host]:.0f} s", flush=True)
                time.sleep(900)
                continue
            if e.code in (500, 502, 503, 504):
                time.sleep(min(60, int(e.headers.get("Retry-After") or 0) or 5 * (attempt + 1)))
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
            time.sleep(5 * (attempt + 1))
    raise last


# ---------------------------------------------------------------- APIs

def wiki_search(lang, query):
    url = (f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "query", "list": "search", "srsearch": query, "srlimit": 5, "format": "json"}))
    res = http_json(url)
    return [{"api": f"wikipedia_{lang}_search", "title": h["title"], "snippet": trim(h.get("snippet", "")),
             "url": f"https://{lang}.wikipedia.org/wiki/" + urllib.parse.quote(h["title"].replace(" ", "_")),
             "distance_m": None} for h in res.get("query", {}).get("search", [])]


def wiki_geo(lang, lat, lon):
    url = (f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "query", "list": "geosearch", "gscoord": f"{lat}|{lon}", "gsradius": 1000,
         "gslimit": 10, "format": "json"}))
    res = http_json(url)
    return [{"api": f"wikipedia_{lang}_geosearch", "title": h["title"], "snippet": "",
             "url": f"https://{lang}.wikipedia.org/wiki/" + urllib.parse.quote(h["title"].replace(" ", "_")),
             "distance_m": round(h.get("dist", 0))} for h in res.get("query", {}).get("geosearch", [])]


def commons_geo(lat, lon):
    url = ("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "query", "list": "geosearch", "gscoord": f"{lat}|{lon}", "gsradius": 500,
         "gsnamespace": 6, "gslimit": 20, "format": "json"}))
    res = http_json(url)
    return [{"api": "commons_geosearch", "title": h["title"], "snippet": "",
             "url": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(h["title"].replace(" ", "_")),
             "distance_m": round(h.get("dist", 0))} for h in res.get("query", {}).get("geosearch", [])]


def wikidata_search(name):
    lang = "ur" if is_urdu(name) else "en"
    url = ("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "wbsearchentities", "search": name, "language": lang, "uselang": lang,
         "limit": 5, "format": "json"}))
    res = http_json(url)
    return [{"api": "wikidata_search", "title": f"{h.get('label', '')} ({h['id']})",
             "snippet": trim(h.get("description", "")),
             "url": f"https://www.wikidata.org/wiki/{h['id']}", "distance_m": None, "_id": h["id"]}
            for h in res.get("search", [])]


def ollama_search(query):
    res = http_json(OLLAMA_SEARCH, {"query": query, "max_results": 5},
                    {"Authorization": f"Bearer {os.environ.get('OLLAMA_API_KEY', '')}"})
    return [{"api": "web_search", "title": strip_html(h.get("title", "")),
             "snippet": trim(h.get("content") or h.get("snippet") or ""), "url": h.get("url", ""),
             "distance_m": None} for h in res.get("results", [])][:5]


def probe_web_search():
    """Returns (available, note)."""
    if not os.environ.get("OLLAMA_API_KEY"):
        return False, "search_unavailable: OLLAMA_API_KEY not set"
    try:
        ollama_search('"Data Darbar" Lahore Pakistan')
        return True, "ok"
    except urllib.error.HTTPError as e:
        return False, f"search_unavailable: HTTP {e.code}"
    except Exception as e:  # noqa: BLE001
        return False, f"search_unavailable: {e}"


# ---------------------------------------------------------------- per place

def gather(place, web_ok):
    names = [n for n in place["names"] if n and n.strip()]
    district = place.get("district") or ""
    lat, lon = place.get("lat"), place.get("lon")
    errors, raw = [], []

    def search_query(name):
        # A Latin district name cannot match Urdu-script article text, so Urdu names go alone.
        return name if is_urdu(name) or not district else f"{name} {district}"

    def run(label, fn, *args):
        try:
            return fn(*args)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{label}: {type(e).__name__}: {str(e)[:150]}")
            return []

    def wiki_jobs(lang):
        out = []
        for n in names:
            hits = run(f"{lang}_search", wiki_search, lang, search_query(n))
            core = core_name(n)
            if not hits and core and core != n:
                hits = run(f"{lang}_search", wiki_search, lang, search_query(core))
            out += hits
        if lat is not None and lon is not None:
            out += run(f"{lang}_geosearch", wiki_geo, lang, lat, lon)
        return out

    def commons_jobs():
        return run("commons_geosearch", commons_geo, lat, lon) if lat is not None and lon is not None else []

    def wikidata_jobs():
        out = []
        for n in names:
            hits = run("wikidata_search", wikidata_search, n)
            core = core_name(n)
            if not hits and core and core != n:
                hits = run("wikidata_search", wikidata_search, core)
            out += hits
        return out

    def web_jobs():
        if not web_ok:
            return []
        n = next((x for x in names if not is_urdu(x)), names[0] if names else "")
        return run("web_search", ollama_search, f'"{n}" {district} Pakistan'.strip()) if n else []

    jobs = [lambda: wiki_jobs("en"), lambda: wiki_jobs("ur"), commons_jobs, wikidata_jobs, web_jobs]
    with concurrent.futures.ThreadPoolExecutor(len(jobs)) as ex:
        for res in ex.map(lambda f: f(), jobs):
            raw += res

    # The database record itself is not independent evidence.
    record_urls = {r.get("url") for r in place.get("records", []) if r.get("url")}
    record_ids = {str(r.get("id")) for r in place.get("records", []) if r.get("source") == "wikidata"}
    seen, cands = set(), []
    for c in raw:
        if c["url"] in seen or c["url"] in record_urls or c.get("_id") in record_ids:
            continue
        seen.add(c["url"])
        cands.append(c)

    name_toks = set()
    for n in names:
        name_toks |= {t for t in tokens(core_name(n) or n) if t not in GENERIC}

    def score(c):
        text = set(tokens(c["title"] + " " + c["snippet"]))
        overlap = len(name_toks & text) / len(name_toks) if name_toks else 0
        d = c["distance_m"]
        near = 0.5 if d is not None and d <= 500 else 0.2 if d is not None and d <= 1000 else 0
        return (overlap + near, -(d if d is not None else 10 ** 6))

    counts = {}
    for c in cands:
        counts[c["api"]] = counts.get(c["api"], 0) + 1
    cands.sort(key=score, reverse=True)
    kept = [{k: v for k, v in c.items() if k != "_id"} for c in cands[:MAX_CANDIDATES]]
    item = {"id": place["place_id"], "names": names, "tradition": place.get("tradition"),
            "district": district, "province": place.get("province"), "lat": lat, "lon": lon,
            "database": place.get("source"),
            "records": [{"source": r.get("source"), "name": r.get("name"), "url": r.get("url")}
                        for r in place.get("records", [])],
            "results": kept}
    meta = {"place_id": place["place_id"], "source": place.get("source"), "hits_per_api": counts,
            "candidates_total": len(cands), "candidates_kept": len(kept), "errors": errors}
    return item, meta


def load_places():
    with open(IN_FILE, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def read_lines(path):
    """Complete JSON lines of a file; a line cut short by an interrupted run is dropped."""
    rows = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                try:
                    rows.append((json.loads(line), line if line.endswith("\n") else line + "\n"))
                except json.JSONDecodeError:
                    pass
    return rows


def reconcile():
    """Keep only places written completely to both files without API errors; returns (done, retry) ids."""
    out, meta = read_lines(OUT_FILE), read_lines(META_FILE)
    ok = {m["place_id"] for m, _ in meta if "place_id" in m and not m.get("errors")}
    ok &= {o["id"] for o, _ in out}
    retry = {m["place_id"] for m, _ in meta if m.get("errors")}
    for path, rows, key in ((OUT_FILE, out, "id"), (META_FILE, meta, "place_id")):
        if not rows:
            continue
        seen, keep = set(), []
        for obj, line in rows:
            pid = obj.get(key)
            if pid is None:
                keep.append(line)  # run header
            elif pid in ok and pid not in seen:
                seen.add(pid)
                keep.append(line)
        with open(path + ".tmp", "w", encoding="utf-8") as fh:
            fh.writelines(keep)
        os.replace(path + ".tmp", path)
    return ok, retry - ok


def stats():
    by_api, places, errs, n_with_any = {}, 0, 0, 0
    run_info = None
    with open(META_FILE, encoding="utf-8") as fh:
        for line in fh:
            m = json.loads(line)
            if "run" in m:
                run_info = m
                continue
            places += 1
            errs += bool(m["errors"])
            n_with_any += bool(m["hits_per_api"])
            for api, n in m["hits_per_api"].items():
                s = by_api.setdefault(api, {"places_with_hits": 0, "hits": 0})
                s["places_with_hits"] += 1
                s["hits"] += n
    print(json.dumps({"places": places, "places_with_any_hit": n_with_any, "places_with_api_errors": errs,
                      "per_api": dict(sorted(by_api.items())), "last_run": run_info}, indent=1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, help="process a random sample of N not-yet-done places")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--stats", action="store_true")
    ap.add_argument("--until", help="stop cleanly at this local time, HH:MM (for overnight runs)")
    a = ap.parse_args()
    if a.stats:
        return stats()
    places = load_places()
    done, retry = reconcile()
    if retry:
        print(f"retrying {len(retry)} places whose API calls failed last time", flush=True)
    # Strongest sources first so a run stopped by the clock leaves whole groups done; shuffled within a
    # group (fixed seed) so any finished prefix of a group is a random sample of it.
    todo = [p for p in places if p["place_id"] not in done]
    random.Random(a.seed).shuffle(todo)
    todo.sort(key=lambda p: (p["place_id"] not in retry, SOURCE_ORDER.get(p.get("source"), len(SOURCE_ORDER))))
    if a.sample:
        rest = [p for p in todo if p["place_id"] not in retry]
        todo = [p for p in todo if p["place_id"] in retry][:a.sample]
        todo += random.Random(a.seed).sample(rest, min(a.sample - len(todo), len(rest)))
    web_ok, web_note = probe_web_search()
    print(f"web search: {web_note}; places to do: {len(todo)} (already done: {len(done)})", flush=True)
    t0 = time.time()
    with open(OUT_FILE, "a", encoding="utf-8") as out, open(META_FILE, "a", encoding="utf-8") as meta:
        meta.write(json.dumps({"run": time.strftime("%Y-%m-%d %H:%M"), "web_search": web_note,
                               "places": len(todo)}) + "\n")
        deadline = None
        if a.until:
            hh, mm = map(int, a.until.split(":"))
            now = time.localtime()
            deadline = time.mktime(now[:3] + (hh, mm, 0) + now[6:])
            if deadline <= time.time():
                deadline += 86400
        for i, p in enumerate(todo, 1):
            if deadline and time.time() >= deadline:
                print(f"{time.strftime('%H:%M')} stopped at --until {a.until}: {i - 1}/{len(todo)} done; next group "
                      f"would have been {p.get('source')}", flush=True)
                break
            item, m = gather(p, web_ok)
            out.write(json.dumps(item, ensure_ascii=False) + "\n")
            meta.write(json.dumps(m, ensure_ascii=False) + "\n")
            out.flush()
            meta.flush()
            if i % 10 == 0 or i == len(todo):
                el = time.time() - t0
                print(f"{i}/{len(todo)} places, {el / i:.1f} s/place; "
                      + ", ".join(f"{k}={v:.0f}" for k, v in sorted(STATS.items())), flush=True)


if __name__ == "__main__":
    main()
