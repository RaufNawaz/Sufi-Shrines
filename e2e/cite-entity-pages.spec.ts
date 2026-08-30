import { test, expect } from './fixtures';

/**
 * Every entity page the archive publishes can be cited.
 *
 * ## What was measured, 30 August 2026
 *
 * `CiteThisEntry` was imported by exactly one file — `src/pages/ShrinePage.tsx`
 * — so of the **459 entity pages this archive publishes per language**
 * (169 shrines, 244 saints, 29 places, 9 orders, 8 traditions, counted from the
 * prerendered route directories), **169 were citable and 290 were not**. A
 * `/saint/` page carries the archive's "what it does not record" section, which
 * is among the most citable things here, and offered a reader no way to cite it.
 *
 * That matters more for this archive than for most. Its stated claim is to be a
 * *citable scholarly resource*: it ships `CITATION.cff`, an ODbL data licence,
 * and a citation that deliberately carries the entry's support level so a
 * footnote inherits the archive's honesty about its own sourcing. A page that
 * cannot be cited is outside that promise.
 *
 * ## What this asserts, and why in a browser
 *
 * The unit test in `src/components/shrine/__tests__/CiteThisEntry.test.tsx`
 * covers the citation *strings*. This covers the thing that was actually wrong:
 * the component not being **mounted**. That is a fact about five page files, it
 * is invisible to a unit test of the component, and it is exactly the failure
 * that survived for as long as it did.
 *
 * Both languages, because a citation block that renders only in English would
 * reproduce the defect this project has hit repeatedly — the Urdu edition
 * quietly getting less. The no-English-leak guard in `e2e/urdu.spec.ts` covers
 * the Latin inside these blocks; the citation text is Latin by nature (a URL, a
 * BibTeX entry) and is isolated in `<bdi data-latin>`.
 */

/** One published page per entity family, with the family's expected BibTeX key
 *  prefix. Real slugs, verified against the running site — a typo here would
 *  make this file pass over a 404, which the premise check below refuses. */
const ENTITIES = [
  { kind: 'shrine', path: '/shrine/data-darbar', key: 'shrines-data-darbar' },
  { kind: 'saint', path: '/saint/data-ganj-bakhsh', key: 'shrines-saint-data-ganj-bakhsh' },
  { kind: 'order', path: '/order/qadiriyya', key: 'shrines-order-qadiriyya' },
  { kind: 'place', path: '/place/lahore', key: 'shrines-place-lahore' },
  { kind: 'tradition', path: '/tradition/udasi', key: 'shrines-tradition-udasi' },
] as const;

test.describe('every entity family can be cited', () => {
  for (const { kind, path, key } of ENTITIES) {
    test(`${kind}: ${path} offers a citation carrying its own URL`, async ({ page }) => {
      await page.goto(path);

      /* The premise. A wrong slug renders a "not found" page, which has no
         cite block and would otherwise read as the feature being absent —
         a distinction this spec has to make loudly, because the two failures
         want opposite fixes. */
      await expect(page.locator('h1')).not.toBeEmpty();
      await expect(page.locator('body')).not.toContainText(/page not found/i);

      const cite = page.locator('.cite-entry');
      await expect(cite, `${path} has no "Cite this entry" block`).toHaveCount(1);

      /* Open the disclosure the way a reader does. */
      await cite.locator('summary').click();

      const text = await cite.locator('.cite-text').allInnerTexts();
      expect(text.length, 'the disclosure opened with no citation in it').toBeGreaterThan(1);

      /* The plain citation names the page it is on. A citation that points
         somewhere else is worse than none — the same defect class as the
         `?selected=` link that opened a different shrine. */
      expect(text.join('\n')).toContain(path);

      /* And the BibTeX key is namespaced by family, so a bibliography holding
         both the shrine and the saint called `bari-imam` keeps them apart. */
      expect(text.join('\n')).toContain(`@misc{${key},`);
    });
  }

  test('the Urdu edition gets the citation too, in Urdu', async ({ page }) => {
    for (const { path } of ENTITIES) {
      await page.goto(`${path}?lang=ur`);
      const cite = page.locator('.cite-entry');
      await expect(cite, `${path} has no citation block in the Urdu view`).toHaveCount(1);

      /* The summary is the one reader-facing sentence here, and it must be the
         reader's own language. Everything inside the block is a URL or a
         BibTeX entry — Latin by nature, isolated in <bdi>. */
      const summary = (await cite.locator('summary').innerText()).trim();
      expect(summary, `${path}: the citation summary is empty in Urdu`).not.toBe('');
      expect(summary, `${path}: the citation summary is still English`).not.toMatch(/[A-Za-z]/);
    }
  });

  test('a support level travels with a shrine citation, and is not invented for the rest', async ({
    page,
  }) => {
    /* Support level is a property of a surveyed site. Shrines have one; a
       person, an order, a place and a tradition do not, and RULE 2 says an
       absent value stays absent rather than being filled in. */
    await page.goto('/shrine/data-darbar');
    await page.locator('.cite-entry summary').click();
    const shrineCite = (await page.locator('.cite-entry .cite-text').allInnerTexts()).join('\n');
    expect(shrineCite).toContain('Support level');

    await page.goto('/saint/data-ganj-bakhsh');
    await page.locator('.cite-entry summary').click();
    const saintCite = (await page.locator('.cite-entry .cite-text').allInnerTexts()).join('\n');
    expect(saintCite).not.toContain('Support level');
  });
});
