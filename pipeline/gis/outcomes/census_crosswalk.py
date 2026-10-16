"""Match Census 2023 tehsil units (PBS via PakPC2023) to OCHA COD-AB tehsil codes."""
import re, difflib
import pandas as pd

DISTRICT_FIX = {  # census name -> OCHA name (normalised)
    "DERA ISMAIL KHAN": "D I KHAN", "KARACHI CENTRAL": "CENTRAL KARACHI",
    "KARACHI EAST": "EAST KARACHI", "KARACHI SOUTH": "SOUTH KARACHI",
    "KARACHI WEST": "WEST KARACHI", "KEAMARI": "WEST KARACHI", "KORANGI": "KORANGI KARACHI",
    "LAYYAH": "LEIAH", "LOWER CHITRAL": "CHITRAL LOWER", "UPPER CHITRAL": "CHITRAL UPPER",
    "LOWER KOHISTAN": "KOHISTAN LOWER", "UPPER KOHISTAN": "KOHISTAN UPPER",
    "MALIR": "MALIR KARACHI", "SHAHEED BENAZIRABAD": "SHAHEED BENAZIR ABAD",
    "SURAB": "SHAHEED SIKANDARABAD", "TANDO AHYAR": "TANDO ALLAHYAR", "TANDO ALLAH YAR": "TANDO ALLAHYAR", "TORGHAR": "TOR GHAR",
}
PROV = {"KPK": "Khyber Pakhtunkhwa", "PUNJAB": "Punjab", "SINDH": "Sindh",
        "BALOCHISTAN": "Balochistan", "ISLAMABAD": "Islamabad"}


def norm(s):
    s = str(s).upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    s = re.sub(r"\b(TEHSIL|DISTRICT|SUB DIVISION|SUBDIVISION|TALUKA|TOWN)\b", "", s)
    s = s.replace("SAHIB", "SB").replace("SHARIF", "SH")
    return re.sub(r"\s+", "", s)


def match(census_units, ocha_tehsils, cutoff=0.78):
    """census_units: PROVINCE, DISTRICT, TEHSIL. ocha_tehsils: province_name, district_name,
    tehsil_name, tehsil_code. Returns census units with tehsil_code and match_type."""
    o = ocha_tehsils.copy()
    o["d"] = o.district_name.map(lambda x: re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", str(x).upper())).strip())
    o["t"] = o.tehsil_name.map(norm)
    out = []
    for _, r in census_units.iterrows():
        dname = re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", r.DISTRICT.upper())).strip()
        dname = DISTRICT_FIX.get(dname, dname)
        t = norm(r.TEHSIL)
        prov = PROV.get(r.PROVINCE, r.PROVINCE)
        cand = o[o.d == dname]
        code, kind = None, "unmatched"
        hit = cand[cand.t == t]
        if len(hit) == 1:
            code, kind = hit.tehsil_code.iloc[0], "exact"
        elif "KARACHI" in dname:
            pass   # census sub divisions and OCHA towns are different units; district level only
        else:
            close = difflib.get_close_matches(t, cand.t.tolist(), n=1, cutoff=cutoff)
            if close:
                code, kind = cand[cand.t == close[0]].tehsil_code.iloc[0], "fuzzy_in_district"
            else:  # tehsil moved district between boundary vintages
                pc = o[o.province_name == prov]
                hit = pc[pc.t == t]
                if len(hit) == 1:
                    code, kind = hit.tehsil_code.iloc[0], "exact_other_district"
        out.append({**r.to_dict(), "tehsil_code": code, "match_type": kind})
    return pd.DataFrame(out)
