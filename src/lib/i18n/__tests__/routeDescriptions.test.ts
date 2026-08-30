import { describe, it, expect } from 'vitest';
import { UI_TEXT } from '../uiStrings';
import { UI_TEXT_UR } from '../uiStrings.ur';
import { ROUTE_DESCRIPTIONS } from '../../../../scripts/lib/routeDescriptions.mjs';

/**
 * A prerendered route describes itself with its own words, or not at all.
 *
 * ## What was measured
 *
 * Seven routes shipped the *homepage's* description verbatim — `/almanac`,
 * `/graph`, `/chronology`, `/shared-ground`, `/typology`, `/settings`,
 * `/review`, and every one of their Urdu mirrors. A search result for the
 * lineage graph described the map, and an Urdu reader got the English sentence.
 *
 * Two of the seven already had a description written for them. `STATIC_PAGES`
 * carried `descEn` for `/graph` and `/almanac`; the `APP_ROUTES` loop runs
 * afterwards, writes the same two files, and set no description at all. **The
 * defect was a second writer silently discarding the first** — which is why
 * those two entries are gone rather than merely superseded, and why this test
 * exists at the level of the text rather than of the file.
 *
 * ## Why equality, and why it is not pedantic
 *
 * The descriptions are the pages' own intro strings, held verbatim in a build
 * module that `prerender.mjs` can import and TypeScript cannot. That is the
 * whole reason they can be bilingual: writing seven new Urdu sentences is
 * authoring Urdu, which RULE 2 puts beyond an agent, while quoting seven
 * reviewed ones is not.
 *
 * A quote that is free to drift is not a quote. Character-for-character
 * equality means editing a page's opening sentence fails here until the
 * description follows it — the same arrangement `places.ts`/`places.mjs` and
 * `slugify.ts`/`slugs.mjs` use, and the reason those have held is the guard.
 */

/** The `uiStrings` value each route quotes, in each language. */
function uiString(lang: 'en' | 'ur', key: string): string {
  const table = lang === 'en' ? UI_TEXT.en : UI_TEXT_UR;
  return (table as unknown as Record<string, unknown>)[key] as string;
}

describe('every prerendered route quotes its own page', () => {
  const routes = Object.entries(ROUTE_DESCRIPTIONS) as Array<
    [string, { key: string; en: string; ur: string }]
  >;

  it('covers the routes that had no description of their own', () => {
    /* The seven measured on 30 August 2026. Pinned as a set rather than a
       count, so removing one and adding another does not pass silently. */
    expect(routes.map(([path]) => path).sort()).toEqual([
      'almanac',
      'chronology',
      'graph',
      'review',
      'settings',
      'shared-ground',
      'typology',
    ]);
  });

  it.each(routes)('%s quotes its UI string exactly, in both languages', (_path, desc) => {
    expect(uiString('en', desc.key), `${desc.key} is not a plain string in UI_TEXT.en`).toBeTypeOf(
      'string',
    );
    expect(desc.en).toBe(uiString('en', desc.key));
    expect(desc.ur).toBe(uiString('ur', desc.key));
  });

  it('never lets a route describe itself with the site blurb', () => {
    /* The failure this replaces, stated as a rule: no route's description may
       be the homepage's. If a future route is added to the table by copying a
       neighbour and forgetting the text, this is what catches it. */
    for (const [path, desc] of routes) {
      expect(desc.en, `${path} still ships the site description`).not.toBe(
        UI_TEXT.en.siteMetaDescription,
      );
      expect(desc.ur, `${path} still ships the site description`).not.toBe(
        UI_TEXT_UR.siteMetaDescription,
      );
    }
  });

  it('gives an Urdu reader Urdu', () => {
    /* Not a leak check — that is `validate-urdu-leak.mjs`'s job — but the
       specific thing this change was for: seven Urdu pages described themselves
       in English, and a description in the wrong script is the one kind of leak
       a reader meets before they ever open the page. */
    for (const [path, desc] of routes) {
      expect(desc.ur, `${path}'s Urdu description is not in Urdu script`).toMatch(/[؀-ۿ]/);
      expect(desc.ur, `${path}'s Urdu description is the English one`).not.toBe(desc.en);
    }
  });
});
