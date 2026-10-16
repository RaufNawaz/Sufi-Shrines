"""
Download every welfare source listed in sources.tsv into pipeline/gis/sources/ (gitignored),
then hash what arrived.

A file whose publisher states an MD5 (expected_md5) must match it or the script exits non-zero.
Every file's size and SHA-256 are written to sources/fetched.tsv, which build_welfare_layers.py
copies into the GeoPackage so each layer can be traced to the exact bytes it came from.

Usage (from the repo root):
  python pipeline/gis/welfare/fetch_sources.py            # fetch only what is missing
  python pipeline/gis/welfare/fetch_sources.py --refresh  # re-download everything
"""
import argparse, csv, datetime, gzip, hashlib, shutil, sys, urllib.request, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "sources"
HEIGIT_FILES = ["rural_population", "vulnerability", "coping", "access", "facilities",
                "demographics", "rai", "flood_exposure", "evacuability"]
DHS_INDICATORS = ["FE_FRTR_W_TFR", "CM_ECMR_C_IMR", "CM_ECMR_C_U5M", "RH_DELP_C_DHF",
                  "CH_VACC_C_BAS", "CN_NUTS_C_HA2", "CN_NUTS_C_WH2", "CN_NUTS_C_WA2",
                  "ED_EDUC_W_SEH", "ED_LITR_W_LIT", "HC_ELEC_H_ELC", "FP_CUSM_W_MOD",
                  "DV_SPVL_W_POS"]


def get(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "shrines-gis/1.0"})
    with urllib.request.urlopen(req, timeout=900) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f)


def digest(path, algo):
    h = hashlib.new(algo)
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main(a):
    rows = list(csv.DictReader(open(HERE / "sources.tsv"), delimiter="\t"))
    out, failed = [], []
    for r in rows:
        targets = []
        if r["key"] == "heigit":
            targets = [(r["url"] + f"PAK_ADM2_{n}.csv", SRC / r["path"] / f"PAK_ADM2_{n}.csv")
                       for n in HEIGIT_FILES]
        elif r["key"] == "dhs_api":
            targets = [(r["url"] + ",".join(DHS_INDICATORS), SRC / r["path"])]
        else:
            targets = [(r["url"], SRC / r["path"])]
        for url, dest in targets:
            if a.refresh or not dest.exists():
                print("fetch", dest.relative_to(SRC))
                get(url, dest)
            md5 = digest(dest, "md5")
            if r["expected_md5"] and md5 != r["expected_md5"]:
                failed.append(f"{dest.name}: md5 {md5} != published {r['expected_md5']}")
            out.append({"key": r["key"], "file": str(dest.relative_to(SRC)), "bytes": dest.stat().st_size,
                        "sha256": digest(dest, "sha256"), "md5": md5,
                        "md5_published": r["expected_md5"] or "",
                        "fetched_utc": datetime.datetime.fromtimestamp(
                            dest.stat().st_mtime, datetime.timezone.utc).isoformat(timespec="seconds"),
                        "url": url})

    # Unpack the archives the build reads from.
    k = SRC / "kontur/kontur_population_PK_20231101.gpkg"
    if not k.exists():
        with gzip.open(str(k) + ".gz", "rb") as fi, open(k, "wb") as fo:
            shutil.copyfileobj(fi, fo)
    for name in ["health", "education"]:
        d = SRC / "hotosm" / name
        if not d.exists():
            zipfile.ZipFile(SRC / f"hotosm/{name}_gpkg.zip").extractall(d)

    with open(SRC / "fetched.tsv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]), delimiter="\t")
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} files hashed -> sources/fetched.tsv")
    if failed:
        print("HASH MISMATCH:\n  " + "\n  ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--refresh", action="store_true")
    main(p.parse_args())
