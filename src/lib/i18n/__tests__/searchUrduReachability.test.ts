// @vitest-environment node
/**
 * Can an Urdu reader find this by typing its Urdu name?
 *
 * The mission bar is that the Urdu edition is as complete as the English one,
 * and search is where that fails most quietly: nothing throws, no page looks
 * wrong, and the reader concludes the archive does not hold the person they
 * were looking for.
 *
 * It did fail, for people only, until 30 August 2026 (HANDOVER §9.170). Typing
 * `ماتا ترپتا` returned six shrines containing ماتا or داتا and no figures group
 * at all; `بے بے نانکی` returned seven gurdwaras and not Bebe Nanaki, who has
 * been in the archive from the start. Orders and traditions were fine
 * throughout — 9 orders carry their Urdu in `aka` (from the node's
 * `arabicName`) and 8 traditions carry `nameUr` from the tradition seed, while
 * 241 figures carried nothing, because a figure's Urdu lives in the dictionary
 * and resolves at render time.
 *
 * WHAT THIS TEST BECAME, AND WHY IT MOVED. It was written as a *budget of 241*
 * — the debt bounded so it could not silently grow while the fix sat in another
 * lane's files. The fix landed the same day, on the consumer side:
 * `ArchiveSearch` enriches each row through `localizeFigureName(entity, 'ur')`.
 * That made the budget measure the wrong thing. The index is unchanged and will
 * stay unchanged — 241 figures still carry no `nameUr`, correctly — so a test
 * counting index rows now passes for a reason unrelated to whether search works.
 *
 * The property that actually matters after the fix is **dictionary coverage**:
 * a figure whose name has no seed entry falls back to its Latin string and is
 * unfindable in Urdu again. So the budget is gone and this asserts zero.
 *
 * WHY IT IS NOT A DUPLICATE OF `figureNameUrduParity`. That test asks the
 * question of the **graph node**, which carries `altNames`, so
 * `translateNameToUrdu` gets a second chance through them. `ArchiveSearch` calls
 * the same resolver with a **search-index row**, which has `aka` but no
 * `altNames` — so the fallback is empty and search sees strictly less than the
 * page does. A figure resolving only through an alt-name would pass there and
 * fail here. None does today; this is what keeps it that way.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localizeFigureName, localizeOrderName } from '../localizeKgName';

const ROOT = join(__dirname, '../../../..');
const index = JSON.parse(readFileSync(join(ROOT, 'data/kg-search-index.json'), 'utf8')) as {
  type: 'figure' | 'order' | 'tradition';
  slug: string;
  name: string;
  nameUr?: string;
  aka?: string[];
}[];

const hasLatin = (s: string) => /[A-Za-z]/.test(s);
const hasArabicScript = (s: string) => /[؀-ۿ]/.test(s);

describe('finding an entity by its Urdu name', () => {
  it('has an index to check', () => {
    expect(index.filter((r) => r.type === 'figure').length).toBeGreaterThan(200);
  });

  it('resolves every FIGURE to Urdu from the row alone, as search actually calls it', () => {
    /* `localizeFigureName` is deliberately given the INDEX ROW, not the graph
       node, because that is what `ArchiveSearch` passes it. The row has no
       `altNames`, so this is the strict form of the question. */
    const unresolved = index
      .filter((r) => r.type === 'figure')
      .filter((r) => hasLatin(localizeFigureName(r, 'ur')))
      .map((r) => `${r.slug} (${r.name})`)
      .sort();
    expect(
      unresolved,
      'these figures fall back to their Latin name in the Urdu search palette, so an Urdu reader ' +
        'cannot find them by typing their name. Add each to SAINTS in urdu-i18n/build_dictionary.py ' +
        'and re-run the Urdu pipeline — do NOT relax this by passing altNames, which would only ' +
        'hide the gap behind a second-chance lookup the page has and search does not.',
    ).toEqual([]);
  });

  it('resolves every ORDER and TRADITION too', () => {
    const unresolved = index
      .filter((r) => r.type !== 'figure')
      .filter((r) => {
        if (r.nameUr && hasArabicScript(r.nameUr)) return false;
        if ((r.aka ?? []).some(hasArabicScript)) return false;
        return hasLatin(localizeOrderName(r, 'ur'));
      })
      .map((r) => `${r.type}:${r.slug}`)
      .sort();
    expect(unresolved).toEqual([]);
  });

  it('refuses the producer-side fix, which was considered and rejected', () => {
    /* An executable comment. If figures ever gain `nameUr` in the index it means
       `build-kg.mjs` started mirroring the Urdu dictionary — the mirror that
       produced §9.163's false positive — and added back part of the 59 KB §9.167
       took out of a file eager on every graph route. The resolution belongs in
       the app, where the dictionary already lives. */
    expect(
      index.filter((r) => r.type === 'figure' && r.nameUr).map((r) => r.slug),
      'figures gained nameUr in the search index, which means the builder is mirroring the Urdu ' +
        'dictionary. See HANDOVER §9.163 for why that mirror is a bad trade and §9.167 for what it ' +
        'costs the bundle. The fix belongs in ArchiveSearch.tsx.',
    ).toEqual([]);
  });
});
