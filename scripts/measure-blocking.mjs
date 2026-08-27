#!/usr/bin/env node
/**
 * measure-blocking.mjs — which script is holding the main thread, and for how long.
 *
 * WHY THIS EXISTS. The map is the archive's front door and its Lighthouse
 * performance score is 28, with a total blocking time of 4,306ms against a
 * 300ms budget. B4's run attributed 88% of that to `vendor-maplibre` — 8,484ms
 * of bootup — and that attribution came from Lighthouse, which cannot be run in
 * every environment this project is worked in (`.lighthouserc.cjs` records the
 * sandbox where Chrome could not reach the tile, font and CSV hosts). A number
 * nothing can reproduce is a number that drifts, which is the lesson
 * `scripts/measure-cls.mjs` was written for one metric over.
 *
 * So this measures the same thing directly, from a CPU profile, over a preview
 * build.
 *
 * WHAT IT REPORTS
 *
 *   FCP / LCP        the paint timings, and the element the browser chose
 *   TBT              the sum of (task − 50ms) over every long task, which is
 *                    the definition Lighthouse scores
 *   per-script       self time aggregated by script URL, from the profiler's
 *                    samples — the "bootup time" column, and the one that names
 *                    a chunk you can go and look at
 *
 * READ THIS BEFORE TRUSTING A NUMBER
 *
 * - **It must run against a preview build, not the dev server.** The thing
 *   under test is how long a bundled, minified chunk takes to *evaluate*. Dev
 *   ships hundreds of unbundled modules and measures a different program.
 *   `--base` defaults to the preview port for that reason and the header of
 *   every report says which it was.
 * - **Both throttles are on by default, and both halves matter.** Lighthouse's
 *   mobile preset is 4× CPU *and* slow 4G (1.6 Mbps down, 150ms RTT). The first
 *   version of this script threw away the network half, and the difference was
 *   not small: it reported LCP 484ms on `/` where Lighthouse had reported
 *   6,735ms, and `vendor-maplibre` at 368ms against a recorded 8,484ms. On a
 *   laptop LAN the scripts arrive so fast that the thing under test barely
 *   happens. A number from this script with `--no-network-throttle` is not
 *   comparable to anything in HANDOVER §9.
 * - **Self time, not total time.** A frame's total time includes everything it
 *   called, so `main.js` would appear to own the whole page. Self time is what
 *   the profiler actually sampled inside that script.
 * - **The sampling interval bounds the resolution.** At the default 1000µs a
 *   script under ~10ms is noise. Numbers below `MIN_REPORT_MS` are summed into
 *   one line rather than listed, so a long tail cannot look like a finding.
 *
 * Usage:
 *   npm run build && npm run preview        # in another terminal
 *   node scripts/measure-blocking.mjs
 *   node scripts/measure-blocking.mjs --route '/?lang=ur'
 *   node scripts/measure-blocking.mjs --no-throttle --no-network-throttle
 */

import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const VIEWPORT = { width: 390, height: 844 };
const DEFAULT_BASE = 'http://localhost:4173';
const DEFAULT_ROUTES = ['/', '/?lang=ur'];
/** Lighthouse's mobile preset: 4× CPU, and slow 4G alongside it. */
const CPU_THROTTLE = 4;
const SLOW_4G = {
  offline: false,
  // Bytes per second, from Lighthouse's throttling.mobileSlow4G.
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};
/** How long to keep profiling after load. The map's basemap chunk is fetched
 *  after mount, so a profile that stops at `load` misses the thing under test. */
const SETTLE_MS = 12_000;
/** Below this, a script's self time is inside the sampler's noise. */
const MIN_REPORT_MS = 10;

function parseArgs(argv) {
  const opts = {
    base: DEFAULT_BASE,
    routes: [],
    json: null,
    throttle: CPU_THROTTLE,
    network: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base') opts.base = argv[++i];
    else if (arg === '--route') opts.routes.push(argv[++i]);
    else if (arg === '--json') opts.json = argv[++i];
    else if (arg === '--no-throttle') opts.throttle = 1;
    else if (arg === '--no-network-throttle') opts.network = false;
    else if (arg === '--settle') opts.settle = Number(argv[++i]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (opts.routes.length === 0) opts.routes = DEFAULT_ROUTES;
  return opts;
}

/* Installed before any app code runs. `buffered: true` on both observers is
   what catches the paint entries that happen before this script's own
   PerformanceObserver is constructed. */
const COLLECTOR = `
  window.__perf = { lcp: 0, lcpElement: '', fcp: 0, longTasks: [] };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.lcp = entry.startTime;
      const el = entry.element;
      if (el) {
        const cls = typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\\s+/)[0]
          : '';
        window.__perf.lcpElement = el.tagName.toLowerCase() + cls;
      }
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') window.__perf.fcp = entry.startTime;
    }
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.longTasks.push({ start: Math.round(entry.startTime), dur: Math.round(entry.duration) });
    }
  }).observe({ type: 'longtask', buffered: true });
`;

/**
 * Self time per script URL, from a V8 CPU profile.
 *
 * The profile is samples plus the gap before each sample (`timeDeltas`), so the
 * time attributed to a node is the sum of the deltas of the samples that landed
 * in it. That is self time by construction, which is the column that names a
 * chunk rather than the one that blames the entry point for everything.
 */
function selfTimeByScript(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const totals = new Map();
  const { samples = [], timeDeltas = [] } = profile;

  for (let i = 0; i < samples.length; i++) {
    const node = byId.get(samples[i]);
    if (!node) continue;
    // Deltas are microseconds, and the first is the offset to the first sample.
    const micros = Math.max(0, timeDeltas[i] ?? 0);
    const frame = node.callFrame;
    let key = frame.url;
    if (!key) {
      // (program), (idle), (garbage collector) — kept, because "the page spent
      // two seconds in GC" is a finding and hiding it would make the columns
      // fail to add up.
      key = frame.functionName ? `(${frame.functionName.replace(/^\(|\)$/g, '')})` : '(anonymous)';
    }
    totals.set(key, (totals.get(key) ?? 0) + micros / 1000);
  }
  return totals;
}

function shortenUrl(url) {
  if (!url.startsWith('http')) return url;
  try {
    const { pathname } = new URL(url);
    // The chunk name is the informative part; the hash is not.
    return pathname.replace(/^.*\//, '').replace(/-[A-Za-z0-9_]{8,}\./, '.');
  } catch {
    return url;
  }
}

async function measureRoute(browser, base, route, opts) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.addInitScript(COLLECTOR);

  const client = await context.newCDPSession(page);
  if (opts.throttle > 1) {
    await client.send('Emulation.setCPUThrottlingRate', { rate: opts.throttle });
  }
  if (opts.network) {
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', SLOW_4G);
  }
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 1000 });
  await client.send('Profiler.start');

  await page.goto(`${base}${route}`, { waitUntil: 'commit', timeout: 60_000 });
  await page.waitForTimeout(opts.settle ?? SETTLE_MS);

  const { profile } = await client.send('Profiler.stop');
  const perf = await page.evaluate(() => window.__perf);
  await context.close();

  const scripts = [...selfTimeByScript(profile).entries()]
    .map(([url, ms]) => ({ script: shortenUrl(url), ms: Math.round(ms) }))
    .sort((a, b) => b.ms - a.ms);

  // Lighthouse's definition: every millisecond a long task runs beyond 50.
  const tbt = perf.longTasks.reduce((sum, task) => sum + Math.max(0, task.dur - 50), 0);
  const longest = perf.longTasks.reduce((max, task) => Math.max(max, task.dur), 0);

  return {
    route,
    fcp: Math.round(perf.fcp),
    lcp: Math.round(perf.lcp),
    lcpElement: perf.lcpElement,
    tbt,
    longTaskCount: perf.longTasks.length,
    longest,
    /* Kept, not just counted: *when* the long tasks fall is what tells a
       before/after apart. Two runs with the same TBT can be one 700ms task
       during mount and seven 90ms tasks spread over the load, and only one of
       those is a page that feels responsive. */
    longTasks: perf.longTasks,
    scripts,
  };
}

async function main() {
  const opts = parseArgs(process.argv);

  try {
    const probe = await fetch(opts.base);
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (err) {
    console.error(`Cannot reach ${opts.base} — ${err.message}`);
    console.error('This needs a PREVIEW build, not the dev server:');
    console.error('  npm run build  &&  npm run preview');
    process.exit(2);
  }

  const browser = await chromium.launch();
  const results = [];
  console.log(
    `\nMain-thread blocking — ${opts.base}, ${VIEWPORT.width}px, ` +
      `CPU ×${opts.throttle}, ${(opts.settle ?? SETTLE_MS) / 1000}s profile\n`,
  );

  for (const route of opts.routes) {
    const result = await measureRoute(browser, opts.base, route, opts);
    results.push(result);

    console.log(`  ${route}`);
    console.log(
      `    FCP ${result.fcp}ms · LCP ${result.lcp}ms${result.lcpElement ? ` (${result.lcpElement})` : ''}`,
    );
    console.log(
      `    TBT ${result.tbt}ms over ${result.longTaskCount} long task(s), longest ${result.longest}ms`,
    );
    if (result.longTasks.length > 0) {
      const shown = result.longTasks
        .slice(0, 8)
        .map((task) => `${task.dur}ms@${task.start}`)
        .join('  ');
      console.log(`      tasks: ${shown}${result.longTasks.length > 8 ? '  …' : ''}`);
    }
    let tail = 0;
    for (const { script, ms } of result.scripts) {
      if (ms < MIN_REPORT_MS) {
        tail += ms;
        continue;
      }
      console.log(`      ${String(ms).padStart(6)}ms  ${script}`);
    }
    if (tail > 0)
      console.log(`      ${String(tail).padStart(6)}ms  (everything under ${MIN_REPORT_MS}ms)`);
    console.log();
  }

  await browser.close();

  if (opts.json) {
    writeFileSync(
      opts.json,
      JSON.stringify(
        { base: opts.base, cpuThrottle: opts.throttle, networkThrottle: opts.network, results },
        null,
        2,
      ),
    );
    console.log(`Wrote ${opts.json}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
