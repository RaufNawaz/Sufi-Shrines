// @vitest-environment node
/**
 * The contradiction disclosures must be keyed by the slug the reader arrives at
 * (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `src/data/source-notes.json` holds the archive's *"Where the source
 * contradicts itself"* disclosures — the cleaned, attributed, bilingual form
 * created by the 22 August ruling. `ShrinePage` looks them up by `shrine.slug`.
 *
 * Six of its keys were the sheet's `id` column instead. Two of those belong to
 * the known unpublished entries; **four were live pages that published no
 * disclosure at all**:
 *
 *     tahir-bandagi-qadri               → darbar-hazrat-tahir-bandagi-qadri
 *     wasif-ali-wasif                   → darbar-wasif-ali-wasif
 *     khawaja-feroz-ud-din-gharib-nawaz → darbar-hazrat-khawaja-feroz-ud-din-…-nizami
 *     ghazi-ilm-din-shaheed             → darbar-ghazi-ilm-din-shaheed
 *
 * Among what a reader did not see: that Darbar Hazrat Tahir Bandagi Qadri's
 * position within a 475-kanal graveyard is unresolved, and that Darbar Ghazi Ilm
 * Din Shaheed's coordinate is a graveyard landmark rather than the grave. Those
 * are the pages where the archive's central claim is being made, and silently
 * was not.
 *
 * ## Why the existing test could not fail
 *
 * `SourceNotes.test.tsx` builds its expectation as
 * `rows.filter(r => r.qa_note).map(r => r.id)` and compares it to
 * `Object.keys(table)`. **Both sides are the `id` column.** It asserts that the
 * table is keyed the way the table is keyed, which is true of any keying.
 *
 * `sourceNoteSlugs.ts`'s own header says a slug missing from the index is *"a
 * disclosure a reader silently never sees — a failure with no symptom, which is
 * why it is asserted in both directions"*. Both directions were the same
 * direction.
 *
 * So this test joins against the slug `buildSlugs` produces — the same function
 * the router, the prerenderer and the graph use — which is the only side that
 * can disagree with the table.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSlugs } from '../../../../scripts/data/lib/slugs.mjs';
import { SOURCE_NOTE_SLUGS } from '../../../data/sourceNoteSlugs';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

const routeSlugs = (): Set<string> => {
  const rows = (
    JSON.parse(read('src', 'data', 'shrines-fallback.json')) as {
      rows: Record<string, unknown>[];
    }
  ).rows;
  return new Set(buildSlugs(rows) as string[]);
};

const noteTable = (): Record<string, unknown> =>
  JSON.parse(read('src', 'data', 'source-notes.json')) as Record<string, unknown>;

/**
 * Keys that are correctly not route slugs today.
 *
 * Both belong to the two drafted shrines that live in the sheet and are absent
 * from the 169-row snapshot — the same pair `data:check:unpublished` reports and
 * the same pair that owns the two unreferenced photo directories. Their notes
 * were written before their rows could ship. When `npm run data:build` runs,
 * these stop being exceptions and the assertion below says so.
 */
export const EXPECTED_NON_ROUTE_KEYS = new Set([
  '_readme',
  'darbar-hazrat-shah-gohar-peer',
  'darbar-mian-qurban-ali-shah',
]);

describe('source-note keys', () => {
  it('are the slugs a reader arrives at', () => {
    const slugs = routeSlugs();
    const orphans = Object.keys(noteTable()).filter(
      (k) => !EXPECTED_NON_ROUTE_KEYS.has(k) && !slugs.has(k),
    );
    expect(
      orphans,
      orphans.length === 0
        ? ''
        : `${orphans.length} disclosure(s) are keyed by something that is not a route:\n` +
            `${orphans.map((o) => `  ${o}`).join('\n')}\n\n` +
            'The page looks them up by `shrine.slug`, which is buildStableSlug(Name) — not the\n' +
            '`id` column. A key that is not a route is a contradiction the archive wrote down and\n' +
            'no reader will ever see, on exactly the pages where its central claim is being made.',
    ).toEqual([]);
  });

  it('names no exception that has stopped being one', () => {
    const slugs = routeSlugs();
    const table = noteTable();
    const stale = [...EXPECTED_NON_ROUTE_KEYS].filter(
      (k) => k !== '_readme' && (slugs.has(k) || !(k in table)),
    );
    expect(
      stale,
      stale.length === 0
        ? ''
        : `${stale.length} exception(s) are no longer needed — the row now ships, or the note is ` +
            `gone. Delete the line:\n${stale.map((s) => `  ${s}`).join('\n')}`,
    ).toEqual([]);
  });

  it('keeps the derived slug list in step with the table', () => {
    /* `sourceNoteSlugs.ts` exists so a page with no disclosure does not download
       a 92.6 KB chunk to render nothing. It is hand-maintained beside the JSON,
       so it can drift — and a slug missing from it withholds a disclosure just
       as effectively as a wrong key does. */
    const withNotes = Object.entries(noteTable())
      .filter(([k, v]) => k !== '_readme' && Array.isArray(v) && v.length > 0)
      .map(([k]) => k)
      .sort();
    expect([...SOURCE_NOTE_SLUGS].sort()).toEqual(withNotes);
  });

  it('reaches the four entries that were silently losing theirs', () => {
    // Named, because a re-key is easy to half-apply and these are the four.
    const slugs = routeSlugs();
    const table = noteTable();
    for (const slug of [
      'darbar-hazrat-tahir-bandagi-qadri',
      'darbar-wasif-ali-wasif',
      'darbar-hazrat-khawaja-feroz-ud-din-gharib-nawaz-chishti-nizami',
      'darbar-ghazi-ilm-din-shaheed',
    ]) {
      expect(slugs.has(slug), `${slug} is no longer a route`).toBe(true);
      expect(table[slug], `${slug} lost its disclosure again`).toBeDefined();
      expect(SOURCE_NOTE_SLUGS).toContain(slug);
    }
  });
});
