// @vitest-environment node
/**
 * A CSS chevron drawn with logical borders turns −45° in RTL, never −135°.
 *
 * The archive draws its disclosure chevrons as a small box with a top border
 * and a `border-inline-end`, rotated 45°: the corner points to the trailing
 * edge. In an RTL page `border-inline-end` is already the LEFT edge, so the
 * corner points up-left and a −45° turn points it left. Until 9 October 2026
 * three stylesheets turned it −135°, which points the same corner straight
 * down: every Urdu inset row, almanac entry and season card read as a
 * disclosure "expand" glyph. The mistake was copied from one rule into the
 * other two, which is why this is a test rather than a comment.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');
const sheets = readdirSync(STYLES).filter((f) => f.endsWith('.css'));

/** Every `selector { body }` pair, comments stripped. Flat rules only — the
 *  chevrons are not nested in media queries. */
function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

describe('RTL chevrons', () => {
  const chevrons: { sheet: string; selector: string; rtl: string | undefined }[] = [];
  for (const sheet of sheets) {
    const all = rules(readFileSync(join(STYLES, sheet), 'utf8'));
    for (const { selector, body } of all) {
      if (selector.includes('[dir=')) continue;
      if (!/border-inline-end\s*:/.test(body) || !/rotate\(45deg\)/.test(body)) continue;
      const rtl = all.find((r) => r.selector === `[dir='rtl'] ${selector}`);
      chevrons.push({ sheet, selector, rtl: rtl?.body });
    }
  }

  it('finds the chevrons it is meant to hold', () => {
    expect(chevrons.length).toBeGreaterThanOrEqual(3);
  });

  it('turns every logical-border chevron −45° in RTL', () => {
    const wrong = chevrons
      .filter(({ rtl }) => rtl !== undefined && !/rotate\(-45deg\)/.test(rtl))
      .map(({ sheet, selector }) => `${sheet}: ${selector}`);
    expect(wrong).toEqual([]);
  });
});
