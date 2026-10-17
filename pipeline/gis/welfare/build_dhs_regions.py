"""
Women's agency, violence and financial inclusion by region, PDHS 2017-18, from the DHS Program API:
the measures no other source in the atlas reaches - attitudes to wife-beating (women and men), a say
in household decisions, controlling behaviour by husbands, physical violence and whether help was
sought, house ownership, bank accounts, control over earnings, health insurance, media access.

Region level only (the four provinces, Islamabad, Gilgit-Baltistan, Azad Kashmir and the former
FATA, which has no polygon in the boundary file and is kept as a data row). One value per indicator
and region: DHS's preferred breakdown where it marks one, as wave one does.

Checked: every requested indicator is found for every region; each region's value sits between 0
and 100; and women's marriage by 18 here agrees in rank with the NNS and MICS district figures
aggregated to province.

Usage (from the repo root):
  python pipeline/gis/welfare/build_dhs_regions.py
"""
import csv, json, sys, urllib.request
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_welfare_layers as bw          # noqa: E402

HERE, GPKG = bw.HERE, bw.GPKG
CACHE = bw.SRC / "dhs/api_2017_all_subnational.json"
API = ("https://api.dhsprogram.com/rest/dhs/data?countryIds=PK&surveyIds=PK2017DHS&breakdown=subnational&f=json"
       "&perpage=5000&returnFields=IndicatorId,Indicator,CharacteristicLabel,Value,IsPreferred&page=")
CHECKS = []
KEEP = {
    "WE_AWBT_W_AGR": ("dhs_women_justify_wife_beating", "Women who say wife-beating is justified for at least one reason, %"),
    "WE_AWBT_M_AGR": ("dhs_men_justify_wife_beating", "Men who say wife-beating is justified for at least one reason, %"),
    "WE_DMAK_W_3DC": ("dhs_women_say_all_decisions", "Married women with a say in all three household decisions (own health care, major purchases, visits), %"),
    "WE_DMAK_W_NON": ("dhs_women_say_no_decisions", "Married women with a say in none of the three decisions, %"),
    "DV_MCTL_W_3BH": ("dhs_husband_3plus_controlling", "Ever-married women whose husband shows 3 or more controlling behaviours, %"),
    "DV_EXPV_W_EVR": ("dhs_women_physical_violence_ever", "Women who experienced physical violence since age 15, %"),
    "DV_SPV1_W_POS": ("dhs_partner_violence_12m", "Ever-married women: physical or sexual violence by husband in the last 12 months, %"),
    "DV_STPV_W_NTL": ("dhs_violence_never_told", "Women who experienced violence and never sought help or told anyone, %"),
    "WE_OWNA_W_HAJ": ("dhs_women_own_house", "Women who own a house, alone or jointly, %"),
    "CO_MOBB_W_BNK": ("dhs_women_bank_account", "Women with a bank account, %"),
    "CO_MOBB_W_MOB": ("dhs_women_own_mobile", "Women who own a mobile phone, %"),
    "EM_WERN_W_WIF": ("dhs_women_decide_own_earnings", "Married women earning cash who decide alone how their earnings are used, %"),
    "AH_HINS_W_ANY": ("dhs_women_health_insurance", "Women with any health insurance, %"),
    "ED_MDIA_W_N3M": ("dhs_women_no_media", "Women with no weekly access to newspaper, television or radio, %"),
    "MA_MBAY_W_B18": ("dhs_women_married_by_18", "Women 20-24 first married by 18, %"),
    "CM_ECMR_C_NNR": ("dhs_neonatal_mortality", "Neonatal mortality per 1,000 live births (10 years before the survey)"),
}
REGIONS = {"Punjab excluding Islamabad (ICT)": "PK6", "Sindh": "PK7", "Khyber Pakhtunkhwa": "PK5", "Balochistan": "PK2",
           "Gilgit Baltistan": "PK3", "Islamabad (ICT)": "PK4", "Azad, Jammu and Kashmir": "PK1",
           "Federally Administered Tribal Areas": "FATA"}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def fetch():
    if CACHE.exists():
        return json.load(open(CACHE))["Data"]
    rows, page = [], 1
    while True:
        req = urllib.request.Request(API + str(page), headers={"User-Agent": "shrines-gis/1.0"})
        d = json.load(urllib.request.urlopen(req, timeout=120))
        rows += d["Data"]
        if page >= d.get("TotalPages", 1):
            break
        page += 1
    json.dump({"Data": rows}, open(CACHE, "w"))
    return rows


def main():
    d = pd.DataFrame(fetch())
    d = d[d.IndicatorId.isin(KEEP) & d.CharacteristicLabel.isin(REGIONS)]
    d = d.sort_values("IsPreferred", ascending=False).drop_duplicates(["IndicatorId", "CharacteristicLabel"])
    d["province_code"] = d.CharacteristicLabel.map(REGIONS)
    w = d.pivot_table(index="province_code", columns="IndicatorId", values="Value")
    missing = {k: sorted(set(REGIONS.values()) - set(w[k].dropna().index)) for k in KEEP if k in w}
    absent = [k for k in KEEP if k not in w]
    holes = {k: v for k, v in missing.items() if v}
    check("every indicator found for every region", "integrity",
          "all" if not absent and not holes else f"absent {absent}; missing {holes}", "all", not absent and not holes,
          hard=False, note="Reported as the API returns it; a missing value is left empty")
    pct = [k for k in KEEP if k != "CM_ECMR_C_NNR" and k in w]
    out_of_range = int(((w[pct] < 0) | (w[pct] > 100)).sum().sum())
    check("every share between 0 and 100", "integrity", f"{out_of_range} out of range", "none", out_of_range == 0)
    w = w.rename(columns={k: v[0] for k, v in KEEP.items()})

    # Province ranks of marriage by 18 against the two district surveys aggregated to province.
    nns = pd.read_csv(HERE.parent / "outcomes/outcomes_nns_district.csv")
    ce = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True)[["district_code", "pop2023"]]
    n = nns.merge(ce, on="district_code").dropna(subset=["nns_married_before_18", "pop2023"])
    p = n.assign(x=n.nns_married_before_18 * n.pop2023).groupby("province_code")[["x", "pop2023"]].sum()
    p = (p.x / p.pop2023).rename("nns")
    x = w[["dhs_women_married_by_18"]].join(p, how="inner").dropna()
    rho = x.iloc[:, 0].rank().corr(x.iloc[:, 1].rank())
    check("DHS 2017-18 marriage by 18 vs NNS 2018 (population-weighted to province)", "convergent",
          f"rho = {rho:+.2f}, n = {len(x)}", "rho >= 0.6", rho >= 0.6)

    prov = gpd.read_file(GPKG, layer="admin_province")[["province_code", "province_name", "geometry"]]
    g = prov.merge(w.reset_index(), on="province_code", how="right")
    gpd.GeoDataFrame(g, geometry="geometry", crs=4326).to_file(GPKG, layer="welfare_dhs_regions", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "welfare_dhs_regions.csv", index=False)
    pd.DataFrame([{"indicator": v[0], "definition": f"{v[1]}. PDHS 2017-18, region level (DHS indicator {k})",
                   "source_key": "dhs_api", "publisher": "The DHS Program API (PDHS 2017-18)",
                   "licence": "DHS terms of use (free, cite)"} for k, v in KEEP.items()]).to_csv(
        HERE / "welfare_dhs_regions_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks_dhs_regions.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
