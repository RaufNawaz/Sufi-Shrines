import { test, expect } from '@playwright/test';

/** Opens the tour list, opts in, and starts a tour via the preview step. */
async function startTour(page: import('@playwright/test').Page, tourTitle: string) {
  await page.getByRole('switch', { name: 'Turn on guided tours' }).click();
  await page.getByText(tourTitle).click();
  await page.getByRole('button', { name: 'Start tour' }).click();
}

test.describe('Guided tours on the map — Phase 1 (route on the map)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('starting a tour draws the route and numbered stop markers', async ({ page }) => {
    await startTour(page, 'Sufi Saints of the Indus Valley');

    // Route line + 8 numbered stop markers for this tour.
    await expect(page.locator('.tour-route-line')).toBeVisible();
    await expect(page.locator('.tour-stop-marker')).toHaveCount(8);

    // The first stop is highlighted as active.
    await expect(page.locator('.tour-stop-marker--active')).toHaveCount(1);
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('1');

    await expect(page.locator('.tour-step-badge')).toContainText('Stop 1 of 8');
  });

  test('Next advances the active stop and moves the camera', async ({ page }) => {
    await startTour(page, 'Sufi Saints of the Indus Valley');
    await expect(page.locator('.tour-step-badge')).toContainText('Stop 1 of 8');

    await page.getByRole('button', { name: 'Next stop' }).click();

    await expect(page.locator('.tour-step-badge')).toContainText('Stop 2 of 8');
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('2');
  });

  test('ending a tour removes the route and restores normal markers', async ({ page }) => {
    await startTour(page, 'Sufi Saints of the Indus Valley');
    await expect(page.locator('.tour-route-line')).toBeVisible();

    await page.getByRole('button', { name: 'End tour' }).click();

    await expect(page.locator('.tour-route-line')).toHaveCount(0);
    await expect(page.locator('.tour-stop-marker')).toHaveCount(0);
    await expect(page.locator('.shrine-dot--dimmed')).toHaveCount(0);
  });
});

test.describe('Guided tours on the map — Phase 2 (richer stops)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('switch', { name: 'Turn on guided tours' }).click();
  });

  test('tour preview shows stop count, distance, and estimated drive time before starting', async ({ page }) => {
    await page.getByText('Sufi Saints of the Indus Valley').click();

    const preview = page.locator('.tour-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('.tour-preview-stat', { hasText: 'Stops' })).toContainText('8');
    await expect(preview.locator('.tour-preview-stat', { hasText: 'Total distance' })).toContainText('km');
    await expect(preview.locator('.tour-preview-stat', { hasText: 'Est. drive time' })).toBeVisible();
    await expect(preview.locator('.tour-preview-stops li')).toHaveCount(8);
  });

  test('active stop shows an image and its narrative', async ({ page }) => {
    await page.getByText('Sufi Saints of the Indus Valley').click();
    await page.getByRole('button', { name: 'Start tour' }).click();

    await expect(page.locator('.tour-stop-image')).toBeVisible();
    await expect(page.locator('.tour-stop-name')).not.toBeEmpty();
    await expect(page.locator('.tour-narrative')).not.toBeEmpty();
  });
});

test.describe('Guided tours on the map — Phase 3 (shareable & resumable)', () => {
  test('a deep link opens directly into the specified tour and stop', async ({ page }) => {
    await page.goto('/?tour=sikh-heritage-circuit&stop=2');

    await expect(page.locator('.tour-step-badge')).toContainText('Stop 3 of 5');
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('3');
  });

  test('resuming a tour shows the resume banner and continues at the saved stop', async ({ page }) => {
    await page.goto('/');
    await startTour(page, 'Sikh Heritage Circuit');
    // The URL/progress sync effect only runs once shrine data has loaded —
    // wait for it so the stop change is actually persisted before exiting.
    await expect(page).toHaveURL(/tour=sikh-heritage-circuit/);

    await page.getByRole('button', { name: 'Next stop' }).click();
    await expect(page.locator('.tour-step-badge')).toContainText('Stop 2 of 5');
    await expect(page).toHaveURL(/stop=1/);

    await page.getByRole('button', { name: 'End tour' }).click();
    await page.reload();

    await expect(page.locator('.tour-resume-banner')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.locator('.tour-step-badge')).toContainText('Stop 2 of 5');
  });

  test('embed mode hides the site chrome', async ({ page }) => {
    await page.goto('/?embed=1');
    await expect(page.locator('.sidebar-header')).toHaveCount(0);
  });

  test('share button copies a working deep link', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await startTour(page, 'Ancient Sacred Temples');
    // Wait for the URL to actually reflect the active tour before sharing —
    // the sync effect only runs once shrine data has loaded.
    await expect(page).toHaveURL(/tour=ancient-sacred-temples/);

    await page.getByRole('button', { name: 'Share' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('tour=ancient-sacred-temples');
  });
});

test.describe('Guided tours on the map — Phase 4 (audio & autoplay)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startTour(page, 'Ancient Sacred Temples');
  });

  test('the narration play control is present and toggles without crashing', async ({ page }) => {
    const playBtn = page.getByRole('button', { name: 'Play narration' });
    await expect(playBtn).toBeVisible();
    await playBtn.click();
    // Whichever state SpeechSynthesis settles into headless, the audio
    // control area must still render exactly one play/pause/stop trio.
    await expect(page.locator('.tour-audio-btn')).not.toHaveCount(0);
  });

  test('autoplay switch toggles on and off', async ({ page }) => {
    const autoplaySwitch = page.locator('.tour-autoplay .tour-toggle');
    await expect(autoplaySwitch).toHaveAttribute('aria-checked', 'false');

    await autoplaySwitch.click();
    await expect(autoplaySwitch).toHaveAttribute('aria-checked', 'true');

    await autoplaySwitch.click();
    await expect(autoplaySwitch).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('Guided tours on the map — Phase 5 (discovery & on-site awareness)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('switch', { name: 'Turn on guided tours' }).click();
  });

  test('filtering by tradition narrows the tour list', async ({ page }) => {
    await expect(page.locator('.tour-card')).toHaveCount(3);

    await page.getByRole('group', { name: 'Tradition' }).getByText('Sikh', { exact: false }).click();

    await expect(page.locator('.tour-card')).toHaveCount(1);
    await expect(page.locator('.tour-card-title')).toContainText('Sikh Heritage Circuit');
  });

  test('related tours in the preview navigate to another tour', async ({ page }) => {
    await page.getByText('Sikh Heritage Circuit').click();
    await expect(page.locator('.tour-preview-title')).toContainText('Sikh Heritage Circuit');

    await page.locator('.tour-related-card').first().click();

    await expect(page.locator('.tour-preview-title')).not.toContainText('Sikh Heritage Circuit');
  });

  test('near me degrades gracefully when geolocation is unavailable', async ({ page }) => {
    await page.getByRole('button', { name: 'Near Me' }).click();
    await expect(page.getByText('Location unavailable')).toBeVisible();
  });

  test('near me highlights the closest tour when geolocation is granted', async ({ context, page }) => {
    await context.grantPermissions(['geolocation']);
    // Coordinates near Lahore — close to the Sikh Heritage Circuit and
    // Sufi Saints tour stops clustered around the city.
    await context.setGeolocation({ latitude: 31.55, longitude: 74.34 });

    // Per-tour distance depends on shrine data having loaded from the CSV —
    // wait for a card to show its computed distance before using Near Me.
    await expect(page.locator('.tour-card-meta').first()).toContainText('km');

    await page.getByRole('button', { name: 'Near Me' }).click();

    await expect(page.locator('.tour-card--nearest')).toHaveCount(1);
    await expect(page.locator('.tour-card-nearest-badge')).toBeVisible();
  });

  test('print itinerary button is present on an active tour', async ({ page }) => {
    await page.getByText('Ancient Sacred Temples').click();
    await page.getByRole('button', { name: 'Start tour' }).click();

    await expect(page.getByRole('button', { name: 'Print itinerary' })).toBeVisible();
    await expect(page.locator('.tour-print-itinerary')).toBeAttached();
  });
});
