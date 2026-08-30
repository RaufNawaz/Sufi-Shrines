// @vitest-environment node
/**
 * Can an Urdu reader find this by typing its Urdu name?
 *
 * The archive's mission bar is that the Urdu edition is as complete as the
 * English one, and search is where that is easiest to fail silently: nothing
 * throws, no page looks wrong, and the reader simply concludes the archive does
 * not hold the person they were looking for.
 *
 * On 30 August 2026 it did fail, for people only (HANDOVER §9.170). Typing
 * `ماتا ترپتا` returned six shrines whose names contain ماتا or داتا and no
 * figures group at all; `بے بے نانکی` returned seven gurdwaras and not Bebe
 * Nanaki, who has been in the archive from the start. Meanwhile `چشتیہ` found
 * the Chishtiyya and `ناتھ` found the Nath tradition.
 *
 * The split is the interesting part, and it is why this test measures rows
 * rather than asserting a fix:
 *
 *   8 traditions — `nameUr` on the node, from the tradition seed   → findable
 *   9 orders     — `aka`, from the node's `arabicName`             → findable
 *   241 figures  — nothing                                          → NOT findable
 *
 * Orders work because nine Urdu names are small enough to author by hand and
 * live on the node. A figure's Urdu name lives in the dictionary and resolves at
 * render time, so the builder has nothing to copy — which is a seam, not a bug
 * in either half.
 *
 * WHY A BUDGET RATHER THAN AN ASSERTION. The fix belongs in
 * `src/components/search/ArchiveSearch.tsx` (enrich the loaded index through
 * `translateNameToUrdu` before matching), which was another session's live
 * territory when this was found. A test that simply failed would have been
 * deleted or skipped by whoever hit it next. A budget cannot be: it fails the
 * moment the number goes UP, it records the exact size of the debt, and when it
 * reaches zero the last line turns it into a permanent assertion — the same
 * ratchet that took the figure-name debt 58 → 66 → 57 → 0 (§9.159).
 *
 * Do NOT close this by writing `nameUr` onto every saint in `kg.json`. That
 * means `build-kg.mjs` mirroring the dictionary resolver — the mirror that
 * produced §9.163's false positive — and adds back part of the 59 KB §9.167
 * removed from a file that is eager on every graph route.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const index = JSON.parse(readFileSync(join(ROOT, 'data/kg-search-index.json'), 'utf8')) as {
  type: string;
  slug: string;
  name: string;
  nameUr?: string;
  aka?: string[];
}[];

const hasArabicScript = (s: string) => /[؀-ۿ]/.test(s);

/** Mirrors `haystacks()` in src/lib/search/entitySearch.ts: name, aka, nameUr. */
const findableInUrdu = (row: (typeof index)[number]) =>
  Boolean(row.nameUr && hasArabicScript(row.nameUr)) ||
  (row.aka ?? []).some(hasArabicScript) ||
  hasArabicScript(row.name);

/* The debt as measured on 30 August 2026. Lower it when the fix lands; never
   raise it. Reaching 0 means deleting this constant and asserting [] instead. */
const UNREACHABLE_FIGURES_BUDGET = 241;

describe('finding an entity by its Urdu name', () => {
  it('has an index to check', () => {
    expect(index.length).toBeGreaterThan(200);
  });

  it('leaves no ORDER or TRADITION unreachable — these are closed and stay closed', () => {
    /* Not a budget: both were already correct when this test was written, so
       there is nothing to ratchet and a regression is a plain failure. */
    const missing = index
      .filter((r) => r.type === 'order' || r.type === 'tradition')
      .filter((r) => !findableInUrdu(r))
      .map((r) => `${r.type}:${r.slug}`)
      .sort();
    expect(missing).toEqual([]);
  });

  it('does not let the figure debt grow', () => {
    const unreachable = index.filter((r) => r.type === 'figure' && !findableInUrdu(r));
    expect(
      unreachable.length,
      unreachable.length > UNREACHABLE_FIGURES_BUDGET
        ? `${unreachable.length - UNREACHABLE_FIGURES_BUDGET} more figure(s) cannot be found by ` +
            `their Urdu name than when this was measured. Adding figures is good; adding figures an ` +
            `Urdu reader cannot search for widens a gap the archive's own mission bar forbids.`
        : `the debt is ${unreachable.length}, below the recorded ${UNREACHABLE_FIGURES_BUDGET}. ` +
            `Lower UNREACHABLE_FIGURES_BUDGET to ${unreachable.length}. At 0, delete it and assert [].`,
    ).toBe(UNREACHABLE_FIGURES_BUDGET);
  });

  it('names the fix, so nobody has to re-derive it', () => {
    /* An executable comment. If figures ever gain `nameUr` in the index, the
       producer-side fix was taken and the warning above went unread — so this
       fails and says why, rather than the change passing quietly. */
    const figuresWithNameUr = index.filter((r) => r.type === 'figure' && r.nameUr);
    expect(
      figuresWithNameUr.map((r) => r.slug),
      'figures gained nameUr in the search index, which means build-kg is now mirroring the Urdu ' +
        'dictionary. See §9.163 for why that mirror is a bad trade and §9.167 for what it costs ' +
        'the bundle. The intended fix is in ArchiveSearch.tsx, not in the builder.',
    ).toEqual([]);
  });
});
