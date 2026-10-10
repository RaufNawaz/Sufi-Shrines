import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupBookFigures, BOOK_FIGURE_REGIONS_UR, BOOK_FIGURE_WORKS } from '../../bookFigures';
import type { BookFigureRecord } from '../../bookFigures';
import kg from '../../../../data/kg.json';

/* The book-figure seeds (Rauf, 10 October 2026: saints with no site in Pakistan
   go to the saints-and-orders layer, team view until reviewed). These hold the
   three things the sheet on /graph depends on and cannot see for itself. */
const DATA = join(__dirname, '../../../../data');
const files = readdirSync(DATA)
  .filter((f) => /^kg-book-figures-.+\.json$/.test(f))
  .map((f) => ({
    file: f,
    ...(JSON.parse(readFileSync(join(DATA, f), 'utf-8')) as { work: string; figures: BookFigureRecord[] }),
  }));

describe('book figures', () => {
  it('exist, and every work has a title for the sheet', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(BOOK_FIGURE_WORKS[f.work], f.file).toBeDefined();
  });

  it('carry only regions the Urdu view can name', () => {
    const missing = new Set(files.flatMap((f) => f.figures.map((r) => r.region)).filter((r) => !BOOK_FIGURE_REGIONS_UR[r]));
    expect([...missing]).toEqual([]);
  });

  it('keep their source line verbatim and say where it is', () => {
    for (const f of files) {
      const takeaways = readFileSync(join(DATA, `../entries/book_takeaways/${f.work}.md`), 'utf-8').split('\n');
      for (const r of f.figures) {
        expect(r.name, `${f.file}:${r.line}`).not.toBe('');
        // a numbered entry is a whole line; a named one is an item of the line it cites
        expect(takeaways[r.line - 1], `${f.file} ${r.slug}`).toContain(r.text.replace(/^- /, '').trim());
      }
    }
  });

  it('join only figures the graph really holds', () => {
    const slugs = new Set((kg as { saints: { slug: string }[] }).saints.map((s) => s.slug));
    for (const f of files)
      for (const r of f.figures) if (r.joinsSaint) expect(slugs.has(r.joinsSaint), r.joinsSaint).toBe(true);
  });

  it('are not graph nodes: an unreviewed transcription stays out of kg.json', () => {
    const slugs = new Set((kg as { saints: { slug: string }[] }).saints.map((s) => s.slug));
    const leaked = files.flatMap((f) => f.figures.filter((r) => !r.joinsSaint && slugs.has(r.slug)));
    expect(leaked.map((r) => r.slug)).toEqual([]);
  });

  it('group one figure per slug and keep every repeat as a record', () => {
    const grouped = groupBookFigures(files);
    const records = files.reduce((n, f) => n + f.figures.length, 0);
    expect(grouped.reduce((n, g) => n + g.records.length, 0)).toBe(records);
    expect(new Set(grouped.map((g) => `${g.work}:${g.slug}`)).size).toBe(grouped.length);
  });
});
