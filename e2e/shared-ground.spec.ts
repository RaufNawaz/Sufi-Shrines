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

/**
 * The archive-wide page.
 *
 * The section above answers "who else is here" for one site. This answers
 * "where does this archive's subject matter overlap", which is the question the
 * shared-ground phase was proposed for and the half of Track A that never
 * shipped: `crossTraditionAdjacencies()` was exported and tested on 21 August
 * 2026 and nothing rendered it.
 *
 * Two of the rules carry over unchanged — a shared pin is never a distance, and
 * nothing outside the radius appears — and one is new: **the page must never
 * present a group.** Chaining adjacency into complexes produces a single
 * 15-site "courtyard" 3,358 m across, and the reason the page is a flat list of
 * pairs is that a pair cannot be read as a claim about a place.
 */
test.describe('/shared-ground', () => {
  test('lists the crossings, with the traditions that meet', async ({ page }) => {
    await page.goto('/shared-ground');
    await expect(page.locator('h1.entity-title')).toBeVisible();

    await expect(page.locator('.crossing')).not.toHaveCount(0);
    await expect(page.locator('.sg-meeting')).not.toHaveCount(0);

    // Every row names two sites, both linked to their own entry — the page is a
    // way into the archive, not a terminus.
    const first = page.locator('.crossing').first();
    await expect(first.locator('a[href*="/shrine/"]')).toHaveCount(2);
  });

  test('the counts on the page are the counts in the list', async ({ page }) => {
    /* The headline sentence is computed from the same overview the rows are, so
       this is a check that the page renders all of what it counted. A page whose
       summary and body disagree is the failure mode /about exists to avoid. */
    await page.goto('/shared-ground');
    await expect(page.locator('.crossing').first()).toBeVisible();

    const rows = await page.locator('.crossing').count();
    const headline = (await page.locator('.sg-headline').innerText()).replace(/[^\d]/g, ' ');
    const [cross] = headline.trim().split(/\s+/).map(Number);
    expect(cross).toBe(rows);

    // And the meetings partition the rows: no pair counted twice, none lost.
    const counts = await page.locator('.sg-meeting-count').allInnerTexts();
    const summed = counts.reduce((sum, text) => sum + Number(text.replace(/[^\d]/g, '')), 0);
    expect(summed).toBe(rows);
  });

  test('a shared pin is never rendered as a measured distance', async ({ page }) => {
    await page.goto('/shared-ground');
    await expect(page.locator('.crossing').first()).toBeVisible();

    const same = page.locator('.crossing-distance--same');
    await expect(same, 'two recorded pairs share one pin').not.toHaveCount(0);
    for (const text of await same.allInnerTexts()) {
      expect(text, 'a shared pin is showing a number').not.toMatch(/\d/);
    }
  });

  test('every distance shown is inside the stated radius', async ({ page }) => {
    await page.goto('/shared-ground');
    await expect(page.locator('.crossing').first()).toBeVisible();

    const metres = await page.evaluate(() =>
      [...document.querySelectorAll('.crossing-distance')]
        .filter((el) => !el.classList.contains('crossing-distance--same'))
        .map((el) => Number((el.textContent ?? '').replace(/[^\d]/g, ''))),
    );
    expect(metres.length).toBeGreaterThan(0);
    for (const m of metres) {
      expect(m).toBeGreaterThan(0);
      expect(m, 'a pair outside the 800 m radius is being listed').toBeLessThanOrEqual(800);
    }
    // Sorted, nearest first — the heading says so, and the column is read down.
    expect(metres).toEqual([...metres].sort((a, b) => a - b));
  });

  test('is reachable from a shrine that has shared ground, and from the map', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('#shared-ground a[href$="/shared-ground"]').click();
    await expect(page.locator('h1.entity-title')).toBeVisible();
    await expect(page.locator('.crossing').first()).toBeVisible();

    await page.goto('/');
    await expect(page.locator('.welcome-card-links a[href$="/shared-ground"]')).toHaveCount(1);
  });

  test('reads entirely in Urdu under ?lang=ur', async ({ page }) => {
    await page.goto('/shared-ground?lang=ur');
    await expect(page.locator('.crossing').first()).toBeVisible();

    const leaks = await page.locator('#main-content').evaluate((root) => {
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
