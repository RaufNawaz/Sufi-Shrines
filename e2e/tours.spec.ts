import { test, expect } from '@playwright/test';

test.describe('Guided tours on the map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Tours are opt-in — flip the switch before each test.
    await page.getByRole('switch', { name: 'Turn on guided tours' }).click();
  });

  test('starting a tour draws the route and numbered stop markers', async ({ page }) => {
    await page.getByText('Sufi Saints of the Indus Valley').click();

    // Route line + 8 numbered stop markers for this tour.
    await expect(page.locator('.tour-route-line')).toBeVisible();
    await expect(page.locator('.tour-stop-marker')).toHaveCount(8);

    // The first stop is highlighted as active.
    await expect(page.locator('.tour-stop-marker--active')).toHaveCount(1);
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('1');

    await expect(page.locator('.tour-step-badge')).toContainText('Stop 1 of 8');
  });

  test('Next advances the active stop and moves the camera', async ({ page }) => {
    await page.getByText('Sufi Saints of the Indus Valley').click();
    await expect(page.locator('.tour-step-badge')).toContainText('Stop 1 of 8');

    await page.getByRole('button', { name: 'Next stop' }).click();

    await expect(page.locator('.tour-step-badge')).toContainText('Stop 2 of 8');
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('2');
  });

  test('ending a tour removes the route and restores normal markers', async ({ page }) => {
    await page.getByText('Sufi Saints of the Indus Valley').click();
    await expect(page.locator('.tour-route-line')).toBeVisible();

    await page.getByRole('button', { name: 'End tour' }).click();

    await expect(page.locator('.tour-route-line')).toHaveCount(0);
    await expect(page.locator('.tour-stop-marker')).toHaveCount(0);
    await expect(page.locator('.shrine-dot--dimmed')).toHaveCount(0);
  });
});
