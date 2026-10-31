// The page's side of the Stata service, against a stand-in for the service (added 31 October 2026,
// protocol 2). No Stata needed. window.fetch is replaced, so every reply, good, malformed or hostile, is
// scripted here. Checks that a good reply is shown in full and its zip is a valid archive; that markup
// in a reply is escaped and a reply of the wrong shape is refused; that "busy" is waited out, a stale
// answer is dropped, and every failure says what happened. From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_stata_page.cjs pipeline/gis/viewer/index.html
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stata-page-'));
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind);
  await page.click('#cjOpen');
  // Two logged tests: OLS with province clusters, Poisson with an exposure.
  await page.evaluate(() => {
    LOG.length = 0;
    const spec = (model, y, x, se, exposure) => ({
      format: 'shrines-viewer-conjecture',
      v: 1,
      statement: `page test ${model}`,
      unit: 'district',
      y: { key: y, tf: 'none' },
      x: [{ key: x, tf: 'log1p', sign: '+' }],
      c: [{ key: 'ntl_2023_popw', tf: 'none' }],
      model,
      se,
      fe: null,
      exposure,
      weights: 'contig',
      k: 6,
      perms: 99,
      mperms: 99,
      seed: 1,
      composite: null,
    });
    window.E1 = record(spec('ols', 'literacy', 'n_mus_pre1857', 'cl_province', null), null, {}).e;
    window.E2 = record(spec('poisson', 'n_site', 'literacy', 'robust', 'pop2023'), null, {}).e;
    // A reply that agrees with the viewer, built from its own estimates.
    window.goodReply = (e) => {
      const se = e.spec.se === 'classical' ? 'seC' : 'seR',
        rows = e.terms.map((t) => ({
          term: stNm(e, t),
          b: t.b,
          se: t[se],
          stat: t.b / t[se],
          p: 0.04,
          lo: t.b - 2 * t[se],
          hi: t.b + 2 * t[se],
          omitted: false,
        }));
      return {
        ok: true,
        protocol: 2,
        complete: true,
        n: e.n,
        stat: 't',
        table: rows,
        terms: rows.map((t) => ({ term: t.term, b: t.b, se: t.se })),
        omitted: [],
        fe: null,
        stats: {
          N: e.n,
          r2: 0.3,
          r2_a: 0.28,
          F: 12,
          df_m: 2,
          df_r: 3,
          p: 0.01,
          ll: -100,
          aic: 206,
          bic: 212,
          N_clust: 4,
        },
        vif: [
          { term: 'x1', vif: 1.4 },
          { term: 'c1', vif: 1.4 },
        ],
        diagnostics: {
          reset: { F: 3.1, df: 3, df_r: 100, p: 0.03 },
          hettest: { chi2: 9, df: 1, p: 0.002 },
        },
        influential: { cutoff: 0.03, count: 1, top: [{ id: 'PK617', cooksd: 0.2 }] },
        ame: [],
        bootstrap: {
          weights: 'webb',
          reps: 9999,
          seed: 20261030,
          cluster: 'province',
          rows: [{ term: 'x1', p: 0.09, reps: 9999, ci: [[-0.1, 2]] }],
        },
        robustness: [
          { key: 'qreg', n: e.n, terms: [{ ...rows[1], b: -rows[1].b }], rc: null },
          { key: 'hdfe', n: null, terms: [], rc: '2001' },
        ],
        errors: [{ section: 'rob:hdfe', rc: '2001' }],
        stata: { version: '19.5' },
        ado: { boottest: 'boottest 4.5.5 24 October 2026', reghdfe: null },
        log: '. regress y x1 c1 if touse\nLinear regression',
        do_file: '* Test\nclear\n',
        data_sha256: 'a'.repeat(64),
        seconds: 2.5,
      };
    };
    window.HEALTH = {
      ok: true,
      service: 'shrines-stata',
      protocol: 2,
      timeout: 300,
      busy: false,
      check: {
        checked: true,
        ok: true,
        stata: { version: '19.5' },
        ado: { boottest: 'boottest 4.5.5', reghdfe: 'version 6.13.1' },
        failed: [],
      },
    };
    // The stand-in: each call takes the next scripted answer for its path.
    window.MOCK = { '/health': [], '/run': [], calls: [] };
    window.fetch = async (u, opts) => {
      const p = new URL(u).pathname;
      MOCK.calls.push({
        p,
        body: opts && opts.body ? JSON.parse(opts.body) : null,
        tok: opts.headers['X-Stata-Token'],
      });
      const next = MOCK[p].shift() || {
        status: 500,
        body: { ok: false, error: 'no scripted answer' },
      };
      if (next.throw) throw new TypeError('Failed to fetch');
      if (next.wait) await new Promise((r) => setTimeout(r, next.wait));
      return { status: next.status, json: async () => next.body };
    };
  });
  const show = (which) => page.evaluate((w) => cjResult(window[w], null), which);
  const script = (p, answers) => page.evaluate(([p, a]) => MOCK[p].push(...a), [p, answers]);
  const status = () => page.textContent('#cjStStatus');
  const runAndWait = async (re) => {
    await page.click('#cjStRun');
    await page.waitForFunction(
      (re) => new RegExp(re).test($('cjStStatus').textContent),
      re.source,
      { timeout: 15000 },
    );
    return status();
  };

  // 1. A good reply, shown in full.
  await show('E1');
  await page.fill('#cjStTok', 'tok-1');
  await page.evaluate(() => {
    MOCK['/health'].push({ status: 200, body: HEALTH });
    MOCK['/run'].push({ status: 200, body: goodReply(E1) });
  });
  let st = await runAndWait(/Ran in Stata|did not/);
  check(/^Ran in Stata \(2\.5 s\)\.$/.test(st), `a good reply: "${st}"`);
  const req = await page.evaluate(() => MOCK.calls.find((c) => c.p === '/run'));
  check(
    req.body.protocol === 2 &&
      !('code' in req.body) &&
      req.body.extras === true &&
      req.tok === 'tok-1' &&
      req.body.groups[0] === 'province',
    'the page sends the test as data (protocol 2, no code), with the extras and the token',
  );
  const more = await page.textContent('#cjStMore');
  check(
    /Stata agrees/.test(await page.textContent('#cjStCmp')),
    'the comparison says Stata agrees',
  );
  for (const [re, what] of [
    [/Stata's estimates/, 'the full table'],
    [/R² 0\.3000/, 'the fit statistics'],
    [/Ramsey RESET/, 'RESET with its reading'],
    [/classical SEs|robust or clustered SEs used here allow/, 'Breusch–Pagan with its reading'],
    [/Influential units/, "Cook's D"],
    [/Wild cluster bootstrap/, 'the bootstrap table'],
    [/Median regression/, 'the robustness table'],
    [/opposite sign/, 'a robustness estimate of the other sign is flagged'],
    [/could not fit it \(r\(2001\)\)/, 'a robustness estimator that failed says so'],
    [
      /Not logged and not counted in the Benjamini/,
      'robustness is marked as outside the log and BH',
    ],
  ])
    check(re.test(more), `shown: ${what}`);
  check(
    /Stata 19\.5 checked at start; boottest 4\.5\.5, reghdfe 6\.13\.1/.test(
      await page.textContent('#cjStInfo'),
    ),
    'the service and package versions are shown',
  );
  check(
    !(await page.isHidden('#cjStLogWrap')) &&
      /Linear regression/.test(await page.inputValue('#cjStLog')),
    "Stata's log is shown",
  );
  const zipH = await page.evaluate(() => $('cjStZip').getBoundingClientRect().height);
  check(zipH >= 43.5, `the download button is at least 44 px (${zipH})`);

  // 2. The zip.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#cjStZip')]);
  const zf = path.join(TMP, dl.suggestedFilename());
  await dl.saveAs(zf);
  const z = JSON.parse(
    execFileSync('python', [
      '-I',
      '-c',
      'import zipfile,sys,json,hashlib;z=zipfile.ZipFile(sys.argv[1]);r=json.loads(z.read("results.json"));' +
        'print(json.dumps({"bad":z.testzip(),"names":z.namelist(),"sha":hashlib.sha256(z.read("data.csv")).hexdigest(),' +
        '"head":z.read("data.csv").decode().split(chr(10))[0],"rec":r["data"]["sha256"],"agrees":r["agreement"]["agrees"],' +
        '"stata":r["stata_results"]["n"],"tex":z.read("table.tex").decode()}))',
      zf,
    ]),
  );
  check(z.bad === null, 'the zip is valid (every CRC checks)');
  check(
    [
      'README.txt',
      'run.do',
      'data.csv',
      'stata.log',
      'results.json',
      'table.csv',
      'table.tex',
    ].every((n) => z.names.includes(n)),
    `the zip holds the do-file, data, log, results and tables (${z.names.join(', ')})`,
  );
  check(
    z.head.startsWith('id,province,'),
    `data.csv carries the ids and groups (${z.head.slice(0, 60)})`,
  );
  check(
    z.agrees === true && z.stata > 0,
    "results.json records the comparison and Stata's results",
  );
  check(
    /\\begin\{tabular\}/.test(z.tex) && /\\end\{tabular\}/.test(z.tex),
    'table.tex is a LaTeX table',
  );

  // 3. Markup in a reply is text, never markup.
  await page.evaluate(() => {
    const r = goodReply(E1),
      x = '<img src=x onerror="window.PWNED=1">';
    r.robustness[0].key = x;
    r.errors.push({ section: x, rc: x });
    r.influential.top[0].id = x;
    r.robustness[1].rc = x;
    MOCK['/run'].push({ status: 200, body: r });
  });
  st = await runAndWait(/Ran in Stata|did not|not understood/);
  check(
    (await page.evaluate(() => !document.querySelector('#cjSt img') && !window.PWNED)) &&
      /<img src=x/.test(await page.textContent('#cjStMore')),
    'markup in every string field of a reply is shown as text',
  );

  // 4. Wrong shapes are refused.
  for (const [mut, what] of [
    [(r) => (r.n = '<b>5</b>'), 'N as text'],
    [(r) => (r.table[0].b = '1'), 'a coefficient as text'],
    [(r) => (r.table[0].term = 'x1<script>'), 'a term name that is not x1, c1 or _cons'],
    [(r) => (r.protocol = 1), 'another protocol'],
    [(r) => (r.data_sha256 = 'nothex'), 'a malformed hash'],
    [(r) => (r.stats.N = { valueOf: 1 }), 'a statistic that is an object'],
  ]) {
    await page.evaluate((m) => {
      const r = goodReply(E1);
      new Function('r', m)(r);
      MOCK['/run'].push({ status: 200, body: r });
    }, `(${mut.toString()})(r)`);
    st = await runAndWait(/Ran in Stata|did not|not understood/);
    check(/not understood/.test(st), `a reply with ${what} is refused: "${st.slice(0, 90)}"`);
  }

  // 5. Busy is waited out.
  await page.evaluate(() => {
    MOCK.calls.length = 0;
    const busy = { status: 503, body: { ok: false, kind: 'busy', error: 'busy' } };
    MOCK['/run'].push(busy, busy, { status: 200, body: goodReply(E1) });
  });
  await page.click('#cjStRun');
  await page.waitForFunction(
    () => /finishing another test/.test($('cjStStatus').textContent),
    null,
    { timeout: 5000 },
  );
  st = await page
    .waitForFunction(() => /Ran in Stata/.test($('cjStStatus').textContent), null, {
      timeout: 15000,
    })
    .then(status);
  check(
    /Ran in Stata/.test(st) &&
      (await page.evaluate(() => MOCK.calls.filter((c) => c.p === '/run').length)) === 3,
    'busy twice, then run: the page waits and sends again',
  );

  // 6. Each failure says what happened.
  for (const [setup, re, what] of [
    [
      {
        health: true,
        run: {
          status: 422,
          body: {
            ok: false,
            kind: 'stata_error',
            error: 'Stata stopped with r(2000) before the model',
            log: '. regress\nno observations\nr(2000);',
          },
        },
      },
      /r\(2000\)/,
      'a Stata error',
    ],
    [
      {
        health: true,
        run: {
          status: 504,
          body: { ok: false, kind: 'timeout', error: 'Stata did not finish in 300 s', log: 'x' },
        },
      },
      /did not run it to the end/,
      'a timeout',
    ],
    [
      {
        health: true,
        run: {
          status: 400,
          body: { ok: false, kind: 'refused', error: 'refused: columns: bad name' },
        },
      },
      /refused: columns/,
      'a refusal',
    ],
    [
      { health: { status: 401, body: { ok: false, kind: 'auth', error: 'wrong' } } },
      /token is wrong/,
      'a wrong token',
    ],
    [
      { health: { status: 200, body: { ok: true, protocol: 1 } } },
      /protocol 1, this page 2/,
      'an older service',
    ],
    [{ health: { throw: true } }, /not reachable/, 'no service'],
    [
      { health: { status: 403, body: { ok: false, kind: 'origin', error: 'origin' } } },
      /opened from disk/,
      'a refused origin',
    ],
  ]) {
    await page.evaluate((s) => {
      STS.health = null;
      if (s.health)
        MOCK['/health'].push(s.health === true ? { status: 200, body: HEALTH } : s.health);
      if (s.run) MOCK['/run'].push(s.run);
    }, setup);
    st = await runAndWait(/Ran in Stata|did not|not reachable|not understood|Stata did not/);
    check(re.test(st), `${what}: "${st.slice(0, 110)}"`);
  }

  // 7. A stale answer is dropped: a new result on screen while a run is out.
  await page.evaluate(() => {
    STS.health = HEALTH;
    STS.tok = 'tok-1';
    MOCK['/run'].push({ status: 200, wait: 1500, body: goodReply(E1) });
  });
  await page.click('#cjStRun');
  await page.waitForTimeout(200);
  await show('E2');
  await page.waitForTimeout(2000);
  check(
    (await status()) === '' && (await page.textContent('#cjStMore')) === '',
    "an answer for the test no longer on screen is not shown in the new test's panel",
  );

  // 8. Poisson: rate ratios and marginal effects; the extras toggle; forgetting the token.
  await page.evaluate(() => {
    const r = goodReply(E2);
    r.stat = 'z';
    r.table.forEach((t) =>
      Object.assign(t, { irr: Math.exp(t.b), irr_lo: Math.exp(t.lo), irr_hi: Math.exp(t.hi) }),
    );
    r.ame = [{ ...r.table[1] }];
    r.bootstrap = null;
    r.diagnostics = {
      overdisp: { alpha: 0.4, chi2_c: 30, p: 0.0001 },
      gof: { chi2_d: 300, p_d: 0.001, chi2_p: 280, p_p: 0.002, df: 120 },
    };
    r.vif = [];
    r.influential = null;
    MOCK['/run'].push({ status: 200, body: r });
  });
  await page.click('#cjStExtra');
  st = await runAndWait(/Ran in Stata|did not|not understood/);
  const m2 = await page.textContent('#cjStMore');
  check(
    /Rate ratio/.test(m2) &&
      /Average marginal effects/.test(m2) &&
      /Overdispersion/.test(m2) &&
      /Goodness of fit/.test(m2),
    'Poisson: rate ratios, marginal effects, overdispersion and fit',
  );
  check(
    (await page.evaluate(() => MOCK.calls.filter((c) => c.p === '/run').pop().body.extras)) ===
      false && (await page.textContent('#cjStExtra')) === 'Diagnostics and robustness: off',
    'turning the extras off sends extras: false',
  );
  await page.click('#cjStExtra');
  await page.click('#cjStForget');
  check(
    (await page.inputValue('#cjStTok')) === '' &&
      (await page.evaluate(() => localStorage.getItem('shrines_viewer_stata_token'))) === null,
    'Forget token clears it from the box and from the browser',
  );
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
