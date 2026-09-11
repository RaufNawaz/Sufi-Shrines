import { test, expect } from './fixtures';

/**
 * `/coverage` and `/report` are sections of `/about` now, and both old URLs
 * still work.
 *
 * The archive's account of itself was three routes — "About this archive",
 * "What this archive knows", "State of the Archive" — with the same four
 * statistics computed by two different builders and rendered on all three. A
 * reader who asked the obvious question had to discover that two other pages
 * existed. They are one page.
 *
 * Two things then fail silently, which is what this file is for:
 *
 * 1. **A published URL that 404s.** Both were linked from the map's welcome
 *    card, both are in the sitemap, and neither can be recalled from wherever
 *    someone has already sent them. They stay as routes that redirect, and
 *    GitHub Pages still serves a prerendered file for each — so the redirect is
 *    the second thing that happens, not the only thing standing between a
 *    visitor and a 404.
 * 2. **A contents entry pointing at nothing.** The page carries two dozen
 *    sections and a nav built from a hand-written list of ids. Rename a section
 *    id, or drop a section behind a condition, and the link goes quietly inert:
 *    the click does nothing at all, which reads as a broken page rather than a
 *    missing anchor.
 */

test.describe('the merged /about', () => {
  /* The team view. Since 11 September 2026 `/about` has two shapes behind the
     same soft gate as the shrine page's provenance block: a visitor reads six
     short sections, the team reads twenty-four. The redirects below land in
     team-only sections, so every test in this block opens the page as the team
     does. A `?team=1` query cannot be used here — `<Navigate>` drops it — so
     the persisted flag is set before the page loads, which is exactly what a
     `?team=1` visit does on its first load (src/lib/projectAccess.ts). */
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('shrines_team_access', '1');
      } catch {
        // private mode — the test will fail on the section, loudly
      }
    });
  });

  /* Landing means scrolled to, not merely a matching hash in the address bar.
     Client-side navigation keeps a hash and does nothing with it, so a redirect
     that "works" by URL can still drop the reader at the top of a page four
     screens long — and the sections do not exist until the dataset arrives,
     which is after any scroll the browser would have done on its own. */
  for (const { from, section } of [
    { from: '/coverage', section: 'traditions' },
    { from: '/report', section: 'site-status' },
  ]) {
    test(`${from} lands on the section it was sent for`, async ({ page }) => {
      await page.goto(from);
      await page.locator('h1.entity-title').waitFor();
      await expect(page).toHaveURL(new RegExp(`/about#${section}$`));

      const target = page.locator(`#${section}`);
      await target.waitFor();
      await expect
        .poll(() => page.evaluate(() => window.scrollY), { timeout: 10000 })
        .toBeGreaterThan(0);

      /* …and it is the named section that is at the top, not just some scroll
         that happened. */
      const top = await target.evaluate((el) => el.getBoundingClientRect().top);
      expect(Math.abs(top)).toBeLessThan(150);
    });
  }

  /* The Urdu mirrors must land where the English ones land.
     This test used to assert only that the page came up in RTL, and that is
     exactly how the defect it now guards survived: `/ur/coverage` and
     `/ur/report` redirected to a bare `/ur/about`, with **no fragment at all**.
     The scroll effect above reads `window.location.hash`, so an empty hash
     means it returns early every time — an English reader was carried to the
     section and an Urdu reader never was, permanently, not as a race. A page
     that renders in the right direction is not the same as a page that keeps
     its promise, and only the second is the standard here (CLAUDE.md: the Urdu
     experience must be as complete as English). */
  for (const { from, section } of [
    { from: '/ur/coverage', section: 'traditions' },
    { from: '/ur/report', section: 'site-status' },
  ]) {
    test(`${from} lands on the section it was sent for, in Urdu`, async ({ page }) => {
      await page.goto(from);
      await page.locator('h1.entity-title').waitFor();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      /* The `/ur/` prefix is a one-time entry portal: it normalises to
         `?lang=ur` on mount. The fragment must survive that rewrite. */
      await expect(page).toHaveURL(new RegExp(`/about\\?lang=ur#${section}$`));

      const target = page.locator(`#${section}`);
      await target.waitFor();
      await expect
        .poll(() => page.evaluate(() => window.scrollY), { timeout: 10000 })
        .toBeGreaterThan(0);

      const top = await target.evaluate((el) => el.getBoundingClientRect().top);
      expect(Math.abs(top)).toBeLessThan(150);
    });
  }

  test('every contents entry points at a section that exists', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1.entity-title').waitFor();
    /* The lazily-loaded provenance file backs one section, and the whole
       measured block waits on the dataset. Wait for the last section in the
       list rather than a timeout. */
    await page.locator('#corrections').waitFor();
    await page.locator('#how-the-words-were-made').waitFor();

    const hrefs = await page
      .locator('.about-contents .contents-nav-item a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(15);

    const missing: string[] = [];
    for (const href of hrefs) {
      const id = href.replace(/^#/, '');
      if ((await page.locator(`#${id}`).count()) === 0) missing.push(id);
    }
    expect(missing, `contents entries with no section: ${missing.join(', ')}`).toEqual([]);
  });
});

/**
 * And the public view, which is the one almost everyone sees.
 *
 * Six sections, no contents nav, no measured self-account — "what this is, who
 * made it, what it holds, how to cite it, the licence, where to send a
 * correction". The assertions are about presence and absence rather than copy:
 * a team-only section leaking into the public view is the regression this
 * guards, and the contents nav returning is how it would be noticed first.
 */
test.describe('the public /about', () => {
  test('shows the short page and none of the team sections', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1.entity-title').waitFor();
    await page.locator('#cite').waitFor();
    await page.locator('#holds').waitFor();

    await expect(page.locator('.about-credit')).toContainText('Rauf Nawaz');
    await expect(page.locator('.about-credit')).toContainText('Adil Ahsan');
    await expect(page.locator('.about-contents')).toHaveCount(0);
    for (const teamOnly of ['graph', 'trust', 'traditions', 'site-status', 'why']) {
      await expect(page.locator(`#${teamOnly}`), `#${teamOnly} is team-only`).toHaveCount(0);
    }
    for (const publicSection of ['scope', 'holds', 'method', 'licence', 'cite', 'corrections']) {
      await expect(page.locator(`#${publicSection}`)).toHaveCount(1);
    }
    /* No institution and no address anywhere on the public page. */
    await expect(page.locator('main, article').first()).not.toContainText(/Harvard/);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  });
});
