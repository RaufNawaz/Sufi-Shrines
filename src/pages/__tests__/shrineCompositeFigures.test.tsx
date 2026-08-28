/**
 * The three rows that name two figures, and the four ways that can silently
 * break.
 *
 * A site held by two people is the archive's hardest identity case and its
 * worst-served one: before 28 August 2026 every handling of these three rows
 * lost one of the two, and for Gurdwara Rori Sahib the one lost was Bhai
 * Mardana — Guru Nanak's lifelong companion, absent from a graph holding
 * eighteen of Guru Nanak's gurdwaras. `saintCompositeFigures` fixed the graph;
 * this file covers the last mile, where the shrine page has to reach both.
 *
 * Rauf's ruling, 28 August 2026: *"for figure identity just preserve as much
 * information as you can because sometimes it is multiple saints."*
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ShrineInfobox } from '../../components/shrine/ShrineInfobox';
import { buildShrine } from '../../lib/data/shrineModel';
import { normalizeRow } from '../../lib/data/fieldAliasing';
import { renderWithProviders } from '../../test/utils';
import { compositeFiguresForShrine, figureSlugsForShrine } from '../../lib/kgShrineFigures';
import { localizeRecordedName } from '../../lib/i18n/localizeRecordedName';
import { loadUrduSeed } from '../../lib/i18n/urduFallback';
import type { KGSaint } from '../../types/kg';
import type { Shrine, ShrineRow } from '../../types/shrine';

const root = join(__dirname, '../../..');
const readJson = (rel: string) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

const composite = readJson('data/kg-composite-figures.json') as Record<
  string,
  { slug: string; name: string }[]
>;
const mainIndex = readJson('data/kg-shrine-figures.json') as Record<string, string[]>;
const kg = readJson('data/kg.json') as { saints: KGSaint[] };
const snapshot = readJson('src/data/shrines-fallback.json') as { rows: ShrineRow[] };

const compositeSlugs = Object.keys(composite);

beforeEach(() => {
  localStorage.clear();
});

describe('the composite index agrees with the graph it was built from', () => {
  it('has composite rows to check', () => {
    /* A floor, so nothing below can pass by the file emptying. Three as of
       28 August 2026 — a fourth composite row in the sheet should raise this
       and is not a failure. */
    expect(compositeSlugs.length).toBeGreaterThanOrEqual(3);
  });

  it('covers exactly the shrines the main index gives more than one figure', () => {
    /* The two files are written by the same run of build-kg.mjs off the same
       relations. If they ever disagree, ShrinePage renders one set of links and
       every other consumer reasons about another.

       Both directions, off the *main* index's own key set rather than off
       `compositeSlugs` — comparing the composite file against a list derived
       from the composite file is a check that cannot fail, which is the failure
       mode this repo has written up more than once. The interesting direction
       is the one that starts elsewhere: a fourth row growing a second figure in
       the main index while this file still holds three. */
    const everyShrine = Object.keys(mainIndex);
    expect(everyShrine.length).toBeGreaterThan(100);

    const multiInMain = everyShrine.filter((slug) => figureSlugsForShrine(slug).length > 1).sort();
    expect(multiInMain).toEqual([...compositeSlugs].sort());

    for (const slug of compositeSlugs) {
      expect(
        composite[slug].map((f) => f.slug),
        slug,
      ).toEqual(figureSlugsForShrine(slug));
    }
  });

  it('names every figure exactly as the graph node names it', () => {
    /* The name is what gets localized, and the Urdu dictionary is keyed on the
       English string. A name here that drifts from the graph's `name` would
       miss the dictionary and render Latin in the Urdu view — which is exactly
       how Bhai Mardana and Bhai Lalo first reached the archive, as two figure
       pages titled in Latin that no gate could see. */
    const byslug = new Map(kg.saints.map((s) => [s.slug, s.name]));
    for (const [shrineSlug, figures] of Object.entries(composite)) {
      for (const figure of figures) {
        expect(byslug.get(figure.slug), `${shrineSlug} → ${figure.slug}`).toBe(figure.name);
      }
    }
  });

  it('reads back through the accessor, and is empty for an ordinary row', () => {
    /* The empty case is the one that matters: it is what tells ShrinePage to
       keep rendering the single link the other 166 rows have always had. */
    for (const slug of compositeSlugs) {
      expect(compositeFiguresForShrine(slug)).toEqual(composite[slug]);
    }
    expect(compositeFiguresForShrine('data-darbar')).toEqual([]);
    expect(compositeFiguresForShrine('no-such-shrine')).toEqual([]);
  });

  it('resolves every figure to a real graph node', () => {
    const known = new Set(kg.saints.map((s) => s.slug));
    const missing = Object.values(composite)
      .flat()
      .map((f) => f.slug)
      .filter((slug) => !known.has(slug));
    expect(missing).toEqual([]);
  });
});

describe('the Urdu edition reaches both figures too', () => {
  beforeAll(async () => {
    /* The dictionary is loaded on demand, never imported — an English reader
       must not ship 80 KB of Urdu. A test that translates has to wait for it,
       or it measures the miss rather than the translation. */
    await loadUrduSeed();
  });

  it('leaves no composite figure named in Latin', () => {
    /* `localizeRecordedName` is the lookup ShrinePage actually calls. It goes
       through the dictionary, NOT through the graph node's `nameUr` — so a
       translation that exists only on the node would pass
       figureNameUrduParity.test.ts and still put Latin on the shrine page. */
    const latin = Object.values(composite)
      .flat()
      .map((f) => ({ slug: f.slug, ur: localizeRecordedName(f.name, 'ur') }))
      .filter((f) => /[A-Za-z]/.test(f.ur))
      .map((f) => f.slug);
    expect(latin).toEqual([]);
  });
});

describe('compositeFigureCellIsShown — the sheet keeps its own wording', () => {
  /* ShrinePage's summary line shows the canonical figure names, because it
     renders one link per figure and the recorded cell is a single string
     spanning both. That is only honest while the recorded cell is still on the
     page somewhere verbatim, and the place it lives is the infobox: `Sufi
     Saint` is an INFOBOX_PRIORITY_KEY, so it is rendered as recorded under the
     row's own figure_type label.

     If a change to INFOBOX_PRIORITY_KEYS, MAX_INFOBOX_ROWS or the filters above
     them ever drops that row, this fails — and it should, because at that point
     the only naming of these figures anywhere on the page would be in words the
     sheet never used (RULE 2). */
  const bySlug = new Map<string, { shrine: Shrine; recorded: string }>();
  for (const [index, raw] of snapshot.rows.entries()) {
    const shrine = buildShrine(normalizeRow(raw), index);
    /* The recorded cell is read off the *raw* sheet row, not the normalized
       one: normalization is where legacy column names get folded together, and
       this assertion is about the string the sheet actually holds. */
    if (shrine)
      bySlug.set(shrine.slug, { shrine, recorded: String(raw['Sufi Saint'] ?? '').trim() });
  }

  it('found every composite shrine in the shipped snapshot', () => {
    const missing = compositeSlugs.filter((slug) => !bySlug.has(slug));
    expect(missing).toEqual([]);
  });

  for (const slug of compositeSlugs) {
    it(`renders ${slug}'s recorded figure cell verbatim`, () => {
      const { shrine, recorded } = bySlug.get(slug)!;
      expect(recorded).not.toBe('');

      renderWithProviders(<ShrineInfobox shrine={shrine} />, { route: '/' });

      /* Not a substring match: the point is that the cell survives whole,
         including the parts the summary line cannot render — "(5th)", "(6th)",
         and Khoohi Bhai Lalo's "associated with", which says something about
         Bhai Lalo's relation to the site that two bare links do not. */
      expect(screen.getByText(recorded)).toBeInTheDocument();
    });
  }
});
