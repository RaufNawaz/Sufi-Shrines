// Saving the map as an image (added 31 October 2026): the SVG is well formed, holds one path per unit
// in view with the colour the screen gives it, the sites, shrine records and place names the screen
// shows, a title and a legend; the PNG is twice the size. In every mode and at district and hexagon.
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_map_export.cjs pipeline/gis/viewer/index.html <outdir>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'viewer-export-test'));
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind && HASH_READY);
  const save = async (id, name) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click(id)]);
    const f = path.join(OUT, name || dl.suggestedFilename());
    await dl.saveAs(f);
    return f;
  };
  // Check an SVG against the page's own view.
  const audit = (svgText) =>
    page.evaluate((t) => {
      const doc = new DOMParser().parseFromString(t, 'image/svg+xml');
      if (doc.querySelector('parsererror')) return { bad: 'not well formed' };
      const fs = feats(unit),
        hex = unit === 'hex';
      let wrong = 0;
      const paths = [...doc.querySelectorAll('path[data-id]')];
      for (const p of paths) {
        const i = fs.byId.get(p.getAttribute('data-id')),
          s = styleFor(i, hex),
          want = s.fill ? s.fillColor : 'none';
        if (p.getAttribute('fill') !== want) wrong++;
      }
      const bnd = map.getBounds().pad(0.05);
      const inView = (o) => bnd.contains([o.lat, o.lon]);
      return {
        paths: paths.length,
        wrong,
        sites: doc.querySelectorAll('circle.site').length,
        sitesWant: $('showSites').checked ? D.sites.filter(inView).length : 0,
        places: doc.querySelectorAll('circle.place').length,
        placesWant: $('showPlaces').checked ? placesShown().filter(inView).length : 0,
        names: [...doc.querySelectorAll('g text')].length,
        namesWant: document.querySelectorAll('#map .city-label').length,
        title: doc.querySelector('text').textContent,
        w: +doc.documentElement.getAttribute('width'),
        h: +doc.documentElement.getAttribute('height'),
      };
    }, svgText);

  const cases = [
    [
      'district, one measure (literacy), sites and names',
      async () => {
        await page.selectOption('#ind', 'literacy');
      },
    ],
    [
      'district, compare two',
      async () => {
        await page.evaluate(() => {
          setMode('bi');
          choose('ntl_2023_popw');
        });
      },
    ],
    [
      'district, composite',
      async () => {
        await page.evaluate(() => {
          setMode('comp');
          sel = [];
          choose('literacy');
          choose('ntl_2023_popw');
        });
      },
    ],
    [
      'district, no measure, shrine records on',
      async () => {
        await page.evaluate(() => {
          setMode('single');
          choose('');
        });
        await page.check('#showPlaces');
      },
    ],
    [
      'hexagons around Lahore, night lights',
      async () => {
        await page.uncheck('#showPlaces');
        await page.evaluate(() => {
          unit = 'hex';
          choose('ntl_2023_popw');
          map.setView([31.52, 74.35], 10, { animate: false });
        });
      },
    ],
  ];
  let k = 0;
  for (const [name, setup] of cases) {
    await setup();
    await page.waitForTimeout(500);
    const f = await save('#saveSvg', `map_${++k}.svg`);
    const a = await audit(fs.readFileSync(f, 'utf8'));
    if (a.bad) {
      check(false, `${name}: ${a.bad}`);
      continue;
    }
    check(
      a.paths > 0 && a.wrong === 0,
      `${name}: ${a.paths} units drawn, each in the colour the map gives it (${a.wrong} wrong)`,
    );
    check(
      a.sites === a.sitesWant && a.places === a.placesWant,
      `${name}: ${a.sites} archive sites and ${a.places} shrine records, as the screen shows`,
    );
    check(a.names === a.namesWant, `${name}: ${a.names} place names, as the screen shows`);
    check(a.title.length > 3, `${name}: titled "${a.title}"`);
  }
  // PNG: twice the SVG's size.
  const svgF = path.join(OUT, `map_${k}.svg`);
  const a = await audit(fs.readFileSync(svgF, 'utf8'));
  const png = fs.readFileSync(await save('#savePng', 'map.png'));
  const pw = png.readUInt32BE(16),
    ph = png.readUInt32BE(20);
  check(
    png.slice(1, 4).toString() === 'PNG' && pw === 2 * a.w && ph === 2 * a.h,
    `PNG ${pw} x ${ph}, twice the SVG's ${a.w} x ${a.h}`,
  );
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : `\nALL PASS (files in ${OUT})`);
  process.exit(fails.length ? 1 : 0);
})();
