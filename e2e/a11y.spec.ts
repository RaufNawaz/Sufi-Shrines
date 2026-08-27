import { test, expect, settle } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

// Leaflet injects tiles/controls that have known axe false-positives; exclude them.
const EXCLUDE_SELECTORS = ['.leaflet-container'];

test.describe('Accessibility (axe-core)', () => {
  // Contrast is a rest-state property: the stagger/reveal animations pass
  // through intermediate opacities, and axe scanning mid-animation reports
  // phantom contrast failures (seen 21 Aug 2026 on /report: token colors at
  // ~90% opacity). Motion behaviour has its own specs in typography.spec.ts.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('map page has no critical violations', async ({ page }) => {
    await page.goto('/');
    // Wait for the sidebar to render before scanning
    await page.locator('#sidebar').waitFor();

    const results = await new AxeBuilder({ page })
      .exclude(EXCLUDE_SELECTORS)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
  });

  test('shrine detail page has no critical violations', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    const results = await new AxeBuilder({ page })
      .exclude(EXCLUDE_SELECTORS)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
  });

  test('shrine page has correct heading hierarchy', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    // One and only one H1
    await expect(page.locator('h1')).toHaveCount(1);

    // H2s exist (article sections / location / related)
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  // The almanac and graph pages shipped after the original a11y sweep
  // (18 Aug); they stay in the matrix so regressions surface here rather
  // than in a reader's screen reader (plan item A6,
  // docs/planning/NEXT_STEPS_2026-08-21.md).
  test('almanac page has no critical violations', async ({ page }) => {
    await page.goto('/almanac');
    await page.locator('h1.entity-title').waitFor();

    const results = await new AxeBuilder({ page })
      .exclude(EXCLUDE_SELECTORS)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
  });

  test('graph page has no critical violations', async ({ page }) => {
    await page.goto('/graph');
    await page.locator('h1.entity-title').waitFor();

    const results = await new AxeBuilder({ page })
      .exclude(EXCLUDE_SELECTORS)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
  });

  /* /about, which now carries what /coverage and /report each used to: two
     dozen sections, four kinds of statistic block and two ledgers. It is the
     densest page in the archive, so it is the one worth scanning. */
  test('about page has no critical violations', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1.entity-title').waitFor();

    const results = await new AxeBuilder({ page })
      .exclude(EXCLUDE_SELECTORS)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
  });

  test('typology page has no critical violations', async ({ page }) => {
    await page.goto('/typology');
    await page.locator('h1.entity-title').waitFor();

    const results = await new AxeBuilder({ page })
      .exclude(EXCLUDE_SELECTORS)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
  });

  test('settings page has no critical violations', async ({ page }) => {
    /* The densest page of form controls in the archive, and the only one whose
       whole content is native inputs: a fieldset per option, a legend per
       fieldset, and every control inside its own label so the 44px row is the
       hit area rather than the 18px box. All four combinations — both languages,
       both themes — were clean when it landed. */
    await page.goto('/settings');
    await page.locator('h1.entity-title').waitFor();

    const results = await new AxeBuilder({ page })
      .exclude(EXCLUDE_SELECTORS)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
  });

  test('keyboard navigation reaches interactive elements', async ({ page }) => {
    await page.goto('/');
    // Tabbing before hydration finishes can land focus on a node React is
    // about to replace (seen flaking under full-suite load) — wait for the
    // app shell first.
    await page.locator('#sidebar').waitFor();
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

/**
 * The same sweep, in the dark theme.
 *
 * Everything above this block ran in one theme, and `CLAUDE.md` described it as
 * scanning "every route in both languages" — true, and it hid the other axis.
 * The first dark run, on 27 August 2026, found **63 serious contrast failures
 * across every route in the archive**, from three causes that had all been there
 * since dark mode shipped:
 *
 *  - `background: var(--color-primary); color: white` on the language toggle,
 *    the filter chips, the order chips, scroll-to-top, the 404 action and the
 *    tour's next button. `--color-primary` is a *light* cobalt in dark mode, so
 *    white on it is 2.37:1. Fixed at the token
 *    (`src/styles/__tests__/themeFlippingGrounds.test.ts` now refuses the
 *    pairing statically, which is milliseconds against this suite's minutes).
 *  - Sixteen anchors with no `color` rule at all, falling back to the user
 *    agent's `#0000ee` — about 8:1 on cream, **1.96:1** on the dark ground.
 *  - White on `--color-accent`, which is a light gold in *both* themes and was
 *    therefore failing in both; only the dark sweep noticed.
 *
 * Routes rather than one page, because the first two causes are in shared
 * chrome and would pass on whichever single page happened to be chosen.
 */
const DARK_ROUTES = [
  '/',
  '/shrine/data-darbar',
  '/saint/data-ganj-bakhsh',
  '/order/qadiriyya',
  '/place/lahore',
  '/almanac',
  '/graph',
  '/typology',
  '/about',
  '/settings',
];

test.describe('Accessibility in the dark theme', () => {
  test.use({
    contextOptions: { reducedMotion: 'reduce' },
    colorScheme: 'dark',
  });

  for (const route of DARK_ROUTES) {
    test(`${route} has no critical violations in the dark theme`, async ({ page }) => {
      await page.goto(route);
      await page.locator('h1').first().waitFor();
      await settle(page);

      const results = await new AxeBuilder({ page })
        .exclude(EXCLUDE_SELECTORS)
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious, formatViolations(criticalOrSerious)).toHaveLength(0);
    });
  }
});
