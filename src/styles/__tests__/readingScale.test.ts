// @vitest-environment node
/**
 * The reading size scales the archive's prose and nothing else.
 *
 * `lib/textSizePreference.ts` lets a reader set the size of the text in
 * entries — 169 of them, several thousands of words long, and Nastaliq set at
 * 1.9 leading because it is dense. The obvious implementation is a scale on
 * `:root`, and it is the wrong one: every type token is in `rem`, so that
 * scales the tab bar, the map controls and the filter chips too, all of which
 * are laid out at 390px under an overflow guard, and none of which the reader
 * asked to resize. Browser zoom already does that job.
 *
 * So the scope is the invariant, and it is asserted here because the failure is
 * silent in the direction that matters: widening the selector makes the
 * preference *appear* to work better while quietly putting the phone chrome
 * under a scale nobody measured.
 *
 * The second assertion is subtler and was a real bug for one commit. `body` sets
 * `font-size: var(--text-base)`, resolved against `:root`, and prose carries no
 * font-size of its own — it inherits body's computed pixels. Redefining the
 * tokens on a descendant changes nothing at all unless that descendant also
 * takes a `font-size` for the subtree to inherit. Measured before the fix: 16px
 * at every setting.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GLOBAL_CSS = readFileSync(join(__dirname, '..', 'global.css'), 'utf8');

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

  it('is declared at all', () => {
    expect(rules.length).toBeGreaterThanOrEqual(2);
  });

  it('never applies to the whole document', () => {
    /* `:root[data-text-size]`, `html[data-text-size]` or a bare
       `[data-text-size]` would put the phone chrome under the scale. The
       attribute lives on documentElement, so the selector has to reach *down*
       from it to a reading surface. */
    for (const { selector } of rules) {
      expect(
        /\[data-text-size[^\]]*\]\s*(\{|$)/.test(selector),
        `"${selector}" applies the reading scale to the element carrying the attribute, ` +
          'which is documentElement — that scales the tab bar and the map controls too.',
      ).toBe(false);
      expect(selector).toMatch(/\[data-text-size[^\]]*\]\s+\S/);
    }
  });

  it('only ever names reading surfaces', () => {
    const ALLOWED = ['.shrine-page', '.entity-page'];
    for (const { selector } of rules) {
      const named = selector.slice(selector.indexOf(']') + 1);
      const classes = named.match(/\.[a-z-]+/g) ?? [];
      expect(classes.length, `"${selector}" names no surface`).toBeGreaterThan(0);
      for (const cls of classes) {
        expect(ALLOWED, `"${selector}" scales ${cls}, which is not a reading surface`).toContain(
          cls,
        );
      }
    }
  });

  it('sets only the scale, not sizes directly', () => {
    /* A rule that hardcodes `--text-base: 18px` under one setting is a second
       place the type scale is defined, and it drifts from tokens.css the first
       time a step changes. */
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

  it('gives the reading surface a font-size, or the tokens reach nothing', () => {
    /* The bug this pins: without it, prose inherits body's computed 16px and
       every setting renders identically. */
    const surface = GLOBAL_CSS.match(/:is\(\.shrine-page,\s*\.entity-page\)\s*\{([^}]*)\}/);
    expect(surface, 'the reading-surface token block is gone').toBeTruthy();
    expect(surface![1]).toMatch(/font-size:\s*var\(--text-base\)/);
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
  });
});
