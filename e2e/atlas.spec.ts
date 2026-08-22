import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

// The Atlas of Built Forms (/typology, blue-sky N7) and the infobox row that
// finally displays site_type — a column the schema migration added and
// nothing showed for months.

test.describe('Atlas of Built Forms', () => {
  test('groups the archive by built form, with honest counts', async ({ page }) => {
    await page.goto('/typology');
    await expect(page.locator('h1.entity-title')).toHaveText(UI_TEXT.en.typologyTitle);

    // The largest vocabulary group leads (Temple, 38 in the fixture), and
    // its heading carries the count.
    const first = page.locator('.typology-group-heading').first();
    await expect(first).toContainText('Temple');
    await expect(first.locator('.typology-group-count')).toContainText('38');

    // The two survey-prose forms are kept as prose, not forced into the
    // vocabulary; the one blank row gets an explicit "not recorded" group.
    await expect(page.locator('.typology-group-prose')).toHaveCount(2);
    await expect(
      page.locator('.typology-group-heading', { hasText: UI_TEXT.en.typologyNotRecorded }),
    ).toHaveCount(1);

    // Every shrine lands somewhere: the group counts sum to the dataset.
    const counts = await page.locator('.typology-group-count').allTextContents();
    const total = counts.reduce((n, c) => n + Number(c.replace(/\D/g, '')), 0);
    expect(total).toBe(169);
  });

  test('a card navigates to the shrine page', async ({ page }) => {
    await page.goto('/typology');
    const card = page.locator('.typology-grid .related-card').first();
    const name = await card.locator('.related-card-name').textContent();
    await card.click();
    await expect(page.locator('h1.shrine-title')).toHaveText(name!.trim());
  });

  test('the infobox built-form row links into the atlas', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    const row = page.locator('.infobox-row', { hasText: UI_TEXT.en.fieldSiteType });
    await expect(row).toBeVisible();
    const link = row.getByRole('link', { name: 'Complex' });
    await expect(link).toHaveAttribute('href', /\/typology#complex$/);
    await link.click();
    await expect(page.locator('h1.entity-title')).toHaveText(UI_TEXT.en.typologyTitle);
    // The hash landed on the group, which is scrolled into view.
    await expect(page.locator('#complex')).toBeInViewport();
  });
});
