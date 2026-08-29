#!/usr/bin/env node
/**
 * measure-font-metrics.mjs — the numbers behind the metric-matched fallback
 * faces, measured in the engine that will use them.
 *
 * WHY THIS EXISTS AS A FILE. The 29 August Lighthouse sweep attributed
 * `/order/qadiriyya`'s CLS 0.2186 to exactly two files:
 *
 *     div.entity-article-layout   caused by:
 *       fonts.gstatic.com/…/sourcesans3…woff2
 *       fonts.gstatic.com/…/merriweather…woff2
 *
 * That is the web-font swap. The page paints in Georgia and system-ui, the two
 * webfonts land, and every paragraph re-wraps because the webfonts are wider:
 * Merriweather's average advance is 8.0% wider than Georgia's, Source Sans 3's
 * is 7.5% narrower than Helvetica's. `line-height` is a fixed 1.6 everywhere in
 * this codebase (there is no `line-height: normal` in `src/`), so the shift is
 * not a leading change — it is **line count**. A paragraph that wrapped into
 * eleven lines wraps into twelve, and everything below it moves.
 *
 * The fix is to make the fallback occupy the space the webfont will need:
 * `size-adjust` for the width, the three metric overrides for the line box in
 * the UA-default contexts (`<button>`, `<input>`) that never inherit 1.6. That
 * needs four real numbers per font pair, and those numbers are what this script
 * produces. HANDOVER §9 records the argument; RULE 0 is why the instrument is
 * committed rather than run once in a scratch file.
 *
 * WHY IT MEASURES IN CHROMIUM RATHER THAN PARSING THE FONT FILE. A font ships
 * three competing sets of vertical metrics — `hhea`, OS/2 `sTypo*`, OS/2
 * `usWin*` — and which pair a browser uses depends on the platform and on the
 * USE_TYPO_METRICS bit. Parsing the TTF tells you what the font says. Asking
 * Chromium tells you what the reader gets, and the reader is the point. Canvas
 * `fontBoundingBoxAscent`/`Descent` reports the ascent and descent the engine
 * resolved; a hidden `line-height: normal` div reports the line box; the line
 * gap is what is left over.
 *
 * THE SELF-CHECK IS THE REASON TO BELIEVE ANY OF IT. Computing an override and
 * writing it into a stylesheet is a hypothesis. So after computing, the script
 * declares the fallback face it just designed — at the rounding it will actually
 * be written with — measures *that*, and compares it against the webfont it was
 * supposed to imitate. If the four metrics do not land within tolerance it says
 * so and exits non-zero. Four instruments have lied in this repository already
 * (HANDOVER §9.107, and the rule that came out of it); this one is built to
 * fail out loud instead of quietly.
 *
 * READ THIS BEFORE TRUSTING A NUMBER FROM IT:
 *
 * - **Two provenances, and they are not equally good.** A candidate installed
 *   on this machine is measured directly (`local`). A candidate that is not —
 *   Roboto and Noto Serif, which is what most of this archive's readers have,
 *   since they are on Android — is measured from **the Google Fonts copy of the
 *   same family** (`cdn`), loaded under a private name. The metrics of Roboto
 *   are the metrics of Roboto however it arrived, so this is a real measurement
 *   and not an estimate; what it cannot see is that a given Android build may
 *   ship an older cut of the family whose metrics have moved. Treat `cdn` rows
 *   as correct for the family and unverified for the device.
 * - **Segoe UI is not measurable anywhere.** It is not installed here and
 *   Microsoft does not publish it. Windows readers therefore fall to the
 *   Arial-based face, which resolves there. That is a deliberate trade recorded
 *   in the stylesheet, not an oversight.
 * - **One weight per family.** Metrics are matched at weight 400, the body
 *   prose that dominates the shift. The overrides fix the line box for every
 *   weight of the fallback family; `size-adjust` is exact only at 400, so a
 *   bold heading can still re-flow by a hair.
 * - **Advance width is averaged over a real sentence, not over the glyph set.**
 *   Averaging every glyph in a font weights Icelandic thorn like `e`. The
 *   sample below is English prose of the shape this archive actually publishes,
 *   with the digits and punctuation its recorded dates use.
 *
 * Usage:
 *   node scripts/measure-font-metrics.mjs                 # measure and print
 *   node scripts/measure-font-metrics.mjs --css           # emit the @font-face block
 *   node scripts/measure-font-metrics.mjs --write         # update data/font-metrics.json
 *   node scripts/measure-font-metrics.mjs --check         # re-measure against that snapshot
 *   node scripts/measure-font-metrics.mjs --base http://localhost:4173
 *   node scripts/measure-font-metrics.mjs --json out.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The committed measurement. RULE 0: the numbers in the stylesheet came from
 * somewhere, and "somewhere" has to be a file in this repository rather than a
 * terminal that has since been closed. `fontFallbackMetrics.test.ts` asserts
 * the stylesheet still agrees with this file, which is a check CI can run on a
 * machine that has none of these fonts installed; `--check` here re-measures,
 * which needs the fonts and the network and so is a human's job.
 */
const SNAPSHOT = join(REPO, 'data', 'font-metrics.json');

const SAMPLE =
  'The shrine stands at the edge of the old city, and the survey records its ' +
  'construction in 1041 AH, though the note qualifies that the year may refer ' +
  'to the saint death rather than the building. Field-verified, 24 August 2026.';

// Measured at 1000px so engine rounding sits four orders of magnitude below the
// last digit we keep.
const EM = 1000;

/**
 * The two webfonts that cause the shift, and the local faces each falls back
 * to, in the order the stack should try them.
 *
 * `cdn` names the Google Fonts family to measure from when the face is not
 * installed on this machine. A candidate with neither a local copy nor a `cdn`
 * entry is reported as unmeasurable and left out of the emitted CSS.
 */
const PAIRS = [
  {
    key: 'serif',
    webFont: 'Merriweather',
    token: '--font-serif',
    // What the reader gets today, so `ship` below can be an argument rather
    // than a preference. The old stack is `'Merriweather', Georgia, serif`.
    reference: ['Georgia', 'serif'],
    // Ordered by how close the match is *and* by which platform reaches each
    // one, which happily agree here. Georgia is the design's own fallback and
    // is on macOS, iOS and Windows. Noto Serif is Android's serif. The two
    // Times-metric faces are last: they are the widest correction, and a
    // machine with Times but no Georgia is rare.
    candidates: [
      { family: 'Georgia', ship: true, why: 'the stack names it; 7.4% narrower than Merriweather' },
      { family: 'Noto Serif', cdn: 'Noto+Serif', ship: true, why: "Android's serif" },
      {
        family: 'Liberation Serif',
        cdn: 'Tinos',
        ship: true,
        why: 'Liberation Serif ≥2.0 is built from Tinos; the generic `serif` is 16% off',
      },
      {
        family: 'Times New Roman',
        cdn: 'Tinos',
        ship: true,
        why: 'Tinos is metric-compatible with it; reached wherever Georgia is absent',
      },
    ],
  },
  {
    key: 'sans',
    webFont: 'Source Sans 3',
    token: '--font-sans',
    // This is the pair that matters: **the article prose is set in
    // `--font-sans`, not in the serif.** The serif is headings. Every large
    // number in this work — the 0.2058 shift, the 459px of drift — is this
    // stack.
    //
    // The `reference` row below says `system-ui` is within 0.08% of Source Sans
    // 3, and that number is *true and misleading*, which is worth more than the
    // measurement itself. Acting on it, these three faces were dropped on the
    // grounds that SF Pro was already a near-perfect stand-in. Then the article
    // was measured: with the webfont blocked, SF Pro renders `/order/qadiriyya`
    // **459px** taller than the design and `/shrine/data-darbar` **956px**
    // taller, while the adjusted Helvetica face lands within 1px and 25px.
    //
    // An average advance over one sentence does not predict where lines break.
    // Two faces can agree to a twelfth of a percent on the mean and still wrap a
    // 16,000px article differently. The page is the test, not the mean — so all
    // four ship, and the reference row stays recorded as the number that nearly
    // talked me out of it.
    //
    // The known cost, stated rather than buried: on `/shrine/data-darbar` the
    // adjusted face puts one badge row 37px from where the webfont puts it
    // (SF Pro happened to put it exactly right), and that route's CLS goes
    // 0.0004 → 0.0048. Against removing 0.2058 on `/saint/data-ganj-bakhsh` and
    // ~950px of drift, it is a trade worth making.
    reference: ['system-ui', '-apple-system', 'sans-serif'],
    candidates: [
      { family: 'Helvetica Neue', ship: true, why: 'macOS and iOS' },
      { family: 'Roboto', cdn: 'Roboto', ship: true, why: "Android's system-ui, 6.7% too wide" },
      { family: 'Arial', cdn: 'Arimo', ship: true, why: 'Windows; Arimo is metric-compatible' },
      { family: 'Liberation Sans', cdn: 'Arimo', ship: true, why: 'Linux' },
      { family: 'Segoe UI', ship: false, why: 'unpublished, so unmeasurable on any machine here' },
    ],
  },
];

/**
 * Latin and the transliteration diacritics this archive uses, and deliberately
 * not U+0600–06FF. `--font-sans` is also the third face in the Urdu stack, so a
 * Latin fallback with no `unicode-range` would offer itself for Arabic script
 * ahead of Noto Naskh Arabic.
 */
const LATIN_RANGE = [
  'U+0000-024F',
  'U+0259',
  'U+02BB-02BC',
  'U+02BF',
  'U+02C6',
  'U+02DA',
  'U+02DC',
  'U+0300-036F',
  'U+1E00-1EFF',
  'U+2000-206F',
  'U+2070-209F',
  'U+20A0-20BF',
  'U+2122',
  'U+2190-21BB',
  'U+2212',
  'U+2215',
  'U+FB00-FB04',
  'U+FEFF',
  'U+FFFD',
].join(', ');

// A fallback face is doing its job if a line lands within a quarter of a percent
// of the em where the webfont would have put it. At the archive's body size
// that is under a twentieth of a pixel per line.
const TOLERANCE = 0.0025;

function parseArgs(argv) {
  const args = {
    base: 'http://localhost:5173',
    css: false,
    check: false,
    write: false,
    json: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--css') args.css = true;
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--write') args.write = true;
    else if (argv[i] === '--json') args.json = argv[++i];
  }
  return args;
}

/**
 * Ask Google Fonts for one family at weight 400 and pull out **the Latin
 * subset's** font file.
 *
 * The subset matters and the obvious code gets it wrong. `css2` answers with
 * one `@font-face` per subset — eight of them for Tinos — and the first is
 * Cyrillic Extended. Taking the first `url()` in the response therefore
 * declares a face with no Latin glyphs: the sample's characters fall back to
 * the platform serif while the *line box* still comes from the declared face,
 * so the row reports two fonts averaged together and looks almost plausible.
 * That is what the first run of this script actually measured, and only the
 * self-check said so.
 */
async function resolveCdnFont(family) {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@400&display=swap`;
  const res = await fetch(url, {
    headers: {
      // Without a modern UA the API answers with TTF; woff2 is smaller and the
      // outlines are identical, so the metrics are too.
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`Google Fonts answered ${res.status} for ${family}`);
  const css = await res.text();
  for (const block of css.split('@font-face').slice(1)) {
    // The Latin subset is the one that carries Basic Latin.
    if (!/unicode-range:[^;]*U\+0000-00FF/.test(block)) continue;
    const match = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (match) return match[1];
  }
  throw new Error(`no Latin subset in the Google Fonts CSS for ${family}`);
}

/* c8 ignore start — this function is serialised into the browser, not run here */
async function measureInPage({ sample, em, pairs, tolerance }) {
  const style = document.createElement('style');
  document.head.appendChild(style);
  const sheet = style.sheet;

  const ctx = document.createElement('canvas').getContext('2d');

  function metricsFor(stack) {
    ctx.font = `400 ${em}px ${stack}`;
    const m = ctx.measureText(sample);
    const probe = document.createElement('div');
    probe.style.cssText =
      `position:absolute;visibility:hidden;left:-9999px;top:0;white-space:nowrap;` +
      `font:400 ${em}px ${stack};line-height:normal`;
    probe.textContent = 'Hxgjq';
    document.body.appendChild(probe);
    const lineBox = probe.getBoundingClientRect().height / em;
    probe.remove();
    const ascent = m.fontBoundingBoxAscent / em;
    const descent = m.fontBoundingBoxDescent / em;
    return {
      avgWidth: m.width / sample.length / em,
      ascent,
      descent,
      lineBox,
      // Clamped: `line-gap-override` rejects a negative percentage, and float
      // noise on a font whose gap is exactly zero produces one.
      lineGap: Math.max(0, lineBox - ascent - descent),
    };
  }

  /**
   * Is this family really installed? An unresolvable name is silently replaced
   * by the next font in the stack, and a silent replacement is how you publish
   * a size-adjust computed against the wrong face. Name it against two very
   * different generics: same measurement both times means the name won.
   */
  function resolves(family) {
    const q = `"${family}"`;
    return (
      Math.abs(metricsFor(`${q}, serif`).avgWidth - metricsFor(`${q}, monospace`).avgWidth) < 1e-9
    );
  }

  const out = { pairs: [], unmeasurable: [] };

  for (const pair of pairs) {
    if (!document.fonts.check(`400 ${em}px "${pair.webFont}"`)) {
      // Never a soft note: skipping the pair here silently halves the snapshot.
      throw new Error(`the webfont ${pair.webFont} is not loaded; refusing to measure against it`);
    }
    const web = metricsFor(`"${pair.webFont}"`);

    // What today's stack actually resolves to, before any face below is
    // inserted. A candidate is only worth shipping if it beats this.
    const reference = (pair.reference ?? []).map((stack) => {
      const m = metricsFor(stack);
      return {
        stack,
        avgWidth: m.avgWidth,
        deltaPct: ((m.avgWidth - web.avgWidth) / web.avgWidth) * 100,
      };
    });

    const matches = [];

    for (const candidate of pair.candidates) {
      let stack;
      let provenance;
      if (resolves(candidate.family)) {
        stack = `"${candidate.family}"`;
        provenance = 'local';
      } else if (candidate.cdnFamily) {
        stack = `"${candidate.cdnFamily}"`;
        provenance = `cdn:${candidate.cdn}`;
      } else {
        out.unmeasurable.push(candidate.family);
        continue;
      }

      const local = metricsFor(stack);
      const sizeAdjust = web.avgWidth / local.avgWidth;
      const override = {
        sizeAdjust,
        ascent: web.ascent / sizeAdjust,
        descent: web.descent / sizeAdjust,
        lineGap: web.lineGap / sizeAdjust,
      };

      // Self-check at publication rounding, not at full precision: the question
      // is whether the stylesheet works, not whether the arithmetic does.
      const pct = (v) => `${(v * 100).toFixed(4)}%`;
      const probeFamily = `__probe_${pair.key}_${candidate.family.replace(/\W/g, '')}`;
      // The probe must be sourced the same way the measurement was. A `cdn`
      // candidate has no local copy by definition, so `local()` would resolve to
      // nothing and the probe would silently measure the default font — which is
      // exactly what this check caught the first time it ran.
      const src =
        provenance === 'local' ? `local("${candidate.family}")` : `url(${candidate.cdnUrl})`;
      sheet.insertRule(
        `@font-face{font-family:"${probeFamily}";src:${src};` +
          `size-adjust:${pct(override.sizeAdjust)};` +
          `ascent-override:${pct(override.ascent)};` +
          `descent-override:${pct(override.descent)};` +
          `line-gap-override:${pct(override.lineGap)}}`,
        sheet.cssRules.length,
      );
      // A `url()`-sourced probe is not available the instant its rule is
      // inserted, and measuring it early reads the default font instead. The
      // `local()` probes resolve synchronously and do not need this; awaiting
      // both is cheaper than remembering which is which.
      await document.fonts.load(`400 ${em}px "${probeFamily}"`);
      const adjusted = metricsFor(`"${probeFamily}"`);
      const drift = {
        avgWidth: adjusted.avgWidth - web.avgWidth,
        ascent: adjusted.ascent - web.ascent,
        descent: adjusted.descent - web.descent,
        lineBox: adjusted.lineBox - web.lineBox,
      };

      matches.push({
        family: candidate.family,
        ship: candidate.ship !== false,
        why: candidate.why ?? '',
        provenance,
        raw: local,
        override,
        adjusted,
        drift,
        ok: Math.max(...Object.values(drift).map(Math.abs)) <= tolerance,
      });
    }

    out.pairs.push({
      key: pair.key,
      webFont: pair.webFont,
      token: pair.token,
      web,
      reference,
      matches,
    });
  }

  return out;
}
/* c8 ignore stop */

const fmt = (v) => `${(v * 100).toFixed(2)}%`;
const pct4 = (v) => `${(v * 100).toFixed(4)}%`;
const fallbackName = (webFont, family) => `${webFont} Fallback ${family}`;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Resolve the CDN stand-ins before the browser opens, so a network failure is
  // a clear error rather than a font that quietly measured as something else.
  const cdnUrls = new Map();
  for (const pair of PAIRS) {
    for (const c of pair.candidates) {
      if (c.cdn && !cdnUrls.has(c.cdn)) cdnUrls.set(c.cdn, await resolveCdnFont(c.cdn));
    }
  }

  const browser = await chromium.launch();
  const chromiumVersion = browser.version();
  const page = await browser.newPage();
  let result;
  try {
    await page.goto(args.base, { waitUntil: 'load', timeout: 60_000 });

    // Declare every CDN stand-in under a private family name and wait for all
    // of them, including the two webfonts — the app's stylesheet is loaded
    // `media="print"` and promoted on load, so `document.fonts.ready` can
    // resolve before either face has been asked for.
    const neverLoaded = await page.evaluate(
      async ({ urls, families }) => {
        const style = document.createElement('style');
        style.textContent = urls
          .map(
            ([name, url]) =>
              `@font-face{font-family:"__cdn_${name}";src:url(${url}) format('woff2')}`,
          )
          .join('\n');
        document.head.appendChild(style);

        const wanted = [...families, ...urls.map(([name]) => `__cdn_${name}`)];
        // Retried, because five concurrent fetches from one CDN is a place where
        // one of them intermittently does not arrive. That is not a small
        // problem here: on the run where Source Sans 3 failed, the script
        // reported one line of prose and wrote a snapshot containing only the
        // serif half. A partial answer that looks like a whole one is the
        // failure mode this repository keeps paying for, so it is now fatal.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await Promise.all(
            wanted.map((f) => document.fonts.load(`400 16px "${f}"`).catch(() => {})),
          );
          await document.fonts.ready;
          if (wanted.every((f) => document.fonts.check(`400 1000px "${f}"`))) break;
          await new Promise((r) => setTimeout(r, 750));
        }
        return wanted.filter((f) => !document.fonts.check(`400 1000px "${f}"`));
      },
      { urls: [...cdnUrls], families: PAIRS.map((pair) => pair.webFont) },
    );
    if (neverLoaded.length) {
      throw new Error(
        `these faces never loaded after three attempts: ${neverLoaded.join(', ')}. ` +
          `Nothing written.`,
      );
    }

    const pairsForPage = PAIRS.map((p) => ({
      ...p,
      candidates: p.candidates.map((c) => ({
        ...c,
        cdnFamily: c.cdn ? `__cdn_${c.cdn}` : undefined,
        cdnUrl: c.cdn ? cdnUrls.get(c.cdn) : undefined,
      })),
    }));
    result = await page.evaluate(measureInPage, {
      sample: SAMPLE,
      em: EM,
      pairs: pairsForPage,
      tolerance: TOLERANCE,
    });
  } finally {
    await browser.close();
  }

  let failed = false;
  for (const pair of result.pairs) {
    console.log(`\n${pair.webFont}  (${pair.token})`);
    console.log(
      `  ${'webfont'.padEnd(17)} avgWidth ${fmt(pair.web.avgWidth)}  ascent ${fmt(pair.web.ascent)}  ` +
        `descent ${fmt(pair.web.descent)}  lineBox ${fmt(pair.web.lineBox)}`,
    );
    for (const r of pair.reference) {
      console.log(
        `  ${`(today: ${r.stack})`.padEnd(30)} avgWidth ${fmt(r.avgWidth)}  ` +
          `${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct.toFixed(2)}% vs the webfont`,
      );
    }
    for (const m of pair.matches) {
      console.log(
        `  ${m.family.padEnd(17)} avgWidth ${fmt(m.raw.avgWidth)}  ascent ${fmt(m.raw.ascent)}  ` +
          `descent ${fmt(m.raw.descent)}  lineBox ${fmt(m.raw.lineBox)}   [${m.provenance}]` +
          `${m.ship ? '' : `   NOT SHIPPED — ${m.why}`}`,
      );
      if (!m.ship) continue;
      console.log(
        `    → size-adjust ${fmt(m.override.sizeAdjust)}  ascent ${fmt(m.override.ascent)}  ` +
          `descent ${fmt(m.override.descent)}  line-gap ${fmt(m.override.lineGap)}`,
      );
      const worst = Math.max(...Object.values(m.drift).map(Math.abs));
      if (!m.ok) failed = true;
      console.log(
        `    ${m.ok ? 'self-check OK' : 'SELF-CHECK FAILED'} — worst drift ${fmt(worst)} of an em ` +
          `(tolerance ${fmt(TOLERANCE)})`,
      );
    }
  }

  if (result.unmeasurable.length) {
    console.log(`\nNot measurable — no local copy and nothing to measure instead:`);
    console.log(`  ${[...new Set(result.unmeasurable)].join(', ')}`);
    console.log(`  Left out of the emitted CSS rather than estimated.`);
  }

  if (args.css) {
    console.log(`\n/* ---- generated by scripts/measure-font-metrics.mjs ---- */`);
    for (const pair of result.pairs) {
      for (const m of pair.matches.filter((x) => x.ship)) {
        console.log(`@font-face {
  font-family: '${fallbackName(pair.webFont, m.family)}';
  src: local('${m.family}');
  size-adjust: ${pct4(m.override.sizeAdjust)};
  ascent-override: ${pct4(m.override.ascent)};
  descent-override: ${pct4(m.override.descent)};
  line-gap-override: ${pct4(m.override.lineGap)};
  unicode-range: ${LATIN_RANGE};
}`);
      }
      const chain = pair.matches
        .filter((m) => m.ship)
        .map((m) => `'${fallbackName(pair.webFont, m.family)}'`)
        .join(', ');
      console.log(`/* ${pair.token}: '${pair.webFont}', ${chain}, … */`);
    }
  }

  if (args.json) {
    writeFileSync(args.json, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`\nwrote ${args.json}`);
  }

  const faces = result.pairs.flatMap((pair) =>
    pair.matches
      .filter((m) => m.ship)
      .map((m) => ({
        fallbackFamily: fallbackName(pair.webFont, m.family),
        webFont: pair.webFont,
        token: pair.token,
        local: m.family,
        provenance: m.provenance,
        sizeAdjust: pct4(m.override.sizeAdjust),
        ascentOverride: pct4(m.override.ascent),
        descentOverride: pct4(m.override.descent),
        lineGapOverride: pct4(m.override.lineGap),
        measured: {
          webFontAvgWidth: pct4(pair.web.avgWidth),
          localAvgWidth: pct4(m.raw.avgWidth),
          webFontLineBox: pct4(pair.web.lineBox),
          localLineBox: pct4(m.raw.lineBox),
        },
      })),
  );

  if (args.write) {
    const snapshot = {
      measured: new Date().toISOString().slice(0, 10),
      instrument: 'scripts/measure-font-metrics.mjs',
      engine: `Chromium ${chromiumVersion}`,
      note:
        'Metric-matched fallback faces for the two Google-hosted webfonts. Every value here ' +
        'was measured in Chromium and self-checked by declaring the face and re-measuring it; ' +
        'see the header of the instrument for what the two provenances mean. ' +
        'src/styles/__tests__/fontFallbackMetrics.test.ts asserts global.css still agrees.',
      unmeasurable: [...new Set(result.unmeasurable)],
      unicodeRange: LATIN_RANGE,
      // What the reader gets with no adjusted face at all. This is the number
      // that decided which candidates ship; keeping it means the next person
      // does not have to re-derive the argument to disagree with it.
      reference: result.pairs.flatMap((p) =>
        p.reference.map((r) => ({
          webFont: p.webFont,
          stack: r.stack,
          deltaPct: +r.deltaPct.toFixed(2),
        })),
      ),
      notShipped: result.pairs.flatMap((p) =>
        p.matches.filter((m) => !m.ship).map((m) => ({ family: m.family, why: m.why })),
      ),
      faces,
    };
    writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`\nwrote ${SNAPSHOT.replace(`${REPO}/`, '')}`);
  }

  if (args.check) {
    let snapshot;
    try {
      snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
    } catch {
      console.error(`\nNo snapshot at data/font-metrics.json. Run with --write first.`);
      process.exit(1);
    }
    const live = new Map(faces.map((f) => [f.fallbackFamily, f]));
    const drifted = [];
    for (const want of snapshot.faces) {
      const got = live.get(want.fallbackFamily);
      if (!got) {
        // Not a failure on its own: a machine without Georgia cannot re-measure
        // the Georgia face, and saying so is more useful than failing.
        console.log(`  ${want.fallbackFamily}: not measurable here, snapshot left alone`);
        continue;
      }
      for (const key of ['sizeAdjust', 'ascentOverride', 'descentOverride', 'lineGapOverride']) {
        if (got[key] !== want[key])
          drifted.push(`${want.fallbackFamily} ${key}: ${want[key]} → ${got[key]}`);
      }
    }
    if (drifted.length) {
      console.error(`\nThe snapshot disagrees with what this machine measures:`);
      for (const d of drifted) console.error(`  ${d}`);
      console.error(
        `\nA webfont was re-cut, or a local face differs from the one measured on ${snapshot.measured}.\n` +
          `Decide which is right before running --write: the committed numbers are what the\n` +
          `stylesheet ships, and overwriting them silently is how a fallback stops matching.`,
      );
      process.exit(1);
    }
    console.log(
      `\nEvery measurable face matches data/font-metrics.json (measured ${snapshot.measured}).`,
    );
  }

  if (failed) {
    console.error(
      `\nAt least one fallback face did not imitate its webfont within ${fmt(TOLERANCE)} of an em.\n` +
        `Do not write these numbers into a stylesheet. An override that misses is worse than\n` +
        `no override, because it moves text that was previously in the right place.`,
    );
    process.exit(1);
  }
  console.log(`\nEvery fallback face self-checked within ${fmt(TOLERANCE)} of an em.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
