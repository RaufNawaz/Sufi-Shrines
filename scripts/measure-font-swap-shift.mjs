#!/usr/bin/env node
/**
 * measure-font-swap-shift.mjs — the layout shift caused by the web-font swap,
 * on purpose and on demand instead of by luck.
 *
 * WHY THIS EXISTS AS A FILE, GIVEN `measure-cls.mjs` ALREADY DOES CLS. Because
 * that script structurally cannot see this shift, and HANDOVER §9 says so:
 * unthrottled, the fonts arrive *before* first paint and there is nothing to
 * measure. Lighthouse throttles, so it does see it — and reported
 * `/order/qadiriyya` at **0.2186 on three consecutive runs (29 August)** and
 * **0.0002 on three consecutive runs (28 August)**, from the same code. The
 * handover's conclusion was that the number "depends on whether the font lands
 * before or after the first paint, which is an environment property rather than
 * a code one", and that therefore *neither* figure is the route's real CLS.
 *
 * That is a fair reading of an instrument that leaves the timing to chance. It
 * is also a reason to stop leaving it to chance. This script **holds the font
 * responses back** for a fixed delay, so the swap always happens after paint
 * and the measurement always describes the case the reader on a slow connection
 * actually gets. It answers "how bad is the swap when it is late", which is a
 * property of the code, rather than "was the swap late this time", which is a
 * property of the machine.
 *
 * WHAT IT COMPARES. Both arms in one build, one variable between them:
 *
 *   - `adjusted` — the shipped stack, whose first fallback is a metric-matched
 *     face from `data/font-metrics.json`.
 *   - `baseline` — the stack as it stood before those faces existed, re-imposed
 *     with `!important` custom properties so the adjusted faces are simply never
 *     named and never used.
 *
 * Same build, same data, same page: the delta is the fix and nothing else. That
 * matters more than usual here, because this repository's working tree is
 * sometimes shared with another agent, and an A/B across two builds minutes
 * apart is not necessarily an A/B across one change.
 *
 * READ THIS BEFORE TRUSTING A NUMBER FROM IT:
 *
 * - **The CSV cache is warmed first, deliberately.** The archive's other shift
 *   is the runtime sheet landing after paint, and it is large enough to bury
 *   this one. Each run loads the route once to populate the `localStorage`
 *   cache, then reloads and measures. What is left is close to the font shift
 *   alone. That is the opposite of `measure-cls.mjs`'s cold-visit rule, and
 *   deliberately so: that script measures the first impression, this one
 *   isolates one cause.
 * - **`shiftAfterFonts` is the number to read**, not `cls`. It sums only the
 *   entries that landed after the fonts were released, which is the swap.
 * - **The delay is not a claim about anybody's network.** 1500ms is chosen to
 *   be comfortably past first paint on this machine. Raising it does not make
 *   the shift worse; it only makes the timing less marginal.
 * - **It cannot see a shift below the viewport.** Layout instability is scored
 *   on what is on screen, which is the same rule Lighthouse uses, so a long
 *   article re-wrapping out of sight scores nothing here and nothing there.
 *
 * Usage:
 *   node scripts/measure-font-swap-shift.mjs
 *   node scripts/measure-font-swap-shift.mjs --runs 5 --route /order/qadiriyya
 *   node scripts/measure-font-swap-shift.mjs --base http://localhost:4173
 *   node scripts/measure-font-swap-shift.mjs --delay 3000 --json out.json
 */

import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

// 390px is the iPhone 12/13/14 logical width, and the width the rest of this
// repository's layout instruments use.
const VIEWPORT = { width: 390, height: 844 };

/** The stack as it was before the metric-matched faces were added. */
const BASELINE_TOKENS = `:root{
  --font-sans: 'Source Sans 3', system-ui, -apple-system, sans-serif !important;
  --font-serif: 'Merriweather', Georgia, serif !important;
}`;

const DEFAULT_ROUTES = ['/order/qadiriyya', '/saint/data-ganj-bakhsh', '/shrine/data-darbar'];

function parseArgs(argv) {
  const args = {
    base: 'http://localhost:5173',
    routes: [],
    runs: 3,
    delay: 1500,
    settle: 4000,
    cold: false,
    cpu: 1,
    block: false,
    json: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--route') args.routes.push(argv[++i]);
    else if (argv[i] === '--runs') args.runs = Number(argv[++i]);
    else if (argv[i] === '--delay') args.delay = Number(argv[++i]);
    else if (argv[i] === '--settle') args.settle = Number(argv[++i]);
    else if (argv[i] === '--cold') args.cold = true;
    else if (argv[i] === '--cpu') args.cpu = Number(argv[++i]);
    else if (argv[i] === '--block') args.block = true;
    else if (argv[i] === '--json') args.json = argv[++i];
  }
  if (args.routes.length === 0) args.routes = DEFAULT_ROUTES;
  return args;
}

const OBSERVER = () => {
  window.__shifts = [];
  /** A short, readable identity for a shifted node — tag plus its first class. */
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return '(detached)';
    const cls = typeof node.className === 'string' ? node.className.trim().split(/\s+/)[0] : '';
    return node.tagName.toLowerCase() + (cls ? `.${cls}` : '');
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__shifts.push({
        value: entry.value,
        at: entry.startTime,
        // Which elements moved. Without this the script can say a route shifts
        // and not what shifted, which is the difference between a number and a
        // diagnosis — and it is what Lighthouse gave and this did not.
        sources: (entry.sources ?? []).map((s) => describe(s.node)),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

/**
 * The second question this script answers, and on this archive's evidence the
 * more important one: **what does the page look like to a reader whose webfonts
 * never arrive at all?**
 *
 * That is not a hypothetical here. `index.html` carries a comment explaining
 * why the Google Fonts stylesheet is deliberately non-render-blocking: readers
 * are mostly on a mobile connection in Pakistan, "where Google's font CDN is
 * periodically slow or unreachable". For those readers the fallback is not a
 * flash before the real thing — it is the typeface of the whole visit. A
 * fallback 8% narrower than the face the layout was designed around gives them
 * a permanently different page, and no CLS measurement will ever show it,
 * because nothing shifts when nothing arrives.
 *
 * `--block` refuses the font files outright and reports the article height. The
 * number to compare it against is the same route's height with the fonts
 * allowed: the closer, the more faithfully the fallback stands in.
 */
async function measureOnce({ browser, base, route, arm, delay, settle, cold, cpu, block }) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // Lighthouse's mobile run throttles the CPU 4x, and that is not cosmetic
  // here: it widens the window between first paint and every later arrival,
  // which is the window a shift lands in. A measurement taken on an unthrottled
  // desktop is measuring a machine fast enough not to have the problem.
  if (cpu > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  }

  if (!cold) {
    // Pass 1: warm the sheet cache so its arrival is not the shift we measure.
    await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(settle);
  }

  // Pass 2: the measurement. Hold the font files back so the swap is always
  // late, and re-impose the old stack if this is the baseline arm.
  let fontsReleasedAt = null;
  await page.route(
    (url) => url.hostname === 'fonts.gstatic.com',
    async (route_) => {
      if (block) return route_.abort();
      await new Promise((r) => setTimeout(r, delay));
      await route_.continue();
    },
  );
  if (arm === 'baseline') {
    await page.addInitScript((css) => {
      const apply = () => {
        const style = document.createElement('style');
        style.textContent = css;
        document.documentElement.appendChild(style);
      };
      if (document.documentElement) apply();
      else document.addEventListener('readystatechange', apply, { once: true });
    }, BASELINE_TOKENS);
  }
  await page.addInitScript(OBSERVER);

  const startedAt = Date.now();
  if (cold) await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 60_000 });
  else await page.reload({ waitUntil: 'load', timeout: 60_000 });
  fontsReleasedAt = delay;
  // Waited on the clock, not on `document.fonts.check`. A face carrying a
  // `unicode-range` reports unavailable until something actually paints a
  // character in its range, and calling `document.fonts.load` to settle the
  // question would pull the fetch forward — changing the timing this script
  // exists to control. `merriweatherStatus` below reports what really happened
  // instead, so a run where the swap never occurred is visible rather than
  // silently scored as zero shift.
  await page.waitForTimeout(delay + settle);

  const out = await page.evaluate((releasedAt) => {
    const shifts = window.__shifts ?? [];
    const sum = (list) => list.reduce((t, s) => t + s.value, 0);
    return {
      cls: sum(shifts),
      shiftAfterFonts: sum(shifts.filter((s) => s.at >= releasedAt)),
      entries: shifts.length,
      // The biggest movers after the fonts were released, largest first.
      culprits: [...shifts]
        .filter((s) => s.at >= releasedAt)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
        .map((s) => `${s.value.toFixed(4)} ${s.sources.join(' + ') || '(no source)'}`),
      // Which stack the arm actually got. Reading only the *first* family here
      // would return "Source Sans 3" in both arms and discriminate nothing —
      // the arms differ in what comes second. This is the witness that the
      // baseline override took effect.
      serifStack: getComputedStyle(document.documentElement)
        .getPropertyValue('--font-serif')
        .trim(),
      // Whether the swap happened at all. Counted over every subset, because
      // Google ships one `@font-face` per subset and the first is Cyrillic —
      // asking `.find()` for the family returns an unloaded subset and reads
      // as "the font never arrived" on a page where it plainly did.
      loadedFaces: [...document.fonts].filter(
        (f) =>
          f.status === 'loaded' && (f.family === 'Merriweather' || f.family === 'Source Sans 3'),
      ).length,
      articleHeight: Math.round(
        document.querySelector('.entity-article-layout, article, main')?.getBoundingClientRect()
          .height ?? 0,
      ),
    };
  }, fontsReleasedAt);

  await context.close();
  return { ...out, elapsed: Date.now() - startedAt };
}

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch();
  const results = [];

  try {
    for (const route of args.routes) {
      for (const arm of ['baseline', 'adjusted']) {
        const runs = [];
        for (let i = 0; i < args.runs; i += 1) {
          runs.push(
            await measureOnce({
              browser,
              base: args.base,
              route,
              arm,
              delay: args.delay,
              settle: args.settle,
              cold: args.cold,
              cpu: args.cpu,
              block: args.block,
            }),
          );
        }
        results.push({ route, arm, runs });
      }
    }
  } finally {
    await browser.close();
  }

  console.log(
    `\nFont-swap layout shift — ${args.base}, ${args.runs} run(s), fonts held ${args.delay}ms, ` +
      `${args.cold ? 'cold cache' : 'warm cache'}, CPU ${args.cpu}x` +
      `${args.block ? ', WEBFONTS BLOCKED' : ''}\n`,
  );
  console.log(
    `${'route'.padEnd(28)} ${'arm'.padEnd(9)} ${'CLS'.padEnd(9)} ${'after fonts'.padEnd(12)} ` +
      `${'article px'.padEnd(11)} runs`,
  );
  for (const r of results) {
    const cls = median(r.runs.map((x) => x.shiftAfterFonts));
    console.log(
      `${r.route.padEnd(28)} ${r.arm.padEnd(9)} ` +
        `${median(r.runs.map((x) => x.cls))
          .toFixed(4)
          .padEnd(9)} ` +
        `${cls.toFixed(4).padEnd(12)} ` +
        `${String(median(r.runs.map((x) => x.articleHeight))).padEnd(11)} ` +
        `[${r.runs.map((x) => x.shiftAfterFonts.toFixed(4)).join(', ')}]`,
    );
  }

  console.log('');
  for (const r of results) {
    const worst = r.runs[0]?.culprits ?? [];
    if (worst.length) console.log(`${r.route} [${r.arm}] moved: ${worst.join(' | ')}`);
  }

  console.log('');
  for (const route of args.routes) {
    const base = results.find((r) => r.route === route && r.arm === 'baseline');
    const adj = results.find((r) => r.route === route && r.arm === 'adjusted');
    if (!base || !adj) continue;
    const b = median(base.runs.map((x) => x.shiftAfterFonts));
    const a = median(adj.runs.map((x) => x.shiftAfterFonts));
    const verdict =
      b === 0
        ? 'baseline had no shift to remove'
        : `${(((b - a) / b) * 100).toFixed(1)}% of it removed`;
    console.log(`${route}: ${b.toFixed(4)} → ${a.toFixed(4)}   (${verdict})`);
  }

  if (args.json) {
    writeFileSync(args.json, `${JSON.stringify({ args, results }, null, 2)}\n`);
    console.log(`\nwrote ${args.json}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
