import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Leaflet injects tiles/controls that have known axe false-positives; exclude them.
const EXCLUDE_SELECTORS = ['.leaflet-container'];

/**
 * Scan the page as it comes to rest, not mid-entrance.
 *
 * axe composites ancestor `opacity` into the foreground colour it measures, so
 * an element halfway through a `reveal-rise` fade is measured at its
 * *blended* colour. That produced six failures on this suite's first run —
 * almanac entries reported at #978d7f, order links at #6b82b6 — colours that
 * appear nowhere in the palette, because they are `--color-text-muted` and
 * `--color-primary` part-way onto the page ground. All six were the scan
 * racing the animation. The seventh was real (`.not-found-code`, 1.43:1), and
 * would have been indistinguishable from the noise had the noise stayed.
 *
 * Waiting is not a way of averting one's eyes. An animation that *never*
 * finishes fails the wait, so text left permanently semi-transparent is still
 * caught — and caught as what it is (a stuck animation) rather than
 * misattributed to the palette. Infinite animations are skipped by design:
 * the loading spinner is meant to run forever, and it is the one animation
 * `src/styles/__tests__/motion.test.ts` exempts from the reduced-motion
 * contract for the same reason.
 */
async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => {
        if (a.playState !== 'running') return true;
        const timing = a.effect?.getComputedTiming();
        return timing?.iterations === Infinity;
      }),
    null,
    { timeout: 10_000 },
  );
}

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
