// Browser checks for "Test a conjecture" in the Shrines and Welfare viewer (Playwright, Chromium).
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_conjecture.cjs pipeline/gis/viewer/index.html [outdir]
// Screenshots, downloads and cj_results.json (the exported log) go to outdir (default: the OS temp
// folder). Then check the numbers against the independent reference:
//   python -I pipeline/gis/viewer/tests/check_conjecture_reference.py pipeline/gis/viewer/index.html <outdir>/cj_results.json
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'viewer-conjecture-test'));
fs.mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};

async function ready(page) {
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind);
  await page.waitForTimeout(400);
}
const run = async (page) => {
  const before = await page.evaluate(() => LOG.length);
  await page.click('#cjRun');
  await page.waitForFunction((b) => LOG.length > b, before, { timeout: 60000 });
  await page.waitForTimeout(100);
  return page.evaluate(() => LOG[LOG.length - 1]);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  const watch = (p, tag) => {
    p.on(
      'console',
      (m) =>
        m.type() === 'error' &&
        !/Failed to load resource/.test(m.text()) &&
        errors.push(tag + m.text()),
    );
    p.on('pageerror', (e) => errors.push(tag + 'pageerror: ' + e.message));
  };
  watch(page, '');
  await ready(page);
  check(
    await page.evaluate(() => typeof jStat !== 'undefined' && !!ST),
    'jStat 1.9.6 loaded from cdnjs',
  );

  // ---- open, prefill from the map (district, literacy, sites per million)
  await page.click('#cjOpen');
  await page.waitForTimeout(200);
  const pre = await page.evaluate(() => ({
    open: !document.getElementById('cj').hidden,
    y: CJ.y.key,
    x: CJ.x.map((v) => v.key),
    unit: CJ.unit,
    focus: document.activeElement.id,
  }));
  check(
    pre.open && pre.y === 'literacy' && pre.x[0] === 'sites_per_million' && pre.unit === 'district',
    'prefill from the map: ' + JSON.stringify(pre),
  );
  check(pre.focus === 'cjTitle', 'focus moves into the drawer');

  // ---- spec 1: district OLS, literacy ~ log(1+pre-1857 Muslim shrines) + night lights
  await page.click('#cjX .cjrow [data-rm]');
  await page.selectOption('#cjX [data-add]', 'n_mus_pre1857');
  await page.selectOption('#cjX .cjrow [data-tf]', 'log1p');
  await page.selectOption('#cjC [data-add]', 'ntl_2023_popw');
  await page.fill(
    '#cjText',
    'districts with more pre-1857 Muslim shrines have higher literacy, controlling for night lights',
  );
  await page.click('#cjRun');
  await page.waitForTimeout(150);
  const refuse = await page.evaluate(() => [
    document.getElementById('cjMsg').textContent,
    LOG.length,
  ]);
  check(
    /sign you expect/.test(refuse[0]) && refuse[1] === 0,
    'refuses to run before a sign is stated: ' + refuse[0].slice(0, 70),
  );
  await page.selectOption('#cjX .cjrow [data-sign]', '+');
  const e1 = await run(page);
  check(
    !e1.error && e1.n > 100 && e1.unit === 'district' && e1.model === 'ols',
    `OLS district: n=${e1.n}, dropped ${e1.nMiss}+${e1.nBad}`,
  );
  const t1 = e1.terms.find((t) => t.role === 'x');
  console.log(
    '  b',
    t1.b,
    'seR',
    t1.seR,
    'pR',
    t1.pR,
    'seC',
    t1.seC,
    'R2',
    e1.r2,
    'Moran',
    JSON.stringify(e1.moran),
  );
  check(
    t1.seR > 0 && t1.pR > 0 && t1.pR <= 1 && t1.loR < t1.b && t1.hiR > t1.b,
    'coef, robust SE, p and CI present',
  );
  const r1 = await page.textContent('#cjOut');
  check(
    /Ecological/.test(r1) &&
      /curated, not a census/.test(r1) &&
      /Benjamini/.test(r1) &&
      /25 of the 80/.test(r1),
    'caveats shown: ecological, curated archive, BH, pre-1857 unknowns',
  );
  check(/the sign (matches|is the opposite)/.test(r1), 'sign match stated');
  check(
    !/\b(effect|impact|leads to|drives|causal effect)\b/i.test(r1.replace(e1.statement, '')),
    'no causal wording in the result',
  );
  check(/Moran's I of the residuals/.test(r1), "Moran's I reported");
  check(
    (await page.$$eval('#cjRvf circle', (c) => c.length)) === e1.n,
    'residual vs fitted plot has one point per unit',
  );
  await page.screenshot({ path: out('cj_ols_district.png') });

  // ---- switch to classical SEs and back: both are stored
  check(Math.abs(t1.seC - t1.seR) > 0, 'classical and HC1 SEs both stored and differ');

  // ---- spec 2: district Poisson, n_site ~ literacy + night lights, exposure census population
  await page.click('#cjY [data-rm]');
  await page.selectOption('#cjY [data-add]', 'n_site');
  await page.click('#cjModel button:text-is("Poisson (count)")');
  await page.click('#cjX .cjrow [data-rm]');
  await page.selectOption('#cjX [data-add]', 'literacy');
  await page.selectOption('#cjX .cjrow [data-sign]', '+');
  await page.selectOption('#cjEx', 'pop2023');
  await page.fill('#cjText', 'more literate districts hold more archive sites per head');
  const yTfDisabled = await page.$eval('#cjY [data-tf]', (s) => s.disabled);
  check(yTfDisabled, 'Poisson: outcome transform disabled');
  const e2 = await run(page);
  check(
    !e2.error && e2.model === 'poisson' && e2.spec.exposure === 'pop2023' && e2.iter > 0,
    `Poisson n_site: n=${e2.n}, iter ${e2.iter}, pseudo-R2 ${e2.pseudo && e2.pseudo.toFixed(3)}, disp ${e2.disp && e2.disp.toFixed(2)}`,
  );
  check(/Rate ratio/.test(await page.textContent('#cjOut')), 'Poisson table shows rate ratios');
  await page.screenshot({ path: out('cj_poisson.png') });

  // ---- spec 3: tehsil OLS with kNN weights, then MAUP and the residual map
  await page.click('#cjY [data-rm]');
  await page.selectOption('#cjY [data-add]', 'sites_per_million');
  await page.click('#cjX .cjrow [data-rm]');
  await page.selectOption('#cjX [data-add]', 'rwi_popw');
  await page.selectOption('#cjX .cjrow [data-tf]', 'z');
  await page.selectOption('#cjX .cjrow [data-sign]', '-');
  await page.click('#cjC .cjrow [data-rm]');
  await page.selectOption('#cjC [data-add]', 'travel_city_min_popw');
  await page.click('#cjUnits button:text-is("Tehsil")');
  await page.selectOption('#cjW', 'knn');
  await page.fill(
    '#cjText',
    'richer tehsils have fewer archive sites per million, given travel time to a city',
  );
  const model3 = await page.evaluate(() => CJ.model);
  check(model3 === 'ols', 'model returns to OLS for a non-count outcome');
  const e3 = await run(page);
  check(
    !e3.error && e3.unit === 'tehsil' && /6 nearest/.test(e3.moran.w),
    `tehsil OLS with kNN: n=${e3.n}, ${e3.moran.w}`,
  );

  await page.click('#cjMaupBtn');
  await page.waitForSelector('#cjMaup table', { timeout: 120000 });
  const maup = await page.$$eval('#cjMaup tr', (r) =>
    r.map((x) => x.innerText.replace(/\s+/g, ' ')),
  );
  console.log('  MAUP:\n   ' + maup.join('\n   '));
  const logAfter = await page.evaluate(() =>
    LOG.map((e) => [e.id, e.unit, e.maupOf, e.error || '']),
  );
  const re = logAfter.filter((x) => x[2] === e3.id);
  check(
    maup.length === 5 && re.length === 3 && re.every((x) => !x[3]),
    'MAUP: same spec at hexagon, district, province, logged as re-runs of #' +
      e3.id +
      ': ' +
      JSON.stringify(re),
  );
  const hexRun = await page.evaluate(() => LOG.find((e) => e.unit === 'hex'));
  check(
    hexRun && /H3/.test(hexRun.moran.w),
    'hexagon re-run uses H3 neighbours: ' + (hexRun && hexRun.moran.w),
  );
  // H3 ring-1 neighbours equal the 6 nearest hexagon centres (brute force), for 300 interior hexagons.
  const h3chk = await page.evaluate(() => {
    const fs = feats('hex'),
      nb = contiguity('hex'),
      C = fs.map((f) => h3.cellToLatLng(f.hex));
    const cl = Math.cos((C[0][0] * Math.PI) / 180);
    let tested = 0,
      bad = 0;
    for (let i = 0; i < fs.length && tested < 300; i += 61) {
      if (nb[i].length !== 6) continue;
      tested++;
      const d = C.map((c, j) => [
        j === i
          ? Infinity
          : ((c[1] - C[i][1]) * Math.cos((C[i][0] * Math.PI) / 180)) ** 2 + (c[0] - C[i][0]) ** 2,
        j,
      ]).sort((a, b) => a[0] - b[0]);
      const near = d
        .slice(0, 6)
        .map((x) => x[1])
        .sort((a, b) => a - b);
      if (near.join() !== nb[i].join()) bad++;
    }
    return { tested, bad, cl };
  });
  check(
    h3chk.tested >= 200 && h3chk.bad === 0,
    `H3 ring-1 = 6 nearest centres for ${h3chk.tested} interior hexagons (${h3chk.bad} differ)`,
  );
  await page.screenshot({ path: out('cj_maup.png') });

  // residual map
  await page.click('#cjResMap');
  await page.waitForTimeout(500);
  const rm = await page.evaluate(() => ({
    kind: V.kind,
    unit,
    col: V.col.filter(Boolean).length,
    legend: document.getElementById('legend').innerText,
  }));
  check(
    rm.kind === 'resid' && rm.unit === 'tehsil' && rm.col === e3.n && /SD/.test(rm.legend),
    `residual map: ${rm.col} tehsils coloured on a diverging scale`,
  );
  await page.click('#cjClose');
  await page.waitForTimeout(200);
  check(
    await page.evaluate(() => document.activeElement.id === 'cjOpen'),
    'close returns focus to the button',
  );
  await page.screenshot({ path: out('cj_residual_map.png') });
  // hover a tehsil on the residual map shows its residual
  await page.evaluate(() => {
    document.getElementById('showSites').checked = false;
    overlays();
    map.setView([31.45, 74.35], 8, { animate: false });
  });
  await page.waitForTimeout(400);
  const hp = await page.evaluate(() => {
    const p = map.latLngToContainerPoint([31.52, 74.36]);
    const r = document.getElementById('map').getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  });
  await page.mouse.move(hp.x - 30, hp.y - 30);
  await page.mouse.move(hp.x, hp.y, { steps: 4 });
  await page.waitForTimeout(300);
  check(
    /Residual|Not in the fit/.test(await page.textContent('#tip')),
    'hover on the residual map reports the residual',
  );
  await page.mouse.click(hp.x, hp.y);
  await page.waitForTimeout(300);
  const card = await page.textContent('#card');
  check(
    /observed/.test(card) || /Left out/.test(card),
    'card on the residual map shows observed and fitted',
  );
  await page.keyboard.press('Escape');
  await page.click('#legend #residOff');
  check(await page.evaluate(() => V.kind !== 'resid'), 'back to the indicator map');
  await page.evaluate(() => {
    map.fitBounds([
      [23.6, 60.9],
      [37.1, 77.8],
    ]);
  });

  // ---- exports
  await page.click('#cjOpen');
  await page.waitForTimeout(200);
  const dl = async (sel) => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
    const p = out('dl_' + d.suggestedFilename());
    await d.saveAs(p);
    return [d.suggestedFilename(), fs.readFileSync(p, 'utf8')];
  };
  const [csvName, csv] = await dl('#cjCSV');
  const csvLines = csv.trim().split(/\r?\n/);
  const nHyp = await page.evaluate(() => bh().m);
  check(
    /^conjectures_.*\.csv$/.test(csvName) &&
      csvLines.length === 1 + nHyp &&
      /p_bh/.test(csvLines[0]),
    `CSV export: ${csvLines.length - 1} rows = ${nHyp} hypotheses`,
  );
  const [, md] = await dl('#cjMD');
  check(
    /^# Conjectures tested/.test(md) &&
      /docs\/research/.test(md) &&
      md.split('\n').filter((l) => /^\| \d/.test(l)).length === nHyp,
    'Markdown export: table rows and RULE 0 note',
  );
  const [jsonName, json] = await dl('#cjJSON');
  const J = JSON.parse(json);
  check(
    J.format === 'shrines-viewer-conjectures' && J.specs.length === 3 && J.log.length === 6,
    `JSON export: ${J.specs.length} specs, ${J.log.length} log entries`,
  );
  fs.writeFileSync(out('cj_results.json'), json);

  // ---- data downloads
  const [dName, dcsv] = await dl('#cjData');
  const dl1 = dcsv.trim().split(/\r?\n/);
  const head = dl1[0].split(',');
  check(
    dName === 'shrines_tehsil.csv' &&
      dl1.length === 578 &&
      [
        'id',
        'name',
        'district_id',
        'district',
        'province_id',
        'province',
        'literacy',
        'n_mus_pre1857',
        'n_site',
        'pop2023',
      ].every((c) => head.includes(c)),
    `data download (tehsil): ${dl1.length - 1} rows, ${head.length} columns`,
  );
  await page.click('#cjUnits button:text-is("District")');
  const [d2Name, d2] = await dl('#cjData');
  const d2l = d2.trim().split(/\r?\n/);
  const lah = d2l.find((l) => /,Lahore,/.test(l));
  const h2 = d2l[0].split(',');
  const truthLah = await page.evaluate(
    () => D.district.features.find((f) => f.properties.name === 'Lahore').properties,
  );
  check(
    d2Name === 'shrines_district.csv' &&
      d2l.length === 161 &&
      lah &&
      lah.split(',')[h2.indexOf('literacy')] === String(truthLah.literacy) &&
      lah.split(',')[h2.indexOf('province')] === 'Punjab',
    'district download: 160 rows; Lahore literacy and province match the data',
  );
  fs.writeFileSync(out('dl_district_check.txt'), d2l.slice(0, 3).join('\n'));
  const t0 = Date.now();
  await page.click('#cjUnits button:text-is("Hexagon")');
  const [, d3] = await dl('#cjData');
  const d3l = d3.trim().split(/\r?\n/);
  check(
    d3l.length === 19198 && /^h3,lat,lon,tehsil_id/.test(d3l[0]),
    `hexagon download: ${d3l.length - 1} rows in ${Date.now() - t0} ms`,
  );

  // ---- replication code
  const code = await page.evaluate(() => [
    document.getElementById('cjStata')?.value,
    document.getElementById('cjR')?.value,
  ]);
  console.log(
    '  Stata:\n' + code[0].replace(/^/gm, '    ') + '\n  R:\n' + code[1].replace(/^/gm, '    '),
  );
  check(
    /regress y x1 c1 if touse, vce\(robust\)/.test(code[0]) &&
      /vcovHC\(m, type = "HC1"\)/.test(code[1]),
    'Stata and R code for the last test',
  );

  // ---- persistence across reload, and re-run of the JSON spec reproduces every number
  const p2 = await ctx.newPage();
  watch(p2, '(reload) ');
  await ready(p2);
  check(await p2.evaluate(() => LOG.length === 6), 'log survives a reload (localStorage)');
  await p2.evaluate(() => {
    LOG = [];
    saveLog();
  });
  await p2.click('#cjOpen');
  await p2.setInputFiles('#cjFile', out('dl_' + jsonName));
  await p2.waitForFunction(() => LOG.length === 3, null, { timeout: 60000 });
  const again = await p2.evaluate(() => LOG);
  let same = true;
  for (let i = 0; i < 3; i++) {
    const a = J.log.filter((e) => e.maupOf == null)[i],
      b = again[i];
    const fields = (e) => JSON.stringify([e.n, e.terms, e.r2, e.pseudo, e.moran, e.corr, e.wald]);
    if (fields(a) !== fields(b)) {
      same = false;
      console.log('  differs', i, fields(a).slice(0, 200), '\n vs ', fields(b).slice(0, 200));
    }
  }
  check(
    same,
    'JSON spec re-runs to identical numbers (coefficients, SEs, p, Moran, permutation p)',
  );
  await p2.close();

  // ---- keyboard: Esc closes the drawer
  await page.focus('#cjText');
  await page.keyboard.press('Escape');
  check(await page.evaluate(() => document.getElementById('cj').hidden), 'Esc closes the drawer');

  // ---- storage blocked: page still works
  const ctxB = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await ctxB.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  const pb = await ctxB.newPage();
  watch(pb, '(blocked) ');
  await ready(pb);
  await pb.click('#cjOpen');
  await pb.selectOption('#cjX .cjrow [data-sign]', '+');
  const eb = await run(pb);
  check(
    !eb.error && /will not keep it/.test(await pb.textContent('#cjLog')),
    'storage blocked: test runs and the log says it will not be kept',
  );
  await ctxB.close();

  // ---- 390 px, light and dark
  for (const scheme of ['light', 'dark']) {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: scheme,
      hasTouch: true,
    });
    const p = await c.newPage();
    watch(p, `(390 ${scheme}) `);
    await ready(p);
    await p.click('#cjOpen');
    await p.waitForTimeout(200);
    await p.selectOption('#cjX .cjrow [data-sign]', '+');
    await p.selectOption('#cjC [data-add]', 'ntl_2023_popw');
    await run(p);
    await p.click('#cjMaupBtn');
    await p.waitForSelector('#cjMaup table', { timeout: 120000 });
    const w = await p.evaluate(() => {
      const cj = document.getElementById('cj');
      const over = [...cj.querySelectorAll('*')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width && (r.right > 390.5 || r.left < -0.5) && !el.closest('.scroll');
        })
        .map((el) => el.tagName + '#' + el.id + '.' + el.className)
        .slice(0, 5);
      const small = [...cj.querySelectorAll('button, select, input:not([type=file]), summary')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width && r.height < 43.5 && el.tagName !== 'SUMMARY';
        })
        .map(
          (el) => el.tagName + ':' + (el.textContent || el.getAttribute('aria-label')).slice(0, 20),
        );
      return {
        doc: document.documentElement.scrollWidth,
        cjw: cj.scrollWidth,
        cjc: cj.clientWidth,
        over,
        small,
      };
    });
    check(
      w.doc <= 390 && w.cjw <= w.cjc && !w.over.length,
      `390 ${scheme}: no sideways scroll ${JSON.stringify(w)}`,
    );
    check(
      !w.small.length,
      `390 ${scheme}: every control at least 44 px tall ${JSON.stringify(w.small)}`,
    );
    await p.evaluate(() => document.getElementById('cjOut').scrollIntoView());
    await p.screenshot({ path: out(`cj_390_${scheme}.png`) });
    if (scheme === 'dark') {
      await p.evaluate(() => document.getElementById('cj').scrollTo(0, 0));
      await p.screenshot({ path: out('cj_390_dark_form.png') });
    }
    await c.close();
  }
  // desktop dark, drawer and results
  const cd = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: 'dark',
  });
  const pd = await cd.newPage();
  watch(pd, '(dark) ');
  await ready(pd);
  await pd.click('#cjOpen');
  await pd.selectOption('#cjX .cjrow [data-sign]', '+');
  await run(pd);
  await pd.click('#cjResMap');
  await pd.waitForTimeout(500);
  await pd.screenshot({ path: out('cj_dark_desktop.png') });
  await cd.close();

  check(
    errors.length === 0,
    'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''),
  );
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
