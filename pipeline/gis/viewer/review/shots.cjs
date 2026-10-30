// Screenshots of the Shrines and Welfare viewer for an outside review package (Playwright, Chromium).
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/review/shots.cjs pipeline/gis/viewer/index.html <outdir>
// Called by make_package.py. Fails loudly (non-zero) if the page errors or a shot cannot be taken.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const url = require('url').pathToFileURL(path.resolve(process.argv[2])).href;
const OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });

async function ready(page) {
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind);
  await page.waitForTimeout(1500); // tiles
}
const mode = (page, re) => page.locator('#modes button').filter({ hasText: re }).first().click();
const unit = (page, re) => page.locator('#units button').filter({ hasText: re }).first().click();
const pick = async (page, key) => {
  await page.selectOption('#ind', key);
  await page.waitForTimeout(800);
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (name) => {
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('wrote ' + name);
  };

  await ready(page);
  await shot('01_on_open.png');

  await mode(page, /one/i);
  await unit(page, /district/i);
  await pick(page, 'literacy');
  await shot('02_one_measure_literacy_district.png');

  // click Lahore's region card via the page's own data: centre the map on Lahore and click there
  await page.evaluate(() => void map.setView([31.52, 74.35], 8));
  await page.waitForTimeout(1200);
  const box = await page.locator('#map').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await shot('03_region_card_lahore.png');
  await page.keyboard.press('Escape');
  await page.evaluate(() => void map.setView([30.2, 69.3], 5));

  await mode(page, /compare/i);
  await pick(page, 'rwi_popw');
  await shot('04_compare_two_bivariate.png');

  await mode(page, /composite/i);
  await pick(page, 'ntl_2023_popw');
  await shot('05_composite.png');

  // literacy is census-only and does not reach hexagons; the wealth index does
  await mode(page, /one/i);
  await pick(page, 'rwi_popw');
  await unit(page, /hex/i);
  await shot('06_hexagons.png');
  await unit(page, /district/i);

  await page.click('#cjOpen');
  await page.waitForTimeout(400);
  await page.fill('#cjText', 'districts with more archive sites have higher wealth');
  await page.click('#cjRun');
  await page.waitForTimeout(300);
  await shot('07_conjecture_refuses_without_a_sign.png');
  await page.selectOption('#cjX .cjrow [data-sign]', '+');
  await page.click('#cjRun');
  await page.waitForFunction(() => LOG.length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.locator('#cjOut').scrollIntoViewIfNeeded();
  await page.locator('#cjOut').screenshot({ path: path.join(OUT, '08_conjecture_result.png') });
  console.log('wrote 08_conjecture_result.png');

  const m = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mp = await m.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await ready(mp);
  await mp.screenshot({ path: path.join(OUT, '09_phone_390px.png') });
  console.log('wrote 09_phone_390px.png');

  await browser.close();
  if (errors.length) {
    console.error('page errors:\n' + errors.join('\n'));
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
