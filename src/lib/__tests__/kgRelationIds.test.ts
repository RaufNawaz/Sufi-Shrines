// @vitest-environment node
/**
 * The relation id the app derives is the one the build meant.
 *
 * `data/kg.json` stopped carrying `relations[].id` on 30 August 2026. Every
 * character of one is already in the four fields beside it —
 * `type[:kinType]:subject:object` — so the graph was shipping 49 KB of its own
 * primary key as eager JS on every route that touches it, the largest single
 * field in the file and more than all its quotes together. `relationId()` in
 * `src/lib/kg.ts` derives it back.
 *
 * The strip was verified once, directly, rather than argued for: the 707 ids
 * derived from the stripped file are **set-identical** to the 707 that shipped
 * in the file before it. That check is not repeatable as a test — it compares
 * against a git revision that moves — so it is recorded here and the tests below
 * cover the properties that have to keep holding.
 *
 * A note on a risk that turned out not to exist, because the next person will
 * suspect the same thing: `data/kg-sources.json` is *also* keyed on strings that
 * look like relation ids, and it would be a real hazard if the two joined. They
 * do not. Its 533 attestations are all `attested_in:…`, a relation type that
 * lives only in that file and never in `kg.json#relations`, so there is no
 * cross-file join to break. An assertion written against that join passed
 * vacuously — it filtered 533 rows down to none — and was removed rather than
 * kept as false comfort.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getKGStore, relationId } from '../kg';

const ROOT = join(__dirname, '../../..');
const rawGraph = JSON.parse(readFileSync(join(ROOT, 'data/kg.json'), 'utf8')) as {
  relations: Record<string, unknown>[];
};
const kg = getKGStore();

describe('derived relation ids', () => {
  it('are not shipped in the graph', () => {
    /* The point of the change. If ids come back, the file has regained 49 KB
       and this test is the only thing that would say so. */
    const withId = rawGraph.relations.filter((r) => 'id' in r);
    expect(withId.length, 'data/kg.json is carrying relation ids again').toBe(0);
  });

  it('gives every relation an id', () => {
    expect(kg.relations.length).toBeGreaterThan(600);
    expect(kg.relations.filter((r) => !r.id).map((r) => `${r.type} ${r.subject}`)).toEqual([]);
  });

  it('gives every relation a DISTINCT id', () => {
    /* A collision would silently merge two claims wherever anything keys on the
       id — and the kin layer deliberately keys on `kinType` too, because one row
       records two ties at once (Shah Abul Muali is both nephew and son-in-law of
       Daud Bandagi). Without kinType in the id that pair collapses into one. */
    const seen = new Map<string, number>();
    for (const r of kg.relations) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });

  it('produces exactly the format the shipped ids used', () => {
    /* A literal pin, because the derivation is only correct against a format
       nobody wrote down. These two strings are copied from `data/kg.json` as it
       was BEFORE the ids were stripped — a lineage edge and a kin edge, the
       latter because it is the one type that carries `kinType` in the middle.
       If `relationId` is ever "tidied", this fails with the old and new strings
       side by side rather than the graph quietly re-keying itself. */
    expect(
      relationId({
        type: 'disciple_of',
        subject: 'saint:bulleh-shah',
        object: 'saint:shah-inayat-qadiri',
      }),
    ).toBe('disciple_of:saint:bulleh-shah:saint:shah-inayat-qadiri');
    expect(
      relationId({
        type: 'kin_of',
        kinType: 'grandson_of',
        subject: 'saint:shah-rukn-e-alam',
        object: 'saint:bahauddin-zakariya',
      }),
    ).toBe('kin_of:grandson_of:saint:shah-rukn-e-alam:saint:bahauddin-zakariya');
  });

  it('can be parsed back into the fields it came from', () => {
    /* Injectivity, which is what makes a derived key safe to use as one. The id
       joins four fields with ':' and nothing escapes them, so a slug containing
       a colon would make two different relations share an id — or make one id
       parse as a different relation. No slug does today; this fails on the day
       one is introduced, which is the only day it matters. */
    const ambiguous = kg.relations
      .filter((r) =>
        [r.type, r.kinType, r.subject, r.object].some(
          (f) => f && /:/.test(String(f).replace(/^(saint|order|place|event):/, '')),
        ),
      )
      .map((r) => r.id);
    expect(
      ambiguous,
      'a field inside a relation id contains the separator, so the id is ambiguous',
    ).toEqual([]);
  });
});
