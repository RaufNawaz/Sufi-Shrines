import { test, expect } from './fixtures';

/**
 * Shared ground, and the one rule it must never break.
 *
 * The section states which other sites stand within 800 m and how many belong
 * to another tradition — the fact this archive's coordinates have always
 * contained and its pages never showed. See
 * `docs/planning/SHARED_GROUND_VISION.md`.
 *
 * The rule: **a distance the archive did not measure must never be displayed as
 * one it did.** Four coordinate groups in the data are identical and every one
 * is a documented approximation — the four Miani Sahib darbars share a pin
 * because the survey gives no position within the graveyard; Darbar Malik Ahmad
 * Ayaz carries Data Darbar's pin because the survey ties its location to it.
 * Those rows must read "same recorded location", not "0 m" and not "< 1 km".
 */
test.describe('shared ground', () => {
  test('names the neighbouring sites and how many cross traditions', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    const section = page.locator('#shared-ground');
    await expect(section).toBeVisible();

    // Data Darbar's neighbours include two gurdwaras and a secular memorial, so
    // the cross-tradition count is the whole point of the section here.
    await expect(section.locator('.shared-ground-item')).not.toHaveCount(0);
    await expect(section.locator('.shared-ground-item--other')).not.toHaveCount(0);
  });

  test('a shared pin is never rendered as a measured distance', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await expect(page.locator('#shared-ground')).toBeVisible();

    const same = page.locator('.shared-ground-distance--same');
    await expect(same, 'Data Darbar shares its pin with Darbar Malik Ahmad Ayaz').not.toHaveCount(
      0,
    );
    for (const text of await same.allInnerTexts()) {
      expect(text, 'a shared pin is showing a number').not.toMatch(/\d/);
    }
  });

  test('every distance shown is inside the stated radius', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await expect(page.locator('#shared-ground')).toBeVisible();

    const metres = await page.evaluate(() =>
      [...document.querySelectorAll('.shared-ground-distance')]
        .filter((el) => !el.classList.contains('shared-ground-distance--same'))
        .map((el) => Number((el.textContent ?? '').replace(/[^\d]/g, ''))),
    );
    expect(metres.length).toBeGreaterThan(0);
    for (const m of metres) {
      expect(m).toBeGreaterThan(0);
      expect(m, 'a neighbour outside the 800 m radius is being listed').toBeLessThanOrEqual(800);
    }
  });

  test('reads entirely in Urdu under ?lang=ur', async ({ page }) => {
    await page.goto('/shrine/data-darbar?lang=ur');
    const section = page.locator('#shared-ground');
    await expect(section).toBeVisible();

    // Same predicate as findLatinLeaks in src/test/utils.tsx, with its sanctioned
    // exceptions. Closing the shrine-name gap in the dictionary is what makes
    // this achievable: before 21 August 2026 two of these names had no Urdu.
    const leaks = await section.evaluate((root) => {
      const allowed = '.coords, a, bdi, [data-latin]';
      const found: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = (node.textContent || '').trim();
        if (!text || !/[A-Za-z]/.test(text)) continue;
        if ((node.parentElement as Element | null)?.closest(allowed)) continue;
        found.push(text.slice(0, 60));
      }
      return [...new Set(found)];
    });
    expect(leaks).toEqual([]);
  });
});
