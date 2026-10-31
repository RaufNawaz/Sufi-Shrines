// Browser checks for the place names on the map (added 30 October 2026): names never overlap, the
// capital always shows, more names appear as the map zooms in, the switch works, GeoNames is credited.
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_place_names.cjs pipeline/gis/viewer/index.html
const path = require('path');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelectorAll('.city-label').length > 0);
  const state = () =>
    page.evaluate(() => {
      const r = [...document.querySelectorAll('.city-label')].map((e) => {
        const b = e.getBoundingClientRect();
        return { n: e.textContent, b: [b.left, b.top, b.right, b.bottom] };
      });
      let overlaps = 0;
      for (let i = 0; i < r.length; i++)
        for (let j = i + 1; j < r.length; j++) {
          const a = r[i].b,
            c = r[j].b;
          if (a[0] < c[2] - 1 && a[2] > c[0] + 1 && a[1] < c[3] - 1 && a[3] > c[1] + 1) overlaps++;
        }
      return { names: r.map((x) => x.n), overlaps };
    });
  let prev = 0;
  for (const [z, ll] of [
    [null, null],
    [7, [30.5, 70.5]],
    [8, [31.3, 73.6]],
    [10, [31.5, 74.3]],
  ]) {
    if (z) {
      await page.evaluate(
        ([z, ll]) => {
          map.setView(ll, z, { animate: false });
        },
        [z, ll],
      );
      await page.waitForTimeout(800);
    }
    const s = await state(),
      zz = await page.evaluate(() => map.getZoom());
    check(
      s.overlaps === 0,
      `zoom ${zz}: ${s.names.length} names, none overlapping (${s.overlaps})`,
    );
    if (!z) {
      check(s.names.includes('Islamabad'), 'the capital is named at the opening view');
      check(
        ['Lahore', 'Karachi', 'Peshawar', 'Quetta'].every((n) => s.names.includes(n)),
        'the four provincial capitals are named at the opening view',
      );
    }
    if (z === 8)
      check(s.names.length > prev, `zooming in names more places (${prev} -> ${s.names.length})`);
    prev = s.names.length;
  }
  const attr = await page.textContent('.leaflet-control-attribution');
  check(/GeoNames/.test(attr), 'GeoNames is credited while names show');
  await page.uncheck('#showNames');
  check(
    (await page.evaluate(() => document.querySelectorAll('.city-label').length)) === 0 &&
      !/GeoNames/.test(await page.textContent('.leaflet-control-attribution')),
    'the switch removes the names and the credit',
  );
  await page.check('#showNames');
  check(
    (await page.evaluate(() => document.querySelectorAll('.city-label').length)) > 0,
    'and brings them back',
  );
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
