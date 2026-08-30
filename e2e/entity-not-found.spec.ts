import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * An entity route must answer an unknown slug where it was asked.
 *
 * Measured 30 August 2026: `/shrine/zzz`, `/saint/zzz`, `/order/zzz` and
 * `/tradition/zzz` all ended at `/` with the address bar rewritten and nothing
 * said. `/place/zzz` stayed put and said "No place by that name is recorded."
 *
 * For an archive whose case rests on citability, **a URL that silently resolves
 * to something else is worse than a 404**: a reader following a citation cannot
 * tell a typo from a merge from a deletion, and lands somewhere indistinguishable
 * from having typed the bare address. The map is not an error message.
 *
 * ## The half that is easy to break while fixing the other half
 *
 * `/saint/:slug` redirects **nineteen retired slugs** to the figures they became,
 * and that redirect runs immediately before the fallthrough this spec is about.
 * A not-found that caught an unknown slug one line earlier would turn nineteen
 * working addresses into nineteen dead ends — silently, since a retired slug
 * looks exactly like an unknown one from the route's point of view.
 *
 * That is not hypothetical. Merging two figure nodes retires a published
 * `/saint/` URL, 632 saint pages are prerendered and in the sitemap, and on this
 * same day a merge in the other session's lane dropped an address entirely
 * because the builder aliased the losing slug without retiring it. So both
 * halves are asserted here, and the redirect list is read from the graph rather
 * than copied, because a copy is what goes stale.
 */
const NOT_FOUND_TITLE = UI_TEXT.en.pageNotFoundTitle;

const ROUTES = ['/shrine', '/saint', '/order', '/tradition', '/place'];

test.describe('an unknown slug is answered where it was asked', () => {
  for (const base of ROUTES) {
    test(`${base}/<unknown> keeps its URL and says so`, async ({ page }) => {
      const url = `${base}/zz-no-such-entity-exists`;
      await page.goto(url);
      await expect(page.locator('h1').first()).toBeVisible();

      expect(
        new URL(page.url()).pathname,
        `${url} redirected instead of answering — a reader following a citation ` +
          'cannot tell a typo from a merge from a deletion',
      ).toContain('zz-no-such-entity-exists');

      /* `/place` says its own sentence and the other four say the archive's
         404 wording; both are an answer, which is the claim. What must never
         appear is the map. */
      await expect(page.locator('.leaflet-container')).toHaveCount(0);
    });
  }

  test('the nineteen retired saint slugs still redirect, and are not caught by it', async () => {
    /* Read from the graph, not copied: a hardcoded list is what goes stale the
       next time two figures are merged. */
    const kg = JSON.parse(readFileSync(join(here, '..', 'data', 'kg.json'), 'utf-8')) as {
      retiredSlugs?: Record<string, string>;
      saints: { slug: string }[];
    };
    const retired = Object.entries(kg.retiredSlugs ?? {});

    expect(retired.length, 'no retired slugs in the graph — has the table moved?').toBeGreaterThan(
      0,
    );
    const live = new Set(kg.saints.map((s) => s.slug));
    for (const [from, to] of retired) {
      expect(live.has(to), `retired ${from} points at ${to}, which is not a live figure`).toBe(
        true,
      );
      expect(
        live.has(from),
        `${from} is retired and still live — it should be one or the other`,
      ).toBe(false);
    }
  });

  for (const nth of [0, 1]) {
    test(`a retired saint slug lands on its figure, not on the not-found (#${nth + 1})`, async ({
      page,
    }) => {
      const kg = JSON.parse(readFileSync(join(here, '..', 'data', 'kg.json'), 'utf-8')) as {
        retiredSlugs?: Record<string, string>;
      };
      const entries = Object.entries(kg.retiredSlugs ?? {});
      test.skip(entries.length <= nth, 'not enough retired slugs to sample');
      const [from, to] = entries[nth]!;

      await page.goto(`/saint/${from}`);
      await expect(page).toHaveURL(new RegExp(`/saint/${to}(\\?|#|$)`));
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('h1').first()).not.toHaveText(NOT_FOUND_TITLE);
    });
  }
});
