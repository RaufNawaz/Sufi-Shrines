// @vitest-environment node
/**
 * No third-party stylesheet may block the first paint (RULE 4).
 *
 * `index.html` linked fonts.googleapis.com as a plain `<link rel="stylesheet">`.
 * A stylesheet in the head is render-blocking, so until that host answered,
 * nothing painted — not the map, not the shrine list, not a heading. The host
 * is one this archive does not control, on a site whose readers are mostly on a
 * mobile connection in Pakistan, where Google's font CDN is periodically slow
 * or unreachable.
 *
 * Measured, with the CDN blocked (as it is in the sandbox this was written in):
 *
 *   before  first-paint 12468ms   first-contentful-paint 12672ms
 *   after   first-paint    44ms   first-contentful-paint   108ms
 *
 * Twelve and a half seconds of blank page, for a font. The fix is the
 * `media="print"` + `onload="this.media='all'"` pattern: the browser fetches
 * the sheet without blocking, then applies it, and `display=swap` swaps the
 * faces in. It only works because every family has a real fallback in
 * tokens.css, so the first paint is typeset rather than empty — which is why
 * that is asserted here too.
 *
 * This is the same reasoning that made Noto Nastaliq Urdu self-hosted: the
 * reading experience must not depend on a CDN being reachable. The rule had
 * simply never been applied to the Latin faces.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const INDEX = readFileSync(join(ROOT, 'index.html'), 'utf8');
const TOKENS = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');

/*
 * Comments first, then `<noscript>`. Order matters, and getting it wrong is how
 * the first draft of this file passed while looking at nothing: the HTML
 * comment above the font links *describes* the pattern, so it contains the
 * words `<noscript>` and `<link rel="stylesheet">` as prose. Stripping
 * `<noscript>…</noscript>` first matched from the mention inside the comment to
 * the real closing tag, swallowing the very links this test exists to inspect —
 * and what remained were two fragments scraped out of the prose. The CSS tests
 * in src/styles/__tests__ strip their comments first for exactly this reason.
 */
const UNCOMMENTED = INDEX.replace(/<!--[\s\S]*?-->/g, '');

/** A blocking sheet inside `<noscript>` blocks nothing: a reader without
 *  JavaScript has no app to wait for. */
const SCRIPTED = UNCOMMENTED.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');

/** Every `<link>` tag in the scripted document, as its raw text. */
const LINKS = [...SCRIPTED.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);

describe('first paint does not wait on a third party', () => {
  it('every external stylesheet is loaded without blocking the render', () => {
    const blocking = LINKS.filter((tag) => {
      if (!/rel\s*=\s*["']stylesheet["']/i.test(tag)) return false;
      const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? '';
      if (!/^https?:\/\//i.test(href)) return false; // bundled CSS is ours and local
      // The non-blocking pattern: fetched as print, promoted on load.
      const deferred =
        /media\s*=\s*["']print["']/i.test(tag) && /onload\s*=\s*["'][^"']*media\s*=/i.test(tag);
      return !deferred;
    });

    expect(
      blocking,
      'a render-blocking stylesheet on a host we do not control means a blank page for as ' +
        'long as that host takes. Use media="print" onload="this.media=\'all\'" with a ' +
        '<noscript> copy, and make sure the family has a real fallback in tokens.css.',
    ).toEqual([]);
  });

  it('the deferred sheet still has a preload and a noscript copy', () => {
    // Preload so the fetch starts at the same moment it used to; noscript so a
    // reader without JavaScript still gets the webfonts.
    expect(
      LINKS.some(
        (t) => /rel\s*=\s*["']preload["']/i.test(t) && /as\s*=\s*["']style["']/i.test(t),
      ),
      'the deferred stylesheet has no rel=preload, so its fetch starts late',
    ).toBe(true);
    expect(
      /<noscript>[\s\S]*fonts\.googleapis\.com[\s\S]*<\/noscript>/i.test(UNCOMMENTED),
      'no <noscript> fallback: a reader without JavaScript loses the webfonts entirely',
    ).toBe(true);
  });

  it('every webfont family has a non-webfont fallback', () => {
    // Without this the deferred sheet buys a blank page instead of a slow one.
    const stacks = [...TOKENS.matchAll(/(--font-[\w-]+)\s*:\s*([^;]+);/g)]
      .map((m) => ({ token: m[1]!, value: m[2]! }))
      // --font-scale-urdu is a ratio, not a family. A stack is what has commas.
      .filter(({ value }) => value.includes(','));
    expect(stacks.length, 'no --font-* tokens found in tokens.css').toBeGreaterThan(0);
    for (const { token, value } of stacks) {
      const families = value.split(',').map((f) => f.trim());
      const hasGeneric = families.some((f) =>
        /^(serif|sans-serif|monospace|cursive|system-ui|-apple-system|ui-\w+)$/.test(
          f.replace(/["']/g, ''),
        ),
      );
      expect(hasGeneric, `${token} ends in a webfont with no generic fallback: ${value}`).toBe(
        true,
      );
    }
  });
});
