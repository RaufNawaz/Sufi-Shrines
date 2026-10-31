"""
Run the viewer's own Stata and R replication code in real Stata and R, and hold every coefficient and
standard error against the viewer's (added 30 October 2026; until then the generated code had never
been run, HANDOVER 9.421).

The code under test is exactly what the page writes (export_replication.cjs asks the page for it). This
script only appends a few lines that read the fitted model back out: in Stata, e(b) and e(V) of the
command the page wrote; in R, the value of the page's own last expression (coeftest(...) or summary(m)),
captured by assigning it rather than printing it. Nothing in the model lines is rewritten.

Usage (from the repo root), after test_conjecture.cjs and export_replication.cjs:
  python -I pipeline/gis/viewer/tests/check_stata_r.py <outdir> [--stata PATH] [--rscript PATH] [--tol 1e-6]

Exits 1 if any term differs by more than the relative tolerance, or if Stata or R fails on any test.
"""
import argparse, csv, json, re, subprocess, sys
from pathlib import Path

STATA = r"C:\Program Files\StataNow19\StataMP-64.exe"
RSCRIPT = r"C:\Program Files\R\R-4.6.1\bin\Rscript.exe"

STATA_TAIL = r"""
matrix __b = e(b)
matrix __V = e(V)
local __names : colnames __b
file open __fh using "stata_{id}.csv", write replace
file write __fh "term,b,se" _n
local __i = 0
foreach __n of local __names {{
    local ++__i
    file write __fh "`__n'," %24.17g (__b[1,`__i']) "," %24.17g (sqrt(__V[`__i',`__i'])) _n
}}
file write __fh "_N," %24.17g (e(N)) ",0" _n
file close __fh
"""

R_TAIL = """
.tab <- if (inherits(.res, "summary.lm")) coef(.res) else unclass(.res)
.out <- data.frame(term = rownames(.tab), b = .tab[, 1], se = .tab[, 2])
.out$term[.out$term == "(Intercept)"] <- "_cons"
.out <- rbind(.out, data.frame(term = "_N", b = nobs(m), se = 0))
write.csv(.out, "r_{id}.csv", row.names = FALSE)
"""


def r_capture(code):
    """Assign the page's last printed expression (coeftest(...) or summary(m)) to .res instead of printing it."""
    lines = code.rstrip("\n").split("\n")
    idx = [i for i, l in enumerate(lines) if re.match(r"^(coeftest\(|summary\(m\))", l)]
    if len(idx) != 1:
        sys.exit(f"expected one coeftest(...) or summary(m) line in the R code, found {len(idx)}")
    lines[idx[0]] = ".res <- " + lines[idx[0]]
    return "\n".join(lines)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return {r["term"]: (float(r["b"]), float(r["se"])) for r in csv.DictReader(fh)}


def name(t):
    """The generated code names the outcome y, explanatory variables x1.., controls c1..; terms keep that order."""
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("outdir", type=Path)
    ap.add_argument("--stata", default=STATA)
    ap.add_argument("--rscript", default=RSCRIPT)
    ap.add_argument("--tol", type=float, default=1e-6, help="relative tolerance on b and SE")
    a = ap.parse_args()
    d = a.outdir.resolve()
    expected = json.loads((d / "expected.json").read_text(encoding="utf-8"))
    fails, rows = [], []

    for e in expected:
        i = e["id"]
        do = (d / f"test_{i}.do").read_text(encoding="utf-8") + STATA_TAIL.format(id=i)
        (d / f"run_{i}.do").write_text(do, encoding="utf-8")
        rc = r_capture((d / f"test_{i}.R").read_text(encoding="utf-8")) + R_TAIL.format(id=i)
        (d / f"run_{i}.R").write_text(rc, encoding="utf-8")
        for f in (d / f"stata_{i}.csv", d / f"r_{i}.csv"):
            f.unlink(missing_ok=True)
        subprocess.run([a.stata, "/e", "do", f"run_{i}.do"], cwd=d, timeout=300)
        r = subprocess.run([a.rscript, f"run_{i}.R"], cwd=d, timeout=300, capture_output=True, text=True)

        # The viewer's terms, in the generated code's names.
        xs = [t for t in e["terms"] if t["role"] == "x"]
        cs = [t for t in e["terms"] if t["role"] == "c"]
        want = {"_cons": next(t for t in e["terms"] if t["role"] == "const")}
        want.update({f"x{k + 1}": t for k, t in enumerate(xs)})
        want.update({f"c{k + 1}": t for k, t in enumerate(cs)})
        se_key = "seC" if e["se"] == "classical" else "seR"

        for prog, f, err in (("Stata", d / f"stata_{i}.csv", (d / f"run_{i}.log")),
                             ("R", d / f"r_{i}.csv", None)):
            if not f.exists():
                why = r.stderr.strip()[-400:] if prog == "R" else (err.read_text(encoding="utf-8", errors="replace")[-600:] if err.exists() else "no log")
                fails.append(f"test {i} {prog}: produced no results\n{why}")
                continue
            got = read(f)
            if int(got["_N"][0]) != e["n"]:
                fails.append(f"test {i} {prog}: N {int(got['_N'][0])}, viewer {e['n']}")
            for nm, t in want.items():
                if nm not in got:
                    fails.append(f"test {i} {prog}: no term {nm}")
                    continue
                for what, v, w in (("b", got[nm][0], t["b"]), ("se", got[nm][1], t[se_key])):
                    rel = abs(v - w) / max(abs(w), 1e-12)
                    rows.append((i, e["unit"], e["model"], e["se"], prog, nm, t["key"] or "constant", what, w, v, rel))
                    if rel > a.tol:
                        fails.append(f"test {i} {prog} {nm} {what}: {prog} {v!r}, viewer {w!r} (rel {rel:.2e})")

    with open(d / "stata_r_comparison.csv", "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["test", "unit", "model", "se", "program", "term", "variable", "quantity", "viewer", "program_value", "rel_diff"])
        w.writerows(rows)
    worst = max((r[-1] for r in rows), default=float("nan"))
    print(f"{len(expected)} tests, {len(rows)} comparisons (Stata and R), largest relative difference {worst:.2e}")
    if fails:
        print("FAIL\n  " + "\n  ".join(fails))
        sys.exit(1)
    print(f"ALL PASS within {a.tol:g}; table in {d / 'stata_r_comparison.csv'}")


if __name__ == "__main__":
    main()
