#!/usr/bin/env python3
"""
tools/extract.py — information extraction + entity linking for Sufi shrine texts.

Reads OCR output (or English translation) and extracts:
  - Named entities: saints, orders, places (pattern-based NER, no ML model)
  - Dates: Hijri and Gregorian year expressions; converted to ISO ranges
  - Relations: buried_at, disciple_of, belongs_to_order, located_in (English text)
  - Wikidata QID candidates (opt-in via --wikidata; requires network)

Output:
  data/kg-staging.json       extracted entities/relations/dates (reviewed=false)
  data/wikidata-pending.json  QID candidates for human review (with --wikidata)

IMPORTANT — human-in-the-loop gate:
  All output is tagged reviewed=false.  Never auto-merge into data/kg.json.
  Review each item, then add accepted entities/relations/QIDs manually.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

# Shared helpers (sibling module — importable when run as python3 tools/extract.py).
from _lib import REPO_ROOT, utf8_stdio

utf8_stdio()

# Defaults are anchored to the repo root so the script works from any cwd;
# CLI flags may still pass any (absolute or cwd-relative) path.
DEFAULT_KG_PATH = REPO_ROOT / "data" / "kg.json"
DEFAULT_STAGING_PATH = REPO_ROOT / "data" / "kg-staging.json"
DEFAULT_WIKIDATA_PATH = REPO_ROOT / "data" / "wikidata-pending.json"
DEFAULT_GLOSSARY_PATH = REPO_ROOT / "data" / "glossary.csv"
CANONICALIZE_THRESHOLD = 0.70
WIKIDATA_AUTO_ACCEPT = 0.88
WIKIDATA_API = "https://www.wikidata.org/w/api.php"

# ── Arabic-Indic digit normalisation ─────────────────────────────────────────

_ARABIC_INDIC = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def normalize_digits(text: str) -> str:
    return text.translate(_ARABIC_INDIC)


# ── Hijri ↔ Gregorian conversion ─────────────────────────────────────────────

def hijri_to_gregorian(h: int) -> tuple[int, int]:
    """Return approximate Gregorian (low, high) for a Hijri year."""
    low = int(h * 0.97021 + 621.54)
    return low, low + 1


def gregorian_to_hijri(g: int) -> int:
    return round((g - 621.54) / 0.97021)


# ── Date extraction ───────────────────────────────────────────────────────────

_HIJRI_MARKER = r"(?:ھ|ہجری|ہجرت|\bAH\b|\bH\b|Hijri|Hijra)"
_GREGORIAN_MARKER = r"(?:عیسوی|\bCE\b|\bAD\b)"
_DATE_PATTERN = re.compile(
    rf"(?:سن\s*)?([٠-٩0-9]{{3,4}})\s*({_HIJRI_MARKER}|{_GREGORIAN_MARKER})",
    re.UNICODE,
)
_HIJRI_TEST = re.compile(_HIJRI_MARKER)


def extract_dates(text: str) -> list[dict]:
    """Extract Hijri and Gregorian year expressions from Urdu or English text."""
    norm = normalize_digits(text)
    results = []
    for i, m in enumerate(_DATE_PATTERN.finditer(norm)):
        year = int(m.group(1))
        if not (100 <= year <= 2200):
            continue
        marker = m.group(2)
        is_hijri = bool(_HIJRI_TEST.match(marker))
        if is_hijri:
            low, high = hijri_to_gregorian(year)
            iso = f"{low}/{high}"
            results.append({
                "id": f"ext:date:{i:04d}",
                "original": m.group(0),
                "hijri": year,
                "gregorian_low": low,
                "gregorian_high": high,
                "iso": iso,
                "confidence": 0.93,
                "context": text[max(0, m.start() - 40): m.end() + 40].strip(),
            })
        else:
            results.append({
                "id": f"ext:date:{i:04d}",
                "original": m.group(0),
                "hijri": None,
                "gregorian_low": year,
                "gregorian_high": year,
                "iso": str(year),
                "confidence": 0.88,
                "context": text[max(0, m.start() - 40): m.end() + 40].strip(),
            })
    return results


# ── NER — Urdu text ───────────────────────────────────────────────────────────

_HONORIFICS_UR = (
    "حضرت|خواجہ|پیر|شاہ|مولانا|صاحب|سیّد|سید|قطب|غوث|مخدوم|حافظ|ولی|شیخ|خلیفہ|عارف"
)
# Match 1–4 consecutive Arabic-script words after an honorific.
# The character class [؀-ۿ] covers U+0600–U+06FF (Arabic/Urdu block).
# Some noise is expected (common Urdu function words also fall in this range);
# all output is tagged reviewed=false for human correction.
_SAINT_UR = re.compile(
    rf"(?:{_HONORIFICS_UR})\s+([؀-ۿ]{{1,25}}(?:\s+[؀-ۿ]{{1,25}}){{0,3}})",
    re.UNICODE,
)

_ORDER_UR_MAP: dict[str, str] = {
    "چشتیہ": "chishtiyya",
    "قادریہ": "qadiriyya",
    "نقشبندیہ": "naqshbandiyya",
    "سہروردیہ": "suhrawardiyya",
    "کبرویہ": "kubrawiyya",
    "قلندریہ": "qalandariyya",
    "رفاعیہ": "rifaiyya",
}
_ORDER_UR_PAT = re.compile(
    rf"سلسلہ\s*({'|'.join(_ORDER_UR_MAP)})|({'|'.join(_ORDER_UR_MAP)})\s*سلسلہ|"
    rf"({'|'.join(_ORDER_UR_MAP)})",
    re.UNICODE,
)


def extract_saints_ur(text: str) -> list[dict]:
    """Extract saint candidates from Urdu text via honorific patterns."""
    seen: set[str] = set()
    results = []
    for i, m in enumerate(_SAINT_UR.finditer(text)):
        name_ur = m.group(1).strip()
        if name_ur in seen or len(name_ur) < 3:
            continue
        seen.add(name_ur)
        results.append({
            "nameUr": name_ur,
            "context": text[max(0, m.start() - 20): m.end() + 20].strip(),
        })
    return results


def extract_orders_ur(text: str) -> list[dict]:
    """Extract order mentions from Urdu text."""
    seen: set[str] = set()
    results = []
    for m in _ORDER_UR_PAT.finditer(text):
        matched = next((g for g in m.groups() if g), None)
        if not matched or matched in seen:
            continue
        seen.add(matched)
        results.append({
            "nameUr": matched,
            "slug": _ORDER_UR_MAP.get(matched, matched),
            "context": text[max(0, m.start() - 20): m.end() + 20].strip(),
        })
    return results


# ── NER — English text ────────────────────────────────────────────────────────

_HONORIFICS_EN = (
    r"Hazrat|Khwaja|Pir|Peer|Shah|Mawlana|Maulana|Sayyid|Syed|Shaykh|Sheikh|"
    r"Makhdoom|Ghazi|Qutb|Sultan|Baba|Lal|Bibi"
)
# Match 1–5 consecutive Title-Case words after an honorific.  No lookahead
# required: the repetition stops naturally when a lowercase word follows.
_SAINT_EN = re.compile(
    rf"(?:{_HONORIFICS_EN})\s+([A-Z][a-zA-Z'·-]{{1,25}}(?:\s+[A-Z][a-zA-Z'·-]{{1,25}}){{0,4}})",
)

_ORDER_EN_MAP: dict[str, str] = {
    "chishtiyya": "chishtiyya",
    "chishti": "chishtiyya",
    "qadiriyya": "qadiriyya",
    "qadiri": "qadiriyya",
    "naqshbandiyya": "naqshbandiyya",
    "naqshbandi": "naqshbandiyya",
    "suhrawardiyya": "suhrawardiyya",
    "suhrawardi": "suhrawardiyya",
    "kubrawiyya": "kubrawiyya",
    "qalandariyya": "qalandariyya",
    "qalandar": "qalandariyya",
}
_ORDER_EN_PAT = re.compile(
    rf"({'|'.join(_ORDER_EN_MAP)})\s+(?:order|silsila|tariqa|tariqah)",
    re.IGNORECASE,
)


def extract_saints_en(text: str) -> list[dict]:
    seen: set[str] = set()
    results = []
    for m in _SAINT_EN.finditer(text):
        name = m.group(1).strip().rstrip("'s")
        if name in seen or len(name) < 3:
            continue
        seen.add(name)
        results.append({
            "name": name,
            "context": text[max(0, m.start() - 20): m.end() + 20].strip(),
        })
    return results


def extract_orders_en(text: str) -> list[dict]:
    seen: set[str] = set()
    results = []
    for m in _ORDER_EN_PAT.finditer(text):
        key = m.group(1).lower()
        slug = _ORDER_EN_MAP.get(key, key)
        if slug in seen:
            continue
        seen.add(slug)
        results.append({
            "name": m.group(1),
            "slug": slug,
            "context": text[max(0, m.start() - 20): m.end() + 20].strip(),
        })
    return results


# ── Relation extraction — English ─────────────────────────────────────────────

# Each pattern: (relation_type, regex, subject_group, object_group)
_RELATION_PATTERNS: list[tuple[str, re.Pattern, int, int]] = [
    (
        "buried_at",
        re.compile(
            r"(tomb|dargah|mazar|shrine)\s+of\s+([\w\s]{3,40}?)\s+(?:is\s+)?(?:located\s+)?in\s+([\w\s]{3,30})",
            re.IGNORECASE,
        ),
        2, 3,
    ),
    (
        "buried_at",
        re.compile(
            r"([\w\s]{3,40}?)\s+(?:is\s+)?buried\s+(?:at|in)\s+([\w\s]{3,30})",
            re.IGNORECASE,
        ),
        1, 2,
    ),
    (
        "disciple_of",
        re.compile(
            r"([\w\s]{3,40}?)\s+(?:was\s+(?:a\s+)?|is\s+(?:a\s+)?)(?:disciple|murid|khalifa)\s+of\s+([\w\s]{3,40})",
            re.IGNORECASE,
        ),
        1, 2,
    ),
    (
        "disciple_of",
        re.compile(
            r"([\w\s]{3,40}?)\s+received\s+(?:bay.?a|initiation)\s+from\s+([\w\s]{3,40})",
            re.IGNORECASE,
        ),
        1, 2,
    ),
    (
        "belongs_to_order",
        re.compile(
            r"([\w\s]{3,40}?)\s+belonged?\s+to\s+the\s+([\w\s]{3,30}?)\s+(?:order|silsila|tariqa)",
            re.IGNORECASE,
        ),
        1, 2,
    ),
    (
        "belongs_to_order",
        re.compile(
            r"([\w\s]{3,40}?)\s+was\s+(?:a\s+)?member\s+of\s+the\s+([\w\s]{3,30}?)\s+(?:order|silsila)",
            re.IGNORECASE,
        ),
        1, 2,
    ),
    (
        "located_in",
        re.compile(
            r"shrine\s+(?:is\s+)?(?:located|situated)\s+in\s+([\w\s]{3,30})",
            re.IGNORECASE,
        ),
        0, 1,  # subject is implicit "shrine"
    ),
]


def extract_relations_en(text: str) -> list[dict]:
    results = []
    for i, (rel_type, pattern, subj_grp, obj_grp) in enumerate(_RELATION_PATTERNS):
        for m in pattern.finditer(text):
            subj = m.group(subj_grp).strip() if subj_grp > 0 else ""
            obj = m.group(obj_grp).strip()
            if not obj:
                continue
            results.append({
                "id": f"ext:rel:{i:04d}:{len(results):04d}",
                "type": rel_type,
                "subject_raw": subj,
                "object_raw": obj,
                "evidence": m.group(0).strip(),
                "confidence": 0.72,
                "method": "pattern",
                "reviewed": False,
            })
    return results


# ── Canonicalisation against existing KG ─────────────────────────────────────

_STRIP_HONORIFICS = re.compile(
    r"\b(?:Hazrat|Khwaja|Pir|Shah|Mawlana|Maulana|Sayyid|Syed|"
    r"Shaykh|Sheikh|Makhdoom|Ghazi|Sultan|Baba)\b",
    re.IGNORECASE,
)


def _normalize_name(name: str) -> str:
    name = _STRIP_HONORIFICS.sub("", name)
    name = unicodedata.normalize("NFKD", name)
    return re.sub(r"\s+", " ", name.lower()).strip()


def load_kg(path: Path) -> dict:
    if not path.exists():
        return {"saints": [], "orders": [], "places": []}
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def match_to_kg(name: str, entities: list[dict]) -> tuple[str | None, float]:
    """Return (slug, confidence) of the best existing-KG match, or (None, 0)."""
    norm = _normalize_name(name)
    best_slug, best_score = None, 0.0
    for ent in entities:
        candidates = [ent.get("name", "")]
        candidates += ent.get("altNames", [])
        for cname in candidates:
            if not cname:
                continue
            score = SequenceMatcher(None, norm, _normalize_name(cname)).ratio()
            if score > best_score:
                best_score = score
                best_slug = ent.get("slug")
    if best_score >= CANONICALIZE_THRESHOLD:
        return best_slug, round(best_score, 3)
    return None, 0.0


# ── Wikidata entity linking ───────────────────────────────────────────────────

_SUFI_KEYWORDS = {
    "sufi", "saint", "shrine", "mystic", "dargah", "mazar", "order",
    "wali", "qutb", "caliph", "tariqa", "silsila", "pir",
}


def _wikidata_description_bonus(description: str) -> float:
    words = set(description.lower().split())
    return 0.15 if words & _SUFI_KEYWORDS else 0.0


def search_wikidata(
    name: str,
    entity_type: str,
    delay: float = 0.5,
    limit: int = 5,
) -> list[dict]:
    """Search Wikidata for QID candidates. Returns up to `limit` results."""
    params = urllib.parse.urlencode({
        "action": "wbsearchentities",
        "search": name,
        "language": "en",
        "type": "item",
        "format": "json",
        "limit": limit,
    })
    url = f"{WIKIDATA_API}?{params}"
    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "SufiShrinesHarvardResearch/1.0 (research project)")
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as exc:
        print(f"  Wikidata search failed for '{name}': {exc}", file=sys.stderr)
        return []

    time.sleep(delay)

    candidates = []
    norm_query = _normalize_name(name)
    for hit in data.get("search", []):
        label = hit.get("label", "")
        description = hit.get("description", "")
        qid = hit.get("id", "")
        str_score = SequenceMatcher(None, norm_query, _normalize_name(label)).ratio()
        bonus = _wikidata_description_bonus(description)
        score = round(min(1.0, str_score * 0.85 + bonus), 3)
        candidates.append({
            "qid": qid,
            "label": label,
            "description": description,
            "score": score,
            "wikidata_url": f"https://www.wikidata.org/wiki/{qid}",
        })
    return sorted(candidates, key=lambda c: -c["score"])


# ── Entity assembly ───────────────────────────────────────────────────────────

def _slug_from_name(name: str) -> str:
    """Generate a candidate slug from an English name."""
    clean = _STRIP_HONORIFICS.sub("", name)
    clean = re.sub(r"[^\w\s-]", "", clean.lower())
    return re.sub(r"\s+", "-", clean.strip()).strip("-")


def assemble_saint_entity(
    idx: int,
    name: str | None,
    name_ur: str | None,
    kg_saints: list[dict],
    do_wikidata: bool,
    wikidata_delay: float,
    mentions: list[dict],
) -> dict:
    display_name = name or name_ur or f"unknown-{idx}"
    existing_slug, canon_conf = match_to_kg(display_name, kg_saints) if display_name else (None, 0.0)
    slug = existing_slug or (_slug_from_name(name) if name else f"extracted-{idx:04d}")

    entity: dict = {
        "id": f"ext:saint:{idx:04d}",
        "type": "saint",
        "slug": slug,
        "name": name,
        "nameUr": name_ur,
        "method": "pattern_ner",
        "confidence": 0.78,
        "existing_kg_match": existing_slug,
        "existing_kg_confidence": canon_conf if existing_slug else None,
        "reviewed": False,
        "reviewed_by": None,
        "reviewed_date": None,
        "wikidata_candidates": [],
        "mentions": mentions,
    }

    if do_wikidata and name and not existing_slug:
        candidates = search_wikidata(name, "saint", delay=wikidata_delay)
        entity["wikidata_candidates"] = candidates
        if candidates and candidates[0]["score"] >= WIKIDATA_AUTO_ACCEPT:
            entity["wikidata_auto_qid"] = candidates[0]["qid"]
            entity["wikidata_auto_confidence"] = candidates[0]["score"]
            print(f"  Auto-QID for '{name}': {candidates[0]['qid']} (score={candidates[0]['score']})")

    return entity


# ── Main extraction pipeline ──────────────────────────────────────────────────

def extract_from_file(
    ur_path: Path | None,
    en_path: Path | None,
    kg: dict,
    args: argparse.Namespace,
) -> dict:
    """Run the full extraction pipeline on one Urdu + optional English file pair."""
    ur_text = ur_path.read_text(encoding="utf-8") if ur_path else ""
    en_text = en_path.read_text(encoding="utf-8") if en_path else ""

    source_files = [str(p) for p in [ur_path, en_path] if p]

    # 1. Date extraction
    dates = extract_dates(ur_text + "\n" + en_text)
    # Deduplicate by (hijri, gregorian_low)
    seen_dates: set[tuple] = set()
    unique_dates = []
    for d in dates:
        key = (d["hijri"], d["gregorian_low"])
        if key not in seen_dates:
            seen_dates.add(key)
            unique_dates.append(d)

    # 2. NER — saints
    saints_ur = extract_saints_ur(ur_text)
    saints_en = extract_saints_en(en_text)

    # Merge Urdu and English saint mentions
    saint_entities: list[dict] = []
    used_ur: set[str] = set()
    kg_saints = kg.get("saints", [])

    for idx, s_en in enumerate(saints_en):
        name_en = s_en["name"]
        # Find a matching Urdu name if possible
        name_ur = None
        for s_ur in saints_ur:
            if s_ur["nameUr"] not in used_ur:
                name_ur = s_ur["nameUr"]
                used_ur.add(name_ur)
                break
        entity = assemble_saint_entity(
            idx, name_en, name_ur, kg_saints,
            args.wikidata, args.wikidata_delay,
            [{"source_file": str(en_path), "context": s_en.get("context", "")}],
        )
        saint_entities.append(entity)

    # Urdu-only saints (no English counterpart)
    for s_ur in saints_ur:
        if s_ur["nameUr"] not in used_ur:
            idx = len(saint_entities)
            entity = assemble_saint_entity(
                idx, None, s_ur["nameUr"], kg_saints,
                args.wikidata, args.wikidata_delay,
                [{"source_file": str(ur_path), "context": s_ur.get("context", "")}],
            )
            saint_entities.append(entity)

    # 3. NER — orders
    order_mentions: list[dict] = []
    seen_orders: set[str] = set()
    for o in extract_orders_ur(ur_text) + extract_orders_en(en_text):
        slug = o.get("slug", "")
        if slug and slug not in seen_orders:
            seen_orders.add(slug)
            order_mentions.append({
                "type": "order",
                "slug": slug,
                "nameUr": o.get("nameUr"),
                "name": o.get("name"),
                "existing_kg_match": slug,  # orders are seeded; these are confirmed matches
                "context": o.get("context", ""),
            })

    # 4. Relation extraction (English only for reliability)
    relations = extract_relations_en(en_text)

    # Cross-reference extracted entities into relation subject/object where possible
    for rel in relations:
        subj = rel["subject_raw"]
        obj = rel["object_raw"]
        # Try matching to KG saints
        slug, conf = match_to_kg(subj, kg_saints)
        if slug:
            rel["subject_id"] = f"saint:{slug}"
            rel["subject_confidence"] = conf
        # Try matching to KG orders for belongs_to_order
        if rel["type"] == "belongs_to_order":
            for o in order_mentions:
                key = _normalize_name(obj)
                ord_key = _normalize_name(o.get("name") or o.get("slug", ""))
                if SequenceMatcher(None, key, ord_key).ratio() > 0.6:
                    rel["object_id"] = f"order:{o['slug']}"
                    break

    return {
        "source_files": source_files,
        "dates": unique_dates,
        "saints": saint_entities,
        "orders": order_mentions,
        "relations": relations,
    }


# ── Output builders ───────────────────────────────────────────────────────────

def build_staging_doc(extractions: list[dict], extracted_at: str) -> dict:
    all_saints: list[dict] = []
    all_orders: list[dict] = []
    all_relations: list[dict] = []
    all_dates: list[dict] = []
    all_sources: list[str] = []

    for ext in extractions:
        all_saints.extend(ext["saints"])
        all_orders.extend(ext["orders"])
        all_relations.extend(ext["relations"])
        all_dates.extend(ext["dates"])
        all_sources.extend(ext["source_files"])

    return {
        "schema_version": "1.0.0",
        "extracted_at": extracted_at,
        "source_files": list(dict.fromkeys(all_sources)),
        "reviewed": False,
        "merge_instructions": (
            "Review each item. For accepted entities/relations, add them manually "
            "to data/kg.json. Never auto-merge this file into the canonical KG."
        ),
        "counts": {
            "saints": len(all_saints),
            "orders": len(all_orders),
            "relations": len(all_relations),
            "dates": len(all_dates),
        },
        "saints": all_saints,
        "orders": all_orders,
        "relations": all_relations,
        "dates": all_dates,
    }


def build_wikidata_pending(extractions: list[dict]) -> dict:
    pending = []
    for ext in extractions:
        for saint in ext["saints"]:
            if not saint.get("wikidata_candidates"):
                continue
            if saint.get("existing_kg_match"):
                continue  # Already in KG; QID should be checked there
            pending.append({
                "entity_id": saint["id"],
                "entity_name": saint.get("name") or saint.get("nameUr"),
                "candidates": saint["wikidata_candidates"],
                "status": "pending",
                "notes": "",
            })
    return {
        "schema_version": "1.0.0",
        "instructions": (
            "For each entry: review the candidates, set status to "
            "'accepted', 'rejected', or 'needs-more-research', "
            "and add the accepted QID to data/kg.json manually."
        ),
        "pending": pending,
    }


# ── File discovery ────────────────────────────────────────────────────────────

def find_file_pairs(input_path: Path) -> list[tuple[Path | None, Path | None]]:
    """Find (urdu_path, english_path) pairs under input_path."""
    if input_path.is_file():
        name = input_path.name
        if "_translated" in name:
            ur = input_path.parent / name.replace("_translated", "_corrected")
            if not ur.exists():
                ur = input_path.parent / name.replace("_translated", "_transcribed")
            return [(ur if ur.exists() else None, input_path)]
        else:
            return [(input_path, None)]

    # Directory: pair _corrected.txt (or _transcribed.txt) with _translated.txt
    pairs: list[tuple[Path | None, Path | None]] = []
    corrected = {f.stem.replace("_corrected", ""): f
                 for f in input_path.rglob("*_corrected.txt")}
    transcribed = {f.stem.replace("_transcribed", ""): f
                   for f in input_path.rglob("*_transcribed.txt")}
    translated = {f.stem.replace("_translated", ""): f
                  for f in input_path.rglob("*_translated.txt")}

    all_keys = set(corrected) | set(transcribed) | set(translated)
    for key in sorted(all_keys):
        ur = corrected.get(key) or transcribed.get(key)
        en = translated.get(key)
        if ur or en:
            pairs.append((ur, en))
    return pairs or [(None, None)]


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="extract.py",
        description=(
            "Extract entities, relations, and dates from Sufi shrine texts.\n"
            "All output is tagged reviewed=false — never auto-merge into data/kg.json."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=r"""
examples:
  # Extract from corrected + translated files in a directory:
  py -3 tools\extract.py out\ocr_corrected\AFADA-E-KABIR\

  # Also search Wikidata for QID candidates (requires network):
  py -3 tools\extract.py out\ocr_corrected\AFADA-E-KABIR\ --wikidata

  # Dry run (print stats, no files written):
  py -3 tools\extract.py out\ocr_corrected\AFADA-E-KABIR\ --dry-run

  # Specify output paths explicitly:
  py -3 tools\extract.py out\ocr_corrected\ \
      --output-staging data\kg-staging.json \
      --output-wikidata data\wikidata-pending.json
""",
    )
    p.add_argument("input", help="Path to a text file or directory of OCR/translation output.")
    p.add_argument(
        "--kg-path",
        default=str(DEFAULT_KG_PATH),
        metavar="PATH",
        help=f"Existing kg.json for canonicalisation. Default: {DEFAULT_KG_PATH}",
    )
    p.add_argument(
        "--output-staging",
        default=str(DEFAULT_STAGING_PATH),
        metavar="PATH",
        help=f"Output staging JSON. Default: {DEFAULT_STAGING_PATH}",
    )
    p.add_argument(
        "--output-wikidata",
        default=str(DEFAULT_WIKIDATA_PATH),
        metavar="PATH",
        help=f"Output Wikidata pending JSON. Default: {DEFAULT_WIKIDATA_PATH}",
    )
    p.add_argument(
        "--wikidata",
        action="store_true",
        default=False,
        help=(
            "Search Wikidata for QID candidates (requires network access). "
            "Off by default."
        ),
    )
    p.add_argument(
        "--wikidata-delay",
        type=float,
        default=0.5,
        metavar="SECS",
        help="Seconds to wait between Wikidata API requests. Default: 0.5",
    )
    p.add_argument(
        "--wikidata-max-entities",
        type=int,
        default=20,
        metavar="N",
        help="Max entities to look up on Wikidata per run. Default: 20",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Print extraction stats without writing any output files.",
    )
    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    input_path = Path(args.input).expanduser().resolve()
    kg = load_kg(Path(args.kg_path))
    print(
        f"KG loaded: {len(kg.get('saints', []))} saints, "
        f"{len(kg.get('orders', []))} orders, "
        f"{len(kg.get('places', []))} places"
    )

    pairs = find_file_pairs(input_path)
    if not pairs or pairs == [(None, None)]:
        print(f"No text files found under {input_path}", file=sys.stderr)
        return 1
    print(f"Found {len(pairs)} file pair(s)")

    extractions: list[dict] = []
    wikidata_budget = args.wikidata_max_entities
    for ur_path, en_path in pairs:
        label = (ur_path or en_path or Path("?")).name
        print(f"\n[{label}]")
        ext = extract_from_file(ur_path, en_path, kg, args)
        extractions.append(ext)
        print(
            f"  saints={len(ext['saints'])} orders={len(ext['orders'])} "
            f"relations={len(ext['relations'])} dates={len(ext['dates'])}"
        )
        wikidata_budget -= sum(
            1 for s in ext["saints"] if s.get("wikidata_candidates")
        )
        if args.wikidata and wikidata_budget <= 0:
            print("  Wikidata budget exhausted — stopping entity lookup")
            break

    extracted_at = datetime.now(timezone.utc).isoformat()
    staging = build_staging_doc(extractions, extracted_at)

    print(
        f"\nTotal: {staging['counts']['saints']} saint(s), "
        f"{staging['counts']['orders']} order mention(s), "
        f"{staging['counts']['relations']} relation(s), "
        f"{staging['counts']['dates']} date(s)"
    )

    if args.dry_run:
        print("Dry run — no files written.")
        return 0

    staging_path = Path(args.output_staging)
    staging_path.write_text(
        json.dumps(staging, ensure_ascii=False, indent=2),
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {staging_path}")

    if args.wikidata:
        wikidata_doc = build_wikidata_pending(extractions)
        wikidata_path = Path(args.output_wikidata)
        wikidata_path.write_text(
            json.dumps(wikidata_doc, ensure_ascii=False, indent=2),
            encoding="utf-8",
            newline="\n",
        )
        print(f"Wrote {wikidata_path}  ({len(wikidata_doc['pending'])} pending link(s))")

    print("\nReview kg-staging.json before merging into data/kg.json.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
