// @vitest-environment node
/**
 * The licence and the citation route must be reachable from every page.
 *
 * That sentence was already a comment in this codebase — on **three of thirteen
 * pages**. The other ten had no route to either, and the ones that most needed
 * it were `/coverage` and the pages beside `/about`: the surfaces *about* this
 * archive's provenance were the ones that did not say who made it or under what
 * terms. A 404 was missing it too, which is the page a reader is most likely to
 * arrive at from outside.
 *
 * Asserted at the source rather than in a browser, because the failure mode is
 * *a new page*: someone adds a route, copies a page's structure, and forgets a
 * footer nobody looks at. A test that reads the pages directory notices a
 * thirteenth file; an e2e over a hardcoded route list does not.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGES = join(__dirname, '..', '..', '..', 'pages');
const files = readdirSync(PAGES).filter((f) => f.endsWith('.tsx'));

/**
 * The page source with its comments removed.
 *
 * Needed because the first version of the duplicate check counted the comment
 * that explains the duplicate: a `/* … <SiteFooter /> … *\/` note beside the fix
 * reads as a second footer to a bare `match`. A check that a comment can
 * satisfy — or break — is not checking the code, so the comments come out
 * first.
 */
function code(file: string): string {
  return readFileSync(join(PAGES, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** The map is a fixed full-height layout whose bottom edge already carries the
 *  sheet and the tab bar. A footer there is not a footer, it is a thing on top
 *  of the map — so it is exempt, by name, with the reason. */
const EXEMPT = new Set(['MapPage.tsx']);

describe('every page carries the site footer', () => {
  it('found the pages', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('renders SiteFooter on every page but the map', () => {
    const missing = files
      .filter((f) => !EXEMPT.has(f))
      .filter((f) => !code(f).includes('<SiteFooter'));
    expect(
      missing,
      'A public archive that states neither its licence nor how to cite it is not publishable.',
    ).toEqual([]);
  });

  it('has no page still hand-rolling its own footer', () => {
    /* Three identical copies is the state in which a fourth gets forgotten
       rather than copied — which is exactly what happened. */
    const inline = files.filter((f) => /className="site-footer"/.test(code(f)));
    expect(inline).toEqual([]);
  });

  it('renders it exactly once — not at least once', () => {
    /* The original three assertions all read "does this page have a footer",
       and every one of them passed on a page that had two. ShrinePage shipped
       the whole footer nav twice from 24 August to 27 August 2026: the sweep
       that added a footer to the ten pages without one appended a bare
       `<SiteFooter />` beside the only customised footer in the app, and no
       check could see it because "missing" and "duplicated" are opposite
       failures of the same feature and only one was being tested. */
    const duplicated = files
      .filter((f) => !EXEMPT.has(f))
      .map((f) => [f, (code(f).match(/<SiteFooter/g) ?? []).length])
      .filter(([, count]) => (count as number) > 1);
    expect(duplicated, 'A page renders the site footer more than once.').toEqual([]);
  });

  it('keeps the exemption honest', () => {
    /* An exemption that outlives its cause makes the next reader trust the list
       instead of the code. */
    for (const name of EXEMPT) expect(files).toContain(name);
  });
});
