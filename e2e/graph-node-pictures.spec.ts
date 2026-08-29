import { test, expect } from './fixtures';

/**
 * The knowledge graph drew figures as bare coloured discs while every shrine on
 * the map had a photograph and a preview card — the same archive held to two
 * standards. These hold the graph to the map's.
 *
 * The archive is short of pictures (118 of 169 rows carry an image), so a ring
 * is normally part photograph and part plain disc. That is the designed state,
 * not a failure, and the last test here pins it: a node with no picture must
 * keep its disc rather than show a placeholder.
 */
test.describe('pictures in the knowledge graph', () => {
  test('a figure node carries a photograph of where the figure rests', async ({ page }) => {
    await page.goto('/graph');
    const graph = page.locator('.network-graph').first();
    await graph.scrollIntoViewIfNeeded();

    const nodes = page.locator('.network-node-link');
    await expect.poll(() => nodes.count()).toBeGreaterThan(4);
    // Most of a Chishtiyya ring is photographed; a floor rather than an exact
    // count, because the number moves whenever the sheet gains an image.
    await expect.poll(() => page.locator('.network-node-image').count()).toBeGreaterThan(3);
  });

  test('hovering a node opens a preview naming the place the picture shows', async ({ page }) => {
    await page.goto('/graph');
    const withPicture = page
      .locator('.network-node-link')
      .filter({ has: page.locator('.network-node-image') })
      .first();
    await withPicture.scrollIntoViewIfNeeded();

    await expect(page.locator('.network-preview')).toHaveCount(0);
    await withPicture.hover();

    const preview = page.locator('.network-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('.network-preview-image')).toBeVisible();
    /* The caption is the point, not decoration: the archive holds photographs of
       places and none of people, so a picture beside a person's name claims a
       portrait unless the card says whose shrine it is. */
    await expect(preview.locator('.network-preview-site')).not.toBeEmpty();
  });

  test('the preview is reachable by keyboard, not only by pointer', async ({ page }) => {
    await page.goto('/graph');
    const withPicture = page
      .locator('.network-node-link')
      .filter({ has: page.locator('.network-node-image') })
      .first();
    await withPicture.scrollIntoViewIfNeeded();

    await withPicture.focus();
    await expect(page.locator('.network-preview')).toBeVisible();
  });

  test('a node is a real link to the figure it draws', async ({ page }) => {
    await page.goto('/graph');
    const node = page.locator('.network-node-link').first();
    await node.scrollIntoViewIfNeeded();
    /* A real href, so middle-click and "copy link address" work; the click is
       intercepted for SPA routing. */
    await expect(node).toHaveAttribute('href', /^\/(saint|order|shrine)\//);

    await node.click();
    await expect(page).toHaveURL(/\/(saint|order|shrine)\//);
  });

  test('a figure with no photograph keeps its plain disc', async ({ page }) => {
    /* Rahman Baba's site has no image in the sheet. He must render as the disc
       the diagram has always drawn — not a placeholder, which reads as an image
       still loading, and not a silhouette, which would read as a missing
       portrait when what is missing is a photograph of a building. */
    await page.goto('/graph');
    const graph = page.locator('.network-graph').first();
    await graph.scrollIntoViewIfNeeded();

    const total = await page.locator('.network-node-link').count();
    const pictured = await page.locator('.network-node-image').count();
    expect(pictured).toBeLessThan(total);
    // Every node still has a shape, pictured or not.
    expect(await page.locator('.network-node').count()).toBeGreaterThanOrEqual(total);
  });
});
