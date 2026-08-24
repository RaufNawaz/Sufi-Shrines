// @vitest-environment node
/**
 * The archive's source layer.
 *
 * `kg.sources` was an empty array and `stats.sources` was 0 — a knowledge graph
 * with no source layer, on an archive whose distinguishing claim is provenance.
 * The `attested_in` relation type had been in `KGRelationType` since the graph
 * was designed, described as "entity/relation id → source", and nothing had ever
 * emitted one. 533 citations across 168 entries were counted on `/coverage` and
 * modelled nowhere.
 *
 * The point of a graph rather than a count is the *sharing*: 533 citations
 * dedupe to 464 sources, and the most load-bearing of them — Alam Faqri's
 * *Tazkirah Awliya-e-Pakistan* — turns out to underpin 25 entries. "What does
 * this rest on, and what else rests on the same thing" is the question a reader
 * of an archive actually has.
 *
 * Four things are asserted, and the fourth is the one that will bite:
 *
 * 1. The layer exists and is wired (every attestation resolves both ends).
 * 2. Citation text is verbatim — the reader's search string, unedited.
 * 3. `sourceType` is guessed for nothing.
 * 4. **None of it is in `kg.json`.** `src/lib/kg.ts` imports the graph
 *    statically, so 464 nodes and 533 relations there took `/order/:slug` from
 *    600 KB to 769 KB of eager JS for data no page renders — the same regression
 *    class as §9.9x's 300 KB. The budget check catches the symptom on a build;
 *    this catches the cause.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bibliographyItems } from '../bibliography';
import { buildSlugs } from '../../../../scripts/data/lib/slugs.mjs';

const ROOT = join(__dirname, '..', '..', '..', '..');
const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));
const layer = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-sources.json'), 'utf8'));
const dataset = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
const rows: Record<string, string>[] = dataset.rows ?? dataset;
const slugs = buildSlugs(rows) as string[];

interface Source {
  id: string;
  type: string;
  slug: string;
  name: string;
  sourceType?: string;
}
const sources: Source[] = layer.sources;
const attestations: { id: string; type: string; subject: string; object: string }[] =
  layer.attestations;

describe('the layer exists', () => {
  it('holds the archive’s sources', () => {
    expect(sources.length).toBeGreaterThan(400);
    expect(kg.stats.sources).toBe(sources.length);
  });

  it('has one attestation per citation in the data', () => {
    /* Counted through the shared extractor rather than hardcoded, so this
       tracks the sheet instead of a snapshot of it. */
    const citations = rows.reduce(
      (sum, row) =>
        sum +
        bibliographyItems(String(row['Sources'] ?? ''), String(row['Description'] ?? '')).length,
      0,
    );
    expect(attestations.length).toBe(citations);
  });

  it('resolves both ends of every attestation', () => {
    const sourceIds = new Set(sources.map((s) => s.id));
    const shrineSlugs = new Set(slugs);
    const broken = attestations.filter(
      (a) => !sourceIds.has(a.object) || !shrineSlugs.has(a.subject),
    );
    expect(broken.map((a) => a.id)).toEqual([]);
  });

  it('shares a source between the entries that cite it', () => {
    /* If every citation became its own node this would be 533 sources and no
       edges worth traversing — the layer would be a list with extra steps. */
    const cites = new Map<string, number>();
    for (const a of attestations) cites.set(a.object, (cites.get(a.object) ?? 0) + 1);
    const shared = [...cites.values()].filter((n) => n > 1);
    expect(shared.length).toBeGreaterThan(10);
    expect(Math.max(...cites.values())).toBeGreaterThan(10);
  });

  it('gives every source a distinct id', () => {
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
  });
});

describe('what the nodes claim', () => {
  it('carries the citation verbatim', () => {
    /* RULE 2, and practically: the citation is the reader's exact search
       string. Every source's name must appear as an item in some entry's
       bibliography, character for character. */
    const recorded = new Set<string>();
    for (const row of rows) {
      for (const item of bibliographyItems(
        String(row['Sources'] ?? ''),
        String(row['Description'] ?? ''),
      )) {
        recorded.add(item);
      }
    }
    const edited = sources.filter((s) => !recorded.has(s.name)).map((s) => s.name.slice(0, 60));
    expect(edited, 'a citation was normalised, trimmed or reordered on its way into the graph').toEqual(
      [],
    );
  });

  it('guesses no source type', () => {
    /* Deciding book-vs-article from a bibliography line is the inference this
       project does not make. Only a citation that is nothing but a URL is
       unambiguous. */
    const guessed = sources
      .filter((s) => s.sourceType)
      .filter((s) => !/^<?https?:\/\/\S+>?$/.test(s.name.trim()));
    expect(guessed.map((s) => `${s.name.slice(0, 40)} → ${s.sourceType}`)).toEqual([]);
  });

  it('splits no citation into author, title and publisher', () => {
    /* All three are inside `name`, unsplit: a reliable split needs a parser for
       a dozen house styles, and a wrong one loses the reader their string. */
    for (const source of sources as unknown as Record<string, unknown>[]) {
      expect(source.author).toBeUndefined();
      expect(source.publisher).toBeUndefined();
    }
  });
});

describe('none of it reaches the browser', () => {
  it('keeps the source array out of kg.json', () => {
    /* `src/lib/kg.ts` imports the graph statically. 464 source nodes in
       kg.json took /order/:slug from 600 KB to 769 KB of eager JS for data no
       page renders. The bundle budget catches that on a build; this catches the
       cause, with the reason attached. */
    expect(
      kg.sources,
      'the source layer belongs in data/kg-sources.json — see build-kg.mjs',
    ).toBeUndefined();
  });

  it('keeps the attestations out of kg.json’s relations', () => {
    const leaked = (kg.relations as { type: string }[]).filter((r) => r.type === 'attested_in');
    expect(leaked.length, '533 attestations in the client bundle for data no page renders').toBe(0);
  });
});
