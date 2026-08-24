// @vitest-environment node
/**
 * Provenance the archive holds must be provenance the archive shows.
 *
 * Two directions are asserted here, and the second is the one that will
 * actually catch something:
 *
 * 1. The parser and the note builder behave — including the three figures who
 *    are both `lineageOnly` and biographically sourced, where returning one
 *    statement means dropping a true one.
 * 2. **Every `biographySource` in the shipped graph still resolves.** 95 of the
 *    97 point into the shrine dataset by filename, and the filename is
 *    hardcoded in `SHRINE_DATASET_FILES`. If the pipeline ever renames its
 *    export, those 95 stop being links and start being file paths printed at a
 *    reader — silently, because printing the raw reference is the deliberate
 *    fallback. This fails instead (RULE 4).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFigureSource, figureProvenance } from '../figureProvenance';
import { buildSlugs } from '../../../../scripts/data/lib/slugs.mjs';

describe('parsing a biographySource reference', () => {
  it('splits a dataset reference into file and entry slug', () => {
    const ref = parseFigureSource('data/shrines.csv#bari-imam');
    expect(ref).not.toBeNull();
    expect(ref?.file).toBe('data/shrines.csv');
    expect(ref?.fragment).toBe('bari-imam');
    expect(ref?.shrineSlug).toBe('bari-imam');
    expect(ref?.raw).toBe('data/shrines.csv#bari-imam');
  });

  it('refuses to read a fragment as an entry slug when the file is not the dataset', () => {
    /* Two figures cite a drafted entry. That is a real citable location with no
       route behind it, and inventing `/shrine/entry_shah_gohar_peer` would be a
       404 dressed as provenance. */
    const ref = parseFigureSource('entries/entry_shah_gohar_peer.md');
    expect(ref?.file).toBe('entries/entry_shah_gohar_peer.md');
    expect(ref?.fragment).toBeNull();
    expect(ref?.shrineSlug).toBeNull();
  });

  it('treats an empty fragment as no fragment', () => {
    expect(parseFigureSource('data/shrines.csv#')?.shrineSlug).toBeNull();
    expect(parseFigureSource('data/shrines.csv# ')?.shrineSlug).toBeNull();
  });

  it('returns null for nothing recorded', () => {
    expect(parseFigureSource(undefined)).toBeNull();
    expect(parseFigureSource('')).toBeNull();
    expect(parseFigureSource('   ')).toBeNull();
  });
});

describe('the notes a figure carries', () => {
  it('says nothing for a figure typed in from the survey', () => {
    /* 42 figures. Silence here is a claim: it means the value came from the
       archive's own record by hand, which is the best provenance it has. */
    expect(figureProvenance({ lineageOnly: undefined, biographySource: undefined })).toEqual([]);
  });

  it('flags an unreviewed machine-read biography, with its source', () => {
    const notes = figureProvenance({
      biographySource: 'data/shrines.csv#data-darbar',
      biographyReviewed: false,
    });
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe('biography');
    expect(notes[0].kind === 'biography' && notes[0].reviewed).toBe(false);
    expect(notes[0].kind === 'biography' && notes[0].source?.shrineSlug).toBe('data-darbar');
  });

  it('keeps the source once a person has read it, and drops only the flag', () => {
    /* Provenance is not a defect notice. A reviewed biography still came from
       somewhere and the reader is still owed the reference. */
    const notes = figureProvenance({
      biographySource: 'data/shrines.csv#data-darbar',
      biographyReviewed: true,
    });
    expect(notes.map((n) => n.kind)).toEqual(['biography']);
    expect(notes[0].kind === 'biography' && notes[0].reviewed).toBe(true);
  });

  it('flags a biography read without a recorded source', () => {
    /* The review flag, not the citation, is what says a value was machine-read.
       An unreviewed claim with no citation is the one most worth flagging. */
    const notes = figureProvenance({ biographyReviewed: false });
    expect(notes).toHaveLength(1);
    expect(notes[0].kind === 'biography' && notes[0].source).toBeNull();
  });

  it('says a lineage-only figure has no entry here', () => {
    const notes = figureProvenance({ lineageOnly: true, reviewed: false });
    expect(notes.map((n) => n.kind)).toEqual(['lineage-only']);
    expect(notes[0].kind === 'lineage-only' && notes[0].reviewed).toBe(false);
  });

  it('makes both statements about a figure that is both, scope first', () => {
    /* Shah Abul Muali Qadri: no site in the archive, and a full sourced
       biography read out of the archive's own entry for a darbar. Collapsing
       these into one classification has to discard one true sentence. */
    const notes = figureProvenance({
      lineageOnly: true,
      reviewed: false,
      biographySource: 'data/shrines.csv#darbar-abul-muali-qadri',
      biographyReviewed: false,
    });
    expect(notes.map((n) => n.kind)).toEqual(['lineage-only', 'biography']);
  });
});

describe('the shipped graph', () => {
  const ROOT = join(__dirname, '..', '..', '..', '..');
  const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));
  const dataset = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
  const rows = Array.isArray(dataset) ? dataset : dataset.rows;
  const entrySlugs = new Set<string>(buildSlugs(rows) as string[]);

  const sourced = (kg.saints as Record<string, unknown>[]).filter((s) => s.biographySource);

  it('still has figures whose biography was machine-read', () => {
    // A floor, so the assertion below cannot pass by the field disappearing.
    expect(sourced.length).toBeGreaterThan(50);
  });

  it('resolves every dataset reference to an entry that exists', () => {
    const unresolved: string[] = [];
    for (const saint of sourced) {
      const ref = parseFigureSource(saint.biographySource as string);
      if (!ref) continue;
      if (ref.shrineSlug === null) {
        /* Only two shapes are known: a dataset reference with a slug, or a
           drafted entry file. A third shape means the pipeline started writing
           references this UI cannot present. */
        expect(ref.file, `${saint.slug as string} cites ${ref.raw}`).toMatch(/^entries\/.+\.md$/);
        continue;
      }
      if (!entrySlugs.has(ref.shrineSlug)) unresolved.push(`${saint.slug as string} → ${ref.raw}`);
    }
    expect(unresolved).toEqual([]);
  });

  it('has a note for every figure the pages would otherwise present unqualified', () => {
    const flagged = (kg.saints as Record<string, unknown>[]).filter(
      (s) => figureProvenance(s).length > 0,
    );
    /* 97 sourced biographies + 60 lineage-only nodes − 3 that are both. If this
       drops without the graph shrinking, a field stopped reaching the page. */
    expect(flagged.length).toBe(154);
  });
});
