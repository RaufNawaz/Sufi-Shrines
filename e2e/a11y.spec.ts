import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Leaflet injects tiles/controls that have known axe false-positives; exclude them.
const EXCLUDE_SELECTORS = ['.leaflet-container'];

test.describe('Accessibility (axe-core)', () => {
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
