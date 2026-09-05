#!/usr/bin/env node
/**
 * measure-interaction.mjs — how long the main thread is blocked *after* load,
 * while a reader is actually using the archive.
 *
 * WHY THIS EXISTS. Every performance instrument in this repository measures the
 * first few seconds: `measure-lcp.mjs`, `measure-cls.mjs`, `measure-blocking.mjs`
 * and the bundle budget all answer "how fast does the page arrive". None of them
 * answers "how does it feel to use", and that is the complaint this was written
 * for (4 September 2026): filters, search, the language toggle and the map read
 * as slow and chunky *after* everything has loaded, which is the one region the
 * existing battery is blind to.
 *
 * The distinction matters because the two are optimised against each other. A
 * route can hit every load budget in this repo and still drop 40 frames when a
 * filter chip is pressed, because the work is not in the download — it is in a
 * React subtree re-rendering 169 rows and Leaflet rebuilding 169 icons.
 *
 * WHAT IT REPORTS, per scripted interaction
 *
 *   blocked      sum of (task − 50ms) over long tasks inside the window — the
 *                TBT definition, applied to an interaction instead of a load
 *   longest      the single longest task, which is what the reader feels as a
 *                freeze. A 300ms task and six 50ms tasks have similar TBT and
 *                completely different feel.
 *   tasks        how many long tasks fired
 *   inp          the worst `event` / `first-input` PerformanceEventTiming
 *                duration in the window — the browser's own measure of the lag
 *                between a press and the frame that answers it
 *   frames       for gesture interactions, the worst frame gap from rAF, which
 *                catches jank that fires no input event at all (map pan)
 *
 * READ THIS BEFORE TRUSTING A NUMBER
 *
 * - **Preview build, not dev.** Same reason `measure-blocking.mjs` says so: dev
 *   ships unbundled modules and measures a different program.
 * - **The CPU throttle is the whole experiment.** On an unthrottled M-series
 *   laptop almost nothing here registers; the reader's phone is the case under
 *   test. Default 4× is Lighthouse's mobile preset. `--cpu 1` is useful only to
 *   confirm that a finding is throttle-dependent, never as the headline number.
 * - **Network throttling is deliberately OFF.** This measures interactions after
 *   load, so a slow network would inject unrelated variance and, worse, would
 *   make a fetch-bound interaction look CPU-bound. Load-time numbers must still
 *   come from `measure-blocking.mjs`, which throttles both.
 * - **Warm up, then measure.** Each interaction runs once discarded and then
 *   `--runs` times recorded, because the first press of anything pays for a
 *   lazy chunk and a cold code path. Reported value is the **median** — a max
 *   over three runs would report the GC that happened to land in one of them.
 * - **Read the spread, not just the median.** Every row prints `min–max`
 *   beside its median for exactly one reason: the first run of this script
 *   reported the language toggle at 693ms and the map pan at 81ms, and the
 *   second run of the same build reported 140ms and 159ms. Both were medians
 *   of three. A number from this instrument whose spread is wider than the
 *   change being tested has not measured the change. Raise `--runs` until the
 *   spread closes, or the finding is noise. This is the repository's own
 *   standing lesson (`feedback_measure_before_recording`) applied to the
 *   instrument written to test it.
 * - **Run it alone.** It throttles the CPU to a quarter and then measures how
 *   long the main thread is busy. A second copy of this script — or a Playwright
 *   suite, or a `vite build` — running beside it is competing for the cores it
 *   is measuring, and both runs come out wrong in the same believable direction.
 *   If a number moves and nothing in the diff explains it, ask what else was
 *   running before believing the number.
 * - **A number under ~50ms is not a finding.** Nothing is a long task below the
 *   50ms threshold by definition, and event timing at that scale is dominated by
 *   the harness's own dispatch.
 *
 * Usage:
 *   npm run build:e2e && npm run preview     # in another terminal
 *   node scripts/measure-interaction.mjs
 *   node scripts/measure-interaction.mjs --cpu 6 --runs 5
 *   node scripts/measure-interaction.mjs --only filter,search
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const argVal = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = argVal('--base', 'http://localhost:4173');
const CPU = Number(argVal('--cpu', '4'));
const RUNS = Number(argVal('--runs', '3'));
const ONLY = argVal('--only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const OUT = argVal('--out', '');
const VIEWPORT = { width: 390, height: 844 };

/** Installed before any app code so the observers cannot miss an early task. */
const PROBE = `
  window.__jank = { tasks: [], events: [], frames: [], mark: 0 };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__jank.tasks.push({ start: e.startTime, dur: e.duration });
  }).observe({ type: 'longtask', buffered: true });
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__jank.events.push({ start: e.startTime, dur: e.duration, name: e.name });
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch { /* Firefox/WebKit lack event timing; Chromium is what we run */ }
  (function raf(t) { window.__jank.frames.push(t); requestAnimationFrame(raf); })(performance.now());
  window.__jankStart = () => { window.__jank.mark = performance.now(); };
  window.__jankStop = () => {
    const m = window.__jank.mark;
    const tasks = window.__jank.tasks.filter((t) => t.start + t.dur >= m);
    const events = window.__jank.events.filter((e) => e.start >= m);
    const frames = window.__jank.frames.filter((f) => f >= m);
    let worstFrame = 0;
    for (let i = 1; i < frames.length; i++) worstFrame = Math.max(worstFrame, frames[i] - frames[i - 1]);
    return {
      blocked: Math.round(tasks.reduce((s, t) => s + Math.max(0, t.dur - 50), 0)),
      longest: Math.round(tasks.reduce((s, t) => Math.max(s, t.dur), 0)),
      tasks: tasks.length,
      inp: Math.round(events.reduce((s, e) => Math.max(s, e.dur), 0)),
      worstFrame: Math.round(worstFrame),
    };
  };
`;

/**
 * The local calendar date, not the UTC one.
 *
 * `new Date().toISOString().slice(0, 10)` is the obvious spelling and it is
 * wrong here: run after 20:00 EDT it returns tomorrow, so a report written by
 * this script would carry a date that has not happened. That is precisely the
 * defect `src/test/datedClaims.test.ts` exists for — 48 measurements dated a
 * day that had not happened, across 23 files — and that guard defines "today"
 * from the *local* getters (`todayUtc()` wraps `getFullYear/getMonth/getDate`),
 * so a UTC stamp from here would be flagged by it. Matching the guard's
 * definition is the point.
 */
const todayLocal = () => {
  const n = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
};

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};
/** median plus the range it came from — the range is what says whether to believe it. */
const stat = (xs) => ({ med: median(xs), min: Math.min(...xs), max: Math.max(...xs) });
const show = (s, w = 4) => `${String(s.med).padStart(w)} (${s.min}–${s.max})`;

/**
 * Each scenario opens its own page: a filter left on from a previous scenario
 * would change what the next one is measuring, and that is exactly the kind of
 * shared state that makes a benchmark drift without anyone editing it.
 */
const SCENARIOS = [
  {
    name: 'filter',
    what: 'press a category filter chip, then release it',
    route: '/',
    settle: async (page) => {
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 30000 });
      /* The archive opens in spotlight mode, so the browse button opens the
         command palette rather than an inline list; the chips and the search
         field both live inside it. Opening it is setup, not the thing timed. */
      await page.locator('.list-toggle-btn').first().click();
      await page.waitForSelector('.palette-input', { timeout: 15000 });
      /* Filters are a disclosure inside the palette, collapsed by default. */
      await page
        .locator('.palette-filters-toggle, button:has(.palette-filters-label)')
        .first()
        .click();
      await page.waitForSelector('.filter-chip', { timeout: 15000 });
      await page.waitForTimeout(500);
    },
    run: async (page) => {
      /* Not `.first()`: the leading chip in each group is the "all" reset,
         which is already active, so pressing it filters nothing and would
         measure a no-op. The second is a real category. */
      const chip = page.locator('.filter-chip').nth(1);
      await chip.click();
      await page.waitForTimeout(700);
      await chip.click();
      await page.waitForTimeout(700);
    },
  },
  {
    name: 'search',
    what: 'type six characters into the archive search palette',
    route: '/',
    settle: async (page) => {
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 30000 });
      await page.locator('.list-toggle-btn').first().click();
      await page.waitForSelector('.palette-input', { timeout: 15000 });
      await page.waitForTimeout(500);
    },
    run: async (page) => {
      const input = page.locator('.palette-input').first();
      await input.click();
      for (const ch of 'lahore') {
        await input.type(ch, { delay: 90 });
      }
      await page.waitForTimeout(700);
      await input.fill('');
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'select-marker',
    what: 'tap a map pin and open its preview',
    route: '/',
    settle: async (page) => {
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 30000 });
    },
    run: async (page) => {
      const pin = page.locator('.leaflet-marker-icon').first();
      await pin.click({ force: true });
      await page.waitForTimeout(900);
    },
  },
  {
    name: 'map-pan',
    what: 'drag the map across a screen width',
    route: '/',
    settle: async (page) => {
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 30000 });
    },
    run: async (page) => {
      const box = { x: 195, y: 400 };
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      for (let i = 0; i < 20; i++) {
        await page.mouse.move(box.x - i * 8, box.y - i * 4);
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
      await page.waitForTimeout(700);
    },
  },
  {
    name: 'lang-toggle',
    what: 'switch the interface from English to Urdu',
    route: '/',
    settle: async (page) => {
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 30000 });
    },
    run: async (page) => {
      const toggle = page.locator('.lang-seg[lang="ur"]').first();
      await toggle.click();
      await page.waitForTimeout(1600);
    },
  },
  {
    name: 'shrine-scroll',
    what: 'scroll a long shrine article to the bibliography',
    route: '/shrine/data-darbar',
    settle: async (page) => {
      await page.waitForSelector('article, .shrine-article', { timeout: 30000 });
      await page.waitForTimeout(1200);
    },
    run: async (page) => {
      for (let i = 0; i < 24; i++) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'route-nav',
    what: 'navigate map → shrine page via a link',
    route: '/',
    settle: async (page) => {
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 30000 });
    },
    run: async (page) => {
      await page.evaluate(() => window.history.pushState({}, '', '/shrine/data-darbar'));
      await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
      await page.waitForTimeout(1800);
    },
  },
];

const chosen = ONLY.length ? SCENARIOS.filter((s) => ONLY.includes(s.name)) : SCENARIOS;

const browser = await chromium.launch();
const results = [];

for (const scenario of chosen) {
  const samples = [];
  let note = '';
  for (let run = 0; run < RUNS + 1; run++) {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await context.addInitScript(PROBE);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    try {
      await page.goto(`${BASE}${scenario.route}`, { waitUntil: 'load', timeout: 60000 });
      await scenario.settle(page);
      await page.waitForTimeout(800);
      await page.evaluate(() => window.__jankStart());
      await scenario.run(page);
      const m = await page.evaluate(() => window.__jankStop());
      if (run > 0) samples.push(m); // run 0 is the discarded warm-up
    } catch (err) {
      note = String(err.message || err)
        .split('\n')[0]
        .slice(0, 110);
    }
    await context.close();
  }
  if (!samples.length) {
    results.push({ name: scenario.name, what: scenario.what, error: note || 'no samples' });
    console.log(`  ${scenario.name.padEnd(14)} — could not measure: ${note}`);
    continue;
  }
  const row = {
    name: scenario.name,
    what: scenario.what,
    blocked: stat(samples.map((s) => s.blocked)),
    longest: stat(samples.map((s) => s.longest)),
    tasks: stat(samples.map((s) => s.tasks)),
    inp: stat(samples.map((s) => s.inp)),
    worstFrame: stat(samples.map((s) => s.worstFrame)),
  };
  results.push(row);
  console.log(
    `  ${row.name.padEnd(14)} blocked ${show(row.blocked)}  longest ${show(row.longest)}  inp ${show(row.inp)}  worstFrame ${show(row.worstFrame)}`,
  );
}

await browser.close();

console.log(`\n  base ${BASE} · ${CPU}× CPU · median of ${RUNS} runs · ${todayLocal()}`);
if (OUT) {
  writeFileSync(
    OUT,
    JSON.stringify(
      { base: BASE, cpu: CPU, runs: RUNS, at: new Date().toISOString(), results },
      null,
      2,
    ),
  );
  console.log(`  written to ${OUT}`);
}
