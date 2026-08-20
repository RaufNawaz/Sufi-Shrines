import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // The PWA service worker registers a StaleWhileRevalidate route for the
    // Google Sheets CSV; SW-issued fetches bypass Playwright's request
    // interception, so block SW registration to keep e2e/fixtures.ts's CSV
    // intercept (and therefore the whole suite) hermetic.
    serviceWorkers: 'block',
    // The tour specs exercise narration and autoplay, which drive real speech
    // synthesis — a test run would play audio out of the developer's speakers
    // with no warning. A test suite should never make noise.
    // PLAYWRIGHT_CHROMIUM_PATH lets a sandbox that has a Chromium build but
    // not the exact revision this @playwright/test pins point the runner at
    // the one it has, instead of downloading (often impossible offline, and
    // the repo must not depend on it). Unset in CI, so CI behaviour is
    // unchanged. Example:
    //   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e
    launchOptions: {
      args: ['--mute-audio'],
      ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
        : {}),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
