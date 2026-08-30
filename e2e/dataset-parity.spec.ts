import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * The two languages must render the *same dataset*.
 *
 * Not the same words — the same rows. A shrine page's infobox is a table of its
 * sheet fields and its gallery is that row's images, and neither has anything to
 * do with what language the reader is in. So a difference between the two
 * columns below is never a translation gap; it is one language holding a
 * different dataset from the other, and it has no other symptom.
 *
 * Measured on 30 August 2026, when it happened:
 *
 *     /shrine/data-darbar            infobox rows    gallery tiles
 *       English                            7               2
 *       Urdu                               1               1
 *
 * The Urdu page was stuck on the ten-column slim map index. A late-arriving
 * index had left its rows remembered underneath the CSV dataset, and the Urdu
 * article payload's re-merge rebuilt from them — replacing a full dataset with a
 * downgraded one. **Nothing threw and the article read perfectly**, because
 * article prose comes from the Urdu payload rather than from the sheet, so the
 * page looked complete while its facts were missing.
 *
 * The suite noticed only sideways: four lightbox cases and one infobox case
 * failed in Urdu and passed in English, and the failure they reported was "the
 * fixture shrine has no gallery tiles to open". This spec asks the question
 * directly instead.
 */
const PAGES = ['/shrine/data-darbar', '/shrine/shamsabad'];

async function datasetShape(page: Page, url: string) {
  await page.goto(url);
  await page.locator('h1.shrine-title').waitFor();
  /* Wait for the sheet, not for the masthead: the masthead renders from the
     slim index, which is exactly the state this spec exists to catch. The
     infobox is held until the sheet lands, so its presence is the signal. */
  await page.locator('.infobox-row').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1_500);
  return page.evaluate(() => ({
    infoboxRows: document.querySelectorAll('.infobox-row').length,
    galleryTiles: document.querySelectorAll('.gallery-item').length,
    sections: document.querySelectorAll('.article-section-heading').length,
  }));
}

test.describe('the Urdu and English editions render the same rows', () => {
  for (const path of PAGES) {
    test(`${path} holds the same dataset in both languages`, async ({ page }) => {
      const en = await datasetShape(page, path);
      const ur = await datasetShape(page, `${path}?lang=ur`);

      /* Guard against the whole thing passing vacuously on an empty page. */
      expect(en.infoboxRows, 'the English page has no infobox to compare').toBeGreaterThan(1);

      expect(ur.infoboxRows, `infobox: en ${en.infoboxRows} vs ur ${ur.infoboxRows}`).toBe(
        en.infoboxRows,
      );
      expect(ur.galleryTiles, `gallery: en ${en.galleryTiles} vs ur ${ur.galleryTiles}`).toBe(
        en.galleryTiles,
      );
      expect(ur.sections, `sections: en ${en.sections} vs ur ${ur.sections}`).toBe(en.sections);
    });
  }
});
