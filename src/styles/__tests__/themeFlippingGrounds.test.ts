// @vitest-environment node
/**
 * A literal white foreground on a ground that changes with the theme (RULE 4).
 *
 * `--color-primary` is `#2a4d9b` in light and `#8aa8e8` in dark — a dark cobalt
 * and a light one, because a chip has to stand off a cream page and off a brown
 * one. Twelve rules set `background: var(--color-primary)` and `color: white`.
 * In light that is 7.97:1. In dark it is **2.37:1**, on the language toggle,
 * the map's filter chips, the explorer's order chips, the scroll-to-top button,
 * the 404's action and the tour's next button — which is to say on every route
 * in the archive, for as long as dark mode has existed.
 *
 * Nothing caught it because `e2e/a11y.spec.ts` had only ever run in light mode.
 * That is now fixed too, and an axe run costs five minutes; this costs
 * milliseconds and names the cause rather than the symptom.
 *
 * **The rule is about intent, so it can be checked statically.** A literal
 * `white` is a claim that the ground is dark. A token that flips is a statement
 * that the ground is *not always* dark. The two cannot both be true, whatever
 * the current hexes are — which is why this checks the pairing rather than
 * recomputing contrast.
 *
 * `--color-accent` is in the list for a different reason: it does not flip
 * light-to-dark, it is a light gold in *both* (#c8890a / #e8a82a), so white on
 * it fails in both — 2.98:1 and 2.09:1. Its foreground is `--color-on-accent`,
 * which is deliberately declared once and never overridden.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');
const sheets = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({
    name: f,
    // Comments first: this file's prose names every token and colour below.
    css: readFileSync(join(STYLES, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
  }));

const tokens = sheets.find((s) => s.name === 'tokens.css')!.css;

const DARK_AT = tokens.indexOf("[data-theme='dark']");

/**
 * What a token actually resolves to in one theme.
 *
 * Two things a naive lookup gets wrong, and both were got wrong first.
 *
 * **Indirection.** `--color-primary: var(--color-kashi-cobalt)` is the
 * declaration in *both* blocks — what differs is the cobalt underneath it. A
 * comparison of the declarations finds them identical and concludes the token
 * does not flip, which is the opposite of the truth.
 *
 * **Inheritance.** A token the dark block does not redeclare keeps its `:root`
 * value; absent is not undefined.
 */
function resolve(name: string, theme: 'light' | 'dark'): string | undefined {
  const scope = theme === 'dark' ? tokens.slice(DARK_AT) : tokens.slice(0, DARK_AT);
  let value: string | undefined;
  for (let hop = 0; hop < 5; hop++) {
    const here = new RegExp(`${name}:\\s*([^;]+);`).exec(scope);
    const root = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens.slice(0, DARK_AT));
    // The dark block redeclares it, or it inherits :root's value.
    const declared = (here ?? root)?.[1]?.trim();
    if (!declared) return value;
    value = declared;
    const indirect = /^var\((--[a-z0-9-]+)\)$/.exec(declared);
    if (!indirect) return value;
    name = indirect[1]!;
  }
  return value;
}

function themeValues(name: string): { light?: string; dark?: string } {
  const light = resolve(name, 'light');
  const dark = resolve(name, 'dark');
  return {
    ...(light !== undefined ? { light } : {}),
    ...(dark !== undefined ? { dark } : {}),
  };
}

const LITERAL_WHITE = /color:\s*(white|#fff|#ffffff)\s*;/;

describe('a ground that changes with the theme never carries literal white', () => {
  it('found the token table and the dark block', () => {
    expect(tokens.length).toBeGreaterThan(1000);
    expect(tokens).toContain("[data-theme='dark']");
    /* If this stops being true the check below is measuring nothing. */
    expect(themeValues('--color-primary').light).not.toBe(themeValues('--color-primary').dark);
  });

  it('has a foreground for the accent ground, declared once for both themes', () => {
    const onAccent = themeValues('--color-on-accent');
    expect(onAccent.light, '--color-on-accent is not declared').toBeTruthy();
    /* Overriding it in the dark block would reintroduce the bug it fixes: the
       accent is a light gold in both themes, so its foreground must not flip. */
    expect(onAccent.dark).toBe(onAccent.light);
  });

  it('no rule pairs a literal white with a flipping background token', () => {
    const offenders: string[] = [];
    for (const { name, css } of sheets) {
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = rule[1]!.trim().split('\n').pop()!.trim();
        const body = rule[2]!;
        if (selector.startsWith('@')) continue;
        if (!LITERAL_WHITE.test(body)) continue;
        const background = /background(?:-color)?:\s*var\((--[a-z0-9-]+)\)/.exec(body);
        if (!background) continue; // a gradient or a fixed rgba() overlay: fine
        const token = background[1]!;
        const values = themeValues(token);
        /* Flags a token whose value differs between themes *and* one that is
           light in both — the accent case. `--color-on-accent` names the
           second kind explicitly so the check does not have to parse colour. */
        const flips =
          values.light !== undefined && values.dark !== undefined && values.light !== values.dark;
        const lightInBoth = token === '--color-accent';
        if (flips || lightInBoth) {
          offenders.push(`${name}: ${selector} — white on ${token}`);
        }
      }
    }
    expect(
      offenders,
      'A literal `white` claims the ground is dark. These grounds are not always dark, ' +
        'so the claim is false in at least one theme. Use `var(--color-text-inverse)` for a ' +
        'ground that flips, or `var(--color-on-accent)` for one that is light in both.',
    ).toEqual([]);
  });

  it('gives every anchor a colour, so none falls back to the user agent’s blue', () => {
    /* `#0000ee` on the dark ground is 1.96:1. Sixteen anchors had no rule at
       all — the almanac's cards, /about's contact and licence lines, the
       nearby-mosque list — and looked fine in light mode, where the same blue
       is about 8:1. */
    const global = sheets.find((s) => s.name === 'global.css')!.css;
    expect(/(^|\n)a\s*\{[^}]*color:\s*var\(--color-[a-z-]+\)/.test(global)).toBe(true);
  });
});
