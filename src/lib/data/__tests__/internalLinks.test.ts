// @vitest-environment node
/**
 * An internal link must go through the router, not a raw `href` (RULE 4).
 *
 * The screen-reader shrine directory on the map page emitted
 * `<a href="/shrine/${slug}">` for all 169 entries. React Router is mounted with
 * `basename={import.meta.env.BASE_URL}`, and production is served from
 * `/Sufi-Shrines/` — so every one of those links pointed at
 * `raufnawaz.github.io/shrine/<slug>` and returned a 404 on the live site. An
 * accessibility landmark, entirely broken, in production only.
 *
 * **No test could have caught it, by construction.** `npm run build:e2e` sets
 * `VITE_BASE_PATH=/`, because the e2e suite needs root-relative URLs — which is
 * precisely the one configuration in which the bug does not exist. The Playwright
 * run navigated those links happily. That is the sharpest form of the pattern
 * this repository keeps hitting: not a check looking at the wrong universe, but
 * a check that *cannot* look at the right one.
 *
 * So the check is static instead. A literal absolute path in an `href` is
 * wrong for any route this app owns; `<Link to>` prepends the basename, and an
 * external URL carries its own origin.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const FILES = execSync(
  "find src -name '*.tsx' -not -path '*__tests__*' -not -name '*.stories.tsx'",
  { cwd: ROOT, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

/**
 * Paths that are genuinely served from the site root regardless of base, or are
 * fragment/protocol links rather than routes.
 *
 * `#…` is an in-page anchor (the skip links). `mailto:` and `https:` carry their
 * own destination. `/` alone is caught separately below because it is almost
 * always a route.
 */
const NOT_A_ROUTE = /^(#|mailto:|tel:|https?:|data:|blob:|\{)/;

/** Route prefixes this app owns — an absolute href into one of these is a bug. */
const OWNED_ROUTES = ['/shrine/', '/saint/', '/order/', '/graph', '/almanac', '/coverage', '/about'];

describe('internal links go through the router', () => {
  it('no href points at an app route with an absolute path', () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      /*
       * Comments stripped first. The third time in one session that a check
       * scraped its own explanatory prose: the fix in MapPage.tsx carries a
       * comment quoting the bad pattern (`href="/shrine/…"`) so the next reader
       * knows what went wrong, and the first draft of this test flagged it.
       * Block comments, JSX comment expressions and line comments all go.
       */
      const src = readFileSync(join(ROOT, file), 'utf8')
        .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

      // Both quoted and template-literal hrefs.
      for (const m of src.matchAll(/href=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const value = (m[1] ?? m[2] ?? '').trim();
        if (!value || NOT_A_ROUTE.test(value)) continue;
        if (!value.startsWith('/')) continue; // relative is fine
        const hit = OWNED_ROUTES.find((route) => value.startsWith(route));
        if (!hit) continue;
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${file}:${line} href="${value}"`);
      }
    }

    expect(
      offenders,
      'an absolute href bypasses the router basename, so it 404s wherever the site is not ' +
        'served from the domain root — which is production. Use <Link to={…}>. ' +
        '`npm run build:e2e` sets the base to `/`, so no e2e run can see this.',
    ).toEqual([]);
  });

  it('the check is looking at real files', () => {
    // A find that silently returned nothing would make the assertion above
    // vacuous — the failure mode this repository keeps rediscovering.
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain('src/pages/MapPage.tsx');
  });
});
