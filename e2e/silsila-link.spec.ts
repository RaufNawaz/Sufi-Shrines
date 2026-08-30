import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * A shrine names its order; the reader can now go there.
 *
 * `/order/qadiriyya` links out to 90 shrines, 88 figures and 12 places, and
 * **not one shrine page linked back** — the only one-way edge in the entity
 * graph. The infobox row read "Silsila (order): Qadiri" as inert text, directly
 * beneath "Built form" and "Tradition", both of which are links, so the chain
 * `/shrine/… → /saint/… → /order/…` could not be walked forwards. You had to
 * arrive at an order from `/graph`.
 *
 * **The negative case is the one that matters.** Measured on the shipped
 * snapshot: of 52 cells carrying a silsila, 47 name exactly one of the nine
 * orders, three name two — "Chishti Nizamia Qadria", "Qadri Shattari", and one
 * reciting a *bai'at* to a shaykh of both — and two are prose. A dual
 * affiliation is a fact about the figure, not an ambiguity to resolve: linking
 * it to whichever pattern matched first would assert something the sheet
 * declines to (RULE 2). Those stay text, and `silsila_note` beneath already
 * carries the survey's own wording.
 */
const silsilaRow = (page: Page) =>
  page
    .locator('.infobox-row')
    .filter({ has: page.locator('.infobox-label', { hasText: /silsila/i }) });

test.describe('the silsila row reaches its order page', () => {
  for (const [slug, order] of [
    ['bari-imam', 'qadiriyya'],
    ['golra-sharif', 'chishtiyya'],
  ] as const) {
    test(`${slug} links to /order/${order}`, async ({ page }) => {
      await page.goto(`/shrine/${slug}`);
      const row = silsilaRow(page);
      await row.first().waitFor({ timeout: 30_000 });

      const link = row.locator('a').first();
      await expect(link, 'the silsila is still inert text').toBeVisible();
      await expect(link).toHaveAttribute('href', new RegExp(`/order/${order}$`));

      /* And it goes where it says — a link to a page that does not resolve is
         worse than no link. */
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/order/${order}`));
      await expect(page.locator('h1.entity-title')).toBeVisible();
    });
  }

  /* URL slugs, which are built from the Name and are not the snapshot's `id` —
     that shortcut cost a 30-second timeout that looked like a missing row. */
  for (const slug of [
    'darbar-hazrat-khawaja-feroz-ud-din-gharib-nawaz-chishti-nizami',
    'shrine-of-shah-inayat-qadiri',
  ]) {
    test(`${slug} names two orders and links to neither`, async ({ page }) => {
      await page.goto(`/shrine/${slug}`);
      const row = silsilaRow(page);
      await row.first().waitFor({ timeout: 30_000 });

      await expect(
        row.locator('a'),
        'a cell naming two orders was linked to one of them, which the sheet does not say',
      ).toHaveCount(0);
      /* The value itself must still be on screen — not linking is not the same
         as not showing. */
      await expect(row.first()).toContainText(/qadri|chishti/i);
    });
  }
});
