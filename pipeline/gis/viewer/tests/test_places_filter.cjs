// Browser checks for the "All shrine records, every source" layer (added 30 October 2026).
// The page's counts are held against a count made here, independently, from sites.csv.
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_places_filter.cjs pipeline/gis/viewer/index.html
const fs = require('fs');
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

// sites.csv has no quoted commas in place, source, source_id or tier, but names may; read those
// four leading columns only.
const csvText = fs.readFileSync('pipeline/gis/shrine_sources/district_counts/sites.csv', 'utf8');
const places = new Map();
for (const line of csvText.split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const [place, source, , tier] = line.split(',');
  const src = source === 'osm' && tier === 'C' ? 'osmc' : source;
  if (!places.has(place)) places.set(place, new Set());
  places.get(place).add(src);
}
const indep = (s) => new Set([...s].map((x) => (x === 'osmc' ? 'osm' : x))).size;
const all = [...places.values()];
const want = {
  total: all.length,
  verified: all.filter((s) => indep(s) >= 2).length,
  one: all.filter((s) => indep(s) === 1).length,
  doamAndOsm: all.filter((s) => s.has('doam') && s.has('osm')).length,
  onlyGeonames: all.filter((s) => s.size === 1 && s.has('geonames')).length,
  verifiedNotArchive: all.filter((s) => indep(s) >= 2 && !s.has('archive')).length,
};
const num = (t) => (t.match(/\d[\d,]*/g) || []).map((x) => +x.replace(/,/g, ''));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#placesTotal')?.textContent);

  check(
    num(await page.textContent('#placesTotal'))[0] === want.total,
    `total places ${want.total}`,
  );
  check(await page.isHidden('#placesPanel'), 'filter panel hidden until the layer is on');
  await page.check('#showPlaces');
  check(await page.isVisible('#placesPanel'), 'filter panel shows when the layer is on');
  let n = num(await page.textContent('#placesCount'));
  check(
    n[0] === want.total && n[1] === want.verified && n[2] === want.one,
    `all sources: ${want.total} shown, ${want.verified} verified, ${want.one} one-source (page: ${n})`,
  );

  await page.selectOption('#placesMin', '2');
  n = num(await page.textContent('#placesCount'));
  check(n[0] === want.verified, `2+ sources: ${want.verified} (page: ${n[0]})`);
  await page.check('#placesNoArchive');
  n = num(await page.textContent('#placesCount'));
  check(
    n[0] === want.verifiedNotArchive,
    `verified, not in archive: ${want.verifiedNotArchive} (page: ${n[0]})`,
  );
  await page.uncheck('#placesNoArchive');
  await page.selectOption('#placesMin', '1');

  // "every ticked source": DOAM and OSM only
  for (const s of ['archive', 'osmc', 'wikidata', 'geonames'])
    await page.uncheck(`#placesSrc input[data-src="${s}"]`);
  await page.selectOption('#placesMatch', 'all');
  n = num(await page.textContent('#placesCount'));
  check(n[0] === want.doamAndOsm, `in both DOAM and OSM: ${want.doamAndOsm} (page: ${n[0]})`);

  // "ticked sources only": GeoNames alone
  for (const s of ['doam', 'osm']) await page.uncheck(`#placesSrc input[data-src="${s}"]`);
  await page.check('#placesSrc input[data-src="geonames"]');
  await page.selectOption('#placesMatch', 'only');
  n = num(await page.textContent('#placesCount'));
  check(n[0] === want.onlyGeonames, `GeoNames only: ${want.onlyGeonames} (page: ${n[0]})`);

  // CSV download has a header and one line per shown place
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#placesCsv')]);
  const text = fs.readFileSync(await dl.path(), 'utf8').replace(/^﻿/, '');
  const lines = text.split('\r\n');
  check(lines[0].startsWith('place,name,lat,lon'), 'CSV header');
  check(
    lines.length - 1 === want.onlyGeonames,
    `CSV rows ${want.onlyGeonames} (got ${lines.length - 1})`,
  );

  // a popup carries the record links and the two ways to check a place by hand
  await page.selectOption('#placesMatch', 'any');
  const html = await page.evaluate(() => {
    let out = '';
    map.eachLayer((l) => {
      if (!out && l.getPopup && l.getPopup() && l.options.fillColor === '#d97706') {
        l.openPopup();
        out = l.getPopup().getElement()?.innerHTML || '';
      }
    });
    return out;
  });
  check(/geonames\.org\/\d+/.test(html), 'popup links the GeoNames record');
  check(
    /google\.com\/search\?q=/.test(html) && /google\.com\/maps\/search/.test(html),
    'popup offers web search and satellite links',
  );
  check(/unconfirmed/.test(html), 'a one-source popup says unconfirmed');

  await page.uncheck('#showPlaces');
  check(await page.isHidden('#placesPanel'), 'panel hides again');
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
