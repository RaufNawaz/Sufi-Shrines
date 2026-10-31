"""Mechanical first pass of the existence check, before any model reads anything.

A place can only be confirmed by a result that names it, so a place none of whose gathered results shares a
distinctive word of its names (honorifics, place-type words and very common name words removed; spelling
variants allowed) is no_evidence without judgement. A name made only of common words ("Pir Baba") needs a
result holding all of its words. Where the names and a result are in different scripts
(Latin and Urdu), words cannot be compared, so results within 500 m of the point go to the judge as well.

Writes workspace/out/claude_judge/candidates.jsonl (places to judge, with only the results that passed) and
workspace/out/claude_judge/mechanical.jsonl (places settled here as no_evidence, with the reason).

  python prefilter_candidates.py
"""
import difflib
import json
import os
import re

from gather_evidence import GENERIC, is_urdu

HERE = os.path.dirname(os.path.abspath(__file__))
WS = os.path.join(HERE, "workspace")
EVIDENCE = os.path.join(WS, "inputs", "shrine_evidence.jsonl")
META = os.path.join(WS, "inputs", "shrine_evidence_meta.jsonl")
OUT = os.path.join(WS, "out", "claude_judge")

# Words that never identify one place on their own (the worker instruction's "common word" rule, mechanised).
COMMON = set("""
maqbara maqbra maqbaro maqbro qubba quba qubo qubbo qabar qabr tomb tombs temple temples mandir mandar mandr
gurdwara gurudwara samadhi samadh shrine shrines mosque masjid jo ja ji je near at in on by old new
pir peer baba sain hazrat syed shah ali muhammad mohammad mohammed muhammed khan din deen ud ul al bibi mian
sakhi faqir fakir sultan sayed saiyid sayyed saiyed makhdum makhdoom ghazi data hafiz haji mullah mulla
sharif shareef kot wala wali
پیر بابا سائیں حضرت سید شاہ علی محمد خان دین بی بی میاں سخی فقیر سلطان مخدوم غازی حافظ حاجی ملا شریف مندر مقبرہ قبہ
""".split()) | {w.lower() for w in GENERIC}


def words(s):
    return [w for w in re.findall(r"[\w']+", (s or "").lower()) if not w.isdigit()]


def distinctive(names):
    out = set()
    for n in names:
        for w in words(n):
            w = w.strip("'")
            if w in COMMON or (len(w) < 3 and not is_urdu(w)) or len(w) < 2:
                continue
            out.add(w)
    return out


TYPE_WORDS = set("""
maqbara maqbra maqbaro maqbro qubba quba qubo qubbo qabar qabr tomb tombs temple temples mandir mandar mandr
gurdwara gurudwara samadhi samadh shrine shrines mosque masjid ziarat ziyarat zairat darbar durbar dargah mazar
mazaar of the and jo ja ji je near at in on by مزار دربار درگاہ زیارت مقبرہ قبہ مندر
""".split())


def all_words(names):
    """For a name made only of common words ("Pir Baba"): its words other than place-type words, per name."""
    return [ws for ws in ({w for w in words(n) if w not in TYPE_WORDS and len(w) >= 2} for n in names) if ws]


def matches(name_words, text):
    tw = set(words(text))
    for n in name_words:
        if n in tw:
            return True
        if len(n) >= 4 and any(len(t) >= 4 and difflib.SequenceMatcher(None, n, t).ratio() >= 0.8 for t in tw):
            return True
    return False


def main():
    os.makedirs(OUT, exist_ok=True)
    clean = {}
    with open(META, encoding="utf-8") as fh:
        for line in fh:
            try:
                m = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "place_id" in m:
                clean[m["place_id"]] = not m.get("errors")
    cands, mech, seen = [], [], set()
    with open(EVIDENCE, encoding="utf-8") as fh:
        for line in fh:
            try:
                it = json.loads(line)
            except json.JSONDecodeError:
                continue
            pid = it["id"]
            if pid in seen or not clean.get(pid):
                continue
            seen.add(pid)
            nw = distinctive(it["names"])
            phrases = [] if nw else all_words(it["names"])
            urdu_names = all(is_urdu(n) for n in it["names"])
            kept = []
            for r in it["results"]:
                text = r["title"] + " " + r["snippet"]
                cross = urdu_names != is_urdu(r["title"])
                tw = set(words(text))
                if (nw and matches(nw, text)) or any(ph <= tw for ph in phrases)                         or (cross and r["distance_m"] is not None and r["distance_m"] <= 500):
                    kept.append(r)
            if kept:
                cands.append({k: it[k] for k in ("id", "names", "tradition", "district", "province", "database")}
                             | {"results": kept})
            else:
                reason = ("no distinctive word in the names, and no result holds all of a name's words" if not nw else
                          "no result shares a distinctive word of the names" if it["results"] else "no results")
                mech.append({"place_id": pid, "verdict": "no_evidence", "reason": reason})
    for path, rows in (("candidates.jsonl", cands), ("mechanical.jsonl", mech)):
        with open(os.path.join(OUT, path), "w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    n_res = sum(len(c["results"]) for c in cands)
    print(f"{len(seen)} places with complete evidence: {len(cands)} to judge ({n_res} results), "
          f"{len(mech)} settled as no_evidence here")


if __name__ == "__main__":
    main()
