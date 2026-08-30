// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  alsoKnownAsFor,
  TRADITIONS,
  TRADITION_MEMBERSHIPS,
  getTraditionBySlug,
  getTraditionMembers,
  getTraditionsForShrine,
} from '../traditions';

/**
 * The reading half of the tradition layer.
 *
 * The build side is already gated by `src/lib/__tests__/traditions.test.ts` —
 * verbatim quotes, Urdu present, categories valid, non-memberships kept. What
 * is asserted here is what the *renderer* depends on and could break without
 * any of that going red: that a lookup returns everything the data holds.
 */
describe('the tradition accessors', () => {
  it('has traditions and memberships to read', () => {
    expect(TRADITIONS.length).toBeGreaterThanOrEqual(6);
    expect(TRADITION_MEMBERSHIPS.length).toBeGreaterThanOrEqual(10);
  });

  it('resolves a tradition by slug, and nothing by a slug it does not have', () => {
    expect(getTraditionBySlug('nath')?.name).toBe('Nath');
    expect(getTraditionBySlug('qadiriyya')).toBeUndefined(); // a Sufi order, not a tradition
  });

  it('returns every tradition a site holds, not the first', () => {
    /*
     * The regression this file was written for. `getTraditionsForShrine` was
     * `.find()` when the layer held six traditions and ten non-overlapping
     * memberships. The layer grew to eight and twenty-one, three sites gained a
     * second tradition, and `.find()` does not fail when a second answer
     * appears — it silently returns one of them. Nothing else in the suite
     * would have noticed.
     */
    const multi = new Map<string, string[]>();
    for (const m of TRADITION_MEMBERSHIPS) {
      multi.set(m.shrineSlug, [...(multi.get(m.shrineSlug) ?? []), m.traditionSlug]);
    }
    const withTwo = [...multi.entries()].filter(([, slugs]) => slugs.length > 1);
    expect(withTwo.length, 'the data no longer has a multi-tradition site to test with').toBeGreaterThan(0);

    for (const [shrineSlug, slugs] of withTwo) {
      const found = getTraditionsForShrine(shrineSlug).map((t) => t.slug);
      expect(found.sort()).toEqual([...slugs].sort());
    }
  });

  it('returns nothing for a site the corpus does not place', () => {
    // Absence is "the entry does not name one", never "it has none" — and it
    // is never filled in from the site's category.
    expect(getTraditionsForShrine('data-darbar')).toEqual([]);
    expect(getTraditionsForShrine('no-such-shrine')).toEqual([]);
  });

  it('lists the members of a tradition, and every membership resolves to a real one', () => {
    expect(getTraditionMembers('nath').length).toBeGreaterThanOrEqual(3);
    expect(getTraditionMembers('no-such-tradition')).toEqual([]);

    const slugs = new Set(TRADITIONS.map((t) => t.slug));
    const orphans = TRADITION_MEMBERSHIPS.filter((m) => !slugs.has(m.traditionSlug));
    expect(orphans, 'a membership points at a tradition that is not in the file').toEqual([]);
  });

  it('gives every tradition the fields a page renders', () => {
    /* The page shows all of these unconditionally. A missing one renders as a
       gap rather than as an error, which is the failure mode worth a test. */
    for (const t of TRADITIONS) {
      expect(t.name.trim(), `${t.slug}: no name`).not.toBe('');
      expect(t.nameUr.trim(), `${t.slug}: no Urdu name`).not.toBe('');
      expect(/[A-Za-z]/.test(t.nameUr), `${t.slug}: Latin in the Urdu name`).toBe(false);
      expect(t.definition.trim().length, `${t.slug}: no definition`).toBeGreaterThan(60);
      expect(t.definitionUr.trim().length, `${t.slug}: no Urdu definition`).toBeGreaterThan(30);
      expect(t.definitionShrine.trim(), `${t.slug}: no source entry`).not.toBe('');
      /* Read through the helper, because one of the eight records omits the
         key and reading it directly rendered a blank page. */
      expect(Array.isArray(alsoKnownAsFor(t)), `${t.slug}: alsoKnownAs is not a list`).toBe(true);
    }
  });
});
