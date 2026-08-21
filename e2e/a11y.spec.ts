import { test, expect, settle } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

// Leaflet injects tiles/controls that have known axe false-positives; exclude them.
const EXCLUDE_SELECTORS = ['.leaflet-container'];

/* settle() moved to fixtures.ts: the mobile-sheet spec needed the same wait
   for the same reason (a bottom sheet measured 5% into its height transition),
   and two copies of an accessibility contract is one too many. */

/**
 * Every route, in both languages.
 *
 * This suite covered `/` and `/shrine/:slug` and nothing else, while the app
 * grew `/graph`, `/almanac`, `/saint/:slug`, `/order/:slug` and `/coverage`. So
 * it reported the site accessible having scanned two of seven pages — the same
 * shape of gap as the no-English-leak guard that covered two routes
 * (HANDOVER §9.29) and the chip spec that never opened the facet it measured
 * (§9.39). A route list is a universe, and a check is only as good as the one it
 * ran over.
 *
 * Urdu is scanned too, not as a courtesy: RTL flips every layout, Nastaliq
 * changes every line-box, and the numeral toggle rewrites text content. None of
 * that is exercised by an English-only scan, and the project's standard is that
 * Urdu is a first-class experience rather than a translation afterthought.
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
  { name: 'not found', path: '/no-such-page-exists', ready: 'h1' },
] as const;

test.describe('Accessibility (axe-core) — every route', () => {
  for (const route of ROUTES) {
    for (const lang of ['en', 'ur'] as const) {
      test(`${route.name} (${lang}) has no critical or serious violations`, async ({ page }) => {
        await page.goto(lang === 'ur' ? `${route.path}?lang=ur` : route.path);
        await page.locator(route.ready).first().waitFor();
        await settle(page);

        const results = await new AxeBuilder({ page })
          .exclude(EXCLUDE_SELECTORS)
          .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
          .analyze();

        const criticalOrSerious = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious',
        );
        expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
      });
    }
  }
});

/* The `/` and `/shrine/:slug` axe scans that used to live here are covered by
   the ROUTES loop above, in both languages. */
/**
 * The command palette, open.
 *
 * The route sweep above scans pages at rest, so it has never seen an overlay —
 * and an overlay is where the a11y risk concentrates: it is a modal dialog with
 * a combobox, a listbox, a focus trap and a translucent panel that has to keep
 * its contrast over whatever is behind it. Scanned in both languages, because
 * the panel flips direction and swaps to Nastaliq.
 */
test.describe('Accessibility (axe-core) — the command palette', () => {
  for (const lang of ['en', 'ur'] as const) {
    test(`the open palette (${lang}) has no critical or serious violations`, async ({ page }) => {
      await page.goto(lang === 'ur' ? '/?lang=ur' : '/');
      await page.locator('#sidebar').waitFor();
      await page.locator('.list-toggle-btn').click();
      await page.locator('.palette-trigger').click();
      await page.locator('.palette').waitFor();
      // With the filters drawer open too — that is another twenty controls the
      // sweep would otherwise never see.
      await page.locator('.palette-filters-btn').click();
      await page.locator('.palette-filters').waitFor();
      await settle(page);

      const results = await new AxeBuilder({ page })
        .exclude(EXCLUDE_SELECTORS)
        .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
    });
  }
});

test.describe('Accessibility (axe-core)', () => {
  test('shrine page has correct heading hierarchy', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    // One and only one H1
    await expect(page.locator('h1')).toHaveCount(1);

    // H2s exist (article sections / location / related)
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('keyboard navigation reaches interactive elements', async ({ page }) => {
    await page.goto('/');
    // Tab from body should hit skip-link then sidebar controls
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});

function formatViolations(violations: { id: string; description: string; nodes: unknown[] }[]) {
  return violations
    .map((v) => `[${v.id}] ${v.description} (${(v.nodes as unknown[]).length} node(s))`)
    .join('\n');
}

/**
 * Touch targets on a phone.
 *
 * CLAUDE.md sets 44px as this project's minimum, and most of the archive's
 * readers are on a phone. Measured at 390px before this guard existed: the
 * language toggle 34px, Share 34px, Get Directions 40px, Copy coordinates
 * 40px, the infobox's Get Directions 37px, the back link 22px, Leaflet's zoom
 * and reset controls 34px, the bottom-sheet handle 16px, and the guided-tours
 * switch 20px.
 *
 * Only *standalone* controls are asserted. Links inside a sentence — the
 * breadcrumb, a saint's name in the meta line, the footer links — are exempt
 * under WCAG's inline exception, and padding them to 44px would wreck the
 * line rhythm of the article.
 */
test.describe('Touch targets (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const MIN = 44;

  test('map controls are all tappable', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();

    const undersized = await page.evaluate((min) => {
      const selectors = [
        '.leaflet-control-zoom-in',
        '.leaflet-control-zoom-out',
        '.reset-view-btn',
        '.leaflet-control-layers-toggle',
        '.lang-seg',
        '.list-toggle-btn',
        '.sidebar-sheet-handle',
        '.tour-toggle',
      ];
      const bad: string[] = [];
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue; // not rendered
          if (r.height < min || r.width < min) {
            bad.push(`${sel} ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        }
      }
      return bad;
    }, MIN);

    expect(undersized, 'controls smaller than the 44px minimum').toEqual([]);
  });

  test('shrine page actions are all tappable', async ({ page }) => {
    await page.goto('/shrine/shamsabad');
    await page.locator('h1.shrine-title').waitFor();

    const undersized = await page.evaluate((min) => {
      const bad: string[] = [];
      for (const sel of ['.action-btn', '.infobox-action-btn', '.back-link', '.lang-seg']) {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (r.height < min) bad.push(`${sel} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return bad;
    }, MIN);

    expect(undersized, 'controls shorter than the 44px minimum').toEqual([]);
  });

  test('the guided-tours switch keeps its slim pill while growing its hit area', async ({
    page,
  }) => {
    // The fix must not fatten the control itself — padding grows the border
    // box while background-clip keeps the track on the 36x20 content box.
    await page.goto('/');
    await page.locator('.tour-toggle').waitFor();
    const geometry = await page.evaluate(() => {
      const el = document.querySelector('.tour-toggle')!;
      const cs = getComputedStyle(el);
      const pad = (s: 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom') =>
        parseFloat(cs[s]) || 0;
      const r = el.getBoundingClientRect();
      return {
        contentWidth: Math.round(r.width - pad('paddingLeft') - pad('paddingRight')),
        contentHeight: Math.round(r.height - pad('paddingTop') - pad('paddingBottom')),
        clip: cs.backgroundClip,
      };
    });
    expect(geometry).toEqual({ contentWidth: 36, contentHeight: 20, clip: 'content-box' });
  });
});
