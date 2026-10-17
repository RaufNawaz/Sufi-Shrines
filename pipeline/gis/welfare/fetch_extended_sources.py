"""
Download every wave-two source listed in sources_extended.tsv into pipeline/gis/sources/
(gitignored), unpack what the build reads, and hash what arrived into welfare/fetched_extended.tsv (tracked).

Usage (from the repo root):
  python pipeline/gis/welfare/fetch_extended_sources.py            # fetch only what is missing
  python pipeline/gis/welfare/fetch_extended_sources.py --refresh  # re-download everything

Exits non-zero naming any source that failed, keeping the previous copy of it, and any file whose
publisher states an MD5 (expected_md5) that the download does not match.
"""
import argparse, csv, datetime, subprocess, sys, zipfile
from pathlib import Path

from fetch_sources import get, digest, SRC

HERE = Path(__file__).resolve().parent
DHS_MS = ["AHTOBCMANY", "AHTOBCMNON", "CHVAC1CVCD", "CHVACCCBAS", "CHVACCCDP1", "CHVACCCDP3", "CHVACSCMSL",
          "CNNUTSCHA2", "EDLITRMLIT", "EDLITRWLIT", "FPCUSMWMOD", "FPNADMWPDM", "FPNADMWUNT", "MLITNAPACC",
          "RHANCNWN4P", "RHDELPCDHF", "WSSRCEPIMP", "WSTLETPNFC"]
DHS_IDS = ["AH_TOBC_M_ANY", "AH_TOBC_M_NON", "CH_VAC1_C_VCD", "CH_VACC_C_BAS", "CH_VACC_C_DP1", "CH_VACC_C_DP3",
           "CH_VACS_C_MSL", "CN_NUTS_C_HA2", "ED_LITR_M_LIT", "ED_LITR_W_LIT", "FP_CUSM_W_MOD", "FP_NADM_W_PDM",
           "FP_NADM_W_UNT", "ML_ITNA_P_ACC", "RH_ANCN_W_N4P", "RH_DELP_C_DHF", "WS_SRCE_P_IMP", "WS_TLET_P_NFC"]


def targets(r):
    if r["key"] == "dhs_ms":
        return [(r["url"] + f"PK2017DHS_{s}_MS_v01.zip", SRC / r["path"] / f"PK2017DHS_{s}_MS_v01.zip") for s in DHS_MS]
    if r["key"] == "dhs_ms_api":
        u = r["url"] + ",".join(DHS_IDS)
        return [(u, SRC / r["path"]), (u.replace("breakdown=subnational", "breakdown=national"),
                                       SRC / r["path"].replace(".json", "_national.json"))]
    if r["key"] == "ookla":
        return [(r["url"], SRC / r["path"]), (r["url"].replace("mobile", "fixed"), SRC / r["path"].replace("mobile", "fixed"))]
    if r["key"] == "census_pakpc2023":
        return []
    if not r["url"].startswith("http"):     # saved by hand (the host refuses scripts): hash it if present
        return [(r["url"], SRC / r["path"])] if (SRC / r["path"]).exists() else []
    return [(r["url"], SRC / r["path"])]


def main(a):
    rows = list(csv.DictReader(open(HERE / "sources_extended.tsv"), delimiter="\t"))
    out, failed = [], []
    for r in rows:
        if r["key"] == "census_pakpc2023":
            d = SRC / r["path"]
            if not d.exists():
                subprocess.run(["git", "clone", "--depth", "1", r["url"], str(d)], check=False)
            if not (d / "data/TABLE_04.RData").exists():
                failed.append("census_pakpc2023: clone failed")
            continue
        for url, dest in targets(r):
            if a.refresh or not dest.exists():
                print("fetch", dest.relative_to(SRC))
                try:
                    tmp = dest.with_suffix(dest.suffix + ".part")
                    get(url, tmp)
                    tmp.replace(dest)
                except Exception as e:                       # keep the previous copy, report, go on
                    failed.append(f"{r['key']} {dest.name}: {e}")
                    continue
            md5 = digest(dest, "md5")
            if r.get("expected_md5") and md5 != r["expected_md5"]:
                failed.append(f"{r['key']} {dest.name}: md5 {md5} != published {r['expected_md5']}")
            out.append({"key": r["key"], "file": str(dest.relative_to(SRC)), "bytes": dest.stat().st_size,
                        "sha256": digest(dest, "sha256"), "md5": md5, "md5_published": r.get("expected_md5", ""),
                        "fetched_utc": datetime.datetime.fromtimestamp(
                            dest.stat().st_mtime, datetime.timezone.utc).isoformat(timespec="seconds"),
                        "url": url})

    # Unpack what the build reads.
    for z in sorted((SRC / "dhs_ms").glob("PK2017DHS_*_MS_v01.zip")):
        if not z.with_suffix("").exists():
            zipfile.ZipFile(z).extractall(z.with_suffix(""))
    for z, d, probe in [(SRC / "ucdp/ged251-csv.zip", SRC / "ucdp", "*.csv"),
                        (SRC / "unosat/FL20220808PAK_SHP.zip", SRC / "unosat/FL20220808PAK_SHP", "**/*.shp"),
                        (SRC / "pslm/stata_data_pslm_2019_20.zip", SRC / "pslm/microdata_2019_20", "**/*.dta"),
                        (SRC / "pslm/stata_data_pslm_2014_15.zip", SRC / "pslm/microdata_2014_15", "**/*.dta")]:
        if z.exists() and not any(d.glob(probe)):
            zipfile.ZipFile(z).extractall(d)

    # Tracked (unlike sources/), so a fresh clone can check its downloads against these bytes.
    rar = SRC / "health_facilities/Pakistan_Health_Facilities.rar"
    if rar.exists() and not (SRC / "health_facilities/x/Pakistan_Health_Facilities.shp").exists():
        (SRC / "health_facilities/x").mkdir(parents=True, exist_ok=True)
        subprocess.run(["tar", "-xf", str(rar), "-C", str(SRC / "health_facilities/x")], check=True)

    with open(HERE / "fetched_extended.tsv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]), delimiter="\t", lineterminator="\n")
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} files hashed into welfare/fetched_extended.tsv")
    if failed:
        sys.exit("FAILED:\n  " + "\n  ".join(failed))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--refresh", action="store_true")
    main(p.parse_args())
