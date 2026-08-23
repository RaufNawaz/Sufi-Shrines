// @vitest-environment node
/**
 * Every class name a component writes must exist in a stylesheet (RULE 4 —
 * encode invariants, don't rely on intentions).
 *
 * This check exists because the mistake it catches was made twice in one
 * afternoon. `PlacePage` was first written with `entity-kicker` and
 * `entity-lede`; both read perfectly in the JSX, sit in a namespace that does
 * exist (`entity-page`, `entity-title`, `entity-meta` are all real), and are
 * defined in no stylesheet in the repository. The page would have shipped
 * unstyled. An hour later the same thing happened again: the shrine masthead's
 * place pills were written against `.shrine-place-links` / `.shrine-place-tag`
 * before either rule was written, and `npm run typecheck` was clean, because a
 * class name is a string and every string typechecks.
 *
 * Nothing else in the pipeline looks at this. TypeScript cannot: `className`
 * takes any string. Lint cannot: the class is valid CSS-wise. Vitest's
 * component tests cannot: jsdom applies no stylesheet, so an unstyled element
 * renders exactly like a styled one. Playwright *could*, but only if a test
 * asserted a specific computed property on the specific element, which is a
 * test nobody writes for a pill's border radius. So the failure mode is
 * invisible until a human loads the page and thinks "that looks wrong", which
 * is precisely the class of bug CLAUDE.md says to replace with a check that
 * exits non-zero.
 *
 * Scope note: this proves the selector exists, not that it does the right
 * thing. That is the honest limit of a static check, and it is still the
 * difference between "unstyled" and "styled slightly wrong".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..', '..');
const STYLES = join(SRC, 'styles');
const REPO = join(SRC, '..');

/**
 * Classes that are deliberately not styled, each with the reason. Two honest
 * kinds live here:
 *
 *  - **Scope hooks.** A wrapper whose own box needs no rule because every
 *    descendant selector carries the styling (`.preview-card-hero`,
 *    `.shared-ground-item`, …). Naming the wrapper is still worth it: it is
 *    how a future rule scopes itself, and how an e2e test finds the region.
 *  - **Semantic markers.** `coords` is read by the Urdu no-leak guard
 *    (`e2e/urdu-no-leak.spec.ts`) to know that a Latin run is a coordinate and
 *    therefore allowed. It is a data attribute wearing a class's clothes.
 *
 * Adding an entry is meant to be a visible decision, the same way
 * `DECORATIVE_GLYPHS` is in `textColorTokens.test.ts`. Adding one to silence a
 * class you *meant* to style is the mistake this file exists to catch.
 */
const UNSTYLED_BY_DESIGN: Record<string, string> = {
  'about-page': 'scope hook — the page is styled entirely through .entity-page',
  'coverage-page': 'scope hook — see .coverage-* descendants',
  'shared-ground': 'scope hook — the section is styled through .article-section',
  'nearby-mosques': 'scope hook — .nearby-mosques-source/-list carry the styling',
  'source-notes': 'scope hook — .source-notes-intro/-list carry the styling',
  'typology-group': 'scope hook — .typology-group-heading and siblings carry the styling',
  'almanac-entry-body': 'scope hook — its children are styled individually',
  'almanac-list--undated': 'modifier reserved for the undated group; inherits .almanac-list',
  coords: 'semantic marker read by e2e/urdu-no-leak.spec.ts, not a visual class',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Strip comments before anything else looks at the text.
 *
 * The ordering is not cosmetic. A sibling check
 * (`src/lib/data/__tests__/renderBlocking.test.ts`) once passed while
 * inspecting nothing at all, because its own explanatory comment mentioned the
 * tag it was searching for. Two other checks in this repo scraped their own
 * prose. Comments first, always. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Stands in for a `${…}` interpolation while a class list is tokenised. A
 * NUL cannot occur in source text, so it can never collide with a real name. */
const HOLE = '\u0000';

/**
 * Class names written by a component, split into two kinds.
 *
 * `className={...}` expressions need care, because a class list built with a
 * ternary contains string literals that are *not* class names:
 * `lang === 'en' ? …` yielded `en` and `ur` on the first run. Comparison
 * right-hand sides and function-call arguments are removed before the
 * remaining literals are harvested. (Safe here: nothing in this codebase
 * builds a class list through a helper — no clsx, no classnames — so a literal
 * inside parentheses is never a class.)
 *
 * A name interrupted by an interpolation — `` `place-tradition--${key}` `` —
 * cannot be resolved statically, so it is returned as a *prefix*: some
 * `.place-tradition--…` rule must exist. That is weaker than an exact match and
 * much stronger than skipping the line, which is what a first draft did and
 * which would have missed eight of the repository's variant families.
 */
function classNamesIn(code: string): { exact: string[]; prefixes: string[] } {
  const exact: string[] = [];
  const prefixes: string[] = [];
  const attr = /className\s*=\s*(?:"([^"]*)"|\{((?:[^{}]|\{[^{}]*\})*)\})/g;
  for (const m of code.matchAll(attr)) {
    let text: string;
    if (m[1] !== undefined) {
      text = m[1];
    } else {
      const expr = (m[2] ?? '')
        // `lang === 'ur'`, `x !== "y"` — a comparand, never a class.
        .replace(/[=!]==?\s*(['"])[^'"]*\1/g, '')
        // `t('key')`, `foo("bar")` — an argument, never a class.
        .replace(/[(,]\s*(['"])[^'"]*\1/g, '');
      text = [...expr.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)]
        .map((s) => s[1] ?? s[2] ?? s[3] ?? '')
        .join(' ')
        // An interpolation hole is marked, not deleted: `place-tradition--${k}`
        // is a real constraint (some `.place-tradition--*` rule must exist),
        // just a weaker one than an exact name.
        .replace(/\$\{[^}]*\}/g, HOLE);
    }
    for (const token of text.split(/\s+/)) {
      if (!token) continue;
      if (token.includes(HOLE)) {
        const stem = token.slice(0, token.indexOf(HOLE));
        if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(stem)) prefixes.push(stem);
      } else if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(token)) {
        exact.push(token);
      }
    }
  }
  return { exact, prefixes };
}

const sources = walk(join(SRC))
  .filter((p) => /\.tsx?$/.test(p) && !p.endsWith('.d.ts') && !p.includes('.stories.'))
  .map((p) => ({ file: relative(REPO, p), code: stripComments(readFileSync(p, 'utf8')) }));

const css = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((f) => stripComments(readFileSync(join(STYLES, f), 'utf8')))
  .join('\n');

/** A class is "defined" if the stylesheets mention `.name` as a whole token —
 * `.place-tradition` must not be satisfied by `.place-tradition-count`. */
function isDefined(name: string): boolean {
  return new RegExp(`\\.${name.replace(/[-]/g, '\\-')}(?![A-Za-z0-9_-])`).test(css);
}

/** Some rule whose selector begins with this stem — the most a dynamic class
 * name can be checked for. */
function hasFamily(stem: string): boolean {
  return new RegExp(`\\.${stem.replace(/[-]/g, '\\-')}[A-Za-z0-9_-]`).test(css);
}

describe('every className is defined in a stylesheet', () => {
  const used = new Map<string, string[]>();
  const families = new Map<string, string[]>();
  const record = (map: Map<string, string[]>, name: string, file: string) => {
    const files = map.get(name) ?? [];
    if (!files.includes(file)) files.push(file);
    map.set(name, files);
  };
  for (const { file, code } of sources) {
    const { exact, prefixes } = classNamesIn(code);
    for (const name of exact) record(used, name, file);
    for (const stem of prefixes) record(families, stem, file);
  }

  it('finds the class names it is supposed to be checking', () => {
    // A check that measured nothing would pass silently. Anchor it on the
    // classes whose absence started this file.
    expect(used.size).toBeGreaterThan(300);
    expect(used.has('shrine-place-tag')).toBe(true);
    expect(used.has('entity-page')).toBe(true);
    // …and on a dynamic family, so a regression in the interpolation handling
    // shows up here rather than as a silently shrinking universe.
    expect(families.has('place-tradition--')).toBe(true);
  });

  it('has no dynamic class family with no rules at all', () => {
    // A stem satisfies this two ways, because the hole can be either a
    // *suffix* on the same class (`place-tradition--${key}`) or a whole
    // additional class after a space (`` `lang-seg${active ? ' active' : ''}` ``).
    // In the second case the stem is itself the complete name, and requiring a
    // `.lang-seg-…` rule to exist would be requiring a variant nobody wrote.
    const empty = [...families.entries()]
      .filter(([stem]) => !hasFamily(stem) && !isDefined(stem))
      .map(([stem, files]) => `.${stem}* — used in ${files.join(', ')}`);
    expect(
      empty,
      'These class names are built by interpolation and no stylesheet defines any rule ' +
        'starting with the stem, so every variant renders unstyled.',
    ).toEqual([]);
  });

  it('has no class that exists in no stylesheet', () => {
    const orphans = [...used.entries()]
      .filter(([name]) => !isDefined(name) && !(name in UNSTYLED_BY_DESIGN))
      .map(([name, files]) => `.${name} — used in ${files.join(', ')}`);

    expect(
      orphans,
      'These class names appear in JSX but in no stylesheet under src/styles, so the ' +
        'elements render unstyled. Write the rule, or — if the class is a scope hook or a ' +
        'semantic marker — add it to UNSTYLED_BY_DESIGN with the reason.',
    ).toEqual([]);
  });

  it('has no stale entry in UNSTYLED_BY_DESIGN', () => {
    // An exemption that outlives its cause makes the next reader trust the
    // list less. Same reasoning as the allowlist audit in
    // textColorTokens.test.ts.
    const stale = Object.keys(UNSTYLED_BY_DESIGN).filter(
      (name) => !used.has(name) || isDefined(name),
    );
    expect(
      stale,
      'Either these classes are no longer used, or they are styled now. Remove them from ' +
        'UNSTYLED_BY_DESIGN.',
    ).toEqual([]);
  });
});
