#!/usr/bin/env node
/**
 * measure-lcp.mjs — why the largest element paints when it does, and what
 * moves after it.
 *
 * WHY THIS EXISTS AS A FILE. The 28 August B4 re-run left two questions that
 * neither committed instrument can answer, and both were about a *sequence*
 * rather than a total:
 *
 *   1. `/?lang=ur` has an LCP of 15.6s of which 97% is render delay, while TBT
 *      is 67ms and every one of its 344 requests has finished by 3.6s. Nothing
 *      is blocking and nothing is loading, so the question is not "what is
 *      slow" but "what became the largest element at 15.6s". Lighthouse reports
 *      the winning candidate and not the ones before it, so it states the
 *      outcome and withholds the cause.
 *   2. `/coverage` measured CLS 0.1666 on one run in three where the other two
 *      measured 0.0209. `measure-cls.mjs` reports **0 across five runs** on the
 *      same route, and is right to: it runs unthrottled, so the sheet lands at
 *      or before first paint and the defect cannot exist. A shift that only
 *      happens when data is late needs an instrument that makes data late.
 *
 * So this records the timeline both of them flatten: every LCP candidate as it
 * is promoted, and every layout-shift entry with the elements it moved, under
 * Lighthouse's own emulation (4x CPU, slow 4G, 390px).
 *
 * READ THIS BEFORE TRUSTING A NUMBER FROM IT:
 *
 * - **It is not Lighthouse and will not match it to the millisecond.** Same
 *   throttle, different harness. Compare its *shape* — the order of candidates,
 *   which element won, what moved after — against Lighthouse's totals, and
 *   quote Lighthouse for the number that has a budget (HANDOVER §9, 28 Aug:
 *   Lighthouse is authoritative for CLS, the local instruments are diagnostic).
 * - **A warm cache hides everything here**, exactly as in `measure-cls.mjs`:
 *   `useShrineData` caches the parsed sheet in localStorage for an hour, and on
 *   a hit the data is present at first paint. Every context is fresh.
 * - **`--settle` must exceed the LCP you are chasing.** The Urdu front door
 *   settles at ~16s; a 10s settle reports a smaller LCP and a clean CLS, which
 *   is the instrument agreeing with you rather than measuring.
 *
 * Usage:
 *   node scripts/measure-lcp.mjs --route "/?lang=ur" --settle 25000
 *   node scripts/measure-lcp.mjs --route /coverage --runs 3
 */
import { chromium } from 'playwright';

const VIEWPORT = { width: 390, height: 844 };
const SETTLE_MS = 20_000;

/* Lighthouse's mobile preset, as `measure-blocking.mjs` already encodes it —
   duplicated deliberately rather than imported, because that file exports
   nothing and making it do so is a change to a working instrument. */
const SLOW_4G = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

/* Installed before any page script. Both observers must exist before the first
   paint or the entries they want are already gone; `buffered: true` covers the
   gap for LCP but not for layout-shift. Selectors are built synchronously as
   entries arrive, because a shifting node is routinely detached by the time
   the run ends and would serialise as null. */
const COLLECTOR = () => {
  const sel = (node) => {
    if (!node || node.nodeType !== 1) return '(not an element)';
    const el = /** @type {Element} */ (node);
    const id = el.id ? `#${el.id}` : '';
    const cls =
      typeof el.className === 'string' && el.className.trim()
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  window.__lcp = { candidates: [], shifts: [] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__lcp.candidates.push({
        t: Math.round(e.startTime),
        size: e.size,
        el: sel(e.element),
        text: (e.element?.textContent ?? '').trim().slice(0, 40),
      });
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__lcp.shifts.push({
        t: Math.round(e.startTime),
        value: e.value,
        sources: (e.sources ?? []).map((s) => sel(s.node)),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

function parseArgs(argv) {
  const opts = {
    base: 'http://localhost:4173',
    routes: [],
    runs: 1,
    settle: SETTLE_MS,
    throttle: 4,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') opts.base = argv[++i];
    else if (a === '--route') opts.routes.push(argv[++i]);
    else if (a === '--runs') opts.runs = Number(argv[++i]);
    else if (a === '--settle') opts.settle = Number(argv[++i]);
    else if (a === '--throttle') opts.throttle = Number(argv[++i]);
    else throw new Error(`unknown argument: ${a}`);
  }
  if (opts.routes.length === 0) opts.routes = ['/?lang=ur'];
  return opts;
}

async function measure(browser, base, route, opts) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.addInitScript(COLLECTOR);
  const client = await context.newCDPSession(page);
  if (opts.throttle > 1)
    await client.send('Emulation.setCPUThrottlingRate', { rate: opts.throttle });
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', SLOW_4G);

  await page.goto(`${base}${route}`, { waitUntil: 'commit', timeout: 120_000 });
  await page.waitForTimeout(opts.settle);
  const out = await page.evaluate(() => window.__lcp);
  await context.close();
  return out;
}

const opts = parseArgs(process.argv);
const browser = await chromium.launch();
console.log(
  `\nLCP candidates and layout shifts — ${opts.base}, ${VIEWPORT.width}px, ` +
    `${opts.throttle}x CPU, slow 4G, settle ${opts.settle}ms\n`,
);
for (const route of opts.routes) {
  for (let run = 1; run <= opts.runs; run++) {
    const { candidates, shifts } = await measure(browser, opts.base, route, opts);
    const cls = shifts.reduce((s, e) => s + e.value, 0);
    console.log(`  ${route}  run ${run}/${opts.runs}`);
    console.log(`    LCP candidates (last one wins):`);
    for (const c of candidates) {
      console.log(
        `      ${String(c.t).padStart(6)}ms  size=${String(c.size).padStart(7)}  ${c.el}  ${JSON.stringify(c.text)}`,
      );
    }
    console.log(`    CLS ${cls.toFixed(4)} over ${shifts.length} shift(s):`);
    for (const s of shifts) {
      console.log(
        `      ${String(s.t).padStart(6)}ms  ${s.value.toFixed(4)}  ${s.sources.join(', ')}`,
      );
    }
    console.log('');
  }
}
await browser.close();
