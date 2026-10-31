// The Stata service writes the same data and model lines as the code the page shows (added 31 October
// 2026, protocol 2). No Stata needed. Runs a spread of specifications through the page, asks the page for
// its copy-paste Stata code and for the request it would send the service, has stata_service.py --emit
// write the do-file from that request, and holds the two equal line for line (comments aside). Also
// holds the data CSV the page puts in a run's zip to the SHA-256 the service records. From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_stata_parity.cjs pipeline/gis/viewer/index.html
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const SERVICE = path.resolve('pipeline/gis/viewer/stata_service/stata_service.py');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stata-parity-'));
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};

// [unit, model, y, x, c, se, fe, exposure]: every transform, SE, fixed effect and unit the form offers.
const SPECS = [
  [
    'district',
    'ols',
    ['literacy', 'none'],
    [['n_mus_pre1857', 'log1p']],
    [['ntl_2023_popw', 'none']],
    'hc1',
    null,
    null,
  ],
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
    ['literacy', 'z'],
    [['ntl_2023_popw', 'log1p_z']],
    [['conflict_civilian_deaths_per_100k_ged261', 'asinh_z']],
    'classical',
    null,
    null,
  ],
  [
    'district',
    'poisson',
    ['n_site', 'none'],
    [['literacy', 'none']],
    [['ntl_2023_popw', 'none']],
    'robust',
    null,
    'pop2023',
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
    ['sites_per_million', 'none'],
    [['rwi_popw', 'z']],
    [['travel_city_min_popw', 'none']],
    'hc1',
    null,
    null,
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
  ['province', 'ols', ['sites_per_million', 'none'], [['rwi_popw', 'z']], [], 'hc1', null, null],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind);
  const res = await page.evaluate((SPECS) => {
    LOG.length = 0;
    return SPECS.map(([unit, model, y, x, c, se, fe, exposure]) => {
      const s = {
        format: 'shrines-viewer-conjecture',
        v: 1,
        statement: `parity ${unit} ${model} ${se} ${fe}`,
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
        perms: 99,
        mperms: 99,
        seed: 20261031,
        composite: null,
      };
      const bad = validSpec(s);
      if (bad) return { tag: `${unit} ${model} ${se} ${fe}`, bad };
      const { e } = record(s, null, { prefilled: false, views: 0 });
      if (e.error) return { tag: `${unit} ${model} ${se} ${fe}`, bad: e.error };
      const q = stataRequest(e, true);
      return {
        tag: `#${e.id} ${unit} ${model} se=${se} fe=${fe}${exposure ? ' exposure' : ''}`,
        code: stataCode(e),
        req: q,
        csv: stataDataCsv(q),
        long: q.columns.some((k) => /_v\d+$/.test(k)),
      };
    });
  }, SPECS);

  let sawLong = false;
  for (const r of res) {
    if (r.bad) {
      check(false, `${r.tag}: the page refused or failed the spec: ${r.bad}`);
      continue;
    }
    sawLong = sawLong || r.long;
    const f = path.join(TMP, 'req.json');
    fs.writeFileSync(f, JSON.stringify(r.req));
    let out;
    try {
      out = JSON.parse(
        execFileSync('python', ['-I', SERVICE, '--emit', f], { maxBuffer: 1 << 28 }),
      );
    } catch (err) {
      check(
        false,
        `${r.tag}: the service refused the page's request: ${String(err.stdout || err.message).slice(0, 300)}`,
      );
      continue;
    }
    const page = r.code.split('\n').filter((l) => l.trim() && !l.startsWith('*'));
    const first = page.findIndex((l, i) => l !== out.core[i]);
    check(
      first === -1 && page.length === out.core.length,
      `${r.tag}: the service's ${out.core.length} data and model lines equal the page's code` +
        (first === -1
          ? ''
          : ` (line ${first + 1}: page ${JSON.stringify(page[first]).slice(0, 120)} / service ${JSON.stringify(out.core[first]).slice(0, 120)})`),
    );
    check(
      out.do_file.includes(out.core.join('\n')) && !out.core.some((l) => /[`$\\]/.test(l)),
      `${r.tag}: the do-file carries those lines unchanged, and none has a macro or backslash`,
    );
    check(
      crypto.createHash('sha256').update(r.csv, 'utf8').digest('hex') === out.data_sha256,
      `${r.tag}: the zip's data.csv hashes to the SHA-256 the service records`,
    );
  }
  check(sawLong, 'a column name over 32 characters went through, cut and numbered');
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
