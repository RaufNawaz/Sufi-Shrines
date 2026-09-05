import { test, expect, MAPPED_SHRINE_COUNT } from './fixtures';

/**
 * A language change relabels the markers. It does not rebuild them.
 *
 * ## What this is protecting
 *
 * `lang` used to sit in `ShrineMarkers`' build-effect dependency list, so every
 * press of the language toggle tore down the layer group and constructed 169
 * fresh markers — 169 `L.marker`, 169 `divIcon` HTML parses, 169 `bindTooltip`,
 * roughly 2,700 listener registrations and 114 `<img>` elements re-created.
 * Measured floor for the DOM half alone, with the marker objects already built:
 * 16.8 ms at a 4x CPU throttle (performance council, 4 September 2026).
 *
 * Three things about a marker are language-dependent — the tooltip, the `title`
 * and the `aria-label` — and they are now updated in place.
 *
 * ## Why the assertion is element identity
 *
 * A test that only checked the labels were Urdu afterwards would have passed
 * before this change too: rebuilding produced correct labels, expensively. The
 * defect was invisible in the output and only visible in *how* the output was
 * reached, so the property has to be "the same elements are still there".
 *
 * Stamping an expando on the DOM nodes and looking for it after the toggle is
 * the cheapest way to ask that. A rebuild replaces the nodes and the stamps go
 * with them.
 *
 * Both halves are asserted deliberately. Element survival alone would pass if
 * the relabelling were deleted outright, and correct labels alone would pass if
 * the rebuild came back.
 */
test('a language change relabels markers in place rather than rebuilding them', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT);

  // Stamp every marker element, and record one English label to compare against.
  const before = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.leaflet-marker-icon'));
    els.forEach((el, i) => {
      (el as HTMLElement & { __stamp?: number }).__stamp = i;
    });
    return { count: els.length, firstLabel: els[0]?.getAttribute('aria-label') ?? '' };
  });

  await page.locator('.lang-seg[lang="ur"]').first().click();
  // The label is what changes; waiting on it is waiting on the work under test.
  await expect
    .poll(async () => page.locator('.leaflet-marker-icon').first().getAttribute('aria-label'))
    .not.toBe(before.firstLabel);

  const after = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.leaflet-marker-icon'));
    return {
      count: els.length,
      stamped: els.filter((el) => (el as HTMLElement & { __stamp?: number }).__stamp !== undefined)
        .length,
      label: els[0]?.getAttribute('aria-label') ?? '',
      title: (els[0] as HTMLElement | undefined)?.title ?? '',
    };
  });

  // Every marker is the element it was: none was torn down and rebuilt.
  expect(after.count).toBe(before.count);
  expect(after.stamped).toBe(before.count);

  // And it really did relabel — an Urdu reader gets an Urdu name, on both the
  // announced label and the hover title, which are set by two different calls.
  expect(after.label).not.toBe(before.firstLabel);
  expect(after.label).toMatch(/[؀-ۿ]/);
  expect(after.title).toBe(after.label);
});
