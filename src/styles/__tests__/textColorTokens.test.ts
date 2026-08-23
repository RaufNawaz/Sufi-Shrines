// @vitest-environment node
/**
 * Hairline tokens are not text colours (RULE 4 — encode invariants).
 *
 * `--color-border` (#d6cfc0 in light) exists to draw a 1px rule against the
 * page ground. A 1px rule wants to be *barely* there; text never does. The 404
 * page's status code was painted with it, which put 36px bold type at 1.43:1 —
 * seven times short of the 3:1 that WCAG asks of large text. The axe sweep
 * caught it only after the sweep itself was fixed to wait for fade-ins to
 * settle (see `e2e/a11y.spec.ts`), and an axe run costs five minutes; this
 * costs milliseconds and names the cause rather than the symptom.
 *
 * The rule is about *token intent*, which is why it can be checked statically:
 * no amount of palette tuning makes a border colour a sensible text colour, so
 * a violation is a mistake regardless of what the hex currently is.
 *
 * Icons are exempt. A decorative glyph beside a heading — the empty-state
 * illustration in the sidebar — carries no information of its own, and WCAG's
 * contrast minimum applies to text and to meaningful graphics, not to
 * ornament. Exemptions are listed by selector so that adding one is a visible
 * decision.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLE_DIR = join(__dirname, '..');

const SHEETS = readdirSync(STYLE_DIR)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({
    file: f,
    // Strip comments so this file's own prose, quoted into a stylesheet, or a
    // commented-out declaration, is never scraped as a live rule.
    css: readFileSync(join(STYLE_DIR, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
  }));

/** Tokens whose whole purpose is to be nearly invisible. */
const HAIRLINE_TOKENS = ['--color-border', '--color-border-light', '--color-border-dark'];

/**
 * Selectors allowed to use a hairline token as `color`, because what they
 * colour is a decorative glyph rather than text or a meaningful graphic.
 */
const DECORATIVE_GLYPHS = new Set(['.shrine-list-empty-icon']);

describe('hairline tokens are never text colours', () => {
  it('no rule sets `color` to a border token outside the named decorative glyphs', () => {
    const offenders: string[] = [];

    for (const { file, css } of SHEETS) {
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = rule[1]!.trim();
        const body = rule[2]!;
        if (selector.startsWith('@')) continue;

        // `color:` only — `border-color`, `background-color`, `caret-color`,
        // `-webkit-text-fill-color` and friends are all legitimate uses, so
        // require the property to start at a boundary that is not a hyphen.
        const decl = /(?:^|[;\s])color\s*:\s*([^;]+)/.exec(body);
        if (!decl) continue;
        const value = decl[1]!;
        const token = HAIRLINE_TOKENS.find((t) => new RegExp(`var\\(\\s*${t}\\b`).test(value));
        if (!token) continue;

        const parts = selector
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        // Exempt only when *every* selector in the list is a named glyph:
        // grouping a glyph with real text must not launder the text.
        if (parts.every((s) => DECORATIVE_GLYPHS.has(s))) continue;

        offenders.push(`${file}: "${selector}" sets color: var(${token})`);
      }
    }

    expect(
      offenders,
      'a border token is a hairline, not a text colour — use --color-text-muted (or add the ' +
        'selector to DECORATIVE_GLYPHS if what it paints is pure ornament)',
    ).toEqual([]);
  });

  it('the decorative-glyph exemptions all still exist in the stylesheets', () => {
    // A stale exemption is worse than none: it silently re-permits the bug
    // under a selector nobody is looking at any more.
    const all = SHEETS.map((s) => s.css).join('\n');
    for (const selector of DECORATIVE_GLYPHS) {
      expect(all, `${selector} is exempted but no longer appears in any stylesheet`).toContain(
        selector,
      );
    }
  });
});
