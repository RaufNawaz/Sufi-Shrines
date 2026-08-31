/**
 * The diagram's anchors must carry the router's basename (RULE 4).
 *
 * `NetworkGraph` draws its nodes inside an SVG, where react-router's `<Link>`
 * is unavailable, so each node is a real `<a href>` with a left-click handler
 * that routes. The href was the raw route path — `/saint/foo` — which the
 * router's basename never touched, so on GitHub Pages at `/Sufi-Shrines/` every
 * one of them pointed a level too high and 404'd.
 *
 * It survived because the three things it broke are the three things no
 * automated pass had exercised: middle-click, right-click "open in new tab",
 * and "copy link". A plain left-click was always correct, because `navigate()`
 * applies the basename itself. Only `npm run verify:pages` could see it — and
 * that runs at deploy time, after a red push has already reached the version
 * branch. This test moves the check to `npm run verify`.
 *
 * The assertion is deliberately about the *rendered attribute*, not about the
 * source text: the previous guard (`internalLinks.test.ts`) greps `.tsx` for
 * literal `href="/…"` strings and cannot see `href={node.href}`, which is the
 * form this bug took.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders } from '../../../test/utils';
import { NetworkGraph, type GraphNode } from '../NetworkGraph';

const CENTER: GraphNode = {
  id: 'center',
  label: 'Data Ganj Bakhsh',
  type: 'saint',
  href: '/saint/data-ganj-bakhsh',
};

const CONNECTED: GraphNode[] = [
  { id: 'a', label: 'Al-Khuttali', type: 'teacher', href: '/saint/abul-fadl-muhammad-al-khuttali' },
  { id: 'b', label: 'Data Darbar', type: 'shrine', href: '/shrine/data-darbar' },
  { id: 'c', label: 'Qadiriyya', type: 'order', href: '/order/qadiriyya' },
];

/**
 * The initial entry must sit *inside* the basename. A `<MemoryRouter>` whose
 * location does not start with its basename renders `null` and warns — which
 * on the first run of this test produced zero anchors and an assertion failure
 * that looked exactly like the bug it was written to catch. Worth stating: a
 * guard that fails for the wrong reason is indistinguishable from one that
 * works, right up until the fix does not silence it.
 */
function hrefsUnder(basename: string): string[] {
  const entry = basename === '/' ? '/graph' : `${basename}/graph`;
  const { container } = renderWithProviders(
    <MemoryRouter basename={basename} initialEntries={[entry]}>
      <NetworkGraph center={CENTER} connected={CONNECTED} />
    </MemoryRouter>,
  );
  return Array.from(container.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '');
}

describe('<NetworkGraph> node anchors', () => {
  it('prefixes every in-app href with the router basename', () => {
    const hrefs = hrefsUnder('/Sufi-Shrines');

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith('/Sufi-Shrines/')).toBe(true);
    }
  });

  it('emits no bare route path that would bypass the basename', () => {
    const hrefs = hrefsUnder('/Sufi-Shrines');

    for (const node of CONNECTED) {
      expect(hrefs).not.toContain(node.href);
      expect(hrefs).toContain(`/Sufi-Shrines${node.href}`);
    }
  });

  it('adds nothing when the app is served from the root', () => {
    const hrefs = hrefsUnder('/');

    for (const node of CONNECTED) {
      expect(hrefs).toContain(node.href);
    }
    /* No `//saint/…` — the join must not double the separator. */
    for (const href of hrefs) {
      expect(href.startsWith('//')).toBe(false);
    }
  });
});
