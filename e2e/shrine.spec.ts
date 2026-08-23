import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

const TEST_SLUG = 'data-darbar';
const TEST_NAME = 'Data Darbar';

test.describe('Shrine detail page', () => {
  test('renders title, breadcrumb, and article', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);

    await expect(page.locator('h1.shrine-title')).toBeVisible();
    await expect(page.locator('h1.shrine-title')).toContainText(TEST_NAME);

    await expect(page.locator('.shrine-breadcrumb')).toBeVisible();
    await expect(page.locator('article.shrine-page')).toBeVisible();
  });

  test('pre-rendered page has correct document title', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);
    await expect(page).toHaveTitle(new RegExp(TEST_NAME));
  });

  test('back-to-map link returns to map', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);

    await page.getByRole('link', { name: UI_TEXT.en.backToMap }).first().click();

    await expect(page).toHaveURL('/');
  });

  test('share button copies link to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/shrine/${TEST_SLUG}`);

    await page.getByRole('button', { name: UI_TEXT.en.share }).click();

    // Toast appears briefly
    await expect(page.locator('.share-toast--visible')).toBeVisible();
  });

  test('the urs block deep-links into the almanac at this shrine', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    // Data Darbar's Events carry a day-precise Hijri urs (18-20 Safar), so
    // the block must render, flag the projection approximate, and land the
    // reader on this shrine's anchored card in the almanac.
    const block = page.locator('.shrine-observances');
    await expect(block).toBeVisible();
    await expect(block.locator('.almanac-flag--approximate')).toBeVisible();

    await block.locator('.shrine-observances-link').click();
    await expect(page).toHaveURL(/\/almanac#data-darbar$/);
    await expect(page.locator('#data-darbar')).toBeVisible();
  });

  test('the urs block hands the reader a real .ics file for this shrine', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    const block = page.locator('.shrine-observances');
    await expect(block).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await block.getByRole('button', { name: UI_TEXT.en.almanacDownloadIcs }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('urs-data-darbar.ics');
  });

  test('prints as a handout: article and facts stay, chrome and map go', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();
    await page.emulateMedia({ media: 'print' });

    // Keeps: the article, the fact sheet, and a provenance footer — a
    // printed page has left the site, so it must carry its own source line.
    await expect(page.locator('.article-section').first()).toBeVisible();
    await expect(page.locator('.shrine-infobox')).toBeVisible();
    await expect(page.locator('.shrine-print-provenance')).toBeVisible();

    // Drops: navigation chrome, the map (grey tiles on paper), related
    // grids, and the interactive citation disclosure.
    await expect(page.locator('.shrine-page-header')).toBeHidden();
    await expect(page.locator('.location-section')).toBeHidden();
    await expect(page.locator('.related-shrines').first()).toBeHidden();
    await expect(page.locator('.cite-entry')).toBeHidden();
  });

  test('unknown slug redirects to map', async ({ page }) => {
    await page.goto('/shrine/this-shrine-does-not-exist-xyz123');
    await expect(page).toHaveURL('/');
  });

  test('clicking a related shrine card lands at the top of the new page', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);

    // Scroll deep into the page first — this is what previously left the
    // next page rendered mid-scroll instead of at the top.
    const relatedCard = page.locator('.related-card').first();
    await relatedCard.scrollIntoViewIfNeeded();
    const scrollYBeforeClick = await page.evaluate(() => window.scrollY);
    expect(scrollYBeforeClick).toBeGreaterThan(0);

    await relatedCard.click();
    await expect(page.locator('h1.shrine-title')).toBeVisible();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('Nearby Auqaf mosques (women’s prayer access)', () => {
  test('shows survey answers, distance-sorted, the shrine’s own mosque first', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    const block = page.locator('.nearby-mosques');
    await expect(block).toBeVisible();

    // The survey's Shrine Name join key ranks Fixture A first with the badge;
    // the Karachi fixture is out of range and must not appear.
    const names = block.locator('.nearby-mosque-name a');
    await expect(names.first()).toHaveText('Jamia Masjid Fixture A');
    await expect(block.locator('.nearby-mosque-own')).toHaveCount(1);
    await expect(block).not.toContainText('Fixture Far');

    // The women's answer is the survey's, as recorded.
    const womens = block.locator('.nearby-mosque-womens');
    await expect(womens.first()).toContainText('Yes');
    await expect(womens.nth(1)).toContainText('No');

    // Deep link replicates the Awqaf site's id contract.
    await expect(names.first()).toHaveAttribute(
      'href',
      'https://raufnawaz.github.io/Awqaf/mosque.html?id=FIX-1-0',
    );
  });

  test('reads in Urdu — answers localized, survey names sanctioned via bdi', async ({ page }) => {
    await page.goto('/shrine/data-darbar?lang=ur');
    const block = page.locator('.nearby-mosques');
    await expect(block).toBeVisible();
    await expect(block.locator('#mosques-heading')).toHaveText('قریبی اوقاف مساجد');
    await expect(block.locator('.nearby-mosque-womens').first()).toContainText('ہاں');
    // English survey names appear only inside <bdi lang="en">.
    await expect(block.locator('bdi[lang="en"]').first()).toContainText('Fixture A');
  });
});

test.describe('Source notes — where the source contradicts itself', () => {
  test('the disclosure lists the survey’s contradictions, attributed, none withheld', async ({
    page,
  }) => {
    await page.goto('/shrine/darbar-abul-muali-qadri');
    const details = page.locator('.source-notes-details');
    await expect(details).toBeVisible();
    await details.locator('summary').click();

    const items = details.locator('.source-notes-list li');
    await expect(items).toHaveCount(7);
    // The sensitive property claim is present AND framed as the survey's
    // statement (the 22 Aug ruling: attribute everything, withhold nothing).
    await expect(details).toContainText('Dyal Singh College');
    await expect(details).toContainText('strictly as the survey');
  });

  test('entries without notes show no disclosure', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();
    await expect(page.locator('.source-notes')).toHaveCount(0);
  });

  test('reads fully in Urdu', async ({ page }) => {
    await page.goto('/shrine/darbar-malik-ahmad-ayaz?lang=ur');
    const details = page.locator('.source-notes-details');
    await expect(details).toBeVisible();
    await expect(details.locator('summary')).toContainText('جہاں ماخذ خود اپنے بیان سے ٹکراتا ہے');
    await details.locator('summary').click();
    const text = await details.locator('.source-notes-list').textContent();
    expect(text, 'Urdu source notes must carry no Latin').not.toMatch(/[A-Za-z]/);
  });
});
