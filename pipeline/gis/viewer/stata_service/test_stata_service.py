"""
Unit tests for stata_service.py that need no Stata (added 31 October 2026): the schema refuses what it
must, the do-file holds only what the templates write, results.tsv is read back right (missing values,
omitted terms, failed sections), and the HTTP service keeps its locks, says "busy" and stops a run that
passes its time limit. Run from the repo root:
  npm run test:stata
  (= python3 -I -m unittest discover -s pipeline/gis/viewer/stata_service)
The end-to-end test with real Stata is pipeline/gis/viewer/tests/test_stata_service.cjs.
"""
import copy, http.client, json, os, sys, threading, time, unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stata_service as S  # noqa: E402


def request(**over):
    """A valid district-level request: OLS of v on log(1 + w) and c, province clusters."""
    r = {"protocol": 2, "test": {"id": 7, "unit": "district"}, "model": "ols", "se": "cl_province",
         "fe": "province", "exposure": None, "y": {"col": "v", "tf": "none"},
         "x": [{"col": "w", "tf": "log1p"}], "c": [{"col": "cc", "tf": "z"}], "columns": ["v", "w", "cc"],
         "groups": ["province"], "extras": True,
         "rows": [[f"PK{i:03d}", f"PK{i % 4}", str(i), str(i % 5), "-1.5e-3" if i % 3 else None]
                  for i in range(12)]}
    r.update(over)
    return r


def poisson(**over):
    r = request(model="poisson", se="robust", fe=None, exposure="pop", y={"col": "n_site", "tf": "none"},
                x=[{"col": "w", "tf": "none"}], c=[], columns=["n_site", "w", "pop"], groups=[],
                rows=[[f"d{i}", str(i % 3), str(i), str(1000 + i)] for i in range(10)])
    r.update(over)
    return r


class Schema(unittest.TestCase):
    def refused(self, req, why=""):
        with self.assertRaises(S.Refused, msg=why):
            S.validate(req)

    def test_valid_requests_pass(self):
        s = S.validate(request())
        self.assertEqual((s["cl"], s["fe"], s["extras"]), ("province", "province", True))
        self.assertEqual(S.validate(poisson())["exposure"], "pop")

    def test_old_page_sending_code_is_told_to_rebuild(self):
        with self.assertRaises(S.Refused) as cm:
            S.validate({"code": "clear\nshell calc.exe"})
        self.assertEqual(cm.exception.kind, "protocol")
        with self.assertRaises(S.Refused) as cm:
            S.validate(request(protocol=1))
        self.assertEqual(cm.exception.kind, "protocol")

    def test_fields_must_be_exactly_the_schema(self):
        self.refused(request(code="shell calc"), "an extra field")
        r = request()
        del r["extras"]
        self.refused(r, "a missing field")
        self.refused(request(test={"id": 1, "unit": "district", "x": 1}))
        self.refused(request(test={"id": "1", "unit": "district"}), "a string id")
        self.refused(request(test={"id": True, "unit": "district"}), "a boolean id")
        self.refused(request(extras="yes"))

    def test_closed_lists(self):
        self.refused(request(model="nbreg"))
        self.refused(request(se="robust"), "robust is Poisson's name; OLS says hc1")
        self.refused(poisson(se="classical"))
        self.refused(request(test={"id": 1, "unit": "village"}))
        self.refused(request(y={"col": "v", "tf": "exp"}))
        self.refused(request(fe="tehsil"))

    def test_names_cannot_carry_code(self):
        for bad in ["v; shell calc", "v`x'", "$v", "v\\x", "V", "1v", "v x", "v\"", "a" * 33, "_all", "touse",
                    "x1", "c2", "y", "id", "province", "g_province", "str10", "if", "in", "double", ""]:
            cols = [bad, "w", "cc"]
            self.refused(request(columns=cols, y={"col": bad, "tf": "none"}), repr(bad))

    def test_columns_are_exactly_the_variables(self):
        self.refused(request(columns=["v", "w", "cc", "extra"],
                             rows=[r + ["1"] for r in request()["rows"]]), "an unused column")
        self.refused(request(columns=["v", "w", "w"]), "a duplicate")
        self.refused(request(x=[{"col": "v", "tf": "none"}]), "y repeated as x")
        self.refused(request(exposure="v"), "exposure on OLS")
        self.refused(poisson(exposure="nothere"))
        self.refused(poisson(y={"col": "n_site", "tf": "log1p"}), "Poisson on a transformed count")

    def test_groups_follow_the_unit(self):
        self.refused(request(groups=["district", "province"],
                             rows=[r[:1] + ["PK617"] + r[1:] for r in request()["rows"]]),
                     "district is not a group above a district")
        self.refused(request(groups=[], fe=None,
                             rows=[r[:1] + r[2:] for r in request()["rows"]]),
                     "clusters without the province column")
        tehsil = request(test={"id": 1, "unit": "tehsil"}, groups=["province", "district"], fe="district",
                         se="cl_district", rows=[r[:2] + ["PK617"] + r[2:] for r in request()["rows"]])
        self.assertEqual(S.validate(tehsil)["fe"], "district")
        self.refused(dict(tehsil, groups=["district", "province"]), "groups out of order")
        self.refused(request(fe="district"), "district fixed effects at district level")

    def test_rows_hold_only_ids_codes_and_numbers(self):
        base = request()["rows"]
        for i, cell in [(0, 'PK"1'), (0, "PK 1"), (0, ""), (1, "PK 6"), (1, 'P"K'), (2, "1;shell"),
                        (2, "nan"), (2, "inf"), (2, "1e999"), (2, "0x10"), (2, "1,5"), (2, " 1"), (2, 1.5),
                        (3, "--1"), (4, "1e5000")]:
            rows = copy.deepcopy(base)
            rows[3][i] = cell
            self.refused(request(rows=rows), f"cell {i} = {cell!r}")
        self.refused(request(rows=[r[:-1] for r in base]), "a short row")
        self.refused(request(rows=base[:1]), "one row")
        self.refused(request(rows=[base[0]] * (S.MAX_ROWS + 1)))
        rows = copy.deepcopy(base)
        rows[0][2:] = ["-0.5", "1e-07", ".25"]
        S.validate(request(rows=rows))

    def test_variable_counts(self):
        self.refused(request(x=[]))
        many = [{"col": f"v{i}", "tf": "none"} for i in range(11)]
        self.refused(request(x=many, columns=["v", "cc"] + [f"v{i}" for i in range(11)]))

    def test_json_rejects_duplicates_and_constants(self):
        with self.assertRaises(S.Refused):
            S.parse_json(b'{"a": 1, "a": 2}')
        with self.assertRaises(S.Refused):
            S.parse_json(b'{"a": NaN}')


class DoFile(unittest.TestCase):
    def test_core_lines(self):
        s = S.validate(request())
        core = S.core_lines(s)
        self.assertEqual(core[:2], ["clear", "input str5 id str3 province double(v w cc)"])
        self.assertEqual(core[2], '"PK000" "PK0" 0 0 .')
        self.assertIn("encode province, generate(g_province)", core)
        self.assertIn("generate double x1 = ln(1 + w)", core)
        self.assertIn("markout touse y x1 c1 g_province", core)
        self.assertEqual(core[-3:], ["quietly summarize c1 if touse",
                                     "replace c1 = (c1 - r(mean)) / r(sd) if touse",
                                     "regress y x1 c1 i.g_province if touse, vce(cluster g_province)"])

    def test_poisson_lines(self):
        core = S.core_lines(S.validate(poisson()))
        self.assertIn("replace touse = 0 if pop <= 0", core)
        self.assertEqual(core[-1], "poisson y x1 if touse, vce(robust) exposure(pop)")
        fe = S.validate(request(model="poisson", se="cl_province", exposure=None, y={"col": "v", "tf": "none"}))
        self.assertIn("bysort g_province: egen double __any = max(y * touse)", S.core_lines(fe))

    def test_unused_groups_are_data_but_not_sample(self):
        s = S.validate(request(se="hc1", fe=None))
        core = S.core_lines(s)
        self.assertIn("markout touse y x1 c1", core)
        self.assertIn("encode province, generate(g_province)", core)

    def test_extras(self):
        do = S.build_do(S.validate(request()))
        for want in ["estat vif", "estat ovtest", "estat hettest", "cooksd", "boottest x1, weighttype(webb)",
                     "qreg y x1 c1 i.g_province", 'file write __fh "end"']:
            self.assertIn(want, do)
        self.assertNotIn("absorb(g_district)", do, "no district column at district level")
        do = S.build_do(S.validate(poisson()))
        for want in ["margins, dydx(x1)", "estat gof", "nbreg y x1 if touse, vce(robust) exposure(pop)",
                     "logit __anyy x1 if touse, vce(robust)", "generate byte __anyy = n_site > 0"]:
            self.assertIn(want, do)
        self.assertNotIn("boottest x1", do, "no bootstrap without clusters")
        plain = S.build_do(S.validate(request(extras=False)))
        self.assertNotIn("estat vif", plain)
        self.assertIn('file write __fh "end"', plain)

    def test_hdfe_at_tehsil(self):
        t = request(test={"id": 1, "unit": "tehsil"}, groups=["province", "district"], fe="province",
                    rows=[r[:2] + ["PK617"] + r[2:] for r in request()["rows"]])
        do = S.build_do(S.validate(t))
        self.assertIn("reghdfe y x1 c1 if touse, absorb(g_district) vce(cluster g_province)", do)

    def test_only_template_text_has_macros(self):
        s = S.validate(request())
        do = S.build_do(s)
        core = "\n".join(S.core_lines(s))
        self.assertNotRegex(core, r"[`$\\]")
        self.assertTrue(do.startswith("* Test #7"))
        self.assertIn("version 19", do)

    def test_data_csv(self):
        s = S.validate(request())
        lines = S.data_csv(s).split("\n")
        self.assertEqual(lines[0], "id,province,v,w,cc")
        self.assertEqual(lines[1], "PK000,PK0,0,0,")


RESULTS = "\n".join([
    "meta\tstata_version\t19.5",
    "main\tx1\t .5\t .25\t2\t .045\t .01\t .99",
    "main\to.c1\t0\t.\t.\t.\t.\t.",
    "main\t1b.g_province\t0\t.\t.\t.\t.\t.",
    "main\t2.g_province\t-1\t.5\t-2\t.05\t-2\t0",
    "main\t3o.g_province\t0\t.\t.\t.\t.\t.",
    "main\t_cons\t4\t1\t4\t.001\t2\t6",
    "stat\tN\t 40",
    "stat\tr2\t .3",
    "stat\tF\t.",
    "stat\tN_clust\t4",
    "vif\tx1\t1.5",
    "diag\treset\tF\t 2.5",
    "diag\treset\tp\t .06",
    "cook\tcutoff\t .1\t2",
    "cookid\tPK001\t .3",
    "cookid\tPK002\t .2",
    "boot\tx1\t .07\t9999",
    "bootci\tx1\t-.1\t1.1",
    "bootci\tx1\t1.5\t2",
    "robn\tqreg\t40",
    "rob:qreg\tx1\t .4\t .3\t1.3\t .2\t-.2\t1",
    "rob:qreg\t_cons\t3\t1\t3\t.01\t1\t5",
    "err\trob:hdfe\t198",
    "err\tboot:x2\t111",
    "ado\tboottest\t",
    "end\tok",
])


class Results(unittest.TestCase):
    def setUp(self):
        self.r = S.parse_results(RESULTS, S.validate(request()))

    def test_main_table(self):
        r = self.r
        self.assertTrue(r["complete"])
        self.assertEqual(r["n"], 40)
        self.assertEqual([t["term"] for t in r["table"]], ["x1", "c1", "_cons"])
        self.assertEqual(r["table"][0]["b"], 0.5, "'.5' is a number, not Stata's missing '.'")
        self.assertEqual(r["omitted"], ["c1"])
        self.assertIsNone(r["table"][1]["se"])
        self.assertEqual(r["fe"], {"group": "province", "count": 2})
        self.assertIsNone(r["stats"]["F"])

    def test_extras(self):
        r = self.r
        self.assertEqual(r["diagnostics"]["reset"], {"F": 2.5, "p": 0.06})
        self.assertEqual(r["influential"]["count"], 2)
        self.assertEqual([u["id"] for u in r["influential"]["top"]], ["PK001", "PK002"])
        self.assertEqual(r["bootstrap"]["rows"][0]["ci"], [[-0.1, 1.1], [1.5, 2.0]])
        rob = {q["key"]: q for q in r["robustness"]}
        self.assertEqual([t["term"] for t in rob["qreg"]["terms"]], ["x1"])
        self.assertEqual(rob["hdfe"]["rc"], "198")
        self.assertEqual({e["section"] for e in r["errors"]}, {"rob:hdfe", "boot:x2"})
        self.assertIsNone(r["ado"]["boottest"])

    def test_incomplete_and_poisson(self):
        r = S.parse_results(RESULTS.replace("end\tok", ""), S.validate(request()))
        self.assertFalse(r["complete"])
        p = S.parse_results("meta\tstata_version\t19.5\nmain\tx1\t.5\t.1\t5\t0\t.3\t.7\nstat\tN\t10\nend\tok",
                            S.validate(poisson()))
        self.assertAlmostEqual(p["table"][0]["irr"], 1.6487212707, places=8)
        self.assertEqual(p["stat"], "z")

    def test_ado_version(self):
        d = Path(os.environ.get("TEMP", "/tmp")) / "stata_service_test.ado"
        d.write_text("program x\n*! version 1.2.3 31oct2026\n", encoding="utf-8")
        try:
            self.assertEqual(S.ado_version(str(d)), "version 1.2.3 31oct2026")
            self.assertIsNone(S.ado_version(str(d.with_suffix(".txt"))))
        finally:
            d.unlink()


class Process(unittest.TestCase):
    def test_a_run_past_its_limit_is_stopped(self):
        t0 = time.time()
        done = S.run_process([sys.executable, "-c", "import time; time.sleep(60)"], ".", 1)
        self.assertFalse(done)
        self.assertLess(time.time() - t0, 30)

    def test_missing_stata_is_said(self):
        old = S.STATA
        S.STATA = str(Path(__file__).with_name("no_such_stata.exe"))
        try:
            r = S.run_stata(S.validate(request()))
        finally:
            S.STATA = old
        self.assertEqual(r["kind"], "no_stata")


class Service(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        S.Handler.token = "test-token"
        cls.calls = []
        cls.gate = threading.Event()

        def fake(spec, timeout):
            cls.calls.append(spec["id"])
            if spec["id"] == 99:
                cls.gate.wait(10)
            return {"ok": True, "protocol": 2, "n": 12, "seconds": 0.1}
        S.Handler.runner = staticmethod(fake)
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), S.Handler)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        S.Handler.runner = staticmethod(S.run_stata)

    def call(self, method="POST", path="/run", body=None, headers=None, host=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=15)
        h = {"Host": host or f"127.0.0.1:{self.port}", "X-Stata-Token": "test-token",
             "Content-Type": "application/json"}
        h.update(headers or {})
        h = {k: v for k, v in h.items() if v is not None}
        data = body if isinstance(body, bytes) else json.dumps(body if body is not None else request()).encode()
        c.putrequest(method, path, skip_host=True, skip_accept_encoding=True)
        for k, v in h.items():
            c.putheader(k, v)
        if method == "POST":
            c.putheader("Content-Length", str(len(data)))
        c.endheaders()
        if method == "POST":
            c.send(data)
        r = c.getresponse()
        out = (r.status, json.loads(r.read() or b"null"), r.getheader("Access-Control-Allow-Origin"))
        c.close()
        return out

    def test_a_good_request_runs(self):
        st, body, _ = self.call()
        self.assertEqual((st, body["ok"]), (200, True))

    def test_token(self):
        self.assertEqual(self.call(headers={"X-Stata-Token": None})[0], 401)
        self.assertEqual(self.call(headers={"X-Stata-Token": "test-tokeN"})[0], 401)
        self.assertEqual(self.call("GET", "/health", headers={"X-Stata-Token": None})[0], 401)

    def test_host_and_origin(self):
        self.assertEqual(self.call(host=f"evil.example:{self.port}")[0], 421, "DNS rebinding")
        self.assertEqual(self.call(host="127.0.0.1:1")[0], 421)
        self.assertEqual(self.call(headers={"Origin": "https://example.com"})[0], 403)
        st, _, acao = self.call(headers={"Origin": "null"})
        self.assertEqual((st, acao), (200, "null"))
        self.assertEqual(self.call("OPTIONS", headers={"Origin": "https://example.com"})[0], 403)

    def test_bad_bodies(self):
        self.assertEqual(self.call(headers={"Content-Type": "text/plain"})[0], 415)
        self.assertEqual(self.call(body=b"{not json")[0], 400)
        self.assertEqual(self.call(body=b'{"a":1,"a":2}')[0], 400)
        st, body, _ = self.call(body={"code": "clear\nshell calc.exe"})
        self.assertEqual((st, body["kind"]), (400, "protocol"))
        st, body, _ = self.call(body=request(model="ols; shell"))
        self.assertEqual((st, body["kind"]), (400, "refused"))

    def test_content_length(self):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        c.putrequest("POST", "/run", skip_host=True)
        for k, v in {"Host": f"127.0.0.1:{self.port}", "X-Stata-Token": "test-token",
                     "Content-Type": "application/json", "Content-Length": "lots"}.items():
            c.putheader(k, v)
        c.endheaders()
        r = c.getresponse()
        self.assertEqual(r.status, 400)
        c.close()

    def test_health(self):
        st, body, _ = self.call("GET", "/health")
        self.assertEqual((st, body["protocol"], body["service"]), (200, 2, "shrines-stata"))
        self.assertEqual(self.call("GET", "/elsewhere")[0], 404)

    def test_busy(self):
        self.gate.clear()
        first = threading.Thread(target=lambda: self.call(body=request(test={"id": 99, "unit": "district"})))
        first.start()
        for _ in range(100):
            if 99 in self.calls:
                break
            time.sleep(0.05)
        st, body, _ = self.call()
        self.gate.set()
        first.join()
        self.assertEqual((st, body["kind"]), (503, "busy"))


if __name__ == "__main__":
    unittest.main()
