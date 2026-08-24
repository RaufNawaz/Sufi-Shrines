// @vitest-environment node
/**
 * Suppressing the browser's tap highlight is half a decision. This checks the
 * other half was made.
 *
 * `-webkit-tap-highlight-color: transparent` removes the grey flash mobile
 * browsers paint on a tapped link or button. It is the right call — the flash
 * looks nothing like the rest of the site — and it takes away the *only* touch
 * feedback those elements had. For a long time exactly four selectors put
 * something back (`.filter-chip`, `.action-btn`, `.icon-btn`, `.hover-lift`), so
 * on a phone every other link, tag, chip, badge and table row answered a tap
 * with nothing at all until the page changed. Nothing failed. There is no
 * console warning for "this control does not acknowledge being pressed", and
 * hover states hide it completely on a desktop, which is where it was looked at.
 *
 * So the invariant is the pairing: whatever loses the native highlight must have
 * an `:active` rule of its own. Static, because the alternative — driving a real
 * press in a browser and sampling the computed style mid-touch — is a much
 * flakier test of a much smaller thing.
 *
 * It also pins the two CSS facts the implementation leans on, because both are
 * the kind that get "simplified" away by someone who does not know them:
 *
 *  - `transform` does not apply to a non-replaced inline element. That is why
 *    the scale rule can safely name `a` — it reaches pills and cards and is a
 *    no-op on inline prose links — and why inline links need the tint instead.
 *  - the tint must not be opacity. axe folds an ancestor's opacity into the
 *    colour it measures (HANDOVER §9.46), and this project has already lost an
 *    hour to a contrast failure that did not exist.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');
const global = readFileSync(join(STYLES, 'global.css'), 'utf8');
const tokens = readFileSync(join(STYLES, 'tokens.css'), 'utf8');

/** The selectors global.css strips the native highlight from.
 *
 * Comments are removed from the whole sheet first, not from each selector after
 * splitting on commas: a selector list is preceded by everything back to the
 * previous `}`, comment included, and a comma inside that comment tears it into
 * fragments that no longer look like comments. The first run of this reported
 * "chip and table row on a phone responded to a tap with" as an unpaired
 * selector. */
function suppressedSelectors(rawCss: string): string[] {
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const found: string[] = [];
  const rule = /([^{}]+)\{[^{}]*-webkit-tap-highlight-color:\s*transparent[^{}]*\}/g;
  for (const match of css.matchAll(rule)) {
    for (const sel of match[1].split(',')) {
      const clean = sel.trim();
      if (clean) found.push(clean);
    }
  }
  return found;
}

describe('the tap highlight is replaced, not just removed', () => {
  const suppressed = suppressedSelectors(global);

  it('suppresses the native highlight somewhere (or this test is checking nothing)', () => {
    expect(suppressed).not.toEqual([]);
  });

  it('gives every suppressed selector an :active rule of its own', () => {
    const missing = suppressed.filter((sel) => {
      // `a` → /\ba:active\b/, `[role='button']` → the literal plus :active.
      const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !new RegExp(`${escaped}\\s*:active`).test(global);
    });
    expect(
      missing,
      'These selectors lose the browser’s tap feedback and provide none of their ' +
        'own, so on a phone they answer a tap with nothing. Add an :active rule in ' +
        'global.css beside the suppression.',
    ).toEqual([]);
  });

  it('acknowledges a press without motion, for readers who asked for less of it', () => {
    /* The scale belongs inside prefers-reduced-motion: no-preference. The tint
       must not — a colour change is not motion, and "I get less animation" is
       not "I get no confirmation that my tap landed". */
    const reducedBlockStart = global.indexOf('@media (prefers-reduced-motion: no-preference)');
    const tintIndex = global.indexOf('background-color: var(--press-tint)');
    expect(tintIndex, 'the press tint is not defined at all').toBeGreaterThan(-1);
    expect(
      tintIndex < reducedBlockStart || reducedBlockStart === -1,
      'the press tint is inside a reduced-motion query, so a reader who asked for less ' +
        'motion gets no press feedback at all',
    ).toBe(true);
  });

  it('tints with a colour rather than opacity', () => {
    const tintValue = /--press-tint:\s*([^;]+);/.exec(tokens)?.[1]?.trim();
    expect(tintValue, '--press-tint is not declared').toBeTruthy();
    expect(tintValue).not.toMatch(/opacity/);
    // Must resolve to a real colour token, so its contrast can be reasoned about.
    expect(tintValue).toMatch(/^var\(--color-|^#|^rgb|^hsl|^color-mix/);
  });

  it('declares the press scale as a token, and keeps it a press rather than a lurch', () => {
    const scale = Number.parseFloat(/--press-scale:\s*([\d.]+)/.exec(tokens)?.[1] ?? '');
    expect(scale, '--press-scale is not declared').toBeGreaterThan(0);
    // Below 0.9 reads as the element flinching; above 0.99 is invisible.
    expect(scale).toBeGreaterThanOrEqual(0.9);
    expect(scale).toBeLessThanOrEqual(0.99);
  });
});
