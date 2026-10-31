// Browser checks for fixed effects and clustered standard errors in "Test a conjecture" (added
// 31 October 2026). Runs specifications through the page's own estimator, holds the fixed-effect
// slopes against the within (demeaned) regression computed here independently (Frisch-Waugh-Lovell),
// drives the form once, and writes the log for export_replication.cjs + check_stata_r.py, which hold
// every coefficient and SE against real Stata and R. From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_fixed_effects.cjs pipeline/gis/viewer/index.html <outdir>
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/export_replication.cjs pipeline/gis/viewer/index.html <outdir>/fe_results.json <outdir>
//   python -I pipeline/gis/viewer/tests/check_stata_r.py <outdir>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'viewer-fe-test'));
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};

const SPECS = [
  // [unit, model, y, x, c, se, fe, exposure]
  [
    'district',
    'ols',
    ['literacy', 'none'],
    [['n_mus', 'asinh']],
    [['ntl_2023_popw', 'log1p']],
    'cl_province',
    'province',
    null,
  ],
  [
    'district',
    'ols',
    ['literacy', 'none'],
    [['n_mus', 'asinh']],
    [['ntl_2023_popw', 'log1p']],
    'hc1',
    'province',
    null,
  ],
  [
    'district',
    'ols',
    ['literacy', 'none'],
    [['ntl_2023_popw', 'log1p']],
    [],
    'cl_province',
    null,
    null,
  ],
  [
    'tehsil',
    'ols',
    ['literacy', 'none'],
    [['ntl_2023_popw', 'log1p']],
    [],
    'cl_district',
    'district',
    null,
  ],
  [
    'tehsil',
    'ols',
    ['literacy', 'none'],
    [['ntl_2023_popw', 'log1p']],
    [],
    'classical',
    'province',
    null,
  ],
  [
    'district',
    'poisson',
    ['n_mus', 'none'],
    [['literacy', 'none']],
    [],
    'cl_province',
    'province',
    'pop2023',
  ],
  [
    'tehsil',
    'poisson',
    ['n_site', 'none'],
    [['literacy', 'none']],
    [],
    'robust',
    'province',
    'pop2023',
  ],
  [
    'hex',
    'ols',
    ['ntl_2023_popw', 'log1p'],
    [['travel_city_min_popw', 'log1p']],
    [],
    'cl_district',
    'province',
    null,
  ],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind);
  await page.evaluate(() => {
    LOG.length = 0;
  });

  const res = await page.evaluate((SPECS) => {
    const out = [];
    for (const [unit, model, y, x, c, se, fe, exposure] of SPECS) {
      const s = {
        format: 'shrines-viewer-conjecture',
        v: 1,
        statement: `fixed-effects check ${unit} ${model} ${se} ${fe}`,
        unit,
        y: { key: y[0], tf: y[1] },
        x: x.map(([key, tf]) => ({ key, tf, sign: '+' })),
        c: c.map(([key, tf]) => ({ key, tf })),
        model,
        se,
        fe,
        exposure,
        weights: unit === 'hex' ? 'h3' : 'contig',
        k: 6,
        perms: 199,
        mperms: 199,
        seed: 20261031,
        composite: null,
      };
      const bad = validSpec(s);
      if (bad) {
        out.push({ unit, model, se, fe, bad });
        continue;
      }
      const t0 = performance.now();
      const { e } = record(s, null, { prefilled: false, views: 0 });
      const ms = performance.now() - t0;
      // Independent check of the slopes: demean every column within the fixed-effect groups and
      // regress without an intercept (OLS only; Poisson has no within transformation).
      let fwl = null;
      if (!e.error && fe && model === 'ols') {
        const d = cjData(s, unit),
          nNamed = d.X.length - d.nFe,
          gids = fe === 'province' ? adminOf(unit).prov : adminOf(unit).dist,
          g = d.idx.map((i) => gids[i]),
          dm = (a) => {
            const m = new Map();
            g.forEach((k, i) => {
              const t = m.get(k) || [0, 0];
              t[0] += a[i];
              t[1]++;
              m.set(k, t);
            });
            return Float64Array.from(a, (v, i) => v - m.get(g[i])[0] / m.get(g[i])[1]);
          },
          Xw = d.X.slice(1, nNamed).map(dm),
          L = lsq(Xw, dm(d.y), d.n);
        fwl = L.error ? null : L.beta;
      }
      out.push({
        unit,
        model,
        se,
        fe,
        ms,
        error: e.error || null,
        n: e.n,
        nFe: e.nFe,
        nFeG: e.nFeG,
        G: e.G,
        dfP: e.dfP,
        terms:
          e.terms &&
          e.terms.map((t) => ({ role: t.role, b: t.b, seR: t.seR, seC: t.seC, pR: t.pR })),
        fwl,
        stata: e.error ? '' : stataCode(e),
        r: e.error ? '' : rCode(e),
      });
    }
    return out;
  }, SPECS);

  for (const r of res) {
    const tag = `${r.unit} ${r.model} se=${r.se} fe=${r.fe}`;
    if (r.bad || r.error) {
      check(false, `${tag}: ${r.bad || r.error}`);
      continue;
    }
    check(
      true,
      `${tag}: n ${r.n}, ${r.nFe || 0} dummies, ${r.G ?? '-'} clusters, ${Math.round(r.ms)} ms`,
    );
    check(r.ms < 60000, `${tag}: runs in under a minute (${Math.round(r.ms)} ms)`);
    const named = r.terms.filter((t) => t.role !== 'const');
    if (r.fe)
      check(r.nFe === r.nFeG - 1 && r.nFe > 0, `${tag}: one dummy per ${r.fe} but the base`);
    if (r.fwl) {
      const rel = Math.max(
        ...named.map((t, j) => Math.abs(t.b - r.fwl[j]) / Math.max(1e-12, Math.abs(r.fwl[j]))),
      );
      check(rel < 1e-8, `${tag}: slopes equal the within regression (rel ${rel.toExponential(1)})`);
    }
    if (/^cl_/.test(r.se)) {
      check(r.G >= 2, `${tag}: clusters counted (${r.G})`);
      if (r.model === 'ols') check(r.dfP === r.G - 1, `${tag}: t on G-1 = ${r.dfP} df`);
      check(
        new RegExp(`vce\\(cluster g_${r.se.slice(3)}\\)`).test(r.stata) &&
          new RegExp(`vcovCL\\(m, cluster = ~${r.se.slice(3)}`).test(r.r),
        `${tag}: Stata and R code cluster the same way`,
      );
    }
    if (r.fe)
      check(
        r.stata.includes(`i.g_${r.fe}`) && r.r.includes(`factor(${r.fe})`),
        `${tag}: Stata and R code carry the fixed effects`,
      );
  }

  // A variable that does not vary within provinces is absorbed: say so, do not crash.
  const absorbed = await page.evaluate(() => {
    const s = specOf();
    Object.assign(s, {
      unit: 'district',
      y: { key: 'literacy', tf: 'none' },
      x: [{ key: 'ntl_2023_popw', tf: 'none', sign: '+' }],
      c: [],
      model: 'ols',
      se: 'hc1',
      fe: 'province',
      statement: 'absorbed',
    });
    // Replace the regressor by its province mean, which the fixed effects absorb exactly.
    const d = cjData(s, 'district'),
      P = adminOf('district').prov,
      m = new Map();
    d.idx.forEach((i, j) => {
      const t = m.get(P[i]) || [0, 0];
      t[0] += d.X[1][j];
      t[1]++;
      m.set(P[i], t);
    });
    const X = d.X.slice();
    X[1] = Float64Array.from(d.idx, (i) => m.get(P[i])[0] / m.get(P[i])[1]);
    const F = fitOLS(X, d.y, d.n);
    return F.error ? F.col >= 2 : false;
  });
  check(
    absorbed,
    'a regressor constant within provinces is reported as absorbed by the fixed effects',
  );

  // The form: fixed effects and cluster choices appear for the unit, and a run from the form works.
  await page.click('#cjOpen');
  await page.evaluate(() => {
    Object.assign(CJ, {
      unit: 'district',
      y: { key: 'literacy', tf: 'none' },
      x: [{ key: 'n_mus', tf: 'asinh', sign: '+' }],
      c: [],
      model: 'ols',
      statement: 'form run with province fixed effects',
    });
    cjForm();
  });
  const opts = await page.evaluate(() => ({
    fe: [...document.querySelectorAll('#cjFe option')].map((o) => o.value),
    se: [...document.querySelectorAll('#cjSe option')].map((o) => o.value),
  }));
  check(
    JSON.stringify(opts.fe) === JSON.stringify(['', 'province']) &&
      opts.se.includes('cl_province') &&
      !opts.se.includes('cl_district'),
    `district form offers province fixed effects and clusters only (${JSON.stringify(opts)})`,
  );
  await page.selectOption('#cjFe', 'province');
  await page.selectOption('#cjSe', 'cl_province');
  await page.fill('#cjText', 'form run with province fixed effects');
  const before = await page.evaluate(() => LOG.length);
  await page.click('#cjRun');
  await page.waitForFunction((b) => LOG.length > b, before, { timeout: 60000 });
  const shown = await page.textContent('#cjOut');
  check(
    /province fixed effects \(\d+ provinces; their \d+ coefficients not shown\)/.test(shown) &&
      /clustered by province \(\d+ clusters\)/.test(shown) &&
      /Only \d+ clusters/.test(shown),
    'the result names the fixed effects, the clusters, and warns about few clusters',
  );
  await page.screenshot({ path: path.join(OUT, 'fe_result.png'), fullPage: false });
  await page.evaluate(() => {
    CJ.unit = 'tehsil';
    cjForm();
  });
  const opts2 = await page.evaluate(() =>
    [...document.querySelectorAll('#cjFe option')].map((o) => o.value),
  );
  check(
    JSON.stringify(opts2) === JSON.stringify(['', 'province', 'district']),
    'tehsil form offers province and district fixed effects',
  );
  await page.evaluate(() => {
    CJ.unit = 'hex';
    cjForm();
  });
  const opts3 = await page.evaluate(() => ({
    fe: [...document.querySelectorAll('#cjFe option')].map((o) => o.value),
    bad: validSpec({ ...specOf(), unit: 'hex', fe: 'district', se: 'hc1', statement: 'x' }),
  }));
  check(
    JSON.stringify(opts3.fe) === JSON.stringify(['', 'province']) && !!opts3.bad,
    'hexagon form offers province fixed effects only; a hexagon spec with district fixed effects is refused (4.5 min in the page)',
  );
  await page.evaluate(() => {
    CJ.unit = 'province';
    cjForm();
  });
  check(
    (await page.$('#cjFe')) === null &&
      (await page.evaluate(() => CJ.fe === '' && !/^cl_/.test(CJ.se))),
    'at province level there are no fixed effects or clusters, and the choice is reset',
  );

  const log = await page.evaluate(() => LOG.filter((e) => !e.error));
  fs.writeFileSync(path.join(OUT, 'fe_results.json'), JSON.stringify({ log }));
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : `\nALL PASS (log in ${OUT})`);
  process.exit(fails.length ? 1 : 0);
})();
