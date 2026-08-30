import { describe, it, expect } from 'vitest';
import { UI_TEXT } from '../uiStrings';
import { UI_TEXT_UR } from '../uiStrings.ur';
import { CATEGORY_ORDER } from '../../data/categoryKey';

/* Urdu comes from the module, not from `UI_TEXT.ur`, which is optional — the
   Urdu table is a lazy chunk and the object only carries it once a loader has
   run. It *is* populated under vitest, by test setup rather than by the type, so
   every Urdu assertion below would have gone on passing over `undefined` if that
   setup ever changed. Passing over nothing is not passing. `UI_TEXT.en` is
   non-optional and needs no such care. */

const TABLES = { en: UI_TEXT.en, ur: UI_TEXT_UR } as const;

/**
 * Two claims the archive makes about itself, held open.
 *
 * ## 1. A rename is a sweep, not an edit
 *
 * The archive became "Mapping the Shrines of Pakistan" on 30 August 2026,
 * because it holds 169 sites of which 30 are not Muslim shrines and a reader
 * arriving at a gurdwara was told they were inside a Sufi collection. The sweep
 * took the title, the meta description, the manifest and the social card — and
 * missed `footerCredit`, which sits under **every page of the site** and under
 * all ~800 prerendered files. It was found a day later, by a second reader, on
 * the running server.
 *
 * That is the whole failure mode: a rename touches the strings you think of,
 * and the one you forget is the one on every page. So the retired name is
 * banned from the string tables outright, in both locales, and the new one is
 * required to be present — a sweep that blanks a name fails as loudly as one
 * that forgets a site.
 *
 * The ban is on **values**, not on the files: `uiStrings.ts` names the old name
 * twice in comments explaining the rename, which is exactly where it belongs.
 * `citation.ts` also still carries it, deliberately — the ODbL attribution
 * string is what the licence prescribes of people using the data, and changing
 * that is a licence change rather than a rename. It is out of this test's scope
 * on purpose; the reasoning is at the string.
 *
 * ## 2. The graph page must not deny what the graph page says
 *
 * `graphExplorerIntro` opened "Browse the Sufi orders and saints…" while
 * `graphExplorerFiguresNote`, eleven lines below it in the same object and
 * rendered on the same page, read "not every figure here is a Sufi saint."
 * Measured on the running page, 30 August 2026, from its own grouping: **70 of
 * 134 figures are Sufi saints.** The other 64 are 20 deities, 16 sants, 15
 * historical figures, 5 Sikh Gurus, 5 recorded differently, 3 communities.
 *
 * The check is conditioned on the data rather than hardcoded: it only demands
 * the neutral word while the archive is multi-tradition. An archive that
 * genuinely held one tradition should be free to say so.
 */

/** The name the archive carried until 30 August 2026. */
const RETIRED = /Sufi Shrines/i;
const CURRENT = 'Mapping the Shrines';

function stringValues(node: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object')
    for (const [key, value] of Object.entries(node))
      stringValues(value, path ? `${path}.${key}` : key, out);
  /* Function-valued entries interpolate their arguments and are not checked —
     none of them names the archive, and calling them here would need fixtures
     for every signature. If one ever does, it will be caught on the page. */
}

describe('the archive names itself consistently', () => {
  for (const locale of ['en', 'ur'] as const) {
    it(`no ${locale} UI string carries the retired name`, () => {
      const found: Array<[string, string]> = [];
      stringValues(TABLES[locale], '', found);
      expect(found.filter(([, value]) => RETIRED.test(value))).toEqual([]);
    });
  }

  it('the English strings still say the current name somewhere', () => {
    const found: Array<[string, string]> = [];
    stringValues(TABLES.en, '', found);
    expect(found.some(([, value]) => value.includes(CURRENT))).toBe(true);
  });
});

describe('the graph page agrees with itself about who is in it', () => {
  /* True while the archive covers more than one tradition — which is the
     condition that makes "saints" the wrong word for the figure list. */
  const multiTradition = CATEGORY_ORDER.length > 1;

  it('the English intro does not narrow the figures to saints', () => {
    expect(multiTradition).toBe(true);
    expect(TABLES.en.graphExplorerIntro).not.toMatch(/\bsaints\b/i);
  });

  it('the Urdu intro does not narrow the figures to اولیاء', () => {
    expect(TABLES.ur.graphExplorerIntro).not.toMatch(/اولیاء/);
  });

  it('the note that already said it correctly is still there', () => {
    expect(TABLES.en.graphExplorerFiguresNote).toMatch(/not every figure here is a Sufi saint/i);
  });
});
