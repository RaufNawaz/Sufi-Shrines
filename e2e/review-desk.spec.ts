import { test, expect } from './fixtures';
import { settle } from './fixtures';

/**
 * The review desk.
 *
 * It exists so the archive's 218 unreviewed claims stop being a number it
 * publishes and become a number it can reduce
 * (docs/planning/REVIEW_DESK_2026-08-24.md). Three things need a browser to
 * check, and all three are properties a unit test cannot see:
 *
 * 1. **The gate holds.** Visibility, not security — but a public reader must not
 *    land in editorial detail by following a link.
 * 2. **A verdict survives a reload.** The whole point of storing them is that a
 *    volunteer can close a laptop mid-queue; if that fails, the page is a form
 *    that loses work.
 * 3. **The queue is not in the eager bundle.** Asserted by the bundle budget on
 *    every build, and here by the page rendering its claims only after the
 *    dynamic import resolves.
 */
test.describe('the review desk', () => {
  test('is closed to a reader without the team link', async ({ page }) => {
    await page.goto('/review');
    await page.locator('h1.entity-title').first().waitFor();
    await settle(page);
    await expect(page.locator('.review-item')).toHaveCount(0);
    await expect(page.locator('.review-list')).toHaveCount(0);
  });

  test('shows the queue with its evidence to the team', async ({ page }) => {
    await page.goto('/review?team=1');
    await page.locator('.review-item').first().waitFor();
    const items = page.locator('.review-item');
    /* 218 today. A floor rather than the exact number, because a review pass
       landing verdicts should shrink this queue without failing its own test. */
    expect(await items.count()).toBeGreaterThan(50);

    const first = items.first();
    /* The claim, and the sentence it was read out of. A verdict without the
       quote in front of it is a guess. */
    await expect(first.locator('.review-claim')).not.toBeEmpty();
    await expect(
      page.locator('.review-item .graph-lineage-quote').first(),
      'no quoted evidence anywhere in the queue',
    ).toBeVisible();
  });

  test('records a verdict, and it survives a reload', async ({ page }) => {
    await page.goto('/review?team=1');
    await page.locator('.review-item').first().waitFor();

    const confirm = page.locator('.review-item').first().locator('.review-verdict--confirm');
    await expect(confirm).toHaveAttribute('aria-pressed', 'false');
    await confirm.click();
    await expect(confirm).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.review-progress')).toContainText('1');
    /* Nothing to download until there is a verdict — the button says so rather
       than handing over an empty file. */
    await expect(page.locator('.review-download')).toBeEnabled();

    await page.reload();
    await page.locator('.review-item').first().waitFor();
    await expect(
      page.locator('.review-item').first().locator('.review-verdict--confirm'),
      'the verdict did not survive a reload — a reviewer would lose their session',
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('a second click on the recorded verdict takes it back', async ({ page }) => {
    await page.goto('/review?team=1');
    await page.locator('.review-item').first().waitFor();
    const reject = page.locator('.review-item').first().locator('.review-verdict--reject');
    await reject.click();
    await expect(reject).toHaveAttribute('aria-pressed', 'true');
    await reject.click();
    await expect(reject).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.review-download')).toBeDisabled();
  });

  test('every control is a 44px target', async ({ page }) => {
    await page.goto('/review?team=1');
    await page.locator('.review-item').first().waitFor();
    for (const selector of [
      '.review-verdict--confirm',
      '.review-verdict--reject',
      '.review-download',
    ]) {
      const box = await page.locator(selector).first().boundingBox();
      expect(box, selector).toBeTruthy();
      expect(box!.height, selector).toBeGreaterThanOrEqual(44);
    }
  });

  test('never offers to edit the claim itself', async ({ page }) => {
    /* The one rule this page must not break: a verdict is a judgement *about* a
       claim, and letting a reviewer retype a date would put an unsourced value
       into a provenance archive through its provenance tooling. The only writable
       field on the page is the reviewer's own note. */
    await page.goto('/review?team=1');
    await page.locator('.review-item').first().waitFor();
    const writable = page.locator(
      '.review-item input, .review-item textarea, .review-item [contenteditable="true"]',
    );
    const count = await writable.count();
    for (let i = 0; i < count; i++) {
      await expect(writable.nth(i)).toHaveClass(/review-note/);
    }
  });
});
