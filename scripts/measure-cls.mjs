#!/usr/bin/env node
/**
 * measure-cls.mjs — layout instability on the entity routes, measured rather
 * than reasoned about.
 *
 * WHY THIS EXISTS AS A FILE. B4's Lighthouse run (27 August 2026) found CLS
 * 0.52 on `/saint`, 0.54 on `/almanac`, 0.22 on `/order` against a 0.1 budget,
 * and the follow-up measurement — article height over five seconds at 390px —
 * was taken in a scratch script that was never committed. The number survived
 * in HANDOVER §9 with nothing able to reproduce it. That is the exact failure
 * RULE 0 is about, so the instrument lives here now.
 *
 * WHAT IT MEASURES, and why these two things and not one:
 *
 *   1. `cls` — the sum of every non-input `layout-shift` entry, i.e. what
 *      Lighthouse and Core Web Vitals score. This is the number that has a
 *      budget.
 *   2. `heights` — the observed height of the shifting element, sampled every
 *      250ms. This is the number that tells you *why*, and it is the one that
 *      survived from the first pass: 2163 → 3618 says "a page and a half of
 *      content appeared mid-article", which no single CLS figure can say.
 *
 * A fix can move one without the other, and both directions are traps. Padding
 * the page with a reserved block can take CLS to zero while the content still
 * arrives two seconds late; holding the article back can leave the heights flat
 * and *raise* CLS, because a short page puts the footer on screen and then
 * shoves it down. Recording both is what makes those two outcomes
 * distinguishable.
 *
 * READ THIS BEFORE TRUSTING A NUMBER FROM IT:
 *
 * - **The dev server is a valid instrument here and the production build is a
 *   better one.** The shift is caused by the runtime CSV arriving after first
 *   paint, which happens on both. But dev serves unbundled modules, so first
 *   paint is later, which leaves *less* gap between paint and data and reads
 *   as a smaller CLS than a user sees. Compare like with like: dev against
 *   dev, preview against preview. `--base` records which it was.
 * - **CLS depends on when the CSV lands, so it is not a constant.** Run with
 *   `--runs 3` and read the median. A single run that disagrees with a previous
 *   single run by 0.1 has told you nothing.
 * - **A warm HTTP cache hides the whole defect.** `useShrineData` caches the
 *   parsed sheet in localStorage for an hour, and on a cache hit the data is
 *   there at first paint and CLS is ~0. Every context here is a fresh one for
 *   that reason. That also means this is a *cold visit* measurement, which is
 *   the right one — it is the first impression that has the defect.
 *
 * Usage:
 *   node scripts/measure-cls.mjs                      # dev server, default routes
 *   node scripts/measure-cls.mjs --runs 3
 *   node scripts/measure-cls.mjs --base http://localhost:4173 --runs 3
 *   node scripts/measure-cls.mjs --route /saint/data-ganj-bakhsh
 *   node scripts/measure-cls.mjs --json out.json
 *   node scripts/measure-cls.mjs --sections --route /saint/data-ganj-bakhsh
 *   node scripts/measure-cls.mjs --check         # the invariant; exits non-zero
 */

import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

// 390px is the iPhone 12/13/14 logical width and the width Lighthouse's mobile
// preset emulates, so these numbers are comparable to the table in HANDOVER §9.
const VIEWPORT = { width: 390, height: 844 };
const SAMPLE_INTERVAL_MS = 250;
const OBSERVE_MS = 5000;

/* The element to trace the height of. Not a guess: the page reports the
   element the browser itself blamed for the largest shift (see ATTRIBUTE
   below), and this list is only the fallback for a route whose shift entries
   carry no node — which happens when the shifting element has since been
   unmounted. An earlier version of this script hardcoded the list and silently
   traced nothing on `/shrine` and `/place`, printing `grew 0 -> 0px` beside a
   real CLS of 0.11. A selector list is a guess about markup; the shift entry is
   the measurement. */
const FALLBACK_SELECTORS = [
  '.entity-article-layout',
  '.almanac-page',
  '.shrine-page',
  '.entity-page',
  'main',
];

const DEFAULT_ROUTES = [
  '/saint/data-ganj-bakhsh',
  '/almanac',
  '/order/qadiriyya',
  '/shrine/data-darbar',
  '/place/lahore',
];

function parseArgs(argv) {
  const opts = {
    base: 'http://localhost:5173',
    runs: 1,
    routes: [],
    json: null,
    sections: false,
    check: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base') opts.base = argv[++i];
    else if (arg === '--runs') opts.runs = Number(argv[++i]);
    else if (arg === '--route') opts.routes.push(argv[++i]);
    else if (arg === '--json') opts.json = argv[++i];
    else if (arg === '--sections') opts.sections = true;
    else if (arg === '--check') opts.check = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (opts.routes.length === 0) opts.routes = DEFAULT_ROUTES;
  if (!Number.isFinite(opts.runs) || opts.runs < 1) throw new Error('--runs must be >= 1');
  return opts;
}

/* Installed before any app code runs, so the first shift is not missed. The
   `hadRecentInput` filter is what makes this CLS rather than "all movement":
   a shift within 500ms of a real interaction is the user's own doing and is
   excluded from the metric by definition. Nothing here interacts, so in
   practice the filter is a guard against a stray scroll restoring.
 *
 * ATTRIBUTE: each entry carries `sources`, the nodes the browser saw move. We
 * keep a readable selector for the largest one, which is how the trace target
 * stops being a hardcoded guess. `previousRect`/`currentRect` give the distance
 * moved, which is the part a height trace cannot show — a section can grow
 * without moving anything, and that is a fix, not a defect. */
const COLLECTOR = `
  window.__shifts = [];
  window.__shiftSources = [];
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return null;
    const id = node.id ? '#' + node.id : '';
    const cls = typeof node.className === 'string' && node.className.trim()
      ? '.' + node.className.trim().split(/\\s+/).slice(0, 3).join('.')
      : '';
    return node.tagName.toLowerCase() + id + cls;
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__shifts.push(entry.value);
      window.__shiftSources.push({
        value: entry.value,
        at: Math.round(entry.startTime),
        sources: (entry.sources || []).map((source) => ({
          selector: describe(source.node),
          movedY: Math.round((source.currentRect?.y ?? 0) - (source.previousRect?.y ?? 0)),
          grewBy: Math.round(
            (source.currentRect?.height ?? 0) - (source.previousRect?.height ?? 0),
          ),
        })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
`;

async function measureOnce(context, base, route) {
  const page = await context.newPage();
  await page.addInitScript(COLLECTOR);

  const url = `${base}${route}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  if (response && response.status() >= 400) {
    await page.close();
    throw new Error(`${route} returned HTTP ${response.status()}`);
  }

  /* Two traces per tick. The document's scroll height always exists, so it can
     never report `0 -> 0` the way a missing selector does; the wrapper height
     is the one that localises the growth to the article rather than the chrome.
     Where they disagree the difference is itself informative — a page that
     grows while its article does not is growing somewhere else. */
  const pageHeights = [];
  const wrapperHeights = [];
  let wrapperSelector = null;
  const samples = Math.floor(OBSERVE_MS / SAMPLE_INTERVAL_MS);
  for (let i = 0; i < samples; i++) {
    const sample = await page.evaluate((selectors) => {
      let wrapper = null;
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          wrapper = { sel, height: Math.round(el.getBoundingClientRect().height) };
          break;
        }
      }
      return {
        page: Math.round(document.documentElement.scrollHeight),
        wrapper,
      };
    }, FALLBACK_SELECTORS);
    if (sample.wrapper) {
      wrapperSelector = sample.wrapper.sel;
      wrapperHeights.push(sample.wrapper.height);
    } else {
      wrapperHeights.push(0);
    }
    pageHeights.push(sample.page);
    await page.waitForTimeout(SAMPLE_INTERVAL_MS);
  }

  const { cls, shiftEntries } = await page.evaluate(() => ({
    cls: window.__shifts.reduce((sum, value) => sum + value, 0),
    shiftEntries: window.__shiftSources,
  }));

  /* Reported alongside CLS because it separates "the page settled early" from
     "the page never settled inside the window". A route whose last two samples
     still differ has not finished moving and its CLS is a floor, not a total. */
  const settled = pageHeights.length > 1 && pageHeights.at(-1) === pageHeights.at(-2);
  await page.close();

  /* The individual shift entries, largest first — NOT summed per selector.
   *
   * Summing per selector was the first version and it lied: a single entry
   * lists every node that moved, and charging the entry's whole value to each
   * of them reported 1.0492 of instability on a page whose total CLS is
   * 0.5687. An entry is the unit the metric is defined on, so an entry is the
   * unit reported.
   *
   * `at` is the one field that identifies a cause without reading any code. A
   * shift at ~2000ms on this app is the CSV landing; one at ~300ms is a font
   * or an entry animation; one after 3000ms is something later still. */
  const entries = shiftEntries
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
    .map((entry) => ({
      value: Number(entry.value.toFixed(4)),
      at: entry.at,
      sources: entry.sources.slice(0, 3),
    }));

  const nonZeroPage = pageHeights.filter((h) => h > 0);
  const nonZeroWrapper = wrapperHeights.filter((h) => h > 0);
  return {
    cls: Number(cls.toFixed(4)),
    wrapperSelector,
    pageHeights,
    wrapperHeights,
    settled,
    entries,
    minPage: nonZeroPage.length ? Math.min(...nonZeroPage) : 0,
    maxPage: pageHeights.length ? Math.max(...pageHeights) : 0,
    minWrapper: nonZeroWrapper.length ? Math.min(...nonZeroWrapper) : 0,
    maxWrapper: wrapperHeights.length ? Math.max(...wrapperHeights) : 0,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* Runs of the same height collapse to `2163 ×4`. Without this the five-second
   trace is twenty numbers and the one that matters — where it steps — is hard
   to see; with it the shape is the line. */
function compressTrace(heights) {
  const parts = [];
  for (const height of heights) {
    const last = parts.at(-1);
    if (last && last.height === height) last.count++;
    else parts.push({ height, count: 1 });
  }
  return parts.map((p) => (p.count > 1 ? `${p.height} ×${p.count}` : `${p.height}`)).join(' → ');
}

/* ── --sections: what actually changed, by heading ───────────────────────────
 *
 * The diagnostic that corrected the record. It snapshots every sectioning
 * element's heading, top and height at a series of timestamps and prints the
 * diff between consecutive stamps, so "the article grew 1,455px" becomes "two
 * named sections appeared, one of them 1,186px, and nine sections moved down".
 *
 * Sections are keyed on tag + first classes + heading text rather than on DOM
 * index, because index-keying reports every section after an insertion as
 * "changed" and buries the one that appeared. */
const SECTION_STAMPS_MS = [400, 900, 1400, 1900, 2600, 3500];

async function measureSections(browser, base, route) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });

  const snapshot = () =>
    page.evaluate(() => {
      const rows = [];
      document
        .querySelectorAll('section, aside, footer, article, div.entity-article-layout')
        .forEach((el) => {
          const rect = el.getBoundingClientRect();
          const heading = el.querySelector('h1, h2, h3');
          const cls =
            typeof el.className === 'string' && el.className.trim()
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
              : '';
          rows.push({
            key:
              el.tagName.toLowerCase() +
              cls +
              '|' +
              (heading?.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40),
            top: Math.round(rect.top + window.scrollY),
            height: Math.round(rect.height),
          });
        });
      return { rows, pageHeight: document.documentElement.scrollHeight, scrollY: window.scrollY };
    });

  const stamps = [];
  let elapsed = 0;
  for (const at of SECTION_STAMPS_MS) {
    await page.waitForTimeout(Math.max(0, at - elapsed));
    elapsed = at;
    stamps.push({ at, ...(await snapshot()) });
  }
  await context.close();

  console.log(`\nSection diff — ${base}${route}, ${VIEWPORT.width}×${VIEWPORT.height}\n`);
  for (let i = 1; i < stamps.length; i++) {
    const before = stamps[i - 1];
    const after = stamps[i];
    const byKey = new Map(before.rows.map((r) => [r.key, r]));
    const lines = [];
    for (const row of after.rows) {
      const prev = byKey.get(row.key);
      if (!prev) {
        // The viewport marker is the whole point: a section appearing at
        // top < viewport height is one the reader was already looking at.
        const seen = row.top < VIEWPORT.height ? ' ← IN FIRST VIEWPORT' : '';
        lines.push(`  + appeared  ${String(row.height).padStart(5)}px  at ${row.top}px${seen}`);
        lines.push(`              ${row.key}`);
      } else if (prev.height !== row.height || prev.top !== row.top) {
        const moved = row.top - prev.top;
        const grew = row.height - prev.height;
        const parts = [];
        if (moved) parts.push(`moved ${moved > 0 ? '+' : ''}${moved}px`);
        if (grew) parts.push(`grew ${grew > 0 ? '+' : ''}${grew}px`);
        const seen = prev.top < VIEWPORT.height ? ' ← WAS VISIBLE' : '';
        lines.push(`  ~ ${parts.join(', ').padEnd(26)} ${row.key}${seen}`);
      }
    }
    for (const row of before.rows) {
      if (!after.rows.some((r) => r.key === row.key)) {
        lines.push(`  - vanished  ${String(row.height).padStart(5)}px  ${row.key}`);
      }
    }
    const delta = after.pageHeight - before.pageHeight;
    console.log(
      `=== ${before.at}ms → ${after.at}ms   page ${before.pageHeight} → ${after.pageHeight}px` +
        `${delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''} ===`,
    );
    console.log(lines.length ? lines.join('\n') : '  (no change)');
    console.log();
  }
}

/* ── --check: the footer is not the first thing a reader sees ────────────────
 *
 * The invariant behind the one part of A14 that had no trade in it. The site
 * footer is rendered *inside* each page's article rather than after the page
 * wrapper, so a page still waiting for the sheet is shorter than the viewport
 * and puts its footer on screen — and then the data arrives and moves it
 * thousands of pixels down. `/place/lahore` measured CLS 0.1048, all of it the
 * footer at y=232.
 *
 * Checked by stalling the CSV rather than by racing it, because the loading
 * state is the thing under test and on a fast connection it is gone before a
 * screenshot. Aborting after the stall also exercises the path a reader on a
 * dead connection takes.
 */
/* Every route that renders a footer and reads the sheet. The 404 is
   deliberately absent: its footer is high — y=598 — but nothing on that page is
   data-dependent, so the footer has nowhere to be pushed to. A route belongs
   here when its content arrives after first paint. */
const CHECK_ROUTES = [
  '/',
  '/saint/data-ganj-bakhsh',
  '/order/qadiriyya',
  '/place/lahore',
  '/shrine/data-darbar',
  '/almanac',
  '/about',
  '/graph',
  '/typology',
];

const CSV_GLOB = '**/*output=csv*';
const STALL_MS = 6000;

async function checkLoadingFooter(browser, base) {
  const offenders = [];
  console.log(`\nLoading-state footer — ${base}, ${VIEWPORT.width}×${VIEWPORT.height}\n`);

  for (const route of CHECK_ROUTES) {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.route(CSV_GLOB, async (route_) => {
      await new Promise((resolve) => setTimeout(resolve, STALL_MS));
      await route_.abort();
    });
    await page
      .goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
    const footerTop = await page.evaluate(() => {
      const footer = document.querySelector('footer.site-footer');
      return footer ? Math.round(footer.getBoundingClientRect().top + window.scrollY) : null;
    });
    await context.close();

    if (footerTop === null) {
      console.log(`  ok    ${route.padEnd(28)} no footer while loading`);
      continue;
    }
    if (footerTop >= VIEWPORT.height) {
      console.log(`  ok    ${route.padEnd(28)} footer at ${footerTop}px, below the fold`);
      continue;
    }
    console.log(`  FAIL  ${route.padEnd(28)} footer at ${footerTop}px, inside the first viewport`);
    offenders.push({ route, footerTop });
  }

  if (offenders.length > 0) {
    console.error(
      `\n${offenders.length} route(s) show the footer inside the first viewport while the` +
        ` dataset is loading.\nIt will be pushed thousands of pixels down when the data arrives,` +
        ` and that is a layout shift of\nthe only element the reader can see. Add` +
        ` \`page-loading-reserve\` to the loading branch (see components.css), or take the` +
        `\nroute out of CHECK_ROUTES with the reason its footer cannot move.\n`,
    );
    return 1;
  }
  console.log('\nNo route shows the footer inside the first viewport while loading.\n');
  return 0;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(
      'node scripts/measure-cls.mjs [--base URL] [--runs N] [--route PATH] [--json FILE]' +
        ' [--sections] [--check]',
    );
    return;
  }

  try {
    const probe = await fetch(opts.base, { method: 'GET' });
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (err) {
    console.error(`Cannot reach ${opts.base} — ${err.message}`);
    console.error('Start the dev server (npm run dev), or pass --base for a preview build.');
    process.exit(2);
  }

  const browser = await chromium.launch();

  if (opts.check) {
    const code = await checkLoadingFooter(browser, opts.base);
    await browser.close();
    process.exit(code);
  }

  if (opts.sections) {
    for (const route of opts.routes) {
      await measureSections(browser, opts.base, route);
    }
    await browser.close();
    return;
  }

  const results = [];

  for (const route of opts.routes) {
    const runs = [];
    for (let i = 0; i < opts.runs; i++) {
      // A fresh context per run: `useShrineData` caches the parsed sheet in
      // localStorage for an hour, and a warm cache is a page with no defect.
      const context = await browser.newContext({ viewport: VIEWPORT });
      try {
        runs.push(await measureOnce(context, opts.base, route));
      } catch (err) {
        console.error(`  ${route} run ${i + 1} failed — ${err.message}`);
      } finally {
        await context.close();
      }
    }
    if (runs.length === 0) {
      results.push({ route, error: 'every run failed' });
      continue;
    }
    results.push({
      route,
      cls: median(runs.map((r) => r.cls)),
      clsRuns: runs.map((r) => r.cls),
      wrapperSelector: runs[0].wrapperSelector,
      minPage: median(runs.map((r) => r.minPage)),
      maxPage: median(runs.map((r) => r.maxPage)),
      minWrapper: median(runs.map((r) => r.minWrapper)),
      maxWrapper: median(runs.map((r) => r.maxWrapper)),
      settled: runs.every((r) => r.settled),
      pageTrace: compressTrace(runs[0].pageHeights),
      wrapperTrace: compressTrace(runs[0].wrapperHeights),
      entries: runs[0].entries,
    });
  }

  await browser.close();

  console.log(`\nCLS — ${opts.base}, ${VIEWPORT.width}px, ${opts.runs} run(s), median\n`);
  const BUDGET = 0.1;
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.route.padEnd(30)} ${r.error}`);
      continue;
    }
    const verdict = r.cls > BUDGET ? 'OVER' : 'ok';
    const pad = ''.padEnd(6);
    console.log(
      `  ${r.route.padEnd(30)} CLS ${String(r.cls).padEnd(8)} ${verdict}` +
        `${r.settled ? '' : '   [NOT SETTLED in 5s — CLS is a floor]'}`,
    );
    console.log(`${pad}page    ${r.minPage} → ${r.maxPage}px   ${r.pageTrace}`);
    if (r.wrapperSelector) {
      console.log(
        `${pad}${r.wrapperSelector.padEnd(8)}${r.minWrapper} → ${r.maxWrapper}px   ${r.wrapperTrace}`,
      );
    }
    for (const entry of r.entries) {
      const where = entry.sources
        .map((src) => {
          const moved = src.movedY ? `moved ${src.movedY}px` : '';
          const grew = src.grewBy ? `grew ${src.grewBy}px` : '';
          const how = [moved, grew].filter(Boolean).join(', ') || 'no rect change';
          return `${src.selector ?? '(node gone)'} (${how})`;
        })
        .join('; ');
      console.log(
        `${pad}shift   ${String(entry.value).padEnd(8)} @${String(entry.at).padEnd(6)}ms ${where}`,
      );
    }
    if (r.clsRuns.length > 1) console.log(`${pad}runs    ${r.clsRuns.join(', ')}`);
    console.log();
  }
  console.log();

  if (opts.json) {
    writeFileSync(
      opts.json,
      JSON.stringify({ base: opts.base, viewport: VIEWPORT, results }, null, 2),
    );
    console.log(`Wrote ${opts.json}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
