// @vitest-environment node
/**
 * The slim index must be a projection of the dataset, not a second copy of it.
 *
 * The front door downloads 672 KB of article prose to draw 169 dots, and this
 * index is the fix: the same rows with everything the map does not render taken
 * out, 22× smaller. The danger it introduces is the one this archive really
 * cannot ship — **a slim index that drifts puts a pin where the entry does not
 * claim to be**, and a reader has no way to tell.
 *
 * So what is asserted is not "the file looks right" but that every row is
 * identical, field for field, to the row it was projected from, and that the
 * two generators agree on which fields those are.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShrines } from '../shrineModel';
import { INDEX_COLUMNS } from '../../../../scripts/data/build-shrine-index.mjs';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const full = read('data/shrines.json') as { rows: Record<string, string>[] };
const slim = read('src/data/shrines-index.json') as {
  columns: string[];
  rows: Record<string, string>[];
};

describe('the map’s slim index', () => {
  it('carries every row of the dataset, in the same order', () => {
    /* Order matters beyond tidiness: `buildShrines` derives slugs across the
       whole row set, so a reordered index would generate different slugs and
       every marker would link somewhere else. */
    expect(slim.rows.length).toBe(full.rows.length);
    expect(slim.rows.map((r) => r.Name)).toEqual(full.rows.map((r) => r.Name));
  });

  it('never disagrees with the dataset about a single field', () => {
    const drift: string[] = [];
    full.rows.forEach((row, i) => {
      for (const column of slim.columns) {
        const want = String(row[column] ?? '').trim();
        const got = String(slim.rows[i][column] ?? '').trim();
        if (want !== got) drift.push(`${row.Name} · ${column}`);
      }
    });
    expect(drift, 'a slim row that disagrees can put a pin in the wrong place').toEqual([]);
  });

  it('agrees with the generator that writes it during a live build', () => {
    /* build-dataset.mjs emits this file from the rows it has just fetched, and
       build-shrine-index.mjs re-projects it from data/shrines.json. Two writers
       of one file must not hold two ideas of its shape. */
    const liveGenerator = readFileSync(join(ROOT, 'scripts/data/build-dataset.mjs'), 'utf8');
    const block = /const INDEX_COLUMNS = \[([\s\S]*?)\];/.exec(liveGenerator);
    expect(block, 'INDEX_COLUMNS vanished from build-dataset.mjs').not.toBeNull();
    const declared = [...block![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(declared).toEqual(INDEX_COLUMNS);
    expect(slim.columns).toEqual(INDEX_COLUMNS);
  });

  it('produces real shrines, with the card’s fields present', () => {
    /* The constraint from the rendering side: anything the sidebar shows before
       the CSV lands has to be there, or the card fills its holes a second later
       and reads as breakage. */
    const shrines = buildShrines(slim.rows);
    expect(shrines.length).toBe(full.rows.length);
    /* Coordinates live on `latLng`, not on `lat`/`lng` — the first draft of this
       assertion read fields that do not exist and reported 0 mapped shrines out
       of 169, which is what an assertion looks like when it is testing the test.
       Compared against the full dataset rather than a number typed here. */
    const mapped = shrines.filter((s) => s.latLng);
    expect(mapped.length).toBe(buildShrines(full.rows).filter((s) => s.latLng).length);
    expect(mapped.length).toBeGreaterThan(150);
    for (const s of shrines) {
      expect(s.name, 'a nameless row cannot be a marker').toBeTruthy();
      expect(s.slug).toBeTruthy();
    }
    /* Both provenance badges and the thumbnail, on the same rows as the full
       dataset — the fields the card would otherwise fill in late. */
    const fullShrines = buildShrines(full.rows);
    const withImage = (list: ReturnType<typeof buildShrines>) =>
      list.filter((s) => s.imageUrl).length;
    expect(withImage(shrines)).toBe(withImage(fullShrines));
    expect(shrines.filter((s) => s.supportLevel).length).toBe(
      fullShrines.filter((s) => s.supportLevel).length,
    );
    expect(shrines.filter((s) => s.category).length).toBe(
      fullShrines.filter((s) => s.category).length,
    );
  });

  it('generates the same slugs as the full dataset', () => {
    /* The property every marker link depends on. */
    expect(buildShrines(slim.rows).map((s) => s.slug)).toEqual(
      buildShrines(full.rows).map((s) => s.slug),
    );
  });

  it('leaves the prose behind, which is the entire point', () => {
    const bytes = JSON.stringify(slim).length;
    expect(bytes).toBeLessThan(120_000);
    expect(slim.columns).not.toContain('Description');
    expect(slim.columns).not.toContain('qa_note');
  });
});
