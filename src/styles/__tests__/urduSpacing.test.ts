// @vitest-environment node
/**
 * The Urdu spacing ruling of 11 September 2026, held (RULE 4).
 *
 * Two things were measured that day and both were the opposite of what the
 * stylesheets said about themselves:
 *
 * - `--leading-urdu` was 1.9 and the article prose ran at **1.75**, because
 *   `.article-prose` set `--leading-relaxed` for the Latin face and outranked
 *   the `[dir='rtl']` body rule. The token existed; nothing in the article
 *   read it. The fix is an RTL rule on `.article-prose` in shrine.css, and this
 *   file is what stops that rule from being tidied away as redundant.
 * - `word-spacing` was declared `normal` under a comment explaining why a bump
 *   would be wrong. Rauf's verdict on the result was that the words flow into
 *   one another. The bump is a token now, and the Latin runs inside the Urdu
 *   view reset it.
 *
 * Numbers are asserted as floors rather than exact values: the ruling is "more
 * generous than it was", and a later reader may go further without editing a
 * test — but never back below where the words touched.
 *
 * See docs/URDU_TYPOGRAPHY_2026-09-11.md for the before/after measurements.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');
const read = (f: string) => readFileSync(join(STYLES, f), 'utf8');
const TOKENS = read('tokens.css');
const GLOBAL = read('global.css');
const SHRINE = read('shrine.css');

function token(name: string): number {
  const m = new RegExp(`${name}:\\s*([0-9.]+)`).exec(TOKENS);
  expect(m, `${name} is not declared in tokens.css`).toBeTruthy();
  return Number(m![1]);
}

/** The declarations of every rule whose selector list contains `selector`.
 * Comments are stripped first: a rule's preceding comment would otherwise be
 * captured as part of its selector text. */
function rtlRuleBodies(css: string, selector: string): string[] {
  const bodies: string[] = [];
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css.replace(/\/\*[\s\S]*?\*\//g, '')))) {
    const selectors = m[1].split(',').map((s) => s.trim());
    if (selectors.includes(selector)) bodies.push(m[2]);
  }
  return bodies;
}

describe('Urdu spacing', () => {
  it('Nastaliq prose leading is at least 2', () => {
    expect(token('--leading-urdu')).toBeGreaterThanOrEqual(2);
  });

  it('compact Urdu rows lead at least 1.8, so a descender clears the row beneath', () => {
    expect(token('--leading-urdu-ui')).toBeGreaterThanOrEqual(1.8);
  });

  it('the article prose reads the Urdu leading token in the RTL view', () => {
    /* The bug this guards against is not a wrong value but a missing rule:
       `.article-prose` carries a Latin line-height of its own, and without an
       RTL override the token never reaches the running text. */
    const bodies = rtlRuleBodies(SHRINE, "[dir='rtl'] .article-prose");
    expect(bodies.length, 'no [dir=rtl] .article-prose rule in shrine.css').toBeGreaterThan(0);
    expect(bodies.some((b) => /line-height:\s*var\(--leading-urdu\)/.test(b))).toBe(true);
  });

  it('word-spacing is a positive token, consumed on the RTL root', () => {
    const m = /--word-spacing-urdu:\s*([0-9.]+)em/.exec(TOKENS);
    expect(m, '--word-spacing-urdu is not declared in tokens.css').toBeTruthy();
    expect(Number(m![1])).toBeGreaterThan(0);
    const bodies = rtlRuleBodies(GLOBAL, "[dir='rtl']");
    expect(bodies.some((b) => /word-spacing:\s*var\(--word-spacing-urdu\)/.test(b))).toBe(true);
  });

  it('Latin runs inside the Urdu view keep normal word-spacing', () => {
    /* `[lang='en']` and `[data-latin]` are the declarations the leak guard
       recognises for sanctioned Latin; the bump is for Nastaliq and must not
       reach them. (`.coords` is a semantic marker, not a styled class — see
       classNamesStyled.test.ts — and a coordinate has no spaces anyway.) */
    expect(GLOBAL).toMatch(
      /\[dir='rtl'\]\s*:is\(\[lang='en'\],\s*\[data-latin\]\)\s*\{[^}]*word-spacing:\s*normal/,
    );
  });

  it('no RTL rule tracks Nastaliq', () => {
    /* letter-spacing prises joined glyphs apart. Every stylesheet's RTL rules
       may only ever set it to normal or 0; the tokens collapse to normal on
       the RTL root for the same reason. */
    for (const file of [
      'global.css',
      'shrine.css',
      'components.css',
      'map.css',
      'list.css',
      'kg.css',
      'tabbar.css',
      'settings.css',
      'shared-ground.css',
      'chronology.css',
    ]) {
      const css = read(file);
      const re = /([^{}]*\[dir='rtl'\][^{}]*)\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(css))) {
        const ls = /letter-spacing:\s*([^;]+);/.exec(m[2]);
        if (ls) {
          expect(
            ['normal', '0'].includes(ls[1].trim()),
            `${file}: "${m[1].trim()}" tracks Nastaliq with letter-spacing: ${ls[1].trim()}`,
          ).toBe(true);
        }
      }
    }
  });
});
