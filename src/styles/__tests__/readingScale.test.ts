// @vitest-environment node
/**
 * The reading size, and what it is now allowed to reach.
 *
 * **This file used to assert the opposite of what it asserts now, and the
 * reversal is the point of the comment.** Until 28 August 2026 the invariant
 * was that the scale must *never* apply to the whole document: every type token
 * is in `rem`, so a scale on `:root` moves the tab bar, the map controls and the
 * filter chips too, all laid out at 390px under an overflow guard. The
 * conclusion drawn from that — that the reader only wants their *prose* resized
 * — was a guess about people, not a measurement, and a reader asked for exactly
 * the opposite: the sidebar is where this archive is read before an entry is
 * opened, and larger type is wanted there first.
 *
 * So the guard changes shape rather than being deleted. What was protecting a
 * decision now protects the mechanism:
 *
 * - the steps in CSS and the steps in TypeScript are the same set, so a sixth
 *   one cannot be added to `TEXT_SIZES` and silently render at `medium`;
 * - each rule still sets `--reading-scale` and nothing else, so the type scale
 *   stays defined in exactly one place;
 * - gaps grow more slowly than type, which is the thing that actually overflows
 *   a phone and the reason the old scoping existed at all;
 * - the Urdu face scale still composes with the reader's step instead of being
 *   replaced by it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEXT_SIZES, DEFAULT_TEXT_SIZE } from '../../lib/textSizePreference';

const GLOBAL_CSS = readFileSync(join(__dirname, '..', 'global.css'), 'utf8');
const TOKENS_CSS = readFileSync(join(__dirname, '..', 'tokens.css'), 'utf8');

/** Every rule whose selector mentions the preference attribute. */
function readingSizeRules(): { selector: string; body: string }[] {
  const rules: { selector: string; body: string }[] = [];
  const re = /([^{}]*\[data-text-size[^{}]*)\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(GLOBAL_CSS))) {
    rules.push({ selector: match[1].trim(), body: match[2] });
  }
  return rules;
}

describe('the reading scale', () => {
  const rules = readingSizeRules();

  it('has a rule for every step except the default, and none for the default', () => {
    /* The tie that keeps the two halves honest. `applyTextSize` writes no
       attribute for the default, so a rule for it would be dead CSS; every
       other step needs one or it renders at 1 and the reader's choice does
       nothing. Adding a sixth step to TEXT_SIZES fails here until the CSS
       catches up. */
    const styled = new Set(
      rules.map((r) => r.selector.match(/\[data-text-size='([a-z]+)'\]/)?.[1]).filter(Boolean),
    );
    const expected = TEXT_SIZES.filter((s) => s !== DEFAULT_TEXT_SIZE);
    expect([...styled].sort()).toEqual([...expected].sort());
  });

  it('applies to the whole document, which is what the reader asked for', () => {
    /* The attribute lives on documentElement. A selector that reaches *down*
       from it to `.shrine-page` is the old scoping, and it leaves the sidebar —
       the surface the request was about — at 16px forever. */
    for (const { selector } of rules) {
      expect(
        /\[data-text-size='[a-z]+'\]\s*$/.test(selector),
        `"${selector}" reaches down to a subtree; the step belongs on the element ` +
          'carrying the attribute so the whole document inherits it.',
      ).toBe(true);
    }
  });

  it('sets only the scale, not sizes directly', () => {
    for (const { selector, body } of rules) {
      const declarations = body
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => d.split(':')[0].trim());
      expect(declarations, `"${selector}" should set --reading-scale and nothing else`).toEqual([
        '--reading-scale',
      ]);
    }
  });

  it('multiplies the type tokens where they are declared, on :root', () => {
    /* A `var()` is substituted where the property is declared, not where it is
       read — so the multiplication has to live beside the token, and the token
       has to live on `:root` for the document to inherit it. */
    for (const token of ['--text-xs', '--text-base', '--text-4xl']) {
      const re = new RegExp(`${token}:\\s*calc\\([^;]*var\\(--reading-scale\\)`);
      expect(TOKENS_CSS, `${token} does not multiply by the reader's step`).toMatch(re);
    }
  });

  it('grows the gaps more slowly than the type', () => {
    /* Type and padding growing at the same rate is two preferences wearing one
       control, and the padding is the half that overflows a 390px phone — which
       is precisely what the old scoping was avoiding. Derived from the step
       rather than written out per size, so there is one number to change. */
    const derived = TOKENS_CSS.match(/--spacing-scale:\s*([^;]+);/);
    expect(derived, '--spacing-scale is gone; spacing no longer follows the reader').toBeTruthy();
    expect(derived![1]).toContain('var(--reading-scale)');
    const factor = Number(derived![1].match(/\*\s*([0-9.]+)\s*\)/)?.[1]);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);

    for (const token of ['--space-1', '--space-4', '--space-16']) {
      const re = new RegExp(`${token}:\\s*calc\\([^;]*var\\(--spacing-scale\\)`);
      expect(TOKENS_CSS, `${token} does not follow the reader's step`).toMatch(re);
    }
  });

  it('composes with the Urdu scale rather than replacing it', () => {
    /* An Urdu reader who asks for large type wants large Nastaliq, not Latin
       metrics at a larger size. The RTL half must keep --font-scale-urdu. */
    const rtl = GLOBAL_CSS.match(
      /\[dir='rtl'\]\s*:is\(\.shrine-page,\s*\.entity-page\)\s*\{([^}]*)\}/,
    );
    expect(rtl, 'the RTL reading-surface block is gone').toBeTruthy();
    const tokens = rtl![1].match(/--text-[a-z0-9]+:[^;]+;/g) ?? [];
    expect(tokens.length).toBeGreaterThanOrEqual(8);
    for (const token of tokens) {
      expect(token).toContain('--font-scale-urdu');
      expect(token).toContain('var(--reading-scale)');
    }
    /* And the subtree still takes a font-size of its own, or the redefined
       tokens reach nothing: prose carries no font-size and inherits body's
       computed pixels. Measured before that fix: 16px at every setting. */
    expect(rtl![1]).toMatch(/font-size:\s*var\(--text-base\)/);
  });
});
