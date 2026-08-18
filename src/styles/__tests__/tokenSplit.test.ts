// @vitest-environment node
/**
 * Design invariants for the token system (RULE 4 — encode invariants).
 *
 * Two classes of regression these catch:
 *
 * 1. **Chrome wearing a tradition's color.** `--color-primary` and
 *    `--color-cat-muslim` were byte-identical (#1a5c4e) until 18 Aug 2026, so
 *    every link, button and focus ring on a Hindu temple or Sikh gurdwara page
 *    was painted in the Muslim-shrine category color. That is a correctness
 *    problem for an archive whose stated commitment is representing the
 *    traditions accurately, not a matter of taste — so it gets a failing test,
 *    not a comment.
 *
 * 2. **Palette edits that quietly break contrast.** Aesthetic passes are
 *    otherwise unfalsifiable; every serious error in this project's history was
 *    a plausible assumption nobody cheaply checked.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Comments are stripped before parsing: a `--token: value;` written *inside*
   a comment (this file's own rationale prose does exactly that) would
   otherwise be scraped as a declaration, and its unterminated value would
   swallow the real declarations after it. */
const TOKENS = readFileSync(join(__dirname, '../tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Custom properties declared inside a given selector block. */
function readBlock(selector: string): Map<string, string> {
  const start = TOKENS.indexOf(selector);
  if (start === -1) throw new Error(`selector not found in tokens.css: ${selector}`);
  const open = TOKENS.indexOf('{', start);
  const close = TOKENS.indexOf('\n}', open);
  const body = TOKENS.slice(open + 1, close);
  const out = new Map<string, string>();
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(name, value.trim());
  }
  return out;
}

const LIGHT = readBlock(':root {');
const DARK = readBlock("[data-theme='dark']");

/** Resolve `var(--x)` chains down to a literal hex, within one theme block
 *  (falling back to light, which is how the cascade actually resolves). */
function resolve(name: string, block: Map<string, string>, depth = 0): string {
  if (depth > 10) throw new Error(`var() cycle resolving ${name}`);
  const raw = block.get(name) ?? LIGHT.get(name);
  if (raw === undefined) throw new Error(`token not declared: ${name}`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  if (ref) return resolve(ref[1], block, depth + 1);
  return raw.toLowerCase();
}

const CATEGORY_TOKENS = [
  '--color-cat-muslim',
  '--color-cat-hindu',
  '--color-cat-sikh',
  '--color-cat-nanakpanthi',
  '--color-cat-jain',
  '--color-cat-secular',
];

const CHROME_TOKENS = ['--color-primary', '--color-primary-dark', '--color-primary-light'];

describe.each([
  ['light', LIGHT],
  ['dark', DARK],
])('chrome belongs to no tradition (%s)', (_theme, block) => {
  it.each(CHROME_TOKENS)('%s does not equal any category color', (chrome) => {
    const chromeValue = resolve(chrome, block);
    for (const cat of CATEGORY_TOKENS) {
      expect(
        resolve(cat, block),
        `${chrome} must not share a value with ${cat} — chrome is site-wide and ` +
          `category colors belong to one tradition each`,
      ).not.toBe(chromeValue);
    }
  });

  it('--color-primary is the kashi cobalt, not a category alias', (_ctx) => {
    expect(block.get('--color-primary') ?? LIGHT.get('--color-primary')).toBe(
      'var(--color-kashi-cobalt)',
    );
  });

  it('rubric is a distinct token from error — different semantics', () => {
    expect(resolve('--color-rubric', block)).not.toBe(resolve('--color-error', block));
  });
});

// ── Contrast ────────────────────────────────────────────────────────────────

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe.each([
  ['light', LIGHT],
  ['dark', DARK],
])('palette meets WCAG AA (%s)', (_theme, block) => {
  const on = (fg: string, bg: string) => contrast(resolve(fg, block), resolve(bg, block));

  it.each([
    ['--color-text', '--color-bg'],
    ['--color-text', '--color-bg-surface'],
    ['--color-text-secondary', '--color-bg'],
    ['--color-text-muted', '--color-bg'],
    ['--color-primary', '--color-bg'],
    ['--color-primary', '--color-bg-surface'],
    ['--color-secondary', '--color-bg'],
    ['--color-rubric', '--color-bg'],
    ['--color-accent-text', '--color-accent-pale'],
  ])('%s on %s clears 4.5:1', (fg, bg) => {
    expect(on(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CATEGORY_TOKENS)('%s stays legible on the page ground (3:1, non-text)', (cat) => {
    expect(on(cat, '--color-bg')).toBeGreaterThanOrEqual(3);
  });
});

describe('dark mode is lamp-light, not teal-dark', () => {
  it('the dark ground is warm (red channel above blue)', () => {
    const bg = resolve('--color-bg', DARK).replace('#', '');
    const [r, , b] = [0, 2, 4].map((i) => parseInt(bg.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b);
  });
});
