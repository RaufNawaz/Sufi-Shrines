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

Usage (repo root): python -I pipeline/gis/viewer/tests/check_conjecture_reference.py \n    pipeline/gis/viewer/index.html <outdir>/cj_results.json
(cj_results.json is written by tests/test_conjecture.cjs; it is the page's own JSON export of the log.)
Exits non-zero on any mismatch beyond the stated tolerances.
"""
import base64, gzip, json, math, re, sys

html_path, res_path = sys.argv[1], sys.argv[2]
h = open(html_path, encoding="utf-8").read()
D = json.loads(gzip.decompress(base64.b64decode(json.loads(re.findall(r'atob\(("[A-Za-z0-9+/=]*")\)', h)[0]))))
LOG = json.load(open(res_path, encoding="utf-8"))["log"]


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
def data(spec, u):
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
    I0 = I(None); EI = -1 / (n - 1)
    if X is not None:
        k = len(X[0]); lag = [[(sum(X[j][b] for j in nb[i]) / len(nb[i])) if nb[i] else 0.0 for i in range(n)] for b in range(k)]
        XWX = [[sum(X[i][a] * lag[b][i] for i in range(n)) for b in range(k)] for a in range(k)]
        tr = sum(B[a][b] * XWX[b][a] for a in range(k) for b in range(k)); EI = n / S0 * -tr / (n - k)
    R = spec["mperms"]; rnd = mulberry32(spec["seed"] + 1); p = list(range(n)); sims = []
    for _ in range(R):
        shuffle(p, rnd); sims.append(I(p))
    ms = sum(sims) / R; up = I0 >= ms
    larger = sum(1 for s in sims if (s >= I0 - 1e-12 if up else s <= I0 + 1e-12))
    return dict(I=I0, EI=EI, p=(larger + 1) / (R + 1), iso=iso)


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
        cmp("p robust (abs)", t["pR"], pR, True); cmp("p classical (abs)", t["pC"], pC, True)
        cmp("CI robust", t["loR"], b - q * seR); cmp("CI robust", t["hiR"], b + q * seR)
        if j == 1:
            print(f"   x1: b={b:.10g} seHC={seR:.10g} p={pR:.6g} | page b={t['b']:.10g} se={t['seR']:.10g} p={t['pR']:.6g}")
    k = len(X[0]); bq = F["beta"][1:]; Vi = inv([r[1:] for r in F["Vr"][1:]])
    W = sum(bq[a] * Vi[a][b] * bq[b] for a in range(k - 1) for b in range(k - 1))
    if pois:
        cmp("Wald stat", e["wald"]["stat"], W); cmp("Wald p (abs)", e["wald"]["p"], p_chi2(W, k - 1), True)
        cmp("pseudo-R2", e["pseudo"], F["pseudo"]); cmp("dispersion", e["disp"], F["disp"]); cmp("log-lik", e["ll"], F["ll"])
    else:
        cmp("Wald stat", e["wald"]["stat"], W / (k - 1)); cmp("Wald p (abs)", e["wald"]["p"], p_F(W / (k - 1), k - 1, df), True)
        cmp("R2 (abs)", e["r2"], F["r2"], True); cmp("adj R2 (abs)", e["adj"], F["adj"], True)
    if u != "hex":
        M = moran(s, u, idx, F["e"], None if pois else X, None if pois else F["B"])
        cmp("Moran I", e["moran"]["I"], M["I"]); cmp("Moran E[I]", e["moran"]["EI"], M["EI"])
        cmp("Moran perm p (exact)", e["moran"]["p"], M["p"], True); cmp("Moran isolates (exact)", e["moran"]["iso"], M["iso"], True)
        print(f"   Moran I={M['I']:.10g} p={M['p']} | page I={e['moran']['I']:.10g} p={e['moran']['p']}")
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
TOL = {"p robust (abs)": 1e-6, "p classical (abs)": 1e-6, "Wald p (abs)": 1e-6, "CI robust": 1e-6, "R2 (abs)": 1e-10, "adj R2 (abs)": 1e-10}
bad = {k_: v for k_, v in worst.items() if v > TOL.get(k_, 0 if "exact" in k_ else 1e-9)}
print("MATCH" if not bad else f"MISMATCH: {bad}")
sys.exit(1 if bad else 0)
