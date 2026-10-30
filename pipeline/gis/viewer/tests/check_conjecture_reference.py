"""Independent reference for the viewer's "Test a conjecture" numbers. Python standard library only
(numpy is not installed on this machine).

Reads the data straight out of pipeline/gis/viewer/index.html (not through the page) and the log the
page exported (cj_results.json), recomputes every non-error entry and reports the largest relative
difference per quantity.

Deliberately different algorithms from the page:
  OLS      normal equations solved by Gauss-Jordan with partial pivoting (the page uses Householder QR)
  Poisson  Newton-Raphson on the log-likelihood (the page uses IRLS with a QR solve per step)
  p-values own regularised incomplete beta / gamma (the page uses jStat)
Permutation p-values use a port of the page's seeded generator (mulberry32) and must match exactly.

Added 30 Oct 2026, with the same aim of different algorithms:
  Moran    OLS: the Cliff-Ord moments from dense n x n matrices (MW and MW' built explicitly; the page
           uses sparse trace identities), and that dense code is itself checked against the classical
           normality formula in the intercept-only case before anything is compared. Poisson: the
           two-sided permutation test about the permutation mean.
  Conley   brute force over every pair of units (the page uses a grid index), same distance definition
           and Bartlett kernel. Not for hexagons (n^2 pairs in pure Python).
  Refits   OLS / Poisson without Lahore district and without each province, from the reference's own
           fits.
  Placebo  not recomputed: it is the page's own generator and smoothing, so a port would test nothing
           independent. Its determinism is checked by the browser test (a JSON re-run reproduces every
           number), and its calibration is measured in docs/GIS_FOUNDATION.md.

Usage (repo root): python -I pipeline/gis/viewer/tests/check_conjecture_reference.py \n    pipeline/gis/viewer/index.html <outdir>/cj_results.json
(cj_results.json is written by tests/test_conjecture.cjs; it is the page's own JSON export of the log.)
Exits non-zero on any mismatch beyond the stated tolerances.
"""
import base64, gzip, json, math, re, sys

html_path, res_path = sys.argv[1], sys.argv[2]
h = open(html_path, encoding="utf-8").read()
D = json.loads(gzip.decompress(base64.b64decode(json.loads(re.findall(r'atob\(("[A-Za-z0-9+/=]*")\)', h)[0]))))
LOG = json.load(open(res_path, encoding="utf-8"))["log"]
# The page sets the known travel-time defect missing (template.html, DEFECT): a negative
# travel_city_min_popw, and that unit's 60-minute share. The reference applies the same rule.
for u_ in ("district", "tehsil", "province"):
    for f_ in D[u_]["features"]:
        q_ = f_["properties"]
        if q_.get("travel_city_min_popw") is not None and q_["travel_city_min_popw"] < 0:
            q_["travel_city_min_popw"] = None; q_["share_pop_within_60min_city"] = None
_hc = D["hex"]["cols"]
if "travel_city_min_popw" in _hc:
    _a = _hc.index("travel_city_min_popw") + 1
    _b = _hc.index("share_pop_within_60min_city") + 1 if "share_pop_within_60min_city" in _hc else 0
    for r_ in D["hex"]["rows"]:
        if r_[_a] is not None and r_[_a] < 0:
            r_[_a] = None
            if _b: r_[_b] = None


def feats(u):
    if u == "hex":
        cols = D["hex"]["cols"]
        return [{"id": r[0], "p": dict(zip(cols, r[1:])), "geom": None} for r in D["hex"]["rows"]]
    return [{"id": f["properties"]["id"], "p": f["properties"], "geom": f["geometry"]} for f in D[u]["features"]]


FE = {u: feats(u) for u in ("hex", "tehsil", "district", "province")}


# ---- distributions -----------------------------------------------------------------------------
def betacf(a, b, x):
    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = 1 / (d if abs(d) > 1e-300 else 1e-300)
    hh = d
    for m in range(1, 1000):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > 1e-300 else 1e-300)
        c = 1 + aa / c; c = c if abs(c) > 1e-300 else 1e-300
        hh *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > 1e-300 else 1e-300)
        c = 1 + aa / c; c = c if abs(c) > 1e-300 else 1e-300
        de = d * c; hh *= de
        if abs(de - 1) < 1e-16:
            break
    return hh


def ibeta(a, b, x):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x))
    return bt * betacf(a, b, x) / a if x < (a + 1) / (a + b + 2) else 1 - bt * betacf(b, a, 1 - x) / b


def p_t(t, df):  # two-sided
    return ibeta(df / 2, 0.5, df / (df + t * t))


def p_norm(z):
    return math.erfc(abs(z) / math.sqrt(2))


def q_t975(df):
    lo, hi = 0.0, 100.0
    for _ in range(200):
        mid = (lo + hi) / 2
        (lo, hi) = (mid, hi) if p_t(mid, df) > 0.05 else (lo, mid)
    return (lo + hi) / 2


def gammainc_p(a, x):
    if x <= 0: return 0.0
    if x < a + 1:
        s = term = 1 / a; ap = a
        for _ in range(10000):
            ap += 1; term *= x / ap; s += term
            if abs(term) < abs(s) * 1e-16: break
        return s * math.exp(-x + a * math.log(x) - math.lgamma(a))
    b = x + 1 - a; c = 1 / 1e-300; d = 1 / b; hh = d
    for i in range(1, 10000):
        an = -i * (i - a); b += 2
        d = an * d + b; d = 1 / (d if abs(d) > 1e-300 else 1e-300)
        c = b + an / c; c = c if abs(c) > 1e-300 else 1e-300
        de = d * c; hh *= de
        if abs(de - 1) < 1e-16: break
    return 1 - math.exp(-x + a * math.log(x) - math.lgamma(a)) * hh


def p_F(f, d1, d2):
    return 1 - ibeta(d1 / 2, d2 / 2, d1 * f / (d1 * f + d2))


def p_chi2(x, k):
    return 1 - gammainc_p(k / 2, x / 2)


# ---- linear algebra ----------------------------------------------------------------------------
def inv(M):
    k = len(M); A = [list(r) + [1.0 if i == j else 0.0 for j in range(k)] for i, r in enumerate(M)]
    for c in range(k):
        p = max(range(c, k), key=lambda r: abs(A[r][c])); A[c], A[p] = A[p], A[c]
        d = A[c][c]; A[c] = [v / d for v in A[c]]
        for r in range(k):
            if r != c:
                f = A[r][c]; A[r] = [a - f * b for a, b in zip(A[r], A[c])]
    return [r[k:] for r in A]


def matmul(A, B):
    return [[sum(A[i][l] * B[l][j] for l in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


def xtwx(X, w):
    k = len(X[0]); return [[sum(w[i] * X[i][a] * X[i][b] for i in range(len(X))) for b in range(k)] for a in range(k)]


# ---- data, as the spec defines it -------------------------------------------------------------
GOOD = {i["key"]: i["good"] for i in D["indicators"]}


def composite(parts, u):
    """Mid-rank percentile among the units with every component, turned by direction, mean x 100."""
    fs = FE[u]; allv = [all(f["p"].get(k) is not None for k in parts) for f in fs]
    out = [0.0 if a else None for a in allv]; ids = [i for i, a in enumerate(allv) if a]; n = len(ids)
    for k in parts:
        v = [fs[i]["p"][k] for i in ids]; order = sorted(range(n), key=lambda j: v[j]); r = [0.0] * n; i = 0
        while i < n:
            j = i
            while j + 1 < n and v[order[j + 1]] == v[order[i]]: j += 1
            for q in range(i, j + 1): r[order[q]] = (i + j) / 2 + 1
            i = j + 1
        for q, i_ in enumerate(ids):
            pr = (r[q] - 1) / (n - 1) if n > 1 else 0.5
            out[i_] += (pr if GOOD[k] else 1 - pr)
    return [None if o is None else 100 * o / len(parts) for o in out]


def data(spec, u):
    if spec.get("composite"):
        c = composite(spec["composite"], u)
        for f, v in zip(FE[u], c): f["p"]["composite"] = v
    fs = FE[u]; vars_ = [spec["y"]] + spec["x"] + spec["c"]; pois = spec["model"] == "poisson"
    ex = spec["exposure"] if pois else None; idx = []
    for i, f in enumerate(fs):
        p = f["p"]
        if any(p.get(v["key"]) is None for v in vars_) or (ex and p.get(ex) is None): continue
        if any(v["tf"].startswith("log1p") and p[v["key"]] <= -1 for v in vars_) or (ex and p[ex] <= 0): continue
        if pois and (p[spec["y"]["key"]] < 0 or p[spec["y"]["key"]] != int(p[spec["y"]["key"]])): continue
        idx.append(i)
    n = len(idx)

    def col(v):
        a = [float(fs[i]["p"][v["key"]]) for i in idx]
        if v["tf"].startswith("log1p"): a = [math.log1p(t) for t in a]
        if v["tf"].startswith("asinh"): a = [math.asinh(t) for t in a]
        if v["tf"].endswith("z"):
            m = sum(a) / n; s = math.sqrt(sum((t - m) ** 2 for t in a) / (n - 1)); a = [(t - m) / s for t in a]
        return a
    y = col(spec["y"]); cols = [col(v) for v in spec["x"] + spec["c"]]
    X = [[1.0] + [c[i] for c in cols] for i in range(n)]
    off = [math.log(fs[i]["p"][ex]) for i in idx] if ex else [0.0] * n
    return idx, y, X, off


def ols(y, X):
    n, k = len(X), len(X[0])
    B = inv(xtwx(X, [1.0] * n)); Xty = [sum(X[i][a] * y[i] for i in range(n)) for a in range(k)]
    beta = [sum(B[a][b] * Xty[b] for b in range(k)) for a in range(k)]
    fit = [sum(X[i][a] * beta[a] for a in range(k)) for i in range(n)]; e = [y[i] - fit[i] for i in range(n)]
    sse = sum(t * t for t in e); my = sum(y) / n; tss = sum((t - my) ** 2 for t in y); s2 = sse / (n - k)
    Vc = [[v * s2 for v in r] for r in B]
    Vr = [[v * n / (n - k) for v in r] for r in matmul(matmul(B, xtwx(X, [t * t for t in e])), B)]
    return dict(beta=beta, Vc=Vc, Vr=Vr, e=e, B=B, r2=1 - sse / tss, adj=1 - (sse / (n - k)) / (tss / (n - 1)), df=n - k)


def poisson(y, X, off):
    n, k = len(X), len(X[0])
    my = sum(y) / n; beta = [math.log(my) - (sum(off) / n)] + [0.0] * (k - 1)
    for it in range(200):
        mu = [math.exp(off[i] + sum(X[i][a] * beta[a] for a in range(k))) for i in range(n)]
        g = [sum(X[i][a] * (y[i] - mu[i]) for i in range(n)) for a in range(k)]
        Hi = inv(xtwx(X, mu)); step = [sum(Hi[a][b] * g[b] for b in range(k)) for a in range(k)]
        beta = [b + s for b, s in zip(beta, step)]
        if max(abs(s) for s in step) < 1e-13: break
    mu = [math.exp(off[i] + sum(X[i][a] * beta[a] for a in range(k))) for i in range(n)]
    B = inv(xtwx(X, mu))
    Vr = [[v * n / (n - 1) for v in r] for r in matmul(matmul(B, xtwx(X, [(y[i] - mu[i]) ** 2 for i in range(n)])), B)]
    lf = lambda t: math.lgamma(t + 1)
    ll = sum(y[i] * math.log(mu[i]) - mu[i] - lf(y[i]) for i in range(n))
    se_ = sum(math.exp(o) for o in off); sy = sum(y)
    ll0 = sum((y[i] * math.log(math.exp(off[i]) * sy / se_) if y[i] > 0 else 0) - math.exp(off[i]) * sy / se_ - lf(y[i]) for i in range(n))
    pr = [(y[i] - mu[i]) / math.sqrt(mu[i]) for i in range(n)]
    return dict(beta=beta, Vc=B, Vr=Vr, e=pr, pseudo=1 - ll / ll0, disp=sum(t * t for t in pr) / (n - k), ll=ll)


# ---- permutations ------------------------------------------------------------------------------
def mulberry32(seed):
    st = [seed & 0xFFFFFFFF]
    imul = lambda x, y: ((x & 0xFFFFFFFF) * (y & 0xFFFFFFFF)) & 0xFFFFFFFF

    def rnd():
        a = (st[0] + 0x6D2B79F5) & 0xFFFFFFFF; st[0] = a
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd


def shuffle(p, rnd):
    for i in range(len(p) - 1, 0, -1):
        j = math.floor(rnd() * (i + 1)); p[i], p[j] = p[j], p[i]


def ranks(a):
    o = sorted(range(len(a)), key=lambda i: a[i]); r = [0.0] * len(a); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and a[o[j + 1]] == a[o[i]]: j += 1
        for t in range(i, j + 1): r[o[t]] = (i + j) / 2 + 1
        i = j + 1
    return r


def prep(a):
    n = len(a); m = 0.0
    for t in a: m += t
    m /= n; c = [t - m for t in a]; s = 0.0
    for t in c: s += t * t
    return c, math.sqrt(s)


def dot(a, b):
    s = 0.0
    for x, y in zip(a, b): s += x * y
    return s


def corrperm(y, xs, R, seed):
    Yc, Ys = prep(y); YRc, YRs = prep(ranks(y)); out = []
    for x in xs:
        Pc, Ps = prep(x); PRc, PRs = prep(ranks(x))
        out.append(dict(Pc=Pc, Ps=Ps, PRc=PRc, PRs=PRs, r=dot(Pc, Yc) / (Ps * Ys), rho=dot(PRc, YRc) / (PRs * YRs), cr=0, cs=0))
    rnd = mulberry32(seed); p = list(range(len(y)))
    for _ in range(R):
        shuffle(p, rnd)
        for o in out:
            a = 0.0; b = 0.0
            for i in range(len(y)):
                a += o["Pc"][i] * Yc[p[i]]; b += o["PRc"][i] * YRc[p[i]]
            if abs(a / (o["Ps"] * Ys)) >= abs(o["r"]) - 1e-12: o["cr"] += 1
            if abs(b / (o["PRs"] * YRs)) >= abs(o["rho"]) - 1e-12: o["cs"] += 1
    return [dict(r=o["r"], pr=(o["cr"] + 1) / (R + 1), rho=o["rho"], ps=(o["cs"] + 1) / (R + 1)) for o in out]


# ---- spatial weights and Moran's I -------------------------------------------------------------
def polys(g):
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]


def contiguity(u):
    fs = FE[u]; byv = {}
    for i, f in enumerate(fs):
        for p in polys(f["geom"]):
            for ring in p:
                for x, y in ring:
                    s = byv.setdefault((x, y), [])
                    if i not in s: s.append(i)
    nb = [set() for _ in fs]
    for s in byv.values():
        for a in s:
            for b in s:
                if a != b: nb[a].add(b)
    return [sorted(s) for s in nb]


def centroid(f):
    A = cx = cy = 0.0
    for p in polys(f["geom"]):
        for k, r in enumerate(p):
            a = x = y = 0.0
            for m in range(len(r) - 1):
                c = r[m][0] * r[m + 1][1] - r[m + 1][0] * r[m][1]
                a += c; x += (r[m][0] + r[m + 1][0]) * c; y += (r[m][1] + r[m + 1][1]) * c
            s = (1 if k == 0 else -1) * (1 if a > 0 else -1 if a < 0 else 0)
            A += s * a / 2; cx += s * x; cy += s * y
    return cx / (6 * A), cy / (6 * A)


def moran(spec, u, idx, e, X=None, B=None):
    n = len(idx); pos = {f: j for j, f in enumerate(idx)}
    if spec["weights"] == "knn":
        k = max(1, min(spec.get("k") or 6, n - 1)); C = [centroid(FE[u][f]) for f in idx]; cl = math.cos(math.pi / 6); nb = []
        for i, a in enumerate(C):
            d = sorted((((a[0] - b[0]) * cl) ** 2 + (a[1] - b[1]) ** 2, j) for j, b in enumerate(C) if j != i)
            nb.append(sorted(j for _, j in d[:k]))
    else:
        allnb = contiguity(u); nb = [[pos[g] for g in allnb[f] if g in pos] for f in idx]
    iso = sum(1 for a in nb if not a); S0 = n - iso
    m = 0.0
    for t in e: m += t
    m /= n; z = [t - m for t in e]; zz = 0.0
    for t in z: zz += t * t

    def I(p):
        s = 0.0
        for i in range(n):
            a = nb[i]
            if not a: continue
            l = 0.0
            for j in a: l += z[p[j]] if p else z[j]
            s += (z[p[i]] if p else z[i]) * l / len(a)
        return n / S0 * s / zz
    I0 = I(None)
    if X is not None:
        return dict(I=I0, iso=iso, **cliff_ord(nb, X, B, S0))
    R = spec["mperms"]; rnd = mulberry32(spec["seed"] + 1); p = list(range(n)); sims = []
    for _ in range(R):
        shuffle(p, rnd); sims.append(I(p))
    ms = sum(sims) / R; dev = abs(I0 - ms)
    larger = sum(1 for s_ in sims if abs(s_ - ms) >= dev - 1e-12)
    return dict(I=I0, EI=ms, p=(larger + 1) / (R + 1), iso=iso)


def dense_W(nb):
    n = len(nb); W = [[0.0] * n for _ in range(n)]
    for i, a in enumerate(nb):
        for j in a: W[i][j] = 1 / len(a)
    return W


def cliff_ord(nb, X, B, S0):
    """E[I] and Var[I] for OLS residuals from dense MW and MW' (M = I - X B X')."""
    n, k = len(X), len(X[0]); W = dense_W(nb)
    XB = [[sum(X[i][a] * B[a][b] for a in range(k)) for b in range(k)] for i in range(n)]
    XtW = [[sum(X[i][a] * W[i][j] for i in range(n) if W[i][j]) for j in range(n)] for a in range(k)]   # X'W
    XtWt = [[sum(X[i][a] * W[j][i] for i in range(n) if W[j][i]) for j in range(n)] for a in range(k)]  # X'W'
    MW = [[W[i][j] - sum(XB[i][a] * XtW[a][j] for a in range(k)) for j in range(n)] for i in range(n)]
    MWt = [[W[j][i] - sum(XB[i][a] * XtWt[a][j] for a in range(k)) for j in range(n)] for i in range(n)]
    trMW = sum(MW[i][i] for i in range(n))
    trMWMWt = sum(MW[i][j] * MWt[j][i] for i in range(n) for j in range(n))
    trMWMW = sum(MW[i][j] * MW[j][i] for i in range(n) for j in range(n))
    c = n / S0; EI = c * trMW / (n - k)
    VI = c * c * (trMWMWt + trMWMW + trMW * trMW) / ((n - k) * (n - k + 2)) - EI * EI
    return dict(EI=EI, VI=VI)


def conley_ref(C, X, uvec, B, cuts, fac):
    """Brute-force Conley covariance for every cutoff: B (sum_ij K u_i u_j x_i x_j') B * fac."""
    n, k = len(X), len(X[0]); KM = 6371.0088 * math.pi / 180; out = []
    G = [[X[i][a] * uvec[i] for a in range(k)] for i in range(n)]
    Ms = [[[0.0] * k for _ in range(k)] for _ in cuts]
    for i in range(n):
        for j in range(n):
            dy = (C[i][1] - C[j][1]) * KM
            dx = (C[i][0] - C[j][0]) * KM * math.cos((C[i][1] + C[j][1]) * math.pi / 360)
            d = math.hypot(dx, dy)
            for c, cut in enumerate(cuts):
                if d < cut:
                    w = 1 - d / cut
                    for a in range(k):
                        ga = G[i][a] * w
                        if ga:
                            for b_ in range(k): Ms[c][a][b_] += ga * G[j][b_]
    for M in Ms:
        V = [[v * fac for v in r] for r in matmul(matmul(B, M), B)]
        out.append(V if all(V[j][j] > 0 for j in range(k)) else None)
    return out


# Check the dense Cliff-Ord code itself first: with only an intercept, Var[I] must equal the classical
# normality-assumption variance (n^2 S1 - n S2 + 3 S0^2) / ((n^2 - 1) S0^2) - E^2, E = -1/(n-1).
def _self_check():
    nb = contiguity("district"); n = len(nb); S0 = sum(1 for a in nb if a)
    W = dense_W(nb); S1 = 0.5 * sum((W[i][j] + W[j][i]) ** 2 for i in range(n) for j in range(n))
    S2 = sum((sum(W[i]) + sum(W[j][i] for j in range(n))) ** 2 for i in range(n))
    X = [[1.0] for _ in range(n)]; B = [[1 / n]]
    co = cliff_ord(nb, X, B, S0); E = -1 / (n - 1)
    VN = (n * n * S1 - n * S2 + 3 * S0 * S0) / ((n * n - 1) * S0 * S0) - E * E
    assert abs(co["EI"] - E) < 1e-12 and abs(co["VI"] - VN) / VN < 1e-10, (co, E, VN)
    print(f"self-check: intercept-only Cliff-Ord equals the classical normality variance ({co['VI']:.12g} vs {VN:.12g})")


_self_check()


# ---- compare -----------------------------------------------------------------------------------
worst = {}


def cmp(name, a, b, exact=False):
    if a is None or b is None:
        print(f"   {name}: missing ({a}, {b})"); worst[name] = float("inf"); return
    d = abs(a - b) if exact else abs(a - b) / max(abs(b), 1e-300)
    worst[name] = max(worst.get(name, 0.0), d)


for e in LOG:
    if e.get("error"): continue
    s = e["spec"]; u = e["unit"]
    idx, y, X, off = data(s, u)
    pois = s["model"] == "poisson"
    print(f"#{e['id']} {u} {s['model']} n={len(idx)} (page {e['n']}): {s['y']['key']} ~ {[v['key'] for v in s['x']]} + {[v['key'] for v in s['c']]}")
    cmp("n (exact)", len(idx), e["n"], True)
    F = poisson(y, X, off) if pois else ols(y, X)
    df = None if pois else F["df"]; q = 1.959963984540054 if pois else q_t975(df)
    for j, t in enumerate(e["terms"]):
        b = F["beta"][j]; seR = math.sqrt(F["Vr"][j][j]); seC = math.sqrt(F["Vc"][j][j])
        cmp("coef", t["b"], b); cmp("SE robust", t["seR"], seR); cmp("SE classical", t["seC"], seC)
        pR = p_norm(b / seR) if pois else p_t(b / seR, df); pC = p_norm(b / seC) if pois else p_t(b / seC, df)
        if not e.get("few"):
            cmp("p robust (abs)", t["pR"], pR, True); cmp("p classical (abs)", t["pC"], pC, True)
            cmp("CI robust", t["loR"], b - q * seR); cmp("CI robust", t["hiR"], b + q * seR)
        if j == 1:
            print(f"   x1: b={b:.10g} seHC={seR:.10g} p={pR:.6g} | page b={t['b']:.10g} se={t['seR']:.10g} p={t['pR']}")
    k = len(X[0]); bq = F["beta"][1:]; Vi = inv([r[1:] for r in F["Vr"][1:]])
    W = sum(bq[a] * Vi[a][b] * bq[b] for a in range(k - 1) for b in range(k - 1))
    if e.get("few"):
        pass
    elif pois:
        cmp("Wald stat", e["wald"]["stat"], W); cmp("Wald p (abs)", e["wald"]["p"], p_chi2(W, k - 1), True)
        cmp("pseudo-R2", e["pseudo"], F["pseudo"]); cmp("dispersion", e["disp"], F["disp"]); cmp("log-lik", e["ll"], F["ll"])
    else:
        cmp("Wald stat", e["wald"]["stat"], W / (k - 1)); cmp("Wald p (abs)", e["wald"]["p"], p_F(W / (k - 1), k - 1, df), True)
        cmp("R2 (abs)", e["r2"], F["r2"], True); cmp("adj R2 (abs)", e["adj"], F["adj"], True)
    if u != "hex":
        M = moran(s, u, idx, F["e"], None if pois else X, None if pois else F["B"])
        cmp("Moran I", e["moran"]["I"], M["I"]); cmp("Moran E[I]", e["moran"]["EI"], M["EI"])
        cmp("Moran isolates (exact)", e["moran"]["iso"], M["iso"], True)
        if e.get("few"):  # below 10 residual df the page prints no Moran p
            cmp("Moran p suppressed when few (exact)", 0 if e["moran"]["p"] is None else 1, 0, True)
        elif pois:
            cmp("Moran perm p (exact)", e["moran"]["p"], M["p"], True)
        else:
            if M["VI"] > 0:
                cmp("Moran Var[I] (Cliff-Ord)", e["moran"]["VI"], M["VI"])
                zr = (M["I"] - M["EI"]) / math.sqrt(M["VI"]); cmp("Moran p (abs)", e["moran"]["p"], p_norm(zr), True)  # two-sided
            else:  # too few units for a positive variance: the page must say so rather than print a p
                cmp("Moran Var[I] <= 0 reported as missing (exact)", 0 if e["moran"]["VI"] is None and e["moran"]["p"] is None else 1, 0, True)
        print(f"   Moran I={M['I']:.10g} E={M['EI']:.6g} | page I={e['moran']['I']:.10g} E={e['moran']['EI']:.6g} p={e['moran']['p']}")
        # Conley, brute force
        Cc = [centroid(FE[u][f]) for f in idx]
        uvec = [y[i] - math.exp(off[i] + sum(X[i][a] * F["beta"][a] for a in range(k))) for i in range(len(idx))] if pois else F["e"]
        VK = conley_ref(Cc, X, uvec, F["B"] if "B" in F else F["Vc"], e["cuts"], len(idx) / (len(idx) - 1) if pois else len(idx) / (len(idx) - k))
        for j, t in enumerate(e["terms"]):
            for ci, V in enumerate(VK):
                if V is None or t["seK"][ci] is None:
                    cmp("Conley SE present (exact)", 0 if (V is None) == (t["seK"][ci] is None) else 1, 0, True)
                else:
                    cmp("Conley SE", t["seK"][ci], math.sqrt(V[j][j]))
        # Refits without Lahore and without each province (OLS: classical or robust p as chosen)
        if e.get("frag"):
            dist = [FE[u][f]["id"][:5] for f in idx]; prov = [d_[:3] for d_ in dist]
            def refit(keep):
                ii = [i for i in range(len(idx)) if keep[i]]
                Xs = [X[i] for i in ii]; ys = [y[i] for i in ii]; os_ = [off[i] for i in ii]
                return (poisson(ys, Xs, os_) if pois else ols(ys, Xs))["beta"]
            if e["frag"].get("lahore") and e["frag"]["lahore"].get("fit"):
                bl = refit([d_ != "PK617" for d_ in dist])
                for j in range(k): cmp("refit without Lahore", e["frag"]["lahore"]["fit"]["b"][j], bl[j])
            for o in e["frag"]["lopo"]:
                if o.get("fit"):
                    bp = refit([p_ != o["id"] for p_ in prov])
                    for j in range(k): cmp("refit without a province", o["fit"]["b"][j], bp[j])
    else:
        print("   (hexagon: Moran's I not recomputed; H3 neighbours need h3, which is not in the standard library)")
    if e.get("corr"):
        C = corrperm(y, [[r[j] for r in X] for j in range(1, k)], s["perms"], s["seed"])
        for a, b in zip(e["corr"], C):
            cmp("Pearson r", a["r"], b["r"]); cmp("Spearman rho", a["rho"], b["rho"])
            cmp("Pearson perm p (exact)", a["pr"], b["pr"], True); cmp("Spearman perm p (exact)", a["ps"], b["ps"], True)

print("\nLargest difference, page vs reference (relative unless marked abs/exact):")
for k_, v in worst.items():
    print(f"  {k_:28s} {v:.2e}")
# Tolerances. jStat's t CDF and inverse are accurate to about 1e-8 (measured: 2*cdf(-2, 10) is off by
# 7.6e-11, inv(0.975, 10) by 9.5e-9, 2*cdf(-0.9149, 132) by 4.7e-9), so p-values and CIs get 1e-6.
TOL = {"Moran p (abs)": 1e-6, "p robust (abs)": 1e-6, "p classical (abs)": 1e-6, "Wald p (abs)": 1e-6, "CI robust": 1e-6, "R2 (abs)": 1e-10, "adj R2 (abs)": 1e-10}
bad = {k_: v for k_, v in worst.items() if v > TOL.get(k_, 0 if "exact" in k_ else 1e-9)}
print("MATCH" if not bad else f"MISMATCH: {bad}")
sys.exit(1 if bad else 0)
