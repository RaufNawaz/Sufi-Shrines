import { test, expect } from './fixtures';

/**
 * A skip link must actually skip.
 *
 * The two global skip links were English literals on every route (`Skip to
 * content`, `Skip to shrine list`) — the first two controls a keyboard reader
 * reaches, in the wrong language on the Urdu site. Two things had hidden them:
 * the no-English-leak guard exempts every `<a>`, and a skip link is invisible
 * until focused, so no screenshot showed them either.
 *
 * Fixing that surfaced two worse problems, which is what this file is for:
 *
 * 1. **`#shrine-directory` exists on the map route and nowhere else**, so on
 *    eight of nine routes the second skip link pointed at nothing. It looked
 *    right in the markup and did nothing when used — the failure mode a
 *    keyboard reader cannot report, because focus simply stays put.
 * 2. **Four pages rendered their own `#main-content` skip link** on top of the
 *    global one, so the first two stops in the tab order were the same
 *    destination twice.
 *
 * Neither is visible to an axe scan (a link with a valid-looking fragment href
 * is not a violation) or to a route test (nothing on screen changes). So the
 * check has to be behavioural: follow each link and assert focus moved to a
 * real element.
 */

const ROUTES = [
  { name: 'map', path: '/', ready: '#sidebar' },
  { name: 'shrine', path: '/shrine/data-darbar', ready: 'h1.shrine-title' },
  { name: 'saint', path: '/saint/data-ganj-bakhsh', ready: 'h1.entity-title' },
  { name: 'order', path: '/order/qadiriyya', ready: 'h1.entity-title' },
  { name: 'graph', path: '/graph', ready: 'h1.entity-title' },
  { name: 'almanac', path: '/almanac', ready: 'h1' },
  { name: 'coverage', path: '/coverage', ready: 'h1.entity-title' },
  { name: 'place', path: '/place/lahore', ready: 'h1.entity-title' },
  { name: 'about', path: '/about', ready: 'h1.entity-title' },
] as const;

test.describe('skip links', () => {
  for (const route of ROUTES) {
    test(`${route.name}: every skip link has a target, and none is duplicated`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await page.locator(route.ready).first().waitFor();

      const report = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a.skip-link'));
        const hrefs = links.map((a) => a.getAttribute('href') ?? '');
        const dangling = hrefs.filter((h) => {
          if (!h.startsWith('#')) return true;
          return !document.getElementById(h.slice(1));
        });
        const duplicated = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
        return { count: links.length, hrefs, dangling, duplicated };
      });

      expect(report.count, 'no skip link on this route at all').toBeGreaterThan(0);
      expect(
        report.dangling,
        'these skip links point at an id that does not exist on this route, so activating one ' +
          'leaves focus where it was — invisible to axe and to a screenshot',
      ).toEqual([]);
      expect(
        report.duplicated,
        'two skip links to the same target put the same destination twice at the front of the ' +
          'tab order',
      ).toEqual([]);
    });
  }

  test('the shrine-list skip link is offered only where the list exists', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();
    await expect(page.locator('a.skip-link[href="#shrine-directory"]')).toHaveCount(1);

    await page.goto('/about');
    await page.locator('h1.entity-title').waitFor();
    await expect(page.locator('a.skip-link[href="#shrine-directory"]')).toHaveCount(0);
  });

  test('the content skip link is the first tabbable, and following it moves focus', async ({
    page,
  }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    /* Measured, so the assertion matches the design rather than a guess about
       it: on mount the page focuses its <h1> (useFocusHeadingOnMount, so a
       screen reader announces the route). A forward Tab therefore starts from
       the heading, not from the top — the skip link is reached by Shift+Tab,
       and it is the *first tabbable in DOM order*, which is the property that
       matters. Asserting "one Tab focuses the skip link" would fail here and
       would be testing the wrong thing. */
    const firstTabbable = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      return el?.className ?? null;
    });
    expect(firstTabbable, 'something precedes the skip link in the tab order').toContain(
      'skip-link',
    );

    await page.locator('a.skip-link[href="#main-content"]').focus();
    await expect(page.locator('a.skip-link[href="#main-content"]')).toBeFocused();
    await page.keyboard.press('Enter');

    // Browsers differ on whether they focus the fragment target itself or its
    // first tabbable descendant; either counts as having moved.
    const landedInMain = await page.evaluate(() => {
      const main = document.getElementById('main-content');
      const active = document.activeElement;
      return !!main && !!active && (main === active || main.contains(active));
    });
    expect(landedInMain, 'following the skip link did not move focus into #main-content').toBe(
      true,
    );
  });
});
