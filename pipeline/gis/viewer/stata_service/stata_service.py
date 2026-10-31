"""
Run the viewer's tests in Stata on this computer (Rauf, 30 October 2026: "running the tests ... should
be done on the backend in Stata"; then "have it run in the background").

The viewer (pipeline/gis/viewer/index.html, opened from disk) sends the Stata code it shows under a
result; this service runs it in Stata in batch mode and returns Stata's own log and the coefficients and
standard errors from e(b) and e(V), which the page shows beside its own. Python standard library only.

Safety. A local service that runs code can be reached by any web page open in the browser, and Stata can
run shell commands, so:
  - it listens on 127.0.0.1 only;
  - every request must carry a token (made once, kept outside the repository in
    %LOCALAPPDATA%\\ShrinesStataService\\token.txt, printed at start; paste it into the viewer once);
  - a browser request must come from a page opened from disk (Origin "null"); any other origin is refused;
  - **only code shaped exactly like the viewer's generator output runs**: every line must match one of
    the patterns in ALLOWED (comments, clear, input/end with data rows, generate, mark/markout, replace,
    quietly summarize, regress, poisson). Anything else, a backtick macro, a shell escape, a file
    command, is refused before Stata starts. The read-back lines are appended by this service after
    the check.

Usage (PowerShell or a terminal, from the repo root):
  python pipeline/gis/viewer/stata_service/stata_service.py            # serves on 127.0.0.1:8765
  python pipeline/gis/viewer/stata_service/stata_service.py --check    # validate + run one sample, exit
Stop with Ctrl+C. Nothing runs at startup or after a reboot unless you start it.
"""
import argparse, csv, json, os, re, secrets, shutil, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

STATA = os.environ.get("SHRINES_STATA", r"C:\Program Files\StataNow19\StataMP-64.exe")
PORT = 8765
TOKEN_FILE = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "ShrinesStataService" / "token.txt"
MAX_BYTES = 8_000_000          # a hexagon test embeds ~19,000 rows; this is several times that
LOCK = threading.Lock()        # one Stata at a time

NAME = r"[A-Za-z_][A-Za-z0-9_]{0,31}"
TERM = r"(?:y|x\d{1,2}|c\d{1,2})"
NUM = r"(?:\.|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)"
ALLOWED = [re.compile(p) for p in (
    r"",                                                         # blank
    r"\*[^\r\n]*",                                               # a comment line
    r"clear",
    rf"input str\d{{1,3}} id double\({NAME}(?: {NAME})*\)",
    r"end",
    rf"generate double {TERM} = (?:ln\(1 \+ {NAME}\)|asinh\({NAME}\)|{NAME})",
    r"mark touse",
    rf"markout touse(?: {NAME})+",
    rf"replace touse = 0 if {NAME} <= 0",
    rf"quietly summarize {TERM} if touse",
    rf"replace ({TERM}) = \(\1 - r\(mean\)\) / r\(sd\) if touse",
    rf"regress y(?: {TERM})+ if touse(?:, vce\(robust\))?",
    rf"poisson y(?: {TERM})+ if touse, vce\(robust\)(?: exposure\({NAME}\))?",
)]
DATA_ROW = re.compile(rf'"[A-Za-z0-9_-]{{1,40}}"(?: {NUM})+')

TAIL = r"""
* ---- read back by the Shrines Stata service ----
matrix __b = e(b)
matrix __V = e(V)
local __names : colnames __b
file open __fh using "result.csv", write replace
file write __fh "term,b,se" _n
local __i = 0
foreach __n of local __names {
    local ++__i
    file write __fh "`__n'," %24.17g (__b[1,`__i']) "," %24.17g (sqrt(__V[`__i',`__i'])) _n
}
file write __fh "_N," %24.17g (e(N)) ",0" _n
file close __fh
"""
MARK = "* ---- read back by the Shrines Stata service ----"


def check_code(code):
    """Return None if every line is one the viewer's generator writes, else the first offending line."""
    if "`" in code or "\\" in code or "\r" in code.replace("\r\n", "\n").replace("\n", ""):
        return "macros, backslashes or stray carriage returns are not allowed"
    in_data = False
    for i, line in enumerate(code.replace("\r\n", "\n").split("\n"), 1):
        if line.startswith("*") and MARK in line:
            return f"line {i}: reserved marker"
        if in_data:
            if line == "end":
                in_data = False
            elif not DATA_ROW.fullmatch(line):
                return f"line {i}: not a data row: {line[:80]!r}"
            continue
        if not any(p.fullmatch(line) for p in ALLOWED):
            return f"line {i}: not a line the viewer writes: {line[:80]!r}"
        if line.startswith("input "):
            in_data = True
    return "an input block is not closed by end" if in_data else None


def run_stata(code, timeout=180):
    bad = check_code(code)
    if bad:
        return {"ok": False, "error": f"refused: {bad}"}
    if not Path(STATA).exists():
        return {"ok": False, "error": f"Stata not found at {STATA} (set SHRINES_STATA)"}
    d = Path(tempfile.mkdtemp(prefix="shrines_stata_"))
    try:
        (d / "run.do").write_text(code.replace("\r\n", "\n").rstrip("\n") + "\n" + TAIL, encoding="utf-8")
        with LOCK:
            subprocess.run([STATA, "/e", "do", "run.do"], cwd=d, timeout=timeout,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log = (d / "run.log").read_text(encoding="utf-8", errors="replace") if (d / "run.log").exists() else ""
        shown = log.split(MARK)[0].rstrip() if MARK in log else log
        err = re.search(r"^r\((\d+)\);\s*$", log, re.M)
        if not (d / "result.csv").exists():
            return {"ok": False, "error": f"Stata stopped with r({err.group(1)})" if err else "Stata wrote no result",
                    "log": shown[-20000:]}
        with open(d / "result.csv", encoding="utf-8") as fh:
            rows = {r["term"]: (float(r["b"]), float(r["se"])) for r in csv.DictReader(fh)}
        n = int(rows.pop("_N")[0])
        # Drop the long data listing from the log: keep what Stata printed from the first command after it.
        cut = shown.find("\n. mark touse")
        return {"ok": True, "n": n, "terms": [{"term": k, "b": v[0], "se": v[1]} for k, v in rows.items()],
                "log": (shown[cut + 1:] if cut >= 0 else shown)[-20000:]}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": f"Stata did not finish in {timeout} s"}
    finally:
        shutil.rmtree(d, ignore_errors=True)


def stata_version():
    r = run_stata("clear\ninput str1 id double(v)\n\"a\" 1\n\"b\" 2\n\"c\" 4\nend\ngenerate double y = v\n"
                  "generate double x1 = v\nmark touse\nmarkout touse y x1\nregress y x1 if touse")
    return r.get("ok", False)


def load_token():
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not TOKEN_FILE.exists():
        TOKEN_FILE.write_text(secrets.token_urlsafe(18), encoding="utf-8")
    return TOKEN_FILE.read_text(encoding="utf-8").strip()


class Handler(BaseHTTPRequestHandler):
    token = ""

    def log_message(self, fmt, *args):     # keep the console to one line per test
        pass

    def _origin_ok(self):
        o = self.headers.get("Origin")
        return o is None or o == "null"

    def _send(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        if self.headers.get("Origin") == "null":
            self.send_header("Access-Control-Allow-Origin", "null")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        if not self._origin_ok():
            return self._send(403, {"ok": False, "error": "origin not allowed"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "null")
        self.send_header("Access-Control-Allow-Methods", "GET, POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Stata-Token")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def _authorised(self):
        if not self._origin_ok():
            self._send(403, {"ok": False, "error": "origin not allowed"})
            return False
        if not secrets.compare_digest(self.headers.get("X-Stata-Token", ""), self.token):
            self._send(401, {"ok": False, "error": "wrong or missing token"})
            return False
        return True

    def do_GET(self):
        if self.path != "/health":
            return self._send(404, {"ok": False, "error": "not found"})
        if self._authorised():
            self._send(200, {"ok": True, "service": "shrines-stata", "stata": Path(STATA).name})

    def do_POST(self):
        if self.path != "/run":
            return self._send(404, {"ok": False, "error": "not found"})
        if not self._authorised():
            return
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BYTES:
            return self._send(413, {"ok": False, "error": "body empty or too large"})
        try:
            code = json.loads(self.rfile.read(n))["code"]
            assert isinstance(code, str)
        except Exception:  # noqa: BLE001
            return self._send(400, {"ok": False, "error": "expected JSON {\"code\": \"...\"}"})
        res = run_stata(code)
        print(("ran" if res.get("ok") else "refused/failed"), f"({len(code):,} chars)",
              "" if res.get("ok") else res.get("error", "")[:120], flush=True)
        self._send(200 if res.get("ok") else 422, res)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=PORT)
    ap.add_argument("--check", action="store_true", help="run one sample regression in Stata and exit")
    a = ap.parse_args()
    if a.check:
        ok = stata_version()
        print("Stata ran the sample:", "yes" if ok else "NO")
        sys.exit(0 if ok else 1)
    Handler.token = load_token()
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    print(f"Shrines Stata service on http://127.0.0.1:{a.port}  (Stata: {STATA})")
    print(f"Token (paste once into the viewer's 'Stata on this computer' box): {Handler.token}")
    print("Ctrl+C to stop.", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
