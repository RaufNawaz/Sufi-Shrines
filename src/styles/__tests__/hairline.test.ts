// @vitest-environment node
/**
 * Separators are hairlines; outlines are not.
 *
 * A 1px CSS border is two device pixels on a retina screen and three on a phone.
 * For a card outline that is fine — it is meant to be seen. For a row divider it
 * is not: the mark drawn to be the lightest thing on the page arrives as the
 * heaviest thing in a list of eight, and that difference is most of why a web
 * list reads as heavier than a native one. `--hairline` halves at 2dppx so a
 * separator lands at roughly one device pixel.
 *
 * The pairing is the invariant, in both directions, because either half alone is
 * a bug that looks like a style choice:
 *
 *  - a separator (`--color-border-light`) at a hardcoded `1px` is the heavy
 *    divider this exists to fix, and there were 44 of them;
 *  - an outline (`--color-border`) at `var(--hairline)` is worse — a
 *    half-pixel outline renders as a grey shimmer on some displays and
 *    disappears on others, which reads as a rendering artefact rather than an
 *    edge.
 *
 * Neither shows up in a screenshot review at 1x, which is the resolution a CI
 * machine and most desktop monitors run at. Hence a test rather than an eye.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');
const sheets = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ name: f, css: readFileSync(join(STYLES, f), 'utf8') }));

const tokens = sheets.find((s) => s.name === 'tokens.css')!.css;

/** Strip comments — they discuss both tokens by name and would match every
 * pattern below. The tracking test learned this the hard way. */
const code = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the hairline token', () => {
  it('is declared, and is a full pixel by default', () => {
    expect(/--hairline:\s*1px/.test(code(tokens))).toBe(true);
  });

  it('halves on a display with more than one device pixel per CSS pixel', () => {
    const retina = /@media\s*\(min-resolution:\s*2dppx\)\s*\{[^}]*\{[^}]*--hairline:\s*0\.5px/;
    expect(retina.test(code(tokens))).toBe(true);
  });

  it('halves outside :root’s own block, so the dark theme inherits it', () => {
    /* The width is a property of the screen, not of the palette. Declared inside
       the light-mode block it would be overridden by the dark theme's own token
       block on any dark-mode retina device — which is to say, on a phone at
       night, which is when most of this archive is read. */
    const c = code(tokens);
    const retinaAt = c.indexOf('@media (min-resolution: 2dppx)');
    const darkAt = c.indexOf("[data-theme='dark']");
    expect(retinaAt, 'no retina override at all').toBeGreaterThan(-1);
    expect(darkAt, 'no dark theme block at all').toBeGreaterThan(-1);
    expect(retinaAt, 'the retina override must come before the dark block').toBeLessThan(darkAt);
  });
});

describe('separators and outlines do not swap treatments', () => {
  it('leaves no separator at a hardcoded 1px', () => {
    const offenders: string[] = [];
    for (const { name, css } of sheets) {
      for (const line of code(css).split('\n')) {
        if (/1px\s+(solid|dashed)\s+var\(--color-border-light\)/.test(line)) {
          offenders.push(`${name}: ${line.trim()}`);
        }
      }
    }
    expect(
      offenders,
      'A separator drawn at 1px is 2–3 device pixels on the screens this site is ' +
        'read on. Use var(--hairline).',
    ).toEqual([]);
  });

  it('never draws a structural outline as a hairline', () => {
    const offenders: string[] = [];
    for (const { name, css } of sheets) {
      for (const line of code(css).split('\n')) {
        if (/var\(--hairline\)\s+(solid|dashed)\s+var\(--color-border\)/.test(line)) {
          offenders.push(`${name}: ${line.trim()}`);
        }
      }
    }
    expect(
      offenders,
      'A half-pixel outline shimmers on some displays and vanishes on others. ' +
        'Structural borders (--color-border) stay at 1px; --hairline is for separators.',
    ).toEqual([]);
  });

  it('rules a heading off with a hairline, never a structural border', () => {
    /*
     * **The direction this file was missing.** The two cases above pair the
     * token with the colour — "if you use `--color-border-light`, use
     * `--hairline`" and its converse — and neither of them can see a separator
     * drawn in the *structural* colour at a literal width. So a heading ruled
     * `2px solid var(--color-border)` passed every time.
     *
     * Measured across twelve routes on 30 August 2026: thirteen distinct `<h2>`
     * treatments and three different rules under them.
     * `.kg-section-heading` drew 2px — four device pixels on a retina screen —
     * against `.article-section-heading`'s one, on pages a reader moves between
     * in two clicks. `.about-section-heading` and `.coverage-section-heading`
     * were byte-identical blocks 236 lines apart and both render on `/about`.
     *
     * Scoped to headings deliberately. A control's own edge is a real 1px
     * border and there are 77 of those; a rule *under a heading* is a
     * separator, and separators are what `--hairline` exists for.
     */
    const offenders: string[] = [];
    for (const { name, css } of sheets) {
      /* Rule blocks whose selector list mentions a heading, and the border
         declarations inside them. */
      for (const match of code(css).matchAll(/([^{}]*heading[^{}]*)\{([^}]*)\}/gi)) {
        const [, selector, body] = match;
        for (const decl of body.split(';')) {
          if (!/border-(?:bottom|block-end)\s*:/.test(decl)) continue;
          if (/var\(--hairline\)/.test(decl)) continue;
          if (/\bnone\b/.test(decl)) continue;
          offenders.push(`${name}: ${selector.trim().split('\n').pop()} { ${decl.trim()} }`);
        }
      }
    }
    expect(
      offenders,
      'A rule under a heading is a separator, so it takes var(--hairline) and ' +
        '--color-border-light. Drawn at a literal width it is 2–4 device pixels, and ' +
        'the archive then has three different rules for one kind of object.',
    ).toEqual([]);
  });

  it('actually uses the hairline somewhere (or the pairing proves nothing)', () => {
    const uses = sheets.reduce(
      (n, { css }) => n + (code(css).match(/var\(--hairline\)/g)?.length ?? 0),
      0,
    );
    expect(uses).toBeGreaterThan(20);
  });
});
