// Browser checks for the fixes made after the 30-30 October 2026 review of the viewer
// (docs/research/VIEWER_REVIEW_2026-10-30.md). Each check names the finding it holds in place.
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_review_fixes.cjs pipeline/gis/viewer/index.html
const path = require('path');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const KEY = 'shrines_viewer_conjectures_v1';
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};
const SPEC = {
  format: 'shrines-viewer-conjecture',
  v: 1,
  statement: 'districts with more archive sites have higher literacy',
  unit: 'district',
  y: { key: 'literacy', tf: 'none' },
  x: [{ key: 'n_site', tf: 'none', sign: '+' }],
  c: [],
  model: 'ols',
  se: 'hc1',
  exposure: null,
  weights: 'contig',
  k: 6,
  perms: 199,
  mperms: 199,
  seed: 20261030,
};

async function open(ctx, init) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on(
    'console',
    (m) =>
      m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()),
  );
  if (init) await page.addInitScript(init.fn, init.arg);
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind, null, {
    timeout: 30000,
  });
  // The page opens on None (checked below); these checks were written against literacy.
  page.openedOn = await page.evaluate(() => ({ kind: V.kind, sel: [...sel] }));
  await page.selectOption('#ind', 'literacy');
  await page.waitForTimeout(200);
  page.errors = errors;
  return page;
}
const seed = (log) => ({
  fn: ([k, v]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(k, v);
      sessionStorage.setItem('seeded', '1');
    }
  },
  arg: [KEY, JSON.stringify(log)],
});

(async () => {
  const browser = await chromium.launch();
  let ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    acceptDownloads: true,
  });

  // ---- #21 stored XSS through the log, #22 a malformed entry
  {
    const evil = [
      {
        id: '<img src=x onerror="document.title=\'XSS\'">',
        ts: '2026-10-30T00:00:00.000Z',
        spec: SPEC,
      },
      { id: 1 },
      {
        id: 2,
        ts: '2026-10-30T00:00:00.000Z',
        spec: SPEC,
        unit: 'district',
        n: 5,
        terms: [
          {
            role: 'x',
            key: 'n_site',
            tf: 'none',
            b: 1,
            seR: 1,
            seC: 1,
            pR: 0.5,
            pC: 0.5,
            maupOf: '<b>x</b>',
          },
        ],
        statement: '<script>document.title="XSS2"</script>',
      },
    ];
    const p = await open(ctx, seed(evil));
    await p.click('#cjOpen');
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => ({
      title: document.title,
      open: !document.getElementById('cj').hidden,
      bad: LOG_BAD,
      n: LOG.length,
      clear: !!document.getElementById('cjCSV'),
      html: document.getElementById('cjLog').innerHTML,
    }));
    check(
      st.title === 'Shrines and Welfare',
      `#21 no script from a planted log entry (title "${st.title}")`,
    );
    check(
      st.open && st.clear,
      '#22 the drawer opens and the log controls exist despite malformed entries',
    );
    check(
      st.bad >= 2 && !/<img|<script/.test(st.html),
      `#21/#22 malformed entries ignored and counted (${st.bad})`,
    );
    await p.close();
  }
  await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });

  // ---- #24 hostile specs, #23 code injection, #28 CSV formulas
  {
    const p = await open(ctx);
    const refused = await p.evaluate((S) => {
      const bad = [
        { ...S, x: [{ key: 'n_site', tf: 'none', sign: 'toString' }] },
        { ...S, y: { key: '__proto__', tf: 'none' } },
        { ...S, y: { key: 'literacy', tf: 'constructor' } },
        { ...S, mperms: -1 },
        { ...S, perms: 1e8 },
        { ...S, statement: 12345 },
        { ...S, se: 'whatever' },
        {
          ...S,
          x: [
            { key: 'n_site', tf: 'none', sign: '+' },
            { key: 'n_site', tf: 'none', sign: '+' },
          ],
        },
      ];
      return bad.map((b) => validSpec(b));
    }, SPEC);
    check(
      refused.every((r) => typeof r === 'string'),
      `#24 hostile specs refused: ${JSON.stringify(refused)}`,
    );
    await p.click('#cjOpen');
    const inj = { ...SPEC, statement: 'harmless\rshell del /q C:\\x\\*\u2028system("echo pwned")' };
    await p.evaluate((s) => rerun(s), inj);
    await p.waitForTimeout(300);
    const code = await p.evaluate(() => [$('cjStata').value, $('cjR').value]);
    const lines = code.join('\n').split(/\r\n|\r|\n|\u2028|\u2029/);
    check(
      !lines.some((l) => /^\s*(shell|system\()/.test(l)),
      '#23 a statement cannot start a new line in the Stata or R code',
    );
    const msg = await p.evaluate((S) => {
      rerun([{ ...S, mperms: -1 }, S]);
      return $('cjMsg').textContent;
    }, SPEC);
    check(
      /1 spec re-run; 1 refused/.test(msg) && !/not valid JSON/.test(msg),
      `#24 one bad spec in a batch does not stop the rest: "${msg}"`,
    );
    const csv = await p.evaluate((S) => {
      rerun({ ...S, statement: '=HYPERLINK("http://x","y")' });
      return logCSV();
    }, SPEC);
    check(
      /,'=HYPERLINK/.test(csv) || /"'=HYPERLINK/.test(csv),
      '#28 a formula-like statement is neutralised in the CSV',
    );
    check(p.errors.length === 0, 'no page errors (specs) ' + p.errors.join(' | '));
    await p.close();
  }

  // ---- #7 BH counts a hypothesis once; hiding keeps it in the family
  {
    const p = await open(ctx);
    const r = await p.evaluate((S) => {
      localStorage.removeItem('shrines_viewer_conjectures_v1');
      LOG = [];
      const S2 = { ...S, x: [{ key: 'n_mus', tf: 'none', sign: '+' }] };
      record(S, null);
      const m1 = bh().m;
      record(S, null);
      record(S, null);
      const m2 = bh().m;
      record(S2, null);
      const m3 = bh().m;
      LOG.forEach((e) => (e.cleared = true));
      saveLog();
      const m4 = bh().m;
      return [m1, m2, m3, m4];
    }, SPEC);
    check(
      r[0] === 1 && r[1] === 1 && r[2] === 2 && r[3] === 2,
      `#7 BH family: repeats count once, hiding keeps them (${r})`,
    );
    await p.close();
  }

  // ---- #27 two tabs merge their logs
  {
    const a = await open(ctx),
      b = await open(ctx);
    await a.evaluate(() => {
      localStorage.removeItem('shrines_viewer_conjectures_v1');
      LOG = [];
    });
    await b.evaluate(() => (LOG = []));
    await a.evaluate((S) => record(S, null), SPEC);
    await b.evaluate((S) => record({ ...S, unit: 'tehsil' }, null), SPEC);
    const ids = await a.evaluate(() => {
      LOG = mergeLog(LOG, readStored());
      return LOG.map((e) => e.id);
    });
    check(
      ids.length === 2 && ids[0] !== ids[1],
      `#27 two tabs keep both runs with distinct ids (${ids})`,
    );
    await a.close();
    await b.close();
  }

  // ---- #14 tertiles, #15 median, #9 log(1+x), #3 Poisson exposure, #19 the travel-time defect
  {
    const p = await open(ctx);
    const r = await p.evaluate(() => {
      const vals = feats('hex').map((f) => f.p.share_pop_within_60min_walk_health),
        t = tertiles(vals),
        c = classCounts(vals, t, 3);
      const neg = ['district', 'tehsil', 'province'].some((u) =>
        feats(u).some((f) => f.p.travel_city_min_popw != null && f.p.travel_city_min_popw < 0),
      );
      const lg = runSpec(
        {
          statement: 's',
          unit: 'tehsil',
          y: { key: 'literacy', tf: 'none' },
          x: [{ key: 'pm25_change_11_21', tf: 'log1p', sign: '+' }],
          c: [],
          model: 'ols',
          se: 'hc1',
          exposure: null,
          weights: 'contig',
          k: 6,
          perms: 99,
          mperms: 99,
          seed: 1,
        },
        'tehsil',
        false,
      );
      return {
        c,
        med: [median([1, 2, 3, 4]), median([3, 1, 2])],
        neg,
        lg: lg.error || '',
        defect: DEFECT,
      };
    });
    check(
      r.c[0] > 0 && r.c[2] < r.c.reduce((a, b) => a + b, 0),
      `#14 zero-heavy tertiles are not all "high" (${r.c})`,
    );
    check(
      r.med[0] === 2.5 && r.med[1] === 2,
      `#15 median of an even count averages the middle two (${r.med})`,
    );
    check(/asinh/.test(r.lg), '#9 log(1+x) of values <= -1 refuses and points to asinh');
    check(
      // Since the 30 Oct 2026 rebuild the data has no negative travel time at all, so the page's
      // guard masks nothing and shows no defect note.
      !r.neg && r.defect.travel_city_min_popw === 0 && r.defect.share_pop_within_60min_city === 0,
      `#19 no negative travel time in the data, nothing masked (${JSON.stringify(r.defect)})`,
    );
    await p.click('#cjOpen');
    await p.evaluate(() => {
      CJ.y = { key: 'n_site', tf: 'none' };
      CJ.x = [{ key: 'literacy', tf: 'none', sign: '-' }];
      cjForm();
    });
    await p.locator('#cjModel button', { hasText: 'Poisson' }).click();
    check(
      await p.evaluate(() => CJ.model === 'poisson' && EXPO.includes(CJ.exposure)),
      '#3 choosing Poisson sets the population exposure',
    );
    await p.close();
  }

  // ---- decisions of 30 Oct 2026: opens on None, libraries inline, pre-registration points outside
  {
    const p = await open(ctx);
    check(
      p.openedOn.kind === 'none' && p.openedOn.sel.length === 0,
      'the page opens on None: ' + JSON.stringify(p.openedOn),
    );
    const html = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'index.html'),
      'utf8',
    );
    check(
      !/<script[^>]+src="https?:|<link[^>]+href="https?:/.test(html) &&
        (await p.evaluate(() => typeof L + typeof h3 + typeof pako + typeof jStat)) ===
          'objectobjectobjectfunction',
      'index.html carries its four libraries inline, and all four load',
    );
    check(
      await p.evaluate(
        () =>
          !!document.querySelector('#cj a[href="https://osf.io/prereg/"]') &&
          !!document.querySelector('#cj a[href="https://aspredicted.org/"]'),
      ),
      'the drawer points to OSF and AsPredicted for a confirmatory plan',
    );
    // Native support: GDP per capita is shown at every unit but measured for 32 divisions.
    await p.selectOption('#ind', 'gdp_pc_2023_popw');
    await p.waitForTimeout(200);
    check(
      /Measured per division \(32 GADM admin-2 units\)/.test(
        await p.evaluate(() => document.getElementById('def').textContent),
      ),
      'the definition names where GDP per capita was measured (32 divisions)',
    );
    await p.close();
    const p2 = await open(ctx);
    await p2.click('#cjOpen');
    await p2.evaluate(() => {
      CJ.unit = 'district';
      CJ.model = 'ols';
      CJ.y = { key: 'literacy', tf: 'none' };
      CJ.x = [{ key: 'gdp_pc_2023_popw', tf: 'none', sign: '+' }];
      CJ.c = [];
      cjForm();
    });
    await p2.fill('#cjText', 'richer districts are more literate');
    await p2.click('#cjRun');
    await p2.waitForFunction(
      () => /independent observations/.test(document.getElementById('cjOut').textContent),
      null,
      { timeout: 60000 },
    );
    check(
      /measured per division \(32 GADM admin-2 units\)[^.(]*, so the (\d+) districts here are not \1 independent observations/.test(
        await p2.evaluate(() => document.getElementById('cjOut').textContent),
      ),
      'a result using GDP per capita says it was measured for 32 divisions, not one value per district',
    );
    await p2.close();
  }

  // ---- #11 the composite is what gets tested from Composite mode
  {
    const p = await open(ctx);
    await p.locator('#modes button', { hasText: 'Composite' }).click();
    await p.selectOption('#ind', 'rwi_popw');
    await p.waitForTimeout(300);
    await p.click('#cjOpen');
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => {
      const fs = feats(unit),
        lah = fs.findIndex((f) => f.name === 'Lahore');
      return { y: CJ.y && CJ.y.key, parts: CJ.composite, mapLahore: V.comp[lah], lah };
    });
    check(
      r.y === 'composite' && r.parts && r.parts.length === 2,
      `#11 Composite mode prefills the composite as the outcome (${JSON.stringify(r.parts)})`,
    );
    await p.fill('#cjText', 'the composite and the archive');
    await p.selectOption('#cjX .cjrow [data-sign]', '0');
    await p.click('#cjRun');
    await p.waitForFunction(
      () => LOG.some((e) => e.statement === 'the composite and the archive' && !e.error),
      null,
      { timeout: 60000 },
    );
    const tested = await p.evaluate((i) => feats('district')[i].p.composite, r.lah);
    check(
      Math.abs(tested - r.mapLahore) < 1e-12,
      `#11 the tested composite equals the mapped one (Lahore ${tested} vs ${r.mapLahore})`,
    );
    await p.close();
  }

  // ---- #26 lead links, #17 the archive measure, results wording
  {
    const p = await open(ctx);
    const h = await p.evaluate(() =>
      leadHTML({
        name: 'x',
        src: 'osm',
        url: 'javascript:alert(1)',
        osm_url: 'javascript:alert(2)',
        wiki_en: null,
        qid: 'Q1"><b>',
        in_archive: false,
      }),
    );
    check(
      !/javascript:/.test(h) && !/Q1"/.test(h),
      '#26 a lead link that is not http(s) is not drawn',
    );
    await p.selectOption('#ysel', 'sites_per_1000km2');
    await p.selectOption('#ind', 'rwi_popw');
    await p.locator('#units button', { hasText: 'Hexagon' }).click();
    await p.waitForTimeout(300);
    await p.locator('#units button', { hasText: 'District' }).click();
    check(
      await p.evaluate(() => ykey === 'sites_per_1000km2'),
      '#16 the archive measure comes back after a visit to hexagons',
    );
    await p.click('#cjOpen');
    await p.fill('#cjText', 'wording check');
    await p.evaluate(() => {
      CJ.y = { key: 'literacy', tf: 'none' };
      CJ.x = [{ key: 'n_site', tf: 'none', sign: '+' }];
      CJ.unit = 'district';
      cjForm();
    });
    await p.click('#cjRun');
    await p.waitForFunction(
      () => /Headline/.test(document.getElementById('cjOut').textContent),
      null,
      { timeout: 60000 },
    );
    const out = await p.textContent('#cjOut');
    check(
      /Conley/.test(out) &&
        /placebo/.test(out) &&
        /How much one place decides it/.test(out) &&
        /Lahore/.test(out),
      'results show Conley, the placebo and the fragility table',
    );
    check(!(await p.$('#cjOut .match')), '#8 no green "sign matches" success state');
    check(
      /Without Lahore[^.]*moves from 1\.33\d to 2\.65\d/.test(out) &&
        /Lahore has leverage 0\.73/.test(out),
      '#5 the Lahore dependence of literacy ~ n_site is flagged (estimate doubles, leverage 0.73)',
    );
    check(
      (await p.evaluate(() => document.activeElement.tagName)) === 'H3',
      '#29 focus moves to the result heading',
    );
    check(p.errors.length === 0, 'no page errors (results) ' + p.errors.join(' | '));
    await p.close();
  }

  // ---- #6 a variable measured at a coarser level is flagged; a zero-inflated archive rate is not
  {
    const p = await open(ctx);
    const r = await p.evaluate((S) => {
      const flagOf = (key) => {
        const spec = { ...S, statement: 'coarse ' + key, x: [{ key, tf: 'none', sign: '+' }] };
        const { e, res } = record(spec, null);
        cjResult(e, res);
        return /measured for larger areas/.test($('cjOut').textContent);
      };
      return { ipc: flagOf('ipc_phase3plus'), spm: flagOf('sites_per_million') };
    }, SPEC);
    check(r.ipc && !r.spm, `#6 coarse flag: IPC zones ${r.ipc}, sites per million ${r.spm}`);
    await p.close();
  }

  // ---- #29 keyboard: find a place opens the card and focus returns
  {
    const p = await open(ctx);
    await p.fill('#place', 'Lahore');
    await p.press('#place', 'Enter');
    await p.waitForTimeout(400);
    const a = await p.evaluate(() => ({
      open: !$('card').hidden,
      focus: document.activeElement.id,
    }));
    check(
      a.open && a.focus === 'cardTitle',
      `#29 a place opens its card from the keyboard (${JSON.stringify(a)})`,
    );
    await p.click('#card .iconbtn');
    check(
      (await p.evaluate(() => document.activeElement.id)) === 'place',
      '#29 closing the card returns focus',
    );
    await p.selectOption('#ind', 'literacy');
    await p.locator('#units button', { hasText: 'Hexagon' }).click({ force: true });
    check(
      /Not available at hexagon/.test(await p.textContent('#notice')),
      '#29 an unavailable unit says why when used',
    );
    check((await p.$$('main')).length === 1, '#29 a main landmark');
    await p.close();
  }
  await ctx.close();

  // ---- #25 a library that does not load
  {
    const c = await browser.newContext();
    await c.route(/h3-js/, (r) => r.abort());
    const p = await c.newPage();
    await p.goto(url);
    await p.waitForTimeout(1500);
    check(
      /did not load/.test(await p.textContent('body')),
      '#25 a missing library is reported on the page',
    );
    await c.close();
  }

  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
