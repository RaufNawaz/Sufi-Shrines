import { test, expect, settle } from './fixtures';

/**
 * A map marker that carries a photograph has to be able to find out when that
 * photograph has stopped existing.
 *
 * 242 of the sheet's image URLs sit on hosts this project does not control —
 * Wikimedia, a heritage blog, a government API — and an archive built to
 * outlive its author will lose more of them. The marker was a CSS
 * `background-image`, and **a background that 404s fires no event at all**, so
 * a rotted photograph kept its 30px photo size and painted a flat category
 * disc: a large blank circle among photographs, where the 14px dot is what a
 * site with no picture correctly gets.
 *
 * The photograph is now an `<img>` inside the icon, which reports its own
 * failure on the one request the marker was going to make anyway, and a
 * failure demotes the pin to the plain dot — the same fallback `ShrineImage`
 * gives every other picture in the archive.
 *
 * The fixture serves a blank PNG for every external image, so exactly one URL
 * fails here and exactly one pin may demote. That is the assertion: an earlier
 * attempt at this (HANDOVER §9.141) demoted five markers where its instrument
 * could see one failure, and was correctly reverted.
 */
test.describe('a marker photograph that cannot load', () => {
  test('demotes its pin to the plain dot, and only its own', async ({ page }) => {
    await page.goto('/');
    await page.locator('.shrine-dot').first().waitFor();
    await settle(page);

    const dots = await page.locator('.shrine-dot').count();
    const photosBefore = await page.locator('.shrine-dot--photo').count();
    expect(photosBefore, 'no marker is carrying a photograph to break').toBeGreaterThan(0);

    const doomed = await page.locator('.shrine-dot__photo').first().getAttribute('src');
    expect(doomed).toBeTruthy();
    /* The sheet points more than one entry at the same file often enough that
       this cannot be assumed to be one marker — so count them rather than
       assume, or the expectation below is a coin toss on which URL came first. */
    const sharing = await page.locator(`.shrine-dot__photo[src="${doomed}"]`).count();

    await page.route(doomed!, (route) => route.abort());
    await page.reload();
    await page.locator('.shrine-dot').first().waitFor();
    await settle(page);
    // The demotion happens on the image's error event, which arrives after
    // first paint.
    await expect(page.locator('.shrine-dot--photo')).toHaveCount(photosBefore - sharing);

    expect(await page.locator('.shrine-dot').count(), 'a marker went missing entirely').toBe(dots);
    expect(
      await page.locator(`.shrine-dot__photo[src="${doomed}"]`).count(),
      'the broken photograph is still in the DOM',
    ).toBe(0);
  });

  test('a pin that keeps its photograph keeps its 30px size', async ({ page }) => {
    /* The other half of the claim: demotion is a size change, so a test that
       only counted classes could pass with every pin drawn at 14px. */
    await page.goto('/');
    await page.locator('.shrine-dot--photo').first().waitFor();
    await settle(page);

    const sizes = await page.evaluate(() => {
      const photo = document.querySelector('.shrine-dot--photo');
      const plain = document.querySelector('.shrine-dot:not(.shrine-dot--photo)');
      return {
        photo: photo ? Math.round(photo.getBoundingClientRect().width) : null,
        plain: plain ? Math.round(plain.getBoundingClientRect().width) : null,
      };
    });
    expect(sizes.photo).toBe(30);
    expect(sizes.plain).toBe(14);
  });
});
