import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * The reduced-motion contract, measured in a real browser.
 *
 * `src/styles/__tests__/motion.test.ts` reads the stylesheets and asserts every
 * `@keyframes` has an escape. That is a static check and it cannot see the
 * thing that actually matters: whether anything is *animating* on the page. A
 * keyframe can be correctly guarded in CSS and still run because a second rule
 * re-enables it, or because a component sets an inline animation, or because
 * the guard names a selector that no longer exists.
 *
 * So this asks the browser. `document.getAnimations()` returns every running
 * animation on the document, which makes the assertion exact rather than
 * approximate: under `prefers-reduced-motion: reduce` the answer must be zero.
 * Not "fewer", not "faster" — zero. For some readers vestibular motion causes
 * nausea and migraine, so this is a medical setting, not a taste preference.
 *
 * Measured 20 August 2026: the saint page runs 5 animations by default
 * (`edge-draw` on each spoke, `node-pop` on each node) and 0 under reduce.
 */

/** Animation names running on the document right now. */
async function runningAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .map((a) => (a as CSSAnimation).animationName ?? '')
      .filter(Boolean),
  );
}

/* A saint whose graph has teachers, an order, a disciple and a shrine — so
   there is something on the ring to animate. */
const RICH_SAINT = '/saint/ganj-e-inayat-sarkar';

test.describe('motion', () => {
  test('the lineage graph traces itself in', async ({ page }) => {
    // `commit` rather than `load`: by the time `load` fires the entrance
    // animations may already have finished, and a finished animation is not a
    // running one.
    await page.goto(RICH_SAINT, { waitUntil: 'commit' });
    await page.waitForSelector('.network-edge', { state: 'attached' });

    const names = await runningAnimations(page);
    expect(
      names,
      'the knowledge-graph entrance animation is not running — check ' +
        '.network-edge--animated / .network-node--animated in src/styles/motion.css',
    ).toContain('edge-draw');
    expect(names).toContain('node-pop');
  });

  test.describe('with prefers-reduced-motion: reduce', () => {
    /* `page.emulateMedia` rather than the `reducedMotion` test option: the
       extended fixture in e2e/fixtures.ts narrows the options type, and this
       applies the same media state to the page directly. Set before any
       navigation so the very first paint is already reduced. */
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    });

    for (const [label, url] of [
      ['saint', RICH_SAINT],
      ['order', '/order/qadiriyya'],
      ['almanac', '/almanac'],
      ['map', '/'],
    ] as const) {
      test(`${label}: nothing animates`, async ({ page }) => {
        await page.goto(url, { waitUntil: 'commit' });
        await page.waitForSelector('#main-content, .leaflet-container', { state: 'attached' });
        // Give any entrance animation the chance to have started.
        await page.waitForTimeout(250);

        const names = await runningAnimations(page);
        expect(
          names,
          'these animations run even though the reader asked for reduced motion. ' +
            'Add the selector to a @media (prefers-reduced-motion: reduce) block ' +
            'with `animation: none` (src/styles/motion.css).',
        ).toEqual([]);
      });
    }

    test('graph edges are solid lines, not leftover dash patterns', async ({ page }) => {
      await page.goto(RICH_SAINT);
      await page.waitForSelector('.network-edge', { state: 'attached' });
      // stroke-dasharray exists only to be animated. Left behind with the
      // animation switched off, every spoke would render dotted.
      const dashes = await page.evaluate(() =>
        [...document.querySelectorAll('.network-edge')].map(
          (el) => getComputedStyle(el).strokeDasharray,
        ),
      );
      expect(dashes.length).toBeGreaterThan(0);
      for (const dash of dashes) {
        expect(['none', '', '0px'], `unexpected stroke-dasharray: ${dash}`).toContain(dash);
      }
    });
  });
});
