// The Stata service end to end (added 30 October 2026; protocol 2 since 31 October): its locks hold, a
// result in the viewer runs in Stata and agrees, the diagnostics, wild cluster bootstrap and robustness
// estimators come back, and the downloaded zip re-runs in Stata to the same numbers. Starts
// stata_service.py itself and stops it at the end. Needs Stata, so it runs on this PC only; start it
// from PowerShell or cmd. From the repo root, after test_conjecture.cjs has written <dir>/cj_results.json:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_stata_service.cjs \
//     pipeline/gis/viewer/index.html <dir>/cj_results.json
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');
const [html, results] = process.argv.slice(2);
const URL_ = 'http://127.0.0.1:8765';
const STATA = process.env.SHRINES_STATA || 'C:\\Program Files\\StataNow19\\StataMP-64.exe';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stata-e2e-'));
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};
const log = JSON.parse(fs.readFileSync(results, 'utf8')).log.filter((e) => !e.error);
// A request with a forged Host header, as a DNS-rebinding page would send (fetch cannot set Host).
const rawGet = (host, token) =>
  new Promise((ok) =>
    http
      .get(
        {
          host: '127.0.0.1',
          port: 8765,
          path: '/health',
          headers: { Host: host, 'X-Stata-Token': token },
        },
        (r) => {
          r.resume();
          ok(r.statusCode);
        },
      )
      .on('error', () => ok(0)),
  );

(async () => {
  const svc = spawn('python', ['-I', 'pipeline/gis/viewer/stata_service/stata_service.py'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  svc.stdout.on('data', (d) => (out += String(d)));
  // Wait for the start-up check of Stata to finish, so the first test does not meet "busy".
  for (let i = 0; i < 300 && !/Stata check:/.test(out); i++)
    await new Promise((r) => setTimeout(r, 200));
  check(
    /Stata check: ok/.test(out) && !/MISSING/.test(out),
    `the service's start-up check: ${(/Stata check:.*/.exec(out) || ['none'])[0]}`,
  );
  const tokFile = path.join(
    process.env.LOCALAPPDATA || os.homedir(),
    'ShrinesStataService',
    'token.txt',
  );
  const token = fs.readFileSync(tokFile, 'utf8').trim();
  let browser;
  try {
    // The locks
    let r = await fetch(URL_ + '/health');
    check(r.status === 401, `no token is refused (${r.status})`);
    r = await fetch(URL_ + '/health', {
      headers: { 'X-Stata-Token': token, Origin: 'https://example.com' },
    });
    check(r.status === 403, `a web page's origin is refused (${r.status})`);
    check((await rawGet('evil.example:8765', token)) === 421, 'a rebinding Host is refused');
    r = await fetch(URL_ + '/health', { headers: { 'X-Stata-Token': token, Origin: 'null' } });
    const h = await r.json();
    check(
      r.status === 200 && h.protocol === 2,
      `a page opened from disk, with the token, is let in (${r.status})`,
    );
    r = await fetch(URL_ + '/run', {
      method: 'POST',
      headers: { 'X-Stata-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'clear\nshell calc.exe' }),
    });
    let j = await r.json();
    check(
      r.status === 400 && j.kind === 'protocol',
      `Stata code is not accepted at all (${j.error.slice(0, 60)})`,
    );

    // The viewer
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1400, height: 900 },
      acceptDownloads: true,
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(require('url').pathToFileURL(path.resolve(html)).href);
    await page.click('#cjOpen');
    const ran = (t = 240000) =>
      page.waitForFunction(
        () =>
          /Ran in Stata|did not|not reachable|not understood|No answer/.test(
            $('cjStStatus').textContent,
          ),
        null,
        { timeout: t },
      );
    // A hostile request built from the page's own: a column name carrying a command.
    j = await page.evaluate(
      async ([tok, e]) => {
        const q = stataRequest(e, false);
        q.columns[0] = 'v shell calc';
        q.y.col = 'v shell calc';
        const r = await fetch('http://127.0.0.1:8765/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Stata-Token': tok },
          body: JSON.stringify(q),
        });
        return [r.status, await r.json()];
      },
      [token, log[0]],
    );
    check(
      j[0] === 400 && j[1].kind === 'refused',
      `a column name carrying a command is refused before Stata (${j[1].error})`,
    );

    for (const e of log.filter((x) => x.unit !== 'hex').slice(0, 3)) {
      await page.evaluate((e) => cjResult(e, null), e);
      await page.fill('#cjStTok', token);
      await page.click('#cjStRun');
      await ran();
      const st = await page.textContent('#cjStStatus'),
        cmp = await page.textContent('#cjStCmp'),
        more = await page.textContent('#cjStMore'),
        logText = await page.inputValue('#cjStLog');
      check(
        /^Ran in Stata \(/.test(st) && /Stata agrees/.test(cmp),
        `test #${e.id} (${e.unit}, ${e.model}) runs in Stata and agrees: ${st}`,
      );
      check(
        new RegExp(e.model === 'poisson' ? 'Poisson regression' : 'Linear regression').test(
          logText,
        ),
        `test #${e.id}: Stata's own output is shown`,
      );
      check(
        /Stata's estimates/.test(more) &&
          /Diagnostics/.test(more) &&
          /Stata robustness/.test(more) &&
          !/Not computed|could not fit/.test(more),
        `test #${e.id}: full table, diagnostics and robustness, every section computed`,
      );
    }

    // Clustered, with fixed effects, at tehsil: the bootstrap and the absorbed district fixed effects.
    const e3 = await page.evaluate(() => {
      const s = {
        format: 'shrines-viewer-conjecture',
        v: 1,
        statement: 'e2e clustered',
        unit: 'tehsil',
        y: { key: 'literacy', tf: 'none' },
        x: [{ key: 'ntl_2023_popw', tf: 'log1p', sign: '+' }],
        c: [],
        model: 'ols',
        se: 'cl_province',
        fe: 'province',
        exposure: null,
        weights: 'contig',
        k: 6,
        perms: 99,
        mperms: 99,
        seed: 1,
        composite: null,
      };
      const { e, res } = record(s, null, {});
      cjResult(e, res);
      return e.id;
    });
    await page.click('#cjStRun');
    await ran();
    let more = await page.textContent('#cjStMore');
    check(
      /^Ran in Stata \(/.test(await page.textContent('#cjStStatus')) &&
        /Stata agrees/.test(await page.textContent('#cjStCmp')),
      `test #${e3} (tehsil, clustered, province fixed effects) agrees`,
    );
    check(/p, wild bootstrap/.test(more), `test #${e3}: the wild cluster bootstrap is shown`);
    check(
      /District fixed effects, absorbed \(reghdfe\)/.test(more) &&
        !/could not fit|Not computed/.test(more),
      `test #${e3}: reghdfe absorbs district fixed effects; every section computed`,
    );

    // The zip re-runs in Stata to the same main estimates.
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#cjStZip')]);
    const zf = path.join(TMP, 'run.zip'),
      dir = path.join(TMP, 'rerun');
    await dl.saveAs(zf);
    execFileSync('python', [
      '-I',
      '-c',
      'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',
      zf,
      dir,
    ]);
    execFileSync(STATA, ['/e', 'do', 'run.do'], { cwd: dir, timeout: 300000 });
    const rows = fs.existsSync(path.join(dir, 'results.tsv'))
      ? fs
          .readFileSync(path.join(dir, 'results.tsv'), 'utf8')
          .split(/\r?\n/)
          .map((l) => l.split('\t'))
      : [];
    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8')).stata_results
        .table,
      again = Object.fromEntries(rows.filter((f) => f[0] === 'main').map((f) => [f[1], +f[2]]));
    check(
      saved.length > 0 &&
        saved.every((t) => Math.abs(again[t.term] - t.b) <= 1e-9 * Math.max(1, Math.abs(t.b))),
      `the zip's run.do, re-run in Stata, gives the same coefficients (${saved.map((t) => t.term).join(', ')})`,
    );

    // Background: with auto-run on, a new result runs by itself. Two shown at once: the first one's
    // answer is dropped, and the second waits for Stata to be free.
    await page.click('#cjStAuto');
    await ran();
    await page.evaluate((e) => cjResult(e, null), log[0]);
    await page.evaluate((e) => cjResult(e, null), log[1]);
    await page.waitForFunction(() => /^Ran in Stata/.test($('cjStStatus').textContent), null, {
      timeout: 300000,
    });
    check(
      new RegExp(`N: viewer ${log[1].n}, Stata ${log[1].n}\\.`).test(
        await page.textContent('#cjStCmp'),
      ),
      'auto-run: the test on screen is the one that ran, after waiting for Stata',
    );
    await page.click('#cjStAuto');
    check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } finally {
    if (browser) await browser.close();
    svc.kill();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
