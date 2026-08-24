import { test, expect } from './fixtures';

/**
 * An Urdu reader never sees an English frame, even when the strings arrive late.
 *
 * The Urdu interface table is a 22 KB chunk now, and `t()` falls back to English
 * for a table that has not loaded. That fallback is the right safety net and
 * exactly the wrong first frame: a page reading English under an Urdu toggle has
 * told the reader which language the site thinks is real, and "equally excellent
 * in both languages" is the archive's stated bar.
 *
 * `main.tsx` therefore awaits the table before `createRoot().render()`. Nothing
 * in the existing Urdu suite can prove that: every one of those tests waits for
 * the page to settle, so a 200ms English flash passes them all. The only way to
 * see it is to make the chunk slow on purpose and look during the wait.
 *
 * What "correct" means here is deliberately two-sided. While the strings are in
 * flight the page may be **empty** — that is the gate working. What it may never
 * be is **English**. So this asserts the absence of English chrome rather than
 * the presence of a spinner.
 */

const URDU_CHUNK = /uiStrings\.ur-[^/]*\.js$/;

test('the Urdu view shows no English chrome while its strings are in flight', async ({ page }) => {
  let chunkRequested = false;

  await page.route(URDU_CHUNK, async (route) => {
    chunkRequested = true;
    // Long enough that an ungated render would certainly have painted by now.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });

  await page.goto('/ur/about/', { waitUntil: 'commit' });

  /* Sampled repeatedly *during* the delay rather than once: a flash is a frame,
     and one well-timed screenshot misses it. */
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    const text = await page.evaluate(() => document.getElementById('root')?.textContent ?? '');
    if (text.trim()) seen.push(text.slice(0, 400));
    await page.waitForTimeout(120);
  }

  expect(chunkRequested, 'the Urdu strings chunk was never requested — is the split gone?').toBe(
    true,
  );

  /* Every non-empty frame observed while the table was still loading must be
     Urdu. `About this archive` is the English page title; its presence is the
     failure this whole phase is about. */
  const englishFrames = seen.filter((t) => /About this archive|Scope|How it is built/.test(t));
  expect(
    englishFrames,
    'the Urdu page painted English chrome while its strings were still loading — ' +
      'main.tsx is rendering before loadUiStrings() resolves',
  ).toEqual([]);
});

test('and once they arrive the page is Urdu', async ({ page }) => {
  /* The other half: proving the gate does not simply never render. A test that
     only checks "no English" passes on a page that stays blank forever. */
  await page.goto('/ur/about/');
  await page.locator('h1').first().waitFor();
  const heading = await page.locator('h1').first().textContent();
  expect(heading ?? '').toMatch(/[؀-ۿ]/);
  expect(heading ?? '').not.toMatch(/About this archive/);
});
