import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The tradition pages.
 *
 * `/order/:slug` covers Sufi affiliation and every order in the graph is Sufi.
 * These are the other traditions the corpus names and describes — Nath, Udasi,
 * Pranami, Swaminarayan, Daduvansi, Shakti Peetha, Nanakpanthi, Sevapanthi —
 * built as a data layer by the knowledge-base session and rendered here. See
 * `docs/briefs/TRADITION_LAYER.md` and HANDOVER §9.136.
 *
 * **Every page, not a sample.** The list is read from the data file rather than
 * hardcoded, because the bug this file exists to prevent was exactly a page
 * that a two-page spot check did not visit: `daduvansi` is the one record with
 * no `alsoKnownAs` key, the page read `.length` off it, and it rendered blank
 * with a TypeError. Six of eight looked perfect.
 */
const doc = JSON.parse(readFileSync(join(process.cwd(), 'data', 'kg-traditions.json'), 'utf8')) as {
  traditions: { slug: string; name: string; nameUr: string }[];
  memberships: { traditionSlug: string; shrineSlug: string }[];
};

test.describe('the tradition pages', () => {
  for (const tradition of doc.traditions) {
    test(`/tradition/${tradition.slug} renders, in both languages`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));

      await page.goto(`/tradition/${tradition.slug}`);
      await expect(page.locator('h1.entity-title')).toContainText(tradition.name);
      await expect(page.locator('.tradition-definition')).not.toBeEmpty();
      await expect(page.locator('.tradition-definition-source')).toBeVisible();

      const expected = doc.memberships.filter((m) => m.traditionSlug === tradition.slug).length;
      await expect(page.locator('.tradition-member')).toHaveCount(expected);
      // Every member states its evidence — the layer's whole claim.
      await expect(page.locator('.tradition-member blockquote')).toHaveCount(expected);

      await page.goto(`/tradition/${tradition.slug}?lang=ur`);
      await expect(page.locator('h1.entity-title')).toContainText(tradition.nameUr);
      await expect(page.locator('.tradition-definition')).not.toBeEmpty();

      expect(errors, `${tradition.slug} threw`).toEqual([]);
    });
  }

  test('the Urdu definition is Urdu, and the evidence may stay English', async ({ page }) => {
    /*
     * The distinction the whole layer turns on (i18n rule 7). A `definition` is
     * the page's own account, so English there is an untranslated sentence and
     * the no-leak guard fails on it. A membership `quote` supports a claim the
     * reader already has in Urdu — that is a citation, and it is allowed to be
     * English inside a declared blockquote.
     */
    await page.goto('/tradition/nath?lang=ur');
    const definition = await page.locator('.tradition-definition').innerText();
    expect(definition.trim()).not.toBe('');
    expect(definition, 'the Urdu view is showing the English definition').not.toMatch(
      /[A-Za-z]{4,}/,
    );

    const quote = page.locator('.tradition-member blockquote').first();
    await expect(quote).toHaveAttribute('lang', 'en');
    await expect(quote).toHaveAttribute('dir', 'ltr');
    /* Presence, not `''`: JSX's bare `data-latin` is `data-latin={true}`, which
       React renders as the string "true". The no-leak guard matches on the
       attribute existing, which is what this asserts. */
    await expect(quote).toHaveAttribute('data-latin');
  });

  test('a site carrying two traditions shows both, each linked', async ({ page }) => {
    /* Three of the eighteen placed sites hold two traditions, because their
       entry names both in one sentence. The accessor was `.find()` until the
       data grew, which would have shown one and lost the other silently. */
    await page.goto('/shrine/sevapanthi-darbar-bhai-gurdas-gandava');
    const row = page.locator('.infobox-row', { hasText: 'Tradition' });
    await expect(row.locator('a[href*="/tradition/"]')).toHaveCount(2);
  });

  test('a site the corpus does not place shows no tradition row', async ({ page }) => {
    // Absence means the entry names none — never a value inferred from the
    // site's category, which is a filing bucket rather than a claim.
    await page.goto('/shrine/data-darbar');
    await expect(page.locator('.shrine-infobox')).toBeVisible();
    await expect(page.locator('.infobox-row a[href*="/tradition/"]')).toHaveCount(0);
  });

  test('the infobox links reach the page', async ({ page }) => {
    await page.goto('/shrine/tilla-jogian');
    const link = page.locator('.infobox-row a[href*="/tradition/"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.locator('h1.entity-title')).toContainText('Nath');
    await expect(page.locator('.tradition-member')).not.toHaveCount(0);
  });
});

/**
 * Reaching a tradition from search.
 *
 * The eight pages shipped before the search index knew about them, so for a few
 * hours typing "Nath" into ⌘K returned four *figures* with Nath in their name
 * and never the tradition. The index rows carry `alsoKnownAs`, which is what
 * makes this worth having: **nobody types "Pranami" when the temple is signed
 * "Parnami"**, and nobody types "Udasi" when the corpus called it Udasipanth.
 */
test.describe('finding a tradition', () => {
  const openPalette = async (page: import('@playwright/test').Page, query: string) => {
    await page.goto('/graph');
    await page.locator('h1.entity-title').waitFor();
    await page.keyboard.press('Meta+k');
    await expect(page.locator('.palette-input')).toBeVisible();
    await page.locator('.palette-input').fill(query);
    // The result list is debounced; wait for the tradition group to appear.
    await expect(page.locator('.palette-results')).toBeVisible();
  };

  for (const [query, slug] of [
    ['Kanphata', 'nath'],
    ['Udasipanth', 'udasi'],
    ['Sewapanthi', 'sevapanthi'],
  ] as const) {
    test(`"${query}" reaches /tradition/${slug}`, async ({ page }) => {
      await openPalette(page, query);
      /* By its alias, not its name — the whole point. Each of these is a
         spelling the corpus itself uses for the tradition it is filed under. */
      const row = page.locator('.palette-results').getByText(/./).first();
      await expect(row).toBeVisible();
      await page
        .locator(
          `.palette-results >> text=/^${slug === 'nath' ? 'Nath' : slug === 'udasi' ? 'Udasi' : 'Sevapanthi'}$/i`,
        )
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`/tradition/${slug}$`));
      await expect(page.locator('h1.entity-title')).toBeVisible();
    });
  }

  test('an Urdu reader finds it in the script they typed', async ({ page }) => {
    /* The index rows carry `nameUr` for all eight, and `localizeOrderName`
       reads it first — so «ناتھ» matches without the reader transliterating. */
    await page.goto('/graph?lang=ur');
    await page.locator('h1.entity-title').waitFor();
    await page.keyboard.press('Meta+k');
    await expect(page.locator('.palette-input')).toBeVisible();
    await page.locator('.palette-input').fill('ناتھ');
    await expect(page.locator('.palette-results')).toContainText('ناتھ');
  });
});
