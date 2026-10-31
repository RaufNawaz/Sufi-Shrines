// Browser checks for the specification curve under a test's result (added 31 October 2026): the
// number of specifications, the recorded test found among them with its own coefficient, every
// estimate equal to a full run of the same specification, nothing added to the log, the chart and
// the CSV. From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_spec_curve.cjs pipeline/gis/viewer/index.html [outdir]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'viewer-curve-test'));
fs.mkdirSync(OUT, { recursive: true });
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
  const runForm = async (cj) => {
    await page.evaluate((cj) => {
      Object.assign(CJ, cj);
      cjForm();
    }, cj);
    await page.fill('#cjText', cj.statement);
    const before = await page.evaluate(() => LOG.length);
    await page.click('#cjRun');
    await page.waitForFunction((b) => LOG.length > b, before, { timeout: 120000 });
    return page.evaluate(() => LOG[LOG.length - 1]);
  };
  const e = await runForm({
    unit: 'district',
    y: { key: 'literacy', tf: 'none' },
    x: [{ key: 'ntl_2023_popw', tf: 'log1p', sign: '+' }],
    c: [
      { key: 'travel_city_min_popw', tf: 'log1p' },
      { key: 'pm25_2021_popw', tf: 'none' },
    ],
    model: 'ols',
    se: 'hc1',
    fe: '',
    statement: 'night lights go with literacy, whatever the controls',
  });
  check(!e.error, `the test runs (${e.error || 'n ' + e.n})`);
  await page.click('#cjCurveBtn');
  const n0 = await page.textContent('#scN');
  // 4 control subsets x 2 units (literacy exists at tehsil and district only) x 3 outcome transforms.
  check(
    /^24 specifications/.test(n0),
    `controls, unit (tehsil, district) and transform give 4 x 2 x 3 = 24 specifications (${n0})`,
  );
  await page.check('#scF');
  const n1 = await page.textContent('#scN');
  // With and without province fixed effects: 4 x 3 x 2 x 2 = 48.
  check(/^48 specifications/.test(n1), `adding province fixed effects gives 48 (${n1})`);
  const logBefore = await page.evaluate(() => LOG.length);
  await page.click('#scRun');
  await page.waitForFunction(() => window.LAST_CURVE && !$('scRun').dataset.running, null, {
    timeout: 300000,
  });
  const C = await page.evaluate(() => {
    const C = window.LAST_CURVE;
    return {
      n: C.specs.length,
      ok: C.res.filter((r) => !r.error).length,
      errs: [...new Set(C.res.filter((r) => r.error).map((r) => r.error))],
      summary: C.summary,
      ms: C.ms,
      dots: document.querySelectorAll('#scSvg circle').length,
      ring: [...document.querySelectorAll('#scSvg circle')].filter(
        (c) => c.getAttribute('fill') === 'none',
      ).length,
      log: LOG.length,
    };
  });
  check(
    C.n === 48 && C.ok === 48,
    `${C.n} specifications run, ${C.ok} estimated in ${(C.ms / 1000).toFixed(1)} s${C.errs.length ? '; could not: ' + C.errs.join(' | ') : ''}`,
  );
  check(
    C.dots === C.ok + 1 && C.ring === 1,
    `one dot per estimate (${C.dots - 1}) and one ring for the test as recorded`,
  );
  check(C.log === logBefore, 'the curve adds nothing to the log or the multiple-testing count');
  check(
    /Median standardised coefficient/.test(C.summary) && /expected sign/.test(C.summary),
    `summary: ${C.summary}`,
  );

  // The recorded test among them, with its own coefficient; and every estimate equal to a full run.
  const cons = await page.evaluate((id) => {
    const C = window.LAST_CURVE,
      e = LOG.find((x) => x.id === id),
      s = e.spec;
    const i = C.specs.findIndex(
      (x) => x.unit === s.unit && x.y.tf === s.y.tf && !x.fe && x.c.length === s.c.length,
    );
    const rec = C.res[i];
    const xb = e.terms.find((t) => t.role === 'x');
    let worst = 0,
      checked = 0;
    // A full run of every 5th specification (Conley, placebo and all), against the curve's quick fit.
    for (let k = 0; k < C.specs.length; k += 5) {
      if (C.res[k].error) continue;
      const full = runSpec(C.specs[k], C.specs[k].unit, false);
      if (full.error) continue;
      const t = full.terms.find((t) => t.role === 'x');
      const se = C.specs[k].se === 'classical' ? t.seC : t.seR;
      worst = Math.max(
        worst,
        Math.abs(t.b - C.res[k].b) / Math.max(1e-12, Math.abs(t.b)),
        Math.abs(se - C.res[k].se) / se,
      );
      checked++;
    }
    return { b: rec && rec.b, seCurve: rec && rec.se, bTest: xb.b, seTest: xb.seR, worst, checked };
  }, e.id);
  check(
    Math.abs(cons.b - cons.bTest) < 1e-12 * Math.abs(cons.bTest) + 1e-15 &&
      Math.abs(cons.seCurve - cons.seTest) < 1e-12 * cons.seTest,
    `the recorded specification in the curve has the test's own coefficient and SE (${cons.b} / ${cons.bTest})`,
  );
  check(
    cons.checked >= 8 && cons.worst < 1e-12,
    `${cons.checked} specifications refitted in full agree with the curve (worst ${cons.worst.toExponential(1)})`,
  );

  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#scCsv')]);
  const csv = fs
    .readFileSync(await dl.path(), 'utf8')
    .replace(/^﻿/, '')
    .trim()
    .split(/\r?\n/);
  check(
    csv.length === C.ok + 1 &&
      csv[0].startsWith('rank,unit,outcome_transform') &&
      csv.filter((l) => /"yes"$/.test(l)).length === 1,
    `CSV: ${csv.length - 1} rows, the recorded test marked once`,
  );
  await page.$eval('#cjCurve', (el) => el.scrollIntoView());
  await page.screenshot({ path: path.join(OUT, 'curve.png') });

  // Poisson: the outcome is not transformed, so that choice is off.
  await runForm({
    unit: 'district',
    y: { key: 'n_mus', tf: 'none' },
    x: [{ key: 'literacy', tf: 'none', sign: '+' }],
    c: [],
    model: 'poisson',
    se: 'hc1',
    fe: '',
    exposure: 'pop2023',
    statement: 'a Poisson curve',
  });
  await page.click('#cjCurveBtn');
  const pz = await page.evaluate(() => ({
    t: $('scT').disabled,
    c: $('scC').disabled,
    n: $('scN').textContent,
  }));
  // n_mus with Census exposure exists at tehsil and district.
  check(
    pz.t && pz.c && /^2 specifications/.test(pz.n),
    `Poisson without controls varies the unit only (${pz.n})`,
  );

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
