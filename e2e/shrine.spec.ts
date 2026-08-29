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

test.describe('A site held by two figures reaches both of them', () => {
  /* Three rows out of 169 name two people. Rori Sahib is Guru Nanak *and* Bhai
     Mardana; before 28 August 2026 a merge-variant entry resolved that cell to
     "Guru Nanak" alone and Bhai Mardana was in the graph nowhere at all. The
     graph fix landed that day; the summary line kept linking only the first
     figure until this test existed. */
  const COMPOSITE_SLUG = 'gurdwara-rori-sahib';

  test('links each named figure to its own page', async ({ page }) => {
    await page.goto(`/shrine/${COMPOSITE_SLUG}`);

    const figureLinks = page.locator('.shrine-summary-meta-item a.meta-entity-link');
    await expect(figureLinks).toHaveCount(2);
    await expect(figureLinks.nth(0)).toHaveAttribute('href', '/saint/guru-nanak');
    await expect(figureLinks.nth(1)).toHaveAttribute('href', '/saint/bhai-mardana');

    /* The second figure is the one every earlier handling dropped, so follow
       that one — a link that renders and 404s is the same bug wearing a hat. */
    await figureLinks.nth(1).click();
    await expect(page).toHaveURL('/saint/bhai-mardana');
    await expect(page.locator('h1')).toContainText('Bhai Mardana');
  });

  test('the recorded cell survives verbatim in the facts panel', async ({ page }) => {
    /* The summary line shows canonical names because it renders one link per
       figure; the sheet's own wording has to remain somewhere on the page or
       the archive is paraphrasing its source (RULE 2). */
    await page.goto(`/shrine/${COMPOSITE_SLUG}`);
    await expect(page.locator('.shrine-infobox')).toContainText('Guru Nanak and Bhai Mardana');
  });

  test('reads in Urdu with both figures named in Urdu', async ({ page }) => {
    await page.goto(`/shrine/${COMPOSITE_SLUG}?lang=ur`);

    const figureLinks = page.locator('.shrine-summary-meta-item a.meta-entity-link');
    await expect(figureLinks).toHaveCount(2);
    /* Not a spot check on one name: the whole reason this file exists is that
       Bhai Mardana was the figure that kept getting dropped, and he is the one
       whose dictionary entry is newest. */
    await expect(figureLinks.nth(0)).toContainText('گرو نانک');
    await expect(figureLinks.nth(1)).toContainText('بھائی مردانہ');
  });

  test('a cell naming a different monument\u2019s figure does not label the link', async ({
    page,
  }) => {
    /* Tomb of Javindi Bibi's `Sufi Saint` cell reads "Jalaluddin Surkh-Posh
       Bukhari" — a different monument's figure. The graph points at Bibi
       Jawindi. If the label came from the cell, this page would print a man's
       name over a link to a woman's page. */
    await page.goto('/shrine/tomb-of-javindi-bibi');

    const figureLink = page.locator('.shrine-summary-meta-item a.meta-entity-link');
    await expect(figureLink).toHaveCount(1);
    await expect(figureLink).toHaveAttribute('href', '/saint/bibi-jawindi');
    await expect(figureLink).toContainText('Bibi Jawindi');
    await expect(figureLink).not.toContainText('Jalaluddin');

    /* The sheet's own wording still has to be on the page somewhere (RULE 2),
       and the infobox is where it lives. */
    await expect(page.locator('.shrine-infobox')).toContainText('Jalaluddin Surkh-Posh Bukhari');
  });

  test('an ordinary single-figure row still renders exactly one link', async ({ page }) => {
    /* The guard on the guard: a change that fanned every row out into multiple
       links would pass all three tests above. */
    await page.goto(`/shrine/${TEST_SLUG}`);
    await expect(page.locator('.shrine-summary-meta-item a.meta-entity-link')).toHaveCount(1);
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
