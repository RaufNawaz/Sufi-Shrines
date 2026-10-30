"""How far each district count can be trusted for testing a conjecture (writes validity_*.csv).

Two questions, answered with numbers, never assumed:
1. Convergent validity: do independently compiled sources rank districts alike? (Spearman, on
   counts per million people, across districts where the census has a population.)
2. Effort bias: does a source's count rise with welfare only because richer districts are better
   mapped? For each source, OLS of log(1+count) on log(pop) and one welfare measure, with and
   without log(1+mapped places of worship). A welfare slope that shrinks a lot once effort is in
   was mostly mapping; one that stays was not.

Run after build_district_counts.py, with the gis venv, from the repo root.
"""

import csv
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

HERE = Path(__file__).resolve().parent
GIS = HERE.parent.parent

d = pd.read_csv(HERE / "district_counts.csv")
a = pd.read_csv(GIS / "atlas/atlas_district.csv", usecols=lambda c: c in {
    "district_code", "pop2023", "rwi_popw", "ntl_2023_popw", "urban_share", "literacy", "travel_city_min_popw"})
d = d.merge(a, on="district_code", how="left")
d["n_osm_ab"] = d.n_osm_A + d.n_osm_B
SOURCES = ["n_archive", "n_osm_ab", "n_osm_C", "n_geonames", "n_wikidata", "n_doam", "n_union_ab", "n_osm_pow_effort"]
SOURCES = [s for s in SOURCES if d[s].sum() > 0]
WELFARE = ["rwi_popw", "ntl_2023_popw", "urban_share", "literacy", "travel_city_min_popw"]
p = d[d.pop2023 > 0].copy()

rows = []
for i, x in enumerate(SOURCES):
    for y in SOURCES[i + 1:]:
        r, pv = spearmanr(p[x] / p.pop2023, p[y] / p.pop2023)
        rows.append({"a": x, "b": y, "n_districts": len(p), "spearman_per_capita": round(r, 3), "p": f"{pv:.2g}"})
pd.DataFrame(rows).to_csv(HERE / "validity_convergent.csv", index=False, lineterminator="\n")


def ols(y, X):
    X = np.column_stack([np.ones(len(y))] + X)
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    e = y - X @ b
    n, k = X.shape
    # HC1 standard errors, as the viewer's workbench reports.
    xtx = np.linalg.inv(X.T @ X)
    V = xtx @ (X.T * e ** 2) @ X @ xtx * n / (n - k)
    return b, np.sqrt(np.diag(V))


rows = []
for s in SOURCES:
    for w in WELFARE:
        q = p.dropna(subset=[w])
        z = (q[w] - q[w].mean()) / q[w].std()
        y = np.log1p(q[s].values)
        base = [np.log(q.pop2023.values), z.values]
        b0, se0 = ols(y, base)
        row = {"source": s, "welfare": w, "n": len(q), "slope_z": round(b0[2], 3), "se": round(se0[2], 3)}
        if s != "n_osm_pow_effort":
            b1, se1 = ols(y, base + [np.log1p(q.n_osm_pow_effort.values)])
            row.update(slope_z_with_effort=round(b1[2], 3), se_with_effort=round(se1[2], 3),
                       effort_coef=round(b1[3], 3))
        rows.append(row)
pd.DataFrame(rows).to_csv(HERE / "validity_effort.csv", index=False, lineterminator="\n")
print(pd.read_csv(HERE / "validity_convergent.csv").to_string(index=False))
print(pd.read_csv(HERE / "validity_effort.csv").to_string(index=False))
