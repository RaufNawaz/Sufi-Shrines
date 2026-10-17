// @vitest-environment node
/**
 * A hover style applies only where a pointer can hover.
 *
 * On a touch screen `:hover` sticks after a tap: the calendar's next-month
 * chevron, a filter chip, a list row stayed highlighted until the reader tapped
 * somewhere else, which reads as a control that is still on (motion council,
 * 17 October 2026). 64 rules were moved inside `@media (hover: hover)` that
 * night; this keeps a new one from landing outside it.
 *
 * Only rules whose selectors are *all* `:hover` are held to it. A list that
 * pairs `:hover` with `:focus-visible` carries keyboard focus too, and
 * wrapping it would take the focus style away from a keyboard on a touch
 * device; rules that change the cursor or an underline are left alone as link
 * affordances rather than fills.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');

/** Top-level rules (outside any at-rule), comments removed. */
function topLevelRules(css: string): { selector: string; body: string }[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: { selector: string; body: string }[] = [];
  let pos = 0;
  while (pos < text.length) {
    const open = text.indexOf('{', pos);
    if (open < 0) break;
    const head = text.slice(pos, open).trim();
    if (head.startsWith('@')) {
      // Skip the whole at-rule block.
      let depth = 0;
      let k = open;
      for (; k < text.length; k++) {
        if (text[k] === '{') depth++;
        else if (text[k] === '}' && --depth === 0) break;
      }
      pos = k + 1;
      continue;
    }
    const close = text.indexOf('}', open);
    rules.push({ selector: head, body: text.slice(open + 1, close) });
    pos = close + 1;
  }
  return rules;
}

describe('hover styles', () => {
  it('apply only where a pointer hovers', () => {
    const offenders: string[] = [];
    for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
      for (const { selector, body } of topLevelRules(readFileSync(join(STYLES, file), 'utf8'))) {
        const selectors = selector
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (selectors.length === 0 || !selectors.every((s) => s.includes(':hover'))) continue;
        if (/cursor|text-decoration(?!-color)/.test(body)) continue;
        offenders.push(`${file}: ${selector.replace(/\s+/g, ' ')}`);
      }
    }
    expect(offenders, 'a :hover-only rule outside @media (hover: hover)').toEqual([]);
  });
});
