import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * An Urdu reader must be able to find a person by their Urdu name.
 *
 * Measured on the running site, 30 August 2026, before the fix: «ماتا ترپتا»
 * returned six shrines whose names contain ماتا or داتا and **no figure at
 * all**; «بے بے نانکی» returned seven gurdwaras and not Bebe Nanaki. Typing the
 * same names in Latin found them. The archive holds both women — Guru Nanak's
 * mother and his elder sister — and told an Urdu reader it did not.
 *
 * The split was exact and lived in the search index, whose 258 rows are 241
 * figures, 9 orders and 8 traditions. The traditions carry `nameUr` from their
 * seed and the orders carry their Urdu name in `aka` from the node's
 * `arabicName`, so both scripts reach both. **The 241 figures carry neither**,
 * because a figure's Urdu name is not a field at all — it resolves from the
 * dictionary at render time, which is why the result row could display it while
 * the matcher could not find it.
 *
 * This spec asserts the reader-facing end of that, in the script they typed.
 * `searchUrduReachability.test.ts` holds the index side.
 */
const FIGURES = [
  { latin: 'Mata Tripta', urdu: 'ماتا ترپتا', slug: 'mata-tripta' },
  { latin: 'Bebe Nanaki', urdu: 'بے بے نانکی', slug: 'bebe-nanaki' },
];

async function openPalette(page: Page, lang: 'en' | 'ur', query: string) {
  await page.goto(lang === 'ur' ? '/about?lang=ur' : '/about');
  await page.locator('h1').first().waitFor();
  await page.keyboard.press('Meta+k');
  await page.locator('.palette-input').waitFor();
  await page.locator('.palette-input').fill(query);
}

test.describe('a figure is findable by their Urdu name', () => {
  for (const figure of FIGURES) {
    test(`«${figure.urdu}» reaches /saint/${figure.slug}`, async ({ page }) => {
      await openPalette(page, 'ur', figure.urdu);

      /* Poll rather than assert once: the dictionary is lazy and 88 KB, and an
         Urdu-script query is what triggers the fetch, so the figure row appears
         only after it lands and the entity list is re-enriched. */
      /* The rows are `role="option"` list items, not anchors — the palette
         navigates on commit — so the assertion is on the name it displays. */
      const row = page.locator('.palette-result-name').filter({ hasText: figure.urdu }).first();
      await expect(row, `«${figure.urdu}» did not reach ${figure.slug}`).toBeVisible({
        timeout: 20_000,
      });

      /* And it goes where it says: committing the row lands on the figure. */
      await row.click();
      await expect(page).toHaveURL(new RegExp(`/saint/${figure.slug}(\\?|$)`));
    });

    test(`"${figure.latin}" still reaches /saint/${figure.slug}`, async ({ page }) => {
      /* The other half, so a fix for the Urdu side cannot quietly cost the
         Latin one: enriching the index must add a name, never replace one. */
      await openPalette(page, 'en', figure.latin);
      const row = page.locator('.palette-result-name').filter({ hasText: figure.latin }).first();
      await expect(row, `"${figure.latin}" did not reach ${figure.slug}`).toBeVisible({
        timeout: 20_000,
      });
      await row.click();
      await expect(page).toHaveURL(new RegExp(`/saint/${figure.slug}(\\?|$)`));
    });
  }
});
