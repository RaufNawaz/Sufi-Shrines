"""
Run the viewer's tests in Stata on this computer (Rauf, 30 October 2026: "running the tests ... should
be done on the backend in Stata"; then "have it run in the background"). Rebuilt 31 October 2026
(protocol 2, HANDOVER 9.458): the page no longer sends Stata code.

The viewer (pipeline/gis/viewer/index.html, opened from disk) sends a test as data: the model, the
variables and their transforms, the standard errors and fixed effects, and the rows. This service checks
every field against a fixed schema, writes the do-file itself from the templates below, runs it in Stata
in batch mode, and returns Stata's full results table, fit statistics, diagnostics, a wild cluster
bootstrap, robustness estimators and Stata's log. The data and model lines it writes are the same, line
for line, as the code the page shows for copying (tests/test_stata_parity.cjs holds them equal).

Safety. A local service that runs Stata can be reached by any web page open in the browser, and Stata can
run shell commands, so:
  - it listens on 127.0.0.1 only, and answers only requests whose Host is 127.0.0.1 or localhost at its
    own port (a DNS-rebinding page names its own host);
  - every request must carry a token (made once, kept outside the repository in
    %LOCALAPPDATA%\\ShrinesStataService\\token.txt; --new-token replaces it);
  - a browser request must come from a page opened from disk (Origin "null"); any other origin is refused;
  - **no text from the request becomes Stata code.** Names must match a strict pattern and avoid
    reserved names; the model, SEs, fixed effects and transforms come from closed lists; data values
    must be ids, group codes or numbers in a fixed format. Anything else is refused before Stata starts;
  - one Stata at a time: a second request while one runs is told "busy" at once, and a run that passes
    the time limit is stopped with its whole process tree.

Usage (PowerShell or a terminal, from the repo root):
  python pipeline/gis/viewer/stata_service/stata_service.py            # serves on 127.0.0.1:8765
  python pipeline/gis/viewer/stata_service/stata_service.py --check    # run one sample test in Stata, exit
  python pipeline/gis/viewer/stata_service/stata_service.py --new-token
  python pipeline/gis/viewer/stata_service/stata_service.py --emit request.json   # the do-file; no Stata
Stop with Ctrl+C. Nothing runs at startup or after a reboot unless you start it.
Unit tests, no Stata needed: npm run test:stata
Start Stata from PowerShell or cmd: from the agent's sandboxed Git Bash it hung with no log (31 Oct 2026).
"""
import argparse, hashlib, json, math, os, re, secrets, shutil, subprocess, sys, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROTOCOL = 2
STATA = os.environ.get("SHRINES_STATA", r"C:\Program Files\StataNow19\StataMP-64.exe")
PORT = 8765
TIMEOUT = 300                  # seconds per run
TOKEN_FILE = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "ShrinesStataService" / "token.txt"
MAX_BYTES = 16_000_000         # a hexagon test is ~19,000 rows, a few MB
MAX_ROWS = 60_000
LOCK = threading.Lock()        # one Stata at a time
SEED = 20261030                # the viewer's seed, used for the wild bootstrap too
BOOT_REPS = 9999
ADO = ("boottest", "reghdfe", "ppmlhdfe", "ftools")

# ---- the schema ----------------------------------------------------------------------------------
UNITS = ("hex", "tehsil", "district", "province")
GROUP_AT = {"province": ("hex", "tehsil", "district"), "district": ("hex", "tehsil")}   # in the data, clusters
FE_AT = {"province": ("hex", "tehsil", "district"), "district": ("tehsil",)}            # fixed effects
TFS = ("none", "log1p", "z", "log1p_z", "asinh", "asinh_z")
SE_OF = {"ols": ("classical", "hc1", "cl_province", "cl_district"),
         "poisson": ("robust", "cl_province", "cl_district")}
COL = re.compile(r"[a-z][a-z0-9_]{0,31}")
RESERVED = re.compile(r"y|id|touse|province|district|[xc]\d+|str\d+|byte|int|long|float|double|strl|"
                      r"if|in|using|with|g_\w*")
ID = re.compile(r"[A-Za-z0-9_-]{1,40}")
GCODE = re.compile(r"[A-Za-z0-9]{0,12}")
NUM = re.compile(r"-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d{1,3})?")
TOP_KEYS = {"protocol", "test", "model", "se", "fe", "exposure", "y", "x", "c", "columns", "groups",
            "rows", "extras"}


class Refused(ValueError):
    """A request that does not fit the schema. The message says which field."""

    def __init__(self, msg, kind="refused"):
        super().__init__(msg)
        self.kind = kind


def _var(v, where):
    if not isinstance(v, dict) or set(v) != {"col", "tf"}:
        raise Refused(f"{where}: expected {{col, tf}}")
    if v["tf"] not in TFS:
        raise Refused(f"{where}: unknown transform")
    if not isinstance(v["col"], str):
        raise Refused(f"{where}: col must be a name")
    return {"col": v["col"], "tf": v["tf"]}


def validate(req):
    """Check a request against the schema and return it normalised. Raises Refused."""
    if not isinstance(req, dict):
        raise Refused("expected a JSON object")
    if "code" in req and "protocol" not in req:
        raise Refused("this service no longer takes Stata code: the page is older than the service. "
                      "Rebuild index.html (rebuild_from_embedded.py) and reload it", "protocol")
    if req.get("protocol") != PROTOCOL:
        raise Refused(f"the page speaks protocol {str(req.get('protocol'))[:10]}, this service {PROTOCOL}. "
                      "Rebuild index.html or restart the service so the two match", "protocol")
    extra, missing = set(req) - TOP_KEYS, TOP_KEYS - set(req)
    if extra or missing:
        raise Refused(f"fields: unexpected {sorted(extra)[:5]}, missing {sorted(missing)}")
    t = req["test"]
    if not isinstance(t, dict) or set(t) != {"id", "unit"}:
        raise Refused("test: expected {id, unit}")
    if type(t["id"]) is not int or not 0 <= t["id"] <= 10**9:
        raise Refused("test.id must be a whole number")
    unit = t["unit"]
    if unit not in UNITS:
        raise Refused("test.unit: unknown unit")
    model = req["model"]
    if model not in SE_OF:
        raise Refused("model: ols or poisson")
    se = req["se"]
    if se not in SE_OF[model]:
        raise Refused(f"se: not one of {SE_OF[model]} for {model}")
    if not isinstance(req["extras"], bool):
        raise Refused("extras must be true or false")

    cols = req["columns"]
    if not isinstance(cols, list) or not 1 <= len(cols) <= 40:
        raise Refused("columns: 1 to 40 names")
    for k in cols:
        if not isinstance(k, str) or not COL.fullmatch(k) or RESERVED.fullmatch(k):
            raise Refused(f"columns: {str(k)[:40]!r} is not an allowed name")
    if len(set(cols)) != len(cols):
        raise Refused("columns: a name appears twice")

    groups = req["groups"]
    allowed = sorted((g for g, at in GROUP_AT.items() if unit in at), reverse=True)
    if not isinstance(groups, list) or not all(isinstance(g, str) for g in groups) or \
            groups != [g for g in allowed if g in groups] or len(groups) != len(set(groups)):
        raise Refused(f"groups: a subset of {allowed}, in that order")

    fe = req["fe"]
    if fe is not None and (fe not in FE_AT or unit not in FE_AT[fe] or fe not in groups):
        raise Refused("fe: not available at this unit, or its group is not in the data")
    cl = se[3:] if se.startswith("cl_") else None
    if cl and cl not in groups:
        raise Refused("se: clusters not available at this unit, or not in the data")

    y = _var(req["y"], "y")
    xs, cs = req["x"], req["c"]
    if not isinstance(xs, list) or not 1 <= len(xs) <= 10:
        raise Refused("x: 1 to 10 explanatory variables")
    if not isinstance(cs, list) or len(cs) > 20:
        raise Refused("c: at most 20 controls")
    xs = [_var(v, f"x[{i}]") for i, v in enumerate(xs)]
    cs = [_var(v, f"c[{i}]") for i, v in enumerate(cs)]
    used = [v["col"] for v in [y, *xs, *cs]]
    if len(set(used)) != len(used):
        raise Refused("a variable appears twice")
    ex = req["exposure"]
    if model != "poisson" and ex is not None:
        raise Refused("exposure is for Poisson only")
    if any(k not in cols for k in used) or (ex is not None and ex not in cols):
        raise Refused("a variable or the exposure is not one of the columns")
    if set(cols) != set(used) | ({ex} if ex else set()):
        raise Refused("columns: exactly the variables of the test, and the exposure")
    if model == "poisson" and y["tf"] != "none":
        raise Refused("Poisson needs an untransformed count outcome")

    rows = req["rows"]
    width = 1 + len(groups) + len(cols)
    if not isinstance(rows, list) or not 2 <= len(rows) <= MAX_ROWS:
        raise Refused(f"rows: 2 to {MAX_ROWS:,}")
    for i, r in enumerate(rows):
        if not isinstance(r, list) or len(r) != width:
            raise Refused(f"rows[{i}]: expected {width} cells")
        if not isinstance(r[0], str) or not ID.fullmatch(r[0]):
            raise Refused(f"rows[{i}]: the id must be letters, digits, _ or -")
        for v in r[1:1 + len(groups)]:
            if v is not None and (not isinstance(v, str) or not GCODE.fullmatch(v)):
                raise Refused(f"rows[{i}]: a group code must be letters and digits")
        for v in r[1 + len(groups):]:
            if v is not None and (not isinstance(v, str) or not NUM.fullmatch(v) or not math.isfinite(float(v))):
                raise Refused(f"rows[{i}]: {str(v)[:30]!r} is not a number")
    return {"id": t["id"], "unit": unit, "model": model, "se": se, "cl": cl, "fe": fe, "exposure": ex,
            "y": y, "x": xs, "c": cs, "columns": cols, "groups": groups, "rows": rows,
            "extras": req["extras"]}


# ---- the do-file -----------------------------------------------------------------------------------
def data_csv(s):
    """The test's data as CSV, exactly as the page puts it beside a run (its SHA-256 is recorded)."""
    head = ",".join(["id", *s["groups"], *s["columns"]])
    return head + "\n" + "".join(",".join("" if v is None else v for v in r) + "\n" for r in s["rows"])


def _names(s):
    return [f"x{i + 1}" for i in range(len(s["x"]))] + [f"c{i + 1}" for i in range(len(s["c"]))]


def _vce(s):
    return f"vce(cluster g_{s['cl']})" if s["cl"] else "vce(robust)"


def main_command(s):
    rhs = " ".join(_names(s)) + (f" i.g_{s['fe']}" if s["fe"] else "")
    if s["model"] == "poisson":
        return f"poisson y {rhs} if touse, {_vce(s)}" + (f" exposure({s['exposure']})" if s["exposure"] else "")
    return f"regress y {rhs} if touse" + ("" if s["se"] == "classical" else ", " + _vce(s))


def core_lines(s):
    """The data and the model: the same lines, in the same order, as stataCode() in template.html writes
    (its comments aside)."""
    rows, groups, cols = s["rows"], s["groups"], s["columns"]
    ng = len(groups)
    idw = max(1, *(len(r[0]) for r in rows))
    gw = [max(1, *(len(r[1 + j] or "") for r in rows)) for j in range(ng)]
    L = ["clear",
         f"input str{idw} id" + "".join(f" str{gw[j]} {g}" for j, g in enumerate(groups))
         + f" double({' '.join(cols)})"]
    for r in rows:
        L.append(f'"{r[0]}" ' + "".join(f'"{v or ""}" ' for v in r[1:1 + ng])
                 + " ".join("." if v is None else v for v in r[1 + ng:]))
    L.append("end")
    L += [f"encode {g}, generate(g_{g})" for g in groups]
    vs = [("y", s["y"])] + list(zip(_names(s), s["x"] + s["c"]))
    for nm, v in vs:
        k, tf = v["col"], v["tf"]
        L.append(f"generate double {nm} = "
                 + (f"ln(1 + {k})" if tf.startswith("log1p") else f"asinh({k})" if tf.startswith("asinh") else k))
    ex, fe, cl = s["exposure"], s["fe"], s["cl"]
    L += ["mark touse",
          f"markout touse {' '.join(nm for nm, _ in vs)}" + (f" {ex}" if ex else "")
          + "".join(f" g_{g}" for g in groups if g in (fe, cl))]
    if ex:
        L.append(f"replace touse = 0 if {ex} <= 0")
    if s["model"] == "poisson" and fe:
        L += [f"bysort g_{fe}: egen double __any = max(y * touse)", "replace touse = 0 if __any == 0"]
    for nm, v in vs:
        if v["tf"].endswith("z"):
            L += [f"quietly summarize {nm} if touse", f"replace {nm} = ({nm} - r(mean)) / r(sd) if touse"]
    L.append(main_command(s))
    return L


MARK = "* ---- Shrines Stata service: results and extras ----"
# Straight after the model: keep its table and estimates, then define the writer and open results.tsv.
# Every line there is section, key, values, tab-separated; "." is Stata's missing value.
TAIL_HEAD = r"""matrix __T = r(table)
estimates store __main
capture program drop __row
program define __row
    args sec M
    local names : colnames `M'
    local k = colsof(`M')
    forvalues j = 1/`k' {
        local n : word `j' of `names'
        file write __fh "`sec'" _tab "`n'"
        forvalues i = 1/6 {
            file write __fh _tab %24.17g (`M'[`i',`j'])
        }
        file write __fh _n
    }
end
file open __fh using "results.tsv", write replace
file write __fh "meta" _tab "stata_version" _tab "`c(stata_version)'" _n
__row main __T
foreach __s in N r2 r2_a r2_p F chi2 p ll ll_0 df_r df_m N_clust {
    file write __fh "stat" _tab "`__s'" _tab %24.17g (e(`__s')) _n
}
capture noisily {
    quietly estat ic
    matrix __S = r(S)
    file write __fh "stat" _tab "aic" _tab %24.17g (__S[1,5]) _n
    file write __fh "stat" _tab "bic" _tab %24.17g (__S[1,6]) _n
}
if _rc file write __fh "err" _tab "ic" _tab (_rc) _n
foreach __p in @ADO@ {
    capture findfile `__p'.ado
    if _rc file write __fh "ado" _tab "`__p'" _tab "" _n
    else file write __fh "ado" _tab "`__p'" _tab "`r(fn)'" _n
}""".replace("@ADO@", " ".join(ADO))

VIF = r"""estat vif
local __k = 1
while "`r(name_`__k')'" != "" {
    file write __fh "vif" _tab "`r(name_`__k')'" _tab %24.17g (r(vif_`__k')) _n
    local ++__k
}"""
COOK = r"""predict double __cd if e(sample), cooksd
local __cut = 4 / e(N)
quietly count if __cd > `__cut' & !missing(__cd)
file write __fh "cook" _tab "cutoff" _tab %24.17g (`__cut') _tab %24.17g (r(N)) _n
preserve
quietly keep if __cd > `__cut' & !missing(__cd)
gsort -__cd
forvalues __i = 1/`=min(10, _N)' {
    local __id = id[`__i']
    file write __fh "cookid" _tab "`__id'" _tab %24.17g (__cd[`__i']) _n
}
restore"""
BOOT = r"""which boottest
boottest @X@, weighttype(webb) reps(@REPS@) seed(@SEED@) nograph
file write __fh "boot" _tab "@X@" _tab %24.17g (r(p)) _tab %24.17g (r(reps)) _n
capture matrix __CI = r(CI)
if !_rc {
    forvalues __i = 1/`=rowsof(__CI)' {
        file write __fh "bootci" _tab "@X@" _tab %24.17g (__CI[`__i',1]) _tab %24.17g (__CI[`__i',2]) _n
    }
}"""
NOINFL = r"if touse & !(__cd > `__cut' & !missing(__cd))"


def _block(name, body):
    """A section that may fail without stopping the run: its r() goes to results.tsv instead."""
    body = body.split("\n") if isinstance(body, str) else body
    return ["capture noisily {", "    estimates restore __main", *("    " + b for b in body), "}",
            f'if _rc file write __fh "err" _tab "{name}" _tab (_rc) _n', "capture restore"]


def _writes(sec, keys, src="r"):
    return [f'file write __fh "diag" _tab "{sec}" _tab "{k}" _tab %24.17g ({src}({k})) _n' for k in keys]


def _rob(key, cmd, margins=None):
    body = [cmd, "matrix __R = r(table)", f'file write __fh "robn" _tab "{key}" _tab %24.17g (e(N)) _n']
    if margins:
        body += [f"margins, dydx({margins})", "matrix __R = r(table)"]
    return _block(f"rob:{key}", body + [f"__row rob:{key} __R"])


def extras_lines(s):
    """Diagnostics, the wild cluster bootstrap and the robustness estimators, all after the main model."""
    names = _names(s)
    xn, xc = names[:len(s["x"])], " ".join(names)
    fe, cl, ex = s["fe"], s["cl"], s["exposure"]
    rhs = xc + (f" i.g_{fe}" if fe else "")
    exo = f" exposure({ex})" if ex else ""
    vce = _vce(s)
    ycol = s["y"]["col"]
    count_y = ycol.startswith("n_")
    hdfe = "district" in s["groups"] and fe != "district" and s["unit"] in ("hex", "tehsil")
    ols = f"quietly regress y {rhs} if touse"
    L = []
    if s["model"] == "ols":
        L += _block("vif", [ols, *VIF.split("\n")])
        L += _block("reset", [ols, "estat ovtest", *_writes("reset", ("F", "df", "df_r", "p"))])
        L += _block("hettest", [ols, "estat hettest", *_writes("hettest", ("chi2", "df", "p"))])
        L += _block("cook", [ols, *COOK.split("\n")])
    else:
        L += _block("ame", [f"margins, dydx({xc})", "matrix __R = r(table)", "__row ame __R"])
        L += _block("gof", [f"quietly poisson y {rhs} if touse{',' + exo if ex else ''}", "estat gof",
                            *_writes("gof", ("chi2_d", "p_d", "chi2_p", "p_p", "df"))])
        L += _block("overdisp", [f"quietly nbreg y {rhs} if touse{',' + exo if ex else ''}",
                                 *_writes("overdisp", ("alpha", "chi2_c"), "e"),
                                 'file write __fh "diag" _tab "overdisp" _tab "p" _tab %24.17g '
                                 '(chi2tail(1, e(chi2_c)) / 2) _n'])
    if cl:
        L += ["capture which boottest", 'if _rc file write __fh "err" _tab "boottest" _tab "missing" _n']
        for x in xn:
            L += _block(f"boot:{x}", BOOT.replace("@X@", x).replace("@REPS@", str(BOOT_REPS))
                        .replace("@SEED@", str(SEED)))
    if s["model"] == "ols":
        L += _rob("noinfl", f"regress y {rhs} {NOINFL}" + ("" if s["se"] == "classical" else ", " + vce))
        L += _rob("qreg", f"qreg y {rhs} if touse, vce(robust)")
        if hdfe:
            L += _rob("hdfe", f"reghdfe y {xc} if touse, absorb(g_district) {vce}")
        if count_y:
            L += _rob("pois", f"poisson {ycol} {rhs} if touse, {vce}")
    else:
        L += _rob("nbreg", f"nbreg y {rhs} if touse, {vce}{exo}")
        if hdfe:
            L += _rob("ppmlhdfe", f"ppmlhdfe y {xc} if touse, absorb(g_district) {vce}{exo}")
    if count_y:
        L += ["capture drop __anyy", f"generate byte __anyy = {ycol} > 0 if touse"]
        L += _rob("logit", f"logit __anyy {rhs} if touse, {vce}", margins=" ".join(xn))
    return L


def build_do(s):
    head = [f"* Test #{s['id']} from the Shrines and Welfare viewer, written by the Shrines Stata service "
            f"(protocol {PROTOCOL}).",
            "* To re-run: put this file in a folder, cd there in Stata, and type  do run.do  (writes results.tsv).",
            "version 19", "set more off"]
    tail = [MARK, *TAIL_HEAD.split("\n"), *(extras_lines(s) if s["extras"] else []),
            'file write __fh "end" _tab "ok" _n', "file close __fh"]
    return "\n".join(head + core_lines(s) + tail) + "\n"


# ---- reading the results back ---------------------------------------------------------------------------
def _num(t):
    """A number Stata wrote with %24.17g. Missing is "." or ".a" to ".z"; ".25" is a number."""
    t = t.strip()
    if not t or re.fullmatch(r"\.[a-z]?", t):
        return None
    v = float(t)
    return v if math.isfinite(v) else None


TERM = re.compile(r"(?:\d*(o)?\.)?([xc]\d+|_cons)")


def _terms(rows):
    """Rows of r(table) as dicts, for x, c and the constant (the first _cons only: nbreg has a second)."""
    out, seen = [], set()
    for name, vals in rows:
        m = TERM.fullmatch(name)
        if not m or m.group(2) in seen:
            continue
        seen.add(m.group(2))
        b, se, stat, p, lo, hi = (vals + [None] * 6)[:6]
        out.append({"term": m.group(2), "b": b, "se": se, "stat": stat, "p": p, "lo": lo, "hi": hi,
                    "omitted": bool(m.group(1))})
    return out


def _rows(lines):
    return [(f[0], [_num(v) for v in f[1:]]) for f in lines]


def ado_version(path):
    """The first '*!' line of an ado-file (its version), or None."""
    p = Path(path)
    if p.suffix.lower() != ".ado" or not p.is_file():
        return None
    with open(p, encoding="utf-8", errors="replace") as fh:
        for _, line in zip(range(40), fh):
            if line.startswith("*!"):
                return line[2:].strip()[:80]
    return None


def parse_results(text, s):
    sec = {}
    for line in text.splitlines():
        f = line.split("\t")
        sec.setdefault(f[0], []).append(f[1:])
    main = _terms(_rows(sec.get("main", [])))
    if s["model"] == "poisson":
        for t in main:
            for k, src in (("irr", "b"), ("irr_lo", "lo"), ("irr_hi", "hi")):
                t[k] = math.exp(t[src]) if t[src] is not None else None
    diags = {}
    for name, key, val in (f[:3] for f in sec.get("diag", []) if len(f) >= 3):
        diags.setdefault(name, {})[key] = _num(val)
    cook = None
    if sec.get("cook"):
        c = sec["cook"][0]
        cook = {"cutoff": _num(c[1]), "count": int(_num(c[2]) or 0),
                "top": [{"id": f[0], "cooksd": _num(f[1])} for f in sec.get("cookid", [])]}
    boot = {}
    for f in sec.get("boot", []):
        boot[f[0]] = {"term": f[0], "p": _num(f[1]), "reps": _num(f[2]), "ci": []}
    for f in sec.get("bootci", []):
        if f[0] in boot:
            boot[f[0]]["ci"].append([_num(f[1]), _num(f[2])])
    errs = [{"section": f[0], "rc": f[1].strip()} for f in sec.get("err", [])]
    rob = {}
    for f in sec.get("robn", []):
        rob[f[0]] = {"key": f[0], "n": _num(f[1]), "terms": [], "rc": None}
    for e in errs:
        if e["section"].startswith("rob:"):
            rob.setdefault(e["section"][4:], {"key": e["section"][4:], "n": None, "terms": []})["rc"] = e["rc"]
    for k, lines in sec.items():
        if k.startswith("rob:") and k[4:] in rob:
            rob[k[4:]]["terms"] = [t for t in _terms(_rows(lines)) if t["term"] != "_cons"]
    stats = {f[0]: _num(f[1]) for f in sec.get("stat", [])}
    meta = {f[0]: f[1].strip() for f in sec.get("meta", [])}
    fe_n = sum(1 for f in sec.get("main", []) if re.fullmatch(r"\d+o?\.g_\w+", f[0]))
    return {
        "complete": "end" in sec,
        "n": int(stats["N"]) if stats.get("N") is not None else None,
        "stat": "z" if s["model"] == "poisson" else "t",
        "table": main,
        "terms": [{"term": t["term"], "b": t["b"], "se": t["se"]} for t in main],
        "omitted": [t["term"] for t in main if t["omitted"]],
        "fe": {"group": s["fe"], "count": fe_n} if s["fe"] else None,
        "stats": stats,
        "vif": [{"term": f[0], "vif": _num(f[1])} for f in sec.get("vif", [])],
        "diagnostics": diags,
        "influential": cook,
        "ame": _terms(_rows(sec.get("ame", []))),
        "bootstrap": {"weights": "webb", "reps": BOOT_REPS, "seed": SEED, "cluster": s["cl"],
                      "rows": list(boot.values())} if s["cl"] and s["extras"] else None,
        "robustness": list(rob.values()),
        "errors": errs,
        "stata": {"version": meta.get("stata_version")},
        "ado": {f[0]: (ado_version(f[1].strip()) if len(f) > 1 and f[1].strip() else None)
                for f in sec.get("ado", [])},
    }


# ---- running Stata -------------------------------------------------------------------------------------
def kill_tree(proc):
    """Stop a process and everything it started."""
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        proc.kill()
    try:
        proc.wait(10)
    except subprocess.TimeoutExpired:
        proc.kill()


def run_process(args, cwd, timeout):
    """Run args; True if it finished, False if it passed the time limit and was stopped."""
    proc = subprocess.Popen(args, cwd=cwd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL)
    try:
        proc.wait(timeout)
        return True
    except subprocess.TimeoutExpired:
        kill_tree(proc)
        return False


def shown_log(log):
    """Stata's log without the echo of the data rows: from the first command after the input block."""
    cuts = [i for i in (log.find("\n. encode "), log.find("\n. generate double y =")) if i >= 0]
    return (log[min(cuts) + 1:] if cuts else log)[:2_000_000]


def run_stata(s, timeout=TIMEOUT):
    """Run a validated test in Stata. Returns the response body: ok, or a kind and an error."""
    if not Path(STATA).exists():
        return {"ok": False, "kind": "no_stata", "error": f"Stata not found at {STATA} (set SHRINES_STATA)"}
    do = build_do(s)
    d = Path(tempfile.mkdtemp(prefix="shrines_stata_"))
    t0 = time.time()
    try:
        (d / "run.do").write_bytes(do.encode("utf-8"))
        finished = run_process([STATA, "/e", "do", "run.do"], d, timeout)
        log = (d / "run.log").read_text(encoding="utf-8", errors="replace") if (d / "run.log").exists() else ""
        shown = shown_log(log)
        if not finished:
            return {"ok": False, "kind": "timeout", "log": shown[-20000:],
                    "error": f"Stata did not finish in {timeout} s and was stopped"}
        rcs = re.findall(r"^r\((\d+)\);\s*$", log, re.M)
        text = (d / "results.tsv").read_text(encoding="utf-8", errors="replace") \
            if (d / "results.tsv").exists() else ""
        if not text.startswith("meta"):
            return {"ok": False, "kind": "stata_error", "log": shown[-20000:],
                    "error": (f"Stata stopped with r({rcs[0]})" if rcs else "Stata wrote no result")
                    + " before the model's results: see the log"}
        r = parse_results(text, s)
        if not r["complete"]:
            return {"ok": False, "kind": "stata_error", "log": shown[-20000:],
                    "error": f"Stata stopped part way (r({rcs[-1] if rcs else '?'})): see the log"}
        if r["n"] is None or not r["table"]:
            return {"ok": False, "kind": "stata_error", "log": shown[-20000:],
                    "error": "Stata finished but returned no estimates"}
        return {"ok": True, "protocol": PROTOCOL, **r, "log": shown, "do_file": do,
                "data_sha256": hashlib.sha256(data_csv(s).encode("utf-8")).hexdigest(),
                "seconds": round(time.time() - t0, 2)}
    finally:
        shutil.rmtree(d, ignore_errors=True)


SAMPLE = {"protocol": PROTOCOL, "test": {"id": 0, "unit": "district"}, "model": "ols", "se": "cl_province",
          "fe": None, "exposure": None, "y": {"col": "v", "tf": "none"}, "x": [{"col": "w", "tf": "log1p"}],
          "c": [], "columns": ["v", "w"], "groups": ["province"], "extras": True,
          "rows": [[f"d{i}", f"P{i % 4}", str(1 + i % 7 + (i * 37) % 11 / 10), str(i % 13)] for i in range(40)]}
CHECK = {"checked": False}


def probe():
    """Run the sample test once, and keep Stata's version and the ado versions for /health."""
    r = run_stata(validate(SAMPLE))
    CHECK.update(checked=True, ok=r.get("ok", False), stata=r.get("stata"), ado=r.get("ado"),
                 failed=[e["section"] for e in r.get("errors", [])], error=r.get("error"))
    return r


# ---- the HTTP service ----------------------------------------------------------------------------------
def load_token(new=False):
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    if new or not TOKEN_FILE.exists():
        TOKEN_FILE.write_text(secrets.token_urlsafe(24), encoding="utf-8")
    return TOKEN_FILE.read_text(encoding="utf-8").strip()


def _no_dupes(pairs):
    keys = [k for k, _ in pairs]
    if len(set(keys)) != len(keys):
        raise Refused("a JSON key appears twice")
    return dict(pairs)


def _no_constants(c):
    raise Refused(f"{c} is not a number this service accepts")


def parse_json(raw):
    return json.loads(raw, object_pairs_hook=_no_dupes, parse_constant=_no_constants)


class Handler(BaseHTTPRequestHandler):
    token = ""
    timeout_s = TIMEOUT
    runner = staticmethod(run_stata)       # the unit tests put a stand-in here

    def log_message(self, fmt, *args):     # keep the console to one line per test
        pass

    def _send(self, status, body):
        data = json.dumps(body, allow_nan=False).encode()
        self.send_response(status)
        if self.headers.get("Origin") == "null":
            self.send_header("Access-Control-Allow-Origin", "null")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _fail(self, status, kind, error):
        self._send(status, {"ok": False, "kind": kind, "error": error})

    def _gate(self, need_token=True):
        port = self.server.server_address[1]
        if self.headers.get("Host") not in (f"127.0.0.1:{port}", f"localhost:{port}"):
            self._fail(421, "host", "wrong Host header: call http://127.0.0.1 at the service's port")
            return False
        if self.headers.get("Origin") not in (None, "null"):
            self._fail(403, "origin", "origin not allowed: open the viewer from disk")
            return False
        if need_token and not secrets.compare_digest(self.headers.get("X-Stata-Token", ""), self.token):
            self._fail(401, "auth", "wrong or missing token")
            return False
        return True

    def do_OPTIONS(self):
        if not self._gate(need_token=False):
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "null")
        self.send_header("Access-Control-Allow-Methods", "GET, POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Stata-Token")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        if self.path != "/health":
            return self._fail(404, "not_found", "not found")
        if self._gate():
            self._send(200, {"ok": True, "service": "shrines-stata", "protocol": PROTOCOL,
                             "stata_path": Path(STATA).name, "timeout": self.timeout_s,
                             "busy": LOCK.locked(), "check": dict(CHECK)})

    def do_POST(self):
        if self.path != "/run":
            return self._fail(404, "not_found", "not found")
        if not self._gate():
            return
        if (self.headers.get("Content-Type") or "").split(";")[0].strip() != "application/json":
            return self._fail(415, "bad_request", "send JSON (Content-Type: application/json)")
        try:
            n = int(self.headers.get("Content-Length") or "")
        except ValueError:
            return self._fail(400, "bad_request", "missing or malformed Content-Length")
        if n <= 0 or n > MAX_BYTES:
            return self._fail(413, "bad_request", f"body empty or over {MAX_BYTES:,} bytes")
        try:
            spec = validate(parse_json(self.rfile.read(n)))
        except Refused as e:
            print("refused:", str(e)[:160], flush=True)
            return self._fail(400, e.kind, f"refused: {e}")
        except (ValueError, UnicodeDecodeError, RecursionError):
            return self._fail(400, "bad_request", "the body is not valid JSON")
        if not LOCK.acquire(timeout=1):
            return self._fail(503, "busy", "Stata is running another test; this one was not started")
        try:
            res = self.runner(spec, self.timeout_s)
        except Exception as e:  # noqa: BLE001  (fail loudly, never silently)
            import traceback
            traceback.print_exc()
            res = {"ok": False, "kind": "internal", "error": f"the service failed: {type(e).__name__}: {e}"}
        finally:
            LOCK.release()
        print(f"test #{spec['id']} ({spec['unit']}, {spec['model']}):",
              f"ran in {res.get('seconds')} s" if res.get("ok")
              else f"FAILED ({res.get('kind')}) {str(res.get('error', ''))[:120]}", flush=True)
        status = 200 if res.get("ok") else \
            {"timeout": 504, "no_stata": 503, "internal": 500}.get(res.get("kind"), 422)
        self._send(status, res)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=PORT)
    ap.add_argument("--timeout", type=int, default=TIMEOUT, help="seconds per run (default %(default)s)")
    ap.add_argument("--check", action="store_true", help="run one sample test in Stata and exit")
    ap.add_argument("--new-token", action="store_true", help="replace the token (paste the new one into the viewer)")
    ap.add_argument("--emit", metavar="REQUEST_JSON",
                    help="validate a request; print its do-file and the data's SHA-256 as JSON. No Stata")
    a = ap.parse_args()
    if a.emit:
        try:
            s = validate(parse_json(Path(a.emit).read_bytes()))
        except Refused as e:
            print(json.dumps({"ok": False, "error": str(e)}))
            sys.exit(2)
        print(json.dumps({"ok": True, "core": core_lines(s), "do_file": build_do(s),
                          "data_sha256": hashlib.sha256(data_csv(s).encode("utf-8")).hexdigest()}))
        return
    if a.check:
        r = probe()
        print("Stata ran the sample:", "yes" if r.get("ok") else f"NO: {r.get('error')}")
        if r.get("ok"):
            print("Stata", r["stata"]["version"], "|",
                  ", ".join(f"{k} {v or 'MISSING'}" for k, v in r["ado"].items()))
            print("sections that failed:", [e["section"] for e in r["errors"]] or "none")
        else:
            print(r.get("log", "")[-3000:])
        sys.exit(0 if r.get("ok") and not r["errors"] else 1)
    Handler.token = load_token(new=a.new_token)
    Handler.timeout_s = a.timeout
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    print(f"Shrines Stata service, protocol {PROTOCOL}, on http://127.0.0.1:{a.port}  (Stata: {STATA})")
    print(f"Token (paste once into the viewer's 'Run in Stata on this computer' box): {Handler.token}")

    def startup_check():
        with LOCK:
            r = probe()
        print("Stata check:", "ok" if r.get("ok") else f"FAILED: {r.get('error')}", "|",
              ", ".join(f"{k} {v or 'MISSING'}" for k, v in (r.get("ado") or {}).items()), flush=True)
    threading.Thread(target=startup_check, daemon=True).start()
    print("Ctrl+C to stop.", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
