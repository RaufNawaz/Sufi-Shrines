// Ask the viewer itself for the Stata and R code of every logged test, so check_stata_r.py can run it
// in real Stata and R (added 30 October 2026). The code carries its own data; no data file is written
// here, so a run that succeeds proves the code needs nothing else.
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/export_replication.cjs \
//     pipeline/gis/viewer/index.html <cj_results.json from test_conjecture.cjs> <outdir>
// Writes <outdir>/test_<id>.do, test_<id>.R and expected.json (each test's spec and the viewer's coefficient and SEs per term).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const [html, results, outdir] = process.argv.slice(2);
if (!html || !results || !outdir) {
  console.error('usage: export_replication.cjs index.html cj_results.json outdir');
  process.exit(2);
}
const log = JSON.parse(fs.readFileSync(results, 'utf8')).log.filter((e) => !e.error);
fs.mkdirSync(outdir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(require('url').pathToFileURL(path.resolve(html)).href);
  await page.waitForFunction(() => typeof stataCode === 'function');
  const out = await page.evaluate(
    (log) => ({ code: log.map((e) => ({ id: e.id, stata: stataCode(e), r: rCode(e) })) }),
    log,
  );
  for (const f of fs.readdirSync(outdir))
    if (/^shrines_.*\.csv$/.test(f)) fs.unlinkSync(path.join(outdir, f));
  for (const c of out.code) {
    fs.writeFileSync(path.join(outdir, `test_${c.id}.do`), c.stata + '\n');
    fs.writeFileSync(path.join(outdir, `test_${c.id}.R`), c.r + '\n');
  }
  fs.writeFileSync(
    path.join(outdir, 'expected.json'),
    JSON.stringify(
      log.map((e) => ({
        id: e.id,
        unit: e.unit,
        n: e.n,
        model: e.model,
        se: e.spec.se,
        spec: e.spec,
        terms: e.terms.map((t) => ({ role: t.role, key: t.key, b: t.b, seR: t.seR, seC: t.seC })),
      })),
      null,
      1,
    ),
  );
  await browser.close();
  if (errors.length) {
    console.error('page errors: ' + errors.join(' | '));
    process.exit(1);
  }
  console.log(`${out.code.length} tests -> ${outdir}`);
})();
