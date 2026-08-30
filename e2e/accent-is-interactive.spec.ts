import { test, expect } from './fixtures';

/**
 * The accent means *interactive*, and nothing else.
 *
 * That is the stated rule for this palette, and it is the reason
 * `tokenSplit.test.ts` refuses to let the chrome colour and any tradition
 * colour converge. What no check covered was the other way a colour loses its
 * meaning: painting it on something a reader cannot click.
 *
 * Measured 30 August 2026, before the fix: `/chronology` drew **all 120 dated
 * sites** in `--color-primary` — on a chart whose six bands are the six
 * traditions, so the page that plots the archive across the centuries said
 * nothing about which tradition a mark belonged to, and said "clickable" in the
 * colour a reader has been taught to read that way. `/about` put its
 * field-verified bar in the same blue directly beneath six bars drawn in the
 * tradition palette: two colour logics, one page.
 *
 * This is a runtime check rather than a CSS grep because interactivity is not
 * visible in a selector. A rule like `.chronology-mark { background:
 * var(--color-primary) }` is indistinguishable, statically, from a rule for a
 * button.
 */
const ROUTES = ['/chronology', '/about', '/typology', '/shared-ground', '/graph'];

for (const route of ROUTES) {
  test(`${route} paints the accent only on things a reader can use`, async ({ page }) => {
    await page.goto(route);
    await page.locator('h1').first().waitFor();
    await page.waitForTimeout(1_500);

    const offenders = await page.evaluate(() => {
      /* Resolve the token by painting a probe, rather than parsing the
         stylesheet — the theme may have redefined it. */
      const probe = document.createElement('div');
      probe.style.color = 'var(--color-primary)';
      document.body.appendChild(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();

      const found: string[] = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        if (bg !== accent) continue;
        /* A control, or anything inside one, is exactly what the accent is
           for. `[tabindex]` catches the map's markers, which are divs. */
        if (
          el.closest(
            'a,button,input,select,textarea,summary,[role="button"],[role="link"],[tabindex]',
          )
        )
          continue;
        const name =
          typeof el.className === 'string' && el.className
            ? `.${el.className.split(' ')[0]}`
            : el.tagName.toLowerCase();
        if (!found.includes(name)) found.push(name);
      }
      return found;
    });

    expect(
      offenders,
      `${route} paints --color-primary on non-interactive elements: ${offenders.join(', ')}. ` +
        'The accent means "you can use this"; a data series drawn in it teaches the reader ' +
        'the opposite. Use the tradition palette, or an ink that is not the accent.',
    ).toEqual([]);
  });
}

test('the chronology bands are drawn in their own traditions, not one colour', async ({ page }) => {
  /* The other half: removing the accent must not leave six identical bands.
     The chart's whole subject is which tradition was building when. */
  await page.goto('/chronology');
  await page.locator('.chronology-band').first().waitFor();
  await page.waitForTimeout(1_500);

  const colours = await page.evaluate(() =>
    [...document.querySelectorAll('.chronology-band')].map((band) => {
      const mark = band.querySelector('.chronology-mark');
      if (!mark) return null;
      const cs = getComputedStyle(mark);
      /* A century mark is transparent with a border; both read the band's
         custom property, so either is the band's colour. */
      return cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? cs.borderTopColor : cs.backgroundColor;
    }),
  );

  const painted = colours.filter((c): c is string => c !== null);
  expect(painted.length, 'no band drew a mark').toBeGreaterThan(2);
  expect(new Set(painted).size, `every band drew the same colour: ${painted.join(', ')}`).toBe(
    painted.length,
  );
});
