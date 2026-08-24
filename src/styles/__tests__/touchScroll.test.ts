// @vitest-environment node
/**
 * A list that scrolls with a mouse must scroll with a thumb.
 *
 * The command palette is the archive's search, and on a phone it is
 * near-fullscreen with up to forty rows in it — the single most-scrolled surface
 * in the app on the device most of its readers use. It could not be scrolled by
 * touch, for a reason nothing on a desktop reveals:
 *
 * `.palette-backdrop` is `position: fixed; inset: 0`, and on mobile Safari that
 * resolves against the **large** viewport — the one with the URL bar hidden. So
 * the flex container was taller than the screen, the panel stretched to match
 * it, and `.palette-results` therefore never overflowed. Nothing overflowing
 * means nothing to scroll: the rows past the screen edge were clipped and
 * unreachable, and a drag on the list did nothing at all. It looks exactly like
 * a broken scroll container and is in fact a correct one that was given too much
 * room.
 *
 * Two things are asserted, because the fix has two halves and either alone
 * leaves the bug:
 *
 * 1. **The overlay is bounded by the visible viewport** (`dvh`), so its internal
 *    lists overflow where the screen ends.
 * 2. **Every internally-scrolling region declares the touch behaviours** —
 *    momentum, contained overscroll, and `pan-y`. `.shrine-list-panel` in
 *    map.css has carried all three since the sidebar was built; the palette,
 *    added later, carried one of the three.
 *
 * And one thing is forbidden: `touch-action: none` anywhere on the palette's
 * ancestor chain. The effective touch-action for a gesture is the intersection
 * along that chain, so a `none` on the backdrop — a plausible way to stop the
 * map behind from panning — silently kills scrolling in every list inside it.
 * That is the failure mode this file exists to make impossible to reintroduce.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..');
const sheets = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ name: f, css: readFileSync(join(STYLES, f), 'utf8') }));

/** Comments name every property discussed below and would match all of them. */
const code = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every declaration block whose selector list mentions `selector`, flattened.
 *  Crude on purpose: enough to ask whether a property is declared for a class
 *  somewhere in a sheet, which is the question here. */
function blocksFor(css: string, selector: string): string[] {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code(css)))) {
    if (m[1].includes(selector)) out.push(m[2]);
  }
  return out;
}

const palette = sheets.find((s) => s.name === 'palette.css')!.css;

describe('the palette is bounded by the viewport a reader can see', () => {
  it('sizes the overlay in dynamic viewport units, not on `inset: 0` alone', () => {
    const backdrop = blocksFor(palette, '.palette-backdrop').join('\n');
    expect(backdrop, 'no .palette-backdrop rule at all').not.toBe('');
    expect(
      /height:\s*100dvh/.test(backdrop),
      '`inset: 0` on a fixed overlay is the large viewport on iOS — the panel ' +
        'runs off the bottom of the screen and its lists never overflow, so ' +
        'they never scroll. Size the backdrop in dvh.',
    ).toBe(true);
  });

  it('keeps the phone panel inside that overlay', () => {
    /* `max-height: none` was the phone override, and it is the half of the bug
       that survives a correct backdrop in any engine where a tall child defeats
       `align-items: stretch`. */
    const phone = palette.slice(palette.indexOf('@media (max-width: 640px)'));
    expect(phone, 'no phone media query in palette.css').not.toBe('');
    const panel = blocksFor(phone, '.palette {').join('\n');
    expect(/max-height:\s*none/.test(panel), 'the phone panel is unbounded again').toBe(false);
  });
});

describe('no full-viewport overlay is sized on `inset: 0` alone', () => {
  /* The palette was the reported bug; the lightbox had the same one, on the
     surface whose entire job is showing a photograph whole. Its image is
     `max-height: 100%` of an overlay that was the large viewport, so on a phone
     the bottom of every photo sat behind the URL bar — clipped, with nothing to
     scroll. Both are now `dvh`. This asserts the pattern rather than the two
     instances, so the third overlay someone adds is caught on the way in. */
  it('gives every fixed inset-0 overlay a dynamic-viewport height', () => {
    const offenders: string[] = [];
    for (const sheet of sheets) {
      const re = /([^{}]+)\{([^{}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code(sheet.css)))) {
        const body = m[2];
        if (!/position:\s*fixed/.test(body)) continue;
        if (!/inset:\s*0/.test(body)) continue;
        if (/height:\s*(100dvh|100svh|var\()/.test(body)) continue;
        offenders.push(`${sheet.name}: ${m[1].trim().split('\n')[0]}`);
      }
    }
    expect(
      offenders,
      'A fixed overlay at `inset: 0` is the *large* viewport on mobile Safari — taller than ' +
        'the screen. Its content is then clipped at the screen edge with nothing to scroll, ' +
        'because nothing overflowed. Give it `height: 100dvh`.',
    ).toEqual([]);
  });

  it('sizes a page’s minimum height in svh, not vh', () => {
    /* Different unit, different question: a *minimum* height should be the
       smallest the viewport gets, so a short page neither carries a phantom
       scroll nor reflows as the URL bar hides. `dvh` is for the fixed overlay
       that must match what is visible right now. */
    const offenders: string[] = [];
    for (const sheet of sheets) {
      for (const m of code(sheet.css).matchAll(/min-height:\s*([^;]*100vh[^;]*);/g)) {
        offenders.push(`${sheet.name}: min-height: ${m[1].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('every internally-scrolling region takes a thumb', () => {
  /* The palette's two scroll containers. Named rather than discovered: a list
     of classes that must each carry three properties is exactly the kind of
     thing that quietly loses a member. */
  const SCROLLERS = ['.palette-results', '.palette-filters'];

  for (const selector of SCROLLERS) {
    it(`${selector} declares momentum, contained overscroll and pan-y`, () => {
      const block = blocksFor(palette, selector).join('\n');
      expect(block, `no ${selector} rule at all`).not.toBe('');
      expect(/overflow-y:\s*auto/.test(block), `${selector} does not scroll`).toBe(true);
      expect(
        /-webkit-overflow-scrolling:\s*touch/.test(block),
        `${selector} scrolls without momentum on older WebKit`,
      ).toBe(true);
      expect(
        /overscroll-behavior:\s*contain/.test(block),
        `${selector} chains its overscroll to the page behind the modal`,
      ).toBe(true);
      expect(
        /touch-action:\s*pan-y/.test(block),
        `${selector} leaves its touch-action to be narrowed by an ancestor`,
      ).toBe(true);
    });
  }

  it('matches the treatment the sidebar list has always had', () => {
    /* If the sidebar's own list ever loses these, this test should stop citing
       it as the precedent rather than silently comparing against nothing. */
    const map = sheets.find((s) => s.name === 'map.css')!.css;
    const list = blocksFor(map, '.shrine-list-panel').join('\n');
    expect(/-webkit-overflow-scrolling:\s*touch/.test(list)).toBe(true);
    expect(/overscroll-behavior:\s*contain/.test(list)).toBe(true);
  });
});

describe('nothing narrows the palette’s touch-action from above', () => {
  it('never sets `touch-action: none` on the overlay, the panel, or the body', () => {
    /* The effective touch-action is the intersection down the ancestor chain,
       so a `none` on any of these disables scrolling in every list inside —
       with no visual sign, on a device CI does not run. */
    const FORBIDDEN = ['.palette-backdrop', '.palette', 'body', 'html'];
    const offenders: string[] = [];
    for (const sheet of sheets) {
      const re = /([^{}]+)\{([^{}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code(sheet.css)))) {
        if (!/touch-action:\s*none/.test(m[2])) continue;
        const selectors = m[1].split(',').map((s) => s.trim());
        for (const selector of selectors) {
          /* A descendant of the panel may legitimately opt out — the sheet's
             drag handle does. Only the chain *above* the lists is forbidden. */
          if (FORBIDDEN.includes(selector) || FORBIDDEN.includes(selector.replace(/^\s*/, ''))) {
            offenders.push(`${sheet.name}: ${selector}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
