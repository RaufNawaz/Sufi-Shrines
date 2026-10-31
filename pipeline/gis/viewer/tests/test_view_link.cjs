// A link to the view (added 31 October 2026): the address after '#' follows the view, opening the
// address restores it (unit, mode, measures, centre and zoom, layers, places filter), an unknown
// measure is dropped with a notice, and panning adds no history entries. From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_view_link.cjs pipeline/gis/viewer/index.html
const path = require('path');
const { chromium } = require('playwright');
const base = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};
const ready = (page) =>
  page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind && HASH_READY);
const state = (page) =>
  page.evaluate(() => ({
    unit,
    mode,
    sel: [...sel],
    z: map.getZoom(),
    c: [map.getCenter().lat, map.getCenter().lng],
    layers: Object.fromEntries(Object.entries(LAYERS).map(([k, id]) => [k, $(id).checked])),
    pf: placesDef(),
    notice: $('notice').textContent,
    hash: location.hash,
    hist: history.length,
  }));

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (u) => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(u);
    await ready(page);
    return page;
  };
  const p1 = await open(base);
  const s0 = await state(p1);
  check(
    /^#u=district&m=single&z=\d+&c=/.test(s0.hash),
    `a plain opening writes the view into the address (${s0.hash})`,
  );

  // Build a view: tehsil, literacy, zoomed on Lahore, shrine records on with a filter.
  await p1.evaluate(() => {
    unit = 'tehsil';
    refresh();
    choose('literacy');
    map.setView([31.55, 74.34], 9, { animate: false });
  });
  await p1.check('#showPlaces');
  await p1.selectOption('#placesMin', '2');
  await p1.selectOption('#placesTrad', 'muslim');
  await p1.uncheck('#showNames');
  await p1.waitForTimeout(400);
  const s1 = await state(p1);
  check(
    /u=tehsil/.test(s1.hash) && /i=literacy/.test(s1.hash) && /pf=/.test(s1.hash),
    `the address follows the view (${s1.hash})`,
  );
  // Panning: no new history entries.
  await p1.evaluate(() => {
    for (let i = 0; i < 5; i++) map.panBy([40, 0], { animate: false });
  });
  await p1.waitForTimeout(300);
  const s1b = await state(p1);
  check(
    s1b.hist === s1.hist && s1b.hash !== s1.hash,
    `panning updates the address without adding history (${s1.hist} -> ${s1b.hist} entries)`,
  );

  // Open the address in a fresh page: the same view.
  const p2 = await open(base + s1b.hash);
  const s2 = await state(p2);
  check(
    s2.unit === 'tehsil' && s2.mode === 'single' && JSON.stringify(s2.sel) === '["literacy"]',
    `unit, mode and measure restored (${s2.unit}, ${s2.mode}, ${s2.sel})`,
  );
  check(
    s2.z === s1b.z && Math.abs(s2.c[0] - s1b.c[0]) < 1e-3 && Math.abs(s2.c[1] - s1b.c[1]) < 1e-3,
    `centre and zoom restored (zoom ${s2.z}, ${s2.c.map((x) => x.toFixed(3))})`,
  );
  check(
    JSON.stringify(s2.layers) === JSON.stringify(s1b.layers),
    `layers restored (${JSON.stringify(s2.layers)})`,
  );
  check(
    JSON.stringify(s2.pf) === JSON.stringify(s1b.pf),
    `places filter restored (${JSON.stringify(s2.pf)})`,
  );
  check(s2.hash === s1b.hash, 'and the restored page writes back the same address');
  const placesShownN = await p2.evaluate(() => $('placesCount').textContent);
  check(/shown/.test(placesShownN), `the restored filter is drawn (${placesShownN})`);

  // Compare two, with an unknown measure in the link.
  const p3 = await open(
    base + '#u=district&m=bi&i=literacy,not_a_measure,ntl_2023_popw&z=6&c=30,70&l=sites',
  );
  const s3 = await state(p3);
  check(
    s3.mode === 'bi' &&
      JSON.stringify(s3.sel) === '["literacy","ntl_2023_popw"]' &&
      /not_a_measure/.test(s3.notice),
    `an unknown measure is dropped and named; the rest restored (${s3.sel}; "${s3.notice}")`,
  );
  // A measure not at the linked unit moves the unit, as choosing it from the menu does.
  const p4 = await open(base + '#u=hex&m=single&i=literacy&z=6&c=30,70&l=');
  const s4 = await state(p4);
  check(
    s4.sel[0] === 'literacy' && s4.unit !== 'hex',
    `a measure the unit lacks moves the unit (${s4.unit})`,
  );
  // A malformed link does not break the page.
  const p5 = await open(base + '#u=district&z=banana&c=999,abc&pf=x,y,z');
  const s5 = await state(p5);
  check(
    s5.unit === 'district' && /places filter/.test(s5.notice),
    `a malformed link is survived (${s5.notice})`,
  );

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
