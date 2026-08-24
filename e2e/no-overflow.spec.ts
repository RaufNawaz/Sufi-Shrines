import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { settle } from './fixtures';

/**
 * Nothing overflows its box, in either language, at three widths.
 *
 * Urdu is the reason this exists. Nastaliq sets taller and wider than Latin at
 * the same nominal size, an Urdu word cannot be hyphenated, and several strings
 * in this archive are long in Urdu and short in English ("مزارات کی فہرست اور
 * چھانٹ" against "Shrine browser"). So a layout that fits in English can push
 * past its container in Urdu — a class of bug no unit test can see, because
 * jsdom has no layout, and no screenshot review can catch reliably, because it
 * only shows the one page and width you happened to look at.
 *
 * Two things are checked, and the second is the one that matters:
 *
 * 1. **The document never scrolls sideways.** `documentElement.scrollWidth`
 *    within a pixel of the viewport. A page that scrolls horizontally on a
 *    phone is broken however good it looks stationary.
 * 2. **No element extends past the viewport's edges.** Measured per element,
 *    because a single 100-character survey name in a 260px sheet is enough, and
 *    a container with `overflow: hidden` will happily clip it without ever
 *    changing the document width — so check 1 alone would pass while the reader
 *    loses half a name.
 *
 * Deliberate exemptions, each for a reason rather than to get to green:
 * — elements whose own computed style scrolls them (`auto`/`scroll`), because
 *   that overflow is the design;
 * — Leaflet's map panes, which are *supposed* to extend past the viewport (the
 *   tile grid is bigger than the window on purpose);
 * — anything the page has hidden (`display: none`, zero box).
 */

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

const ROUTES = [
  { name: 'map', path: '/', ready: '#sidebar' },
  { name: 'shrine', path: '/shrine/data-darbar', ready: 'h1.shrine-title' },
  { name: 'saint', path: '/saint/data-ganj-bakhsh', ready: 'h1.entity-title' },
  { name: 'order', path: '/order/chishtiyya', ready: 'h1.entity-title' },
  { name: 'place', path: '/place/lahore', ready: 'h1.entity-title' },
  { name: 'coverage', path: '/coverage', ready: 'h1.entity-title' },
  { name: 'almanac', path: '/almanac', ready: 'h1' },
  { name: 'graph', path: '/graph', ready: 'h1.entity-title' },
  { name: 'about', path: '/about', ready: 'h1.entity-title' },
] as const;

/**
 * Subtrees whose geometry is *supposed* to exceed the viewport.
 *
 * — Leaflet's map viewport and panes: the tile grid is deliberately larger than
 *   the window, and `.leaflet-container` clips it. Exempting only the panes was
 *   not enough — the container itself reports the panes' width as its own
 *   scrollWidth.
 * — `.sr-only`: the shrine directory is a visually-hidden landmark holding 169
 *   links (one per site, each with its full Location). `.sr-only` clips its box
 *   to 1px, so its children measure thousands of pixels wide while occupying no
 *   visual space at all. That is what a screen-reader-only region *is*; the
 *   first run of this sweep reported six failures, every one of them a link
 *   nobody can see.
 */
const EXEMPT_SELECTORS = [
  '.leaflet-container',
  '.leaflet-pane',
  '.leaflet-map-pane',
  '.leaflet-tile-container',
  '.sr-only',
];

interface Offender {
  tag: string;
  cls: string;
  text: string;
  overflowBy: number;
}

async function findOverflow(page: Page, exempt: string[]) {
  return page.evaluate((exemptSelectors) => {
    const offenders: Offender[] = [];
    const viewportWidth = window.innerWidth;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (exemptSelectors.some((sel) => el.closest(sel))) continue;

      const style = getComputedStyle(el);
      if (style.position === 'fixed' && style.visibility === 'hidden') continue;

      /* Deliberate truncation is not overflow.
       *
       * `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — and
       * its multi-line cousin `-webkit-line-clamp` — exist precisely to clip
       * content that does not fit, and they make `scrollWidth > clientWidth`
       * by construction. A shrine name in this archive can run past 100
       * characters, so several rows clamp on purpose; flagging them would mean
       * either deleting the clamp or exempting the check case by case.
       *
       * Ancestors count: a `<bdi>` inside a clamped span reports its own full
       * width and sits well past the viewport, while being clipped by the
       * parent a reader actually sees. */
      const clamps = (node: HTMLElement) => {
        const cs = getComputedStyle(node);
        return (
          cs.textOverflow === 'ellipsis' ||
          (cs as unknown as { webkitLineClamp?: string }).webkitLineClamp !== 'none'
        );
      };
      let clampedAncestor = false;
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        if (clamps(node)) {
          clampedAncestor = true;
          break;
        }
      }
      if (clampedAncestor) continue;

      // Past the leading or trailing edge of the viewport.
      const past = Math.max(0, -rect.left, rect.right - viewportWidth);
      if (past > 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.split(' ')[0] : '',
          text: (el.textContent || '').trim().slice(0, 48),
          overflowBy: Math.round(past),
        });
        continue;
      }

      // Content wider than its own box, where the box is not a scroller.
      const scrolls = /(auto|scroll)/.test(style.overflowX);
      if (!scrolls && el.scrollWidth - el.clientWidth > 1 && el.clientWidth > 0) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.split(' ')[0] : '',
          text: (el.textContent || '').trim().slice(0, 48),
          overflowBy: el.scrollWidth - el.clientWidth,
        });
      }
    }
    // One entry per element class, so a 169-row list reports once.
    const seen = new Set<string>();
    return offenders.filter((o) => {
      const key = `${o.tag}.${o.cls}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, exempt);
}

for (const viewport of VIEWPORTS) {
  for (const lang of ['ur', 'en'] as const) {
    for (const route of ROUTES) {
      test(`[${viewport.name}/${lang}] ${route.name} fits its box`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(lang === 'ur' ? `${route.path}?lang=ur` : route.path);
        await page.locator(route.ready).first().waitFor();
        await settle(page);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth, `the page scrolls sideways at ${viewport.width}px`).toBeLessThanOrEqual(
          viewport.width + 1,
        );

        const offenders = await findOverflow(page, [...EXEMPT_SELECTORS]);
        expect(
          offenders,
          'These elements overflow. In Urdu the usual causes are a fixed width sized for ' +
            'English, a `white-space: nowrap` on a string that is longer in Urdu, or a ' +
            'physical `left`/`right` where a logical inset was meant.',
        ).toEqual([]);
      });
    }
  }
}

/**
 * The sidebar settings popover, measured *open*.
 *
 * The route sweep above cannot see it. The panel is rendered only while it is
 * open, so at rest there is no element to measure — and its first version was
 * badly placed: anchored to its own 32px icon rather than to the row of icons,
 * it began at x = −53 on desktop and, in RTL, ended 109px past the trailing
 * edge of a 390px phone (HANDOVER §9.82).
 *
 * The bug was caught only because a closed <details> still lays its contents
 * out, which is an accident of that element and not a check. This is the check:
 * §9.68 and §9.81 both record the same lesson in other costumes — a sweep's
 * route list is not its universe, its *state* is.
 */
for (const viewport of VIEWPORTS) {
  for (const lang of ['ur', 'en'] as const) {
    test(`[${viewport.name}/${lang}] the open settings panel fits its box`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(lang === 'ur' ? '/?lang=ur' : '/');
      await page.locator('#sidebar').waitFor();

      await page.locator('.sidebar-settings-trigger').click();
      await expect(page.locator('.sidebar-settings-panel')).toBeVisible();
      await settle(page);

      const offenders = await findOverflow(page, [...EXEMPT_SELECTORS]);
      expect(
        offenders,
        'The open settings panel pushes past the viewport. It is anchored to ' +
          '.sidebar-actions, not to .sidebar-settings — check nothing has given the icon ' +
          'wrapper a containing block of its own.',
      ).toEqual([]);
    });
  }
}
