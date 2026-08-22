import type { Page } from '@playwright/test';
import { test, expect, TOURS, getTour } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

const INDUS = getTour('sufi-indus-valley');
const SIKH_CIRCUIT = getTour('sikh-heritage-circuit');
const TEMPLES = getTour('ancient-sacred-temples');

/** Opens the tour list, opts in, and starts a tour via the preview step. */
async function startTour(page: Page, tourTitle: string) {
  await page.getByRole('switch', { name: UI_TEXT.en.turnOnTours }).click();
  await page.getByText(tourTitle).click();
  await page.getByRole('button', { name: UI_TEXT.en.tourStartButton }).click();
}

test.describe('Guided tours on the map — Phase 1 (route on the map)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('starting a tour draws the route and numbered stop markers', async ({ page }) => {
    await startTour(page, INDUS.title);

    // Route line + numbered stop markers for every stop of this tour.
    await expect(page.locator('.tour-route-line')).toBeVisible();
    await expect(page.locator('.tour-stop-marker')).toHaveCount(INDUS.stops.length);

    // The first stop is highlighted as active.
    await expect(page.locator('.tour-stop-marker--active')).toHaveCount(1);
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('1');

    await expect(page.locator('.tour-step-badge')).toContainText(
      UI_TEXT.en.stopOf(1, INDUS.stops.length),
    );
  });

  test('Next advances the active stop and moves the camera', async ({ page }) => {
    await startTour(page, INDUS.title);
    await expect(page.locator('.tour-step-badge')).toContainText(
      UI_TEXT.en.stopOf(1, INDUS.stops.length),
    );

    await page.getByRole('button', { name: UI_TEXT.en.nextStopAriaLabel }).click();

    await expect(page.locator('.tour-step-badge')).toContainText(
      UI_TEXT.en.stopOf(2, INDUS.stops.length),
    );
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('2');
  });

  test('ending a tour removes the route and restores normal markers', async ({ page }) => {
    await startTour(page, INDUS.title);
    await expect(page.locator('.tour-route-line')).toBeVisible();

    await page.getByRole('button', { name: UI_TEXT.en.endTourAriaLabel }).click();

    await expect(page.locator('.tour-route-line')).toHaveCount(0);
    await expect(page.locator('.tour-stop-marker')).toHaveCount(0);
    await expect(page.locator('.shrine-dot--dimmed')).toHaveCount(0);
  });
});

test.describe('Guided tours on the map — Phase 2 (richer stops)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('switch', { name: UI_TEXT.en.turnOnTours }).click();
  });

  test('tour preview shows stop count, distance, and estimated drive time before starting', async ({
    page,
  }) => {
    await page.getByText(INDUS.title).click();

    const preview = page.locator('.tour-preview');
    await expect(preview).toBeVisible();
    await expect(
      preview.locator('.tour-preview-stat', { hasText: UI_TEXT.en.stopsLabel }),
    ).toContainText(String(INDUS.stops.length));
    await expect(
      preview.locator('.tour-preview-stat', { hasText: UI_TEXT.en.tourTotalDistance }),
    ).toContainText(UI_TEXT.en.kmUnit);
    await expect(
      preview.locator('.tour-preview-stat', { hasText: UI_TEXT.en.tourEstDriveTime }),
    ).toBeVisible();
    await expect(preview.locator('.tour-preview-stops li')).toHaveCount(INDUS.stops.length);
  });

  test('active stop shows an image and its narrative', async ({ page }) => {
    await page.getByText(INDUS.title).click();
    await page.getByRole('button', { name: UI_TEXT.en.tourStartButton }).click();

    await expect(page.locator('.tour-stop-image')).toBeVisible();
    await expect(page.locator('.tour-stop-name')).not.toBeEmpty();
    await expect(page.locator('.tour-narrative')).not.toBeEmpty();
  });
});

test.describe('Guided tours on the map — Phase 3 (shareable & resumable)', () => {
  test('a deep link opens directly into the specified tour and stop', async ({ page }) => {
    await page.goto(`/?tour=${SIKH_CIRCUIT.id}&stop=2`);

    await expect(page.locator('.tour-step-badge')).toContainText(
      UI_TEXT.en.stopOf(3, SIKH_CIRCUIT.stops.length),
    );
    await expect(page.locator('.tour-stop-marker--active')).toHaveText('3');
  });

  test('resuming a tour shows the resume banner and continues at the saved stop', async ({
    page,
  }) => {
    await page.goto('/');
    await startTour(page, SIKH_CIRCUIT.title);
    // The URL/progress sync effect only runs once shrine data has loaded —
    // wait for it so the stop change is actually persisted before exiting.
    await expect(page).toHaveURL(new RegExp(`tour=${SIKH_CIRCUIT.id}`));

    await page.getByRole('button', { name: UI_TEXT.en.nextStopAriaLabel }).click();
    await expect(page.locator('.tour-step-badge')).toContainText(
      UI_TEXT.en.stopOf(2, SIKH_CIRCUIT.stops.length),
    );
    await expect(page).toHaveURL(/stop=1/);

    await page.getByRole('button', { name: UI_TEXT.en.endTourAriaLabel }).click();
    await page.reload();

    await expect(page.locator('.tour-resume-banner')).toBeVisible();
    await page.getByRole('button', { name: UI_TEXT.en.resumeButton }).click();
    await expect(page.locator('.tour-step-badge')).toContainText(
      UI_TEXT.en.stopOf(2, SIKH_CIRCUIT.stops.length),
    );
  });

  test('embed mode hides the site chrome', async ({ page }) => {
    await page.goto('/?embed=1');
    await expect(page.locator('.sidebar-header')).toHaveCount(0);
  });

  test('share button copies a working deep link', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await startTour(page, TEMPLES.title);
    // Wait for the URL to actually reflect the active tour before sharing —
    // the sync effect only runs once shrine data has loaded.
    await expect(page).toHaveURL(new RegExp(`tour=${TEMPLES.id}`));

    await page.getByRole('button', { name: UI_TEXT.en.share }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain(`tour=${TEMPLES.id}`);
  });
});

test.describe('Guided tours on the map — Phase 4 (audio & autoplay)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startTour(page, TEMPLES.title);
  });

  test('the narration play control is present and toggles without crashing', async ({ page }) => {
    const playBtn = page.getByRole('button', { name: UI_TEXT.en.audioPlay });
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
    await page.getByRole('switch', { name: UI_TEXT.en.turnOnTours }).click();
  });

  test('filtering by tradition narrows the tour list', async ({ page }) => {
    await expect(page.locator('.tour-card')).toHaveCount(TOURS.length);

    const sikhTours = TOURS.filter((t) => t.tradition === 'sikh');
    // 'Sikh' mirrors TRADITION_LABELS.sikh.en (tours.ts can't be imported
    // here — its tours.json import trips Playwright's ESM JSON restriction).
    await page
      .getByRole('group', { name: UI_TEXT.en.filterByTradition })
      .getByText('Sikh', { exact: false })
      .click();

    await expect(page.locator('.tour-card')).toHaveCount(sikhTours.length);
    await expect(page.locator('.tour-card-title')).toHaveText(sikhTours.map((t) => t.title));
  });

  test('related tours in the preview navigate to another tour', async ({ page }) => {
    await page.getByText(SIKH_CIRCUIT.title).click();
    await expect(page.locator('.tour-preview-title')).toContainText(SIKH_CIRCUIT.title);

    await page.locator('.tour-related-card').first().click();

    await expect(page.locator('.tour-preview-title')).not.toContainText(SIKH_CIRCUIT.title);
  });

  test('near me degrades gracefully when geolocation is unavailable', async ({ page }) => {
    // Make the API *actually* unavailable — what this test claims to cover.
    // Relying on the browser's un-granted-permission behaviour is not
    // deterministic: the geolocation spec starts the caller's `timeout`
    // only after permission resolves, so on a headless browser where the
    // prompt never resolves (measured on the sandbox's pinned Chromium,
    // 21 Aug 2026), getCurrentPosition neither succeeds nor errors and the
    // app sat in its loading state forever.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'geolocation', { value: undefined });
    });
    await page.getByRole('button', { name: UI_TEXT.en.nearMe }).click();
    await expect(page.getByText(UI_TEXT.en.locationUnavailable)).toBeVisible();
  });

  test('near me highlights the closest tour when geolocation is granted', async ({
    context,
    page,
  }) => {
    await context.grantPermissions(['geolocation']);
    // Coordinates near Lahore — close to the Sikh Heritage Circuit and
    // Sufi Saints tour stops clustered around the city.
    await context.setGeolocation({ latitude: 31.55, longitude: 74.34 });

    // Per-tour distance depends on shrine data having loaded from the CSV —
    // wait for a card to show its computed distance before using Near Me.
    await expect(page.locator('.tour-card-meta').first()).toContainText(UI_TEXT.en.kmUnit);

    await page.getByRole('button', { name: UI_TEXT.en.nearMe }).click();

    await expect(page.locator('.tour-card--nearest')).toHaveCount(1);
    await expect(page.locator('.tour-card-nearest-badge')).toBeVisible();
  });

  test('print itinerary button is present on an active tour', async ({ page }) => {
    await page.getByText(TEMPLES.title).click();
    await page.getByRole('button', { name: UI_TEXT.en.tourStartButton }).click();

    await expect(page.getByRole('button', { name: UI_TEXT.en.printItinerary })).toBeVisible();
    await expect(page.locator('.tour-print-itinerary')).toBeAttached();
  });
});
