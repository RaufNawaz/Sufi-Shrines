// Browser checks for the filtered shrine records as a variable (added 31 October 2026): the counts per
// unit agree with the counts the Python build made from sites.csv's district codes, the areas agree
// with the GIS layer's, the map measure follows the filter, and a test keeps its filter. Writes the
// log for export_replication.cjs + check_stata_r.py. From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_places_variable.cjs pipeline/gis/viewer/index.html <outdir>
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/export_replication.cjs pipeline/gis/viewer/index.html <outdir>/pf_results.json <outdir>
//   python -I pipeline/gis/viewer/tests/check_stata_r.py <outdir>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'viewer-pf-test'));
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};
const ALL = ['archive', 'doam', 'geonames', 'osm', 'osmc', 'wikidata'];

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

  // ---- counts, against the Python build's per-district counts from sites.csv's district codes
  const cmp = await page.evaluate((ALL) => {
    const base = { src: ALL, match: 'any', min: 1, trad: '', noArch: false };
    const out = {};
    for (const [name, d, ref] of [
      ['all places', base, (p) => p.n_ext_verified + p.n_ext_single],
      ['verified (2+ sources)', { ...base, min: 2 }, (p) => p.n_ext_verified],
    ]) {
      ensurePlaces(d);
      const fs = feats('district');
      let same = 0,
        off1 = 0,
        sum = 0,
        refSum = 0,
        worst = 0;
      for (const f of fs) {
        const a = f.p.n_pf,
          b = ref(f.p);
        sum += a;
        refSum += b;
        if (a === b) same++;
        else if (Math.abs(a - b) <= 1) off1++;
        worst = Math.max(worst, Math.abs(a - b));
      }
      const total = placesFilter(d).length,
        outside = pfIndex('district').filter(
          (j, i) => j < 0 && placesFilter(d).includes(PLACES[i]),
        ).length;
      const per = (u) => feats(u).reduce((t, f) => t + f.p.n_pf, 0);
      out[name] = {
        n: fs.length,
        same,
        off1,
        worst,
        sum,
        refSum,
        total,
        outside,
        prov: per('province'),
        tehsil: per('tehsil'),
        hex: per('hex'),
      };
    }
    ensurePlaces(placesDef());
    return out;
  }, ALL);
  for (const [name, c] of Object.entries(cmp)) {
    check(
      c.sum + c.outside === c.total,
      `${name}: district counts (${c.sum}) + places in no district (${c.outside}) = the filter's ${c.total}`,
    );
    check(
      c.same / c.n >= 0.8 && c.worst <= 8,
      `${name}: ${c.same} of ${c.n} districts equal the build's count from district codes, ${c.off1} differ by one, worst ${c.worst} (point in polygon against the build's district join)`,
    );
    check(
      Math.abs(c.sum - c.refSum) / c.refSum < 0.01,
      `${name}: total within 1% of the build's (${c.sum} against ${c.refSum})`,
    );
    check(
      c.prov <= c.total && c.tehsil <= c.total && c.hex <= c.total && c.prov >= c.sum,
      `${name}: province ${c.prov}, tehsil ${c.tehsil}, populated hexagons ${c.hex}, none above the filter's total`,
    );
  }

  // ---- areas, against the GIS layer's (n_site / sites_per_1000km2)
  const areas = await page.evaluate(() => {
    const r = {};
    for (const u of ['province', 'district', 'tehsil']) {
      const A = areaKm2(u),
        rel = [];
      feats(u).forEach((f, i) => {
        const q = f.p;
        if (q.n_site > 0 && q.sites_per_1000km2 > 0)
          rel.push(Math.abs(A[i] / ((q.n_site / q.sites_per_1000km2) * 1000) - 1));
      });
      rel.sort((a, b) => a - b);
      r[u] = { n: rel.length, median: rel[rel.length >> 1], max: rel[rel.length - 1] };
    }
    const hx = areaKm2('hex');
    r.hex = {
      min: Math.min(...hx),
      max: Math.max(...hx),
      avg: h3.getHexagonAreaAvg(HEXRES, 'km2'),
      res: HEXRES,
    };
    return r;
  });
  for (const u of ['province', 'district', 'tehsil'])
    check(
      areas[u].n > 0 && areas[u].median < 0.01 && areas[u].max < 0.06,
      `${u} areas agree with the GIS layer's: ${areas[u].n} units, median difference ${(100 * areas[u].median).toFixed(2)}%, largest ${(100 * areas[u].max).toFixed(2)}%`,
    );
  check(
    areas.hex.min > 0.8 * areas.hex.avg && areas.hex.max < 1.2 * areas.hex.avg,
    `hexagon areas ${areas.hex.min.toFixed(2)} to ${areas.hex.max.toFixed(2)} km², about H3's average ${areas.hex.avg.toFixed(2)} at resolution ${areas.hex.res}`,
  );
  const rates = await page.evaluate(() =>
    feats('district').every((f) => {
      const q = f.p,
        pm = q.pop_kontur_2023 > 0 ? (q.n_pf / q.pop_kontur_2023) * 1e6 : null;
      return pm == null ? q.pf_per_million == null : Math.abs(q.pf_per_million - pm) < 1e-9;
    }),
  );
  check(rates, 'per million is the count over Kontur 2023 population, everywhere');

  // ---- the map measure follows the filter
  await page.check('#showPlaces');
  await page.click('#placesMap');
  await page.waitForTimeout(300);
  const m1 = await page.evaluate(() => ({
    sel: inUse(),
    sum: V.vals.pf_per_million.reduce((t, v) => t + (v || 0), 0),
  }));
  check(m1.sel.includes('pf_per_million'), 'the button maps the filter per million people');
  await page.selectOption('#placesMin', '2');
  await page.waitForTimeout(300);
  const m2 = await page.evaluate(() => ({
    sum: V.vals.pf_per_million.reduce((t, v) => t + (v || 0), 0),
    def: IND.pf_per_million.def,
  }));
  check(
    m2.sum < m1.sum && /2 or more sources/.test(m2.def),
    `narrowing the filter redraws the measure (${m1.sum.toFixed(0)} -> ${m2.sum.toFixed(0)}) and its definition says so`,
  );
  await page.screenshot({ path: path.join(OUT, 'pf_map.png') });

  // ---- tests keep their filter
  const runs = await page.evaluate((ALL) => {
    const mk = (unit, model, y, x, c, se, exposure, places) => ({
      format: 'shrines-viewer-conjecture',
      v: 1,
      statement: `places variable ${unit} ${model}`,
      unit,
      y,
      x,
      c,
      model,
      se,
      fe: null,
      exposure,
      weights: unit === 'hex' ? 'h3' : 'contig',
      k: 6,
      perms: 199,
      mperms: 199,
      seed: 20261031,
      places,
      composite: null,
    });
    const muslim2 = { src: ALL, match: 'any', min: 2, trad: 'muslim', noArch: false },
      doam = { src: ['doam'], match: 'any', min: 1, trad: '', noArch: true };
    const specs = [
      mk(
        'district',
        'ols',
        { key: 'literacy', tf: 'none' },
        [{ key: 'pf_per_million', tf: 'asinh', sign: '+' }],
        [{ key: 'n_osm_pow_effort', tf: 'log1p' }],
        'hc1',
        null,
        muslim2,
      ),
      mk(
        'tehsil',
        'poisson',
        { key: 'n_pf', tf: 'none' },
        [{ key: 'literacy', tf: 'none', sign: '-' }],
        [],
        'robust',
        'pop_kontur_2023',
        doam,
      ),
      mk(
        'district',
        'ols',
        { key: 'pf_per_1000km2', tf: 'log1p' },
        [{ key: 'ntl_2023_popw', tf: 'log1p', sign: '+' }],
        [],
        'cl_province',
        null,
        doam,
      ),
    ];
    const out = [];
    for (const s of specs) {
      const bad = validSpec(s);
      if (bad) {
        out.push({ bad });
        continue;
      }
      const { e } = record(s, null, { prefilled: false, views: 0 });
      out.push({
        error: e.error || null,
        b: e.terms && e.terms.map((t) => t.b),
        stata: stataCode(e),
      });
    }
    // The panel now shows something else; loading and re-running the first test must reproduce it.
    applyPlacesDef({ src: ['geonames'], match: 'only', min: 1, trad: '', noArch: false });
    const first = LOG[0];
    loadSpec(first.spec);
    // A filter saved without an evidence setting (before 31 October 2026) means every record.
    const panel =
      JSON.stringify(placesDef()) ===
      JSON.stringify({ ...first.spec.places, ev: first.spec.places.ev || 'all' });
    const again = runSpec(first.spec, first.unit, false);
    const missing = validSpec({ ...specs[0], places: null });
    const malformed = validSpec({ ...specs[0], places: { ...muslim2, src: ['nonsense'] } });
    return {
      out,
      panel,
      same: again.terms.map((t) => t.b),
      firstB: first.terms.map((t) => t.b),
      missing,
      malformed,
    };
  }, ALL);
  runs.out.forEach((r, i) => {
    check(
      !r.bad && !r.error,
      `test ${i + 1} runs${r.bad || r.error ? ': ' + (r.bad || r.error) : ''}`,
    );
    if (r.stata)
      check(
        /\* n_pf and pf_\*: shrine records recorded by/.test(r.stata),
        `test ${i + 1}: the Stata code says which records it counts`,
      );
  });
  check(runs.panel, 'loading a test puts its filter back in the panel');
  check(
    JSON.stringify(runs.same) === JSON.stringify(runs.firstB),
    'a test re-run after the panel changed gives the same estimates',
  );
  check(
    !!runs.missing && !!runs.malformed,
    `a spec without its filter, or with a bad one, is refused (${runs.missing}; ${runs.malformed})`,
  );

  const log = await page.evaluate(() => LOG.filter((e) => !e.error));
  fs.writeFileSync(path.join(OUT, 'pf_results.json'), JSON.stringify({ log }));
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : `\nALL PASS (log in ${OUT})`);
  process.exit(fails.length ? 1 : 0);
})();
