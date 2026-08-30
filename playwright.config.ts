import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /* Refuses to run against a `dist/` built for the wrong base path — see
     e2e/global-setup.ts. A plain `npm run build` leaves one, `npm run e2e` does
     not build, and the resulting run exits 0 while testing nothing. */
  globalSetup: './e2e/global-setup.ts',
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
    //
    // Lets a sandbox point the suite at a Chromium it already has. Without it,
    // every spec fails identically in 2ms with "Executable doesn't exist at
    // …/chromium_headless_shell-<build>", which reads like a broken suite rather
    // than a missing download — and `npx playwright install` is not always
    // available (the Claude Code web sandbox pre-installs a *pinned* build under
    // /opt/pw-browsers and blocks the download). Both names are accepted because
    // two branches added this independently and both are written down in
    // runbooks. Unset on a normal machine, so nothing changes there.
    //   PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npm run e2e
    launchOptions: {
      args: ['--mute-audio'],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? {
            executablePath:
              process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_PATH,
          }
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
