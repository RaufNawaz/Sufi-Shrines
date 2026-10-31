// The Stata service end to end (added 30 October 2026): its locks hold, and a result in the viewer runs
// in Stata and agrees. Starts stata_service.py itself and stops it at the end. Needs Stata.
// From the repo root, after test_conjecture.cjs has written <dir>/cj_results.json:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_stata_service.cjs \
//     pipeline/gis/viewer/index.html <dir>/cj_results.json
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const [html, results] = process.argv.slice(2);
const URL_ = 'http://127.0.0.1:8765';
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};
const log = JSON.parse(fs.readFileSync(results, 'utf8')).log.filter((e) => !e.error);

(async () => {
  const svc = spawn('python', ['-I', 'pipeline/gis/viewer/stata_service/stata_service.py'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let started = false;
  svc.stdout.on('data', (d) => (started = started || /Ctrl\+C/.test(String(d))));
  for (let i = 0; i < 50 && !started; i++) await new Promise((r) => setTimeout(r, 200));
  const tokFile = path.join(
    process.env.LOCALAPPDATA || os.homedir(),
    'ShrinesStataService',
    'token.txt',
  );
  const token = fs.readFileSync(tokFile, 'utf8').trim();
  let browser;
  try {
    // The locks
    let r = await fetch(URL_ + '/health');
    check(r.status === 401, `no token is refused (${r.status})`);
    r = await fetch(URL_ + '/health', {
      headers: { 'X-Stata-Token': token, Origin: 'https://example.com' },
    });
    check(r.status === 403, `a web page's origin is refused (${r.status})`);
    r = await fetch(URL_ + '/health', { headers: { 'X-Stata-Token': token, Origin: 'null' } });
    check(r.status === 200, `a page opened from disk, with the token, is let in (${r.status})`);
    r = await fetch(URL_ + '/run', {
      method: 'POST',
      headers: { 'X-Stata-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'clear\nshell calc.exe' }),
    });
    const j = await r.json();
    check(r.status === 422 && /refused/.test(j.error), `a shell command is refused (${j.error})`);

    // The viewer
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(require('url').pathToFileURL(path.resolve(html)).href);
    await page.click('#cjOpen');
    for (const e of log.filter((x) => x.unit !== 'hex').slice(0, 3)) {
      await page.evaluate((e) => cjResult(e, null), e);
      await page.fill('#cjStTok', token);
      await page.click('#cjStRun');
      await page.waitForFunction(
        () => /Ran in Stata|did not run|not reachable/.test($('cjStStatus').textContent),
        null,
        { timeout: 120000 },
      );
      const st = await page.textContent('#cjStStatus'),
        cmp = await page.textContent('#cjStCmp'),
        logText = await page.inputValue('#cjStLog');
      check(
        st === 'Ran in Stata.' && /Stata agrees/.test(cmp),
        `test #${e.id} (${e.unit}, ${e.model}) runs in Stata and agrees: ${st}`,
      );
      check(
        new RegExp(e.model === 'poisson' ? 'Poisson regression' : 'Linear regression').test(
          logText,
        ),
        `test #${e.id}: Stata's own output is shown`,
      );
    }
    // Background: with the box ticked, the next result runs by itself.
    await page.click('#cjStAuto'); // turns it on (and runs the shown result)
    await page.waitForFunction(() => /Ran in Stata/.test($('cjStStatus').textContent), null, {
      timeout: 120000,
    });
    await page.evaluate((e) => cjResult(e, null), log[0]);
    await page.waitForFunction(() => /Ran in Stata/.test($('cjStStatus').textContent), null, {
      timeout: 120000,
    });
    check(true, 'with "run every test in Stata automatically" ticked, a new result runs unasked');
    check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } finally {
    if (browser) await browser.close();
    svc.kill();
  }
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
